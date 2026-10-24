import { useMemo, useState } from 'react';
import '../SortableTable.css';
import FOOD_ICONS from '../../lib/foodIcons.json';
import { FlowerAmount } from '../ResourceIcon';
import { useItemPrices } from '../../lib/useItemPrices';
import { useCoinRate } from '../../lib/useCoinRate';
import { NO_FISHING_BOOSTS, fishUnitCost, type FishTier } from '../../lib/fishYield';
import {
  BUILDINGS,
  FOOD_ALL_PRICE_NAMES,
  NO_TIME_BOOSTS,
  NO_XP_BOOSTS,
  fishXpMultiplier,
  recipeCost,
  timeMultiplier,
  withBaitPrices,
  xpMultiplier,
  type Building,
  type Recipe,
  type TimeBoosts,
  type XpBoosts,
} from '../../lib/food';
import { FISH_RECORDS } from '../../lib/fishData.generated';
import BoostPanel from '../BoostPanel';
import { Check, RankSelect, TimeBoostsPanel, XpBoostsPanel } from './FoodBoostPanels';

/**
 * Рецепты и формулы сверены с исходниками sunflower-land (см. scripts/README.md):
 * - features/game/types/consumables.ts — FIRE_PIT_COOKABLES / KITCHEN_COOKABLES /
 *   BAKERY_COOKABLES / DELI_COOKABLES / JUICE_COOKABLES (name/experience/
 *   cookingSeconds/ingredients/building).
 * - features/game/expansion/lib/boosts.ts — getCookingTime (бусты времени) и
 *   getFoodExpBoost (бусты опыта).
 * - features/game/events/landExpansion/cook.ts — BUILDING_OIL_BOOSTS (буст от
 *   масла, зависит от здания и от ранга Swift Sizzle/Turbo Fry/Fry Frenzy).
 * - src/lib/skills.ts — ранги скиллов дерева Cooking (уже нормализованы в проекте).
 *
 * Иконки — src/lib/foodIcons.json (имя блюда/рыбы/ингредиента -> путь спрайта),
 * сгенерирован из ITEM_DETAILS / CROP_LIFECYCLE исходников игры (см. историю
 * коммита: scripts/lib/sprite-map.ts parseSpriteMap/parseCropCdnMap).
 */

function FoodIcon({ name, small }: { name: string; small?: boolean }) {
  const src = (FOOD_ICONS as Record<string, string>)[name];
  if (!src) return null;
  return <img src={src} alt="" className={small ? 'ref-marvel-icon ref-food-icon--sm' : 'ref-marvel-icon'} />;
}

/** Значок молнии — ставится рядом со значением, изменённым активными бустами. */
function BoostBadge() {
  return (
    <span className="ref-food-boost-badge" title="Значение с учётом бустов">
      ⚡
    </span>
  );
}

/**
 * На мобильном таблица превращается в карточки (см. SortableTable.css) и
 * заголовки с кнопками сортировки скрываются — этот select дублирует ту же
 * сортировку в виде "Колонка ↑/↓", виден только на мобильном (CSS).
 */
function MobileSortSelect<K extends string>({
  columns,
  sortKey,
  sortDir,
  onChange,
}: {
  columns: { key: K; label: string }[];
  sortKey: K;
  sortDir: 'asc' | 'desc';
  onChange: (key: K, dir: 'asc' | 'desc') => void;
}) {
  const value = `${sortKey}:${sortDir}`;
  return (
    <label className="ref-food-mobile-sort">
      <span>Сортировать по</span>
      <select
        value={value}
        onChange={(e) => {
          const [key, dir] = e.target.value.split(':') as [K, 'asc' | 'desc'];
          onChange(key, dir);
        }}
        className="ref-food-rank-select"
      >
        {columns.map((col) => (
          <optgroup key={col.key} label={col.label}>
            <option value={`${col.key}:asc`}>{col.label} ↑</option>
            <option value={`${col.key}:desc`}>{col.label} ↓</option>
          </optgroup>
        ))}
      </select>
    </label>
  );
}


