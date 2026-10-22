/**
 * Стоимость крафта инструментов (Workbench и раскопки).
 *
 * Источник: sunflower-land repo —
 *   src/features/game/types/tools.ts (WORKBENCH_TOOLS, TREASURE_TOOLS,
 *   цена в монетах, ингредиенты, дневной запас),
 *   src/features/game/events/landExpansion/craftTool.ts (getToolUnitPrice —
 *   скидки и порядок их применения),
 *   src/features/game/types/oilDrill.ts (OIL_DRILL_WOOL_BY_RANK).
 * Не включены: погодные предметы (Tornado Pinwheel и т.п. — только по одному),
 * уход за животными (LOVE_ANIMAL_TOOLS: Brush, Music Box — разовая покупка)
 * и Pest Net (в игре выключен, disabled).
 *
 * Множители навыков по рангам берём из src/lib/skills.ts (SKILLS[].upgrade),
 * чтобы не дублировать числа и не разъехаться при апдейтах.
 */
import { SKILLS } from './skills';

export type ToolResource =
  | 'Wood'
  | 'Stone'
  | 'Iron'
  | 'Gold'
  | 'Crimstone'
  | 'Oil'
  | 'Leather'
  | 'Wool'
  | 'Merino Wool'
  | 'Feather';

export const TOOL_RESOURCE_ORDER: ToolResource[] = [
  'Wood', 'Stone', 'Iron', 'Gold', 'Crimstone', 'Oil', 'Leather', 'Wool', 'Merino Wool', 'Feather',
];

export const TOOL_RESOURCE_ICONS: Record<ToolResource, string> = {
  Wood: '/sprites/resources/wood.png',
  Stone: '/sprites/resources/stone.png',
  Iron: '/sprites/resources/iron_ore.png',
  Gold: '/sprites/resources/gold_ore.png',
  Crimstone: '/sprites/resources/crimstone.png',
  Oil: '/sprites/resources/oil.webp',
  Leather: '/sprites/resources/animals/leather.webp',
  Wool: '/sprites/resources/animals/wool.webp',
  'Merino Wool': '/sprites/resources/animals/merino_wool.webp',
  Feather: '/sprites/resources/animals/feather.webp',
};

/** Oil не торгуется на маркетплейсе — цены нет (как и в Lava Pit). */
export const TOOL_UNPRICED_RESOURCES: ToolResource[] = ['Oil'];
export const TOOL_PRICE_NAMES = TOOL_RESOURCE_ORDER.filter((r) => !TOOL_UNPRICED_RESOURCES.includes(r));

export type ToolGroup = 'workbench' | 'treasure';

export const TOOL_GROUP_LABELS: Record<ToolGroup, string> = {
  workbench: 'Мастерская (Workbench)',
  treasure: 'Раскопки',
};

export type ToolName =
  | 'Axe' | 'Pickaxe' | 'Stone Pickaxe' | 'Iron Pickaxe' | 'Gold Pickaxe' | 'Rod'
  | 'Oil Drill' | 'Crab Pot' | 'Mariner Pot' | 'Salt Rake'
  | 'Sand Shovel' | 'Sand Drill';

export interface ToolDef {
  name: ToolName;
  labelRu: string;
  icon: string;
  group: ToolGroup;
  /** Базовая цена в монетах за 1 шт. */
  price: number;
  /** Ингредиенты за 1 шт. без навыков (Oil Drill с Oil Rig — см. toolIngredients). */
  ingredients: Partial<Record<ToolResource, number>>;
  /** Запас в магазине на одно пополнение (stock в tools.ts); у раскопок лимита нет. */
  stock?: number;
  requirement?: string;
}

