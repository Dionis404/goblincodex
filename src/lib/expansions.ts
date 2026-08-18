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
 *
 * Отдельно от стоимости самих расширений есть единоразовая стоимость ПЕРЕХОДА
 * на следующий остров (действие `farm.upgraded` — features/game/events/
 * landExpansion/upgradeFarm.ts: ISLAND_UPGRADE / getAscensionUpgradeCost).
 * Она не входит в EXPANSION_REQUIREMENTS и раньше не учитывалась ни в таблицах,
 * ни в калькуляторе — теперь добавлена как отдельный "переходный" этап в конце
 * каждого острова (isTransition: true), так что она автоматически попадает в
 * сумму при пересечении границы острова.
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

/**
 * Иконки ресурсов. Большинство — спрайты, синхронизированные из sunflower-land
 * репо в public/sprites/ (см. scripts/sync-sprites.ts). Wood и Stone в
 * исходниках игры подтягиваются не из репо, а с игрового CDN
 * (SUNNYSIDE.resource.wood/stone) — скачаны вручную оттуда же
 * (sunflower-land.com/game-assets/resources/{wood,stone}.png).
 */
export const RESOURCE_ICONS: Record<ExpansionResource, string> = {
  Wood: '/sprites/resources/wood.png',
  Stone: '/sprites/resources/stone.png',
  Iron: '/sprites/resources/iron_ore.png',
  Gold: '/sprites/resources/gold_ore.png',
  Crimstone: '/sprites/resources/crimstone.png',
  Oil: '/sprites/resources/oil.webp',
  Obsidian: '/sprites/resources/obsidian.webp',
  Gem: '/sprites/icons/gem.webp',
};

/** Иконка монет — тоже с игрового CDN (sunflower-land.com/game-assets/ui/coins.png), не из репо. */
export const COINS_ICON = '/sprites/ui/coins.png';

export interface StageCost {
  resources: Partial<Record<ExpansionResource, number>>;
  coins: number;
  seconds: number;
  level: number;
}

/** Бампкин-левел, начиная с которого доступно первое Возвышение (ASCENSION_BUMPKIN_LEVEL в upgradeFarm.ts). */
const ASCENSION_BUMPKIN_LEVEL = 150;
/** Внутриполосный уровень (0..50), при котором полоса Возвышения считается пройденной. */
const ASCENSION_LEVEL_CAP = 50;

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

/** Стартовое число расширений при входе на остров Возвышения (upgradeFarm.ts: ISLAND_SETUP.swamp.startingExpansions). */
export const ASCENSION_STARTING_EXPANSIONS = 30;

// --- Готовые картинки формы острова (реальный рендер игры, не наша схема) ---
// Подтверждённый рабочий CDN-адрес: sunflower-land.com/game-assets/land/levels/
// /{остров}/{сезон}/level_{N}.webp — есть у basic/desert/volcano и всей цепочки
// Возвышения swamp→spooky→crystal→galaxy→marble. У Лепесткового рая (Petal
// Paradise, наш 'spring') своей папки на CDN нет — но форма острова не
// зависит от скина (одна и та же формула спирали для всех), поэтому вместо
// неё берём картинку basic на нужном количестве расширений: basic рисуется
// вплоть до level_41 (легаси-нумерация ещё со времён Land NFT), с запасом
// перекрывает диапазон Лепесткового рая (4–16) — трава вместо цветов, но
// форма честная.

const LAND_LEVEL_IMAGE_BASE = 'https://sunflower-land.com/game-assets/land/levels';

/** Острова цепочки Возвышения в порядке прохождения (game.island.ascensionLevel, 1-индексация). */
const ASCENSION_ISLAND_NAMES = ['swamp', 'spooky', 'crystal', 'galaxy', 'marble'];

