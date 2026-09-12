/**
 * SSR-клиент к goblin-api для расписания аукционов главы.
 * Эндпоинты разрабатываются параллельно в goblin-bot — формат ответа может
 * ещё измениться, тогда донастроим mapAuction ниже.
 */
import { GOBLIN_API_BASE, fetchWithTimeout } from './goblinApi';

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

/** История завершённых аукционов главы — read-only витрина auctioneer-bot. */
export async function fetchPastAuctions(limit = 100): Promise<UiAuction[]> {
  try {
    const res = await fetchWithTimeout(`${GOBLIN_API_BASE}/api/auctions?history=true&limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: ApiAuction[] = await res.json();
    if (!Array.isArray(data)) throw new Error('unexpected response shape');
    return data.map(mapAuction);
  } catch (e) {
    console.error('[auctionsApi] fetchPastAuctions error:', e);
    return [];
  }
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
