/**
 * Цветы: что скрещивать и сколько это стоит.
 *
 * Семена, количества предметов и сезонность — из flowerData.generated.ts
 * (scripts/sync-flower-data.ts, код игры). Таблица «цветок → предметы» снята
 * со страницы sfl-calculator.com (сервер игры выбирает результат сам).
 *
 * Цены: семя — в монетах, во Flower по курсу монет; предметы скрещивания и
 * сами цветы — floor маркетплейса. Для предметов без цены (цветов на маркете
 * бывает нет) рецепт считается неполным и в «самый дешёвый» не попадает.
 */
import { CROSSBREED_AMOUNTS, FLOWER_RECIPES, FLOWER_SEEDS } from './flowerData.generated';
import { SELLABLES } from './coinRate';
import { SKILLS } from './skills';
import type { SkillRank } from './toolCosts';

export const SEED_ORDER = Object.keys(FLOWER_SEEDS);

const PNG_FLOWERS = /(Carnation|Edelweiss|Gladiolus)$/;

export function flowerIcon(name: string): string {
  const file = name.toLowerCase().replace(/ /g, '_');
  return `/sprites/flowers/${file}.${PNG_FLOWERS.test(name) ? 'png' : 'webp'}`;
}

export function seedIcon(seed: string): string {
  return flowerIcon(seed);
}

const SELLABLE_ICON = new Map(SELLABLES.map((s) => [s.name, s.icon]));
const SELLABLE_RU = new Map(SELLABLES.map((s) => [s.name, s.labelRu]));

/** Якорь строки цветка: Red Pansy → flower-red-pansy (для перехода по клику и прямых ссылок). */
export function flowerAnchor(name: string): string {
  return `flower-${name.toLowerCase().replace(/ /g, '-')}`;
}

/** Цветок по якорю из адреса страницы; undefined — такого цветка нет. */
export function flowerByAnchor(anchor: string): string | undefined {
  return Object.keys(FLOWER_RECIPES).find((f) => flowerAnchor(f) === anchor);
}

/** Семя, из которого растёт цветок. */
export function seedOfFlower(flower: string): string | undefined {
  return Object.keys(FLOWER_SEEDS).find((s) => FLOWER_SEEDS[s].flowers.includes(flower));
}

/** Иконка предмета скрещивания: урожай/фрукт или цветок. */
export function ingredientIcon(name: string): string {
  return SELLABLE_ICON.get(name) ?? flowerIcon(name);
}

export function ingredientLabelRu(name: string): string | undefined {
  return SELLABLE_RU.get(name);
}

/**
 * Бусты цветов (код игры: harvestFlower.getFlowerAmount, plantFlower.getFlowerTime,
 * seedBought.getSeedPrice). Шанс «+1 цветок» у каждого буста бросается отдельно,
 * поэтому ожидаемый выход — 1 + сумма шансов (+1 у Legendary Shrine без шанса).
 */
export interface FlowerBoosts {
  butterfly: boolean; // 20% шанс +1
  hummingBird: boolean; // 20% шанс +1
  chicory: boolean; // 10% шанс +1
  desertRose: boolean; // 10% шанс +1
  saltCrystalFlower: boolean; // 5% шанс +1
  mothShrine: boolean; // 20% шанс +1 и время ×0.75
  legendaryShrine: boolean; // +1 цветок
  petalledPerk: SkillRank; // навык: шанс +1 по рангу
  hungryCaterpillar: boolean; // семена цветов бесплатны
  kuebiko: boolean; // все семена бесплатны
  artist: boolean; // семена ×0.9
  flowerSale: SkillRank; // навык: цена семян по рангу
  flowerFox: boolean; // время ×0.9
  bloomingBoost: SkillRank; // навык: время по рангу
  flowerPower: SkillRank; // навык: время по рангу
  floweryAbode: SkillRank; // навык: время ×1.5/1.6/1.7 (штраф)
}

export const NO_FLOWER_BOOSTS: FlowerBoosts = {
  butterfly: false, hummingBird: false, chicory: false, desertRose: false, saltCrystalFlower: false,
  mothShrine: false, legendaryShrine: false, petalledPerk: 0,
  hungryCaterpillar: false, kuebiko: false, artist: false, flowerSale: 0,
  flowerFox: false, bloomingBoost: 0, flowerPower: 0, floweryAbode: 0,
};

