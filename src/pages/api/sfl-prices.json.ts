import type { APIRoute } from 'astro';

// Это серверный endpoint, а не статическая страница — обязательно SSR.
export const prerender = false;

const PRICES_URL = 'https://sfl.world/api/v1/prices';

// Простой кеш в памяти процесса, чтобы не дёргать sfl.world на каждый заход.
// standalone-адаптер держит один процесс, так что кеш переживает запросы.
let cache: { data: unknown; ts: number } | null = null;
const TTL_MS = 5 * 60 * 1000; // 5 минут

export const GET: APIRoute = async () => {
  // Отдаём из кеша, если он свежий.
  if (cache && Date.now() - cache.ts < TTL_MS) {
    return json(cache.data, { cached: true });
  }

  try {
    const upstream = await fetch(PRICES_URL, {
      headers: {
        Accept: 'application/json',
        // sfl.world иногда капризничает без user-agent — притворяемся браузером.
        'User-Agent': 'Mozilla/5.0 (compatible; GoblinCodexBot/1.0)',
      },
    });

    if (!upstream.ok) {
      // Если апстрим упал, но кеш есть (пусть и протухший) — лучше отдать его.
      if (cache) return json(cache.data, { cached: true, stale: true });
      return json({ error: 'upstream', status: upstream.status }, { status: 502 });
    }

    const data = await upstream.json();
    cache = { data, ts: Date.now() };
    return json(data, { cached: false });
  } catch (err) {
    if (cache) return json(cache.data, { cached: true, stale: true });
    return json({ error: 'fetch_failed', message: String(err) }, { status: 502 });
  }
};

function json(
  data: unknown,
  meta: { status?: number; cached?: boolean; stale?: boolean } = {}
): Response {
  return new Response(JSON.stringify(data), {
    status: meta.status ?? 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Браузер может кешировать ответ нашего же домена на 5 минут.
      'Cache-Control': 'public, max-age=300',
      'X-Cache': meta.cached ? (meta.stale ? 'STALE' : 'HIT') : 'MISS',
    },
  });
}
