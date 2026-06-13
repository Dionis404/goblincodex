import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import './BoostsCatalog.css';

interface Boost {
  key: string;
  en: string;
  ru: string;
  type: 'success' | 'info' | 'vibrant' | 'danger';
  resource: string[];
  withSkill: boolean;
}

interface CatalogItem {
  name: string;
  type: 'collectible' | 'wearable';
  description: { en: string; ru: string };
  boosts: Boost[];
  sprite: string | null;
  tokenId: number;
}

interface Props {
  items: CatalogItem[];
}

const RESOURCE_CATEGORIES = [
  { id: 'all',      label: 'Все',       icon: '⚡' },
  { id: 'wood',     label: 'Дерево',    icon: '🌳' },
  { id: 'stone',    label: 'Камень',    icon: '🪨' },
  { id: 'gold',     label: 'Золото',    icon: '🟡' },
  { id: 'iron',     label: 'Железо',    icon: '⚙️' },
  { id: 'crop',     label: 'Культуры',  icon: '🌾' },
  { id: 'animal',   label: 'Животные',  icon: '🐔' },
  { id: 'cooking',  label: 'Крафт',     icon: '🍳' },
  { id: 'fishing',  label: 'Рыбалка',   icon: '🎣' },
  { id: 'fruit',    label: 'Фрукты',    icon: '🍎' },
  { id: 'flower',   label: 'Цветы',     icon: '🌸' },
  { id: 'honey',    label: 'Мёд',       icon: '🍯' },
  { id: 'oil',      label: 'Нефть',     icon: '🛢️' },
  { id: 'mineral',  label: 'Кримстоун', icon: '💎' },
] as const;

const TYPE_FILTERS = [
  { id: 'all-type',    label: 'Все типы' },
  { id: 'collectible', label: 'Коллекционки' },
  { id: 'wearable',    label: 'Одежда' },
] as const;

const CATEGORY_TO_RESOURCES: Record<string, string[]> = {
  wood:    ['wood'],
  stone:   ['stone'],
  gold:    ['gold'],
  iron:    ['iron'],
  crop:    ['crop'],
  animal:  ['animal'],
  cooking: ['cooking'],
  fishing: ['fishing'],
  fruit:   ['fruit'],
  flower:  ['flower'],
  honey:   ['honey'],
  oil:     ['oil'],
  mineral: ['crimstone', 'sunstone'],
};

function matchesCategory(item: CatalogItem, categoryId: string): boolean {
  if (categoryId === 'all') return true;
  const resources = CATEGORY_TO_RESOURCES[categoryId];
  if (!resources) return false;
  return item.boosts.some(b =>
    b.resource.some(r => resources.includes(r))
  );
}

function SpriteImg({ sprite, name, size = 64 }: { sprite: string | null; name: string; size?: number }) {
  if (!sprite) {
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
    />
  );
}

function BoostBadge({ boost }: { boost: Boost }) {
  return (
    <span className={`bc-boost-badge bc-boost--${boost.type}`}>
      {boost.ru}
      {boost.withSkill && <span className="bc-skill-tag">со скиллом</span>}
    </span>
  );
}

function ItemCard({ item, onClick }: { item: CatalogItem; onClick: () => void }) {
  const baseBoosts = item.boosts.filter(b => !b.withSkill);
  const skillBoosts = item.boosts.filter(b => b.withSkill);

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
        {baseBoosts.map((b, i) => <BoostBadge key={i} boost={b} />)}
        {skillBoosts.map((b, i) => <BoostBadge key={`s${i}`} boost={b} />)}
      </div>
    </button>
  );
}

function ItemModal({ item, onClose }: { item: CatalogItem; onClose: () => void }) {
  const baseBoosts = item.boosts.filter(b => !b.withSkill);
  const skillBoosts = item.boosts.filter(b => b.withSkill);

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
            <div className="bc-modal-token">Token ID: {item.tokenId}</div>
          </div>
        </div>

        {item.description.ru && (
          <p className="bc-modal-desc">{item.description.ru}</p>
        )}

        <div className="bc-modal-section">
          <h3 className="bc-modal-section-title">Бонусы</h3>
          <div className="bc-modal-boosts">
            {baseBoosts.map((b, i) => <BoostBadge key={i} boost={b} />)}
          </div>
        </div>

        {skillBoosts.length > 0 && (
          <div className="bc-modal-section">
            <h3 className="bc-modal-section-title">Со скиллом</h3>
            <div className="bc-modal-boosts">
              {skillBoosts.map((b, i) => <BoostBadge key={i} boost={b} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BoostsCatalog({ items }: Props) {
  const [category, setCategory] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all-type');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CatalogItem | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter(item => {
      if (!matchesCategory(item, category)) return false;
      if (typeFilter !== 'all-type' && item.type !== typeFilter) return false;
      if (q && !item.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, category, typeFilter, search]);

  return (
    <div className="bc-root">
      <div className="bc-filters">
        {RESOURCE_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`bc-filter-btn${category === cat.id ? ' active' : ''}`}
            onClick={() => setCategory(cat.id)}
            type="button"
          >
            <span className="bc-filter-icon">{cat.icon}</span> {cat.label}
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
            key={`${item.name}-${item.tokenId}`}
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