/** Имя острова (для картинки) для уровня Возвышения — после marble цепочка зацикливается на marble. */
export function ascensionIslandName(ascensionLevel: number): string {
  const idx = Math.min(Math.max(ascensionLevel, 1), ASCENSION_ISLAND_NAMES.length) - 1;
  return ASCENSION_ISLAND_NAMES[idx];
}

/** Имя острова для картинки формы — у Лепесткового рая своих картинок нет, берём basic (форма та же). */
export function landLevelImageIslandName(group: Exclude<IslandGroup, 'ascension'>): string {
  return group === 'spring' ? 'basic' : group;
}

/** URL готовой картинки формы острова на `count` расширений. */
export function landLevelImageUrl(islandName: string, count: number): string {
  return `${LAND_LEVEL_IMAGE_BASE}/${islandName}/autumn/level_${count}.webp`;
}

// --- Ноды, которые даёт каждое расширение ------------------------------------
// Извлечено из sunflower-land репо (features/game/types/expansions.ts:
// TOTAL_EXPANSION_NODES / deriveExpansionNodes, features/game/expansion/lib/
// ascension.ts: getAscensionNodes) — реальные накопленные счётчики нод по
// каждому номеру расширения, переведённые в разницу (что добавляет именно
// это расширение, а не накопленный итог). Ключ таблицы — тот же номер
// расширения, что и в EXPANSION_REQUIREMENTS (basic 3–9, spring/desert 4–…,
// volcano 5–30); младший ключ каждой таблицы — старт (бесплатные ноды сразу
// по прибытии на остров, ещё до первой покупки).

export type NodeKey =
  | 'CropPlot'
  | 'Tree'
  | 'Stone'
  | 'Iron'
  | 'Gold'
  | 'Crimstone'
  | 'Sunstone'
  | 'FruitPatch'
  | 'FlowerBed'
  | 'Beehive'
  | 'Oil'
  | 'LavaPit';

export type NodeGain = Partial<Record<NodeKey, number>>;

export const NODE_ORDER: NodeKey[] = [
  'CropPlot', 'Tree', 'Stone', 'Iron', 'Gold', 'Crimstone', 'Sunstone',
  'FruitPatch', 'FlowerBed', 'Beehive', 'Oil', 'LavaPit',
];

export const NODE_LABELS: Record<NodeKey, string> = {
  CropPlot: 'Грядка',
  Tree: 'Дерево',
  Stone: 'Камень',
  Iron: 'Железо',
  Gold: 'Золото',
  Crimstone: 'Кримстоун',
  Sunstone: 'Санстоун',
  FruitPatch: 'Фруктовая грядка',
  FlowerBed: 'Клумба',
  Beehive: 'Улей',
  Oil: 'Нефть',
  LavaPit: 'Lava Pit',
};

export const NODE_ICONS: Record<NodeKey, string> = {
  CropPlot: '/sprites/resources/plot.png',
  Tree: '/sprites/resources/wood.png',
  Stone: '/sprites/resources/stone.png',
  Iron: '/sprites/resources/iron_ore.png',
  Gold: '/sprites/resources/gold_ore.png',
  Crimstone: '/sprites/resources/crimstone.png',
  Sunstone: '/sprites/resources/sunstone/sunstone.png',
  FruitPatch: '/sprites/resources/fruit_patch.png',
  FlowerBed: '/sprites/bumpkins/flower_bed.webp',
  Beehive: '/sprites/sfts/beehive.webp',
  Oil: '/sprites/resources/oil.webp',
  LavaPit: '/sprites/resources/lava/lava_pit.webp',
};

const BASIC_NODE_GAINS: Record<number, NodeGain> = {
  3: { Tree: 3, Stone: 2 },
  4: { CropPlot: 9, Tree: 2, Stone: 1, Iron: 1 },
  5: { CropPlot: 8, Tree: 1, Stone: 1, Iron: 1, Gold: 1 },
  6: { CropPlot: 8, Tree: 1, Stone: 1 },
  7: { CropPlot: 2, Tree: 1, Stone: 1, Iron: 1 },
  8: { CropPlot: 2, Tree: 1, Stone: 1, Gold: 1 },
  9: { CropPlot: 2, Iron: 1 },
};

