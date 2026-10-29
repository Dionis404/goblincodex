import type { APIRoute } from 'astro';
import { latestPrices } from '../../../lib/latestPrices';

export const prerender = false;

// Последняя известная цена предметов по именам (collectibles). Нужна рецептам
// Lava Pit и другим таблицам, где ингредиенты заданы именем, а не item_key.
// Логика и кэш — src/lib/latestPrices.ts.
const MAX_NAMES = 200;

export const GET: APIRoute = async ({ url }) => {
  const names = (url.searchParams.get('names') ?? '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, MAX_NAMES);

  const prices = await latestPrices(names);

  return new Response(JSON.stringify({ prices }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
