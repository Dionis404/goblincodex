/**
 * Планировщик прокачки опыта бампкина через еду.
 *
 * Модель. Блюда готовятся в зданиях (Fire Pit, Kitchen, Bakery, Deli, Smoothie
 * Shack), каждое здание работает непрерывно и независимо. Блюдо даёт опыт (с
 * бустами) за время приготовления (с бустами) и стоит денег (floor-цены
 * ингредиентов). Чтобы набрать нужный опыт за срок D дней, надо распределить
 * время зданий между блюдами так, чтобы потратить меньше всего Flower — это
 * задача линейного программирования; решаем её методом множителя Лагранжа
 * (цена опыта λ): при каждом λ здание выгоднее всего занять блюдом с лучшим
 * «λ × опыт/час − цена/час», а на стыке двух блюд время делится дробно.
 *
 * VIP: за вход каждый день выдаётся одно блюдо по уровню (getVipDailyBonusItem
 * в игре). Оно съедается бесплатно, поэтому уменьшает опыт, который надо
 * приготовить, и тем самым стоимость. Блюдо зависит от уровня на момент входа —
 * уровень по ходу прокачки оцениваем равномерным ростом опыта.
 *
 * Не учитывается: цена масла, ручной перезапуск готовки, наличие ингредиентов
 * на ферме (всё считается покупкой по floor), сырая и выдержанная рыба.
 */
import {
  BUILDINGS,
  NO_PRICE_RECIPES,
  RECIPE_BY_NAME,
  recipeCost,
  timeMultiplier,
  xpMultiplier,
  type Building,
  type Recipe,
  type TimeBoosts,
  type XpBoosts,
} from './food';
import { PRE_ASCENSION_MAX_LEVEL, levelForXp } from './bumpkinXp';

export interface Dish {
  recipe: Recipe;
  building: Building;
  /** Опыт за одно блюдо с бустами. */
  xp: number;
  /** Часы приготовления одного блюда с бустами. */
  hours: number;
  /** Цена одного блюда во Flower. */
  cost: number;
  xpPerHour: number;
  costPerHour: number;
  costPerXp: number;
}

/**
 * Блюда, которые можно планировать: уже есть в игре и у всех ингредиентов
 * есть цена (иначе цену не посчитать). Опыт и время — с выбранными бустами.
 */
export function buildDishes(
  prices: Record<string, number | null>,
  xpBoosts: XpBoosts,
  timeBoosts: TimeBoosts,
): Dish[] {
  const dishes: Dish[] = [];
  for (const group of BUILDINGS) {
    for (const recipe of group.recipes) {
      if (recipe.upcoming || NO_PRICE_RECIPES.has(recipe.name)) continue;
      const price = recipeCost(recipe.name, prices);
      if (price.cost == null || price.missing.length > 0) continue;
      const xp = recipe.experience * xpMultiplier(recipe, xpBoosts);
      const hours = (recipe.cookingSeconds * timeMultiplier(recipe, timeBoosts)) / 3600;
      if (!(xp > 0) || !(hours > 0)) continue;
      dishes.push({
        recipe,
        building: group.key,
        xp,
        hours,
        cost: price.cost,
        xpPerHour: xp / hours,
        costPerHour: price.cost / hours,
        costPerXp: price.cost / xp,
      });
    }
  }
  return dishes;
}

// ─── VIP: ежедневное блюдо ────────────────────────────────────────────────────

/** Блюдо VIP-награды по общему уровню (игра: vipAccess.getVipDailyBonusItem). */
export const VIP_DAILY_DISHES: [number, string][] = [
  [3, 'Mushroom Soup'],
  [6, 'Bumpkin Broth'],
  [10, 'Kale Stew'],
  [15, 'Sunflower Cake'],
  [20, 'Orange Cake'],
  [30, 'Parsnip Cake'],
  [100, 'Honey Cake'],
  [Infinity, 'Honey Cheddar'],
];

export function vipDishFor(level: number): string {
  return VIP_DAILY_DISHES.find(([below]) => level < below)![1];
}

/** Сутки с ежедневной наградой доступны с 3-го уровня. */
const DAILY_REWARD_MIN_LEVEL = 3;

export interface VipFree {
  /** Опыт от съеденных бесплатных блюд (с бустами). */
  xp: number;
  /** Сколько Flower стоили бы эти блюда, если бы их готовили. */
  value: number;
  /** false — у какого-то ингредиента нет цены, и value неполная. */
  valueKnown: boolean;
  /** Блюда: название → количество. */
  dishes: Record<string, number>;
  days: number;
}

const NO_VIP_FREE: VipFree = { xp: 0, value: 0, valueKnown: true, dishes: {}, days: 0 };

