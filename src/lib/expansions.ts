/**
 * Калькулятор стоимости расширений острова Sunflower Land — чистая логика.
 *
 * Полная цепочка прогресса: Базовый остров → Лепестковый рай → Пустыня → Вулкан →
 * Возвышение (Ascension). При апгрейде на новый остров счётчик "Basic Land"
 * в инвентаре СБРАСЫВАЕТСЯ (см. upgradeFarm.ts:
 * `game.inventory["Basic Land"] = new Decimal(setup.startingExpansions)`),
 * т.е. каждый остров — отдельная нумерация расширений с нуля:
 * ISLAND_SETUP.startingExpansions = { spring: 4, desert: 4, volcano: 5, swamp: 30 }.
 * Первая ПОКУПКА на новом острове — это стартовое число + 1.
 *
 * Актуальные потолки (ISLAND_MAX_EXPANSION в
 * features/game/expansion/lib/expansionRequirements.ts): basic 9, spring 16,
 * desert 25, volcano 30. Таблицы дальше этих чисел (например spring до 20)
 * оставлены в игре только для легаси-аккаунтов и сюда не включены.
 *
 * Данные по каждому расширению сверены построчно с
 * features/game/types/expansions.ts (EXPANSION_REQUIREMENTS), формула
 * Возвышения — с features/game/expansion/lib/ascension.ts
 * (`getAscensionExpansionRequirements`).
 */

export type ExpansionResource =
  | 'Wood'
  | 'Stone'
  | 'Iron'
  | 'Gold'
  | 'Crimstone'
  | 'Oil'
  | 'Obsidian'
  | 'Gem';

export const RESOURCE_LABELS: Record<ExpansionResource, string> = {
  Wood: 'Дерево',
  Stone: 'Камень',
  Iron: 'Железо',
  Gold: 'Золото',
  Crimstone: 'Кримстоун',
  Oil: 'Нефть',
  Obsidian: 'Обсидиан',
  Gem: 'Гемы',
};

export const RESOURCE_ORDER: ExpansionResource[] = [
  'Wood',
  'Stone',
  'Iron',
  'Gold',
  'Crimstone',
  'Oil',
  'Obsidian',
  'Gem',
];

export interface StageCost {
  resources: Partial<Record<ExpansionResource, number>>;
  coins: number;
  seconds: number;
  level: number;
}

export type IslandGroup = 'basic' | 'spring' | 'desert' | 'volcano' | 'ascension';

export const ISLAND_GROUP_LABELS: Record<IslandGroup, string> = {
  basic: 'Базовый остров',
  spring: 'Лепестковый рай',
  desert: 'Пустыня',
  volcano: 'Вулкан',
  ascension: 'Возвышение',
};

// LAND_GEM_RATIO из исходников игры — множитель для гемов.
const LAND_GEM_RATIO = 15;

/** EXPANSION_REQUIREMENTS.basic[4..9]. */
const BASIC_REQUIREMENTS: Record<number, StageCost> = {
  4: { resources: { Wood: 3 }, coins: 0, seconds: 5, level: 1 },
  5: { resources: { Wood: 5 }, coins: 0.25, seconds: 5, level: 1 },
  6: { resources: { Stone: 1 }, coins: 60, seconds: 60, level: 2 },
  7: { resources: { Stone: 5, Iron: 1 }, coins: 100, seconds: 30 * 60, level: 5 },
  8: { resources: { Iron: 3, Gold: 1 }, coins: 200, seconds: 4 * 60 * 60, level: 8 },
  9: { resources: { Wood: 100, Stone: 40, Iron: 5 }, coins: 300, seconds: 12 * 60 * 60, level: 11 },
};