/** Значок «i» с пояснением, что цена указана не за все ингредиенты (тултип по hover/фокусу/тапу). */
function PartialPriceInfo({ missing }: { missing: string[] }) {
  if (missing.length === 0) return null;
  const text = `Цена указана только за те ингредиенты, у которых она есть. Нет цены: ${missing.join(', ')}.`;
  return (
    <span className="ref-info-badge" tabIndex={0} role="img" aria-label={text} data-tip={text}>
      i
    </span>
  );
}

/**
 * Рыба — не рецепт готовки: её можно съесть сырой сразу (без здания/ингредиентов)
 * или заложить в Aging Shed за соль, чтобы получить Aged Fish (и с шансом 10% —
 * Prime Aged Fish, ×1.3 XP). Формулы сверены с features/game/types/agingBase.ts
 * (getAgingMaxXP / getAgingSaltCost / getAgingTimeMs) — см. также FishAgingTable.tsx
 * и src/content/mechanics/fish-aging.md.
 */
const FISH_BASE_XP: Record<string, number> = {
  Anchovy: 80, 'Red Snapper': 100, Butterflyfish: 110, 'Sea Bass': 140, Blowfish: 170,
  'Olive Flounder': 180, Napoleanfish: 180, Tilapia: 190, Tuna: 200, 'Mahi Mahi': 200,
  'Blue Marlin': 200, 'Football fish': 200, Sunfish: 200, 'Sea Horse': 240, Halibut: 220,
  'Moray Eel': 220, 'Zebra Turkeyfish': 220, Oarfish: 220, Clownfish: 210, Surgeonfish: 210,
  Walleye: 210, Weakfish: 210, 'Horse Mackerel': 250, Squid: 250, Angelfish: 250, Porgy: 250,
  Muskellunge: 250, Cobia: 310, 'Rock Blackfish': 320, Trout: 330, Coelacanth: 410, Ray: 430,
  Parrotfish: 440, 'Barred Knifejaw': 580, 'Hammerhead shark': 750, 'Whale Shark': 1370,
  'Saw Shark': 1920, 'White Shark': 2000,
};

const PRIME_AGED_XP_MULTIPLIER = 1.3;

function getAgingMaxXP(baseXP: number): number {
  if (baseXP <= 200) return baseXP * 3;
  if (baseXP <= 330) return baseXP * 4;
  return baseXP * 5;
}
function getAgingSaltCost(baseXP: number): number {
  return Math.round(getAgingMaxXP(baseXP) / 50);
}
function getAgingTimeHours(baseXP: number): number {
  const maxXP = getAgingMaxXP(baseXP);
  const j = baseXP <= 200 ? 300 : baseXP <= 330 ? 500 : 1000;
  return (maxXP - baseXP) / j;
}

interface FishRow {
  name: string;
  rawXp: number;
  agedXp: number;
  primeAgedXp: number;
  saltCost: number;
  agingHours: number;
}