/**
 * Бесплатные блюда за `days` дней входов. Опыт растёт равномерно от `startXp` на
 * `totalGain` за срок, по нему определяем уровень в день входа.
 */
export function vipFreeDishes(
  startXp: number,
  totalGain: number,
  days: number,
  ascended: boolean,
  xpBoosts: XpBoosts,
  prices: Record<string, number | null>,
): VipFree {
  const claims = Math.floor(days);
  if (claims < 1) return NO_VIP_FREE;
  const result: VipFree = { xp: 0, value: 0, valueKnown: true, dishes: {}, days: claims };
  for (let k = 1; k <= claims; k++) {
    const xp = startXp + totalGain * Math.min(1, k / days);
    const level = ascended ? PRE_ASCENSION_MAX_LEVEL : levelForXp(xp);
    if (level < DAILY_REWARD_MIN_LEVEL) continue;
    const name = vipDishFor(level);
    const recipe = RECIPE_BY_NAME.get(name);
    if (!recipe) continue;
    // Бесплатное блюдо съедают с бустом VIP (+10%) — он действует, раз выдана награда.
    result.xp += recipe.experience * xpMultiplier(recipe, { ...xpBoosts, vip: true });
    const price = recipeCost(name, prices);
    if (price.cost != null && price.missing.length === 0) result.value += price.cost;
    else result.valueKnown = false;
    result.dishes[name] = (result.dishes[name] ?? 0) + 1;
  }
  return result;
}

// ─── Распределение времени зданий ────────────────────────────────────────────

export interface Allocation {
  dish: Dish;
  /** Часы работы здания над этим блюдом. */
  hours: number;
  /** Сколько блюд успеет сготовиться (может быть дробным — округляем при показе). */
  count: number;
  xp: number;
  cost: number;
}

interface Pick {
  dish: Dish | null; // null — здание простаивает
}

/** Лучшее блюдо здания при цене опыта λ: максимум λ·опыт/час − цена/час (или простой). */
function pickBest(dishes: Dish[], lambda: number): Pick {
  let best: Dish | null = null;
  let bestScore = 0;
  for (const d of dishes) {
    const score = lambda * d.xpPerHour - d.costPerHour;
    if (score > bestScore + 1e-12) {
      bestScore = score;
      best = d;
    }
  }
  return { dish: best };
}

function groupByBuilding(dishes: Dish[], enabled: Building[]): Dish[][] {
  return enabled.map((b) => dishes.filter((d) => d.building === b)).filter((g) => g.length > 0);
}

export interface Cooking {
  feasible: boolean;
  allocations: Allocation[];
  xp: number;
  cost: number;
}

/**
 * Дешевле всего набрать `need` опыта за `days` дней: каждое здание работает
 * все `days × 24` часов. Возвращает пустой план, если срок слишком мал.
 */
export function cheapestCooking(
  need: number,
  days: number,
  dishes: Dish[],
  enabled: Building[],
  hoursPerDay = 24,
): Cooking {
  if (need <= 0) return { feasible: true, allocations: [], xp: 0, cost: 0 };
  const groups = groupByBuilding(dishes, enabled);
  const H = days * hoursPerDay;
  const total = (lambda: number) =>
    groups.reduce((sum, g) => sum + H * (pickBest(g, lambda).dish?.xpPerHour ?? 0), 0);

  const hi0 = 1e9;
  if (total(hi0) < need - 1e-9) return { feasible: false, allocations: [], xp: 0, cost: 0 };

  let lo = 0;
  let hi = hi0;
  for (let i = 0; i < 200 && hi - lo > 1e-12 * Math.max(1, hi); i++) {
    const mid = (lo + hi) / 2;
    if (total(mid) >= need) hi = mid;
    else lo = mid;
  }
  const tLo = total(lo);
  const tHi = total(hi);
  const f = tHi > tLo + 1e-12 ? Math.min(1, Math.max(0, (need - tLo) / (tHi - tLo))) : 1;

  const map = new Map<Dish, number>();
  const add = (dish: Dish | null, hours: number) => {
    if (dish && hours > 1e-9) map.set(dish, (map.get(dish) ?? 0) + hours);
  };
  for (const g of groups) {
    const a = pickBest(g, lo).dish;
    const b = pickBest(g, hi).dish;
    if (a === b) add(b, H);
    else {
      add(a, (1 - f) * H);
      add(b, f * H);
    }
  }
  const allocations: Allocation[] = [...map.entries()].map(([dish, hours]) => ({
    dish,
    hours,
    count: hours / dish.hours,
    xp: hours * dish.xpPerHour,
    cost: hours * dish.costPerHour,
  }));
  allocations.sort((x, y) => y.xp - x.xp);
  const xp = allocations.reduce((s, a) => s + a.xp, 0);
  const cost = allocations.reduce((s, a) => s + a.cost, 0);
  return { feasible: true, allocations, xp, cost };
}

