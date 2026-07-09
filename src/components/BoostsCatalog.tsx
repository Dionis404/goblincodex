import { useState, useMemo, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './BoostsCatalog.css';
import { useBoostLang, pickBoostText, type BoostLang } from '../lib/useBoostLang';

interface Boost {
  id: number;
  labelType: 'info' | 'success' | 'vibrant' | 'danger';
  shortDescription: string;
  shortDescriptionRu: string;
  boostType: string | null;
  isDebuff: boolean;
  numericValue: number | null;
  valueType: string | null;
  affectedStat: string | null;
}

interface CatalogItem {
  name: string;
  type: string;
  category: string | null;
  sprite: string | null;
  tags: string[];
  boosts: Boost[];
}

interface Props {
  items: CatalogItem[];
}

type KindFilter = 'all' | 'item' | 'wearable' | 'misc';

const KIND_FILTERS: { id: KindFilter; label: string }[] = [
  { id: 'all',      label: 'Все' },
  { id: 'item',     label: 'Предметы' },
  { id: 'wearable', label: 'Одежда' },
  { id: 'misc',     label: 'Прочее' },
];

/** Прочее = билеты/токены/мусор без бонуса (tag `misc`), не зависит от type. */
function isMisc(item: CatalogItem): boolean {
  return item.tags.includes('misc');
}

function matchesKind(item: CatalogItem, kind: KindFilter): boolean {
  switch (kind) {
    case 'all': return true;
    case 'misc': return isMisc(item);
    case 'wearable': return item.type === 'wearable';
    case 'item': return item.type === 'collectible' && !isMisc(item);
  }
}

type BoostFilter = 'all' | 'boost' | 'decor';

const BOOST_FILTERS: { id: BoostFilter; label: string }[] = [
  { id: 'all',   label: 'Все' },
  { id: 'boost', label: 'Буст' },
  { id: 'decor', label: 'Декор' },
];

type TagFilter = 'all' | 'node' | 'monument' | 'village-project' | 'building' | 'shrine';

const TAG_FILTERS: { id: TagFilter; label: string }[] = [
  { id: 'all',             label: 'Все' },
  { id: 'node',            label: 'Ноды' },
  { id: 'monument',        label: 'Монументы' },
  { id: 'village-project', label: 'Проекты деревни' },
  { id: 'building',        label: 'Здания' },
  { id: 'shrine',          label: 'Шрайны' },
];

const TAG_LABELS: Record<string, string> = {
  node: 'Нода',
  monument: 'Монумент',
  'village-project': 'Проект деревни',
  building: 'Здание',
  shrine: 'Шрайн',
  misc: 'Прочее',
};

/** Главы, для которых в исходниках игры ещё сохранилась привязка предметов (Bull Run и позже) + баннеры всех 14 глав. */
const CHAPTER_FILTERS: { id: string; label: string }[] = [
  { id: 'chapter-solar-flare',       label: 'Solar Flare' },
  { id: 'chapter-dawn-breaker',      label: 'Dawn Breaker' },
  { id: 'chapter-witches-eve',       label: "Witches' Eve" },
  { id: 'chapter-catch-the-kraken',  label: 'Catch the Kraken' },
  { id: 'chapter-spring-blossom',    label: 'Spring Blossom' },
  { id: 'chapter-clash-of-factions', label: 'Clash of Factions' },
  { id: 'chapter-pharaohs-treasure', label: "Pharaoh's Treasure" },
  { id: 'chapter-bull-run',          label: 'Bull Run' },
  { id: 'chapter-winds-of-change',   label: 'Winds of Change' },
  { id: 'chapter-great-bloom',       label: 'Great Bloom' },
  { id: 'chapter-better-together',   label: 'Better Together' },
  { id: 'chapter-paw-prints',        label: 'Paw Prints' },
  { id: 'chapter-crabs-and-traps',   label: 'Crabs and Traps' },
  { id: 'chapter-salt-awakening',    label: 'Salt Awakening' },
];

/** Источники без привязки к конкретной главе: разовые события, постоянные NPC-фичи. */
const ORIGIN_FILTERS: { id: string; label: string }[] = [
  { id: 'legacy',              label: 'Легаси (ранние предметы)' },
  { id: 'war-event',           label: 'Гоблинская война' },
  { id: 'mom-event',           label: 'Событие MOM' },
  { id: 'traveling-salesman',  label: 'Бродячий торговец' },
  { id: 'quest-item',          label: 'Квестовый предмет' },
  { id: 'blacksmith-goblin',   label: 'Кузница гоблинов' },
  { id: 'blacksmith-helios',   label: 'Кузница Гелиоса' },
  { id: 'pirate-event',        label: 'Пиратское событие' },
  { id: 'treasure',            label: 'Клад' },
  { id: 'potion-house',        label: 'Дом зелий' },
  { id: 'faction-shop',        label: 'Магазин фракций' },
  { id: 'event-easter',              label: 'Пасха' },
  { id: 'event-festival-of-colors',  label: 'Фестиваль красок' },
  { id: 'event-halloween',           label: 'Хэллоуин' },
  { id: 'event-holiday',             label: 'Рождество/Новый год' },
  { id: 'event-april-fools',         label: 'Первое апреля' },
];

for (const f of [...CHAPTER_FILTERS, ...ORIGIN_FILTERS]) TAG_LABELS[f.id] = f.label;

function SpriteImg({ sprite, name, size = 64 }: { sprite: string | null; name: string; size?: number }) {
  const [error, setError] = useState(false);

  if (!sprite || error) {
    return (
      <div className="bc-sprite-placeholder" style={{ width: size, height: size }}>
        <span>?</span>
      </div>
    );
  }
  return (
    <img
      src={`/sprites/${sprite}`}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      className="bc-sprite-img"
      onError={() => setError(true)}
    />
  );
}

function BoostBadge({ boost, lang }: { boost: Boost; lang: BoostLang }) {
  return (
    <span className={`bc-boost-badge bc-boost--${boost.labelType}`}>
      {pickBoostText(lang, boost.shortDescriptionRu, boost.shortDescription)}
    </span>
  );
}

function TagBadge({ tag }: { tag: string }) {
  const label = TAG_LABELS[tag];
  if (!label) return null;
  return <span className={`bc-tag-badge bc-tag--${tag}`}>{label}</span>;
}

function ItemCard({ item, lang, onClick }: { item: CatalogItem; lang: BoostLang; onClick: () => void }) {
  return (
    <button className="bc-card" onClick={onClick} type="button">
      <div className="bc-card-sprite">
        <SpriteImg sprite={item.sprite} name={item.name} />
      </div>
      <div className="bc-card-name">{item.name}</div>
      <div className="bc-card-badges">
        {item.type === 'wearable' && (
          <span className="bc-type-badge bc-type--wearable">Одежда</span>
        )}
        {item.tags.map(t => <TagBadge key={t} tag={t} />)}
      </div>
      <div className="bc-card-boosts">
        {item.boosts.map(b => <BoostBadge key={b.id} boost={b} lang={lang} />)}
      </div>
    </button>
  );
}

function ItemModal({ item, lang, onClose }: { item: CatalogItem; lang: BoostLang; onClose: () => void }) {
  return (
    <div className="bc-modal-overlay" onClick={onClose}>
      <div className="bc-modal" onClick={e => e.stopPropagation()}>
        <button className="bc-modal-close" onClick={onClose} type="button" aria-label="Закрыть">✕</button>

        <div className="bc-modal-header">
          <div className="bc-modal-sprite">
            <SpriteImg sprite={item.sprite} name={item.name} size={96} />
          </div>
          <div className="bc-modal-info">
            <h2 className="bc-modal-name">{item.name}</h2>
            {item.type === 'wearable' && (
              <span className="bc-type-badge bc-type--wearable">Одежда</span>
            )}
            {item.tags.length > 0 && (
              <div className="bc-modal-tags">
                {item.tags.map(t => <TagBadge key={t} tag={t} />)}
              </div>
            )}
            {item.category && (
              <div className="bc-modal-token">{item.category}</div>
            )}
          </div>
        </div>

        <div className="bc-modal-section">
          <h3 className="bc-modal-section-title">Бонусы</h3>
          <div className="bc-modal-boosts">
            {item.boosts.length > 0
              ? item.boosts.map(b => <BoostBadge key={b.id} boost={b} lang={lang} />)
              : <span className="bc-modal-no-boosts">Нет данных о бонусах</span>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BoostsCatalog({ items }: Props) {
  const lang = useBoostLang();
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [boostFilter, setBoostFilter] = useState<BoostFilter>('all');
  const [tagFilter, setTagFilter] = useState<TagFilter>('all');
  const [originFilter, setOriginFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const segmentedRef = useRef<HTMLDivElement>(null);
  const segRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const showBoostFilter = kindFilter !== 'misc';

  useLayoutEffect(() => {
    const container = segmentedRef.current;
    const active = segRefs.current[boostFilter];
    if (!container || !active) return;
    const update = () => {
      const containerRect = container.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      setIndicatorStyle({ left: activeRect.left - containerRect.left, width: activeRect.width });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [boostFilter, showBoostFilter]);

  // Тег доступен как фильтр только если среди предметов текущего раздела
  // (Все/Предметы/Одежда/Прочее) реально есть хоть один с этим тегом —
  // иначе, например, в "Прочее" были бы бессмысленные кнопки "Ноды"/"Монументы".
  const tagsInKind = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (!matchesKind(item, kindFilter)) continue;
      for (const t of item.tags) set.add(t);
    }
    return set;
  }, [items, kindFilter]);

  const availableTagFilters = useMemo(
    () => TAG_FILTERS.filter(f => f.id === 'all' || tagsInKind.has(f.id)),
    [tagsInKind],
  );
  const availableChapterFilters = useMemo(
    () => CHAPTER_FILTERS.filter(f => tagsInKind.has(f.id)),
    [tagsInKind],
  );
  const availableOriginFilters = useMemo(
    () => ORIGIN_FILTERS.filter(f => tagsInKind.has(f.id)),
    [tagsInKind],
  );

  // Если сменили раздел и текущий выбранный тег/глава/источник в нём больше
  // не встречается — сбросить его, а не показывать пустой список.
  useEffect(() => {
    if (tagFilter !== 'all' && !tagsInKind.has(tagFilter)) setTagFilter('all');
    if (originFilter !== 'all' && !tagsInKind.has(originFilter)) setOriginFilter('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagsInKind]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter(item => {
      if (!matchesKind(item, kindFilter)) return false;
      if (showBoostFilter && boostFilter !== 'all') {
        const hasBoost = item.boosts.length > 0;
        if (boostFilter === 'boost' && !hasBoost) return false;
        if (boostFilter === 'decor' && hasBoost) return false;
      }
      if (tagFilter !== 'all' && !item.tags.includes(tagFilter)) return false;
      if (originFilter !== 'all' && !item.tags.includes(originFilter)) return false;
      if (q && !item.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, kindFilter, boostFilter, showBoostFilter, tagFilter, originFilter, search]);

  return (
    <div className="bc-root">
      <div className="bc-filters bc-filters--type">
        {KIND_FILTERS.map(kf => (
          <button
            key={kf.id}
            className={`bc-filter-btn bc-filter-btn--type${kindFilter === kf.id ? ' active' : ''}`}
            onClick={() => setKindFilter(kf.id)}
            type="button"
          >
            {kf.label}
          </button>
        ))}
      </div>

      {showBoostFilter && (
        <div className="bc-segmented" ref={segmentedRef}>
          <div
            className="bc-segment-indicator"
            style={{ transform: `translateX(${indicatorStyle.left}px)`, width: `${indicatorStyle.width}px` }}
          />
          {BOOST_FILTERS.map(f => (
            <button
              key={f.id}
              ref={el => { segRefs.current[f.id] = el; }}
              className={`bc-segment${boostFilter === f.id ? ' active' : ''}`}
              onClick={() => setBoostFilter(f.id)}
              type="button"
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {availableTagFilters.length > 1 && (
        <div className="bc-filters bc-filters--tag">
          {availableTagFilters.map(tf => (
            <button
              key={tf.id}
              className={`bc-filter-btn bc-filter-btn--tag${tagFilter === tf.id ? ' active' : ''}`}
              onClick={() => setTagFilter(tf.id)}
              type="button"
            >
              {tf.label}
            </button>
          ))}
        </div>
      )}

      {(availableChapterFilters.length > 0 || availableOriginFilters.length > 0) && (
        <div className="bc-origin-wrap">
          <select
            className="bc-origin-select"
            value={originFilter}
            onChange={e => setOriginFilter(e.target.value)}
          >
            <option value="all">Глава / источник: все</option>
            {availableChapterFilters.length > 0 && (
              <optgroup label="Главы">
                {availableChapterFilters.map(f => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </optgroup>
            )}
            {availableOriginFilters.length > 0 && (
              <optgroup label="Источники">
                {availableOriginFilters.map(f => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      )}

      <div className="bc-search-wrap">
        <input
          type="text"
          className="bc-search"
          placeholder="Найти NFT предмет..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="bc-count">
        Найдено: <strong>{filtered.length}</strong> предметов
      </div>

      <div className="bc-grid">
        {filtered.map(item => (
          <ItemCard
            key={item.name}
            item={item}
            lang={lang}
            onClick={() => setSelected(item)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bc-empty">
          Ничего не найдено. Попробуй другой запрос или категорию.
        </div>
      )}

      {selected && createPortal(
        <ItemModal item={selected} lang={lang} onClose={() => setSelected(null)} />,
        document.body
      )}
    </div>
  );
}