/** EXPANSION_REQUIREMENTS.spring[5..16] (актуальный потолок острова — 16). */
const SPRING_REQUIREMENTS: Record<number, StageCost> = {
  5: { resources: { Wood: 20 }, coins: 100, seconds: 60, level: 11 },
  6: { resources: { Wood: 10, Stone: 5, Gold: 2 }, coins: 200, seconds: 5 * 60, level: 13 },
  7: { resources: { Wood: 30, Stone: 20, Iron: 5, Gem: LAND_GEM_RATIO }, coins: 300, seconds: 30 * 60, level: 16 },
  8: { resources: { Wood: 20, Crimstone: 1, Gem: LAND_GEM_RATIO }, coins: 400, seconds: 2 * 60 * 60, level: 20 },
  9: { resources: { Wood: 50, Gold: 5, Gem: LAND_GEM_RATIO }, coins: 500, seconds: 2 * 60 * 60, level: 23 },
  10: { resources: { Stone: 10, Crimstone: 3, Gem: LAND_GEM_RATIO }, coins: 500, seconds: 4 * 60 * 60, level: 25 },
  11: { resources: { Wood: 100, Stone: 25, Gold: 5, Crimstone: 1, Gem: LAND_GEM_RATIO }, coins: 500, seconds: 8 * 60 * 60, level: 27 },
  12: { resources: { Wood: 50, Iron: 5, Crimstone: 3, Gem: LAND_GEM_RATIO * 2 }, coins: 500, seconds: 12 * 60 * 60, level: 29 },
  13: { resources: { Wood: 50, Stone: 25, Iron: 10, Gold: 10, Gem: LAND_GEM_RATIO * 2 }, coins: 500, seconds: 12 * 60 * 60, level: 32 },
  14: { resources: { Wood: 100, Stone: 10, Crimstone: 5, Gem: LAND_GEM_RATIO * 2 }, coins: 500, seconds: 24 * 60 * 60, level: 36 },
  15: { resources: { Wood: 150, Stone: 10, Iron: 10, Gold: 5, Crimstone: 5, Gem: LAND_GEM_RATIO * 2 }, coins: 500, seconds: 24 * 60 * 60, level: 40 },
  16: { resources: { Wood: 100, Stone: 10, Gold: 5, Crimstone: 8, Gem: LAND_GEM_RATIO * 2 }, coins: 500, seconds: 24 * 60 * 60, level: 43 },
};

/** EXPANSION_REQUIREMENTS.desert[5..25] (актуальный потолок острова — 25). */
const DESERT_REQUIREMENTS: Record<number, StageCost> = {
  5: { resources: { Wood: 50, Stone: 10, Iron: 5, Gold: 5 }, coins: 500, seconds: 60, level: 40 },
  6: { resources: { Wood: 100, Stone: 20, Iron: 10, Gold: 5 }, coins: 500, seconds: 5 * 60, level: 40 },
  7: { resources: { Wood: 150, Stone: 20, Iron: 10, Gold: 5, Gem: LAND_GEM_RATIO }, coins: 500, seconds: 30 * 60, level: 41 },
  8: { resources: { Wood: 150, Stone: 10, Iron: 5, Gold: 5, Crimstone: 3, Oil: 5, Gem: LAND_GEM_RATIO * 2 }, coins: 500, seconds: 2 * 60 * 60, level: 42 },
  9: { resources: { Wood: 50, Stone: 5, Iron: 5, Gold: 5, Crimstone: 6, Oil: 5, Gem: LAND_GEM_RATIO * 2 }, coins: 500, seconds: 2 * 60 * 60, level: 43 },
  10: { resources: { Wood: 100, Stone: 50, Iron: 10, Gold: 5, Crimstone: 12, Oil: 10, Gem: LAND_GEM_RATIO * 3 }, coins: 384, seconds: 8 * 60 * 60, level: 44 },
  11: { resources: { Wood: 150, Stone: 75, Iron: 10, Gold: 5, Crimstone: 15, Oil: 30, Gem: LAND_GEM_RATIO * 3 }, coins: 768, seconds: 12 * 60 * 60, level: 45 },
  12: { resources: { Wood: 100, Stone: 100, Iron: 5, Gold: 10, Crimstone: 18, Oil: 30, Gem: LAND_GEM_RATIO * 3 }, coins: 1536, seconds: 12 * 60 * 60, level: 47 },
  13: { resources: { Wood: 200, Stone: 50, Iron: 15, Gold: 10, Crimstone: 21, Oil: 40, Gem: LAND_GEM_RATIO * 3 }, coins: 3072, seconds: 24 * 60 * 60, level: 50 },
  14: { resources: { Wood: 200, Stone: 100, Iron: 15, Gold: 10, Crimstone: 24, Oil: 50, Gem: LAND_GEM_RATIO * 3 }, coins: 3840, seconds: 24 * 60 * 60, level: 53 },
  15: { resources: { Wood: 300, Stone: 50, Iron: 20, Gold: 10, Crimstone: 27, Oil: 75, Gem: LAND_GEM_RATIO * 3 }, coins: 3840, seconds: 24 * 60 * 60, level: 56 },
  16: { resources: { Wood: 250, Stone: 125, Iron: 15, Gold: 15, Crimstone: 30, Oil: 100, Gem: LAND_GEM_RATIO * 4 }, coins: 3840, seconds: 36 * 60 * 60, level: 58 },
  17: { resources: { Wood: 350, Stone: 75, Iron: 20, Gold: 10, Crimstone: 33, Oil: 125, Gem: LAND_GEM_RATIO * 4 }, coins: 5760, seconds: 36 * 60 * 60, level: 60 },
  18: { resources: { Wood: 400, Stone: 125, Iron: 25, Gold: 15, Crimstone: 36, Oil: 150, Gem: LAND_GEM_RATIO * 5 }, coins: 5760, seconds: 36 * 60 * 60, level: 63 },
  19: { resources: { Wood: 450, Stone: 150, Iron: 30, Gold: 20, Crimstone: 39, Oil: 200, Gem: LAND_GEM_RATIO * 4 }, coins: 7680, seconds: 36 * 60 * 60, level: 65 },
  20: { resources: { Wood: 525, Stone: 200, Iron: 35, Gold: 30, Crimstone: 42, Oil: 250, Gem: LAND_GEM_RATIO * 4 }, coins: 7680, seconds: 48 * 60 * 60, level: 68 },
  21: { resources: { Wood: 550, Stone: 150, Iron: 30, Gold: 25, Crimstone: 45, Oil: 350, Gem: LAND_GEM_RATIO * 4 }, coins: 9600, seconds: 48 * 60 * 60, level: 70 },
  22: { resources: { Wood: 600, Stone: 200, Iron: 35, Gold: 30, Crimstone: 48, Oil: 450, Gem: LAND_GEM_RATIO * 5 }, coins: 9600, seconds: 48 * 60 * 60, level: 72 },
  23: { resources: { Wood: 650, Stone: 250, Iron: 40, Gold: 35, Crimstone: 51, Oil: 500, Gem: LAND_GEM_RATIO * 5 }, coins: 9600, seconds: 60 * 60 * 60, level: 73 },
  24: { resources: { Wood: 700, Stone: 300, Iron: 50, Gold: 45, Crimstone: 54, Oil: 550, Gem: LAND_GEM_RATIO * 5 }, coins: 11520, seconds: 60 * 60 * 60, level: 74 },
  25: { resources: { Wood: 750, Stone: 350, Iron: 50, Gold: 50, Crimstone: 60, Oil: 650, Gem: LAND_GEM_RATIO * 5 }, coins: 13440, seconds: 60 * 60 * 60, level: 75 },
};