const SPRING_NODE_GAINS: Record<number, NodeGain> = {
  4: { CropPlot: 31, Tree: 9, Stone: 7, Iron: 4, Gold: 2, FruitPatch: 2 },
  5: { CropPlot: 2, Tree: 2, Stone: 2, Iron: 1, Gold: 1, FruitPatch: 1 },
  6: { Tree: 1, Stone: 1, FruitPatch: 1, FlowerBed: 1, Beehive: 1 },
  7: { CropPlot: 2, Tree: 1, Stone: 1, Crimstone: 1 },
  8: { CropPlot: 2, Stone: 1, Iron: 1, Gold: 1, FruitPatch: 1 },
  9: { Tree: 1, Sunstone: 1, FruitPatch: 1 },
  10: { Iron: 1, Gold: 1, FruitPatch: 1, FlowerBed: 1, Beehive: 1 },
  11: { CropPlot: 2, Tree: 1, Stone: 1, FruitPatch: 1 },
  12: { CropPlot: 2 },
  13: { Tree: 1, Stone: 1, Iron: 1, Sunstone: 1, FruitPatch: 1 },
  14: { CropPlot: 2, FruitPatch: 1 },
  15: { CropPlot: 1, Tree: 1, Stone: 1, Iron: 1, Crimstone: 1, FruitPatch: 1 },
  16: { CropPlot: 1, Tree: 1, Gold: 1, FlowerBed: 1, Beehive: 1 },
};

const DESERT_NODE_GAINS: Record<number, NodeGain> = {
  4: { CropPlot: 45, Tree: 18, Stone: 15, Iron: 9, Gold: 6, Crimstone: 2, Sunstone: 2, FruitPatch: 11, FlowerBed: 3, Beehive: 3 },
  5: { CropPlot: 1, Stone: 1, Iron: 1, Oil: 1 },
  6: { Sunstone: 1, FruitPatch: 1 },
  7: { CropPlot: 2, Crimstone: 1 },
  8: { CropPlot: 2, Sunstone: 1 },
  9: { Tree: 1, Stone: 1 },
  10: { CropPlot: 1, Iron: 1 },
  11: { CropPlot: 1, FruitPatch: 1 },
  12: { CropPlot: 2 },
  13: { Tree: 1 },
  14: { CropPlot: 1, Stone: 1 },
  15: { CropPlot: 1, Oil: 1 },
  16: { CropPlot: 1, Tree: 1 },
  17: { CropPlot: 2 },
  18: { CropPlot: 1, Gold: 1 },
  19: { CropPlot: 1, FruitPatch: 1 },
  20: { Tree: 1, Stone: 1, Oil: 1 },
  21: { CropPlot: 1, Iron: 1, Sunstone: 1 },
  22: { Tree: 1, FruitPatch: 1 },
  23: { CropPlot: 1, Crimstone: 1 },
  24: { CropPlot: 1, Sunstone: 1 },
  25: { CropPlot: 1, Stone: 1 },
};

const VOLCANO_NODE_GAINS: Record<number, NodeGain> = {
  5: { CropPlot: 65, Tree: 23, Stone: 20, Iron: 12, Gold: 7, Crimstone: 4, Sunstone: 6, FruitPatch: 15, FlowerBed: 3, Beehive: 3, Oil: 3 },
  6: {},
  7: { LavaPit: 1 },
  8: { Sunstone: 1 },
  9: {},
  10: { Gold: 1 },
  11: {},
  12: { Sunstone: 1 },
  13: {},
  14: {},
  15: { LavaPit: 1 },
  16: { Oil: 1 },
  17: { Sunstone: 1 },
  18: {},
  19: { Sunstone: 1 },
  20: {},
  21: { Sunstone: 1 },
  22: {},
  23: { Iron: 1 },
  24: { LavaPit: 1 },
  25: { Crimstone: 1 },
  26: {},
  27: {},
  28: { Sunstone: 1 },
  29: {},
  30: { Sunstone: 1 },
};