export const TOOLS: ToolDef[] = [
  { name: 'Axe', labelRu: 'Топор', icon: '/sprites/tools/axe.png', group: 'workbench', price: 20, ingredients: {}, stock: 200 },
  { name: 'Pickaxe', labelRu: 'Кирка', icon: '/sprites/tools/wood_pickaxe.png', group: 'workbench', price: 20, ingredients: { Wood: 3 }, stock: 60 },
  { name: 'Stone Pickaxe', labelRu: 'Каменная кирка', icon: '/sprites/tools/stone_pickaxe.png', group: 'workbench', price: 20, ingredients: { Wood: 3, Stone: 5 }, stock: 20 },
  { name: 'Iron Pickaxe', labelRu: 'Железная кирка', icon: '/sprites/tools/iron_pickaxe.png', group: 'workbench', price: 80, ingredients: { Wood: 3, Iron: 5 }, stock: 5 },
  { name: 'Gold Pickaxe', labelRu: 'Золотая кирка', icon: '/sprites/tools/gold_pickaxe.png', group: 'workbench', price: 100, ingredients: { Wood: 3, Gold: 3 }, stock: 5 },
  { name: 'Rod', labelRu: 'Удочка', icon: '/sprites/tools/fishing_rod.png', group: 'workbench', price: 20, ingredients: { Wood: 3, Stone: 1 }, stock: 50 },
  { name: 'Oil Drill', labelRu: 'Нефтяной бур', icon: '/sprites/tools/oil_drill.webp', group: 'workbench', price: 100, ingredients: { Wood: 20, Iron: 9, Leather: 10 }, stock: 5, requirement: 'Desert-остров' },
  { name: 'Crab Pot', labelRu: 'Ловушка для крабов', icon: '/sprites/tools/crab_pot.webp', group: 'workbench', price: 250, ingredients: { Feather: 5, Wool: 3 }, stock: 15, requirement: 'Уровень 18' },
  { name: 'Mariner Pot', labelRu: 'Морская ловушка', icon: '/sprites/tools/mariner_pot.webp', group: 'workbench', price: 500, ingredients: { Feather: 10, 'Merino Wool': 10 }, stock: 10, requirement: 'Уровень 24' },
  { name: 'Salt Rake', labelRu: 'Грабли для соли', icon: '/sprites/tools/salt_rake.webp', group: 'workbench', price: 20, ingredients: { Wood: 3 }, stock: 50 },
  { name: 'Sand Shovel', labelRu: 'Лопата', icon: '/sprites/tools/sand_shovel.png', group: 'treasure', price: 20, ingredients: { Wood: 2, Stone: 1 } },
  { name: 'Sand Drill', labelRu: 'Песчаный бур', icon: '/sprites/tools/sand_drill.png', group: 'treasure', price: 40, ingredients: { Oil: 1, Crimstone: 1, Wood: 3, Leather: 1 } },
];

export type SkillRank = 0 | 1 | 2 | 3;

export interface ToolBoosts {
  fellersDiscount: SkillRank;
  frugalMiner: SkillRank;
  reelDeal: SkillRank;
  cheapRakes: SkillRank;
  oilRig: SkillRank;
  /** Бейдж контрибьютора Artist в инвентаре: −10% монет на все инструменты. */
  artist: boolean;
  /** Salt Sculpture улучшена до уровня 4+: −10% монет на Salt Rake. */
  saltSculpture: boolean;
}

export const NO_TOOL_BOOSTS: ToolBoosts = {
  fellersDiscount: 0,
  frugalMiner: 0,
  reelDeal: 0,
  cheapRakes: 0,
  oilRig: 0,
  artist: false,
  saltSculpture: false,
};

/** Навыки, меняющие цену/рецепт, — имя в игре и на что действуют. */
export const TOOL_SKILLS = [
  { key: 'fellersDiscount', skill: "Feller's Discount", target: 'Axe' },
  { key: 'frugalMiner', skill: 'Frugal Miner', target: 'кирки' },
  { key: 'reelDeal', skill: 'Reel Deal', target: 'Rod' },
  { key: 'cheapRakes', skill: 'Cheap Rakes', target: 'Salt Rake' },
  { key: 'oilRig', skill: 'Oil Rig', target: 'Oil Drill' },
] as const;

/** ranks из SKILLS[].upgrade.effect (costMultiplier / flatBonus) для навыка. */
export function skillRanks(skillName: string): number[] {
  const effect = SKILLS.find((s) => s.name === skillName)?.upgrade?.effect as { ranks?: unknown } | undefined;
  return Array.isArray(effect?.ranks) ? (effect!.ranks as number[]) : [];
}

