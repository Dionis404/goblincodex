/**
 * Дерево навыков бампкина (Skills) — чистые данные + мелкие хелперы.
 *
 * Источник: sunflower-land repo, features/game/types/bumpkinSkills.ts —
 * export const BUMPKIN_REVAMP_SKILL_TREE (актуальная система навыков,
 * заменившая старую BUMPKIN_SKILL_TREE/LEGACY_BADGE_TREE — те не используются
 * в игре и сюда не включены). Описания (`description`/`debuffDescription`)
 * взяты из src/lib/i18n/dictionaries/ru.json по ключам вида "skill.xxx"
 * (translate("skill.xxx") в исходниках); для нескольких навыков компоста
 * (Sprout Surge, Blend-tastic, Root Rocket) в игре нет ключа перевода —
 * там в исходниках лежит английская строка напрямую, она перенесена как есть.
 * Часть остальных строк тоже совпадает у ru/en в словаре игры (сама игра ещё
 * не перевела их на русский) — это не наша недоработка, а состояние апстрима.
 *
 * Один навык — Big Catch (Fishing) — помечен в исходниках `disabled: true`
 * (ещё не введён в игру) и намеренно не включён в этот список.
 *
 * Ранги (rank-up): большинство навыков после разового изучения можно ещё
 * прокачать до ранга 2 и 3 за Осколки Возвышения (Ascension Shards) + доп.
 * очки навыков — см. `upgrade` на Skill, `SkillUpgrade`/`SkillRankEffect`
 * ниже. Источник чисел — `upgrade.effect` у каждого навыка в
 * BUMPKIN_REVAMP_SKILL_TREE и формулы стоимости getSkillUpgradeCost /
 * getSkillUpgradeTierRequirement там же (см. costForSkillRank ниже).
 */

import { formatDuration } from './expansions';

export type SkillTree =
  | 'Crops'
  | 'Fruit Patch'
  | 'Trees'
  | 'Fishing'
  | 'Animals'
  | 'Greenhouse'
  | 'Mining'
  | 'Cooking'
  | 'Bees & Flowers'
  | 'Machinery'
  | 'Compost'
  | 'Aging';

/** Порядок вкладок/групп — соответствует порядку освоения островов в игре. */
export const SKILL_TREE_ORDER: SkillTree[] = [
  'Crops',
  'Trees',
  'Mining',
  'Cooking',
  'Compost',
  'Aging',
  'Fishing',
  'Fruit Patch',
  'Animals',
  'Bees & Flowers',
  'Greenhouse',
  'Machinery',
];

export const SKILL_TREE_LABELS: Record<SkillTree, string> = {
  Crops: 'Урожай',
  'Fruit Patch': 'Фруктовая грядка',
  Trees: 'Деревья',
  Fishing: 'Рыбалка',
  Animals: 'Животные',
  Greenhouse: 'Теплица',
  Mining: 'Добыча',
  Cooking: 'Готовка',
  'Bees & Flowers': 'Пчёлы и цветы',
  Machinery: 'Агромашина',
  Compost: 'Компост',
  Aging: 'Выдержка',
};

/** Остров, на котором открывается навык — те же ключи, что IslandGroup из lib/expansions (переиспользуем ISLAND_GROUP_LABELS). */
export type SkillIsland = 'basic' | 'spring' | 'desert';

export type SkillTier = 1 | 2 | 3;

/** Footprint AOE-навыка в тайлах от центра размещаемого объекта (см. AOEExtent в bumpkinSkills.ts). */
export interface AOEExtent {
  xLeft: number;
  xRight: number;
  depth: number;
}

/**
 * Магнитуда эффекта навыка по рангам (индекс массива = ранг-1). Повторяет
 * SkillRankEffect из bumpkinSkills.ts — тот же набор kind'ов, но без части
 * игровых нюансов (нам нужно только показать "ранг N: значение" в справочнике).
 * Смысл полей каждого kind — см. describeSkillRank ниже и комментарии в
 * исходнике игры (bumpkinSkills.ts, ~строки 215-298).
 */
export type SkillRankEffect =
  | { kind: 'growthMultiplier'; ranks: readonly [number, number, number] }
  | { kind: 'additiveYield'; ranks: readonly [number, number, number] }
  | { kind: 'coinBonus'; ranks: readonly [number, number, number] }
  | { kind: 'dropChance'; ranks: readonly [number, number, number] }
  | { kind: 'chance'; ranks: readonly [number, number, number] }
  | { kind: 'costMultiplier'; ranks: readonly [number, number, number] }
  | { kind: 'flatTimeBonus'; ranks: readonly [number, number, number] }
  | { kind: 'stockBonus'; ranks: Partial<Record<string, readonly [number, number, number]>> }
  | { kind: 'aoe'; ranks: readonly [AOEExtent, AOEExtent, AOEExtent]; aoeYield: readonly [number, number, number] }
  | { kind: 'cooldown'; ranks: readonly [number, number, number] }
  | { kind: 'multiplier'; ranks: readonly [number, number, number] }
  | { kind: 'dailyLimit'; ranks: readonly [number, number, number] }
  | { kind: 'xpBonus'; ranks: readonly [number, number, number] }
  | { kind: 'timeReduction'; ranks: readonly [number, number, number] }
  | { kind: 'flatDebuff'; ranks: readonly [number, number, number] }
  | { kind: 'oilReduction'; ranks: readonly [number, number, number] }
  | { kind: 'flatBonus'; ranks: readonly [number, number, number] }
  | { kind: 'flatReduction'; ranks: readonly [number, number, number] }
  | { kind: 'productionRate'; ranks: readonly [number, number, number] }
  | { kind: 'growthWithOilDebuff'; growth: readonly [number, number, number]; oilPenalty: readonly [number, number, number] }
  | { kind: 'yieldWithDebuff'; buff: readonly [number, number, number]; debuff: readonly [number, number, number] }
  | { kind: 'growthWithDebuff'; buff: readonly [number, number, number]; debuff: readonly [number, number, number] }
  | { kind: 'frenziedFish'; flat: readonly [number, number, number]; crit: readonly [number, number, number] }
  | { kind: 'doubleNom'; food: readonly [number, number, number]; ingredients: readonly [number, number, number] }
  | { kind: 'yieldWithOilDebuff'; yield: readonly [number, number, number]; oilMultiplier: readonly [number, number, number] }
  | { kind: 'rateWithGrowthDebuff'; rate: readonly [number, number, number]; growth: readonly [number, number, number] }
  | { kind: 'costWithDebuff'; buff: readonly [number, number, number]; debuff: readonly [number, number, number] }
  | { kind: 'xpWithFeedDebuff'; xp: readonly [number, number, number]; feed: readonly [number, number, number] }
  | { kind: 'sicknessWithSpread'; sickness: readonly [number, number, number]; spread: readonly [number, number, number] };

/** Прокачка ранга навыка: сколько всего рангов доступно и магнитуда эффекта по рангам. */
export interface SkillUpgrade {
  maxLevel: number;
  effect: SkillRankEffect;
}

export interface Skill {
  name: string;
  tree: SkillTree;
  tier: SkillTier;
  /** Стоимость в очках навыков. */
  points: number;
  island: SkillIsland;
  /** Русское описание эффекта (buff), из ru.json. */
  description: string;
  /** Побочный эффект/компромисс навыка, если есть (не у всех навыков). */
  debuffDescription?: string;
  /** Время перезарядки в секундах — только у "мгновенных" навыков (instant grow и т.п.). */
  cooldownSeconds?: number;
  /** Прокачка ранга (rank-up) за очки навыков + Осколки Возвышения — есть не у всех навыков (~10 из 153 без неё). */
  upgrade?: SkillUpgrade;
  /**
   * Путь к реальному спрайту навыка (public/sprites/...) — см.
   * scripts/sync-skill-icons.ts. Часть навыков в игре вообще без иконки —
   * для них поля нет, UI показывает эмодзи дерева (SKILL_TREE_EMOJI) вместо неё.
   */
  icon?: string;
}