const FISH_ROWS: FishRow[] = Object.entries(FISH_BASE_XP).map(([name, baseXP]) => {
  const agedXp = getAgingMaxXP(baseXP);
  return {
    name,
    rawXp: baseXP,
    agedXp,
    primeAgedXp: Math.floor(agedXp * PRIME_AGED_XP_MULTIPLIER),
    saltCost: getAgingSaltCost(baseXP),
    agingHours: getAgingTimeHours(baseXP),
  };
});

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'мгновенно';
  const s = Math.round(totalSeconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d} д`);
  if (h > 0) parts.push(`${h} ч`);
  if (d === 0 && m > 0) parts.push(`${m} мин`);
  if (d === 0 && h === 0 && m === 0) parts.push(`${sec} сек`);
  return parts.join(' ') || '0 сек';
}

type SortKey = 'name' | 'experience' | 'cookingSeconds' | 'xpPerHour' | 'cost' | 'xpPerFlower';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Блюдо' },
  { key: 'experience', label: 'Опыт' },
  { key: 'cookingSeconds', label: 'Время' },
  { key: 'xpPerHour', label: 'XP/час' },
  { key: 'cost', label: 'Цена' },
  { key: 'xpPerFlower', label: 'XP/Flower' },
];

function BuildingTable({
  recipes,
  timeBoosts,
  xpBoosts,
  prices,
}: {
  recipes: Recipe[];
  timeBoosts: TimeBoosts;
  xpBoosts: XpBoosts;
  /** null — цены ещё грузятся. */
  prices: Record<string, number | null> | null;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('experience');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const rows = useMemo(() => {
    return recipes.map((r) => {
      const tMult = timeMultiplier(r, timeBoosts);
      const xMult = xpMultiplier(r, xpBoosts);
      const boostedSeconds = r.cookingSeconds * tMult;
      const boostedXp = r.experience * xMult;
      const xpPerHour = boostedSeconds > 0 ? (boostedXp / boostedSeconds) * 3600 : Infinity;
      const { cost, missing } = prices ? recipeCost(r.name, prices) : { cost: null, missing: [] as string[] };
      const xpPerFlower = cost != null && cost > 0 ? boostedXp / cost : null;
      return { ...r, boostedSeconds, boostedXp, xpPerHour, cost, missing, xpPerFlower, boosted: tMult < 1 || xMult > 1 };
    });
  }, [recipes, timeBoosts, xpBoosts, prices]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      // Блюда без цены всегда внизу, в любом направлении сортировки.
      if (sortKey === 'cost' || sortKey === 'xpPerFlower') {
        const an = a[sortKey];
        const bn = b[sortKey];
        if (an == null || bn == null) return an == null ? (bn == null ? 0 : 1) : -1;
        return sortDir === 'asc' ? an - bn : bn - an;
      }
      let av: number | string;
      let bv: number | string;
      if (sortKey === 'name') {
        av = a.name;
        bv = b.name;
      } else if (sortKey === 'experience') {
        av = a.boostedXp;
        bv = b.boostedXp;
      } else if (sortKey === 'cookingSeconds') {
        av = a.boostedSeconds;
        bv = b.boostedSeconds;
      } else {
        av = a.xpPerHour === Infinity ? Number.MAX_SAFE_INTEGER : a.xpPerHour;
        bv = b.xpPerHour === Infinity ? Number.MAX_SAFE_INTEGER : b.xpPerHour;
      }
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  return (
    <div>
      <MobileSortSelect
        columns={COLUMNS}
        sortKey={sortKey}
        sortDir={sortDir}
        onChange={(key, dir) => {
          setSortKey(key);
          setSortDir(dir);
        }}
      />
      <div className="gc-sortable-wrap">
        <table className="gc-sortable-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th key={col.key}>
                <button type="button" className="gc-sortable-th-btn" onClick={() => toggleSort(col.key)}>
                  {col.label}
                  <span className={`gc-sortable-arrow${sortKey === col.key ? ' gc-sortable-arrow--active' : ''}`}>
                    {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                  </span>
                </button>
              </th>
            ))}
            <th>Ингредиенты</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((r) => (
            <tr key={r.name}>
              <td className="gc-sortable-name" data-label="Блюдо">
                <FoodIcon name={r.name} />
                {r.name}
                {r.upcoming && (
                  <span className="ref-upcoming-badge" title="Блюдо из предложения Главы 16 — ещё не добавлено в игру">
                    Ещё не в игре
                  </span>
                )}
              </td>
              <td
                data-label="Опыт"
                className={r.boostedXp !== r.experience ? 'ref-marvel-odds ref-marvel-odds--boosted' : undefined}
              >
                {Math.round(r.boostedXp)}
                {r.boostedXp !== r.experience && <BoostBadge />}
              </td>
              <td
                data-label="Время"
                className={r.boostedSeconds !== r.cookingSeconds ? 'ref-marvel-odds ref-marvel-odds--boosted' : undefined}
              >
                {formatDuration(r.boostedSeconds)}
                {r.boostedSeconds !== r.cookingSeconds && <BoostBadge />}
              </td>
              <td data-label="XP/час">{r.xpPerHour === Infinity ? '—' : Math.round(r.xpPerHour).toLocaleString('ru-RU')}</td>
              <td data-label="Цена">
                {prices == null ? '…' : r.cost != null ? <FlowerAmount compact value={r.cost} /> : '—'}
                {r.cost != null && <PartialPriceInfo missing={r.missing} />}
              </td>
              <td data-label="XP/Flower">
                {prices == null ? '…' : r.xpPerFlower != null
                  ? Math.round(r.xpPerFlower).toLocaleString('ru-RU')
                  : '—'}
                {r.xpPerFlower != null && <PartialPriceInfo missing={r.missing} />}
              </td>
              <td className="ref-table-resources" data-label="Ингредиенты">
                <span className="ref-resource-chips">
                  {r.ingredients.map(([name, amount]) => (
                    <span className="ref-resource-chip" key={name}>
                      <FoodIcon name={name} small />
                      {amount}× {name}
                    </span>
                  ))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}

type FishSortKey =
  | 'name' | 'rawXp' | 'agedXp' | 'primeAgedXp' | 'saltCost' | 'agingHours' | 'agingXpPerHour'
  | 'fishCost' | 'saltPrice' | 'agedXpPerFlower';

const FISH_COLUMNS: { key: FishSortKey; label: string }[] = [
  { key: 'name', label: 'Рыба' },
  { key: 'rawXp', label: 'Сырая (XP)' },
  { key: 'saltCost', label: 'Соль' },
  { key: 'agingHours', label: 'Время соления' },
  { key: 'agedXp', label: 'Aged (XP)' },
  { key: 'primeAgedXp', label: 'Prime Aged (XP)' },
  { key: 'agingXpPerHour', label: 'XP/час (соление)' },
  { key: 'fishCost', label: 'Себест. рыбы' },
  { key: 'saltPrice', label: 'Цена соли' },
  { key: 'agedXpPerFlower', label: 'Доп. XP/Flower' },
];

// Соль — предмет маркета (ищется
// в collectibles по имени).
const FISH_PRICE_NAMES = ['Salt'];
const PRICE_SORT_KEYS: FishSortKey[] = ['fishCost', 'saltPrice', 'agedXpPerFlower'];
const FISH_TIER = new Map(FISH_RECORDS.map((f) => [f.name, f.type as FishTier]));

// ── Шанс на Prime Aged Fish (features/game/types/agingFormulas.ts getPrimeAgedChance) ──
const PRIME_AGED_BASE_CHANCE = 10; // %
const FISH_SMOKING_RANKS = [2, 3, 4]; // множитель на базовый шанс

interface PrimeChanceBoosts {
  fishSmokingRank: 0 | 1 | 2 | 3;
  saltSculpture: boolean; // Salt Sculpture ур. ≥2: +4%
  wingedVase: boolean; // +14%
}

function primeAgedChance(b: PrimeChanceBoosts): number {
  let chance = PRIME_AGED_BASE_CHANCE;
  if (b.fishSmokingRank > 0) chance *= FISH_SMOKING_RANKS[b.fishSmokingRank - 1];
  if (b.saltSculpture) chance += 4;
  if (b.wingedVase) chance += 14;
  return Math.min(chance, 100);
}

function FishTable({ xpBoosts, prices }: { xpBoosts: XpBoosts; prices: Record<string, number | null> | null }) {
  const { rate: coinRate } = useCoinRate();
  const [sortKey, setSortKey] = useState<FishSortKey>('rawXp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [primeBoosts, setPrimeBoosts] = useState<PrimeChanceBoosts>({
    fishSmokingRank: 0,
    saltSculpture: false,
    wingedVase: false,
  });

  function toggleSort(key: FishSortKey) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const chance = primeAgedChance(primeBoosts);

  const rows = useMemo(() => {
    const mult = fishXpMultiplier(xpBoosts);
    const chanceRatio = chance / 100;
    return FISH_ROWS.map((f) => {
      const boostedRawXp = Math.round(f.rawXp * mult);
      const boostedAgedXp = Math.round(f.agedXp * mult);
      const boostedPrimeAgedXp = Math.round(f.primeAgedXp * mult);
      // Средневзвешенный XP выдержанной рыбы с учётом шанса на Prime Aged.
      const avgAgedXp = boostedAgedXp * (1 - chanceRatio) + boostedPrimeAgedXp * chanceRatio;
      const agingXpPerHour = f.agingHours > 0 ? (avgAgedXp - boostedRawXp) / f.agingHours : Infinity;
      // Рыба не продаётся (её ловят), поэтому стоит только соль. Засолка даёт
      // прибавку к XP сырой рыбы — считаем её на 1 Flower потраченной соли.
      // Сама рыба — по себестоимости заброса удочки (без бустов, fishYield.ts).
      const tier = FISH_TIER.get(f.name);
      const fishCost = prices && coinRate !== undefined && tier ? fishUnitCost(tier, 'spring', prices, coinRate, NO_FISHING_BOOSTS) : null;
      const saltUnit = prices?.Salt ?? null;
      const saltPrice = saltUnit != null ? saltUnit * f.saltCost : null;
      const agedXpPerFlower = saltPrice != null && saltPrice > 0 ? (avgAgedXp - boostedRawXp) / saltPrice : null;
      return {
        ...f,
        boostedRawXp,
        boostedAgedXp,
        boostedPrimeAgedXp,
        agingXpPerHour,
        fishCost,
        saltPrice,
        agedXpPerFlower,
      };
    });
  }, [xpBoosts, chance, prices, coinRate]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      // Строки без цены всегда внизу, в любом направлении сортировки.
      if (PRICE_SORT_KEYS.includes(sortKey)) {
        const an = a[sortKey as 'saltPrice'];
        const bn = b[sortKey as 'saltPrice'];
        if (an == null || bn == null) return an == null ? (bn == null ? 0 : 1) : -1;
        return sortDir === 'asc' ? an - bn : bn - an;
      }
      let av: number | string = sortKey === 'name' ? a.name : (a[sortKey as 'rawXp'] as number);
      let bv: number | string = sortKey === 'name' ? b.name : (b[sortKey as 'rawXp'] as number);
      if (typeof av === 'number' && av === Infinity) av = Number.MAX_SAFE_INTEGER;
      if (typeof bv === 'number' && bv === Infinity) bv = Number.MAX_SAFE_INTEGER;
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  return (
    <div>
      <BoostPanel title="Бусты шанса Prime Aged">
        <div className="ref-marvel-boost-widget">
          <div className="ref-food-boost-checks">
            <Check
              label="Salt Sculpture ур. 2+ (+4%)"
              icon="Salt Sculpture"
              checked={primeBoosts.saltSculpture}
              onChange={(v) => setPrimeBoosts((p) => ({ ...p, saltSculpture: v }))}
            />
            <Check
              label="Winged Vase (+14%)"
              icon="Winged Vase"
              checked={primeBoosts.wingedVase}
              onChange={(v) => setPrimeBoosts((p) => ({ ...p, wingedVase: v }))}
            />
          </div>
          <div className="ref-food-boost-selects">
            <RankSelect
              label="Fish Smoking (шанс Prime Aged)"
              icon="Fish Smoking"
              value={primeBoosts.fishSmokingRank}
              onChange={(v) => setPrimeBoosts((p) => ({ ...p, fishSmokingRank: v as 0 | 1 | 2 | 3 }))}
            />
          </div>
          <p className="ref-marvel-boost-total">
            <strong>Шанс Prime Aged: {chance}%</strong>
          </p>
        </div>
      </BoostPanel>
      <p className="ref-section-desc">
        Колонка «XP/час (соление)» считается по среднему XP выдержанной рыбы с учётом шанса
        Prime Aged выше — а не по гарантированной обычной Aged Fish.
      </p>
      <MobileSortSelect
        columns={FISH_COLUMNS}
        sortKey={sortKey}
        sortDir={sortDir}
        onChange={(key, dir) => {
          setSortKey(key);
          setSortDir(dir);
        }}
      />
      {prices && (
        <p className="ref-section-desc">
          Рыба на маркете не продаётся: «Себест. рыбы» — оценка по цене заброса удочки (монеты по
          курсу + дерево и камень), делённой на улов за заброс, без бустов рыбалки. «Цена соли» — стоимость всей
          соли на засолку этой рыбы по текущему floor. «Доп. XP/Flower» (опыт за 1 Flower) — на сколько XP
          засолка (средний XP выдержанной рыбы с шансом Prime Aged минус XP сырой) увеличивает
          опыт на каждый потраченный на соль Flower. Нет цены соли — «—».
        </p>
      )}
      <div className="gc-sortable-wrap">
        <table className="gc-sortable-table">
          <thead>
            <tr>
              {FISH_COLUMNS.map((col) => (
                <th key={col.key}>
                  <button type="button" className="gc-sortable-th-btn" onClick={() => toggleSort(col.key)}>
                    {col.label}
                    <span className={`gc-sortable-arrow${sortKey === col.key ? ' gc-sortable-arrow--active' : ''}`}>
                      {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r) => (
              <tr key={r.name}>
                <td className="gc-sortable-name" data-label="Рыба">
                  <FoodIcon name={r.name} />
                  {r.name}
                </td>
                <td
                  data-label="Сырая (XP)"
                  className={r.boostedRawXp !== r.rawXp ? 'ref-marvel-odds ref-marvel-odds--boosted' : undefined}
                >
                  {r.boostedRawXp}
                  {r.boostedRawXp !== r.rawXp && <BoostBadge />}
                </td>
                <td data-label="Соль">{r.saltCost}</td>
                <td data-label="Время соления">{formatDuration(r.agingHours * 3600)}</td>
                <td
                  data-label="Aged (XP)"
                  className={r.boostedAgedXp !== r.agedXp ? 'ref-marvel-odds ref-marvel-odds--boosted' : undefined}
                >
                  {r.boostedAgedXp}
                  {r.boostedAgedXp !== r.agedXp && <BoostBadge />}
                </td>
                <td
                  data-label="Prime Aged (XP)"
                  className={r.boostedPrimeAgedXp !== r.primeAgedXp ? 'ref-marvel-odds ref-marvel-odds--boosted' : undefined}
                >
                  {r.boostedPrimeAgedXp}
                  {r.boostedPrimeAgedXp !== r.primeAgedXp && <BoostBadge />}
                </td>
                <td data-label="XP/час (соление)">
                  {r.agingXpPerHour === Infinity ? '—' : Math.round(r.agingXpPerHour).toLocaleString('ru-RU')}
                </td>
                <td data-label="Себест. рыбы">
                  {prices == null ? '…' : r.fishCost != null ? <>≈ <FlowerAmount compact value={r.fishCost} /></> : '—'}
                </td>
                <td data-label="Цена соли">
                  {prices == null ? '…' : r.saltPrice != null ? <FlowerAmount compact value={r.saltPrice} /> : '—'}
                </td>
                <td data-label="Доп. XP/Flower">
                  {prices == null ? '…' : r.agedXpPerFlower != null ? Math.round(r.agedXpPerFlower).toLocaleString('ru-RU') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FoodCatalogTable() {
  const marketPrices = useItemPrices([...FOOD_ALL_PRICE_NAMES, ...FISH_PRICE_NAMES]);
  const { rate: coinRate } = useCoinRate();
  const prices = useMemo(() => {
    if (!marketPrices || coinRate === undefined) return marketPrices;
    return withBaitPrices(marketPrices, coinRate);
  }, [marketPrices, coinRate]);
  const [activeTab, setActiveTab] = useState<Building | 'Fish'>('Fire Pit');

  const [timeBoosts, setTimeBoosts] = useState<TimeBoosts>(NO_TIME_BOOSTS);

  const [xpBoosts, setXpBoosts] = useState<XpBoosts>(NO_XP_BOOSTS);

  const activeGroup = activeTab === 'Fish' ? null : BUILDINGS.find((b) => b.key === activeTab)!;

  return (
    <div>
      <TimeBoostsPanel boosts={timeBoosts} onChange={setTimeBoosts} />

      <XpBoostsPanel boosts={xpBoosts} onChange={setXpBoosts} />

      <div className="ref-food-tabs">
        {BUILDINGS.map((b) => (
          <button
            key={b.key}
            type="button"
            className={`ref-food-tab${b.key === activeTab ? ' ref-food-tab--active' : ''}`}
            onClick={() => setActiveTab(b.key)}
          >
            <span aria-hidden="true">{b.icon}</span> {b.label}
            <span className="ref-accordion-count">{b.recipes.length}</span>
          </button>
        ))}
        <button
          type="button"
          className={`ref-food-tab${activeTab === 'Fish' ? ' ref-food-tab--active' : ''}`}
          onClick={() => setActiveTab('Fish')}
        >
          <span aria-hidden="true">🐟</span> Рыба
          <span className="ref-accordion-count">{FISH_ROWS.length}</span>
        </button>
      </div>

      {activeGroup ? (
        <>
          <BuildingTable recipes={activeGroup.recipes} timeBoosts={timeBoosts} xpBoosts={xpBoosts} prices={prices} />
          {activeGroup.recipes.some((r) => r.upcoming) && (
            <p className="ref-section-desc ref-section-desc--spaced">
              <strong>Ещё не в игре:</strong> блюда с этой пометкой взяты из{' '}
              <a href="/news/175">балансного обновления предложения Главы 16</a>, а числа
              обновлены по <a href="https://github.com/sunflower-land/sunflower-land/pull/7810">PR #7810</a> —
              ребалансу трюфельных рецептов, который на момент написания ещё не влит. Это стартовая
              конфигурация для тестирования, числа могут измениться. Трюфелей на маркете нет, поэтому
              цена таких блюд считается без них (значок «i»). Бусты к ним применены по типу блюда
              (торт, мёд) — как у существующих блюд, в игре это пока не подтверждено.
            </p>
          )}
          <p className="ref-section-desc ref-section-desc--spaced">
            Цена — сумма ингредиентов по текущему floor на маркете (промежуточные блюда раскрыты до
            сырых ингредиентов). Рыбные наживки (Fish Flake, Fish Stick, Fish Oil, Crab Stick) на
            маркете не продаются, поэтому в блюдах они идут по себестоимости из раздела «Рыбалка и раки»
            (среднее по сезонам, без бустов) — это оценка, а не рыночная цена. «XP/Flower» — опыт за 1 Flower с учётом включённых бустов, делённый на цену.
            Если часть ингредиентов не продаётся (например, Magic Mushroom), цена считается только
            по продаваемым — у такого блюда значок «i» с перечнем ингредиентов без цены. «—» — когда
            цены нет ни у одного ингредиента.
          </p>
        </>
      ) : (
        <FishTable xpBoosts={xpBoosts} prices={prices} />
      )}
    </div>
  );
}