/** EXPANSION_REQUIREMENTS.volcano[6..30] (потолок острова — 30, он же "полный Вулкан"). */
const VOLCANO_REQUIREMENTS: Record<number, StageCost> = {
  6: { resources: { Wood: 100, Stone: 50, Iron: 30, Gold: 10 }, coins: 500, seconds: 10, level: 70 },
  7: { resources: { Wood: 200, Stone: 75, Iron: 25, Gold: 15, Crimstone: 4, Oil: 30, Gem: LAND_GEM_RATIO * 2 }, coins: 384, seconds: 5 * 60, level: 72 },
  8: { resources: { Wood: 300, Stone: 100, Iron: 40, Gold: 20, Crimstone: 8, Oil: 60, Gem: LAND_GEM_RATIO * 2 }, coins: 768, seconds: 0.5 * 60 * 60, level: 74 },
  9: { resources: { Wood: 400, Stone: 150, Iron: 35, Gold: 25, Crimstone: 12, Oil: 90, Gem: LAND_GEM_RATIO * 4 }, coins: 1152, seconds: 1 * 60 * 60, level: 76 },
  10: { resources: { Wood: 450, Stone: 200, Iron: 30, Gold: 20, Crimstone: 16, Oil: 120, Obsidian: 1, Gem: LAND_GEM_RATIO * 4 }, coins: 1920, seconds: 2 * 60 * 60, level: 78 },
  11: { resources: { Wood: 500, Stone: 175, Iron: 30, Gold: 30, Crimstone: 20, Oil: 100, Gem: LAND_GEM_RATIO * 6 }, coins: 3000, seconds: 4 * 60 * 60, level: 80 },
  12: { resources: { Wood: 650, Stone: 225, Iron: 25, Gold: 25, Crimstone: 24, Oil: 100, Obsidian: 2, Gem: LAND_GEM_RATIO * 10 }, coins: 3840, seconds: 8 * 60 * 60, level: 82 },
  13: { resources: { Wood: 550, Stone: 200, Iron: 40, Gold: 30, Crimstone: 28, Oil: 100, Gem: LAND_GEM_RATIO * 10 }, coins: 4800, seconds: 12 * 60 * 60, level: 84 },
  14: { resources: { Wood: 700, Stone: 250, Iron: 35, Gold: 35, Crimstone: 32, Oil: 100, Obsidian: 1, Gem: LAND_GEM_RATIO * 10 }, coins: 5760, seconds: 12 * 60 * 60, level: 86 },
  15: { resources: { Wood: 650, Stone: 200, Iron: 30, Gold: 40, Crimstone: 36, Oil: 200, Obsidian: 2, Gem: LAND_GEM_RATIO * 10 }, coins: 6720, seconds: 24 * 60 * 60, level: 88 },
  16: { resources: { Wood: 750, Stone: 250, Iron: 40, Gold: 30, Crimstone: 40, Oil: 200, Obsidian: 4, Gem: LAND_GEM_RATIO * 10 }, coins: 7680, seconds: 24 * 60 * 60, level: 90 },
  17: { resources: { Wood: 700, Stone: 200, Iron: 35, Gold: 35, Crimstone: 44, Oil: 200, Obsidian: 4, Gem: LAND_GEM_RATIO * 10 }, coins: 9600, seconds: 24 * 60 * 60, level: 92 },
  18: { resources: { Wood: 800, Stone: 300, Iron: 45, Gold: 45, Crimstone: 48, Oil: 200, Obsidian: 6, Gem: LAND_GEM_RATIO * 12 }, coins: 12000, seconds: 36 * 60 * 60, level: 94 },
  19: { resources: { Wood: 750, Stone: 250, Iron: 40, Gold: 40, Crimstone: 52, Oil: 200, Obsidian: 6, Gem: LAND_GEM_RATIO * 12 }, coins: 15360, seconds: 36 * 60 * 60, level: 96 },
  20: { resources: { Wood: 850, Stone: 300, Iron: 45, Gold: 30, Crimstone: 56, Oil: 200, Obsidian: 8, Gem: LAND_GEM_RATIO * 12 }, coins: 18000, seconds: 48 * 60 * 60, level: 98 },
  21: { resources: { Wood: 900, Stone: 325, Iron: 50, Gold: 35, Crimstone: 60, Oil: 200, Obsidian: 8, Gem: LAND_GEM_RATIO * 12 }, coins: 21600, seconds: 48 * 60 * 60, level: 100 },
  22: { resources: { Wood: 800, Stone: 300, Iron: 45, Gold: 30, Crimstone: 64, Oil: 200, Obsidian: 10, Gem: LAND_GEM_RATIO * 12 }, coins: 25200, seconds: 48 * 60 * 60, level: 102 },
  23: { resources: { Wood: 950, Stone: 350, Iron: 50, Gold: 35, Crimstone: 68, Oil: 200, Obsidian: 10, Gem: LAND_GEM_RATIO * 12 }, coins: 30000, seconds: 48 * 60 * 60, level: 104 },
  24: { resources: { Wood: 1000, Stone: 400, Iron: 55, Gold: 40, Crimstone: 72, Oil: 300, Obsidian: 12, Gem: LAND_GEM_RATIO * 12 }, coins: 33600, seconds: 48 * 60 * 60, level: 106 },
  25: { resources: { Wood: 1100, Stone: 450, Iron: 60, Gold: 35, Crimstone: 80, Oil: 300, Obsidian: 12, Gem: LAND_GEM_RATIO * 12 }, coins: 38400, seconds: 60 * 60 * 60, level: 108 },
  26: { resources: { Wood: 1200, Stone: 350, Iron: 65, Gold: 30, Crimstone: 85, Oil: 300, Obsidian: 18, Gem: LAND_GEM_RATIO * 12 }, coins: 42000, seconds: 60 * 60 * 60, level: 110 },
  27: { resources: { Wood: 1250, Stone: 450, Iron: 70, Gold: 40, Crimstone: 95, Oil: 300, Obsidian: 24, Gem: LAND_GEM_RATIO * 15 }, coins: 45600, seconds: 60 * 60 * 60, level: 112 },
  28: { resources: { Wood: 1150, Stone: 500, Iron: 60, Gold: 45, Crimstone: 100, Oil: 300, Obsidian: 30, Gem: LAND_GEM_RATIO * 15 }, coins: 50400, seconds: 60 * 60 * 60, level: 114 },
  29: { resources: { Wood: 1350, Stone: 550, Iron: 65, Gold: 40, Crimstone: 105, Oil: 300, Obsidian: 36, Gem: LAND_GEM_RATIO * 15 }, coins: 54000, seconds: 72 * 60 * 60, level: 116 },
  30: { resources: { Wood: 1500, Stone: 600, Iron: 70, Gold: 50, Crimstone: 125, Oil: 300, Obsidian: 42, Gem: LAND_GEM_RATIO * 15 }, coins: 60000, seconds: 72 * 60 * 60, level: 120 },
};