const BASE_SKILLS: Skill[] = [
  { name: 'Green Thumb', tree: 'Crops', tier: 1, points: 1, island: 'basic', description: 'x0.95 plot crop growth time' },
  { name: 'Young Farmer', tree: 'Crops', tier: 1, points: 1, island: 'basic', description: '+0.1 к базовому урожаю' },
  { name: 'Experienced Farmer', tree: 'Crops', tier: 1, points: 1, island: 'basic', description: '+0.1 к среднему урожаю' },
  { name: 'Old Farmer', tree: 'Crops', tier: 1, points: 1, island: 'basic', description: '+0.1 к продвинутому урожаю' },
  { name: 'Chonky Scarecrow', tree: 'Crops', tier: 1, points: 1, island: 'basic', description: "Increases Basic Scarecrow's area of effect (AOE) to a 7x7 area; Additional x0.9 basic crop growth time" },
  { name: "Betty's Friend", tree: 'Crops', tier: 1, points: 1, island: 'basic', description: '+30% монет за доставки у Betty' },
  { name: 'Strong Roots', tree: 'Crops', tier: 2, points: 2, island: 'basic', description: 'x0.9 Advanced crop growth time' },
  { name: 'Coin Swindler', tree: 'Crops', tier: 2, points: 2, island: 'basic', description: '+10% монет за продажу растений на рынке' },
  { name: 'Golden Sunflower', tree: 'Crops', tier: 2, points: 2, island: 'basic', description: 'Шанс 1/700 получить 0.35 золота при сборе подсолнуха (кроме агромашины)' },
  { name: 'Horror Mike', tree: 'Crops', tier: 2, points: 2, island: 'basic', description: 'Scary Mike охватывает область 7x7; +0.1 к урожаю средних культур' },
  { name: "Laurie's Gains", tree: 'Crops', tier: 2, points: 2, island: 'basic', description: 'Laurie the Chuckle Crow охватывает область 7x7; +0.1 к урожаю продвинутых культур' },
  { name: 'Instant Growth', tree: 'Crops', tier: 3, points: 3, island: 'basic', description: 'Возможность мгновенно вырастить все растения на грядках', cooldownSeconds: 72 * 3600 },
  { name: 'Acre Farm', tree: 'Crops', tier: 3, points: 3, island: 'basic', description: '+1 к урожаю продвинутых культур', debuffDescription: '-0.5 к урожаю базовых и средних культур' },
  { name: 'Hectare Farm', tree: 'Crops', tier: 3, points: 3, island: 'basic', description: '+1 к урожаю базовых и средних культур', debuffDescription: '-0.5 к урожаю продвинутых культур' },

  { name: 'Fruitful Fumble', tree: 'Fruit Patch', tier: 1, points: 1, island: 'spring', description: '+0.1 к урожайности фруктовой грядки' },
  { name: 'Fruity Heaven', tree: 'Fruit Patch', tier: 1, points: 1, island: 'spring', description: 'x0.9 Fruit Patch seeds cost' },
  { name: 'Fruity Profit', tree: 'Fruit Patch', tier: 1, points: 1, island: 'spring', description: '+50% монет за доставки у Tango' },
  { name: 'Loyal Macaw', tree: 'Fruit Patch', tier: 1, points: 1, island: 'spring', description: 'Двойной эффект от Macaw' },
  { name: 'No Axe No Worries', tree: 'Fruit Patch', tier: 1, points: 1, island: 'spring', description: 'Рубка фруктовых веток и стеблей не требует топоров', debuffDescription: '-1 древесина с фруктовых веток и стеблей' },
  { name: 'Catchup', tree: 'Fruit Patch', tier: 2, points: 2, island: 'spring', description: 'x0.9 Fruit Patch growth time' },
  { name: 'Fruity Woody', tree: 'Fruit Patch', tier: 2, points: 2, island: 'spring', description: '+1 древесина с фруктовых веток и стеблей' },
  { name: 'Pear Turbocharge', tree: 'Fruit Patch', tier: 2, points: 2, island: 'spring', description: 'Двойной эффект от Immortal Pear' },
  { name: 'Crime Fruit', tree: 'Fruit Patch', tier: 2, points: 2, island: 'spring', description: '+10 к запасу семян помидора и лимона' },
  { name: 'Generous Orchard', tree: 'Fruit Patch', tier: 3, points: 3, island: 'spring', description: '20% шанс на +1 к урожайности фруктовой грядки' },
  { name: 'Long Pickings', tree: 'Fruit Patch', tier: 3, points: 3, island: 'spring', description: 'x0.75 Apple and Banana growth time', debuffDescription: '+10% времени роста всех остальных фруктов на фруктовой грядке' },
  { name: 'Short Pickings', tree: 'Fruit Patch', tier: 3, points: 3, island: 'spring', description: 'x0.75 Blueberry and Orange growth time', debuffDescription: '+10% времени роста всех остальных фруктов на фруктовой грядке' },
  { name: 'Zesty Vibes', tree: 'Fruit Patch', tier: 3, points: 3, island: 'spring', description: '+1 к урожаю помидора и лимона', debuffDescription: '-0.25 к урожаю всех остальных фруктов на фруктовой грядке' },

  { name: "Lumberjack's Extra", tree: 'Trees', tier: 1, points: 1, island: 'basic', description: '+0.1 древесина' },
  { name: 'Tree Charge', tree: 'Trees', tier: 1, points: 1, island: 'basic', description: 'x0.9 tree growth time' },
  { name: 'More Axes', tree: 'Trees', tier: 1, points: 1, island: 'basic', description: '+50 к запасу топоров' },
  { name: 'Insta-Chop', tree: 'Trees', tier: 1, points: 1, island: 'basic', description: 'Деревья срубаются за 1 нажатие' },
  { name: 'Tough Tree', tree: 'Trees', tier: 2, points: 2, island: 'basic', description: 'Шанс 1/10 на x3 древесины' },
  { name: "Feller's Discount", tree: 'Trees', tier: 2, points: 2, island: 'basic', description: 'x0.8 axe coin cost' },
  { name: 'Money Tree', tree: 'Trees', tier: 2, points: 2, island: 'basic', description: '1% шанс найти 200 монет при рубке деревьев' },
  { name: 'Tree Turnaround', tree: 'Trees', tier: 3, points: 3, island: 'basic', description: '15% шанс мгновенного роста деревьев' },
  { name: 'Tree Blitz', tree: 'Trees', tier: 3, points: 3, island: 'basic', description: 'Возможность мгновенно вырастить все деревья', cooldownSeconds: 24 * 3600 },

  { name: "Fisherman's 5 Fold", tree: 'Fishing', tier: 1, points: 1, island: 'basic', description: '+5 ежедневных попыток рыбалки' },
  { name: 'Fishy Chance', tree: 'Fishing', tier: 1, points: 1, island: 'basic', description: '10% шанс поймать +1 обычную рыбу' },
  { name: 'Fishy Roll', tree: 'Fishing', tier: 1, points: 1, island: 'basic', description: '10% шанс поймать +1 продвинутую рыбу' },
  { name: 'Reel Deal', tree: 'Fishing', tier: 1, points: 1, island: 'basic', description: 'x0.5 rod coin cost' },
  { name: "Fisherman's 10 Fold", tree: 'Fishing', tier: 2, points: 2, island: 'basic', description: '+10 ежедневных попыток рыбалки' },
  { name: 'Fishy Fortune', tree: 'Fishing', tier: 2, points: 2, island: 'basic', description: '+100% монет за доставки у Corale' },
  { name: 'Fishy Gamble', tree: 'Fishing', tier: 2, points: 2, island: 'basic', description: '20% шанс поймать +1 экспертную рыбу' },
  { name: 'Frenzied Fish', tree: 'Fishing', tier: 3, points: 3, island: 'basic', description: 'Во время рыбного безумия: +1 рыба и 50% шанс получить +1 рыбу' },
  { name: 'More With Less', tree: 'Fishing', tier: 3, points: 3, island: 'basic', description: '+10 ежедневных попыток рыбалки' },
  { name: 'Fishy Feast', tree: 'Fishing', tier: 3, points: 3, island: 'basic', description: '+20% к опыту бампкина с рыбы' },

  { name: 'Efficient Feeding', tree: 'Animals', tier: 1, points: 1, island: 'spring', description: 'x0.95 feed to feed all animals' },
  { name: 'Restless Animals', tree: 'Animals', tier: 1, points: 1, island: 'spring', description: 'x0.9 Animal sleep time' },
  { name: 'Fine Fibers', tree: 'Animals', tier: 1, points: 1, island: 'spring', description: '+0.1 перо, кожа и шерсть мериноса' },
  { name: 'Bountiful Bounties', tree: 'Animals', tier: 1, points: 1, island: 'spring', description: '+50% монет при продаже животных' },
  { name: 'Double Bale', tree: 'Animals', tier: 1, points: 1, island: 'spring', description: 'Двойной эффект от Bale' },
  { name: 'Bale Economy', tree: 'Animals', tier: 1, points: 1, island: 'spring', description: 'Bale дает бонус к молоку и шерсти' },
  { name: 'Featherweight', tree: 'Animals', tier: 1, points: 1, island: 'spring', description: '+0.35 перо', debuffDescription: '-0.1 кожа и шерсть мериноса' },
  { name: 'Abundant Harvest', tree: 'Animals', tier: 2, points: 2, island: 'spring', description: '+0.2 яйцо, шерсть и молоко' },
  { name: 'Heartwarming Instruments', tree: 'Animals', tier: 2, points: 2, island: 'spring', description: '+50% опыта животным от инструментов для ухода' },
  { name: 'Kale Mix', tree: 'Animals', tier: 2, points: 2, island: 'spring', description: 'Зерновой микс требует 3 кейла вместо базового рецепта' },
  { name: 'Alternate Medicine', tree: 'Animals', tier: 2, points: 2, island: 'spring', description: 'Амбарное лакомство требует на 1 лимон и мёд меньше' },
  { name: 'Healthy Livestock', tree: 'Animals', tier: 2, points: 2, island: 'spring', description: 'x0.5 chance of sickness' },
  { name: 'Merino Whisperer', tree: 'Animals', tier: 2, points: 2, island: 'spring', description: '+0.35 шерсть мериноса', debuffDescription: '-0.1 кожа и перо' },
  { name: 'Clucky Grazing', tree: 'Animals', tier: 3, points: 3, island: 'spring', description: 'x0.75 feed to feed Chickens', debuffDescription: '+50% затрат корма для других животных' },
  { name: 'Sheepwise Diet', tree: 'Animals', tier: 3, points: 3, island: 'spring', description: 'x0.75 feed to feed Sheep', debuffDescription: '+50% затрат корма для других животных' },
  { name: 'Cow-Smart Nutrition', tree: 'Animals', tier: 3, points: 3, island: 'spring', description: 'x0.75 feed to feed Cows', debuffDescription: '+50% затрат корма для других животных' },
  { name: 'Chonky Feed', tree: 'Animals', tier: 3, points: 3, island: 'spring', description: '2x опыта животным при кормлении', debuffDescription: '+50% затрат корма для всех животных' },
  { name: 'Leathercraft Mastery', tree: 'Animals', tier: 3, points: 3, island: 'spring', description: '+0.35 кожа', debuffDescription: '-0.1 перо и шерсть мериноса' },
  { name: 'Barnyard Rouse', tree: 'Animals', tier: 3, points: 3, island: 'spring', description: 'Возможность мгновенно разбудить всех животных', cooldownSeconds: 120 * 3600 },

  { name: 'Glass Room', tree: 'Greenhouse', tier: 1, points: 1, island: 'desert', description: '+0.1 к урожаю тепличных культур' },
  { name: 'Seedy Business', tree: 'Greenhouse', tier: 1, points: 1, island: 'desert', description: 'x0.85 Greenhouse seeds cost' },
  { name: 'Rice and Shine', tree: 'Greenhouse', tier: 1, points: 1, island: 'desert', description: 'x0.95 growth time for greenhouse produce' },
  { name: "Victoria's Secretary", tree: 'Greenhouse', tier: 1, points: 1, island: 'desert', description: '+50% монет за доставки у Victoria' },
  { name: 'Olive Express', tree: 'Greenhouse', tier: 2, points: 2, island: 'desert', description: 'x0.9 Olive growth time' },
  { name: 'Rice Rocket', tree: 'Greenhouse', tier: 2, points: 2, island: 'desert', description: 'x0.9 Rice growth time' },
  { name: 'Vine Velocity', tree: 'Greenhouse', tier: 2, points: 2, island: 'desert', description: 'x0.9 Grape growth time' },
  { name: 'Seeded Bounty', tree: 'Greenhouse', tier: 2, points: 2, island: 'desert', description: '+0.5 к урожаю тепличных культур', debuffDescription: '+1 тепличное семя для посадки' },
  { name: 'Greenhouse Guru', tree: 'Greenhouse', tier: 3, points: 3, island: 'desert', description: 'Возможность мгновенно вырастить весь урожай в теплице', cooldownSeconds: 96 * 3600 },
  { name: 'Greenhouse Gamble', tree: 'Greenhouse', tier: 3, points: 3, island: 'desert', description: '30% шанс получить +1 к урожаю тепличных культур' },
  { name: 'Slick Saver', tree: 'Greenhouse', tier: 3, points: 3, island: 'desert', description: '-1 нефть для выращивания тепличного урожая' },
  { name: 'Greasy Plants', tree: 'Greenhouse', tier: 3, points: 3, island: 'desert', description: '+1 к урожаю тепличных культур', debuffDescription: '+100% расхода нефти в теплице' },

  { name: "Rock'N'Roll", tree: 'Mining', tier: 1, points: 1, island: 'basic', description: '+0.1 камень' },
  { name: 'Iron Bumpkin', tree: 'Mining', tier: 1, points: 1, island: 'basic', description: '+0.1 железо' },
  { name: 'Speed Miner', tree: 'Mining', tier: 1, points: 1, island: 'basic', description: 'x0.8 Stone recovery time' },
  { name: 'Tap Prospector', tree: 'Mining', tier: 1, points: 1, island: 'basic', description: 'Минералы добываются за 1 нажатие' },
  { name: 'Forge-Ward Profits', tree: 'Mining', tier: 1, points: 1, island: 'basic', description: '+20% монет за доставки у Blacksmith' },
  { name: 'Iron Hustle', tree: 'Mining', tier: 2, points: 2, island: 'basic', description: 'x0.7 Iron recovery time' },
  { name: 'Frugal Miner', tree: 'Mining', tier: 2, points: 2, island: 'basic', description: 'x0.8 all pickaxes coin cost' },
  { name: 'Rocky Favor', tree: 'Mining', tier: 2, points: 2, island: 'basic', description: '+1 камень', debuffDescription: '-0.5 железо' },
  { name: 'Fire Kissed', tree: 'Mining', tier: 2, points: 2, island: 'basic', description: '+1 кримстоун при пятой добыче подряд' },
  { name: 'Midas Sprint', tree: 'Mining', tier: 2, points: 2, island: 'basic', description: 'x0.9 Gold recovery time' },
  { name: 'Ferrous Favor', tree: 'Mining', tier: 3, points: 3, island: 'basic', description: '+1 железо', debuffDescription: '-0.5 камень' },
  { name: 'Golden Touch', tree: 'Mining', tier: 3, points: 3, island: 'basic', description: '+0.5 золото' },
  { name: 'More Picks', tree: 'Mining', tier: 3, points: 3, island: 'basic', description: 'Увеличенный запас: +70 кирок, +20 каменных кирок, +7 железных кирок, +2 золотые кирки' },
  { name: 'Fireside Alchemist', tree: 'Mining', tier: 3, points: 3, island: 'basic', description: 'x0.85 Crimstone recovery time' },
  { name: 'Midas Rush', tree: 'Mining', tier: 3, points: 3, island: 'basic', description: 'x0.8 Gold recovery time' },

  { name: 'Fast Feasts', tree: 'Cooking', tier: 1, points: 1, island: 'basic', description: 'x0.9 Firepit and Kitchen cooking time' },
  { name: 'Nom Nom', tree: 'Cooking', tier: 1, points: 1, island: 'basic', description: '+10% дохода за доставки еды' },
  { name: 'Munching Mastery', tree: 'Cooking', tier: 1, points: 1, island: 'basic', description: '+5% к опыту бампкина' },
  { name: 'Swift Sizzle', tree: 'Cooking', tier: 1, points: 1, island: 'basic', description: 'x0.6 Fire Pit cooking time with oil' },
  { name: 'Frosted Cakes', tree: 'Cooking', tier: 2, points: 2, island: 'basic', description: 'x0.9 Cakes cooking time' },
  { name: 'Juicy Boost', tree: 'Cooking', tier: 2, points: 2, island: 'basic', description: '+10% к опыту бампкина с напитков' },
  { name: 'Turbo Fry', tree: 'Cooking', tier: 2, points: 2, island: 'basic', description: 'x0.5 Kitchen cooking time with oil' },
  { name: 'Drive-Through Deli', tree: 'Cooking', tier: 2, points: 2, island: 'basic', description: '+15% к опыту бампкина с блюд из закусочной' },
  { name: 'Instant Gratification', tree: 'Cooking', tier: 3, points: 3, island: 'basic', description: 'Возможность мгновенно завершить приготовление всех текущих блюд', cooldownSeconds: 96 * 3600 },
  { name: 'Double Nom', tree: 'Cooking', tier: 3, points: 3, island: 'basic', description: '+1 блюдо при готовке', debuffDescription: 'Блюда требуют в два раза больше ингредиентов' },
  { name: 'Fiery Jackpot', tree: 'Cooking', tier: 3, points: 3, island: 'basic', description: '20% шанс получить +1 блюдо в очаге' },
  { name: 'Fry Frenzy', tree: 'Cooking', tier: 3, points: 3, island: 'basic', description: 'x0.4 Deli cooking time with oil' },

  { name: 'Sweet Bonus', tree: 'Bees & Flowers', tier: 1, points: 1, island: 'spring', description: '+0.1 мёд с каждого улья' },
  { name: 'Hyper Bees', tree: 'Bees & Flowers', tier: 1, points: 1, island: 'spring', description: '+0.1 к скорости производства мёда' },
  { name: 'Blooming Boost', tree: 'Bees & Flowers', tier: 1, points: 1, island: 'spring', description: 'x0.9 Flower growth time' },
  { name: 'Flower Sale', tree: 'Bees & Flowers', tier: 1, points: 1, island: 'spring', description: 'x0.8 Flower Seeds cost' },
  { name: 'Buzzworthy Treats', tree: 'Bees & Flowers', tier: 2, points: 2, island: 'spring', description: '+10% к опыту бампкина за блюда из мёда' },
  { name: 'Blossom Bonding', tree: 'Bees & Flowers', tier: 2, points: 2, island: 'spring', description: '+2 к отношениям за дарение цветов' },
  { name: 'Pollen Power Up', tree: 'Bees & Flowers', tier: 2, points: 2, island: 'spring', description: '+0.1 к урожаю растений после опыления (всего +0.3)' },
  { name: 'Petalled Perk', tree: 'Bees & Flowers', tier: 2, points: 2, island: 'spring', description: '10% шанс получить +1 цветок' },
  { name: 'Bee Collective', tree: 'Bees & Flowers', tier: 3, points: 3, island: 'spring', description: '+20% к шансу появления пчелиного роя' },
  { name: 'Flower Power', tree: 'Bees & Flowers', tier: 3, points: 3, island: 'spring', description: 'x0.8 Flower growth time' },
  { name: 'Flowery Abode', tree: 'Bees & Flowers', tier: 3, points: 3, island: 'spring', description: '+0.5 к скорости производства мёда', debuffDescription: '+50% времени роста цветов' },
  { name: 'Petal Blessed', tree: 'Bees & Flowers', tier: 3, points: 3, island: 'spring', description: 'Возможность мгновенно вырастить все цветы', cooldownSeconds: 96 * 3600 },

  { name: 'Crop Extension Module I', tree: 'Machinery', tier: 1, points: 1, island: 'desert', description: 'Семена ревеня и цукини доступны для использования в агромашине' },
  { name: 'Crop Processor Unit', tree: 'Machinery', tier: 1, points: 1, island: 'desert', description: 'x0.95 Crop Machine growth time', debuffDescription: '+10% расхода нефти в агромашине' },
  { name: 'Oil Gadget', tree: 'Machinery', tier: 1, points: 1, island: 'desert', description: 'x0.9 Oil consumption in Crop Machine' },
  { name: 'Oil Extraction', tree: 'Machinery', tier: 1, points: 1, island: 'desert', description: '+1 нефть' },
  { name: 'Leak-Proof Tank', tree: 'Machinery', tier: 1, points: 1, island: 'desert', description: 'Тройной объем нефтяного бака в агромашине' },
  { name: 'Crop Extension Module II', tree: 'Machinery', tier: 2, points: 2, island: 'desert', description: 'Семена моркови и капусты доступны для использования в агромашине' },
  { name: 'Crop Extension Module III', tree: 'Machinery', tier: 2, points: 2, island: 'desert', description: 'Семена ямса и брокколи доступны для использования в агромашине' },
  { name: 'Rapid Rig', tree: 'Machinery', tier: 2, points: 2, island: 'desert', description: 'x0.8 Crop Machine growth time', debuffDescription: '+40% расхода нефти в агромашине' },
  { name: 'Oil Be Back', tree: 'Machinery', tier: 2, points: 2, island: 'desert', description: 'x0.8 Oil refill time' },
  { name: 'Oil Rig', tree: 'Machinery', tier: 2, points: 2, island: 'desert', description: 'Для крафта нефтяного бура нужно 20 шерсти вместо 10 кожи' },
  { name: 'Field Expansion Module', tree: 'Machinery', tier: 3, points: 3, island: 'desert', description: '+5 слотов в очереди в агромашине' },
  { name: 'Field Extension Module', tree: 'Machinery', tier: 3, points: 3, island: 'desert', description: '+5 грядок в агромашине' },
  { name: 'Efficiency Extension Module', tree: 'Machinery', tier: 3, points: 3, island: 'desert', description: 'x0.7 Oil consumption in Crop Machine' },
  { name: 'Grease Lightning', tree: 'Machinery', tier: 3, points: 3, island: 'desert', description: 'Возможность мгновенно восполнить нефтяные скважины', cooldownSeconds: 96 * 3600 },

  { name: 'Efficient Bin', tree: 'Compost', tier: 1, points: 1, island: 'basic', description: '+5 ростковая смесь' },
  { name: 'Turbo Charged', tree: 'Compost', tier: 1, points: 1, island: 'basic', description: '+5 фруктовая смесь' },
  { name: 'Wormy Treat', tree: 'Compost', tier: 1, points: 1, island: 'basic', description: '+1 червь' },
  { name: 'Feathery Business', tree: 'Compost', tier: 1, points: 1, island: 'basic', description: 'Используй перья вместо яиц для ускорения компостеров', debuffDescription: '2х перьев для ускорения компостеров' },
  { name: 'Sprout Surge', tree: 'Compost', tier: 1, points: 1, island: 'basic', description: 'Put Sprout Mix on all plots' },
  { name: 'Blend-tastic', tree: 'Compost', tier: 1, points: 1, island: 'basic', description: 'Put Fruitful Blend on all plots' },
  { name: 'Premium Worms', tree: 'Compost', tier: 2, points: 2, island: 'basic', description: '+10 стимулятор корней' },
  { name: 'Fruitful Bounty', tree: 'Compost', tier: 2, points: 2, island: 'basic', description: 'Двойной эффект от фруктовой смеси' },
  { name: 'Swift Decomposer', tree: 'Compost', tier: 2, points: 2, island: 'basic', description: 'x0.9 compost time' },
  { name: 'Composting Bonanza', tree: 'Compost', tier: 2, points: 2, island: 'basic', description: '+1 час к ускорению компостера', debuffDescription: 'Тратится х2 ресурсов для ускорения.' },
  { name: 'Root Rocket', tree: 'Compost', tier: 2, points: 2, island: 'basic', description: 'Put Rapid Root on all plots' },
  { name: 'Composting Overhaul', tree: 'Compost', tier: 3, points: 3, island: 'basic', description: '+2 червя' },
  { name: 'Composting Revamp', tree: 'Compost', tier: 3, points: 3, island: 'basic', description: '+5 удобрений', debuffDescription: '-2 червя' },

  { name: 'Cheap Rakes', tree: 'Aging', tier: 1, points: 1, island: 'basic', description: 'x0.8 salt rake coin cost' },
  { name: 'Speedy Aging', tree: 'Aging', tier: 1, points: 1, island: 'basic', description: 'x0.9 Fish Aging time' },
  { name: 'Salty Seas', tree: 'Aging', tier: 1, points: 1, island: 'basic', description: 'x0.9 salt charge replenishment time' },
  { name: 'Wide Rakes', tree: 'Aging', tier: 1, points: 1, island: 'basic', description: '+2 соли за сбор' },
  { name: 'Bacalhau', tree: 'Aging', tier: 1, points: 1, island: 'basic', description: '+1 наживка на стойке ферментации' },
  { name: 'Fish Smoking', tree: 'Aging', tier: 2, points: 2, island: 'basic', description: 'Удвоенный шанс, что выдержанная рыба станет премиум выдержанной' },
  { name: 'Refiner', tree: 'Aging', tier: 2, points: 2, island: 'basic', description: '15% шанс получить +1 очищенной соли' },
  { name: 'Sea Blessed', tree: 'Aging', tier: 2, points: 2, island: 'basic', description: '5% шанс восстановить 1 заряд у 4 соляных узлов при сборе' },
  { name: 'Ager', tree: 'Aging', tier: 3, points: 3, island: 'basic', description: '2х к производству на всех полках сарая выдержки', debuffDescription: '2х затраты в сарае выдержки (ингредиенты, рыба и соль)' },
  { name: 'Salt Surge', tree: 'Aging', tier: 3, points: 3, island: 'basic', description: 'Перезарядить все соляные узлы', cooldownSeconds: 72 * 3600 },
];