// ─── Полный план: срок, VIP, цена ────────────────────────────────────────────

export interface PlanInput {
  startXp: number;
  targetXp: number;
  /** Игрок уже возвышался — уровень в VIP-блюде считаем максимальным. */
  ascended: boolean;
  dishes: Dish[];
  enabled: Building[];
  xpBoosts: XpBoosts;
  vip: boolean;
  prices: Record<string, number | null>;
  /** Сколько часов в сутки здания реально готовят (24 — без простоев). */
  hoursPerDay: number;
}

export interface Plan {
  feasible: boolean;
  days: number;
  /** Нужный опыт целиком. */
  gain: number;
  /** Из него бесплатно за VIP-блюда. */
  free: VipFree;
  /** Опыт, который надо приготовить. */
  cooked: number;
  cooking: Cooking;
  /** Затраты: готовка плюс (0 за VIP-блюда). */
  cost: number;
}

export function planFor(input: PlanInput, days: number): Plan {
  const gain = Math.max(0, input.targetXp - input.startXp);
  const free = input.vip
    ? vipFreeDishes(input.startXp, gain, days, input.ascended, input.xpBoosts, input.prices)
    : NO_VIP_FREE;
  const cooked = Math.max(0, gain - free.xp);
  const cooking = cheapestCooking(cooked, days, input.dishes, input.enabled, input.hoursPerDay);
  return { feasible: cooking.feasible, days, gain, free, cooked, cooking, cost: cooking.cost };
}

/** Предельная скорость: опыт в сутки, если все включённые здания заняты лучшим по скорости блюдом. */
export function maxXpPerDay(dishes: Dish[], enabled: Building[], hoursPerDay = 24): number {
  return groupByBuilding(dishes, enabled).reduce(
    (s, g) => s + hoursPerDay * Math.max(...g.map((d) => d.xpPerHour)),
    0,
  );
}

/** Минимальный срок, за который вообще можно набрать опыт (все здания на самых быстрых блюдах). */
export function minDays(input: PlanInput): number | null {
  if (input.targetXp <= input.startXp) return 0;
  const rate = maxXpPerDay(input.dishes, input.enabled, input.hoursPerDay);
  const feasibleAt = (d: number) => planFor(input, d).feasible;
  if (!(rate > 0)) return null;
  let hi = Math.max(1, (input.targetXp - input.startXp) / rate);
  let guard = 0;
  while (!feasibleAt(hi) && guard++ < 60) hi *= 1.5;
  if (!feasibleAt(hi)) return null;
  let lo = 0;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (feasibleAt(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

export type PlanMode = 'fast' | 'balanced' | 'cheap' | 'custom';

export interface PlanCurve {
  /** Самый короткий возможный срок. */
  minDays: number;
  /** Верхняя граница срока для «дешёвого» плана: самый быстрый срок × stretch. */
  maxDays: number;
  fast: Plan;
  cheap: Plan;
  balanced: Plan;
}

/**
 * Три готовых плана на отрезке сроков [самый быстрый; самый быстрый × stretch]:
 * - fast — самый быстрый срок;
 * - cheap — самый дешёвый в пределах растянутого срока (чем дольше, тем дешевле);
 * - balanced — «колено» кривой «срок — цена»: минимум суммы нормированных
 *   срока и цены, то есть точка, дальше которой каждый сэкономленный Flower
 *   обходится слишком дорого по времени.
 */
export function planCurve(input: PlanInput, stretch: number): PlanCurve | null {
  const d0 = minDays(input);
  if (d0 == null) return null;
  const hi = d0 * Math.max(1, stretch);
  const at = (d: number) => planFor(input, d * 1.0000001 + 1e-9);
  const fast = at(d0);
  const cheap = at(hi);
  let balanced = fast;
  if (hi > d0 && cheap.cost < fast.cost) {
    let bestScore = Infinity;
    const N = 80;
    const span = fast.cost - cheap.cost;
    for (let i = 0; i <= N; i++) {
      const d = d0 + ((hi - d0) * i) / N;
      const p = at(d);
      if (!p.feasible) continue;
      const score = (p.cost - cheap.cost) / span + (d - d0) / (hi - d0);
      if (score < bestScore) {
        bestScore = score;
        balanced = p;
      }
    }
  } else {
    balanced = cheap;
  }
  return { minDays: d0, maxDays: hi, fast, cheap, balanced };
}
