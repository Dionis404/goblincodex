/**
 * Единый SSR-клиент к sfl-api (репозиторий Dionis404/sfl-collector, сервис
 * `sfl-api` в docker-сети shared-net) — один бэкенд отдаёт всё: фермеров
 * сообщества, лидерборд тикетов, аукционы, кэш ферм, цены ресурсов и курс
 * Flower. Доступен только внутри docker-сети, поэтому ходить можно только
 * с SSR — из браузера этот адрес недостижим.
 *
 * Таймаут обязателен: без него зависший/медленный бэкенд подвешивал бы
 * SSR-рендер страницы — с таймаутом запрос падает, и вызывающий код уходит
 * в свою обычную catch-деградацию (пустой список/null).
 */
import { withTtlCache } from './cache';
import { WEARABLE_NAMES } from './wearableNames';

export const SFL_API_BASE: string =
  (import.meta.env.SFL_API_URL as string | undefined) || 'http://sfl-api:8000';

export function fetchWithTimeout(url: string, ms = 5000): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(ms) });
}

// 30 минут, а не 5: tickets/top500 на бэкенде считается ~40 с, и короткий
// TTL превращал это в регулярную (каждые 5 мин) тяжёлую джобу, во время
// которой весь хостед подтормаживал. Лидерборды не требуют свежести минута
// в минуту — полный рейтинг живёт на отдельных страницах и так с кэшем.
const SFL_JSON_TTL_MS = 30 * 60 * 1000;

/**
 * GET {SFL_API_BASE}{path} → JSON с общим 30-минутным кэшем на процесс.
 * Одни и те же данные (фермеры сообщества, лидерборды) нужны нескольким
 * страницам и API-роутам — кэш общий, чтобы каждый просмотр профиля или
 * кодекса не тянул заново весь список фермеров. Бросает при ошибке/не-2xx
 * (ошибка кэшируется на 30 с, см. withTtlCache). path — только константы
 * из кода: пользовательский ввод в ключ кэша не передавать.
 */
export async function fetchSflJsonCached<T = any>(path: string): Promise<T> {
  const { data } = await withTtlCache(`sfl-api:${path}`, SFL_JSON_TTL_MS, async () => {
    const res = await fetchWithTimeout(`${SFL_API_BASE}${path}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
  }, { swr: true });
  return data;
}

// ─── Цены ресурсов/предметов SFL ─────────────────────────────────────────────

export type PriceCategory = 'collectibles' | 'wearables' | 'buds' | 'pets' | 'economies';

export interface PriceResource {
  item_key: string;
  item_name: string;
}

export interface PricePoint {
  item_key: string;
  item_name: string;
  captured_at: string; // ISO, с таймзоной
  snapshot_date: string; // YYYY-MM-DD
  floor: number | null;
  low: number | null;
  high: number | null;
  latest_sale: number | null;
  best_offer: number | null;
  volume: number | null;
  trades: number | null;
  quantity: number | null;
  listing_count: number | null;
  offer_count: number | null;
  flower_price: number | null;
  floor_usd: number | null;
  latest_sale_usd: number | null;
}

/**
 * Список отслеживаемых предметов. Для collectibles берём имена прямо у
 * sfl-api — там они человекочитаемые. Для wearables API отдаёт
 * item_name === item_key (просто "wearables-N" без имени), поэтому список
 * строим локально из wearableNames.ts (ITEM_IDS игры) — надёжнее и не
 * зависит от того, что уже попало в БД цен на этот момент.
 */
export async function fetchPriceResources(category: PriceCategory = 'collectibles'): Promise<PriceResource[]> {
  if (category === 'wearables') {
    return Object.entries(WEARABLE_NAMES).map(([id, name]) => ({
      item_key: `wearables-${id}`,
      item_name: name,
    }));
  }

  try {
    const url = new URL(`${SFL_API_BASE}/sfl/prices/resources`);
    url.searchParams.set('category', category);
    url.searchParams.set('limit', '20000');
    const res = await fetchWithTimeout(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('unexpected response shape');
    return data;
  } catch (e) {
    console.error('[sflApi] fetchPriceResources error:', e);
    return [];
  }
}

/**
 * История цены одного предмета за последние hours часов (макс 2160 = 90 дней),
 * отсортирована по возрастанию времени для удобства построения графика.
 */
export async function fetchPriceHistory(itemKey: string, hours = 24 * 30, limit = 2000): Promise<PricePoint[]> {
  try {
    const url = new URL(`${SFL_API_BASE}/sfl/prices/${encodeURIComponent(itemKey)}/history`);
    url.searchParams.set('hours', String(hours));
    url.searchParams.set('limit', String(limit));
    const res = await fetchWithTimeout(url.toString(), 10000);
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: PricePoint[] = await res.json();
    if (!Array.isArray(data)) throw new Error('unexpected response shape');
    return [...data].sort((a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime());
  } catch (e) {
    console.error('[sflApi] fetchPriceHistory error:', e);
    return [];
  }
}

/** Последний известный снимок цены по каждому предмету категории (один запрос). */
export async function fetchLatestPrices(category: PriceCategory = 'collectibles'): Promise<PricePoint[]> {
  try {
    const url = new URL(`${SFL_API_BASE}/sfl/prices/latest`);
    url.searchParams.set('category', category);
    url.searchParams.set('limit', '20000');
    const res = await fetchWithTimeout(url.toString(), 15000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: PricePoint[] = await res.json();
    if (!Array.isArray(data)) throw new Error('unexpected response shape');
    return data;
  } catch (e) {
    console.error('[sflApi] fetchLatestPrices error:', e);
    return [];
  }
}

export interface FlowerRatePoint {
  captured_at: string;
  usd: number;
}

/** История курса $/FLOWER по возрастанию времени (макс hours = 24*365). */
export async function fetchFlowerRate(hours = 2160): Promise<FlowerRatePoint[]> {
  try {
    const url = new URL(`${SFL_API_BASE}/sfl/prices/flower-rate`);
    url.searchParams.set('hours', String(hours));
    const res = await fetchWithTimeout(url.toString(), 10000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: FlowerRatePoint[] = await res.json();
    if (!Array.isArray(data)) throw new Error('unexpected response shape');
    return data;
  } catch (e) {
    console.error('[sflApi] fetchFlowerRate error:', e);
    return [];
  }
}

// ─── Отладочный GET без кэша (страница /debug/collector) ─────────────────────

export interface CollectorResult {
  /** Путь вместе с query — как его видит сервис. */
  path: string;
  /** HTTP-статус; 0 — сервис недоступен (сеть/таймаут). */
  status: number;
  ms: number;
  data: unknown;
  error?: string;
}

/** GET без кэша: страница отладочная, нужны свежие данные и реальное время ответа. */
export async function collectorGet(path: string, timeoutMs = 8000): Promise<CollectorResult> {
  const started = Date.now();
  try {
    const res = await fetchWithTimeout(`${SFL_API_BASE}${path}`, timeoutMs);
    const text = await res.text();
    let data: unknown = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      /* оставляем текст как есть */
    }
    const detail = !res.ok && data && typeof data === 'object' && 'detail' in data ? String((data as { detail: unknown }).detail) : undefined;
    return { path, status: res.status, ms: Date.now() - started, data, error: detail };
  } catch (e) {
    return { path, status: 0, ms: Date.now() - started, data: null, error: e instanceof Error ? e.message : String(e) };
  }
}
