import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PriceChart, PriceTable } from './PriceHistory';
import { FlowerAmount } from './ResourceIcon';
import { TOOL_RESOURCE_ICONS } from '../lib/toolCosts';
import { isPetTradeable, isTradeResource, isWearableTradeable, petTradeAt, tradeableCollectibleNames } from '../lib/tradeable';
import { WEARABLE_NAMES } from '../lib/wearableNames';
import type { PricePoint, PriceResource } from '../lib/priceApi';
import './PriceHistory.css';
import './RefPriceHistory.css';

// Окно поиска последней цены для сетки ресурсов: две недели без сделок —
// карточку не показываем (торговля ресурсом при этом определяется кодом игры,
// см. isTradeResource ниже).
const LAST_PRICE_HOURS = 24 * 14;

type Block = 'resources' | 'items' | 'pets' | 'buds';

const BLOCKS: { id: Block; label: string }[] = [
  { id: 'resources', label: '🪵 Ресурсы' },
  { id: 'items', label: '💎 NFT предметы' },
  { id: 'pets', label: '🐾 Питомцы' },
  { id: 'buds', label: '🌱 Buds' },
];

const RANGE_OPTIONS = [
  { hours: 24, label: '24 часа' },
  { hours: 24 * 7, label: '7 дней' },
  { hours: 24 * 30, label: '30 дней' },
  { hours: 2160, label: '90 дней' },
];

// Торгующиеся ресурсы маркетплейса (Oil не торгуется — как и в toolCosts).
// Иконки — те же, что в калькуляторах; Obsidian добавлен отдельно.
const RESOURCES: { name: string; icon: string }[] = [
  { name: 'Wood', icon: TOOL_RESOURCE_ICONS.Wood },
  { name: 'Stone', icon: TOOL_RESOURCE_ICONS.Stone },
  { name: 'Iron', icon: TOOL_RESOURCE_ICONS.Iron },
  { name: 'Gold', icon: TOOL_RESOURCE_ICONS.Gold },
  { name: 'Crimstone', icon: TOOL_RESOURCE_ICONS.Crimstone },
  { name: 'Obsidian', icon: '/sprites/resources/obsidian.webp' },
  { name: 'Leather', icon: TOOL_RESOURCE_ICONS.Leather },
  { name: 'Wool', icon: TOOL_RESOURCE_ICONS.Wool },
  { name: 'Merino Wool', icon: TOOL_RESOURCE_ICONS['Merino Wool'] },
  { name: 'Feather', icon: TOOL_RESOURCE_ICONS.Feather },
];

interface Selected {
  key: string;
  name: string;
  icon?: string;
}

interface ResourceEntry {
  key: string;
  name: string;
  icon: string;
  /** null — ресурс торгуется по коду игры, но сделок на маркетплейсе не было. */
  price: number | null;
}

interface NftItem {
  id: number;
  item_key: string;
  image_url: string;
  title: string;
  subtitle: string;
}

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; points: PricePoint[] };

// ─── Ресурсы: сетка с иконками и текущей ценой ──────────────────────────────