/** Значения рангов навыка из skills.ts (поле ranks, для Flowery Abode — growth). */
export function flowerSkillValues(skill: string, field = 'ranks'): number[] {
  const eff = (SKILLS.find((x) => x.name === skill)?.upgrade?.effect ?? {}) as Record<string, unknown>;
  const v = eff[field];
  return Array.isArray(v) ? (v as number[]) : [];
}
const rank = (skill: string, r: SkillRank, field = 'ranks'): number => (r === 0 ? 0 : (flowerSkillValues(skill, field)[r - 1] ?? 0));

/** Ожидаемое число цветов за один сбор. */
export function expectedFlowers(b: FlowerBoosts): number {
  return (
    1 +
    (b.butterfly ? 0.2 : 0) + (b.hummingBird ? 0.2 : 0) + (b.chicory ? 0.1 : 0) + (b.desertRose ? 0.1 : 0) +
    (b.saltCrystalFlower ? 0.05 : 0) + (b.mothShrine ? 0.2 : 0) + rank('Petalled Perk', b.petalledPerk) / 100 +
    (b.legendaryShrine ? 1 : 0)
  );
}

/** Цена одного семени в монетах с бустами. */
export function seedCoins(seed: string, b: FlowerBoosts): number {
  if (b.kuebiko || b.hungryCaterpillar) return 0;
  let price = FLOWER_SEEDS[seed].price;
  if (b.artist) price *= 0.9;
  if (b.flowerSale) price *= rank('Flower Sale', b.flowerSale);
  return price;
}

/** Дни роста с бустами. */
export function growDays(seed: string, b: FlowerBoosts): number {
  let days = FLOWER_SEEDS[seed].days;
  if (b.flowerFox) days *= 0.9;
  if (b.mothShrine) days *= 0.75;
  if (b.bloomingBoost) days *= rank('Blooming Boost', b.bloomingBoost);
  if (b.flowerPower) days *= rank('Flower Power', b.flowerPower);
  if (b.floweryAbode) days *= rank('Flowery Abode', b.floweryAbode, 'growth');
  return days;
}

export interface RecipeOption {
  name: string;
  amount: number;
  /** Цена одной штуки; null — посчитать не из чего. */
  unit: number | null;
  /** true — предмет сам цветок (цена — себестоимость его выращивания). */
  isFlower: boolean;
  total: number | null;
  /** Дни от посадки до цветка по этому варианту (с ожиданием цветка-ингредиента); задаётся в flowerRow. */
  days?: number;
  /** Себестоимость одного цветка по этому варианту; задаётся в flowerRow. */
  cost?: number | null;
  /** Сколько дней сверху ждать цветок-ингредиент (0 — урожай или фрукт); задаётся в flowerRow. */
  wait?: number;
  /** false — есть вариант не дороже и не дольше, причём хотя бы в чём-то лучше; задаётся в flowerRow. */
  worthwhile?: boolean;
}

/** Порядок рецептов внутри строки цветка. */
export type FlowerSort = 'cheap' | 'fast';

export interface FlowerRow {
  flower: string;
  /** Варианты в выбранном порядке; без цены/времени — в конце. */
  options: RecipeOption[];
  /** Самый дешёвый вариант (при равной цене — быстрее). */
  cheapest: RecipeOption | null;
  /** Самый быстрый вариант (при равном времени — дешевле). */
  fastest: RecipeOption | null;
}

const SEED_OF_FLOWER = new Map(
  Object.entries(FLOWER_SEEDS).flatMap(([seed, s]) => s.flowers.map((f) => [f, seed] as const)),
);

function buildOptions(
  flower: string,
  prices: Record<string, number | null>,
  costs: Record<string, number>,
): RecipeOption[] {
  const set = FLOWER_SEEDS[SEED_OF_FLOWER.get(flower)!].set;
  const options = FLOWER_RECIPES[flower].map((name): RecipeOption => {
    const amount = CROSSBREED_AMOUNTS[set][name];
    const isFlower = name in FLOWER_RECIPES;
    // Цветы на маркете не торгуются — считаем по себестоимости выращивания.
    const unit = isFlower ? (costs[name] ?? null) : (prices[name] ?? null);
    return { name, amount, unit, isFlower, total: unit == null ? null : unit * amount };
  });
  options.sort((a, b) => {
    if (a.total == null || b.total == null) return a.total == null ? (b.total == null ? 0 : 1) : -1;
    return a.total - b.total;
  });
  return options;
}