/**
 * Ранговые эффекты — по одному объекту на каждый навык, у которого в игре
 * есть `upgrade` (143 из 153; см. BASE_SKILLS выше). Числа взяты напрямую из
 * BUMPKIN_REVAMP_SKILL_TREE[name].upgrade в bumpkinSkills.ts (maxLevel везде
 * равен 3 — в текущей версии игры других значений нет).
 */
const SKILL_UPGRADES: Record<string, SkillUpgrade> = {
  'Green Thumb': { maxLevel: 3, effect: { kind: 'growthMultiplier', ranks: [0.95, 0.94, 0.925] } },
  'Young Farmer': { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [0.1, 0.125, 0.15] } },
  'Experienced Farmer': { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [0.1, 0.125, 0.15] } },
  'Old Farmer': { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [0.1, 0.125, 0.15] } },
  'Chonky Scarecrow': { maxLevel: 3, effect: { kind: 'aoe', ranks: [{ xLeft: 3, xRight: 3, depth: 7 }, { xLeft: 4, xRight: 3, depth: 8 }, { xLeft: 4, xRight: 4, depth: 9 }], aoeYield: [0, 0.05, 0.1] } },
  "Betty's Friend": { maxLevel: 3, effect: { kind: 'coinBonus', ranks: [0.3, 0.45, 0.6] } },
  'Strong Roots': { maxLevel: 3, effect: { kind: 'growthMultiplier', ranks: [0.9, 0.875, 0.85] } },
  'Coin Swindler': { maxLevel: 3, effect: { kind: 'coinBonus', ranks: [0.1, 0.2, 0.3] } },
  'Golden Sunflower': { maxLevel: 3, effect: { kind: 'dropChance', ranks: [1 / 7, 1 / 5.5, 1 / 4] } },
  'Horror Mike': { maxLevel: 3, effect: { kind: 'aoe', ranks: [{ xLeft: 3, xRight: 3, depth: 7 }, { xLeft: 4, xRight: 3, depth: 8 }, { xLeft: 4, xRight: 4, depth: 9 }], aoeYield: [0.1, 0.15, 0.2] } },
  "Laurie's Gains": { maxLevel: 3, effect: { kind: 'aoe', ranks: [{ xLeft: 3, xRight: 3, depth: 7 }, { xLeft: 4, xRight: 3, depth: 8 }, { xLeft: 4, xRight: 4, depth: 9 }], aoeYield: [0.1, 0.15, 0.2] } },
  'Instant Growth': { maxLevel: 3, effect: { kind: 'cooldown', ranks: [259200000, 216000000, 172800000] } },
  'Acre Farm': { maxLevel: 3, effect: { kind: 'yieldWithDebuff', buff: [1, 1.4, 1.8], debuff: [0.5, 0.6, 0.7] } },
  'Hectare Farm': { maxLevel: 3, effect: { kind: 'yieldWithDebuff', buff: [1, 1.4, 1.8], debuff: [0.5, 0.6, 0.7] } },
  'Fruitful Fumble': { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [0.1, 0.15, 0.2] } },
  'Fruity Heaven': { maxLevel: 3, effect: { kind: 'costMultiplier', ranks: [0.9, 0.85, 0.8] } },
  'Fruity Profit': { maxLevel: 3, effect: { kind: 'coinBonus', ranks: [0.5, 0.75, 1] } },
  'Loyal Macaw': { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [0.2, 0.25, 0.3] } },
  'No Axe No Worries': { maxLevel: 3, effect: { kind: 'flatDebuff', ranks: [1, 0.9, 0.8] } },
  Catchup: { maxLevel: 3, effect: { kind: 'growthMultiplier', ranks: [0.9, 0.85, 0.8] } },
  'Fruity Woody': { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [1, 1.25, 1.5] } },
  'Pear Turbocharge': { maxLevel: 3, effect: { kind: 'multiplier', ranks: [2, 3, 4] } },
  'Crime Fruit': { maxLevel: 3, effect: { kind: 'stockBonus', ranks: { 'Tomato Seed': [10, 25, 50], 'Lemon Seed': [10, 25, 50] } } },
  'Generous Orchard': { maxLevel: 3, effect: { kind: 'chance', ranks: [20, 30, 50] } },
  'Long Pickings': { maxLevel: 3, effect: { kind: 'growthWithDebuff', buff: [0.75, 0.65, 0.55], debuff: [1.1, 1.125, 1.15] } },
  'Short Pickings': { maxLevel: 3, effect: { kind: 'growthWithDebuff', buff: [0.75, 0.65, 0.55], debuff: [1.1, 1.125, 1.15] } },
  'Zesty Vibes': { maxLevel: 3, effect: { kind: 'yieldWithDebuff', buff: [1, 1.5, 2], debuff: [0.25, 0.4, 0.5] } },
  "Lumberjack's Extra": { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [0.1, 0.15, 0.2] } },
  'Tree Charge': { maxLevel: 3, effect: { kind: 'growthMultiplier', ranks: [0.9, 0.875, 0.85] } },
  'More Axes': { maxLevel: 3, effect: { kind: 'stockBonus', ranks: { Axe: [50, 100, 150] } } },
  'Tough Tree': { maxLevel: 3, effect: { kind: 'chance', ranks: [10, 20, 30] } },
  "Feller's Discount": { maxLevel: 3, effect: { kind: 'costMultiplier', ranks: [0.8, 0.75, 0.7] } },
  'Money Tree': { maxLevel: 3, effect: { kind: 'chance', ranks: [1, 2, 3] } },
  'Tree Turnaround': { maxLevel: 3, effect: { kind: 'chance', ranks: [15, 25, 35] } },
  'Tree Blitz': { maxLevel: 3, effect: { kind: 'cooldown', ranks: [86400000, 64800000, 43200000] } },
  "Fisherman's 5 Fold": { maxLevel: 3, effect: { kind: 'dailyLimit', ranks: [5, 7, 10] } },
  'Fishy Chance': { maxLevel: 3, effect: { kind: 'chance', ranks: [10, 12.5, 15] } },
  'Fishy Roll': { maxLevel: 3, effect: { kind: 'chance', ranks: [10, 12.5, 15] } },
  'Reel Deal': { maxLevel: 3, effect: { kind: 'costMultiplier', ranks: [0.5, 0.45, 0.4] } },
  "Fisherman's 10 Fold": { maxLevel: 3, effect: { kind: 'dailyLimit', ranks: [10, 18, 25] } },
  'Fishy Fortune': { maxLevel: 3, effect: { kind: 'coinBonus', ranks: [1, 1.25, 1.5] } },
  'Fishy Gamble': { maxLevel: 3, effect: { kind: 'chance', ranks: [20, 25, 30] } },
  'Frenzied Fish': { maxLevel: 3, effect: { kind: 'frenziedFish', flat: [1, 2, 3], crit: [50, 50, 0] } },
  'More With Less': { maxLevel: 3, effect: { kind: 'dailyLimit', ranks: [10, 25, 50] } },
  'Fishy Feast': { maxLevel: 3, effect: { kind: 'xpBonus', ranks: [0.2, 0.3, 0.4] } },
  'Efficient Feeding': { maxLevel: 3, effect: { kind: 'costMultiplier', ranks: [0.95, 0.94, 0.925] } },
  'Restless Animals': { maxLevel: 3, effect: { kind: 'growthMultiplier', ranks: [0.9, 0.85, 0.8] } },
  'Fine Fibers': { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [0.1, 0.15, 0.2] } },
  'Bountiful Bounties': { maxLevel: 3, effect: { kind: 'coinBonus', ranks: [0.5, 0.75, 1] } },
  'Double Bale': { maxLevel: 3, effect: { kind: 'multiplier', ranks: [2, 2.5, 3] } },
  Featherweight: { maxLevel: 3, effect: { kind: 'yieldWithDebuff', buff: [0.35, 0.45, 0.55], debuff: [0.1, 0.15, 0.2] } },
  'Abundant Harvest': { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [0.2, 0.35, 0.5] } },
  'Heartwarming Instruments': { maxLevel: 3, effect: { kind: 'xpBonus', ranks: [0.5, 0.6, 0.7] } },
  'Kale Mix': { maxLevel: 3, effect: { kind: 'flatBonus', ranks: [3, 2.5, 2] } },
  'Healthy Livestock': { maxLevel: 3, effect: { kind: 'sicknessWithSpread', sickness: [0.5, 0.5, 0.5], spread: [1, 0.5, 0.01] } },
  'Merino Whisperer': { maxLevel: 3, effect: { kind: 'yieldWithDebuff', buff: [0.35, 0.6, 0.9], debuff: [0.1, 0.15, 0.2] } },
  'Clucky Grazing': { maxLevel: 3, effect: { kind: 'costWithDebuff', buff: [0.75, 0.65, 0.5], debuff: [1.5, 1.55, 1.65] } },
  'Sheepwise Diet': { maxLevel: 3, effect: { kind: 'costWithDebuff', buff: [0.75, 0.65, 0.5], debuff: [1.5, 1.55, 1.65] } },
  'Cow-Smart Nutrition': { maxLevel: 3, effect: { kind: 'costWithDebuff', buff: [0.75, 0.65, 0.5], debuff: [1.5, 1.55, 1.65] } },
  'Chonky Feed': { maxLevel: 3, effect: { kind: 'xpWithFeedDebuff', xp: [2, 2.5, 3], feed: [1.5, 1.75, 2] } },
  'Leathercraft Mastery': { maxLevel: 3, effect: { kind: 'yieldWithDebuff', buff: [0.35, 0.6, 0.8], debuff: [0.1, 0.15, 0.2] } },
  'Barnyard Rouse': { maxLevel: 3, effect: { kind: 'cooldown', ranks: [432000000, 345600000, 302400000] } },
  'Glass Room': { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [0.1, 0.15, 0.2] } },
  'Seedy Business': { maxLevel: 3, effect: { kind: 'costMultiplier', ranks: [0.85, 0.8, 0.75] } },
  'Rice and Shine': { maxLevel: 3, effect: { kind: 'growthMultiplier', ranks: [0.95, 0.94, 0.925] } },
  "Victoria's Secretary": { maxLevel: 3, effect: { kind: 'coinBonus', ranks: [0.5, 0.75, 1] } },
  'Olive Express': { maxLevel: 3, effect: { kind: 'growthMultiplier', ranks: [0.9, 0.85, 0.8] } },
  'Rice Rocket': { maxLevel: 3, effect: { kind: 'growthMultiplier', ranks: [0.9, 0.85, 0.8] } },
  'Vine Velocity': { maxLevel: 3, effect: { kind: 'growthMultiplier', ranks: [0.9, 0.85, 0.8] } },
  'Seeded Bounty': { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [0.5, 0.75, 1] } },
  'Greenhouse Guru': { maxLevel: 3, effect: { kind: 'cooldown', ranks: [345600000, 302400000, 259200000] } },
  'Greenhouse Gamble': { maxLevel: 3, effect: { kind: 'chance', ranks: [30, 40, 50] } },
  'Slick Saver': { maxLevel: 3, effect: { kind: 'flatReduction', ranks: [1, 1.5, 2] } },
  'Greasy Plants': { maxLevel: 3, effect: { kind: 'yieldWithOilDebuff', yield: [1, 1.5, 2], oilMultiplier: [2, 3, 4] } },
  "Rock'N'Roll": { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [0.1, 0.15, 0.2] } },
  'Iron Bumpkin': { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [0.1, 0.15, 0.2] } },
  'Speed Miner': { maxLevel: 3, effect: { kind: 'growthMultiplier', ranks: [0.8, 0.75, 0.7] } },
  'Forge-Ward Profits': { maxLevel: 3, effect: { kind: 'coinBonus', ranks: [0.2, 0.3, 0.4] } },
  'Iron Hustle': { maxLevel: 3, effect: { kind: 'growthMultiplier', ranks: [0.7, 0.65, 0.6] } },
  'Frugal Miner': { maxLevel: 3, effect: { kind: 'costMultiplier', ranks: [0.8, 0.7, 0.6] } },
  'Rocky Favor': { maxLevel: 3, effect: { kind: 'yieldWithDebuff', buff: [1, 1.4, 1.8], debuff: [0.5, 0.6, 0.7] } },
  'Fire Kissed': { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [1, 1.35, 1.75] } },
  'Midas Sprint': { maxLevel: 3, effect: { kind: 'growthMultiplier', ranks: [0.9, 0.875, 0.85] } },
  'Ferrous Favor': { maxLevel: 3, effect: { kind: 'yieldWithDebuff', buff: [1, 1.5, 2], debuff: [0.5, 0.6, 0.7] } },
  'Golden Touch': { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [0.5, 0.75, 1] } },
  'More Picks': { maxLevel: 3, effect: { kind: 'stockBonus', ranks: { Pickaxe: [70, 140, 280], 'Stone Pickaxe': [20, 40, 80], 'Iron Pickaxe': [7, 14, 28], 'Gold Pickaxe': [2, 4, 8] } } },
  'Fireside Alchemist': { maxLevel: 3, effect: { kind: 'growthMultiplier', ranks: [0.85, 0.75, 0.6] } },
  'Midas Rush': { maxLevel: 3, effect: { kind: 'growthMultiplier', ranks: [0.8, 0.75, 0.7] } },
  'Fast Feasts': { maxLevel: 3, effect: { kind: 'timeReduction', ranks: [0.1, 0.15, 0.2] } },
  'Nom Nom': { maxLevel: 3, effect: { kind: 'coinBonus', ranks: [0.1, 0.3, 0.5] } },
  'Munching Mastery': { maxLevel: 3, effect: { kind: 'xpBonus', ranks: [0.05, 0.075, 0.1] } },
  'Swift Sizzle': { maxLevel: 3, effect: { kind: 'timeReduction', ranks: [0.4, 0.45, 0.5] } },
  'Frosted Cakes': { maxLevel: 3, effect: { kind: 'timeReduction', ranks: [0.1, 0.2, 0.3] } },
  'Juicy Boost': { maxLevel: 3, effect: { kind: 'xpBonus', ranks: [0.1, 0.2, 0.3] } },
  'Turbo Fry': { maxLevel: 3, effect: { kind: 'timeReduction', ranks: [0.5, 0.55, 0.6] } },
  'Drive-Through Deli': { maxLevel: 3, effect: { kind: 'xpBonus', ranks: [0.15, 0.2, 0.25] } },
  'Instant Gratification': { maxLevel: 3, effect: { kind: 'cooldown', ranks: [345600000, 302400000, 259200000] } },
  'Double Nom': { maxLevel: 3, effect: { kind: 'doubleNom', food: [1, 2, 3], ingredients: [2, 3, 4] } },
  'Fiery Jackpot': { maxLevel: 3, effect: { kind: 'chance', ranks: [20, 35, 50] } },
  'Fry Frenzy': { maxLevel: 3, effect: { kind: 'timeReduction', ranks: [0.6, 0.65, 0.7] } },
  'Sweet Bonus': { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [0.1, 0.15, 0.2] } },
  'Hyper Bees': { maxLevel: 3, effect: { kind: 'productionRate', ranks: [0.1, 0.15, 0.2] } },
  'Blooming Boost': { maxLevel: 3, effect: { kind: 'growthMultiplier', ranks: [0.9, 0.875, 0.85] } },
  'Flower Sale': { maxLevel: 3, effect: { kind: 'costMultiplier', ranks: [0.8, 0.75, 0.7] } },
  'Buzzworthy Treats': { maxLevel: 3, effect: { kind: 'xpBonus', ranks: [0.1, 0.2, 0.3] } },
  'Blossom Bonding': { maxLevel: 3, effect: { kind: 'flatBonus', ranks: [2, 3, 4] } },
  'Pollen Power Up': { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [0.1, 0.15, 0.2] } },
  'Petalled Perk': { maxLevel: 3, effect: { kind: 'chance', ranks: [10, 17.5, 25] } },
  'Bee Collective': { maxLevel: 3, effect: { kind: 'chance', ranks: [20, 27.5, 35] } },
  'Flower Power': { maxLevel: 3, effect: { kind: 'growthMultiplier', ranks: [0.8, 0.7, 0.6] } },
  'Flowery Abode': { maxLevel: 3, effect: { kind: 'rateWithGrowthDebuff', rate: [0.5, 0.75, 1], growth: [1.5, 1.6, 1.7] } },
  'Petal Blessed': { maxLevel: 3, effect: { kind: 'cooldown', ranks: [345600000, 302400000, 259200000] } },
  'Crop Processor Unit': { maxLevel: 3, effect: { kind: 'growthWithOilDebuff', growth: [0.95, 0.9, 0.85], oilPenalty: [0.1, 0.15, 0.2] } },
  'Oil Gadget': { maxLevel: 3, effect: { kind: 'oilReduction', ranks: [0.1, 0.15, 0.2] } },
  'Oil Extraction': { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [1, 1.5, 2] } },
  'Leak-Proof Tank': { maxLevel: 3, effect: { kind: 'multiplier', ranks: [3, 4, 5] } },
  'Rapid Rig': { maxLevel: 3, effect: { kind: 'growthWithOilDebuff', growth: [0.8, 0.7, 0.6], oilPenalty: [0.4, 0.5, 0.6] } },
  'Oil Be Back': { maxLevel: 3, effect: { kind: 'growthMultiplier', ranks: [0.8, 0.7, 0.6] } },
  'Oil Rig': { maxLevel: 3, effect: { kind: 'flatBonus', ranks: [20, 15, 10] } },
  'Field Expansion Module': { maxLevel: 3, effect: { kind: 'flatBonus', ranks: [5, 7, 10] } },
  'Field Extension Module': { maxLevel: 3, effect: { kind: 'flatBonus', ranks: [5, 7, 10] } },
  'Efficiency Extension Module': { maxLevel: 3, effect: { kind: 'oilReduction', ranks: [0.3, 0.4, 0.5] } },
  'Grease Lightning': { maxLevel: 3, effect: { kind: 'cooldown', ranks: [345600000, 302400000, 259200000] } },
  'Efficient Bin': { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [5, 7, 9] } },
  'Turbo Charged': { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [5, 7, 9] } },
  'Wormy Treat': { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [1, 2, 3] } },
  'Feathery Business': { maxLevel: 3, effect: { kind: 'costMultiplier', ranks: [2, 1.5, 1] } },
  'Premium Worms': { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [10, 15, 20] } },
  'Fruitful Bounty': { maxLevel: 3, effect: { kind: 'multiplier', ranks: [2, 3, 4] } },
  'Swift Decomposer': { maxLevel: 3, effect: { kind: 'growthMultiplier', ranks: [0.9, 0.875, 0.85] } },
  'Composting Bonanza': { maxLevel: 3, effect: { kind: 'flatTimeBonus', ranks: [3600000, 5400000, 7200000] } },
  'Composting Overhaul': { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [2, 5, 8] } },
  'Composting Revamp': { maxLevel: 3, effect: { kind: 'yieldWithDebuff', buff: [5, 8, 10], debuff: [2, 3, 4] } },
  'Cheap Rakes': { maxLevel: 3, effect: { kind: 'costMultiplier', ranks: [0.8, 0.7, 0.6] } },
  'Speedy Aging': { maxLevel: 3, effect: { kind: 'growthMultiplier', ranks: [0.9, 0.85, 0.8] } },
  'Salty Seas': { maxLevel: 3, effect: { kind: 'growthMultiplier', ranks: [0.9, 0.85, 0.8] } },
  'Wide Rakes': { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [2, 3, 4] } },
  Bacalhau: { maxLevel: 3, effect: { kind: 'additiveYield', ranks: [1, 2, 3] } },
  'Fish Smoking': { maxLevel: 3, effect: { kind: 'multiplier', ranks: [2, 3, 4] } },
  Refiner: { maxLevel: 3, effect: { kind: 'chance', ranks: [15, 25, 35] } },
  'Sea Blessed': { maxLevel: 3, effect: { kind: 'chance', ranks: [5, 6.5, 8] } },
  Ager: { maxLevel: 3, effect: { kind: 'multiplier', ranks: [2, 3, 4] } },
  'Salt Surge': { maxLevel: 3, effect: { kind: 'cooldown', ranks: [259200000, 216000000, 172800000] } },
};

