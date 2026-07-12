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
  {
    id: 'chop-native',
    group: 'wood',
    label: 'Native — +1 дерево',
    itemId: 618,
    itemLabel: 'Tree',
    counterKey: 'Basic Tree Chopped',
    criticalHitName: 'Native',
    defaultChance: 20,
    effect: '+1 к добытой древесине',
    requirement: { kind: 'always' },
  },
  {
    id: 'chop-tough-tree',
    group: 'wood',
    label: 'Tough Tree — x3 древесины',
    itemId: 618,
    itemLabel: 'Tree',
    counterKey: 'Basic Tree Chopped',
    criticalHitName: 'Tough Tree',
    defaultChance: 10,
    effect: 'Утраивает добытую древесину',
    requirement: { kind: 'skill', name: 'Tough Tree' },
  },
  {
    id: 'chop-tree-turnaround',
    group: 'wood',
    label: 'Tree Turnaround — мгновенное восстановление',
    itemId: 618,
    itemLabel: 'Tree',
    counterKey: 'Basic Tree Chopped',
    criticalHitName: 'Tree Turnaround',
    defaultChance: 15,
    effect: 'Дерево восстанавливается мгновенно',
    requirement: { kind: 'skill', name: 'Tree Turnaround' },
  },
  {
    id: 'chop-money-tree',
    group: 'wood',
    label: 'Money Tree — +200 монет',
    itemId: 618,
    itemLabel: 'Tree',
    counterKey: 'Basic Tree Chopped',
    criticalHitName: 'Money Tree',
    defaultChance: 1,
    effect: '+200 монет за рубку',
    requirement: { kind: 'skill', name: 'Money Tree' },
  },
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