function ResourcesGrid({ onSelect, selectedKey }: {
  onSelect: (s: Selected) => void;
  selectedKey: string | null;
}) {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error' }
    | { status: 'ready'; entries: ResourceEntry[] }
  >({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const names = RESOURCES.map((r) => r.name);
      const lookupRes = await fetch(`/api/prices/lookup.json?names=${names.map(encodeURIComponent).join(',')}`);
      if (!lookupRes.ok) throw new Error(`HTTP ${lookupRes.status}`);
      const { keys }: { keys: Record<string, string | null> } = await lookupRes.json();

      // Одним запросом на ресурс: последняя известная цена. Торговля ресурсом
      // определяется кодом игры (TRADE_LIMITS); цены на маркетплейсе при этом
      // может не быть — карточка показывается с пометкой «нет торгов».
      const entries = (await Promise.all(
        RESOURCES.map(async (r) => {
          // Obsidian в TRADE_LIMITS исключён, но оставлен по запросу (цена есть).
          if (!isTradeResource(r.name) && r.name !== 'Obsidian') return null;
          const key = keys[r.name];
          if (!key) return { key: '', name: r.name, icon: r.icon, price: null as number | null };
          const res = await fetch(`/api/prices/${encodeURIComponent(key)}/history.json?hours=${LAST_PRICE_HOURS}`);
          if (!res.ok) return { key, name: r.name, icon: r.icon, price: null as number | null };
          const { points }: { points: PricePoint[] } = await res.json();
          const last = [...points].reverse().find((p) => p.floor != null || p.latest_sale != null);
          return { key, name: r.name, icon: r.icon, price: last ? (last.floor ?? last.latest_sale!) : null };
        }),
      )).filter((e): e is ResourceEntry => e != null);

      if (cancelled) return;
      setState({ status: 'ready', entries });
      if (entries[0]) onSelect({ key: entries[0].key, name: entries[0].name, icon: entries[0].icon });
    })().catch(() => {
      if (!cancelled) setState({ status: 'error' });
    });
    return () => { cancelled = true; };
  }, [onSelect]);

  if (state.status === 'loading') return <div className="ph-status">Загрузка ресурсов...</div>;
  if (state.status === 'error') return <div className="ph-status ph-status--error">Не удалось загрузить цены ресурсов.</div>;
  if (state.entries.length === 0) return <div className="ph-status">Ни один из ресурсов сейчас не торгуется.</div>;

  return (
    <div className="rph-grid">
      {state.entries.map((e) => (
        <button
          key={e.key}
          type="button"
          className={`rph-card${selectedKey === e.key ? ' active' : ''}`}
          onClick={() => onSelect({ key: e.key, name: e.name, icon: e.icon })}
        >
          <img src={e.icon} alt="" className="rph-card-icon" loading="lazy" />
          <span className="rph-card-title">{e.name}</span>
          <span className="rph-card-price">
            {e.price != null ? <FlowerAmount compact value={e.price} /> : <span className="rph-progress">нет торгов</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── NFT предметы: коллекционки + одежда, только торгующиеся ────────────────

function ItemsBlock({ onSelect, selected }: {
  onSelect: (s: Selected) => void;
  selected: Selected | null;
}) {
  const [listState, setListState] = useState<
    | { status: 'loading' }
    | { status: 'error' }
    | { status: 'ready'; resources: PriceResource[] }
  >({ status: 'loading' });
  const [search, setSearch] = useState('');

  // Список строим из кода игры (tradeableData.generated.ts), а не из того,
  // что видит price-service: предмет «торгуется, но мёртв на рынке» должен
  // быть в списке. Ключи истории для коллекционок резолвим через lookup
  // (там, где price-service предмет не знает, ключ будет пустым — график
  // покажет «сделок не было»). Одежда ключ строит сама из WEARABLE_NAMES.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const wearables = Object.entries(WEARABLE_NAMES)
        .map(([id, name]) => ({ item_key: `wearables-${id}`, item_name: name }))
        .filter((r) => isWearableTradeable(r.item_name));

      const collNames = tradeableCollectibleNames();
      const keyByName = new Map<string, string>();
      for (let i = 0; i < collNames.length; i += 200) {
        const part = collNames.slice(i, i + 200);
        const res = await fetch(`/api/prices/lookup.json?names=${part.map(encodeURIComponent).join(',')}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { keys }: { keys: Record<string, string | null> } = await res.json();
        for (const [name, key] of Object.entries(keys)) {
          if (key) keyByName.set(name, key);
        }
      }

      const collectibles = collNames.map((name) => ({
        item_key: keyByName.get(name) ?? '',
        item_name: name,
      }));
      const merged = [...collectibles, ...wearables].sort((a, b) => a.item_name.localeCompare(b.item_name, 'ru'));
      if (!cancelled) setListState({ status: 'ready', resources: merged });
    })().catch(() => {
      if (!cancelled) setListState({ status: 'error' });
    });
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(() => {
    if (listState.status !== 'ready') return [];
    const q = search.toLowerCase().trim();
    if (!q) return listState.resources;
    return listState.resources.filter((r) => r.item_name.toLowerCase().includes(q));
  }, [listState, search]);

  const selectedName = selected?.name ?? null;
  useEffect(() => {
    if (listState.status !== 'ready') return;
    if (selectedName && visible.some((r) => r.item_name === selectedName)) return;
    if (visible[0]) onSelect({ key: visible[0].item_key, name: visible[0].item_name });
  }, [visible, selectedName, onSelect, listState]);

  return (
    <div className="rph-toolbar">
      <input
        type="text"
        className="ph-search"
        placeholder="Найти предмет..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoComplete="off"
        disabled={listState.status !== 'ready'}
      />
      {listState.status === 'loading' && <span className="ph-select-status">Загрузка списка...</span>}
      {listState.status === 'error' && <span className="ph-select-status ph-select-status--error">Не удалось загрузить список предметов</span>}
      {listState.status === 'ready' && (
        <select
          className="ph-select rph-select"
          value={visible.some((r) => r.item_name === selectedName) ? selectedName ?? '' : ''}
          onChange={(e) => {
            const r = visible.find((v) => v.item_name === e.target.value);
            if (r) onSelect({ key: r.item_key, name: r.item_name });
          }}
        >
          {visible.length === 0 && <option value="">Ничего не найдено</option>}
          {visible.map((r) => (
            <option key={r.item_name} value={r.item_name}>
              {r.item_name}{r.item_key === '' ? ' (нет данных)' : ''}
            </option>
          ))}
        </select>
      )}
      {listState.status === 'ready' && <span className="rph-progress rph-progress--done">Скрыты предметы, закрытые для торговли в коде игры</span>}
    </div>
  );
}

// ─── Питомцы / Buds: сетка минт-NFT с картинками из нашей БД ────────────────

function NftGrid({ category, onSelect, selectedKey }: {
  category: 'pets' | 'buds';
  onSelect: (s: Selected) => void;
  selectedKey: string | null;
}) {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error' }
    | { status: 'ready'; items: NftItem[] }
  >({ status: 'loading' });
  const [filter, setFilter] = useState('');
  const [idLookup, setIdLookup] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'found'; item: NftItem }
    | { status: 'not-yet'; date: string | null }
    | { status: 'not-found' }
  >({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/prices/nft.json?category=${category}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ items: NftItem[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        // Питомцы по коду игры открываются для торговли по расписанию глав
        // (petRevealConfig) — сервер уже отфильтровал, тут страховка.
        const items = category === 'pets' ? data.items.filter((i) => isPetTradeable(i.id)) : data.items;
        setState({ status: 'ready', items });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => { cancelled = true; };
  }, [category]);

  // Ввели чистый номер, которого нет в сетке? Все NFT торгуются по коду
  // игры, просто по нему могло не быть сделок — подтягиваем карточку из БД
  // по id и показываем вне сетки (для питомцев сначала проверяем расписание).
  useEffect(() => {
    setIdLookup({ status: 'idle' });
    if (state.status !== 'ready' || !/^\d+$/.test(filter.trim())) return;
    const id = Number(filter.trim());
    if (id <= 0 || state.items.some((i) => i.id === id)) return;

    if (category === 'pets') {
      const tradeAt = petTradeAt(id);
      if (tradeAt == null || Date.parse(tradeAt) > Date.now()) {
        setIdLookup({ status: 'not-yet', date: tradeAt });
        return;
      }
    }

    let cancelled = false;
    setIdLookup({ status: 'loading' });
    fetch(`/api/${category === 'pets' ? 'pets/nft' : 'buds'}/${id}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ budId?: number; petId?: number; type: string; imageUrl: string }>;
      })
      .then((inst) => {
        if (cancelled) return;
        const foundId = inst.budId ?? inst.petId ?? id;
        setIdLookup({
          status: 'found',
          item: {
            id: foundId,
            item_key: `${category}-${foundId}`,
            image_url: inst.imageUrl,
            title: category === 'pets' ? `Pet #${foundId}` : `Bud #${foundId}`,
            subtitle: inst.type,
          },
        });
      })
      .catch(() => {
        if (!cancelled) setIdLookup({ status: 'not-found' });
      });
    return () => { cancelled = true; };
  }, [filter, category, state]);

  if (state.status === 'loading') return <div className="ph-status">Загрузка...</div>;
  if (state.status === 'error') return <div className="ph-status ph-status--error">Не удалось загрузить данные.</div>;

  const q = filter.toLowerCase().trim();
  const items = q
    ? state.items.filter((i) => String(i.id).includes(q) || i.title.toLowerCase().includes(q) || i.subtitle.toLowerCase().includes(q))
    : state.items;

  return (
    <>
      <div className="rph-toolbar">
        <input
          type="text"
          className="ph-search"
          placeholder={category === 'pets' ? 'Номер питомца или порода...' : 'Номер Bud или тип...'}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          autoComplete="off"
        />
        <span className="rph-progress rph-progress--done">
          {category === 'pets'
            ? `Торгуются: ${state.items.length} (питомцы открываются по расписанию глав)`
            : `Торгуются: ${state.items.length}`}
        </span>
      </div>

      {idLookup.status === 'found' && (
        <div className="rph-id-result">
          <span className="rph-progress">Номер есть в игре, сделок на маркетплейсе не было — всё равно можно посмотреть:</span>
          <button
            type="button"
            className={`rph-card rph-card--nft${selectedKey === idLookup.item.item_key ? ' active' : ''}`}
            onClick={() => onSelect({ key: idLookup.item.item_key, name: `${idLookup.item.title} · ${idLookup.item.subtitle}`, icon: idLookup.item.image_url })}
          >
            <img src={idLookup.item.image_url} alt={idLookup.item.title} className="rph-nft-img" loading="lazy" />
            <span className="rph-card-title">{idLookup.item.title}</span>
            <span className="rph-card-sub">{idLookup.item.subtitle}</span>
          </button>
        </div>
      )}
      {idLookup.status === 'not-yet' && (
        <div className="ph-status">
          {idLookup.date
            ? `Этот питомец откроется для торговли ${new Date(idLookup.date).toLocaleDateString('ru-RU')} — по расписанию глав в коде игры.`
            : 'Этот питомец ещё не открыт для торговли.'}
        </div>
      )}
      {idLookup.status === 'not-found' && (
        <div className="ph-status">Такого номера нет в игре.</div>
      )}
      {items.length === 0 ? (
        <div className="ph-status">Пока нет торгующихся — попробуйте позже.</div>
      ) : (
        <div className="rph-grid rph-grid--nft">
          {items.map((i) => (
            <button
              key={i.item_key}
              type="button"
              className={`rph-card rph-card--nft${selectedKey === i.item_key ? ' active' : ''}`}
              onClick={() => onSelect({ key: i.item_key, name: `${i.title} · ${i.subtitle}`, icon: i.image_url })}
            >
              <img src={i.image_url} alt={i.title} className="rph-nft-img" loading="lazy" />
              <span className="rph-card-title">{i.title}</span>
              <span className="rph-card-sub">{i.subtitle}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Секция ─────────────────────────────────────────────────────────────────

export default function RefPriceHistory() {
  const [block, setBlock] = useState<Block>('resources');
  const [selected, setSelected] = useState<Selected | null>(null);
  const [hours, setHours] = useState(RANGE_OPTIONS[2].hours);
  const [state, setState] = useState<FetchState>({ status: 'idle' });
  const requestId = useRef(0);

  const handleSelect = useCallback((s: Selected) => {
    setSelected((prev) => prev ?? s);
  }, []);

  useEffect(() => {
    if (!selected) return;
    // Ключ пустой = предмет торгуется по коду игры, но price-service его не
    // знает (сделок не было) — сразу показываем «мёртв на рынке», без запроса.
    if (!selected.key) {
      setState({ status: 'ready', points: [] });
      return;
    }
    const id = ++requestId.current;
    setState({ status: 'loading' });
    fetch(`/api/prices/${encodeURIComponent(selected.key)}/history.json?hours=${hours}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ points: PricePoint[] }>;
      })
      .then((data) => {
        if (requestId.current !== id) return;
        setState({ status: 'ready', points: data.points });
      })
      .catch(() => {
        if (requestId.current !== id) return;
        setState({ status: 'error' });
      });
  }, [selected, hours]);

  return (
    <section className="ref-section">
      <p className="ref-section-desc">
        Рыночные цены маркетплейса по данным sfl-price-service: ресурсы (включая Obsidian), NFT предметы,
        питомцы и Buds. Список строится по коду самой игры: не открытые для торговли предметы и питомцы до
        даты открытия скрыты; торгующиеся, но без сделок на рынке, показаны с пометкой.
      </p>

      <div className="ph-panel">
        <div className="ph-toolbar">
          <div className="ph-segmented">
            {BLOCKS.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`ph-segment${block === b.id ? ' active' : ''}`}
                onClick={() => { setBlock(b.id); setSelected(null); }}
              >
                {b.label}
              </button>
            ))}
          </div>
          <div className="ph-segmented">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.hours}
                type="button"
                className={`ph-segment${hours === opt.hours ? ' active' : ''}`}
                onClick={() => setHours(opt.hours)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {block === 'resources' && <ResourcesGrid onSelect={handleSelect} selectedKey={selected?.key ?? null} />}
        {block === 'items' && <ItemsBlock onSelect={handleSelect} selected={selected} />}
        {block === 'pets' && <NftGrid category="pets" onSelect={handleSelect} selectedKey={selected?.key ?? null} />}
        {block === 'buds' && <NftGrid category="buds" onSelect={handleSelect} selectedKey={selected?.key ?? null} />}
      </div>

      <div className="ph-card">
        {!selected && <div className="ph-status">Выберите предмет выше — здесь появится график цены.</div>}
        {selected && (
          <>
            <div className="ph-card-title rph-card-title-row">
              {selected.icon && <img src={selected.icon} alt="" className="rph-title-icon" />}
              <span>{selected.name}</span>
            </div>
            {state.status === 'loading' && <div className="ph-status">Загрузка истории...</div>}
            {state.status === 'error' && <div className="ph-status ph-status--error">Не удалось загрузить историю цены.</div>}
            {state.status === 'ready' && state.points.length === 0 && (
              <div className="ph-status">
                {selected.key
                  ? 'История цены за этот период не найдена — предмет мог не торговаться.'
                  : 'Предмет торгуется, но сделок на маркетплейсе по нему ещё не было — мёртв на рынке.'}
              </div>
            )}
            {state.status === 'ready' && state.points.length > 0 && (
              <>
                <PriceChart points={state.points} />
                <PriceTable points={state.points} />
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
