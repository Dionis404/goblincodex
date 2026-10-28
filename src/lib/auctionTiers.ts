/**
 * Анализатор тиров предметов аукционов будущей (а после старта — идущей) главы.
 * Только SSR: ходит в goblin-api (аукционы и ставки) и sfl-price-service
 * (рынок и курс Flower).
 *
 * Цена предмета в $:
 *  - если предмет торгуется на маркетплейсе — floor в $ (последняя точка);
 *  - иначе — медиана ставок победителей его уже прошедших дропов за Flower или
 *    Gem: Flower по курсу на момент начала аукциона (аукцион идёт 10 минут,
 *    времени отдельной ставки API не даёт), Gem по цене пака 15 500 gems за
 *    $129,99. Стартовая цена дропов символическая (1 Flower / 1 Gem), поэтому до
 *    первых ставок цены у нового предмета нет. Дропы за тикеты главы не считаются.
 * Тир = место в рейтинге по «цене с поправкой на саплай» (один предмет на тир):
 * чем меньше штук разыграно на аукционах, тем выше поправка.
 */
import { fetchAuctionResults, fetchAuctionsInRange, type UiAuction } from './auctionsApi';
import { fetchPriceHistory, fetchPriceResources, type PricePoint } from './priceApi';
import { WEARABLE_NAMES } from './wearableNames';
import { withTtlCache } from './cache';

/** Цена одного Gem в $: пак 15 500 gems за $129,99. */
export const GEM_USD = 129.99 / 15500;

/** Саплай, при котором поправка равна 1: меньше — предмет ценнее, больше — дешевле. */
export const SUPPLY_REFERENCE = 50;
/** Степень поправки: (50 / саплай)^0.25 — 10 шт ×1,5, 25 шт ×1,19, 200 шт ×0,71. */
export const SUPPLY_EXPONENT = 0.25;

export function supplyMultiplier(supply: number): number {
  return supply > 0 ? Math.pow(SUPPLY_REFERENCE / supply, SUPPLY_EXPONENT) : 1;
}

const TTL_MS = 10 * 60 * 1000;
const CONCURRENCY = 8;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// ─── Цены ─────────────────────────────────────────────────────────────────────

/** item_key в sfl-price-service по имени предмета (коллекционные + одежда). */
async function priceKeys(): Promise<Map<string, string>> {
  const { data } = await withTtlCache('auction-tiers:price-keys', TTL_MS, async () => {
    const collectibles = await fetchPriceResources('collectibles');
    if (collectibles.length === 0) throw new Error('empty collectibles list');
    const map = new Map<string, string>(collectibles.map((r) => [r.item_name.toLowerCase(), r.item_key]));
    for (const [id, name] of Object.entries(WEARABLE_NAMES)) map.set(name.toLowerCase(), `wearables-${id}`);
    return map;
  });
  return data;
}

/**
 * Курс Flower в $ по времени: каждый снимок цены несёт flower_price. Нужен
 * предмет с редкими (раз в час) снимками: история отдаётся от старых точек к
 * новым и режется лимитом, а у ресурсов вроде Wood снимок каждые 5 минут —
 * 2000 точек заканчиваются за пару недель до сегодня. Берём первый предмет,
 * чья история доходит до последних двух суток.
 */
const FLOWER_RATE_ITEMS = ['Nancy', 'Quarry', 'Gnome', 'Kuebiko', 'Rooster', 'Obie'];

async function flowerRateSeries(keys: Map<string, string>): Promise<{ t: number; usd: number }[]> {
  const { data } = await withTtlCache('auction-tiers:flower-rate', TTL_MS, async () => {
    for (const name of FLOWER_RATE_ITEMS) {
      const key = keys.get(name.toLowerCase());
      if (!key) continue;
      const points = await fetchPriceHistory(key, 2160, 2000);
      const series = points
        .filter((p) => p.flower_price != null && p.flower_price > 0)
        .map((p) => ({ t: new Date(p.captured_at).getTime(), usd: p.flower_price! }));
      if (series.length && Date.now() - series[series.length - 1].t < 2 * 86_400_000) return series;
    }
    throw new Error('нет истории курса Flower');
  });
  return data;
}

/** Курс Flower на момент t: ближайший снимок (раньше начала истории — самый ранний известный). */
function rateAt(series: { t: number; usd: number }[], t: number): number | null {
  if (!series.length) return null;
  let best = series[0];
  for (const p of series) if (Math.abs(p.t - t) < Math.abs(best.t - t)) best = p;
  return best.usd;
}

interface MarketPrice {
  usd: number;
  flower: number | null;
  at: string;
}

