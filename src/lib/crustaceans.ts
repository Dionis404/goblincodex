/**
 * Раки (Crab Pot и Mariner Pot): кто попадётся, что стоит установка и сколько
 * занимает. Результат в игре детерминирован — ловушка + приманка → ровно одно
 * существо (caughtCrustacean в crustaceans.ts), случайности нет.
 *
 * Цифры берутся из fishData.generated.ts (scripts/sync-fish-data.ts):
 * расход приманки, время, уровень, таблица «ловушка + приманка → ракообразное».
 * Бусты — вручную по коду игры (константы ниже), как и в toolCosts.ts:
 *   events/landExpansion/placeWaterTrap.ts (getWaterTrapMilliseconds, расход
 *   ловушки и приманки, Royal Crab Pot),
 *   events/landExpansion/collectWaterTrap.ts (getCrustaceanAmount).
 */
import { CRUSTACEAN_LOOKUP, WATER_TRAPS } from './fishData.generated';
import { NO_TOOL_BOOSTS, TOOLS, resourcesFlowerValue, toolIngredients, toolUnitPrice } from './toolCosts';
import { coinsToFlower } from './coinRate';

export type PotName = 'Crab Pot' | 'Mariner Pot';
export const POTS: PotName[] = ['Crab Pot', 'Mariner Pot'];

export const POT_ICONS: Record<PotName, string> = {
  'Crab Pot': '/sprites/tools/crab_pot.webp',
  'Mariner Pot': '/sprites/tools/mariner_pot.webp',
};

/** Сколько ловушек можно поставить на острове: по числу мест (TRAP_POSITIONS в crustaceans.ts). */
export const TRAP_SPOTS_BY_ISLAND: { island: string; spots: number }[] = [
  { island: 'Базовый', spots: 1 },
  { island: 'Лепестковый рай', spots: 2 },
  { island: 'Пустыня', spots: 3 },
  { island: 'Вулкан и выше', spots: 4 },
];

export const CHUM_ICONS: Record<string, string> = {
  'Heart leaf': '/sprites/resources/heartleaf.webp',
  Ribbon: '/sprites/resources/ribbon.webp',
  'Wild Grass': '/sprites/resources/wild_grass.webp',
  'Frost Pebble': '/sprites/resources/frost_pebble.webp',
  Grape: '/sprites/greenhouse/grape.webp',
  Rice: '/sprites/greenhouse/rice.webp',
  Crimstone: '/sprites/resources/crimstone.png',
  Moonfur: '/sprites/resources/moonfur.webp',
  'Fish Stick': '/sprites/processedFoods/fish_stick.webp',
  'Fish Oil': '/sprites/processedFoods/fish_oil.webp',
  'Crab Stick': '/sprites/processedFoods/crab_stick.webp',
  'Chewed Bone': '/sprites/resources/chewed_bone.webp',
  Ruffroot: '/sprites/resources/ruffroot.webp',
  Dewberry: '/sprites/resources/dewberry.webp',
  Duskberry: '/sprites/fruit/duskberry/duskberry.webp',
  Lunara: '/sprites/fruit/lunara/lunara.webp',
};

export function crustaceanIcon(name: string): string {
  return `/sprites/crustaceans/${name.toLowerCase().replace(/ /g, '_')}.webp`;
}

/** Названия приманок для запроса цен: все, что встречается хотя бы в одной ловушке. */
export const CHUM_PRICE_NAMES = [...new Set(POTS.flatMap((p) => Object.keys(WATER_TRAPS[p].chums)))];

export interface CrustaceanBoosts {
  /** Royal Crab Pot (коллекционный): ловушка при установке не тратится. */
  royalCrabPot: boolean;
  /** Бейдж Artist: −10% монет на ловушку (как у всех инструментов). */
  artist: boolean;
  /** Speed Trap: время ×0.8. */
  speedTrap: boolean;
  /** Crystal Altar (монумент): время ×0.95. */
  crystalAltar: boolean;
  /** Crab House: +2 существа за каждый сбор. */
  crabHouse: boolean;
  /** Pistol Shrimp (одежда): 20% шанс +1 существа за сбор, в среднем +0.2. */
  pistolShrimp: boolean;
}

export const NO_CRUSTACEAN_BOOSTS: CrustaceanBoosts = {
  royalCrabPot: false,
  artist: false,
  speedTrap: false,
  crystalAltar: false,
  crabHouse: false,
  pistolShrimp: false,
};

/** Среднее число существ за один сбор. */
export function expectedYield(b: CrustaceanBoosts): number {
  return 1 + (b.crabHouse ? 2 : 0) + (b.pistolShrimp ? 0.2 : 0);
}

/** Часы до готовности ловушки. */
export function readyHours(pot: PotName, b: CrustaceanBoosts): number {
  return WATER_TRAPS[pot].readyHours * (b.speedTrap ? 0.8 : 1) * (b.crystalAltar ? 0.95 : 1);
}

export interface PotCost {
  /** Ловушка в монетах (с Artist) — 0 с Royal Crab Pot. */
  coins: number;
  /** Ресурсы ловушки во Flower; null — цен нет. */
  resourcesFlower: number | null;
  /** Монеты по рыночному курсу; null — курса нет. */
  coinsFlower: number | null;
  /** Итого ловушка во Flower (то, что известно). */
  total: number;
}

/** Стоимость одной установки ловушки: монеты по курсу + ресурсы по floor. */
export function potCost(
  pot: PotName,
  prices: Record<string, number | null>,
  coinRate: number | null | undefined,
  b: CrustaceanBoosts,
): PotCost {
  if (b.royalCrabPot) return { coins: 0, resourcesFlower: 0, coinsFlower: 0, total: 0 };
  const tool = TOOLS.find((t) => t.name === pot)!;
  const coins = toolUnitPrice(tool, { ...NO_TOOL_BOOSTS, artist: b.artist });
  const { value, missing } = resourcesFlowerValue(toolIngredients(tool, NO_TOOL_BOOSTS), prices);
  const resourcesFlower = missing > 0 ? null : value;
  const coinsFlower = coinRate ? coinsToFlower(coins, coinRate) : null;
  return { coins, resourcesFlower, coinsFlower, total: (resourcesFlower ?? 0) + (coinsFlower ?? 0) };
}

export interface CrustaceanRow {
  crustacean: string;
  /** null — без приманки. */
  chum: { name: string; amount: number } | null;
  /** Стоимость приманки во Flower; null — у приманки нет рыночной цены. */
  chumFlower: number | null;
  /** Установка целиком: ловушка + приманка (приманка без цены не входит). */
  total: number;
  /** То же на одно существо с учётом выхода за сбор. */
  perUnit: number;
}

/** Строки таблицы ловушки в порядке игры. */
export function crustaceanRows(
  pot: PotName,
  prices: Record<string, number | null>,
  coinRate: number | null | undefined,
  b: CrustaceanBoosts,
): CrustaceanRow[] {
  const cost = potCost(pot, prices, coinRate, b);
  const amounts = WATER_TRAPS[pot].chums;
  const yieldPerCollect = expectedYield(b);
  return Object.entries(CRUSTACEAN_LOOKUP[pot]).map(([chumName, crustacean]) => {
    const chum = chumName === 'none' ? null : { name: chumName, amount: amounts[chumName] };
    const price = chum ? prices[chum.name] : null;
    const chumFlower = chum ? (price != null ? price * chum.amount : null) : 0;
    const total = cost.total + (chumFlower ?? 0);
    return { crustacean, chum, chumFlower, total, perUnit: total / yieldPerCollect };
  });
}