/**
 * Иконки навыков — сгенерировано scripts/sync-skill-icons.ts (см.
 * scripts/skill-icon-map.json). Покрывает навыки, чья иконка в игре — либо
 * отдельный спрайт (assets/icons/skill_icons/...), либо переиспользует
 * иконку игрового предмета (ITEM_DETAILS), либо это отдельный "бейдж" навыка
 * на игровом CDN (sunflower-land.com/game-assets/skills/land/...,
 * подтверждено достижимым напрямую — см. green_thumb_LE.png) — все три
 * реально скачаны и лежат в public/sprites. Только навыки, у которых в
 * исходниках игры вообще нет поля `image`, сюда не попадают — для них
 * SkillCard рисует эмодзи дерева (SKILL_TREE_EMOJI).
 */
const SKILL_ICONS: Record<string, string> = {
  'Green Thumb': '/sprites/skills/land/crops/green_thumb_LE.png',
  'Young Farmer': '/sprites/crops/sunflower/crop.png',
  'Experienced Farmer': '/sprites/crops/cauliflower/crop.png',
  'Old Farmer': '/sprites/crops/wheat/crop.png',
  'Chonky Scarecrow': '/sprites/sfts/aoe/basic_scarecrow.png',
  'Strong Roots': '/sprites/icons/skill_icons/strong_roots.png',
  'Coin Swindler': '/sprites/buildings/bettys_market.png',
  'Golden Sunflower': '/sprites/skills/land/crops/golden_flowers.png',
  'Horror Mike': '/sprites/sfts/aoe/scary_mike.png',
  "Laurie's Gains": '/sprites/sfts/aoe/laurie.png',
  'Instant Growth': '/sprites/skills/land/crops/cultivator.png',
  'Acre Farm': '/sprites/crops/kale/crop.png',
  'Hectare Farm': '/sprites/crops/carrot/crop.png',
  'Fruity Heaven': '/sprites/icons/skill_icons/fruity_heaven.png',
  'No Axe No Worries': '/sprites/tools/axe.png',
  'Catchup': '/sprites/icons/skill_icons/catchup.png',
  'Crime Fruit': '/sprites/icons/skill_icons/crime_fruit.png',
  'Generous Orchard': '/sprites/icons/skill_icons/generous_orchard.png',
  'Long Pickings': '/sprites/fruit/apple_banana.png',
  'Short Pickings': '/sprites/fruit/orange_blueberry.png',
  'Zesty Vibes': '/sprites/fruit/tomato_lemon.png',
  "Lumberjack's Extra": '/sprites/skills/land/trees/lumberjack_LE.png',
  'More Axes': '/sprites/icons/skill_icons/more_axes.png',
  'Insta-Chop': '/sprites/icons/skill_icons/insta_chop.png',
  'Tough Tree': '/sprites/skills/land/trees/tough_tree.png',
  "Feller's Discount": '/sprites/icons/skill_icons/fellers_discount.png',
  'Money Tree': '/sprites/skills/land/trees/money_tree.png',
  'Tree Turnaround': '/sprites/icons/skill_icons/tree_turnaround.png',
  'Tree Blitz': '/sprites/icons/skill_icons/Treeblitz.png',
  'Fishy Chance': '/sprites/fish/anchovy.png',
  'Fishy Roll': '/sprites/fish/red_snapper.png',
  'Reel Deal': '/sprites/icons/skill_icons/reel_deal.png',
  "Fisherman's 10 Fold": '/sprites/icons/skill_icons/fishermans_10_fold.png',
  'Fishy Gamble': '/sprites/fish/tuna.png',
  'Frenzied Fish': '/sprites/icons/fish_frenzy.webp',
  'More With Less': '/sprites/icons/skill_icons/more_with_less.png',
  'Fishy Feast': '/sprites/icons/skill_icons/fishy_feast.png',
  'Restless Animals': '/sprites/icons/skill_icons/restless_animals.png',
  'Fine Fibers': '/sprites/icons/skill_icons/fine_fibers.png',
  'Double Bale': '/sprites/icons/skill_icons/double_bale.png',
  'Bale Economy': '/sprites/icons/skill_icons/bale_economy.png',
  'Abundant Harvest': '/sprites/icons/skill_icons/abundant_harvest.png',
  'Heartwarming Instruments': '/sprites/icons/skill_icons/heartwarming_instruments.png',
  'Kale Mix': '/sprites/icons/skill_icons/kale_mix.png',
  'Healthy Livestock': '/sprites/animals/chickens/sick.webp',
  'Chonky Feed': '/sprites/icons/skill_icons/chonky_feed.png',
  'Barnyard Rouse': '/sprites/icons/skill_icons/barnyard_rouse.png',
  'Glass Room': '/sprites/icons/skill_icons/glass_room.png',
  'Seedy Business': '/sprites/icons/skill_icons/seedybusiness.png',
  'Rice and Shine': '/sprites/icons/skill_icons/riceandshine.png',
  'Seeded Bounty': '/sprites/icons/skill_icons/seedybounty.png',
  'Greenhouse Guru': '/sprites/icons/skill_icons/guru.png',
  'Greenhouse Gamble': '/sprites/icons/skill_icons/gamble.png',
  'Greasy Plants': '/sprites/icons/skill_icons/greasy.png',
  'Speed Miner': '/sprites/resources/stone_small.png',
  'Iron Hustle': '/sprites/resources/iron_small.png',
  'Frugal Miner': '/sprites/icons/skill_icons/frugal_miner.png',
  'Rocky Favor': '/sprites/icons/skill_icons/rocky_favor.png',
  'Fire Kissed': '/sprites/resources/crimstone/crimstone_rock_5.webp',
  'Midas Sprint': '/sprites/icons/skill_icons/midas_sprint.png',
  'Ferrous Favor': '/sprites/icons/skill_icons/ferrous_favor.png',
  'Golden Touch': '/sprites/icons/skill_icons/golden_touch.png',
  'Fireside Alchemist': '/sprites/icons/skill_icons/fireside_alchemist.png',
  'Midas Rush': '/sprites/icons/skill_icons/midas_rush.png',
  'Nom Nom': '/sprites/icons/skill_icons/nom_nom.png',
  'Munching Mastery': '/sprites/icons/xp.png',
  'Swift Sizzle': '/sprites/icons/skill_icons/swift_sizzle.png',
  'Turbo Fry': '/sprites/icons/skill_icons/turbo_fry.png',
  'Instant Gratification': '/sprites/icons/skill_icons/InstantGratification.webp',
  'Double Nom': '/sprites/icons/skill_icons/double_nom.png',
  'Fiery Jackpot': '/sprites/icons/skill_icons/fiery_jackpot.png',
  'Fry Frenzy': '/sprites/icons/skill_icons/fry_frenzy.png',
  'Hyper Bees': '/sprites/icons/skill_icons/Hyperbees.png',
  'Flower Sale': '/sprites/icons/skill_icons/flowersale.png',
  'Buzzworthy Treats': '/sprites/food/cakes/honey_cake.png',
  'Blossom Bonding': '/sprites/icons/skill_icons/Bonding.png',
  'Pollen Power Up': '/sprites/icons/skill_icons/Pollen.png',
  'Petalled Perk': '/sprites/flowers/red_lotus.webp',
  'Flower Power': '/sprites/sfts/dawn_flower.png',
  'Flowery Abode': '/sprites/icons/skill_icons/Abode.png',
  'Petal Blessed': '/sprites/flowers/prism_petal.webp',
  'Crop Extension Module I': '/sprites/icons/skill_icons/rhubarb_zucchini.png',
  'Crop Processor Unit': '/sprites/icons/timer.png',
  'Oil Gadget': '/sprites/icons/skill_icons/oil_gadget.png',
  'Leak-Proof Tank': '/sprites/icons/skill_icons/oil_tank.png',
  'Crop Extension Module II': '/sprites/icons/skill_icons/crop_extension_module.png',
  'Crop Extension Module III': '/sprites/icons/skill_icons/yam_broccoli.png',
  'Oil Be Back': '/sprites/icons/skill_icons/oil_be_back.png',
  'Oil Rig': '/sprites/icons/oil_drill.webp',
  'Field Expansion Module': '/sprites/icons/skill_icons/field_expansion_module.png',
  'Field Extension Module': '/sprites/icons/skill_icons/field_extension_module.png',
  'Efficiency Extension Module': '/sprites/icons/skill_icons/efficiency_extension_module.png',
  'Grease Lightning': '/sprites/icons/skill_icons/grease_lightning.png',
  'Sprout Surge': '/sprites/icons/skill_icons/Sproutsurge.png',
  'Blend-tastic': '/sprites/icons/skill_icons/Blend-tastic.png',
  'Fruitful Bounty': '/sprites/icons/skill_icons/fruitful_bounty.png',
  'Root Rocket': '/sprites/icons/skill_icons/Rootrocket.png',
  'Composting Overhaul': '/sprites/icons/skill_icons/composting_overhaul.png',
  'Cheap Rakes': '/sprites/icons/skill_icons/cheap_rakes.webp',
  'Speedy Aging': '/sprites/icons/skill_icons/speedy_aging.webp',
  'Salty Seas': '/sprites/icons/skill_icons/salty_seas.webp',
  'Wide Rakes': '/sprites/icons/skill_icons/wide_rakes.webp',
  'Bacalhau': '/sprites/icons/skill_icons/bacalhau.webp',
  'Fish Smoking': '/sprites/icons/skill_icons/fish_smoking.webp',
  'Refiner': '/sprites/icons/skill_icons/refiner.webp',
  'Sea Blessed': '/sprites/icons/skill_icons/sea_blessed.webp',
  'Ager': '/sprites/icons/skill_icons/ager.webp',
  'Salt Surge': '/sprites/icons/skill_icons/salt_surge.webp',
};

