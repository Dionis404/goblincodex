import { useState, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import './BoostsCatalog.css';

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

const TYPE_FILTERS = [
  { id: 'all-type',    label: 'Все типы' },
  { id: 'collectible', label: 'Коллекционки' },
  { id: 'wearable',    label: 'Одежда' },
] as const;

type BoostFilter = 'all' | 'boost' | 'decor' | 'misc';

const BOOST_FILTERS: { id: BoostFilter; label: string }[] = [
  { id: 'all',   label: 'Все' },
  { id: 'boost', label: 'Буст' },
  { id: 'decor', label: 'Декор' },
  { id: 'misc',  label: 'Прочие' },
];

/** Буст = есть бонус; декор = обычный предмет/одежда без бонуса; прочие = билеты/токены/мусор без бонуса. */
function itemBoostBucket(item: CatalogItem): 'boost' | 'decor' | 'misc' {
  if (item.boosts.length > 0) return 'boost';
  if (item.tags.includes('misc')) return 'misc';
  return 'decor';
}

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

function BoostBadge({ boost }: { boost: Boost }) {
  return (
    <span className={`bc-boost-badge bc-boost--${boost.labelType}`}>
      {boost.shortDescriptionRu || boost.shortDescription}
    </span>
  );
}

function ItemCard({ item, onClick }: { item: CatalogItem; onClick: () => void }) {
  return (
    <button className="bc-card" onClick={onClick} type="button">
      <div className="bc-card-sprite">
        <SpriteImg sprite={item.sprite} name={item.name} />
      </div>
      <div className="bc-card-name">{item.name}</div>
      <div className="bc-card-badges">
        <span className={`bc-type-badge bc-type--${item.type}`}>
          {item.type === 'collectible' ? 'Коллекционка' : 'Одежда'}
        </span>
      </div>
      <div className="bc-card-boosts">
        {item.boosts.map(b => <BoostBadge key={b.id} boost={b} />)}
      </div>
    </button>
  );
}

function ItemModal({ item, onClose }: { item: CatalogItem; onClose: () => void }) {
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
            <span className={`bc-type-badge bc-type--${item.type}`}>
              {item.type === 'collectible' ? 'Коллекционка' : 'Одежда'}
            </span>
            {item.category && (
              <div className="bc-modal-token">{item.category}</div>
            )}
          </div>
        </div>

        <div className="bc-modal-section">
          <h3 className="bc-modal-section-title">Бонусы</h3>
          <div className="bc-modal-boosts">
            {item.boosts.length > 0
              ? item.boosts.map(b => <BoostBadge key={b.id} boost={b} />)
              : <span className="bc-modal-no-boosts">Нет данных о бонусах</span>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BoostsCatalog({ items }: Props) {
  const [category, setCategory] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all-type');
  const [boostFilter, setBoostFilter] = useState<BoostFilter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const segmentedRef = useRef<HTMLDivElement>(null);
  const segRefs = useRef<Record<string, HTMLButtonElement | null>>({});

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
  }, [boostFilter]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach(item => { if (item.category) cats.add(item.category); });
    return [...cats].sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter(item => {
      if (category !== 'all' && item.category !== category) return false;
      if (typeFilter !== 'all-type' && item.type !== typeFilter) return false;
      if (boostFilter !== 'all' && itemBoostBucket(item) !== boostFilter) return false;
      if (q && !item.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, category, typeFilter, boostFilter, search]);

  return (
    <div className="bc-root">
      <div className="bc-filters">
        <button
          className={`bc-filter-btn${category === 'all' ? ' active' : ''}`}
          onClick={() => setCategory('all')}
          type="button"
        >
          <span className="bc-filter-icon">⚡</span> Все
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            className={`bc-filter-btn${category === cat ? ' active' : ''}`}
            onClick={() => setCategory(cat)}
            type="button"
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="bc-filters bc-filters--type">
        {TYPE_FILTERS.map(tf => (
          <button
            key={tf.id}
            className={`bc-filter-btn bc-filter-btn--type${typeFilter === tf.id ? ' active' : ''}`}
            onClick={() => setTypeFilter(tf.id)}
            type="button"
          >
            {tf.label}
          </button>
        ))}
      </div>

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
        <ItemModal item={selected} onClose={() => setSelected(null)} />,
        document.body
      )}
    </div>
  );
}
