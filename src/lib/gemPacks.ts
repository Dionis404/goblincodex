/**
 * Паки гемов и цена одного гема — как в гайде «Покупка гемов»
 * (src/content/guides/buy-gems.md). Whale pack покупается только за Flower.
 */
export interface GemPack {
  gems: number;
  usd: number;
  /** Только за Flower. */
  flowerOnly?: boolean;
}

export const GEM_PACKS: GemPack[] = [
  { gems: 100, usd: 1.29 },
  { gems: 650, usd: 6.49 },
  { gems: 1350, usd: 12.99 },
  { gems: 2800, usd: 25.99 },
  { gems: 7400, usd: 64.99 },
  { gems: 15500, usd: 129.99 },
  { gems: 200000, usd: 1299.99, flowerOnly: true },
];

/** Пак по умолчанию — 15 500 за $129,99 (по нему же считаются тиры аукционов). */
export const DEFAULT_GEM_PACK = 15500;

/** Скидка при оплате гемов во Flower (с 1 августа 2026). */
export const FLOWER_PAYMENT_DISCOUNT = 0.2;

/** Цена одного гема в $ для пака; payFlower — со скидкой за оплату Flower. */
export function gemUsd(packGems: number, payFlower: boolean): number {
  const pack = GEM_PACKS.find((p) => p.gems === packGems) ?? GEM_PACKS.find((p) => p.gems === DEFAULT_GEM_PACK)!;
  const discount = payFlower || pack.flowerOnly ? 1 - FLOWER_PAYMENT_DISCOUNT : 1;
  return (pack.usd / pack.gems) * discount;
}