const ISLAND_TABLES: Record<Exclude<IslandGroup, 'ascension'>, { min: number; max: number; data: Record<number, StageCost> }> = {
  basic: { min: 4, max: 9, data: BASIC_REQUIREMENTS },
  spring: { min: 5, max: 16, data: SPRING_REQUIREMENTS },
  desert: { min: 5, max: 25, data: DESERT_REQUIREMENTS },
  volcano: { min: 6, max: 30, data: VOLCANO_REQUIREMENTS },
};

export const ISLAND_GROUPS_ORDER: Exclude<IslandGroup, 'ascension'>[] = ['basic', 'spring', 'desert', 'volcano'];

/** Диапазон номеров расширений (min..max) для острова — для построения выпадающих списков. */
export function islandRange(group: Exclude<IslandGroup, 'ascension'>): { min: number; max: number } {
  const { min, max } = ISLAND_TABLES[group];
  return { min, max };
}

// --- Возвышение (Ascension, остров Swamp и далее) ---------------------------
// features/game/expansion/lib/ascension.ts: 12 расширений на уровень Возвышения,
// стоимость растёт по степенной кривой и множится на 1.3^(ascensionLevel-1).

export const EXPANSIONS_PER_ASCENSION = 12;
const COST_GROWTH = 1.3;
const COST_CURVE_EXPONENT = 1.3;
const HOURS_PER_EXPANSION = 7;

