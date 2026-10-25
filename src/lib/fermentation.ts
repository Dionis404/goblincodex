import {
  ASTROLABE_DOUBLE_CHANCE,
  BAIT_FAMILIES,
  BAIT_OUTPUT_AGED,
  BAIT_OUTPUT_PRIME,
  BAIT_SECONDS,
  FERMENTATION_RECIPES,
  SPICE_RACK_RECIPES,
  type TimedRecipe,
} from './fermentationData.generated';
import { CRAB_SELL_COINS, FISH_RECORDS } from './fishData.generated';
import { FISH_BASE_XP } from './food';
import { NO_FISHING_BOOSTS, fishUnitCost, type FishTier } from './fishYield';
import { coinsToFlower } from './coinRate';
import { COMPOSTER_PRICE_NAMES, NO_COMPOSTER_BOOSTS, rankValues, runCost, type ComposterName } from './composter';
import { COMPOSTERS } from './composterData.generated';
import { SEASON_NAMES } from './baitCosts';

/**
 * Стойки Aging Shed: ферментация и специи. Рецепты — fermentationData.generated.ts,
 * значения рангов навыков — skills.ts. Формулы выхода повторяют
 * types/agingFormulas.ts игры (getAgingOutput / getSpiceRackOutput).
 */

export type Rack = 'fermentation' | 'spice';

export interface AgingBoosts {
  /** Ager: ингредиенты и выход ×2/×3/×4 (0 — выключено). */
  ager: 0 | 1 | 2 | 3;
  /** Refiner: шанс +1 к Refined Salt. */
  refiner: 0 | 1 | 2 | 3;
  /** Bacalhau: +1/+2/+3 к наживке. */
  bacalhau: 0 | 1 | 2 | 3;
  /** Astrolabe: 15% шанс удвоить выход стойки. */
  astrolabe: boolean;
  /** Salt Bottle Onesie: +1 к выходу стойки специй. */
  saltBottleOnesie: boolean;
}

export const NO_AGING_BOOSTS: AgingBoosts = {
  ager: 0,
  refiner: 0,
  bacalhau: 0,
  astrolabe: false,
  saltBottleOnesie: false,
};

const rank = (skill: string, r: number): number => (r > 0 ? (rankValues(skill)[r - 1] ?? 0) : 0);

/** Во сколько раз Ager увеличивает расход и выход (1, если выключен). */
export function agerMultiplier(b: AgingBoosts): number {
  return b.ager > 0 ? rank('Ager', b.ager) || 1 : 1;
}

/** Ожидаемый выход одной запущенной задачи по предмету (с учётом шансов). */
export function expectedOutput(rack: Rack, item: string, base: number, b: AgingBoosts): number {
  let out = base * agerMultiplier(b);
  if (b.astrolabe) out *= 1 + ASTROLABE_DOUBLE_CHANCE / 100;
  if (item === 'Refined Salt') out += rank('Refiner', b.refiner) / 100;
  if (BAIT_FAMILIES.some((f) => f.bait === item)) out += rank('Bacalhau', b.bacalhau);
  if (rack === 'spice' && b.saltBottleOnesie) out += 1;
  return out;
}

export interface Ingredient {
  name: string;
  /** Сколько уходит на задачу (после Ager). */
  amount: number;
  /** Цена за штуку, null — неизвестна. */
  unit: number | null;
  /** Откуда цена: рынок, себестоимость цепочки, продажа монет. */
  source: 'market' | 'recipe' | 'compost' | 'coins' | null;
}

export interface JobCost {
  ingredients: Ingredient[];
  /** Сумма по ингредиентам; null, если у какого-то нет цены. */
  total: number | null;
  /** Названия ингредиентов без цены. */
  missing: string[];
}

const ALL_RECIPES: Record<Rack, TimedRecipe[]> = { fermentation: FERMENTATION_RECIPES, spice: SPICE_RACK_RECIPES };

