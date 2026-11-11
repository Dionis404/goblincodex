import type { APIRoute } from 'astro';
import { fetchPriceHistory } from '../../../../lib/priceApi';
import { withTtlCache } from '../../../../lib/cache';

export const prerender = false;

export const GET: APIRoute = async ({ params, url }) => {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

  const itemKey = params.itemKey!;
  const hoursParam = url.searchParams.get('hours');
  // Клампим на диапазон, который реально понимает sfl-price-service (макс 90 дней).
  const hours = Math.min(Math.max(Number(hoursParam) || 24 * 30, 1), 2160);

  // Историю дёргают и график, и сетка ресурсов, и проверки активности —
  // без кэша каждый просмотр графика бил бы в sfl-price-service. Ошибки
  // withTtlCache помнит коротко (см. cache.ts).
  const { data: points } = await withTtlCache(`price-history:${itemKey}:${hours}`, 5 * 60 * 1000, () => fetchPriceHistory(itemKey, hours), { swr: true });
  return json({ item_key: itemKey, hours, points });
};
