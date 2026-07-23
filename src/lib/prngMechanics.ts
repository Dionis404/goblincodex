/**
 * Пресеты механик крита/бонуса, реверс-инженеренные из исходников игры
 * (features/game/events/landExpansion/*.ts — chop.ts, mineGold.ts, stoneMine.ts,
 * ironMine.ts, mineCrimstone.ts, harvest.ts). itemId — числовые ID из KNOWN_IDS.
 *
 * counterKey — ключ в farmActivity игрока (`farm.farmActivity[counterKey]`),
 * значение = сколько раз это действие уже было совершено на ферме ДО текущего.
 *
 * requirement — как проверить, реально ли этот крит доступен на конкретной
 * ферме (см. checkRequirement в PrngChanceChecker.tsx): по скиллу бампкина,
 * по построенному коллекционному предмету или по надетому wearable.
 * "always" — базовая механика без разблокировки (Native, возврат семян).
 *
 * defaultChance — запасное значение (сверено с исходниками на момент
 * написания). Для механик с requirement.kind !== 'always' процент в первую
 * очередь тянется из БД (sfl_buffs, см. getPrngChances в lib/db.ts), которая
 * наполняется скриптом sfl:populate из актуальных исходников игры — так он
 * не рассинхронизируется при обновлениях баланса.
 */

export type PrngRequirement =
  | { kind: 'always' }
  | { kind: 'skill'; name: string }
  | { kind: 'collectible'; name: string }
  | { kind: 'wearable'; name: string };

export type PrngResourceGroup =
  | 'gold'
  | 'stone'
  | 'iron'
  | 'crimstone'
  | 'wood'
  | 'crop';

export type PrngMechanic = {
  id: string;
  group: PrngResourceGroup;
  label: string;
  itemId: number;
  itemLabel: string;
  counterKey: string;
  criticalHitName: string;
  defaultChance: number;
  effect: string;
  requirement: PrngRequirement;
};

export const PRNG_RESOURCE_GROUPS: Record<PrngResourceGroup, string> = {
  gold: 'Золото',
  stone: 'Камень',
  iron: 'Железо',
  crimstone: 'Кримстоун',
  wood: 'Дерево',
  crop: 'Урожай',
};

/**
 * Дерево имеет 3 тира (Tree / Ancient Tree / Sacred Tree), и игра считает крит
 * ОТДЕЛЬНО для каждого тира — свой itemId и свой counterKey в farmActivity
 * (chop.ts: `${treeName === "Tree" ? "Basic Tree" : treeName} Chopped`).
 * Т.е. счётчик рубок обычного Tree никак не связан со счётчиком Ancient/Sacred
 * Tree — это три независимые PRNG-последовательности.
 */
type TreeTier = {
  itemLabel: string;
  itemId: number;
  counterKey: string;
  /** Множитель выхода тира — на него умножается и добыча древесины, и монеты Money Tree. */
  multiplier: number;
};

const TREE_TIERS: TreeTier[] = [
  { itemLabel: 'Tree', itemId: 618, counterKey: 'Basic Tree Chopped', multiplier: 1 },
  { itemLabel: 'Ancient Tree', itemId: 2702, counterKey: 'Ancient Tree Chopped', multiplier: 4 },
  { itemLabel: 'Sacred Tree', itemId: 2703, counterKey: 'Sacred Tree Chopped', multiplier: 16 },
];

function buildTreeTierMechanics(): PrngMechanic[] {
  return TREE_TIERS.flatMap((tier) => {
    const suffix = tier.itemLabel === 'Tree' ? '' : ` (${tier.itemLabel})`;
    const moneyTreeCoins = 200 * tier.multiplier;
    return [
      {
        id: `chop-native-${tier.itemId}`,
        group: 'wood' as const,
        label: `Native — +1 дерево${suffix}`,
        itemId: tier.itemId,
        itemLabel: tier.itemLabel,
        counterKey: tier.counterKey,
        criticalHitName: 'Native',
        defaultChance: 20,
        effect: '+1 к добытой древесине',
        requirement: { kind: 'always' as const },
      },
      {
        id: `chop-tough-tree-${tier.itemId}`,
        group: 'wood' as const,
        label: `Tough Tree — x3 древесины${suffix}`,
        itemId: tier.itemId,
        itemLabel: tier.itemLabel,
        counterKey: tier.counterKey,
        criticalHitName: 'Tough Tree',
        defaultChance: 10,
        effect: 'Утраивает добытую древесину',
        requirement: { kind: 'skill' as const, name: 'Tough Tree' },
      },
      {
        id: `chop-tree-turnaround-${tier.itemId}`,
        group: 'wood' as const,
        label: `Tree Turnaround — мгновенное восстановление${suffix}`,
        itemId: tier.itemId,
        itemLabel: tier.itemLabel,
        counterKey: tier.counterKey,
        criticalHitName: 'Tree Turnaround',
        defaultChance: 15,
        effect: 'Дерево восстанавливается мгновенно',
        requirement: { kind: 'skill' as const, name: 'Tree Turnaround' },
      },
      {
        id: `chop-money-tree-${tier.itemId}`,
        group: 'wood' as const,
        label: `Money Tree — +${moneyTreeCoins} монет${suffix}`,
        itemId: tier.itemId,
        itemLabel: tier.itemLabel,
        counterKey: tier.counterKey,
        criticalHitName: 'Money Tree',
        defaultChance: 1,
        effect: `+${moneyTreeCoins} монет за рубку (200 × ${tier.multiplier} тира)`,
        requirement: { kind: 'skill' as const, name: 'Money Tree' },
      },
    ];
  });
}

