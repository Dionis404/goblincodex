/**
 * Планировщик прокачки опыта бампкина через еду и рыбу.
 *
 * Модель. Опыт даёт съеденное блюдо или рыба. Каждое блюдо стоит денег
 * (floor-цены ингредиентов) и занимает «ресурсы»: время зданий (Fire Pit, Kitchen,
 * Bakery, Deli, Smoothie Shack, Fish Market — в часах в сутки) и заброс удочки
 * (в бросках в сутки, у игры дневной лимит). Ингредиенты блюда, которые сами готовятся
 * (Cheese для Blue Cheese, Mashed Potato для Cabbers n Mash, рыбные наживки
 * для рыбных блюд), нагружают свои ресурсы тоже — поэтому блюдо описывается
 * вектором «usage»: сколько каждого ресурса нужно на одну порцию, включая заготовки.
 *
 * Чтобы набрать нужный опыт за срок D дней с наименьшей ценой, нужно выбрать,
 * сколько каких блюд приготовить, чтобы загрузка каждого ресурса не превысила
 * D × его суточную ёмкость. Это задача линейного программирования; решаем её
 * методом множителя Лагранжа: при цене опыта λ ищем набор блюд, максимизирующий
 * «λ × опыт − цена» (симплекс-метод), и подбираем λ делением пополам, а на стыке
 * двух решений делим их дробно.
 *
 * VIP: за вход каждый день выдаётся одно блюдо по уровню (getVipDailyBonusItem
 * в игре). Оно съедается бесплатно, поэтому уменьшает опыт, который надо
 * приготовить, и тем самым стоимость. Блюдо зависит от уровня на момент входа —
 * уровень по ходу прокачки оцениваем равномерным ростом опыта.
 *
 * Не учитывается: цена масла, ручной перезапуск готовки, наличие ингредиентов
 * на ферме (всё считается покупкой по floor), выдержанная рыба (Aging Shed),
 * червь для заброса (его цена не выделяется из компостера), приманки ловушек как
 * расход времени (в цену они входят), случайный улов без наживки, нехватка Crab
 * (оценивается по цене продажи Бетти и считается неограниченной).
 */
import {
  BUILDINGS,
  FISH_BASE_XP,
  NO_PRICE_RECIPES,
  RECIPE_BY_NAME,
  fishXpMultiplier,
  foodXp,
  recipeCost,
  timeMultiplier,
  type Building,
  type Recipe,
  type TimeBoosts,
  type XpBoosts,
} from './food';
import { PRE_ASCENSION_MAX_LEVEL, levelForXp } from './bumpkinXp';
import { BAIT_RECIPES, FISH_RECORDS, GUARANTEED_CATCH } from './fishData.generated';
import { BAITS, CRUSTACEAN_POT, SEASON_NAMES } from './baitCosts';
import { NO_CRUSTACEAN_BOOSTS, expectedYield, readyHours } from './crustaceans';
import { castCost, expectedFishPerCast, type FishTier, type FishingBoosts } from './fishYield';

/**
 * Ресурсы, которые тратит еда: здания (часы), Fish Market (часы), заброс удочки
 * (штуки) и место под ловушку на раков (часы ловушки).
 */
export type Resource = Building | 'Fish Market' | 'Fishing' | 'Traps';

/** Ёмкость ресурсов в сутки: часы для зданий и Fish Market, забросы для рыбалки. */
export type Capacity = Partial<Record<Resource, number>>;

export interface Dish {
  name: string;
  /** Откуда блюдо: здание, где оно готовится, или «Рыбалка» для сырой рыбы. */
  group: Resource;
  kind: 'dish' | 'fish';
  /** Опыт за одну порцию с бустами. */
  xp: number;
  /** Цена одной порции во Flower (с заготовками). */
  cost: number;
  /** Сколько каждого ресурса нужно на порцию, включая заготовки. */
  usage: Partial<Record<Resource, number>>;
  /** Заготовки на порцию: название → сколько штук (все уровни вложенности). */
  needs: Record<string, number>;
}

const FISH_TIER = new Map(FISH_RECORDS.map((f) => [f.name, f.type as FishTier]));