/** Эмодзи-заглушка по дереву — для навыков без своего спрайта (SKILL_ICONS). */
export const SKILL_TREE_EMOJI: Record<SkillTree, string> = {
  Crops: '🌾',
  'Fruit Patch': '🍎',
  Trees: '🌳',
  Fishing: '🎣',
  Animals: '🐔',
  Greenhouse: '🌿',
  Mining: '⛏️',
  Cooking: '🍳',
  'Bees & Flowers': '🐝',
  Machinery: '⚙️',
  Compost: '🪱',
  Aging: '🧂',
};

/** Полный список навыков — базовые данные + подмешанные ранговые эффекты и иконка (там, где они есть). */
export const SKILLS: Skill[] = BASE_SKILLS.map((s) => {
  const upgrade = SKILL_UPGRADES[s.name];
  const icon = SKILL_ICONS[s.name];
  return { ...s, ...(upgrade ? { upgrade } : {}), ...(icon ? { icon } : {}) };
});

/** Навыки одного дерева, в исходном порядке (тир 1 → 2 → 3). */
export function skillsForTree(tree: SkillTree): Skill[] {
  return SKILLS.filter((s) => s.tree === tree);
}

/** Сколько очков нужно, чтобы выучить все навыки дерева целиком (без рангов — только базовое изучение). */
export function totalPointsForTree(tree: SkillTree): number {
  return skillsForTree(tree).reduce((sum, s) => sum + s.points, 0);
}