export const PRNG_MECHANICS: PrngMechanic[] = [
  {
    id: 'gold-native',
    group: 'gold',
    label: 'Native — +1 золото',
    itemId: 621,
    itemLabel: 'Gold Rock',
    counterKey: 'Gold Rock Mined',
    criticalHitName: 'Native',
    defaultChance: 20,
    effect: '+1 к добытому золоту',
    requirement: { kind: 'always' },
  },
  {
    id: 'gold-pickaxe-shark',
    group: 'gold',
    label: 'Pickaxe Shark — мгновенное восстановление',
    itemId: 621,
    itemLabel: 'Gold Rock',
    counterKey: 'Gold Rock Mined',
    criticalHitName: 'Pickaxe Shark',
    defaultChance: 10,
    effect: 'Скала восстанавливается мгновенно',
    requirement: { kind: 'wearable', name: 'Pickaxe Shark' },
  },
  {
    id: 'stone-rock-golem',
    group: 'stone',
    label: 'Rock Golem — +200%',
    itemId: 619,
    itemLabel: 'Stone Rock',
    counterKey: 'Stone Rock Mined',
    criticalHitName: 'Rock Golem',
    defaultChance: 10,
    effect: '+2 к добыче (тройной выход)',
    requirement: { kind: 'collectible', name: 'Rock Golem' },
  },
  {
    id: 'iron-native',
    group: 'iron',
    label: 'Native — +1 железо',
    itemId: 620,
    itemLabel: 'Iron Rock',
    counterKey: 'Iron Rock Mined',
    criticalHitName: 'Native',
    defaultChance: 20,
    effect: '+1 к добытому железу',
    requirement: { kind: 'always' },
  },
  {
    id: 'crimstone-clam',
    group: 'crimstone',
    label: 'Crimstone Clam — мгновенное восстановление',
    itemId: 635,
    itemLabel: 'Crimstone Rock',
    counterKey: 'Crimstone Mined',
    criticalHitName: 'Crimstone Clam',
    defaultChance: 10,
    effect: 'Скала восстанавливается мгновенно',
    requirement: { kind: 'collectible', name: 'Crimstone Clam' },
  },
  ...buildTreeTierMechanics(),
];

/** Урожай: itemId и criticalHitName зависят от конкретной культуры, поэтому считаются отдельно. */
export const HARVEST_CROP_IDS: Record<string, number> = {
  Sunflower: 201,
  Potato: 202,
  Pumpkin: 203,
  Carrot: 204,
  Cabbage: 205,
  Beetroot: 206,
  Cauliflower: 207,
  Parsnip: 208,
  Radish: 209,
  Wheat: 210,
  Kale: 211,
  Eggplant: 215,
  Corn: 216,
  Soybean: 251,
  Grape: 252,
  Rice: 253,
  Barley: 257,
  Rhubarb: 258,
  Zucchini: 259,
  Yam: 260,
  Broccoli: 261,
  Pepper: 262,
  Onion: 263,
  Turnip: 264,
  Artichoke: 265,
  Saltwort: 3027,
};

export type HarvestMechanicTemplate = {
  id: string;
  label: string;
  counterKey: string;
  criticalHitName: string;
  defaultChance: number;
  effect: string;
  requirement: PrngRequirement;
  /** Показывать только для конкретной культуры (например, Golden Sunflower — только для Sunflower). */
  onlyForCrop?: string;
};

export const HARVEST_MECHANICS: HarvestMechanicTemplate[] = [
  {
    id: 'harvest-seed-drop',
    label: 'Возврат семени (criticalHitName = имя культуры)',
    counterKey: '{crop} Harvested',
    criticalHitName: '{crop}',
    defaultChance: 5,
    effect: 'Возвращает 2-3 семени культуры',
    requirement: { kind: 'always' },
  },
  {
    id: 'harvest-seed-amount',
    label: 'Количество семян (criticalHitName = "{crop} Seed")',
    counterKey: '{crop} Harvested',
    criticalHitName: '{crop} Seed',
    defaultChance: 50,
    effect: 'Если сработало: 2 семени, иначе 3',
    requirement: { kind: 'always' },
  },
  {
    id: 'golden-sunflower',
    label: 'Golden Sunflower — +0.35 золота',
    counterKey: 'Sunflower Harvested',
    criticalHitName: 'Golden Sunflower',
    defaultChance: 1 / 7,
    effect: '+0.35 золота за подсолнух',
    requirement: { kind: 'skill', name: 'Golden Sunflower' },
    onlyForCrop: 'Sunflower',
  },
  {
    id: 'green-amulet',
    label: 'Green Amulet — x10 к урожаю',
    counterKey: '{crop} Harvested',
    criticalHitName: 'Green Amulet',
    defaultChance: 10,
    effect: 'x10 множитель ко всему собранному урожаю (любая культура)',
    requirement: { kind: 'wearable', name: 'Green Amulet' },
  },
];

/** Имена, для которых процент шанса тянется из БД (sfl_buffs), а не из defaultChance. */
export function dbLookupNames(): string[] {
  const names = new Set<string>();
  for (const m of PRNG_MECHANICS) {
    if (m.requirement.kind !== 'always') names.add(m.criticalHitName);
  }
  for (const m of HARVEST_MECHANICS) {
    if (m.requirement.kind !== 'always') names.add(m.criticalHitName);
  }
  return [...names];
}
