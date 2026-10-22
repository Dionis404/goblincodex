/**
 * Себестоимость рыбы: рыба на маркетплейсе не торгуется, поэтому её цена —
 * это цена заброса удочки, делённая на то, сколько рыбы в среднем даёт заброс.
 * Базовый улов — 1 рыба за заброс, бонусы добавляют ещё.
 *
 * Что тратит заброс (events/landExpansion/castRod.ts): одну удочку (Rod:
 * 20 монет + 3 Wood + 1 Stone; Ancient Rod делает её бесплатной) и наживку.
 * Наживка-червь — побочный продукт компостера, выделить её цену честно нельзя,
 * поэтому не считаем (как и приманку chum, которая необязательна).
 *
 * Бонусы улова взяты из описаний в игре (lib/i18n/dictionaries): значения —
 * ожидаемая прибавка рыбы за заброс (шанс 20% на +1 = +0.2). Навыки — из
 * skills.ts (SKILLS), чтобы не расходиться при апдейтах.
 */
import { SKILLS } from './skills';
import { NO_TOOL_BOOSTS, TOOLS, resourcesFlowerValue, toolIngredients, toolUnitPrice, type SkillRank } from './toolCosts';
import { coinsToFlower } from './coinRate';
import type { SeasonName } from './baitCosts';

export type FishTier = 'basic' | 'advanced' | 'expert';

export interface FishingBoosts {
  /** Ancient Rod (одежда): удочка при забросе не тратится. */
  ancientRod: boolean;
  /** Бейдж Artist: −10% монет на удочку. */
  artist: boolean;
  /** Навык Reel Deal: цена удочки ×0.5/0.45/0.4. */
  reelDeal: SkillRank;
  /** Walrus (коллекционный): +1 рыба за каждый заброс. */
  walrus: boolean;
  /** Alba (коллекционный): 50% шанс +1 обычной (basic) рыбы. */
  alba: boolean;
  /** Sunflower Rod (одежда): 10% шанс +1 рыбы. */
  sunflowerRod: boolean;
  /** Trident (одежда): 20% шанс +1 рыбы. */
  trident: boolean;
  /** Навыки: шанс +1 рыбы своего ранга (Fishy Chance — обычная, Roll — продвинутая, Gamble — экспертная). */
  fishyChance: SkillRank;
  fishyRoll: SkillRank;
  fishyGamble: SkillRank;
  /** Сезонные марвелы: +1 рыба в «свой» сезон года. */
  pinkDolphin: boolean; // весна
  jellyfish: boolean; // лето
  poseidon: boolean; // осень
  superStar: boolean; // зима
}

export const NO_FISHING_BOOSTS: FishingBoosts = {
  ancientRod: false,
  artist: false,
  reelDeal: 0,
  walrus: false,
  alba: false,
  sunflowerRod: false,
  trident: false,
  fishyChance: 0,
  fishyRoll: 0,
  fishyGamble: 0,
  pinkDolphin: false,
  jellyfish: false,
  poseidon: false,
  superStar: false,
};

const SEASONAL_MARVEL: Record<SeasonName, keyof FishingBoosts> = {
  spring: 'pinkDolphin',
  summer: 'jellyfish',
  autumn: 'poseidon',
  winter: 'superStar',
};

/** Значения рангов навыка (шанс в %, множитель цены) из skills.ts. */
export function skillRankValues(skill: string): number[] {
  const effect = SKILLS.find((s) => s.name === skill)?.upgrade?.effect as { ranks?: number[] } | undefined;
  return effect?.ranks ?? [];
}

function skillChance(skill: string, rank: SkillRank): number {
  if (rank === 0) return 0;
  return (skillRankValues(skill)[rank - 1] ?? 0) / 100;
}

/** Ожидаемое число рыбы за заброс для рыбы данного ранга в данный сезон. */
export function expectedFishPerCast(tier: FishTier, season: SeasonName, b: FishingBoosts): number {
  let fish = 1;
  if (b.walrus) fish += 1;
  if (b.alba && tier === 'basic') fish += 0.5;
  if (b.sunflowerRod) fish += 0.1;
  if (b.trident) fish += 0.2;
  if (b[SEASONAL_MARVEL[season]]) fish += 1;
  fish += skillChance(tier === 'basic' ? 'Fishy Chance' : tier === 'advanced' ? 'Fishy Roll' : 'Fishy Gamble', {
    basic: b.fishyChance,
    advanced: b.fishyRoll,
    expert: b.fishyGamble,
  }[tier]);
  return fish;
}

/** Цена одного заброса (удочка) во Flower: монеты по рыночному курсу + ресурсы по floor. */
export function castCost(
  prices: Record<string, number | null>,
  coinRate: number | null | undefined,
  b: FishingBoosts,
): number {
  if (b.ancientRod) return 0;
  const rod = TOOLS.find((t) => t.name === 'Rod')!;
  const coins = toolUnitPrice(rod, { ...NO_TOOL_BOOSTS, artist: b.artist, reelDeal: b.reelDeal });
  const coinsFlower = coinRate ? coinsToFlower(coins, coinRate) : 0;
  return coinsFlower + resourcesFlowerValue(toolIngredients(rod, NO_TOOL_BOOSTS), prices).value;
}

/** Себестоимость одной рыбы ранга tier. */
export function fishUnitCost(
  tier: FishTier,
  season: SeasonName,
  prices: Record<string, number | null>,
  coinRate: number | null | undefined,
  b: FishingBoosts,
): number {
  return castCost(prices, coinRate, b) / expectedFishPerCast(tier, season, b);
}
