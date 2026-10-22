/**
 * Компостеры (Compost Bin, Turbo Composter, Premium Composter): что нужно для
 * запуска, что выходит и сколько это стоит.
 *
 * Базовые числа (рецепты по сезонам, время, выход, диапазон червей, стоимость
 * построек) — из composterData.generated.ts (scripts/sync-composter-data.ts).
 * Формулы бустов повторяют код игры, значения рангов навыков — из skills.ts:
 *   events/landExpansion/startComposter.ts   getCompostAmount (компост), getReadyAt (время),
 *   events/landExpansion/composterBait.ts    getWormAdjustment (черви),
 *   events/landExpansion/accelerateComposter.ts getSpeedUpCost / getSpeedUpTime (ускорение).
 * Это цена по рыночным ценам ингредиентов; у самого компоста и червей
 * рыночной цены нет, поэтому показываем себестоимость.
 */
import { COMPOSTERS, COMPOST_RECIPES, COMPOSTER_BUILDINGS, WORM_AMOUNTS } from './composterData.generated';
import { SKILLS } from './skills';
import type { SkillRank } from './toolCosts';
import type { SeasonName } from './baitCosts';

export const COMPOSTER_NAMES = ['Compost Bin', 'Turbo Composter', 'Premium Composter'] as const;
export type ComposterName = (typeof COMPOSTER_NAMES)[number];

export const COMPOSTER_ICONS: Record<ComposterName, string> = {
  'Compost Bin': '/sprites/composters/compost_bin.webp',
  'Turbo Composter': '/sprites/composters/turbo_composter.webp',
  'Premium Composter': '/sprites/composters/premium_composter.webp',
};

export const COMPOST_ICONS: Record<string, string> = {
  'Sprout Mix': '/sprites/composters/sprout_mix.png',
  'Fruitful Blend': '/sprites/composters/fruitful_blend.png',
  'Rapid Root': '/sprites/composters/rapid_root.png',
};

/** Что делает компост (описания в игре). */
export const COMPOST_EFFECTS: Record<string, string> = {
  'Sprout Mix': '+0,2 к урожаю с грядок',
  'Fruitful Blend': '+0,1 к урожаю плодовых деревьев',
  'Rapid Root': 'время роста на грядках −50%',
};

export const WORM_ICONS: Record<string, string> = {
  Earthworm: '/sprites/composters/earthworm.png',
  Grub: '/sprites/composters/grub.png',
  'Red Wiggler': '/sprites/composters/red_wiggler.png',
};

export const WORM_EFFECTS: Record<string, string> = {
  Earthworm: 'наживка для обычной рыбы',
  Grub: 'наживка для продвинутой рыбы',
  'Red Wiggler': 'наживка для экспертной рыбы',
};

export interface ComposterBoosts {
  /** Одежда: +1 компост за запуск. */
  turdTopper: boolean;
  /** Одежда: +1 червь за сбор. */
  bucketOWorms: boolean;
  /** Одежда: +1 червь за сбор. */
  sawFish: boolean;
  /** Коллекционный: +1 червь за сбор. */
  deepSeaSlug: boolean;
  /** Коллекционный: время готовки ×0.9. */
  soilKrabby: boolean;
  /** Навыки (ранг 0 — не выучен). */
  efficientBin: SkillRank; // +компост, только Compost Bin
  turboCharged: SkillRank; // +компост, только Turbo Composter
  premiumWorms: SkillRank; // +компост, только Premium Composter
  compostingRevamp: SkillRank; // +компост и −черви
  wormyTreat: SkillRank; // +черви
  compostingOverhaul: SkillRank; // +черви
  swiftDecomposer: SkillRank; // время ×0.9/0.875/0.85
  featheryBusiness: SkillRank; // ускорение перьями вместо яиц, множитель расхода
  compostingBonanza: SkillRank; // ускорение: расход ×2, зато срезает больше времени
}

export const NO_COMPOSTER_BOOSTS: ComposterBoosts = {
  turdTopper: false,
  bucketOWorms: false,
  sawFish: false,
  deepSeaSlug: false,
  soilKrabby: false,
  efficientBin: 0,
  turboCharged: 0,
  premiumWorms: 0,
  compostingRevamp: 0,
  wormyTreat: 0,
  compostingOverhaul: 0,
  swiftDecomposer: 0,
  featheryBusiness: 0,
  compostingBonanza: 0,
};

type Effect = Record<string, unknown>;
const effectOf = (skill: string): Effect =>
  (SKILLS.find((s) => s.name === skill)?.upgrade?.effect ?? {}) as Effect;

/** Значения рангов навыка из skills.ts: поле ranks (или buff/debuff). */
export function rankValues(skill: string, field = 'ranks'): number[] {
  const v = effectOf(skill)[field];
  return Array.isArray(v) ? (v as number[]) : [];
}
const at = (skill: string, rank: SkillRank, field = 'ranks'): number =>
  rank === 0 ? 0 : (rankValues(skill, field)[rank - 1] ?? 0);