// Очки навыков за одно повышение ранга, по тиру навыка (не зависит от того,
// какой именно ранг покупается — см. getSkillUpgradeCost в bumpkinSkills.ts).
const UPGRADE_POINTS_BY_TIER: Record<SkillTier, number> = { 1: 1, 2: 3, 3: 6 };

/** Стоимость одного повышения ранга (rank-up) для навыка данного тира: очки + Осколки Возвышения. Фиксированная — не зависит от текущего ранга. */
export function getSkillRankUpCost(tier: SkillTier): { points: number; shards: number } {
  return { shards: tier, points: UPGRADE_POINTS_BY_TIER[tier] };
}

/** Тир ветки, который должен быть открыт, чтобы купить ранг currentRank+1 у навыка данного тира (getSkillUpgradeTierRequirement в bumpkinSkills.ts). */
export function getSkillRankTierRequirement(tier: SkillTier, currentRank: number): SkillTier {
  return Math.min(3, tier + currentRank) as SkillTier;
}

/**
 * Сколько очков навыков нужно накопить в дереве (за счёт изученных навыков
 * тира 1 и 2 — тир 3 в сумму не входит), чтобы открыть тир 2 и тир 3 этого же
 * дерева. Источник: SKILL_POINTS_PER_TIER в choseSkill.ts игры — как и там,
 * это НЕ стоимость покупки, а порог для getUnlockedTierForTree.
 */
