/**
 * Животные: цикл «сон → поглаживания → кормление → продукция» и его цена.
 * Таблицы — animalData.generated.ts (npm run sfl:sync-animals), формулы повторяют
 * features/game/lib/animals.ts и events/landExpansion/{feedAnimal,loveAnimal,claimProduce}.ts.
 *
 * Цикл одного уровня: животное спит (база 24 ч), во сне его можно погладить два раза
 * (после первой и второй трети сна), проснувшись — съедает столько порций любимого
 * корма, сколько нужно до следующего уровня, и даёт продукцию нового уровня. На 15-м
 * уровне цикл — один «круг» опыта последнего уровня. Лишний опыт переносится на
 * следующий цикл, поэтому порции считаются в среднем (дробно), без округления вверх.
 */
import {
  ANIMAL_DROPS,
  ANIMAL_FOOD_RECIPES,
  ANIMAL_FOOD_XP,
  ANIMAL_LEVELS,
  ANIMAL_SKILL_EFFECTS,
  ANIMAL_SLEEP_HOURS,
  FEED_BUFF_HARVESTS,
  MUD_HARVESTS,
  LOVE_ITEM_CHANCES,
  LOVE_ITEM_XP,
  MUD_PER_APPLICATION,
  MUD_XP_MULTIPLIER,
  PIG_BRISTLES_PER_LEVEL,
  PIG_FEEDS,
  REQUIRED_FOOD_QTY,
} from './animalData.generated';

export type AnimalType = 'Chicken' | 'Cow' | 'Sheep' | 'Pig';
export const ANIMALS: AnimalType[] = ['Chicken', 'Cow', 'Sheep', 'Pig'];
export const ANIMAL_LABEL: Record<AnimalType, string> = { Chicken: 'Куры', Cow: 'Коровы', Sheep: 'Овцы', Pig: 'Свиньи' };
export const MAX_LEVEL = 15;

export type Rank = 0 | 1 | 2 | 3;
export type SkillName = keyof typeof ANIMAL_SKILL_EFFECTS;
export type FeedBuff = 'none' | 'Salt Lick' | 'Honey Treat' | 'Truffle Seasoning';
export type BudAura = 'none' | 'Basic' | 'Green' | 'Rare' | 'Mythical';

/** Множитель ауры бада (getBudYieldBoosts.ts: getAuraBoost). */
export const BUD_AURA: Record<BudAura, number> = { none: 1, Basic: 1.05, Green: 1.2, Rare: 2, Mythical: 5 };
/** Бонусы бада к продукции животных: тип острова Retreat — ко всей, стебель Egg Head — к яйцам. */
export const BUD_RETREAT = 0.2;
export const BUD_EGG_HEAD = 0.2;

/** Бусты-предметы (коллекционные и одежда) — features/game/lib/animals.ts, loveAnimal.ts, feedAnimal.ts. */
export interface ItemBoost {
  name: string;
  animals: AnimalType[];
  /**
   * Что меняет: продукцию (+), расход корма (×), сон (×, El Pollo Veloz — −часы),
   * опыт за корм (×) и за поглаживание (+), бесплатное кормление, срок лакомств (×).
   */
  kind: 'produce' | 'feed' | 'sleep' | 'sleepHours' | 'love' | 'free' | 'xp' | 'buffDuration';
  value: number;
  /** Для kind 'produce' — какой ресурс; без него — вся продукция. */
  resource?: string;
  /** Временная святыня (Shrine): действует, пока стоит. */
  temporary?: boolean;
}

const ALL: AnimalType[] = ['Chicken', 'Cow', 'Sheep', 'Pig'];

