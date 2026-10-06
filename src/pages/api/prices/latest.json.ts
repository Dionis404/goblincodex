import type { APIRoute } from 'astro';
import { fetchPriceResources, fetchPriceHistory } from '../../../lib/priceApi';

export const prerender = false;

// Последняя известная цена предметов по именам (collectibles). Нужна рецептам
// Lava Pit и другим таблицам, где ингредиенты заданы именем, а не item_key.
// Цена = floor последней точки, если его нет — latest_sale. Кэш в памяти,
// чтобы страница справочника не дёргала sfl-price-service на каждый визит.
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_NAMES = 200;
// Не больше стольких одновременных запросов истории к sfl-price-service.
const CONCURRENCY = 10;
const cache = new Map<string, { at: number; price: number | null }>();

async function priceForName(name: string, keyByName: Map<string, string>): Promise<number | null> {
  const hit = cache.get(name);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.price;

  const key = keyByName.get(name.toLowerCase());
  let price: number | null = null;
  if (key) {
    const points = await fetchPriceHistory(key, 24 * 7, 200);
    for (let i = points.length - 1; i >= 0 && price == null; i--) {
      price = points[i].floor ?? points[i].latest_sale ?? null;
    }
  }
  cache.set(name, { at: Date.now(), price });
  return price;
}

export const GET: APIRoute = async ({ url }) => {
  const names = (url.searchParams.get('names') ?? '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, MAX_NAMES);

  const resources = await fetchPriceResources('collectibles');
  const keyByName = new Map(resources.map((r) => [r.item_name.toLowerCase(), r.item_key]));

  const entries: (readonly [string, number | null])[] = [];
  for (let i = 0; i < names.length; i += CONCURRENCY) {
    const batch = names.slice(i, i + CONCURRENCY);
    entries.push(...(await Promise.all(batch.map(async (n) => [n, await priceForName(n, keyByName)] as const))));
  }

  return new Response(JSON.stringify({ prices: Object.fromEntries(entries) }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