/**
 * Ресурсы на одну наживку: забросы (на рыбу из рецепта), часы Fish Market и часы
 * ловушек (на раков из рецепта: время сбора ловушки делится на улов за сбор).
 */
function baitUsage(bait: string, fishing: FishingBoosts): { casts: number; hours: number; trapHours: number } {
  const recipe = BAIT_RECIPES[bait];
  let casts = 0;
  let trapHours = 0;
  const perCrustacean = (name: string) => {
    const pot = CRUSTACEAN_POT.get(name);
    return pot ? readyHours(pot, NO_CRUSTACEAN_BOOSTS) / expectedYield(NO_CRUSTACEAN_BOOSTS) : 0;
  };
  for (const season of SEASON_NAMES) {
    const items = { ...recipe.base, ...recipe.seasonal[season] };
    for (const [name, amount] of Object.entries(items)) {
      const tier = FISH_TIER.get(name);
      if (tier) casts += amount / expectedFishPerCast(tier, season, fishing);
      trapHours += amount * perCrustacean(name);
    }
  }
  const n = SEASON_NAMES.length;
  return { casts: casts / n, hours: recipe.seconds / 3600, trapHours: trapHours / n };
}

/** Средний улов за заброс для рыбы по сезонам года. */
function avgYield(tier: FishTier, fishing: FishingBoosts): number {
  return SEASON_NAMES.reduce((s, season) => s + expectedFishPerCast(tier, season, fishing), 0) / SEASON_NAMES.length;
}

type Usage = Partial<Record<Resource, number>>;

/** Ресурсы и заготовки на одну порцию блюда (рекурсивно по промежуточным блюдам и наживкам). */
function usageOf(
  recipe: Recipe,
  timeBoosts: TimeBoosts,
  fishing: FishingBoosts,
  seen: string[] = [],
): { usage: Usage; needs: Record<string, number> } | null {
  if (seen.includes(recipe.name)) return null;
  const usage: Usage = {
    [recipe.building]: (recipe.cookingSeconds * timeMultiplier(recipe, timeBoosts)) / 3600,
  };
  const needs: Record<string, number> = {};
  const add = (u: Usage, factor: number) => {
    for (const [r, v] of Object.entries(u) as [Resource, number][]) usage[r] = (usage[r] ?? 0) + factor * v;
  };
  for (const [name, amount] of recipe.ingredients) {
    if ((BAITS as readonly string[]).includes(name)) {
      const b = baitUsage(name, fishing);
      add({ Fishing: b.casts, 'Fish Market': b.hours, Traps: b.trapHours }, amount);
      needs[name] = (needs[name] ?? 0) + amount;
      continue;
    }
    const sub = RECIPE_BY_NAME.get(name);
    if (!sub) continue;
    const inner = usageOf(sub, timeBoosts, fishing, [...seen, recipe.name]);
    if (!inner) return null;
    needs[name] = (needs[name] ?? 0) + amount;
    add(inner.usage, amount);
    for (const [n, c] of Object.entries(inner.needs)) needs[n] = (needs[n] ?? 0) + amount * c;
  }
  return { usage, needs };
}

export interface DishContext {
  prices: Record<string, number | null>;
  coinRate: number | null | undefined;
  xpBoosts: XpBoosts;
  timeBoosts: TimeBoosts;
  fishing: FishingBoosts;
}

/**
 * Блюда и рыба, которые можно планировать: уже есть в игре и у всех ингредиентов
 * есть цена. Опыт и время — с выбранными бустами; наживки считаются по рецепту.
 */
export function buildDishes(ctx: DishContext): Dish[] {
  const { prices, xpBoosts, timeBoosts, fishing } = ctx;
  const dishes: Dish[] = [];
  for (const group of BUILDINGS) {
    for (const recipe of group.recipes) {
      if (recipe.upcoming || NO_PRICE_RECIPES.has(recipe.name)) continue;
      const price = recipeCost(recipe.name, prices);
      if (price.cost == null || price.missing.length > 0) continue;
      const xp = foodXp(recipe, xpBoosts);
      const u = usageOf(recipe, timeBoosts, fishing);
      if (!u || !(xp > 0)) continue;
      const total = Object.values(u.usage).reduce((s, v) => s + v, 0);
      if (!(total > 0)) continue;
      dishes.push({ name: recipe.name, group: group.key, kind: 'dish', xp, cost: price.cost, usage: u.usage, needs: u.needs });
    }
  }
  dishes.push(...rawFishDishes(ctx));
  return dishes;
}