/** Сколько компоста выдаст запуск. */
export function compostAmount(name: ComposterName, b: ComposterBoosts): number {
  let amount = COMPOSTERS[name].produceAmount;
  if (name === 'Compost Bin') amount += at('Efficient Bin', b.efficientBin);
  if (name === 'Turbo Composter') amount += at('Turbo Charged', b.turboCharged);
  if (name === 'Premium Composter') amount += at('Premium Worms', b.premiumWorms);
  amount += at('Composting Revamp', b.compostingRevamp, 'buff');
  if (b.turdTopper) amount += 1;
  return Math.max(0, amount);
}

export interface WormStats {
  worm: string;
  min: number;
  max: number;
  /** Среднее число червей за сбор. */
  avg: number;
}

/** Сколько червей выпадет при сборе: случайный выбор из списка игры плюс поправка бустов. */
export function wormStats(name: ComposterName, b: ComposterBoosts): WormStats {
  const worm = COMPOSTERS[name].worm;
  const delta =
    (b.bucketOWorms ? 1 : 0) +
    at('Wormy Treat', b.wormyTreat) +
    at('Composting Overhaul', b.compostingOverhaul) -
    at('Composting Revamp', b.compostingRevamp, 'debuff') +
    (b.sawFish ? 1 : 0) +
    (b.deepSeaSlug ? 1 : 0);
  const values = WORM_AMOUNTS[worm].map((a) => Math.max(0, a + delta));
  return {
    worm,
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((s, v) => s + v, 0) / values.length,
  };
}

/** Часы до готовности запуска. */
export function composterHours(name: ComposterName, b: ComposterBoosts): number {
  let hours = COMPOSTERS[name].hours;
  if (b.soilKrabby) hours *= 0.9;
  if (b.swiftDecomposer > 0) hours *= at('Swift Decomposer', b.swiftDecomposer);
  return hours;
}

export interface SpeedUp {
  /** Яйца, а с Feathery Business — перья. */
  item: 'Egg' | 'Feather';
  amount: number;
  /** На сколько часов сокращается готовка. */
  hours: number;
}

export function speedUp(name: ComposterName, b: ComposterBoosts): SpeedUp {
  const base = COMPOSTERS[name];
  let amount = base.speedUpAmount;
  if (b.compostingBonanza > 0) amount *= 2;
  if (b.featheryBusiness > 0) amount *= at('Feathery Business', b.featheryBusiness);
  const bonusHours = b.compostingBonanza > 0 ? at('Composting Bonanza', b.compostingBonanza) / 3_600_000 : 0;
  return {
    item: b.featheryBusiness > 0 ? 'Feather' : 'Egg',
    amount,
    hours: base.speedUpHours + bonusHours,
  };
}

export interface RunCost {
  composter: ComposterName;
  season: SeasonName;
  ingredients: { name: string; amount: number; unit: number | null; total: number | null }[];
  /** Цена запуска во Flower; null — у какого-то ингредиента нет цены. */
  total: number | null;
  /** Если считать, что весь запуск ради компоста: цена одной штуки. */
  perCompost: number | null;
  /** Если считать, что весь запуск ради червя: цена одного червя; null — червей 0. */
  perWorm: number | null;
}

export function runCost(
  name: ComposterName,
  season: SeasonName,
  prices: Record<string, number | null>,
  b: ComposterBoosts,
): RunCost {
  const ingredients = Object.entries(COMPOST_RECIPES[name][season]).map(([item, amount]) => {
    const unit = prices[item] ?? null;
    return { name: item, amount, unit, total: unit == null ? null : unit * amount };
  });
  const total = ingredients.some((i) => i.total == null) ? null : ingredients.reduce((s, i) => s + (i.total ?? 0), 0);
  const compost = compostAmount(name, b);
  const worms = wormStats(name, b).avg;
  return {
    composter: name,
    season,
    ingredients,
    total,
    perCompost: total != null && compost > 0 ? total / compost : null,
    perWorm: total != null && worms > 0 ? total / worms : null,
  };
}

export interface BuildingCost {
  level: number;
  hours: number;
  coins: number;
  ingredients: { name: string; amount: number }[];
  /** Ресурсы постройки во Flower; null — нет цен. */
  flower: number | null;
}

export function buildingCost(name: ComposterName, prices: Record<string, number | null>): BuildingCost {
  const b = COMPOSTER_BUILDINGS[name];
  const ingredients = Object.entries(b.ingredients).map(([n, amount]) => ({ name: n, amount }));
  const known = ingredients.every((i) => prices[i.name] != null);
  return {
    level: b.level,
    hours: b.hours,
    coins: b.coins,
    ingredients,
    flower: known ? ingredients.reduce((s, i) => s + prices[i.name]! * i.amount, 0) : null,
  };
}

/** Названия предметов, чьи цены нужны: рецепты, ускорение и постройки. */
export const COMPOSTER_PRICE_NAMES: string[] = [
  ...new Set([
    ...COMPOSTER_NAMES.flatMap((n) =>
      Object.values(COMPOST_RECIPES[n]).flatMap((recipe) => Object.keys(recipe)),
    ),
    ...COMPOSTER_NAMES.flatMap((n) => Object.keys(COMPOSTER_BUILDINGS[n].ingredients)),
    'Egg',
    'Feather',
  ]),
];
