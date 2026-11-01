import type { APIRoute } from 'astro';
import { getKeyByName } from '../../../lib/latestPrices';
import { errorJsonResponse } from '../../../lib/cache';

export const prerender = false;

const MAX_NAMES = 500;

// Резолв отображаемых имён (например, «Wood», «Obsidian») в item_key sfl-price-
// service. Имена ресурсов совпадают с именами collectibles на маркетплейсе,
// список которых кэширован (getKeyByName), так что запрос дешёвый.
export const GET: APIRoute = async ({ url }) => {
  const names = (url.searchParams.get('names') ?? '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, MAX_NAMES);

  try {
    const keyByName = await getKeyByName();
    const keys: Record<string, string | null> = {};
    for (const name of names) {
      keys[name] = keyByName.get(name.toLowerCase()) ?? null;
    }
    return new Response(JSON.stringify({ keys }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    return errorJsonResponse(err, '[api/prices/lookup]');
  }
};
