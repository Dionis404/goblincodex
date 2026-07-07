// In-process TTL cache: survives between requests in the standalone Node
// adapter (one long-lived process, not per-request serverless functions).
// Shared by API routes and .astro pages so both hit the same cached data
// instead of each re-querying Postgres on every request.

interface Entry {
  data: unknown;
  ts: number;
}

const store = new Map<string, Entry>();

export async function withTtlCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<{ data: T; cached: boolean }> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) {
    return { data: hit.data as T, cached: true };
  }

  const data = await fetcher();
  store.set(key, { data, ts: Date.now() });
  return { data, cached: false };
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

export function errorJsonResponse(err: unknown): Response {
  return new Response(JSON.stringify({ error: String(err) }), {
    status: 500,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
