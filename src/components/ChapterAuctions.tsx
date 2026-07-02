import { useEffect, useMemo, useRef, useState } from 'react';
import './ChapterAuctions.css';

interface Auction {
  auctionId: string;
  sfl: number;
  supply: number;
  ingredients: Record<string, number>;
  startAt: number;
  endAt: number;
  type: 'collectible' | 'wearable' | 'nft';
  collectible?: string;
  wearable?: string;
  nft?: string;
  chapterLimit?: number;
}

interface Props {
  auctions: Auction[];
  chapterName?: string;
}

// В исходном JSON время аукционов указано как UTC+5 — приводим к настоящему UTC,
// дальше JS сам покажет его в часовом поясе пользователя.
const SOURCE_TZ_OFFSET_MS = 5 * 60 * 60 * 1000;
const toRealTime = (ms: number) => ms - SOURCE_TZ_OFFSET_MS;

const TYPE_ICON: Record<Auction['type'], string> = {
  collectible: '📦',
  wearable: '👕',
  nft: '🐾',
};

const TYPE_LABEL: Record<Auction['type'], string> = {
  collectible: 'Коллекционка',
  wearable: 'Одежда',
  nft: 'NFT',
};

type Status = 'upcoming' | 'live' | 'ended';

const STATUS_FILTERS: { id: Status | 'all'; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'upcoming', label: 'Скоро' },
  { id: 'ended', label: 'Завершены' },
];

const STATUS_LABEL: Record<Status, string> = {
  upcoming: 'Скоро',
  live: 'Идёт сейчас',
  ended: 'Завершён',
};

const SOON_THRESHOLD_MS = 5 * 60 * 1000;

type Kind = 'boost' | 'decor';

const KIND_LABEL: Record<Kind, string> = {
  boost: 'Буст',
  decor: 'Декор',
};

// Ручная разметка предметов главы: буст даёт игровой бонус, декор — чисто украшение.
// TODO: заменить на автоподгрузку из БД предметов, когда она будет готова.
const ITEM_KIND: Record<string, Kind> = {
  'Pufferfish': 'decor',
  'Fat Crab': 'decor',
};

function itemName(a: Auction): string {
  return a.collectible ?? a.wearable ?? a.nft ?? '—';
}

function itemKind(a: Auction): Kind {
  return ITEM_KIND[itemName(a)] ?? 'boost';
}

function getStatus(a: Auction, now: number): Status {
  const startAt = toRealTime(a.startAt);
  const endAt = toRealTime(a.endAt);
  if (now < startAt) return 'upcoming';
  if (now < endAt) return 'live';
  return 'ended';
}

function costKey(a: Auction): string {
  const ingredientNames = Object.keys(a.ingredients);
  if (ingredientNames.length > 0) return ingredientNames.join(' + ');
  if (a.sfl > 0) return 'Flower';
  return 'Бесплатно';
}

function costBadgeClass(name: string): string {
  switch (name) {
    case 'Flower':    return 'ca-cost--flower';
    case 'Gem':       return 'ca-cost--gem';
    case 'Salt Rock': return 'ca-cost--salt';
    default:          return '';
  }
}

function formatTime(ms: number): string {
  return new Date(toRealTime(ms)).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(ms: number): string {
  return new Date(toRealTime(ms)).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });
}

interface DropdownOption {
  value: string;
  label: string;
}