// --- Ноды Возвышения — формула, не хардкод ----------------------------------
// Портировано из features/game/expansion/lib/ascension.ts (getAscensionNodes /
// getAscensionExpansionDelta). ВАЖНО: количество нод по уровням Возвышения НЕ
// одинаковое — с каждым уровнем "капельная" выдача (drip) становится реже
// (getAscensionNodeDrip растягивает интервал на 25% за уровень), поэтому один
// и тот же 12-этапный цикл на A2 даёт меньше нод, чем на A1, и т.д. Раньше тут
// был статический снимок для A1, ошибочно переиспользуемый для всех уровней —
// это давало одинаковые числа независимо от выбранного уровня Возвышения.

/** SWAMP_NODE_DRIP — базовый интервал (в расширениях) между каплями каждого типа нод на A1. */
const SWAMP_NODE_DRIP: Record<NodeKey, number> = {
  CropPlot: 2, Tree: 4, Stone: 4, FruitPatch: 6, Iron: 6, Gold: 8,
  Crimstone: 8, Oil: 12, LavaPit: 16, Beehive: 10, FlowerBed: 10, Sunstone: 10,
};

/**
 * Порядок ключей ровно как в SWAMP_NODE_DRIP из ascension.ts игры — НЕ то же
 * самое, что NODE_ORDER (который только для отображения). Индекс узла в этом
 * массиве — это `t` (tie-break) в buildAscensionSchedule ниже: он определяет
 * фазовый сдвиг `(t * GOLDEN_RATIO) % 1`, а значит и то, на какое КОНКРЕТНОЕ
 * расширение попадёт нода при равном ранге. Использование NODE_ORDER здесь
 * (разный порядок ключей) давало верные накопленные суммы за возвышение, но
 * неверное распределение по номерам расширений — сверено с getAscensionNodes
 * из ascension.ts на A1: расширения 7 и 8 не совпадали.
 */
const SCHEDULE_TIE_ORDER: NodeKey[] = [
  'CropPlot', 'Tree', 'Stone', 'FruitPatch', 'Iron', 'Gold',
  'Crimstone', 'Oil', 'LavaPit', 'Beehive', 'FlowerBed', 'Sunstone',
];

/** DRIP_WIDEN_PER_ASCENSION — интервал растёт на эту долю за каждый следующий уровень Возвышения. */
const DRIP_WIDEN_PER_ASCENSION = 0.25;

/** NO_DRIP_CAP_NODES — этим типам не ограничивают расширенный drip потолком в 12 (span). */
const NO_DRIP_CAP_NODES: NodeKey[] = ['Beehive', 'FlowerBed', 'Oil', 'Sunstone', 'Crimstone', 'LavaPit'];

/** getAscensionNodeDrip: эффективный интервал выдачи ноды на уровне `ascensionLevel` (1-индексация). */
function ascensionNodeDrip(node: NodeKey, ascensionLevel: number): number {
  const base = SWAMP_NODE_DRIP[node];
  if (!base || base <= 0) return 0;
  const widened = Math.floor(base * (1 + DRIP_WIDEN_PER_ASCENSION * (ascensionLevel - 1)));
  return NO_DRIP_CAP_NODES.includes(node) ? widened : Math.min(widened, EXPANSIONS_PER_ASCENSION);
}

/** getAscensionCumulativeNodes: сколько нод типа `node` накопится к концу уровня `ascensionLevel` включительно (0 для уровня 0). */
function ascensionCumulativeNodes(node: NodeKey, ascensionLevel: number): number {
  let total = 0;
  for (let a = 1; a <= ascensionLevel; a++) {
    const drip = ascensionNodeDrip(node, a);
    if (drip > 0) total += EXPANSIONS_PER_ASCENSION / drip;
  }
  return Math.floor(total);
}