/**
 * Себестоимость каждого цветка: цена семени + самый дешёвый предмет
 * скрещивания. Предметом бывает другой цветок (и цепочка, и цикл), поэтому
 * считаем итерациями, пока значения не перестанут уменьшаться.
 */
export function flowerCosts(
  prices: Record<string, number | null>,
  coinRate: number | null | undefined,
  boosts: FlowerBoosts = NO_FLOWER_BOOSTS,
): Record<string, number> {
  const costs: Record<string, number> = {};
  if (!coinRate) return costs;
  const yieldPer = expectedFlowers(boosts);
  for (let pass = 0; pass < 60; pass++) {
    let changed = false;
    for (const flower of Object.keys(FLOWER_RECIPES)) {
      const best = buildOptions(flower, prices, costs)[0];
      if (best?.total == null) continue;
      // Посадка тратит семя и предмет скрещивания, а даёт expectedFlowers цветов.
      const seed = SEED_OF_FLOWER.get(flower)!;
      // Цепочки из цветов с выходом больше 1 и бесплатными семенами стремятся к нулю — округляем.
      const raw = (seedCoins(seed, boosts) / coinRate + best.total) / yieldPer;
      const cost = raw < 1e-7 ? 0 : raw;
      if (costs[flower] == null || cost < costs[flower] - 1e-9) {
        costs[flower] = cost;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return costs;
}

/**
 * Дни до готового цветка: рост семени плюс ожидание цветка-ингредиента (его
 * надо вырастить заранее). Берётся самая короткая цепочка; урожай и фрукты
 * считаем уже имеющимися. Считается итерациями — цепочки и циклы.
 */
export function flowerTimes(boosts: FlowerBoosts = NO_FLOWER_BOOSTS): Record<string, number> {
  const times: Record<string, number> = {};
  for (let pass = 0; pass < 60; pass++) {
    let changed = false;
    for (const flower of Object.keys(FLOWER_RECIPES)) {
      let wait = Infinity;
      for (const name of FLOWER_RECIPES[flower]) {
        const w = name in FLOWER_RECIPES ? (times[name] ?? Infinity) : 0;
        if (w < wait) wait = w;
      }
      if (!Number.isFinite(wait)) continue;
      const t = growDays(SEED_OF_FLOWER.get(flower)!, boosts) + wait;
      if (times[flower] == null || t < times[flower] - 1e-9) {
        times[flower] = t;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return times;
}

export interface FlowerRowContext {
  costs: Record<string, number>;
  times: Record<string, number>;
  coinRate: number | null | undefined;
  boosts: FlowerBoosts;
  sort: FlowerSort;
}

export function flowerRow(flower: string, prices: Record<string, number | null>, ctx: FlowerRowContext): FlowerRow {
  const seed = SEED_OF_FLOWER.get(flower)!;
  const yieldPer = expectedFlowers(ctx.boosts);
  const ownDays = growDays(seed, ctx.boosts);
  const options = buildOptions(flower, prices, ctx.costs).map((o): RecipeOption => {
    const wait = o.isFlower ? (ctx.times[o.name] ?? Infinity) : 0;
    const raw = o.total != null && ctx.coinRate ? (seedCoins(seed, ctx.boosts) / ctx.coinRate + o.total) / yieldPer : null;
    return { ...o, days: ownDays + wait, wait, cost: raw == null ? null : raw < 1e-7 ? 0 : raw };
  });
  const byCost = (a: RecipeOption, b: RecipeOption) =>
    a.cost == null || b.cost == null ? (a.cost == null ? (b.cost == null ? 0 : 1) : -1) : a.cost - b.cost;
  const byTime = (a: RecipeOption, b: RecipeOption) => {
    const d = (a.days ?? Infinity) - (b.days ?? Infinity);
    return Number.isFinite(d) && Math.abs(d) > 1e-9 ? d : byCost(a, b);
  };
  const byCostThenTime = (a: RecipeOption, b: RecipeOption) => {
    const c = byCost(a, b);
    return c !== 0 && Math.abs(c) > 1e-12 ? c : (a.days ?? Infinity) - (b.days ?? Infinity);
  };
  // Вариант «не стоит того», если другой не дороже и не дольше и хотя бы в чём-то лучше.
  const eps = 1e-9;
  for (const o of options) {
    const c = o.cost ?? Infinity;
    const d = o.days ?? Infinity;
    o.worthwhile = !options.some((p) => {
      if (p === o) return false;
      const pc = p.cost ?? Infinity;
      const pd = p.days ?? Infinity;
      return pc <= c + eps && pd <= d + eps && (pc < c - eps || pd < d - eps);
    });
  }
  const sorted = [...options].sort(ctx.sort === 'fast' ? byTime : byCostThenTime);
  const cheapest = [...options].sort(byCostThenTime).find((o) => o.cost != null) ?? null;
  const fastest = [...options].sort(byTime).find((o) => Number.isFinite(o.days)) ?? null;
  return { flower, options: sorted, cheapest, fastest };
}

/** Цена семени во Flower по курсу монет; null — курс не посчитан. */
export function seedFlowerPrice(seed: string, coinRate: number | null | undefined, boosts: FlowerBoosts = NO_FLOWER_BOOSTS): number | null {
  return coinRate ? seedCoins(seed, boosts) / coinRate : null;
}

/** Названия предметов, чьи цены нужны: ингредиенты-урожай и фрукты (цветы на маркете не торгуются). */
export const FLOWER_PRICE_NAMES: string[] = [
  ...new Set(Object.values(FLOWER_RECIPES).flat().filter((n) => !(n in FLOWER_RECIPES))),
];

// ─── Помощник: полные цепочки посадок ────────────────────────────────────────

/**
 * План получения цветка: какое семя посадить, что скрестить и (если это цветок)
 * откуда взять его самого. cost — себестоимость одного цветка (как в flowerCosts),
 * days — время всей цепочки, planting — деньги на одну посадку каждого шага.
 */
export interface FlowerPlan {
  flower: string;
  seed: string;
  /** Предмет скрещивания и сколько штук. */
  option: string;
  amount: number;
  /** План выращивания цветка-ингредиента; null — предмет урожай или фрукт. */
  child: FlowerPlan | null;
  cost: number;
  days: number;
  planting: number;
}

export type PlanMode = 'balanced' | 'cheap' | 'fast';

const EPS = 1e-9;
const MAX_PLANS_PER_FLOWER = 12;

function dominates(a: { cost: number; days: number }, b: { cost: number; days: number }): boolean {
  return a.cost <= b.cost + EPS && a.days <= b.days + EPS && (a.cost < b.cost - EPS || a.days < b.days - EPS);
}

/** Добавляет план в набор лучших по цене и времени (парето-фронт); true — набор изменился. */
function addPlan(set: FlowerPlan[], plan: FlowerPlan): boolean {
  for (const p of set) {
    if (dominates(p, plan)) return false;
    if (Math.abs(p.cost - plan.cost) <= EPS && Math.abs(p.days - plan.days) <= EPS) return false;
  }
  for (let i = set.length - 1; i >= 0; i--) if (dominates(plan, set[i])) set.splice(i, 1);
  set.push(plan);
  set.sort((a, b) => a.days - b.days);
  // Слишком длинный фронт прореживаем равномерно, крайние точки оставляем.
  while (set.length > MAX_PLANS_PER_FLOWER) set.splice(1 + Math.floor((set.length - 2) / 2), 1);
  return true;
}

/**
 * Лучшие планы по каждому цветку: все варианты, которые нельзя улучшить сразу
 * и по цене, и по времени. Цветок-ингредиент берёт свои лучшие планы, так что
 * цепочки и циклы считаются итерациями до стабильности.
 */
export function flowerPlans(
  prices: Record<string, number | null>,
  coinRate: number | null | undefined,
  boosts: FlowerBoosts = NO_FLOWER_BOOSTS,
): Record<string, FlowerPlan[]> {
  const plans: Record<string, FlowerPlan[]> = {};
  for (const f of Object.keys(FLOWER_RECIPES)) plans[f] = [];
  if (!coinRate) return plans;
  const yieldPer = expectedFlowers(boosts);
  for (let pass = 0; pass < 40; pass++) {
    let changed = false;
    for (const flower of Object.keys(FLOWER_RECIPES)) {
      const seed = SEED_OF_FLOWER.get(flower)!;
      const set = FLOWER_SEEDS[seed].set;
      const seedFlower = seedCoins(seed, boosts) / coinRate;
      const ownDays = growDays(seed, boosts);
      for (const name of FLOWER_RECIPES[flower]) {
        const amount = CROSSBREED_AMOUNTS[set][name];
        if (name in FLOWER_RECIPES) {
          for (const child of [...plans[name]]) {
            const raw = (seedFlower + amount * child.cost) / yieldPer;
            const plan: FlowerPlan = {
              flower, seed, option: name, amount, child,
              cost: raw < 1e-7 ? 0 : raw,
              days: ownDays + child.days,
              planting: seedFlower + amount * child.planting,
            };
            if (addPlan(plans[flower], plan)) changed = true;
          }
        } else {
          const unit = prices[name] ?? null;
          if (unit == null) continue;
          const raw = (seedFlower + unit * amount) / yieldPer;
          const plan: FlowerPlan = {
            flower, seed, option: name, amount, child: null,
            cost: raw < 1e-7 ? 0 : raw,
            days: ownDays,
            planting: seedFlower + unit * amount,
          };
          if (addPlan(plans[flower], plan)) changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return plans;
}

/** Выбор плана из лучших: самый дешёвый, самый быстрый или баланс цены и времени. */
export function pickPlan(plans: FlowerPlan[], mode: PlanMode): FlowerPlan | null {
  if (plans.length === 0) return null;
  const byDays = (a: FlowerPlan, b: FlowerPlan) => a.days - b.days || a.cost - b.cost;
  const byCost = (a: FlowerPlan, b: FlowerPlan) => a.cost - b.cost || a.days - b.days;
  if (mode === 'fast') return [...plans].sort(byDays)[0];
  if (mode === 'cheap') return [...plans].sort(byCost)[0];
  // Баланс: минимум «цена × время»; небольшая добавка к цене не даёт нулю выиграть у всех.
  const delta = Math.max(...plans.map((p) => p.cost)) * 0.05 + 1e-9;
  return [...plans].sort((a, b) => (a.cost + delta) * a.days - (b.cost + delta) * b.days || byDays(a, b))[0];
}

export interface PlanStep {
  flower: string;
  seed: string;
  seedFlower: number | null;
  /** Предмет скрещивания, количество и цена за всё количество (null — нет цены). */
  ingredient: string;
  amount: number;
  isFlower: boolean;
  ingredientTotal: number | null;
  /** Дни на этот шаг (рост семени с бустами). */
  days: number;
}

/** Шаги по порядку: сначала то, что нужно вырастить заранее, последним — целевой цветок. */
export function planSteps(
  plan: FlowerPlan,
  prices: Record<string, number | null>,
  coinRate: number | null | undefined,
  boosts: FlowerBoosts = NO_FLOWER_BOOSTS,
): PlanStep[] {
  const steps: PlanStep[] = plan.child ? planSteps(plan.child, prices, coinRate, boosts) : [];
  const isFlower = plan.child != null;
  steps.push({
    flower: plan.flower,
    seed: plan.seed,
    seedFlower: seedFlowerPrice(plan.seed, coinRate, boosts),
    ingredient: plan.option,
    amount: plan.amount,
    isFlower,
    ingredientTotal: isFlower ? plan.child!.planting * plan.amount : prices[plan.option] != null ? prices[plan.option]! * plan.amount : null,
    days: growDays(plan.seed, boosts),
  });
  return steps;
}

/** Время: до двух суток — в часах, дальше — в днях. */
export function formatDays(d: number): string {
  const hours = d * 24;
  const fmt = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  return hours < 48 ? `${fmt(hours)} ч` : `${fmt(d)} дн.`;
}
