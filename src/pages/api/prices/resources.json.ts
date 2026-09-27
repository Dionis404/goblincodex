import type { APIRoute } from 'astro';
import { fetchPriceResources, type PriceCategory } from '../../../lib/priceApi';

export const prerender = false;

const VALID_CATEGORIES: PriceCategory[] = ['collectibles', 'wearables', 'buds', 'pets', 'economies'];
// Полный список (тысячи collectibles) одним JSON-ответом обрывается где-то
// между сайтом и браузером (Cloudflare/reverse proxy режет большие ответы,
// см. коммит "убрать SSR-передачу списков предметов") — отдаём страницами.
const PAGE_SIZE = 300;

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

  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);

  const all = await fetchPriceResources(category);
  const page = all.slice(offset, offset + PAGE_SIZE);
  const nextOffset = offset + page.length;

  return json({
    category,
    resources: page,
    total: all.length,
    next_offset: nextOffset < all.length ? nextOffset : null,
  });
};