/** getAscensionNodeTotal: сколько нод типа `node` выдаётся ИМЕННО на уровне `ascensionLevel` (все 12 расширений). */
function ascensionNodeTotalForLevel(node: NodeKey, ascensionLevel: number): number {
  return ascensionCumulativeNodes(node, ascensionLevel) - ascensionCumulativeNodes(node, ascensionLevel - 1);
}

/** (√5 − 1) / 2 — фаза для разнесения нод одного количества по разным расширениям (как в игре). */
const GOLDEN_RATIO = 0.6180339887498949;

/**
 * buildAscensionSchedule: раскладывает капли уровня `ascensionLevel` по его 12
 * расширениям равномерно (каждое получает ⌊N/12⌋…⌈N/12⌉ капель каждого типа).
 * Возвращает массив длиной 12 (индекс 0 = локальное расширение №1).
 */
function buildAscensionSchedule(ascensionLevel: number): NodeGain[] {
  const span = EXPANSIONS_PER_ASCENSION;
  const items: { pos: number; node: NodeKey; tie: number }[] = [];

  SCHEDULE_TIE_ORDER.forEach((node, t) => {
    if (node === 'FlowerBed') return; // едет вместе с Beehive
    const count = ascensionNodeTotalForLevel(node, ascensionLevel);
    const phase = (t * GOLDEN_RATIO) % 1;
    for (let i = 0; i < count; i++) {
      items.push({ pos: (i + phase) / count, node, tie: t });
    }
  });

  items.sort((a, b) => a.pos - b.pos || a.tie - b.tie);

  const schedule: NodeGain[] = Array.from({ length: span }, () => ({}));
  items.forEach((item, k) => {
    const slot = Math.floor((k * span) / items.length);
    schedule[slot][item.node] = (schedule[slot][item.node] ?? 0) + 1;
    if (item.node === 'Beehive') {
      schedule[slot].FlowerBed = (schedule[slot].FlowerBed ?? 0) + 1;
    }
  });

  return schedule;
}

const ascensionScheduleCache = new Map<number, NodeGain[]>();

function ascensionSchedule(ascensionLevel: number): NodeGain[] {
  const cached = ascensionScheduleCache.get(ascensionLevel);
  if (cached) return cached;
  const schedule = buildAscensionSchedule(ascensionLevel);
  ascensionScheduleCache.set(ascensionLevel, schedule);
  return schedule;
}

/** getAscensionExpansionDelta: ноды, которые даёт конкретное расширение `e` (1..12) уровня `ascensionLevel`. */
function ascensionExpansionDelta(ascensionLevel: number, e: number): NodeGain {
  if (e < 1 || e > EXPANSIONS_PER_ASCENSION) return {};
  return ascensionSchedule(Math.max(1, ascensionLevel))[e - 1];
}

/** Ноды, которые даёт конкретный этап (`Stage.number`) — null для переходов и когда данных нет. */
export function nodeGainsForStage(stage: Stage): NodeGain | null {
  if (stage.isTransition || stage.number < 0) return null;
  if (stage.group === 'ascension') return ascensionExpansionDelta(stage.ascensionLevel ?? 1, stage.number);
  const table = { basic: BASIC_NODE_GAINS, spring: SPRING_NODE_GAINS, desert: DESERT_NODE_GAINS, volcano: VOLCANO_NODE_GAINS }[stage.group];
  return table[stage.number] ?? null;
}