/** Последняя рыночная цена предмета в $, если он торгуется. */
async function marketPrice(name: string, keys: Map<string, string>): Promise<MarketPrice | null> {
  const key = keys.get(name.toLowerCase());
  if (!key) return null;
  const { data } = await withTtlCache(`auction-tiers:market:${key}`, TTL_MS, async () => {
    // Последние двое суток: история идёт от старых точек к новым, и на длинном
    // окне лимит отрезал бы как раз свежие цены.
    const points: PricePoint[] = await fetchPriceHistory(key, 48, 2000);
    for (let i = points.length - 1; i >= 0; i--) {
      const p = points[i];
      const flower = p.floor ?? p.latest_sale;
      const usd = p.floor_usd ?? p.latest_sale_usd ?? (flower != null && p.flower_price ? flower * p.flower_price : null);
      if (usd != null && usd > 0) return { usd, flower, at: p.captured_at };
    }
    return null;
  });
  return data;
}

// ─── Анализ ───────────────────────────────────────────────────────────────────

export interface TierRow {
  tier: number;
  name: string;
  type: UiAuction['type'];
  /** Сколько штук разыграно на всех аукционах главы. */
  supply: number;
  drops: number;
  /** Цена, по которой считается тир. */
  priceUsd: number;
  source: 'market' | 'auction';
  marketUsd: number | null;
  marketFlower: number | null;
  /** Медиана ставок победителей в $ (null — ставок нет). */
  auctionUsd: number | null;
  /** Медиана ставок в Flower и Gem — как платили победители. */
  auctionFlower: number | null;
  auctionGems: number | null;
  winners: number;
  multiplier: number;
  score: number;
  ticketSupply: number;
  ticket: string | null;
  topRange: TopRange | null;
}

/**
 * Места в топе по тикетам главы, на которых игрок забирает предмет, если все
 * выше разбирают более высокие тиры: from = сумма саплая за тикеты у тиров
 * выше + 1, to = та же сумма + саплай за тикеты самого предмета.
 */
export interface TopRange {
  from: number;
  to: number;
}

export interface TierAnalysis {
  rows: TierRow[];
  /**
   * Предметы без цены: аукционы ещё не прошли или нет ставок. Предварительный
   * тир — место по саплаю дропов за тикеты главы (меньше штук — выше тир);
   * при равном саплае тир общий. null — дропов за тикеты у предмета нет.
   */
  pending: PendingItem[];
  auctionsTotal: number;
  auctionsEnded: number;
  flowerRateNow: number | null;
}

export interface PendingItem {
  name: string;
  type: UiAuction['type'];
  supply: number;
  firstStart: number;
  /** Сколько штук разыгрывается за тикеты главы (по всем таким дропам). */
  ticketSupply: number;
  ticketDrops: number;
  /** Название тикета главы (Duende Cap и т. п.). */
  ticket: string | null;
  prelimTier: number | null;
  /** Есть ли у предмета бонус (иначе декор): в предварительном рейтинге бонусные выше декора. */
  boost: boolean;
  topRange: TopRange | null;
}

interface Bid {
  usd: number;
  flower: number;
  gems: number;
}

const itemName = (a: UiAuction) => a.collectible ?? a.wearable ?? a.nft ?? '?';

/** Тикет главы, за который идёт дроп: не Flower и не Gem. */
const ticketOf = (a: UiAuction): string | null =>
  a.sfl > 0 ? null : (Object.keys(a.ingredients).find((k) => k !== 'Gem') ?? null);

/**
 * isBoost — есть ли у предмета бонус (по каталогу). В предварительном рейтинге
 * предметы с бонусом стоят выше декора независимо от саплая; по умолчанию все
 * считаются бонусными.
 */