function rankValue(skillName: string, rank: SkillRank, fallback: number): number {
  if (rank === 0) return fallback;
  return skillRanks(skillName)[rank - 1] ?? fallback;
}

const PICKAXES: ToolName[] = ['Pickaxe', 'Stone Pickaxe', 'Iron Pickaxe', 'Gold Pickaxe'];

/** Цена 1 шт. в монетах — тот же порядок множителей, что getToolUnitPrice в craftTool.ts. */
export function toolUnitPrice(tool: ToolDef, b: ToolBoosts): number {
  let price = tool.price;
  if (tool.name === 'Axe') price *= rankValue("Feller's Discount", b.fellersDiscount, 1);
  if (tool.name === 'Rod') price *= rankValue('Reel Deal', b.reelDeal, 1);
  if (b.artist) price *= 0.9;
  if (PICKAXES.includes(tool.name)) price *= rankValue('Frugal Miner', b.frugalMiner, 1);
  if (tool.name === 'Salt Rake') price *= rankValue('Cheap Rakes', b.cheapRakes, 1);
  if (tool.name === 'Salt Rake' && b.saltSculpture) price *= 0.9;
  return price;
}

/** Ингредиенты за 1 шт.: Oil Rig заменяет 10 Leather у Oil Drill на 20/15/10 Wool по рангу. */
export function toolIngredients(tool: ToolDef, b: ToolBoosts): Partial<Record<ToolResource, number>> {
  if (tool.name === 'Oil Drill' && b.oilRig > 0) {
    const { Leather: _leather, ...rest } = tool.ingredients;
    return { ...rest, Wool: rankValue('Oil Rig', b.oilRig, 20) };
  }
  return tool.ingredients;
}

/** Есть ли у инструмента активная скидка/замена рецепта при этих бустах. */
export function isToolBoosted(tool: ToolDef, b: ToolBoosts): boolean {
  return toolUnitPrice(tool, b) !== tool.price || toolIngredients(tool, b) !== tool.ingredients;
}

// ─── Нефть по себестоимости ────────────────────────────────────────────────
// На маркетплейсе нефть не торгуется, но её можно оценить через цену
// добычи: одно бурение Oil Reserve тратит 1 Oil Drill. Источник:
// src/features/game/events/landExpansion/drillOilReserve.ts —
// getOilDropAmount (BASE_OIL_DROP_AMOUNT, OIL_BONUS_DROP_AMOUNT,
// isNextDrillHasBonus) и getRequiredOilDrillAmount (Infernal Drill).

const BASE_OIL_DROP = 10;
/** Каждое 3-е бурение скважины даёт +20 сверху (isNextDrillHasBonus). */
const OIL_BONUS_DROP = 20;
const OIL_BONUS_EVERY = 3;
/** Stag Shrine: +15 только на бонусном (каждом 3-м) бурении. */
const STAG_SHRINE_BONUS = 15;

export interface OilBoosts {
  oilCan: boolean;
  oilOveralls: boolean;
  oilGallon: boolean;
  knightChicken: boolean;
  battleFish: boolean;
  stagShrine: boolean;
  oilExtraction: SkillRank;
  /** Infernal Drill: бурение не тратит Oil Drill — нефть бесплатна. */
  infernalDrill: boolean;
}

export const NO_OIL_BOOSTS: OilBoosts = {
  oilCan: false,
  oilOveralls: false,
  oilGallon: false,
  knightChicken: false,
  battleFish: false,
  stagShrine: false,
  oilExtraction: 0,
  infernalDrill: false,
};

/** Плоские прибавки к каждому бурению — для чекбоксов в UI. */
export const OIL_YIELD_BOOSTS = [
  { key: 'oilOveralls', label: 'Oil Overalls', icon: '/sprites/wearables/360.webp', bonus: 10 },
  { key: 'oilGallon', label: 'Oil Gallon', icon: '/sprites/wearables/479.webp', bonus: 5 },
  { key: 'oilCan', label: 'Oil Can', icon: '/sprites/wearables/308.webp', bonus: 2 },
  { key: 'knightChicken', label: 'Knight Chicken', icon: '/sprites/animals/chickens/knight_chicken.webp', bonus: 0.1 },
  { key: 'battleFish', label: 'Battle Fish', icon: '/sprites/fish/battle_fish.webp', bonus: 0.05 },
] as const;