/**
 * Сырая рыба: ловим выбранную рыбу «гарантирующей» наживкой (выбираем самую
 * дешёвую из подходящих), съедаем сразу. Заброс на саму рыбу плюс забросы и
 * часы Fish Market на изготовление наживки.
 */
function rawFishDishes(ctx: DishContext): Dish[] {
  const { prices, coinRate, xpBoosts, fishing } = ctx;
  if (!coinRate) return [];
  const fishXp = fishXpMultiplier(xpBoosts);
  const cast = castCost(prices, coinRate, fishing);
  const out: Dish[] = [];
  for (const [name, baseXp] of Object.entries(FISH_BASE_XP)) {
    const tier = FISH_TIER.get(name);
    if (!tier) continue;
    let best: { bait: string; price: number } | null = null;
    for (const bait of BAITS) {
      if (!GUARANTEED_CATCH[bait]?.includes(name)) continue;
      const p = prices[bait];
      if (p != null && (best == null || p < best.price)) best = { bait, price: p };
    }
    if (!best) continue;
    const y = avgYield(tier, fishing);
    const b = baitUsage(best.bait, fishing);
    out.push({
      name,
      group: 'Fishing',
      kind: 'fish',
      xp: baseXp * fishXp,
      cost: cast / y + best.price,
      usage: { Fishing: 1 / y + b.casts, 'Fish Market': b.hours },
      needs: { [best.bait]: 1 },
    });
  }
  return out;
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
    result.xp += foodXp(recipe, { ...xpBoosts, vip: true });
    const price = recipeCost(name, prices);
    if (price.cost != null && price.missing.length === 0) result.value += price.cost;
    else result.valueKnown = false;
    result.dishes[name] = (result.dishes[name] ?? 0) + 1;
  }
  return result;
}

// ─── Линейное программирование ───────────────────────────────────────────────

/**
 * max v·x при A·x ≤ b, x ≥ 0 (b > 0). Табличный симплекс-метод с правилом
 * Бленда — для наших размеров (≤ 8 ресурсов, ≤ 80 блюд) этого достаточно.
 */
function simplexMax(v: number[], A: number[][], b: number[]): number[] {
  const m = b.length;
  const n = v.length;
  const cols = n + m + 1;
  const T: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) T[i][j] = A[i][j];
    T[i][n + i] = 1;
    T[i][cols - 1] = b[i];
  }
  for (let j = 0; j < n; j++) T[m][j] = -v[j];
  const basis = Array.from({ length: m }, (_, i) => n + i);
  const EPS = 1e-10;

  for (let iter = 0; iter < 20_000; iter++) {
    let enter = -1;
    for (let j = 0; j < n + m; j++) {
      if (T[m][j] < -EPS) {
        enter = j;
        break;
      }
    }
    if (enter < 0) break;
    let leave = -1;
    let best = Infinity;
    for (let i = 0; i < m; i++) {
      if (T[i][enter] > EPS) {
        const ratio = T[i][cols - 1] / T[i][enter];
        if (ratio < best - 1e-12 || (Math.abs(ratio - best) <= 1e-12 && leave >= 0 && basis[i] < basis[leave])) {
          best = ratio;
          leave = i;
        }
      }
    }
    if (leave < 0) break;
    const pivot = T[leave][enter];
    for (let j = 0; j < cols; j++) T[leave][j] /= pivot;
    for (let i = 0; i <= m; i++) {
      if (i === leave) continue;
      const factor = T[i][enter];
      if (Math.abs(factor) < 1e-15) continue;
      for (let j = 0; j < cols; j++) T[i][j] -= factor * T[leave][j];
    }
    basis[leave] = enter;
  }
  const x = new Array<number>(n).fill(0);
  for (let i = 0; i < m; i++) if (basis[i] < n) x[basis[i]] = Math.max(0, T[i][cols - 1]);
  return x;
}