function Dropdown({ value, options, onChange }: { value: string; options: DropdownOption[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find(o => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className={`ca-dropdown${open ? ' open' : ''}`} ref={rootRef}>
      <button type="button" className="ca-dropdown-btn" onClick={() => setOpen(o => !o)}>
        {current?.label}
        <span className="ca-dropdown-arrow" />
      </button>
      {open && (
        <div className="ca-dropdown-menu">
          {options.map(o => (
            <button
              type="button"
              key={o.value}
              className={`ca-dropdown-option${o.value === value ? ' active' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChapterAuctions({ auctions, chapterName = 'The Salt Awakening' }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('upcoming');
  const [costFilter, setCostFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState<Kind | 'all'>('all');
  const [nameFilter, setNameFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const costOptions = useMemo<DropdownOption[]>(() => {
    const keys = new Set<string>();
    auctions.forEach(a => keys.add(costKey(a)));
    return [{ value: 'all', label: 'Любая валюта' }, ...[...keys].sort().map(k => ({ value: k, label: k }))];
  }, [auctions]);

  const kindOptions = useMemo<DropdownOption[]>(() => [
    { value: 'all', label: 'Все категории' },
    { value: 'boost', label: KIND_LABEL.boost },
    { value: 'decor', label: KIND_LABEL.decor },
  ], []);

  const nameOptions = useMemo<DropdownOption[]>(() => {
    const names = new Set<string>();
    auctions.forEach(a => names.add(itemName(a)));
    return [{ value: 'all', label: 'Все предметы' }, ...[...names].sort().map(n => ({ value: n, label: n }))];
  }, [auctions]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return auctions
      .filter(a => {
        if (statusFilter === 'all') return true;
        const status = getStatus(a, now);
        if (statusFilter === 'upcoming') return status !== 'ended';
        return status === statusFilter;
      })
      .filter(a => (costFilter === 'all' || costKey(a) === costFilter))
      .filter(a => (kindFilter === 'all' || itemKind(a) === kindFilter))
      .filter(a => (nameFilter === 'all' || itemName(a) === nameFilter))
      .filter(a => !q || itemName(a).toLowerCase().includes(q))
      .sort((a, b) => a.startAt - b.startAt);
  }, [auctions, statusFilter, costFilter, kindFilter, nameFilter, search, now]);

  const summary = useMemo(() => {
    let totalSupply = 0;
    // Для каждой ставки считаем не количество ингредиентов, а сколько предметов
    // разыгрывается за эту ставку (сумма supply по всем дропам с этой ставкой).
    const costTotals = new Map<string, number>();
    filtered.forEach(a => {
      totalSupply += a.supply;
      if (a.sfl > 0) {
        costTotals.set('Flower', (costTotals.get('Flower') ?? 0) + a.supply);
      }
      Object.keys(a.ingredients).forEach(name => {
        costTotals.set(name, (costTotals.get(name) ?? 0) + a.supply);
      });
    });
    return { totalSupply, costTotals: [...costTotals.entries()] };
  }, [filtered]);

  const groups = useMemo(() => {
    const map = new Map<string, Auction[]>();
    filtered.forEach(a => {
      const key = formatDay(a.startAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="ca-root">
      <div className="ca-widget-header">
        <span className="ca-widget-icon">⏰</span>
        <div>
          <div className="ca-widget-title">Расписание аукционов</div>
          <div className="ca-widget-sub">Аукционы предметов главы «{chapterName}»</div>
        </div>
      </div>

      <div className="ca-panel">
        <div className="ca-toolbar">
          <div className="ca-search-wrap">
            <input
              type="text"
              className="ca-search"
              placeholder="Найти предмет..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoComplete="off"
            />
          </div>
          <Dropdown value={nameFilter} options={nameOptions} onChange={setNameFilter} />
        </div>

        <div className="ca-toolbar">
          <div className="ca-segmented">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.id}
                className={`ca-segment${statusFilter === f.id ? ' active' : ''}`}
                onClick={() => setStatusFilter(f.id)}
                type="button"
              >
                {f.label}
              </button>
            ))}
          </div>

          <Dropdown value={costFilter} options={costOptions} onChange={setCostFilter} />
          <Dropdown value={kindFilter} options={kindOptions} onChange={v => setKindFilter(v as Kind | 'all')} />
        </div>

        <div className="ca-panel-divider" />

        <div className="ca-summary">
          <span>Найдено: <strong>{filtered.length}</strong></span>
          <span>Лимит: <strong>{summary.totalSupply}</strong> на все ставки</span>
          {summary.costTotals.map(([name, amount]) => (
            <span key={name} className={`ca-summary-badge ${costBadgeClass(name)}`}>{name}: <strong>{amount}</strong></span>
          ))}
        </div>
      </div>

      {groups.length === 0 && (
        <div className="ca-empty">Аукционов по выбранным фильтрам не найдено.</div>
      )}

      <div className="ca-groups">
        {groups.map(([day, items]) => (
          <div key={day} className="ca-group">
            <div className="ca-group-title">{day}</div>
            <div className="ca-list">
              {items.map(a => {
                const status = getStatus(a, now);
                const startAt = toRealTime(a.startAt);
                const minutesToStart = Math.ceil((startAt - now) / 60_000);
                const isHot = status === 'live' || (status === 'upcoming' && startAt - now <= SOON_THRESHOLD_MS);
                const ingredients = Object.entries(a.ingredients);
                return (
                  <div key={a.auctionId} className={`ca-row ca-row--${status}${isHot ? ' ca-row--hot' : ''}`}>
                    <div className="ca-row-time">
                      {formatTime(a.startAt)}–{formatTime(a.endAt)}
                    </div>
                    <div className="ca-row-icon">{TYPE_ICON[a.type]}</div>
                    <div className="ca-row-main">
                      <button
                        type="button"
                        className="ca-row-name ca-row-name--clickable"
                        onClick={() => setNameFilter(itemName(a))}
                      >
                        {itemName(a)}
                      </button>
                      <div className="ca-row-meta">
                        <span className={`ca-kind-badge ca-kind-badge--${itemKind(a)}`}>{KIND_LABEL[itemKind(a)]}</span>
                        <span className="ca-type-badge">{TYPE_LABEL[a.type]}</span>
                        <span className="ca-row-supply">Лимит {a.supply} на ставку</span>
                        {ingredients.length > 0 ? (
                          ingredients.map(([name]) => (
                            <span key={name} className={`ca-cost ${costBadgeClass(name)}`}>{name}</span>
                          ))
                        ) : (
                          <span className="ca-cost">Без ингредиентов</span>
                        )}
                        {a.sfl > 0 && <span className={`ca-cost ${costBadgeClass('Flower')}`}>Flower</span>}
                      </div>
                    </div>
                    {isHot ? (
                      <div className="ca-hot-badge">
                        {status === 'live' ? '🔥 Идёт сейчас' : `⏳ Через ${Math.max(minutesToStart, 1)} мин`}
                      </div>
                    ) : (
                      <div className={`ca-status ca-status--${status}`}>{STATUS_LABEL[status]}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