/** Предмет → (стойка, рецепт), который его делает; для цепочки себестоимости. */
const PRODUCER = new Map<string, { rack: Rack; recipe: TimedRecipe }>();
for (const rack of ['fermentation', 'spice'] as Rack[]) {
  for (const recipe of ALL_RECIPES[rack]) {
    const out = Object.keys(recipe.outputs)[0];
    // Несколько рецептов дают один предмет (Greenhouse Glow, Salt): берём первый — цепочка
    // нужна только для промежуточных продуктов, у которых рецепт один.
    if (!PRODUCER.has(out)) PRODUCER.set(out, { rack, recipe });
  }
}

/** Все сырые предметы, чьи цены нужны (то, что не делается на стойках, плюс сырьё удочки). */
export const FERMENTATION_PRICE_NAMES: string[] = [
  ...new Set([
    ...[...FERMENTATION_RECIPES, ...SPICE_RACK_RECIPES].flatMap((r) => Object.keys(r.ingredients)),
    'Salt',
    'Wood',
    'Stone',
    ...COMPOSTER_PRICE_NAMES,
  ]),
].filter((n) => n !== 'Crab');

/** Удобрения, которые делает компостер (рынка нет): предмет → компостер. */
const COMPOST_ITEMS = new Map(
  (Object.keys(COMPOSTERS) as ComposterName[]).map((c) => [COMPOSTERS[c].produce, c] as const),
);

/** Цена удобрения по затратам на запуск компостера (среднее по сезонам), без бустов компостера. */
function compostUnitCost(item: string, prices: Record<string, number | null>): number | null {
  const composter = COMPOST_ITEMS.get(item);
  if (!composter) return null;
  const costs = SEASON_NAMES.map((s) => runCost(composter, s, prices, NO_COMPOSTER_BOOSTS).perCompost);
  const known = costs.filter((c): c is number => c != null);
  return known.length === costs.length ? known.reduce((a, c) => a + c, 0) / known.length : null;
}

/**
 * Цена предмета за штуку: рынок, а если предмета на рынке нет — себестоимость по его
 * рецепту (при текущих бустах). Crab не торгуется — оценивается по цене продажи Бетти.
 */
export function createPricer(
  prices: Record<string, number | null>,
  coinRate: number | null | undefined,
  boosts: AgingBoosts,
) {
  const memo = new Map<string, { unit: number | null; source: Ingredient['source'] }>();
  const visiting = new Set<string>();

  function unitPrice(name: string): { unit: number | null; source: Ingredient['source'] } {
    const cached = memo.get(name);
    if (cached) return cached;
    let result: { unit: number | null; source: Ingredient['source'] } = { unit: null, source: null };
    if (name === 'Crab') {
      result = coinRate ? { unit: coinsToFlower(CRAB_SELL_COINS, coinRate), source: 'coins' } : result;
    } else if (prices[name] != null) {
      result = { unit: prices[name]!, source: 'market' };
    } else if (COMPOST_ITEMS.has(name)) {
      const unit = compostUnitCost(name, prices);
      result = unit != null ? { unit, source: 'compost' } : result;
    } else if (!visiting.has(name) && PRODUCER.has(name)) {
      visiting.add(name);
      const { rack, recipe } = PRODUCER.get(name)!;
      const cost = jobCost(recipe, boosts);
      const out = expectedOutput(rack, name, recipe.outputs[name], boosts);
      visiting.delete(name);
      if (cost.total != null && out > 0) result = { unit: cost.total / out, source: 'recipe' };
    }
    memo.set(name, result);
    return result;
  }

  function jobCost(recipe: TimedRecipe, b: AgingBoosts): JobCost {
    const m = agerMultiplier(b);
    const ingredients: Ingredient[] = Object.entries(recipe.ingredients).map(([name, amount]) => ({
      name,
      amount: amount * m,
      ...unitPrice(name),
    }));
    const missing = ingredients.filter((i) => i.unit == null).map((i) => i.name);
    return {
      ingredients,
      missing,
      total: missing.length ? null : ingredients.reduce((s, i) => s + i.unit! * i.amount, 0),
    };
  }

  return { unitPrice, jobCost: (recipe: TimedRecipe) => jobCost(recipe, boosts) };
}