/** Реальное число расширений (Basic Land) на острове для конкретного этапа — для картинки формы острова. */
export function landImageCountForStage(stage: Stage): number {
  return stage.group === 'ascension' ? ASCENSION_STARTING_EXPANSIONS + stage.number : stage.number;
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

// --- Переход на следующий остров / Возвышение (farm.upgraded) --------------
// upgradeFarm.ts: ISLAND_UPGRADE (статичная стоимость basic→spring→desert→volcano)
// и getAscensionUpgradeCost (растущая ×1.4 за каждый следующий уровень Возвышения,
// применяется и к переходу volcano→Возвышение 1, и к каждому Возвышение N→N+1).

const ASCENSION_UPGRADE_BASE: Record<'Crimstone' | 'Oil' | 'Obsidian', number> = {
  Crimstone: 30,
  Oil: 50,
  Obsidian: 3,
};
const ASCENSION_UPGRADE_BASE_COINS = 5000;
const ASCENSION_UPGRADE_GROWTH = 1.4;

/** Соответствует `getAscensionUpgradeCost` из upgradeFarm.ts (округление вниз). */
function ascensionUpgradeCost(ascensionLevel: number): { resources: Partial<Record<ExpansionResource, number>>; coins: number } {
  const multiplier = Math.pow(ASCENSION_UPGRADE_GROWTH, ascensionLevel - 1);
  const scale = (base: number) => Math.floor(base * multiplier);
  return {
    resources: {
      Crimstone: scale(ASCENSION_UPGRADE_BASE.Crimstone),
      Oil: scale(ASCENSION_UPGRADE_BASE.Oil),
      Obsidian: scale(ASCENSION_UPGRADE_BASE.Obsidian),
    },
    coins: scale(ASCENSION_UPGRADE_BASE_COINS),
  };
}

/** Единоразовая стоимость перехода basic→spring→desert→volcano (upgradeFarm.ts: ISLAND_UPGRADE[group].items). */
const ISLAND_UPGRADE_ITEMS: Record<'basic' | 'spring' | 'desert', Partial<Record<ExpansionResource, number>>> = {
  basic: { Gold: 10 },
  spring: { Crimstone: 20 },
  desert: { Oil: 200 },
};

/** Переходный этап в конце острова: стоимость перехода на следующий остров (или на первое Возвышение — с Вулкана). */
function islandTransitionStage(group: Exclude<IslandGroup, 'ascension'>, precedingLevel: number): Stage {
  const nextLabel = group === 'basic' ? ISLAND_GROUP_LABELS.spring
    : group === 'spring' ? ISLAND_GROUP_LABELS.desert
    : group === 'desert' ? ISLAND_GROUP_LABELS.volcano
    : `${ISLAND_GROUP_LABELS.ascension} 1`;

  const cost = group === 'volcano'
    ? { ...ascensionUpgradeCost(1), seconds: 0, level: ASCENSION_BUMPKIN_LEVEL }
    : { resources: ISLAND_UPGRADE_ITEMS[group], coins: 0, seconds: 0, level: precedingLevel };

  return {
    id: `transition-${group}`,
    group,
    number: -1,
    label: `Переход: ${ISLAND_GROUP_LABELS[group]} → ${nextLabel}`,
    cost,
    isTransition: true,
  };
}

/** Все расширения одного острова (Базовый/Лепестковый рай/Пустыня/Вулкан) по порядку + переход на следующий остров. */
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
  stages.push(islandTransitionStage(group, stages[stages.length - 1].cost.level));
  return stages;
}

/** Все 12 расширений одного уровня Возвышения + переход на следующий уровень Возвышения. */
export function stagesForAscensionLevel(level: number): Stage[] {
  const stages: Stage[] = [];
  for (let e = 1; e <= EXPANSIONS_PER_ASCENSION; e++) {
    stages.push({
      id: `ascension-${level}-${e}`,
      group: 'ascension',
      number: e,
      label: `Возвышение ${level} — расширение ${e}/${EXPANSIONS_PER_ASCENSION}`,
      cost: ascensionStageCost(level, e),
      ascensionLevel: level,
    });
  }
  stages.push({
    id: `transition-ascension-${level}`,
    group: 'ascension',
    number: -1,
    label: `Переход: Возвышение ${level} → Возвышение ${level + 1}`,
    cost: { ...ascensionUpgradeCost(level + 1), seconds: 0, level: ASCENSION_LEVEL_CAP },
    isTransition: true,
  });
  return stages;
}