const SWAMP_COST_CURVE: Record<'Crimstone' | 'Oil' | 'Obsidian', { start: number; end: number }> = {
  Crimstone: { start: 10, end: 50 },
  Oil: { start: 50, end: 400 },
  Obsidian: { start: 2, end: 20 },
};
const SWAMP_COIN_CURVE = { start: 5000, end: 75000 };

const SWAMP_EXPANSION_LEVELS: Record<number, number> = {
  1: 1, 2: 4, 3: 8, 4: 12, 5: 16, 6: 20, 7: 24, 8: 28, 9: 32, 10: 36, 11: 40, 12: 45,
};

/** `swampCostBase` из ascension.ts: степенная кривая от `start` до `end` по позиции `e` (1..12). */
function swampCostBase(start: number, end: number, e: number): number {
  return start + (end - start) * Math.pow((e - 1) / (EXPANSIONS_PER_ASCENSION - 1), COST_CURVE_EXPONENT);
}

/** Соответствует `getAscensionExpansionRequirements` из ascension.ts. */
export function ascensionStageCost(ascensionLevel: number, e: number): StageCost {
  const multiplier = Math.pow(COST_GROWTH, ascensionLevel - 1);
  const scaleResource = (base: number) => Math.round(base * multiplier);
  const scaleCoins = (base: number) => Math.ceil((base * multiplier) / 10) * 10;

  return {
    resources: {
      Crimstone: scaleResource(swampCostBase(SWAMP_COST_CURVE.Crimstone.start, SWAMP_COST_CURVE.Crimstone.end, e)),
      Oil: scaleResource(swampCostBase(SWAMP_COST_CURVE.Oil.start, SWAMP_COST_CURVE.Oil.end, e)),
      Obsidian: scaleResource(swampCostBase(SWAMP_COST_CURVE.Obsidian.start, SWAMP_COST_CURVE.Obsidian.end, e)),
    },
    coins: scaleCoins(swampCostBase(SWAMP_COIN_CURVE.start, SWAMP_COIN_CURVE.end, e)),
    seconds: e * HOURS_PER_EXPANSION * 60 * 60,
    level: SWAMP_EXPANSION_LEVELS[e] ?? 45,
  };
}