export const ITEM_BOOSTS: ItemBoost[] = [
  // Продукция (getEggYieldBoosts и соседние функции)
  { name: 'Chicken Coop', animals: ['Chicken'], kind: 'produce', resource: 'Egg', value: 1 },
  { name: 'Rich Chicken', animals: ['Chicken'], kind: 'produce', resource: 'Egg', value: 0.1 },
  { name: 'Undead Rooster', animals: ['Chicken'], kind: 'produce', resource: 'Egg', value: 0.1 },
  { name: 'Ayam Cemani', animals: ['Chicken'], kind: 'produce', resource: 'Egg', value: 0.2 },
  { name: 'Squid Chicken', animals: ['Chicken'], kind: 'produce', resource: 'Egg', value: 0.1 },
  { name: 'Ascended Chicken', animals: ['Chicken'], kind: 'produce', resource: 'Egg', value: 0.1 },
  { name: 'Chicken Suit', animals: ['Chicken'], kind: 'produce', resource: 'Feather', value: 1 },
  { name: 'Alien Chicken', animals: ['Chicken'], kind: 'produce', resource: 'Feather', value: 0.1 },
  { name: 'Black Sheep Onesie', animals: ['Sheep'], kind: 'produce', resource: 'Wool', value: 2 },
  { name: 'White Sheep Onesie', animals: ['Sheep'], kind: 'produce', resource: 'Wool', value: 0.25 },
  { name: 'Astronaut Sheep', animals: ['Sheep'], kind: 'produce', resource: 'Wool', value: 0.1 },
  { name: 'Ascended Sheep', animals: ['Sheep'], kind: 'produce', resource: 'Wool', value: 0.05 },
  { name: 'Merino Jumper', animals: ['Sheep'], kind: 'produce', resource: 'Merino Wool', value: 1 },
  { name: 'Toxic Tuft', animals: ['Sheep'], kind: 'produce', resource: 'Merino Wool', value: 0.1 },
  { name: 'Longhorn Cowfish', animals: ['Cow'], kind: 'produce', resource: 'Milk', value: 0.2 },
  { name: 'Spa Cow', animals: ['Cow'], kind: 'produce', resource: 'Milk', value: 0.1 },
  { name: 'Milk Apron', animals: ['Cow'], kind: 'produce', resource: 'Milk', value: 0.5 },
  { name: 'Cowbell Necklace', animals: ['Cow'], kind: 'produce', resource: 'Milk', value: 2 },
  { name: 'Moo-ver', animals: ['Cow'], kind: 'produce', resource: 'Leather', value: 0.25 },
  { name: 'Mootant', animals: ['Cow'], kind: 'produce', resource: 'Leather', value: 0.1 },
  { name: 'Training Whistle', animals: ['Cow'], kind: 'produce', resource: 'Leather', value: 1 },
  { name: 'Cattlegrim', animals: ALL, kind: 'produce', value: 0.25 },
  { name: 'Barn Manager', animals: ALL, kind: 'produce', value: 0.1 },
  // Bale: +0,1 яиц, с навыком Bale Economy — ещё шерсти и молока; Double Bale умножает 0,1.
  { name: 'Bale', animals: ['Chicken', 'Cow', 'Sheep'], kind: 'produce', resource: 'Egg', value: 0.1 },
  // Расход корма (getBoostedFoodQuantity)
  { name: 'Fat Chicken', animals: ['Chicken'], kind: 'feed', value: 0.9 },
  { name: 'Cluckulator', animals: ['Chicken'], kind: 'feed', value: 0.75 },
  { name: 'Dr Cow', animals: ['Cow'], kind: 'feed', value: 0.95 },
  { name: 'Mermaid Sheep', animals: ['Sheep'], kind: 'feed', value: 0.95 },
  { name: 'Infernal Bullwhip', animals: ['Cow', 'Sheep'], kind: 'feed', value: 0.5 },
  // Святыни: и корм ×0,95, и сон ×0,75 — одна галочка на оба эффекта.
  { name: 'Collie Shrine', animals: ['Cow', 'Sheep'], kind: 'feed', value: 0.95, temporary: true },
  { name: 'Bantam Shrine', animals: ['Chicken'], kind: 'feed', value: 0.95, temporary: true },
  // Бесплатное кормление (feedAnimal: handleFreeFeeding)
  { name: 'Gold Egg', animals: ['Chicken'], kind: 'free', value: 0 },
  { name: 'Golden Cow', animals: ['Cow'], kind: 'free', value: 0 },
  { name: 'Golden Sheep', animals: ['Sheep'], kind: 'free', value: 0 },
  // Опыт за корм (handleFoodXP)
  { name: 'Pig Onesie', animals: ALL, kind: 'xp', value: 1.05 },
  // Опыт за поглаживание (getAnimalXP)
  { name: 'Baby Cow', animals: ['Cow'], kind: 'love', value: 10 },
  { name: 'Spa Sheep', animals: ['Sheep'], kind: 'love', value: 5 },
  // Сон (getBoostedAwakeAt)
  { name: 'El Pollo Veloz', animals: ['Chicken'], kind: 'sleepHours', value: 2 },
  { name: 'Speed Chicken', animals: ['Chicken'], kind: 'sleep', value: 0.9 },
  { name: 'Janitor Chicken', animals: ['Chicken'], kind: 'sleep', value: 0.95 },
  { name: 'Flamingo Chicken', animals: ['Chicken'], kind: 'sleep', value: 0.975 },
  { name: 'Dream Scarf', animals: ['Sheep'], kind: 'sleep', value: 0.8 },
  { name: 'Farm Dog', animals: ['Sheep'], kind: 'sleep', value: 0.75 },
  { name: 'Beetle Sheep', animals: ['Sheep'], kind: 'sleep', value: 0.925 },
  { name: 'Mammoth', animals: ['Cow'], kind: 'sleep', value: 0.75 },
  { name: 'Ascended Cow', animals: ['Cow'], kind: 'sleep', value: 0.975 },
  { name: 'Wrangler', animals: ALL, kind: 'sleep', value: 0.9 },
  // Длительность лакомств и грязи ×2 (getAnimalHarvests)
  { name: 'Vibraphone', animals: ALL, kind: 'buffDuration', value: 2 },
];