export const SKILL_POINTS_PER_TIER: Record<SkillTree, Record<2 | 3, number>> = {
  Crops: { 2: 3, 3: 7 },
  Trees: { 2: 2, 3: 5 },
  Fishing: { 2: 2, 3: 5 },
  Mining: { 2: 3, 3: 7 },
  Cooking: { 2: 2, 3: 5 },
  Compost: { 2: 3, 3: 7 },
  'Fruit Patch': { 2: 2, 3: 5 },
  Animals: { 2: 4, 3: 8 },
  'Bees & Flowers': { 2: 2, 3: 5 },
  Greenhouse: { 2: 2, 3: 5 },
  Machinery: { 2: 2, 3: 5 },
  Aging: { 2: 3, 3: 7 },
};

/**
 * Какой тир дерева сейчас открыт при данной сборке (getUnlockedTierForTree в
 * choseSkill.ts игры) — считает только БАЗОВУЮ стоимость изученных навыков
 * тира 1 и 2 этого дерева (без очков за ранги и без навыков тира 3).
 */
export function getUnlockedTierForTree(tree: SkillTree, ranks: Readonly<Record<string, number>>): SkillTier {
  const spent = skillsForTree(tree).reduce((sum, s) => {
    if (s.tier === 3) return sum;
    return (ranks[s.name] ?? 0) > 0 ? sum + s.points : sum;
  }, 0);
  const thresholds = SKILL_POINTS_PER_TIER[tree];
  if (spent >= thresholds[3]) return 3;
  if (spent >= thresholds[2]) return 2;
  return 1;
}

/**
 * Максимальный ранг, который можно купить для этого навыка ПРИ ТЕКУЩЕЙ
 * сборке остальных навыков дерева (собственный текущий ранг навыка в расчёт
 * не берётся — функция сама решает, можно ли его вообще изучить/прокачать).
 * 0 значит "тир дерева ещё не открыт — недоступен".
 */
export function maxAchievableRank(skill: Skill, ranks: Readonly<Record<string, number>>): number {
  const others: Record<string, number> = { ...ranks };
  delete others[skill.name];

  const tierWithoutSelf = getUnlockedTierForTree(skill.tree, others);
  if (skill.tier > tierWithoutSelf) return 0;

  if (!skill.upgrade) return 1;

  const withSelf = { ...others, [skill.name]: 1 };
  const tierWithSelf = getUnlockedTierForTree(skill.tree, withSelf);

  let rank = 1;
  while (rank < skill.upgrade.maxLevel) {
    const required = getSkillRankTierRequirement(skill.tier, rank);
    if (tierWithSelf < required) break;
    rank++;
  }
  return rank;
}

/**
 * Приводит выбранную сборку в согласованное состояние: если удаление/снижение
 * одного навыка "выбивает" тир дерева, на котором держались другие уже
 * выбранные ранги, они подрезаются до максимально всё ещё доступного ранга.
 * Идемпотентна; сходится за несколько проходов (каждый проход может только
 * уменьшать очки, поэтому процесс монотонный и конечный).
 */