export async function analyzeAuctionTiers(
  startMs: number,
  endMs: number,
  isBoost: (name: string) => boolean = () => true,
): Promise<TierAnalysis> {
  const now = Date.now();
  const auctions = await fetchAuctionsInRange(startMs, endMs);
  const keys = await priceKeys().catch(() => new Map<string, string>());
  const series = await flowerRateSeries(keys).catch(() => []);

  const ended = auctions.filter((a) => a.endAt <= now);
  const results = await mapLimit(ended, CONCURRENCY, async (a) => {
    const { data } = await withTtlCache(`auction-tiers:results:${a.auctionId}`, TTL_MS, () => fetchAuctionResults(a.auctionId));
    return { auction: a, results: data };
  });

  const bidsByItem = new Map<string, Bid[]>();
  for (const { auction, results: r } of results) {
    if (!r) continue;
    const rate = rateAt(series, auction.startAt);
    type Entry = { rank: number; sfl: number; items: Record<string, number> };
    const winners = ([...(r.leaderboard as Entry[])] as Entry[]).sort((x, y) => x.rank - y.rank).slice(0, r.supply || auction.supply);
    const list = bidsByItem.get(itemName(auction)) ?? [];
    for (const e of winners) {
      // Только ставки во Flower и Gem; ставки тикетами главы в цену не входят.
      const gems = e.items?.Gem ?? 0;
      const flower = e.sfl ?? 0;
      if (flower <= 0 && gems <= 0) continue;
      if (flower > 0 && rate == null) continue;
      list.push({ usd: flower * (rate ?? 0) + gems * GEM_USD, flower, gems });
    }
    bidsByItem.set(itemName(auction), list);
  }

  // Предметы главы: суммарный саплай по всем дропам.
  type ItemStats = {
    type: UiAuction['type'];
    supply: number;
    drops: number;
    firstStart: number;
    ticketSupply: number;
    ticketDrops: number;
    ticket: string | null;
  };
  const items = new Map<string, ItemStats>();
  for (const a of auctions) {
    const it = items.get(itemName(a)) ?? {
      type: a.type, supply: 0, drops: 0, firstStart: a.startAt, ticketSupply: 0, ticketDrops: 0, ticket: null,
    };
    it.supply += a.supply;
    it.drops += 1;
    it.firstStart = Math.min(it.firstStart, a.startAt);
    const ticket = ticketOf(a);
    if (ticket) {
      it.ticket = ticket;
      it.ticketSupply += a.supply;
      it.ticketDrops += 1;
    }
    items.set(itemName(a), it);
  }

  const rows: Omit<TierRow, 'tier'>[] = [];
  const pending: PendingItem[] = [];
  await mapLimit([...items.entries()], CONCURRENCY, async ([name, it]) => {
    const market = await marketPrice(name, keys).catch(() => null);
    const bids = bidsByItem.get(name) ?? [];
    const auctionUsd = bids.length ? median(bids.map((b) => b.usd)) : null;
    const priceUsd = market?.usd ?? auctionUsd;
    if (priceUsd == null) {
      pending.push({
        name,
        type: it.type,
        supply: it.supply,
        firstStart: it.firstStart,
        ticketSupply: it.ticketSupply,
        ticketDrops: it.ticketDrops,
        ticket: it.ticket,
        prelimTier: null,
        boost: isBoost(name),
        topRange: null,
      });
      return;
    }
    const multiplier = supplyMultiplier(it.supply);
    rows.push({
      name,
      type: it.type,
      supply: it.supply,
      drops: it.drops,
      priceUsd,
      source: market ? 'market' : 'auction',
      marketUsd: market?.usd ?? null,
      marketFlower: market?.flower ?? null,
      auctionUsd,
      auctionFlower: bids.length ? median(bids.map((b) => b.flower)) : null,
      auctionGems: bids.length ? median(bids.map((b) => b.gems)) : null,
      winners: bids.length,
      multiplier,
      score: priceUsd * multiplier,
      ticketSupply: it.ticketSupply,
      ticket: it.ticket,
      topRange: null,
    });
  });

  rows.sort((a, b) => b.score - a.score);
  rows.forEach((r, i) => ((r as TierRow).tier = i + 1));
  // Предварительный тир продолжает лестницу после тиров с ценой: сначала
  // предметы с бонусом, затем декор; внутри — меньше штук за тикеты выше;
  // равный саплай в одной группе — общий тир.
  pending.sort(
    (a, b) =>
      Number(a.ticketSupply === 0) - Number(b.ticketSupply === 0) ||
      Number(!a.boost) - Number(!b.boost) ||
      a.ticketSupply - b.ticketSupply ||
      a.firstStart - b.firstStart,
  );
  pending.forEach((p, i) => {
    if (p.ticketSupply === 0) return;
    const prev = pending[i - 1];
    p.prelimTier = prev && prev.ticketSupply === p.ticketSupply && prev.boost === p.boost ? prev.prelimTier : rows.length + i + 1;
  });

  // Места в топе по тикетам: идём по общей лестнице тиров и копим саплай за
  // тикеты. Предметы с общим тиром делят один диапазон на всю группу.
  const ladder: { tier: number | null; ticketSupply: number; topRange: TopRange | null }[] = [
    ...(rows as TierRow[]),
    ...pending,
  ].map((x) => ({ ...x, tier: 'prelimTier' in x ? x.prelimTier : x.tier }));
  let taken = 0;
  for (let i = 0; i < ladder.length; ) {
    let j = i;
    let group = 0;
    while (j < ladder.length && (j === i || (ladder[j].tier != null && ladder[j].tier === ladder[i].tier))) {
      group += ladder[j].ticketSupply;
      j++;
    }
    const range = group > 0 ? { from: taken + 1, to: taken + group } : null;
    for (let k = i; k < j; k++) {
      const src = k < rows.length ? (rows[k] as TierRow) : pending[k - rows.length];
      src.topRange = src.ticketSupply > 0 ? range : null;
    }
    taken += group;
    i = j;
  }

  return {
    rows: rows as TierRow[],
    pending,
    auctionsTotal: auctions.length,
    auctionsEnded: ended.length,
    flowerRateNow: series.length ? series[series.length - 1].usd : null,
  };
}