/** Сон святынь отдельно от корма: та же галочка. */
const SHRINE_SLEEP: Record<string, number> = { 'Collie Shrine': 0.75, 'Bantam Shrine': 0.75 };

export interface AnimalBoosts {
  items: Record<string, boolean>;
  skills: Partial<Record<SkillName, Rank>>;
  baleEconomy: boolean;
  /** Поглаживаний за сон: в игре можно два — после первой и второй трети сна. */
  loves: 0 | 1 | 2;
  feedBuff: FeedBuff;
  /** Грязь у свиньи: +25% опыта за корм. */
  mud: boolean;
  /** Бад на ферме: засчитывается лучший один (тип Retreat, стебель Egg Head, аура). */
  bud: { retreat: boolean; eggHead: boolean; aura: BudAura };
  /**
   * Buckaroo (старый навык): шанс двойного сбора, %. Шанс бросает сервер, в коде
   * игры его нет — вводит игрок; в расчёте среднее ×(1 + шанс).
   */
  buckarooChance: number;
  /** Чем кормить: любимый корм уровня или Omnifeed (тот же опыт, 1 Gem за штуку). */
  omnifeed: boolean;
}

export const NO_ANIMAL_BOOSTS: AnimalBoosts = {
  items: {},
  skills: {},
  baleEconomy: false,
  loves: 2,
  feedBuff: 'none',
  mud: false,
  bud: { retreat: false, eggHead: false, aura: 'none' },
  buckarooChance: 0,
  omnifeed: false,
};

/** Прибавка бада к ресурсу: аура × (тип + стебель). */
export function budBoost(resource: string, b: AnimalBoosts): number {
  const add = (b.bud.retreat ? BUD_RETREAT : 0) + (resource === 'Egg' && b.bud.eggHead ? BUD_EGG_HEAD : 0);
  return Number((BUD_AURA[b.bud.aura] * add).toFixed(4));
}

const has = (b: AnimalBoosts, name: string) => !!b.items[name];
const rank = (b: AnimalBoosts, s: SkillName) => b.skills[s] ?? 0;
function skillValue(s: SkillName, r: Rank, field = 'ranks'): number {
  const eff = ANIMAL_SKILL_EFFECTS[s] as unknown as Record<string, number[]>;
  return r === 0 ? 0 : (eff[field]?.[r - 1] ?? 0);
}

/** Значения навыка по рангам для подписи («0.95 / 0.94 / 0.925»). */
export function skillRanks(s: SkillName, field = 'ranks'): number[] {
  return ((ANIMAL_SKILL_EFFECTS[s] as unknown as Record<string, number[]>)[field] ?? []).slice();
}

export const DIET_SKILLS: Record<AnimalType, SkillName> = {
  Chicken: 'Clucky Grazing',
  Sheep: 'Sheepwise Diet',
  Cow: 'Cow-Smart Nutrition',
  Pig: 'Swill Savvy',
};
const FIBRE_SKILL: Record<string, SkillName> = {
  Feather: 'Featherweight',
  'Merino Wool': 'Merino Whisperer',
  Leather: 'Leathercraft Mastery',
};

// ─── Корм ─────────────────────────────────────────────────────────────────────

const levelsOf = (a: AnimalType) => ANIMAL_LEVELS[a] as unknown as Record<number, number>;
const foodXpOf = (a: AnimalType, level: number) =>
  (ANIMAL_FOOD_XP[a] as unknown as Record<number, Record<string, number>>)[level];