// ─── Распределение ресурсов ──────────────────────────────────────────────────

export interface Allocation {
  dish: Dish;
  /** Сколько таких порций приготовить (дробное — округляем при показе). */
  count: number;
  xp: number;
  cost: number;
}

export interface Cooking {
  feasible: boolean;
  allocations: Allocation[];
  xp: number;
  cost: number;
  /** Использовано ресурсов за срок (часы или забросы), с заготовками. */
  loads: Partial<Record<Resource, number>>;
  /** Заготовки: название → сколько штук надо приготовить. */
  prep: Record<string, number>;
}

const EMPTY_COOKING: Cooking = { feasible: true, allocations: [], xp: 0, cost: 0, loads: {}, prep: {} };

/** Ресурсы, которыми реально можно пользоваться (ёмкость > 0). */
function activeResources(capacity: Capacity): Resource[] {
  return (Object.keys(capacity) as Resource[]).filter((r) => (capacity[r] ?? 0) > 0);
}

/** Блюда, которые целиком обходятся включёнными ресурсами (заготовки тоже). */
function availableDishes(dishes: Dish[], capacity: Capacity): Dish[] {
  const active = activeResources(capacity);
  return dishes.filter((d) => (Object.keys(d.usage) as Resource[]).every((r) => active.includes(r)));
}

/** Ресурсы, которые используют хоть какие-то доступные блюда. */
function usedResources(avail: Dish[], capacity: Capacity): Resource[] {
  return activeResources(capacity).filter((r) => avail.some((d) => (d.usage[r] ?? 0) > 0));
}

/** Решение для цены опыта λ: сколько порций каждого блюда в сутки (при ёмкости 1 «сутки» на ресурс). */
function solveAt(lambda: number, dishes: Dish[], resources: Resource[], capacity: Capacity): number[] {
  const raw = dishes.map((d) => lambda * d.xp - d.cost);
  const scale = Math.max(...raw.map((r) => Math.abs(r)), 1e-12);
  const v = raw.map((r) => r / scale);
  const A = resources.map((r) => dishes.map((d) => (d.usage[r] ?? 0) / (capacity[r] as number)));
  return simplexMax(v, A, resources.map(() => 1));
}

const xpPerDay = (x: number[], dishes: Dish[]) => x.reduce((s, c, i) => s + c * dishes[i].xp, 0);

/** Верхняя граница цены опыта: при ней важна только скорость. */
function lambdaMax(dishes: Dish[]): number {
  return 1e6 * Math.max(...dishes.map((d) => d.cost / d.xp), 1e-9) + 1;
}

/** Предельная скорость: опыт в сутки, если все ресурсы заняты самыми быстрыми по опыту блюдами. */
export function maxXpPerDay(dishes: Dish[], capacity: Capacity): number {
  const avail = availableDishes(dishes, capacity);
  const resources = usedResources(avail, capacity);
  if (avail.length === 0 || resources.length === 0) return 0;
  return xpPerDay(solveAt(lambdaMax(avail), avail, resources, capacity), avail);
}

/**
 * Дешевле всего набрать `need` опыта за `days` дней. Возвращает feasible = false,
 * если срок слишком мал.
 */
