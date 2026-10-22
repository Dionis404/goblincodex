/**
 * Цена наживок (Fish Flake, Fish Stick, Fish Oil, Crab Stick) по рецепту.
 *
 * На маркетплейсе этих наживок нет, поэтому считаем из ингредиентов
 * (fishProcessing.ts: база + сезонная добавка, сезон года в игре меняется).
 * Источники цены ингредиента:
 *   1. рыба (fish) — себестоимость: заброс удочки ÷ рыбы за заброс с бонусами
 *      (fishYield.ts); рыба на рынке не торгуется, одиночные лоты — не цена;
 *   2. ракообразное (crustacean) — себестоимость из наших таблиц ловушек
 *      (самый дешёвый способ);
 *   3. находка (treasure) — «Crab»: выпадает при раскопках и как мусор при
 *      рыбалке, не торгуется; оцениваем ценой продажи в монетах
 *      (CRAB_SELL_COINS), переведённой во Flower по рыночному курсу монет.
 * Все цены — оценка себестоимости, а не рыночная.
 */
import { BAIT_RECIPES, CRAB_SELL_COINS, CRUSTACEAN_LOOKUP, FISH_RECORDS } from './fishData.generated';
import { NO_CRUSTACEAN_BOOSTS, crustaceanRows, type PotName } from './crustaceans';
import { fishUnitCost, type FishTier, type FishingBoosts } from './fishYield';

export type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter';
export const SEASON_NAMES: SeasonName[] = ['spring', 'summer', 'autumn', 'winter'];
export const BAITS = ['Fish Flake', 'Fish Stick', 'Fish Oil', 'Crab Stick'] as const;
export type BaitName = (typeof BAITS)[number];

export type IngredientKind = 'fish' | 'crustacean' | 'treasure' | 'unknown';

export interface IngredientCost {
  name: string;
  amount: number;
  kind: IngredientKind;
  /** Цена одной штуки во Flower; null — неизвестна. */
  unit: number | null;
  total: number | null;
}

export interface BaitCost {
  bait: BaitName;
  season: SeasonName;
  seconds: number;
  ingredients: IngredientCost[];
  /** Цена одной штуки наживки; null — не хватает цены хотя бы у одного ингредиента. */
  total: number | null;
  /** Ингредиенты без цены. */
  missing: string[];
}

const FISH_TIER = new Map(FISH_RECORDS.map((f) => [f.name, f.type as FishTier]));
const CRUSTACEAN_POT = new Map<string, PotName>(
  Object.entries(CRUSTACEAN_LOOKUP).flatMap(([pot, rows]) =>
    Object.values(rows).map((name) => [name, pot as PotName] as const),
  ),
);

function ingredientCost(
  name: string,
  amount: number,
  season: SeasonName,
  prices: Record<string, number | null>,
  coinRate: number | null | undefined,
  fishing: FishingBoosts,
  crustaceanUnit: (name: string) => number | null,
): IngredientCost {
  const priced = (kind: IngredientKind, unit: number | null): IngredientCost => ({
    name,
    amount,
    kind: unit == null ? 'unknown' : kind,
    unit,
    total: unit == null ? null : unit * amount,
  });
  if (name === 'Crab') return priced('treasure', coinRate ? CRAB_SELL_COINS / coinRate : null);
  if (CRUSTACEAN_POT.has(name)) return priced('crustacean', crustaceanUnit(name));
  const tier = FISH_TIER.get(name);
  if (tier) return priced('fish', fishUnitCost(tier, season, prices, coinRate, fishing));
  return priced('unknown', null);
}

function costOf(
  bait: BaitName,
  season: SeasonName,
  prices: Record<string, number | null>,
  coinRate: number | null | undefined,
  fishing: FishingBoosts,
  crustaceanUnit: (name: string) => number | null,
): BaitCost {
  const recipe = BAIT_RECIPES[bait];
  const items = { ...recipe.base, ...recipe.seasonal[season] };
  const ingredients = Object.entries(items).map(([name, amount]) =>
    ingredientCost(name, amount, season, prices, coinRate, fishing, crustaceanUnit),
  );
  const missing = ingredients.filter((i) => i.total == null).map((i) => i.name);
  return {
    bait,
    season,
    seconds: recipe.seconds,
    ingredients,
    total: missing.length > 0 ? null : ingredients.reduce((s, i) => s + (i.total ?? 0), 0),
    missing,
  };
}

export type BaitCosts = Record<BaitName, Record<SeasonName, BaitCost>>;

/**
 * Цены всех наживок по всем сезонам. Порядок важен: Fish Flake/Stick/Oil
 * считаются из рыбы; по ним оцениваются приманки ракообразных, а уже по
 * ракообразным — Crab Stick.
 */
export function baitCosts(
  prices: Record<string, number | null>,
  coinRate: number | null | undefined,
  fishing: FishingBoosts,
): BaitCosts {
  const noCrustaceans = () => null;
  const result = {} as BaitCosts;
  for (const bait of ['Fish Flake', 'Fish Stick', 'Fish Oil'] as const) {
    result[bait] = Object.fromEntries(
      SEASON_NAMES.map((s) => [s, costOf(bait, s, prices, coinRate, fishing, noCrustaceans)]),
    ) as Record<SeasonName, BaitCost>;
  }
  result['Crab Stick'] = Object.fromEntries(
    SEASON_NAMES.map((season) => {
      // Приманки ракообразных (Fish Stick и Fish Oil) — по рецепту этого же сезона.
      const withBaits = { ...prices };
      for (const b of ['Fish Stick', 'Fish Oil'] as const) {
        const t = result[b][season].total;
        if (t != null) withBaits[b] = t;
      }
      const unit = (name: string): number | null => {
        const pot = CRUSTACEAN_POT.get(name)!;
        // Одно существо может добываться разными приманками — берём самый дешёвый
        // способ; строки, где у приманки нет цены даже по рецепту, неполные — пропускаем.
        const totals = crustaceanRows(pot, withBaits, coinRate, NO_CRUSTACEAN_BOOSTS)
          .filter((r) => r.crustacean === name && !(r.chum && r.chumFlower == null))
          .map((r) => r.total);
        return totals.length ? Math.min(...totals) : null;
      };
      return [season, costOf('Crab Stick', season, prices, coinRate, fishing, unit)];
    }),
  ) as Record<SeasonName, BaitCost>;
  return result;
}

/** Среднее по сезонам, где цена известна; null — нигде не известна. */
export function averageBaitCost(costs: Record<SeasonName, BaitCost>): number | null {
  const known = SEASON_NAMES.map((s) => costs[s].total).filter((t): t is number => t != null);
  return known.length ? known.reduce((a, b) => a + b, 0) / known.length : null;
}

/** Цена наживки для приманки ракообразных: сезон или среднее по сезонам. */
export function baitUnitPrice(costs: BaitCosts, bait: BaitName, season: SeasonName | 'avg'): number | null {
  return season === 'avg' ? averageBaitCost(costs[bait]) : costs[bait][season].total;
}