/** Любимый корм уровня (больше всего опыта, Omnifeed не считается). */
export function favouriteFood(a: AnimalType, level: number): string {
  const foods = foodXpOf(a, level);
  const best = Math.max(...Object.entries(foods).filter(([f]) => f !== 'Omnifeed').map(([, xp]) => xp));
  return Object.keys(foods).find((f) => f !== 'Omnifeed' && foods[f] === best)!;
}

/** Опыт за одну порцию корма с бустами (Chonky Feed, Pig Onesie, грязь — последней). */
export function xpPerFeed(a: AnimalType, level: number, food: string, b: AnimalBoosts): number {
  let xp = foodXpOf(a, level)[food] ?? 0;
  const chonky = rank(b, 'Chonky Feed');
  if (chonky) xp *= skillValue('Chonky Feed', chonky, 'xp');
  if (xp > 0 && has(b, 'Pig Onesie')) xp *= 1.05;
  if (a === 'Pig' && b.mud) xp *= MUD_XP_MULTIPLIER;
  return xp;
}

/** Сколько штук корма уходит на одну порцию (getBoostedFoodQuantity). */
export function foodPerFeed(a: AnimalType, b: AnimalBoosts): number {
  let q: number = REQUIRED_FOOD_QTY[a];
  for (const boost of ITEM_BOOSTS) {
    if (boost.kind === 'feed' && boost.animals.includes(a) && has(b, boost.name)) q *= boost.value;
  }
  const ef = rank(b, 'Efficient Feeding');
  if (ef) q *= skillValue('Efficient Feeding', ef);
  for (const animal of ANIMALS) {
    const s = DIET_SKILLS[animal];
    const r = rank(b, s);
    if (r) q *= skillValue(s, r, animal === a ? 'buff' : 'debuff');
  }
  const chonky = rank(b, 'Chonky Feed');
  if (chonky) q *= skillValue('Chonky Feed', chonky, 'feed');
  if (b.feedBuff === 'Honey Treat') q *= 0.75;
  return q;
}

export const isFreeFeeding = (a: AnimalType, b: AnimalBoosts) =>
  ITEM_BOOSTS.some((x) => x.kind === 'free' && x.animals.includes(a) && has(b, x.name));

export interface FoodPrice {
  /** Цена одной штуки корма (Flower) или null. */
  unit: number | null;
  /** Из чего собирается: ингредиенты на одну штуку корма. */
  ingredients: [string, number][];
  missing: string[];
}

/** Цена корма: сумма ингредиентов; помои — самый дешёвый по рынку вариант. */
export function foodPrice(food: string, prices: Record<string, number | null>): FoodPrice {
  const slop = (PIG_FEEDS as unknown as Record<string, { ingredients: Record<string, number> }>)[food];
  if (slop) {
    let best: FoodPrice | null = null;
    for (const [item, qty] of Object.entries(slop.ingredients)) {
      const p = prices[item];
      if (p == null) continue;
      if (!best || p * qty < best.unit!) best = { unit: p * qty, ingredients: [[item, qty]], missing: [] };
    }
    return best ?? { unit: null, ingredients: [], missing: Object.keys(slop.ingredients) };
  }
  const recipe = (ANIMAL_FOOD_RECIPES as unknown as Record<string, { ingredients: Record<string, number> }>)[food];
  const ingredients = Object.entries(recipe?.ingredients ?? {});
  const missing = ingredients.filter(([n]) => prices[n] == null).map(([n]) => n);
  return {
    unit: missing.length || !ingredients.length ? null : ingredients.reduce((s, [n, q]) => s + prices[n]! * q, 0),
    ingredients,
    missing,
  };
}

// ─── Поглаживания ─────────────────────────────────────────────────────────────

/**
 * Средний опыт за одно поглаживание на уровне: инструмент (Petting Hand / Brush /
 * Music Box) выпадает случайно по весам уровня, бусты — Baby Cow, Spa Sheep и
 * Heartwarming Instruments. Инструменты не тратятся.
 */
