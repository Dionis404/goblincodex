/**
 * SSR-клиент к goblin-api для расписания аукционов главы.
 * Эндпоинты разрабатываются параллельно в goblin-bot — формат ответа может
 * ещё измениться, тогда донастроим mapAuction ниже.
 */
import { GOBLIN_API_BASE, fetchWithTimeout } from './goblinApi';
import { withTtlCache } from './cache';

/** Форма, которую ожидает компонент ChapterAuctions (см. src/components/ChapterAuctions.tsx). */
export interface UiAuction {
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
}

interface ApiAuction {
  auction_id: string;
  item_name: string;
  item_type: string;
  supply: number;
  sfl_price: number;
  ingredients: Record<string, number>;
  start_at: number | string;
  end_at: number | string;
}

export interface AuctionResults {
  my_status: string;
  participant_count: number;
  supply: number;
  leaderboard: unknown[];
}

function toMs(value: number | string): number {
  return typeof value === 'number' ? value : new Date(value).getTime();
}

function mapAuction(a: ApiAuction): UiAuction {
  const type: UiAuction['type'] =
    a.item_type === 'wearable' || a.item_type === 'nft' ? a.item_type : 'collectible';

  const base: UiAuction = {
    auctionId: a.auction_id,
    sfl: a.sfl_price ?? 0,
    supply: a.supply,
    ingredients: a.ingredients ?? {},
    startAt: toMs(a.start_at),
    endAt: toMs(a.end_at),
    type,
  };

  if (type === 'wearable') base.wearable = a.item_name;
  else if (type === 'nft') base.nft = a.item_name;
  else base.collectible = a.item_name;

  return base;
}

/** Пустой массив при ошибке сети/API — страница просто покажет пустое расписание. */
export async function fetchUpcomingAuctions(): Promise<UiAuction[]> {
  try {
    const res = await fetchWithTimeout(`${GOBLIN_API_BASE}/api/auctions?upcoming=true`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: ApiAuction[] = await res.json();
    return data.map(mapAuction);
  } catch (e) {
    console.error('[auctionsApi] fetchUpcomingAuctions error:', e);
    return [];
  }
}

const AUCTIONS_TTL_MS = 10 * 60 * 1000; // 10 мин — та же политика, что у catalog-cache.ts

/**
 * История завершённых аукционов главы — read-only витрина auctioneer-bot.
 * Большие лимиты (страницы глав/архива тянут тысячи записей разом) кэшируем
 * на 10 мин: сами данные — уже прошедшие аукционы, они не меняются, а без
 * кэша каждый рендер страницы главы заново гонял бы весь запрос в goblin-api
 * и рисковал упереться в 5-секундный таймаут fetchWithTimeout. Маленькие
 * разовые запросы (лимит по умолчанию) не кэшируем — не нагружают бэкенд.
 */
export async function fetchPastAuctions(limit = 100): Promise<UiAuction[]> {
  const load = async () => {
    const timeoutMs = limit > 100 ? 15000 : 5000;
    const res = await fetchWithTimeout(`${GOBLIN_API_BASE}/api/auctions?history=true&limit=${limit}`, timeoutMs);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: ApiAuction[] = await res.json();
    if (!Array.isArray(data)) throw new Error('unexpected response shape');
    return data.map(mapAuction);
  };

  try {
    if (limit <= 100) return await load();
    const { data } = await withTtlCache(`past-auctions-${limit}`, AUCTIONS_TTL_MS, load);
    return data;
  } catch (e) {
    console.error('[auctionsApi] fetchPastAuctions error:', e);
    return [];
  }
}

/**
 * Аукционы, чей startAt попадает в [startMs, endMs) — для страницы конкретной
 * главы (src/lib/chapters.ts). API не умеет фильтровать по датам напрямую
 * (см. docs/goblin-api — только item_name/limit/history), поэтому тянем
 * достаточно большую историю и фильтруем на своей стороне.
 *
 * limit=500 раньше обрезал старые главы: аукционов ~5/день, глава идёт
 * ~90 дней — это уже ~450 записей на ОДНУ главу, а history=true отдаёт
 * последние N по всей игре разом (не по главе), так что чем старше глава,
 * тем быстрее её начало вытесняется более новыми записями других глав.
 * Например Salt Awakening (04.05–03.08) на limit=500 показывал данные
 * только с 10.05 по 10.07 — начало и конец главы обрезаны. Подняли лимит
 * с большим запасом на всю прожитую историю игры; при дальнейшем росте
 * числа глав стоит поднять ещё.
 *
 * Включает и завершённые (fetchPastAuctions), и предстоящие/активные
 * (fetchUpcomingAuctions) — нужно для текущей главы, где часть аукционов уже
 * прошла, а часть ещё впереди; для прошлых глав fetchUpcomingAuctions просто
 * вернёт пустой список (там всё уже в истории).
 */
export async function fetchAuctionsInRange(startMs: number, endMs: number, limit = 5000): Promise<UiAuction[]> {
  const [past, upcoming] = await Promise.all([fetchPastAuctions(limit), fetchUpcomingAuctions()]);
  const byId = new Map<string, UiAuction>();
  [...past, ...upcoming].forEach(a => byId.set(a.auctionId, a));
  return [...byId.values()].filter(a => a.startAt >= startMs && a.startAt < endMs);
}

/** Предстоящие и завершённые аукционы главы одним списком — для единого расписания. */
export async function fetchAllAuctions(): Promise<UiAuction[]> {
  const [upcoming, past] = await Promise.all([fetchUpcomingAuctions(), fetchPastAuctions()]);
  const byId = new Map<string, UiAuction>();
  [...upcoming, ...past].forEach(a => byId.set(a.auctionId, a));
  return [...byId.values()];
}

/** null означает "результатов пока нет" (404) — это не ошибка. */
export async function fetchAuctionResults(auctionId: string): Promise<AuctionResults | null> {
  try {
    const res = await fetchWithTimeout(`${GOBLIN_API_BASE}/api/auctions/${encodeURIComponent(auctionId)}/results`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as AuctionResults;
  } catch (e) {
    console.error('[auctionsApi] fetchAuctionResults error:', e);
    return null;
  }
}
