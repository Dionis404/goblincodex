// In-process TTL cache: survives between requests in the standalone Node
// adapter (one long-lived process, not per-request serverless functions).
// Shared by API routes and .astro pages so both hit the same cached data
// instead of each re-querying Postgres on every request.

type Entry =
  | { ok: true; data: unknown; ts: number }
  | { ok: false; error: unknown; ts: number };

const store = new Map<string, Entry>();
// Одновременные промахи по одному ключу ждут один и тот же запрос, а не
// запускают каждый свой (иначе после истечения TTL все параллельные
// рендеры разом идут в Postgres/goblin-api).
const inflight = new Map<string, Promise<unknown>>();

// Ошибку помним недолго: при лежащем бэкенде страницы сразу уходят в свою
// catch-деградацию, а не ждут таймаут на каждом запросе.
const FAILURE_TTL_MS = 30 * 1000;

export interface CacheOptions {
  /**
   * Stale-while-revalidate: если запись протухла, но данные есть — отдаём
   * протухшее немедленно и обновляем в фоне. Без флага все запросы в момент
   * протухания TTL ждут свежий fetch (до таймаута fetchWithTimeout).
   */
  swr?: boolean;
}

export interface CacheResult<T> {
  data: T;
  cached: boolean;
  /** true — отданы протухшие данные, фоновое обновление запущено. */
  stale?: boolean;
}

/** Один запрос на ключ для всех ждущих + stale-if-error при ошибке. */
function fetchFresh<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  let pending = inflight.get(key) as Promise<T> | undefined;
  if (!pending) {
    pending = fetcher()
      .then(data => {
        store.set(key, { ok: true, data, ts: Date.now() });
        return data;
      })
      .catch(error => {
        // Есть старые данные — отдаём их (stale-if-error) и пробуем обновить
        // снова через FAILURE_TTL_MS, а не роняем страницу целиком.
        const prev = store.get(key);
        if (prev?.ok) {
          store.set(key, { ok: true, data: prev.data, ts: Date.now() - ttlMs + FAILURE_TTL_MS });
          return prev.data as T;
        }
        store.set(key, { ok: false, error, ts: Date.now() });
        throw error;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  return pending;
}

export async function withTtlCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  opts: CacheOptions = {},
): Promise<CacheResult<T>> {
  const hit = store.get(key);
  if (hit) {
    const age = Date.now() - hit.ts;
    if (hit.ok) {
      if (age < ttlMs) return { data: hit.data as T, cached: true };
      if (opts.swr) {
        fetchFresh(key, ttlMs, fetcher).catch(error => {
          console.warn(`[cache] SWR-refresh failed for "${key}":`, error);
        });
        return { data: hit.data as T, cached: true, stale: true };
      }
    }
    if (!hit.ok && age < FAILURE_TTL_MS) throw hit.error;
  }

  return { data: await fetchFresh(key, ttlMs, fetcher), cached: false };
}

/** Shared response shape for /api/*.json routes serving withTtlCache() data. */
export function cachedJsonResponse(data: unknown, cached: boolean, maxAgeSeconds = 600): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${maxAgeSeconds}`,
      'X-Cache': cached ? 'HIT' : 'MISS',
    },
  });
}

/**
 * 500 для /api/*.json: подробности — только в лог сервера. Текст ошибки
 * наружу не отдаём — в нём бывают адрес/порт Postgres и тела ответов
 * внутренних сервисов.
 */
export function errorJsonResponse(err: unknown, logTag = '[api]'): Response {
  console.error(`${logTag} error:`, err);
  return new Response(JSON.stringify({ error: 'internal error' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