export function averageLoveXp(a: AnimalType, level: number, b: AnimalBoosts): { xp: number; chances: [string, number][] } {
  const weights = (LOVE_ITEM_CHANCES as unknown as Record<number, Record<string, number>>)[level];
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  // Новое животное (уровень 0) всегда просит Petting Hand.
  const chances: [string, number][] = total
    ? Object.entries(weights).map(([item, w]) => [item, w / total])
    : [['Petting Hand', 1]];
  const itemXp = LOVE_ITEM_XP as unknown as Record<string, number>;
  let add = 0;
  for (const boost of ITEM_BOOSTS) {
    if (boost.kind === 'love' && boost.animals.includes(a) && has(b, boost.name)) add += boost.value;
  }
  const mult = 1 + skillValue('Heartwarming Instruments', rank(b, 'Heartwarming Instruments'));
  const xp = chances.reduce((s, [item, p]) => s + p * (itemXp[item] + add) * mult, 0);
  return { xp, chances };
}

// ─── Сон и продукция ──────────────────────────────────────────────────────────

/** Сон в часах с бустами (getBoostedAwakeAt; святыни — пока стоят). */
export function sleepHours(a: AnimalType, b: AnimalBoosts): number {
  let h = ANIMAL_SLEEP_HOURS;
  for (const boost of ITEM_BOOSTS) {
    if (!boost.animals.includes(a) || !has(b, boost.name)) continue;
    if (boost.kind === 'sleepHours') h -= boost.value;
  }
  for (const boost of ITEM_BOOSTS) {
    if (!boost.animals.includes(a) || !has(b, boost.name)) continue;
    if (boost.kind === 'sleep') h *= boost.value;
  }
  const r = rank(b, 'Restless Animals');
  if (r) h *= skillValue('Restless Animals', r);
  if (b.feedBuff === 'Truffle Seasoning') h *= 0.5;
  for (const [shrine, v] of Object.entries(SHRINE_SLEEP)) {
    const boost = ITEM_BOOSTS.find((x) => x.name === shrine)!;
    if (boost.animals.includes(a) && has(b, shrine)) h *= v;
  }
  return h;
}

/** Сколько ресурса даёт сбор (getResourceDropAmount; Buckaroo — в среднем по шансу). */
export function boostedDrop(a: AnimalType, resource: string, base: number, b: AnimalBoosts): number {
  let amount = base;
  for (const boost of ITEM_BOOSTS) {
    if (boost.kind !== 'produce' || boost.name === 'Bale' || !boost.animals.includes(a) || !has(b, boost.name)) continue;
    if (boost.resource === resource) amount += boost.value;
  }
  if (resource === 'Egg' || resource === 'Wool' || resource === 'Milk') {
    const ah = rank(b, 'Abundant Harvest');
    if (ah) amount += skillValue('Abundant Harvest', ah);
  }
  const fibre = FIBRE_SKILL[resource];
  if (fibre) {
    const ff = rank(b, 'Fine Fibers');
    if (ff) amount += skillValue('Fine Fibers', ff);
    for (const s of Object.values(FIBRE_SKILL)) {
      const r = rank(b, s);
      if (r) amount += s === fibre ? skillValue(s, r, 'buff') : -skillValue(s, r, 'debuff');
    }
  }
  if (has(b, 'Bale')) {
    const baleFor = (a === 'Chicken' && resource === 'Egg') ||
      (b.baleEconomy && ((a === 'Sheep' && resource === 'Wool') || (a === 'Cow' && resource === 'Milk')));
    if (baleFor) {
      const db = rank(b, 'Double Bale');
      amount += 0.1 * (db ? skillValue('Double Bale', db) : 1);
    }
  }
  for (const name of ['Cattlegrim', 'Barn Manager']) if (has(b, name)) amount += ITEM_BOOSTS.find((x) => x.name === name)!.value;
  if (a === 'Pig' && resource === 'Truffle') amount *= 1 + skillValue('Truffle Yield', rank(b, 'Truffle Yield'));
  if (a === 'Pig' && resource === 'Pig Bristles') amount *= 1 + skillValue('Bristle Payout', rank(b, 'Bristle Payout'));
  // Бад — после множителей свиньи, затем Buckaroo (в среднем) и Salt Lick.
  amount += budBoost(resource, b);
  if (b.buckarooChance > 0) amount *= 1 + Math.min(b.buckarooChance, 100) / 100;
  if (b.feedBuff === 'Salt Lick') amount *= 1.05;
  return Math.round(amount * 100) / 100;
}

/** Сколько сборов держится лакомство (getAnimalHarvests) или грязь (getMudHarvests); Vibraphone ×2. */
export function buffHarvests(item: FeedBuff | 'Mud', b: AnimalBoosts): number {
  const base = item === 'Mud' ? MUD_HARVESTS : item === 'Truffle Seasoning' ? 1 : FEED_BUFF_HARVESTS;
  return base * (has(b, 'Vibraphone') ? 2 : 1);
}

