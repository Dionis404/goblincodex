import type { APIRoute } from 'astro';
import { fetchPriceResources, type PriceCategory } from '../../../lib/priceApi';

export const prerender = false;

const VALID_CATEGORIES: PriceCategory[] = ['collectibles', 'wearables', 'buds', 'pets', 'economies'];

export const GET: APIRoute = async ({ url }) => {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

  const categoryParam = url.searchParams.get('category');
  const category: PriceCategory = VALID_CATEGORIES.includes(categoryParam as PriceCategory)
    ? (categoryParam as PriceCategory)
    : 'collectibles';

  const resources = await fetchPriceResources(category);
  return json({ category, resources });
};