export function cheapestCooking(need: number, days: number, dishes: Dish[], capacity: Capacity): Cooking {
  if (need <= 0) return EMPTY_COOKING;
  const avail = availableDishes(dishes, capacity);
  const resources = usedResources(avail, capacity);
  if (avail.length === 0 || resources.length === 0) return { ...EMPTY_COOKING, feasible: false };
  const total = (x: number[]) => days * xpPerDay(x, avail);

  const hi0 = lambdaMax(avail);
  const top = solveAt(hi0, avail, resources, capacity);
  if (total(top) < need * (1 - 1e-9)) return { ...EMPTY_COOKING, feasible: false };

  let lo = 0;
  let hi = hi0;
  let xLo = solveAt(lo, avail, resources, capacity);
  let xHi = top;
  for (let i = 0; i < 70 && hi - lo > 1e-9 * hi; i++) {
    const mid = (lo + hi) / 2;
    const xm = solveAt(mid, avail, resources, capacity);
    if (total(xm) >= need) {
      hi = mid;
      xHi = xm;
    } else {
      lo = mid;
      xLo = xm;
    }
  }
  const tLo = total(xLo);
  const tHi = total(xHi);
  const f = tHi > tLo + 1e-9 ? Math.min(1, Math.max(0, (need - tLo) / (tHi - tLo))) : 1;

  const counts = avail.map((_, i) => days * ((1 - f) * xLo[i] + f * xHi[i]));
  const allocations: Allocation[] = [];
  const loads: Partial<Record<Resource, number>> = {};
  const prep: Record<string, number> = {};
  avail.forEach((dish, i) => {
    const count = counts[i];
    if (count < 1e-9) return;
    allocations.push({ dish, count, xp: count * dish.xp, cost: count * dish.cost });
    for (const [r, u] of Object.entries(dish.usage) as [Resource, number][]) loads[r] = (loads[r] ?? 0) + count * u;
    for (const [name, c] of Object.entries(dish.needs)) prep[name] = (prep[name] ?? 0) + count * c;
  });
  allocations.sort((a, b) => b.xp - a.xp);
  return {
    feasible: true,
    allocations,
    xp: allocations.reduce((s, a) => s + a.xp, 0),
    cost: allocations.reduce((s, a) => s + a.cost, 0),
    loads,
    prep,
  };
}

// ─── Полный план: срок, VIP, цена ────────────────────────────────────────────

export interface PlanInput {
  startXp: number;
  targetXp: number;
  /** Игрок уже возвышался — уровень в VIP-блюде считаем максимальным. */
  ascended: boolean;
  dishes: Dish[];
  /** Ёмкость ресурсов в сутки (часы или забросы). */
  capacity: Capacity;
  xpBoosts: XpBoosts;
  vip: boolean;
  prices: Record<string, number | null>;
}

export interface Plan {
  feasible: boolean;
  days: number;
  /** Нужный опыт целиком. */
  gain: number;
  /** Из него бесплатно за VIP-блюда. */
  free: VipFree;
  /** Опыт, который надо набрать готовкой и рыбалкой. */
  cooked: number;
  cooking: Cooking;
  /** Затраты (VIP-блюда бесплатны). */
  cost: number;
}

function freeFor(input: PlanInput, days: number): VipFree {
  const gain = Math.max(0, input.targetXp - input.startXp);
  return input.vip
    ? vipFreeDishes(input.startXp, gain, days, input.ascended, input.xpBoosts, input.prices)
    : NO_VIP_FREE;
}

export function planFor(input: PlanInput, days: number): Plan {
  const gain = Math.max(0, input.targetXp - input.startXp);
  const free = freeFor(input, days);
  const cooked = Math.max(0, gain - free.xp);
  const cooking = cheapestCooking(cooked, days, input.dishes, input.capacity);
  return { feasible: cooking.feasible, days, gain, free, cooked, cooking, cost: cooking.cost };
}

/** Минимальный срок, за который вообще можно набрать опыт (все ресурсы заняты самыми быстрыми блюдами). */
export function minDays(input: PlanInput): number | null {
  if (input.targetXp <= input.startXp) return 0;
  const rate = maxXpPerDay(input.dishes, input.capacity);
  if (!(rate > 0)) return null;
  const gain = input.targetXp - input.startXp;
  // Быстрая проверка без решения задачи: хватает ли предельной скорости на нужный опыт.
  const feasibleAt = (d: number) => rate * d >= gain - freeFor(input, d).xp - 1e-6;
  let hi = Math.max(1, gain / rate);
  let guard = 0;
  while (!feasibleAt(hi) && guard++ < 60) hi *= 1.5;
  if (!feasibleAt(hi)) return null;
  let lo = 0;
  for (let i = 0; i < 60; i++) {
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
    const N = 40;
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