// ─── Цикл уровня ──────────────────────────────────────────────────────────────

export interface CycleRow {
  /** Уровень, на котором животное ест (цикл ведёт к level + 1; на 15-м — круг 15-го). */
  level: number;
  produceLevel: number;
  xpNeeded: number;
  loveXp: number;
  food: string;
  xpPerFeed: number;
  /** Порций в среднем (дробно: лишний опыт переходит в следующий цикл). */
  feeds: number;
  foodUnits: number;
  free: boolean;
  feedCost: number | null;
  foodUnitPrice: FoodPrice;
  produce: { name: string; base: number; amount: number; price: number | null }[];
  produceValue: number | null;
  sleepHours: number;
}

/** Omnifeed едят все, кроме свиней. */
export const canEatOmnifeed = (a: AnimalType) => a !== 'Pig';

/**
 * prices — floor во Flower; gemFlower — цена 1 Gem во Flower (для Omnifeed).
 */
export function cycleRow(
  a: AnimalType,
  level: number,
  b: AnimalBoosts,
  prices: Record<string, number | null>,
  gemFlower: number | null = null,
): CycleRow {
  const lv = levelsOf(a);
  const isMax = level >= MAX_LEVEL;
  const xpNeeded = isMax ? lv[MAX_LEVEL] - lv[MAX_LEVEL - 1] : lv[level + 1] - lv[level];
  const produceLevel = isMax ? MAX_LEVEL : level + 1;
  const loveXp = b.loves * averageLoveXp(a, level, b).xp;
  const omni = b.omnifeed && canEatOmnifeed(a);
  const food = omni ? 'Omnifeed' : favouriteFood(a, level);
  const perFeed = xpPerFeed(a, level, food, b);
  const free = isFreeFeeding(a, b);
  const feeds = Math.max(0, xpNeeded - loveXp) / perFeed;
  const foodUnits = free ? 0 : feeds * foodPerFeed(a, b);
  const fp = foodPrice(food, omni ? { ...prices, Gem: gemFlower } : prices);
  const feedCost = free ? 0 : fp.unit == null ? null : fp.unit * foodUnits;
  const dropTable = (ANIMAL_DROPS[a] as unknown as Record<number, Record<string, number>>)[produceLevel];
  const produce = Object.entries(dropTable).map(([name, base]) => ({
    name,
    base,
    amount: boostedDrop(a, name, base, b),
    price: prices[name] ?? null,
  }));
  const produceValue = produce.some((p) => p.price == null) ? null : produce.reduce((s, p) => s + p.amount * p.price!, 0);
  return {
    level,
    produceLevel,
    xpNeeded,
    loveXp,
    food,
    xpPerFeed: perFeed,
    feeds,
    foodUnits,
    free,
    feedCost,
    foodUnitPrice: fp,
    produce,
    produceValue,
    sleepHours: sleepHours(a, b),
  };
}

/** Щетина за сдачу свиньи уровня (getPigBristles: флэт-бусты, Bristle Payout, Salt Lick). */
export function pigBristles(level: number, b: AnimalBoosts): number {
  const base = (PIG_BRISTLES_PER_LEVEL as unknown as Record<number, number>)[level] ?? 0;
  return base ? boostedDrop('Pig', 'Pig Bristles', base, b) : 0;
}

export { MUD_PER_APPLICATION };

/** Все предметы, чьи цены нужны разделу (корм, ингредиенты помоев, продукция). */
export const ANIMAL_PRICE_NAMES: string[] = [
  ...new Set([
    ...Object.values(ANIMAL_FOOD_RECIPES as unknown as Record<string, { ingredients: Record<string, number> }>).flatMap((f) =>
      Object.keys(f.ingredients),
    ),
    ...Object.values(PIG_FEEDS as unknown as Record<string, { ingredients: Record<string, number> }>).flatMap((f) =>
      Object.keys(f.ingredients),
    ),
    ...Object.values(ANIMAL_DROPS as unknown as Record<string, Record<number, Record<string, number>>>).flatMap((byLevel) =>
      Object.values(byLevel).flatMap((d) => Object.keys(d)),
    ),
    'Pig Bristles',
  ]),
].filter((n) => n !== 'Gem');
