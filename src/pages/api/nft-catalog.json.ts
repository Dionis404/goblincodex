import type { APIRoute } from 'astro';
import { getCatalogItems } from '../../lib/db';

export const prerender = false;

// In-process cache: survives between requests in the standalone Node adapter
let cache: { data: unknown; ts: number } | null = null;
const TTL_MS = 10 * 60 * 1000; // 10 min

export const GET: APIRoute = async () => {
  if (cache && Date.now() - cache.ts < TTL_MS) {
    return json(cache.data, true);
  }

  try {
    const items = await getCatalogItems();
    const data = { items };
    cache = { data, ts: Date.now() };
    return json(data, false);
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
};

function json(data: unknown, cached: boolean): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
      'X-Cache': cached ? 'HIT' : 'MISS',
    },
  });
}
