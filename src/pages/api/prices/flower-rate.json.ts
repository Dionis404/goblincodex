import type { APIRoute } from 'astro';
import { GEM_USD, flowerRateNow } from '../../../lib/auctionTiers';

export const prerender = false;

// Курс Flower в $ и цена 1 Gem во Flower (пак 15 500 gems за $129,99) — для
// расчётов на клиенте, где нужна цена гемов (Omnifeed у животных и т. п.).
// Курс кэшируется в auctionTiers (10 мин), здесь только перевод.
export const GET: APIRoute = async () => {
  const usdPerFlower = await flowerRateNow().catch(() => null);
  const body = {
    usdPerFlower,
    gemUsd: GEM_USD,
    gemFlower: usdPerFlower ? GEM_USD / usdPerFlower : null,
  };
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' },
  });
};