/** Строит единую упорядоченную таблицу этапов: Базовый → Лепестковый рай → Пустыня → Вулкан → Возвышение 1..maxAscension (с переходами между ними). */
export function buildStages(maxAscensionLevel: number): Stage[] {
  const stages: Stage[] = [];

  (['basic', 'spring', 'desert', 'volcano'] as const).forEach((group) => {
    stages.push(...stagesForIsland(group));
  });

  for (let level = 1; level <= maxAscensionLevel; level++) {
    stages.push(...stagesForAscensionLevel(level));
  }

  return stages;
}

export interface Stage {
  id: string;
  group: IslandGroup;
  /** Порядковый номер расширения внутри своего острова, либо позиция внутри уровня Возвышения. -1 для переходных этапов. */
  number: number;
  label: string;
  cost: StageCost;
  /** Единоразовый переход на следующий остров/уровень Возвышения (farm.upgraded), а не покупка расширения. */
  isTransition?: boolean;
  /** Только для group === 'ascension' — нужен, т.к. количество нод зависит от уровня (drip растёт реже с каждым уровнем). */
  ascensionLevel?: number;
}

export interface RangeTotal {
  resources: Partial<Record<ExpansionResource, number>>;
  coins: number;
  seconds: number;
  /** Купленных расширений (не считая переходов между островами/уровнями Возвышения). */
  stagesCount: number;
  /** Переходов на следующий остров или уровень Возвышения (farm.upgraded), включённых в диапазон. */
  transitionsCount: number;
  /** Та же стоимость, что в `resources`/`coins`, но только доля от переходов — для подсветки в итогах. */
  transitionResources: Partial<Record<ExpansionResource, number>>;
  transitionCoins: number;
}

/** Суммирует стоимость этапов строго после `fromIndex` (эксклюзивно) и до `toIndex` (инклюзивно). */
export function sumRange(stages: Stage[], fromIndex: number, toIndex: number): RangeTotal {
  const total: RangeTotal = {
    resources: {},
    coins: 0,
    seconds: 0,
    stagesCount: 0,
    transitionsCount: 0,
    transitionResources: {},
    transitionCoins: 0,
  };
  if (toIndex <= fromIndex) return total;

  for (let i = fromIndex + 1; i <= toIndex; i++) {
    const stage = stages[i];
    const cost = stage.cost;
    total.coins += cost.coins;
    total.seconds += cost.seconds;
    if (stage.isTransition) {
      total.transitionsCount += 1;
      total.transitionCoins += cost.coins;
    } else {
      total.stagesCount += 1;
    }
    for (const resource of RESOURCE_ORDER) {
      const amount = cost.resources[resource];
      if (amount) {
        total.resources[resource] = (total.resources[resource] ?? 0) + amount;
        if (stage.isTransition) {
          total.transitionResources[resource] = (total.transitionResources[resource] ?? 0) + amount;
        }
      }
    }
  }

  return total;
}

/** Суммирует стоимость всех переданных этапов (например, всей таблицы одного острова). */
export function sumStages(stages: Stage[]): RangeTotal {
  return sumRange(stages, -1, stages.length - 1);
}

/** Суммирует ноды, которые дадут этапы строго после `fromIndex` (эксклюзивно) и до `toIndex` (инклюзивно). */
export function sumNodeGains(stages: Stage[], fromIndex: number, toIndex: number): NodeGain {
  const total: NodeGain = {};
  if (toIndex <= fromIndex) return total;

  for (let i = fromIndex + 1; i <= toIndex; i++) {
    const gains = nodeGainsForStage(stages[i]);
    if (!gains) continue;
    for (const key of NODE_ORDER) {
      const amount = gains[key];
      if (amount) total[key] = (total[key] ?? 0) + amount;
    }
  }

  return total;
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