export function normalizeRanks(ranks: Readonly<Record<string, number>>): Record<string, number> {
  const current: Record<string, number> = { ...ranks };
  for (let pass = 0; pass < 20; pass++) {
    let changed = false;
    for (const skill of SKILLS) {
      const cur = current[skill.name] ?? 0;
      if (cur <= 0) continue;
      const max = maxAchievableRank(skill, current);
      if (cur > max) {
        if (max <= 0) delete current[skill.name];
        else current[skill.name] = max;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return current;
}

/** Суммарная стоимость (очки + осколки), чтобы поднять навык до ранга `rank` включительно (0 = не выучен, 1 = только базовое изучение). */
export function costForSkillRank(skill: Skill, rank: number): { points: number; shards: number } {
  if (rank <= 0) return { points: 0, shards: 0 };
  const upgradeSteps = Math.max(0, rank - 1);
  const perStep = getSkillRankUpCost(skill.tier);
  return {
    points: skill.points + upgradeSteps * perStep.points,
    shards: upgradeSteps * perStep.shards,
  };
}

/** Суммарная стоимость выбранной сборки (`ranks`: имя навыка → текущий ранг, 0 = не выучен), сгруппированная по дереву — очки навыков. */
export function pointsSpentByTree(ranks: Readonly<Record<string, number>>): Record<SkillTree, number> {
  const totals = Object.fromEntries(SKILL_TREE_ORDER.map((t) => [t, 0])) as Record<SkillTree, number>;
  for (const skill of SKILLS) {
    const rank = ranks[skill.name] ?? 0;
    if (rank > 0) totals[skill.tree] += costForSkillRank(skill, rank).points;
  }
  return totals;
}

/** Суммарные очки навыков, потраченные во всех деревьях сразу (база + ранги). */
export function totalPointsSpent(ranks: Readonly<Record<string, number>>): number {
  let total = 0;
  for (const skill of SKILLS) {
    const rank = ranks[skill.name] ?? 0;
    if (rank > 0) total += costForSkillRank(skill, rank).points;
  }
  return total;
}

/** Суммарные Осколки Возвышения, потраченные на прокачку рангов во всей сборке. */
export function totalShardsSpent(ranks: Readonly<Record<string, number>>): number {
  let total = 0;
  for (const skill of SKILLS) {
    const rank = ranks[skill.name] ?? 0;
    if (rank > 0) total += costForSkillRank(skill, rank).shards;
  }
  return total;
}

/** Русское склонение слова "очко" под число (1 очко / 2 очка / 5 очков). */
export function pointsLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'очко';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'очка';
  return 'очков';
}

/** Русское склонение слова "осколок" под число (1 осколок / 2 осколка / 5 осколков). */
export function shardsLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'осколок';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'осколка';
  return 'осколков';
}

// ── Форматирование ранговых значений (для рендера в карточке навыка) ──

/** Убирает плавающую погрешность и хвостовые нули (0.30000000000000004 → "0.3"). */
function trimNum(n: number): string {
  return Number(n.toFixed(4)).toString();
}

function fmtSigned(n: number): string {
  return `${n >= 0 ? '+' : ''}${trimNum(n)}`;
}

function fmtNegative(n: number): string {
  return `-${trimNum(n)}`;
}

function fmtMultiplier(n: number): string {
  return `×${trimNum(n)}`;
}

/** n — доля (0.3 = 30%); выводит со знаком, т.к. это всегда бонус. */
function fmtPercentFraction(n: number): string {
  return `${n >= 0 ? '+' : ''}${trimNum(n * 100)}%`;
}

/** n — уже в процентах (10 = 10%), как хранится в kind: "chance". */
function fmtPercentRaw(n: number): string {
  return `${trimNum(n)}%`;
}

/** Ранговое значение и (если есть) его оборотная сторона — для показа под описанием навыка. */
export interface SkillRankDescription {
  text: string;
  debuffText?: string;
}

/**
 * Рендерит значение ранга `i` (0=ранг1, 1=ранг2, 2=ранг3) эффекта навыка в
 * короткую русскую строку — в духе существующих description/debuffDescription
 * в этом файле (терсно, без полного предложения).
 */
export function describeSkillRank(effect: SkillRankEffect, i: 0 | 1 | 2): SkillRankDescription {
  switch (effect.kind) {
    case 'growthMultiplier':
    case 'multiplier':
    case 'costMultiplier':
      return { text: fmtMultiplier(effect.ranks[i]) };
    case 'additiveYield':
    case 'flatBonus':
    case 'dailyLimit':
      return { text: fmtSigned(effect.ranks[i]) };
    case 'flatReduction':
    case 'flatDebuff':
      return { text: fmtNegative(effect.ranks[i]) };
    case 'coinBonus':
    case 'xpBonus':
    case 'productionRate':
      return { text: fmtPercentFraction(effect.ranks[i]) };
    case 'timeReduction':
    case 'oilReduction':
      return { text: `-${trimNum(effect.ranks[i] * 100)}%` };
    case 'chance':
      return { text: fmtPercentRaw(effect.ranks[i]) };
    case 'dropChance':
      return { text: fmtPercentRaw(effect.ranks[i] * 100) };
    case 'cooldown':
      return { text: `откат ${formatDuration(effect.ranks[i] / 1000)}` };
    case 'flatTimeBonus':
      return { text: `+${formatDuration(effect.ranks[i] / 1000)}` };
    case 'stockBonus': {
      const parts = Object.entries(effect.ranks)
        .filter((entry): entry is [string, readonly [number, number, number]] => entry[1] != null)
        .map(([item, arr]) => `+${arr[i]} ${item}`);
      return { text: parts.join(', ') };
    }
    case 'aoe': {
      const extent = effect.ranks[i];
      const size = `${extent.xLeft + extent.xRight + 1}×${extent.depth}`;
      const yieldVal = effect.aoeYield[i];
      return { text: yieldVal !== 0 ? `${size}, ${fmtSigned(yieldVal)}` : size };
    }
    case 'growthWithOilDebuff':
      return { text: fmtMultiplier(effect.growth[i]), debuffText: `${fmtPercentFraction(effect.oilPenalty[i])} нефти` };
    case 'yieldWithDebuff':
      return { text: fmtSigned(effect.buff[i]), debuffText: fmtNegative(effect.debuff[i]) };
    case 'growthWithDebuff':
      return { text: fmtMultiplier(effect.buff[i]), debuffText: fmtMultiplier(effect.debuff[i]) };
    case 'frenziedFish':
      return { text: `${fmtSigned(effect.flat[i])} рыба, ${trimNum(effect.crit[i])}% шанс +1` };
    case 'doubleNom':
      return { text: fmtSigned(effect.food[i]), debuffText: fmtMultiplier(effect.ingredients[i]) };
    case 'yieldWithOilDebuff':
      return { text: fmtSigned(effect.yield[i]), debuffText: fmtMultiplier(effect.oilMultiplier[i]) };
    case 'rateWithGrowthDebuff':
      return { text: fmtPercentFraction(effect.rate[i]), debuffText: fmtMultiplier(effect.growth[i]) };
    case 'costWithDebuff':
      return { text: fmtMultiplier(effect.buff[i]), debuffText: fmtMultiplier(effect.debuff[i]) };
    case 'xpWithFeedDebuff':
      return { text: fmtMultiplier(effect.xp[i]), debuffText: fmtMultiplier(effect.feed[i]) };
    case 'sicknessWithSpread': {
      // spread — не дебафф, а второй бафф: насколько слабее распространяется
      // болезнь от больных соседей (меньше = лучше). В игре это отдельная
      // условная фраза (skill.healthyLivestock.ranked.withSpread) в процентах
      // снижения — и не показывается на ранге 1, где spread=1 (нет изменений).
      const spreadReduction = (1 - effect.spread[i]) * 100;
      const text =
        spreadReduction > 0
          ? `${fmtMultiplier(effect.sickness[i])}, распространение −${trimNum(spreadReduction)}%`
          : fmtMultiplier(effect.sickness[i]);
      return { text };
    }
    default: {
      const _exhaustive: never = effect;
      return _exhaustive;
    }
  }
}

/**
 * "Сырое" число ранга `i`, ровно в том виде, в каком оно встречается буквально
 * в тексте `description` (primary) / `debuffDescription` (debuff) — не в
 * формате бейджа рангов (describeSkillRank), который иногда использует другую
 * запись (× вместо x, доля вместо процента и т.п.). Возвращает null там, где
 * эффект не сводится к одному однозначному числу в тексте (AOE, стоки,
 * составные формулировки) — такие описания просто не обновляются по рангу.
 */
function literalRankNumbers(effect: SkillRankEffect, i: 0 | 1 | 2): { primary: number | null; debuff: number | null } {
  switch (effect.kind) {
    case 'growthMultiplier':
    case 'multiplier':
    case 'costMultiplier':
    case 'additiveYield':
    case 'flatBonus':
    case 'dailyLimit':
    case 'flatReduction':
    case 'flatDebuff':
    case 'chance':
      return { primary: effect.ranks[i], debuff: null };
    case 'coinBonus':
    case 'xpBonus':
    case 'productionRate':
    case 'timeReduction':
    case 'oilReduction':
    case 'dropChance':
      return { primary: effect.ranks[i] * 100, debuff: null };
    case 'yieldWithDebuff':
      return { primary: effect.buff[i], debuff: effect.debuff[i] };
    case 'growthWithDebuff':
      return { primary: effect.buff[i], debuff: (effect.debuff[i] - 1) * 100 };
    case 'growthWithOilDebuff':
      return { primary: effect.growth[i], debuff: effect.oilPenalty[i] * 100 };
    case 'yieldWithOilDebuff':
      return { primary: effect.yield[i], debuff: (effect.oilMultiplier[i] - 1) * 100 };
    case 'rateWithGrowthDebuff':
      return { primary: effect.rate[i], debuff: (effect.growth[i] - 1) * 100 };
    case 'costWithDebuff':
      return { primary: effect.buff[i], debuff: (effect.debuff[i] - 1) * 100 };
    case 'xpWithFeedDebuff':
      return { primary: effect.xp[i], debuff: (effect.feed[i] - 1) * 100 };
    case 'sicknessWithSpread':
      // spread — второй бафф, не дебафф (см. комментарий в describeSkillRank); нет
      // отдельного debuffDescription-текста, в который его можно было бы подставлять.
      return { primary: effect.sickness[i], debuff: null };
    case 'doubleNom':
      return { primary: effect.food[i], debuff: null };
    default:
      return { primary: null, debuff: null };
  }
}

/** Находит в тексте число, по модулю равное `from` (с плавающей погрешностью),
 * и меняет его на `to` — не трогая окружающие символы (%, x, знак минуса,
 * слова). Сравнение по модулю: сами эффекты всегда хранят положительную
 * магнитуду, а знак ("+"/"-" перед числом) — часть текста, не regex-токена.
 * Если такого числа в тексте нет, возвращает текст без изменений (безопасный
 * no-op). */
function replaceLiteralNumber(text: string, from: number, to: number): string {
  const re = /\d+(?:\.\d+)?/g;
  const eps = 1e-6;
  const fromAbs = Math.abs(from);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (Math.abs(parseFloat(match[0]) - fromAbs) < eps) {
      return text.slice(0, match.index) + trimNum(Math.abs(to)) + text.slice(match.index + match[0].length);
    }
  }
  return text;
}

/**
 * Описание навыка (description/debuffDescription) с подставленным значением
 * текущего ранга вместо базового (ранг 1) — вместо статичного текста, всегда
 * показывающего цифры ранга 1. Для навыков без прокачки или ещё не изученных
 * (rank <= 1) возвращает исходный текст как есть.
 */
export function liveSkillDescription(
  skill: Skill,
  rank: number,
): { description: string; debuffDescription?: string } {
  if (!skill.upgrade || rank <= 1) {
    return { description: skill.description, debuffDescription: skill.debuffDescription };
  }
  const idx = (Math.min(rank, skill.upgrade.maxLevel) - 1) as 0 | 1 | 2;
  const base = literalRankNumbers(skill.upgrade.effect, 0);
  const current = literalRankNumbers(skill.upgrade.effect, idx);

  let description =
    base.primary != null && current.primary != null
      ? replaceLiteralNumber(skill.description, base.primary, current.primary)
      : skill.description;

  const debuffDescription =
    skill.debuffDescription != null && base.debuff != null && current.debuff != null
      ? replaceLiteralNumber(skill.debuffDescription, base.debuff, current.debuff)
      : skill.debuffDescription;

  // Healthy Livestock: в игре это условное продолжение того же предложения
  // (skill.healthyLivestock.ranked.withSpread), а не отдельная строка — на
  // ранге 1 (spread=1, без изменений) его нет вовсе.
  if (skill.upgrade.effect.kind === 'sicknessWithSpread') {
    const spreadReduction = (1 - skill.upgrade.effect.spread[idx]) * 100;
    if (spreadReduction > 0) {
      description += `, распространение −${trimNum(spreadReduction)}%`;
    }
  }

  return { description, debuffDescription };
}