export interface RecipeRow {
  recipe: TimedRecipe;
  rack: Rack;
  output: string;
  /** Выход одной задачи без бустов и с бустами (математическое ожидание). */
  baseOutput: number;
  output_: number;
  cost: JobCost;
  /** Себестоимость одной штуки результата. */
  unitCost: number | null;
}

export function recipeRows(
  rack: Rack,
  prices: Record<string, number | null> | null,
  coinRate: number | null | undefined,
  boosts: AgingBoosts,
): RecipeRow[] {
  const pricer = prices ? createPricer(prices, coinRate, boosts) : null;
  return ALL_RECIPES[rack].map((recipe) => {
    const output = Object.keys(recipe.outputs)[0];
    const baseOutput = recipe.outputs[output];
    const expected = expectedOutput(rack, output, baseOutput, boosts);
    const cost: JobCost = pricer
      ? pricer.jobCost(recipe)
      : { ingredients: [], total: null, missing: Object.keys(recipe.ingredients) };
    return {
      recipe,
      rack,
      output,
      baseOutput,
      output_: expected,
      cost,
      unitCost: cost.total != null && expected > 0 ? cost.total / expected : null,
    };
  });
}

// ─── Наживки из выдержанной рыбы ──────────────────────────────────────────────

/** Соль на выдержку рыбы (types/agingBase.ts игры; см. FishAgingTable). */
function agingSalt(baseXp: number): number {
  const maxXp = baseXp <= 200 ? baseXp * 3 : baseXp <= 330 ? baseXp * 4 : baseXp * 5;
  return Math.round(maxXp / 50);
}

export interface BaitRow {
  bait: string;
  pickle: string;
  /** Самая дешёвая по соли рыба ранга — её выдержка и берётся в расчёт. */
  fish: string;
  agedFishCost: number | null;
  pickleCost: number | null;
  /** Цена задачи (Aged-рыба + маринад) при текущем Ager. */
  jobTotal: number | null;
  outputAged: number;
  outputPrime: number;
  unitAged: number | null;
  unitPrime: number | null;
}

export function baitRows(
  prices: Record<string, number | null> | null,
  coinRate: number | null | undefined,
  boosts: AgingBoosts,
): BaitRow[] {
  const pricer = prices ? createPricer(prices, coinRate, boosts) : null;
  const m = agerMultiplier(boosts);
  const salt = pricer ? pricer.unitPrice('Salt').unit : null;
  const rows: BaitRow[] = [];
  for (const fam of BAIT_FAMILIES) {
    const candidates = FISH_RECORDS.filter((f) => f.type === fam.fishTier && FISH_BASE_XP[f.name] != null);
    const fish = candidates.reduce((best, f) => (FISH_BASE_XP[f.name] < FISH_BASE_XP[best.name] ? f : best));
    const rawFish =
      prices && coinRate !== undefined
        ? fishUnitCost(fam.fishTier as FishTier, 'spring', prices, coinRate, NO_FISHING_BOOSTS)
        : null;
    const agedFishCost = rawFish != null && salt != null ? rawFish + agingSalt(FISH_BASE_XP[fish.name]) * salt : null;
    for (const pickle of fam.pickles) {
      const pickleCost = pricer ? pricer.unitPrice(pickle).unit : null;
      const jobTotal = agedFishCost != null && pickleCost != null ? (agedFishCost + pickleCost) * m : null;
      const out = (base: number) => expectedOutput('fermentation', fam.bait, base, boosts);
      rows.push({
        bait: fam.bait,
        pickle,
        fish: fish.name,
        agedFishCost,
        pickleCost,
        jobTotal,
        outputAged: out(BAIT_OUTPUT_AGED),
        outputPrime: out(BAIT_OUTPUT_PRIME),
        unitAged: jobTotal != null ? jobTotal / out(BAIT_OUTPUT_AGED) : null,
        unitPrime: jobTotal != null ? jobTotal / out(BAIT_OUTPUT_PRIME) : null,
      });
    }
  }
  return rows;
}

export { BAIT_SECONDS };

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return 'мгновенно';
  if (seconds < 3600) return `${Math.round(seconds / 60)} мин`;
  const h = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return mins > 0 ? `${h} ч ${mins} мин` : `${h} ч`;
}