/** Средний выход нефти с одного бурения (бонус каждого 3-го размазан по всем). */
export function averageOilPerDrill(b: OilBoosts): number {
  let amount = BASE_OIL_DROP + OIL_BONUS_DROP / OIL_BONUS_EVERY;
  if (b.stagShrine) amount += STAG_SHRINE_BONUS / OIL_BONUS_EVERY;
  for (const boost of OIL_YIELD_BOOSTS) if (b[boost.key]) amount += boost.bonus;
  amount += rankValue('Oil Extraction', b.oilExtraction, 0);
  return amount;
}

export interface OilUnitCost {
  /** Средний выход нефти с одного Oil Drill. */
  perDrill: number;
  /** Монеты за 1 нефть (цена бура ÷ выход). */
  coins: number;
  /** Ресурсы бура в пересчёте на 1 нефть. */
  resources: Partial<Record<ToolResource, number>>;
  /** Infernal Drill — бур не тратится, нефть ничего не стоит. */
  free: boolean;
}

/** Себестоимость 1 нефти при текущих скидках на Oil Drill (Artist, Oil Rig) и бонусах добычи. */
export function oilUnitCost(toolBoosts: ToolBoosts, oilBoosts: OilBoosts): OilUnitCost {
  const perDrill = averageOilPerDrill(oilBoosts);
  if (oilBoosts.infernalDrill) return { perDrill, coins: 0, resources: {}, free: true };

  const drill = TOOLS.find((t) => t.name === 'Oil Drill')!;
  const resources: Partial<Record<ToolResource, number>> = {};
  for (const [res, qty] of Object.entries(toolIngredients(drill, toolBoosts)) as [ToolResource, number][]) {
    resources[res] = qty / perDrill;
  }
  return { perDrill, coins: toolUnitPrice(drill, toolBoosts) / perDrill, resources, free: false };
}

/** Flower за 1 нефть по себестоимости; null — пока нет цен или у части ресурсов бура цены нет. */
export function oilFlowerPrice(cost: OilUnitCost, prices: Record<string, number | null>): number | null {
  if (cost.free) return 0;
  const { value, missing } = resourcesFlowerValue(cost.resources, prices);
  return missing > 0 ? null : value;
}

export interface ToolOrderTotal {
  coins: number;
  resources: Partial<Record<ToolResource, number>>;
  count: number;
}

/** Сумма по набору «инструмент → количество». */
export function toolOrderTotal(amounts: Partial<Record<ToolName, number>>, b: ToolBoosts): ToolOrderTotal {
  const total: ToolOrderTotal = { coins: 0, resources: {}, count: 0 };
  for (const tool of TOOLS) {
    const n = amounts[tool.name] ?? 0;
    if (n <= 0) continue;
    total.count += n;
    total.coins += toolUnitPrice(tool, b) * n;
    for (const [res, qty] of Object.entries(toolIngredients(tool, b)) as [ToolResource, number][]) {
      total.resources[res] = (total.resources[res] ?? 0) + qty * n;
    }
  }
  return total;
}

/**
 * Стоимость ресурсов во Flower. Oil учитывается, только если ему передана
 * цена (себестоимость — см. oilFlowerPrice), иначе hasUnpriced; missing — у
 * скольких торгуемых ресурсов цены нет.
 */
export function resourcesFlowerValue(
  resources: Partial<Record<ToolResource, number>>,
  prices: Record<string, number | null>,
): { value: number; missing: number; hasUnpriced: boolean } {
  let value = 0;
  let missing = 0;
  let hasUnpriced = false;
  for (const [res, qty] of Object.entries(resources) as [ToolResource, number][]) {
    const p = prices[res];
    if (p != null) value += p * qty;
    else if (TOOL_UNPRICED_RESOURCES.includes(res)) hasUnpriced = true;
    else missing++;
  }
  return { value, missing, hasUnpriced };
}