/** Все расширения одного острова (Базовый/Лепестковый рай/Пустыня/Вулкан) по порядку. */
export function stagesForIsland(group: Exclude<IslandGroup, 'ascension'>): Stage[] {
  const { min, max, data } = ISLAND_TABLES[group];
  const stages: Stage[] = [];
  for (let n = min; n <= max; n++) {
    stages.push({
      id: `${group}-${n}`,
      group,
      number: n,
      label: `${ISLAND_GROUP_LABELS[group]} — расширение №${n}`,
      cost: data[n],
    });
  }
  return stages;
}

/** Все 12 расширений одного уровня Возвышения. */
export function stagesForAscensionLevel(level: number): Stage[] {
  const stages: Stage[] = [];
  for (let e = 1; e <= EXPANSIONS_PER_ASCENSION; e++) {
    stages.push({
      id: `ascension-${level}-${e}`,
      group: 'ascension',
      number: e,
      label: `Возвышение ${level} — расширение ${e}/${EXPANSIONS_PER_ASCENSION}`,
      cost: ascensionStageCost(level, e),
    });
  }
  return stages;
}

/** Строит единую упорядоченную таблицу этапов: Базовый → Лепестковый рай → Пустыня → Вулкан → Возвышение 1..maxAscension. */
export function buildStages(maxAscensionLevel: number): Stage[] {
  const stages: Stage[] = [];

  (['basic', 'spring', 'desert', 'volcano'] as const).forEach((group) => {
    const { min, max, data } = ISLAND_TABLES[group];
    for (let n = min; n <= max; n++) {
      stages.push({
        id: `${group}-${n}`,
        group,
        number: n,
        label: `${ISLAND_GROUP_LABELS[group]} — расширение №${n}`,
        cost: data[n],
      });
    }
  });

  for (let level = 1; level <= maxAscensionLevel; level++) {
    for (let e = 1; e <= EXPANSIONS_PER_ASCENSION; e++) {
      stages.push({
        id: `ascension-${level}-${e}`,
        group: 'ascension',
        number: e,
        label: `Возвышение ${level} — расширение ${e}/${EXPANSIONS_PER_ASCENSION}`,
        cost: ascensionStageCost(level, e),
      });
    }
  }

  return stages;
}

export interface Stage {
  id: string;
  group: IslandGroup;
  /** Порядковый номер расширения внутри своего острова, либо позиция внутри уровня Возвышения. */
  number: number;
  label: string;
  cost: StageCost;
}

export interface RangeTotal {
  resources: Partial<Record<ExpansionResource, number>>;
  coins: number;
  seconds: number;
  stagesCount: number;
}

/** Суммирует стоимость этапов строго после `fromIndex` (эксклюзивно) и до `toIndex` (инклюзивно). */
export function sumRange(stages: Stage[], fromIndex: number, toIndex: number): RangeTotal {
  const total: RangeTotal = { resources: {}, coins: 0, seconds: 0, stagesCount: 0 };
  if (toIndex <= fromIndex) return total;

  for (let i = fromIndex + 1; i <= toIndex; i++) {
    const cost = stages[i].cost;
    total.coins += cost.coins;
    total.seconds += cost.seconds;
    total.stagesCount += 1;
    for (const resource of RESOURCE_ORDER) {
      const amount = cost.resources[resource];
      if (amount) total.resources[resource] = (total.resources[resource] ?? 0) + amount;
    }
  }

  return total;
}

/** Суммирует стоимость всех переданных этапов (например, всей таблицы одного острова). */
export function sumStages(stages: Stage[]): RangeTotal {
  return sumRange(stages, -1, stages.length - 1);
}

/** Компактная строка вида "Дерево 100 · Камень 40 · Железо 5" для ячейки таблицы. */
export function formatResourceList(resources: Partial<Record<ExpansionResource, number>>): string {
  return RESOURCE_ORDER.filter((r) => resources[r])
    .map((r) => `${RESOURCE_LABELS[r]} ${resources[r]!.toLocaleString('ru-RU')}`)
    .join(' · ');
}

/** Форматирует секунды в "Xд Yч" / "Yч Zм" — для отображения суммарного времени постройки. */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0м';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}д`);
  if (hours > 0) parts.push(`${hours}ч`);
  if (days === 0 && minutes > 0) parts.push(`${minutes}м`);

  return parts.join(' ') || '0м';
}
