/**
 * getItemTags.ts
 * Tags an sfl_items row by what kind of placeable it is.
 *
 * Name lists below are copied from the sunflower-land source (cloned via
 * `npm run sfl:clone`), not derived from any `category` field — none exists
 * for collectibles/wearables there:
 *   - NODE_NAMES   <- RESOURCES keys in src/features/game/types/resources.ts
 *   - MONUMENT_NAMES <- HelpLimitMonumentName | MegastoreMonumentName | WorkbenchMonumentName
 *                       unions in src/features/game/types/monuments.ts
 *   - BUILDING_NAMES <- BuildingName union in src/features/game/types/buildings.ts
 *
 * No tradable/non-tradable tag: the source has no tradability flag for
 * collectibles/wearables (TRADE_LIMITS in actions/tradeLimits.ts only covers
 * fungible commodities like crops/wood/stone, not NFT items), so it's omitted
 * rather than guessed.
 */

const NODE_NAMES = new Set([
  "Crop Plot",
  "Fruit Patch",
  "Gold Rock",
  "Pure Gold Rock",
  "Prime Gold Rock",
  "Iron Rock",
  "Refined Iron Rock",
  "Tempered Iron Rock",
  "Stone Rock",
  "Fused Stone Rock",
  "Reinforced Stone Rock",
  "Crimstone Rock",
  "Boulder",
  "Tree",
  "Ancient Tree",
  "Sacred Tree",
  "Beehive",
  "Flower Bed",
  "Sunstone Rock",
  "Oil Reserve",
  "Lava Pit",
]);

const MONUMENT_NAMES = new Set([
  // HelpLimitMonumentName
  "Farmer's Monument",
  "Miner's Monument",
  "Woodcutter's Monument",
  // MegastoreMonumentName
  "Teamwork Monument",
  "Cornucopia",
  "Poseidon's Throne",
  "Crystal Altar",
  // WorkbenchMonumentName (excluding HelpLimitMonumentName, already listed above)
  "Big Orange",
  "Big Apple",
  "Big Banana",
  "Basic Cooking Pot",
  "Expert Cooking Pot",
  "Advanced Cooking Pot",
]);

const BUILDING_NAMES = new Set([
  // Home tiers
  "Tent",
  "House",
  "Manor",
  "Mansion",
  // CookingBuildingName
  "Fire Pit",
  "Kitchen",
  "Bakery",
  "Deli",
  "Smoothie Shack",
  // ProcessingBuildingName + rest of BuildingName
  "Fish Market",
  "Town Center",
  "Market",
  "Workbench",
  "Water Well",
  "Hen House",
  "Toolshed",
  "Warehouse",
  "Compost Bin",
  "Turbo Composter",
  "Premium Composter",
  "Greenhouse",
  "Crop Machine",
  "Barn",
  "Crafting Box",
  "Pet House",
  "Aging Shed",
]);

/** Tag a catalog item by what kind of placeable it is (node / monument / building). */
export function getItemTags(itemName: string, itemType: string): string[] {
  const tags: string[] = [];
  if (NODE_NAMES.has(itemName)) tags.push("node");
  if (MONUMENT_NAMES.has(itemName)) tags.push("monument");
  if (BUILDING_NAMES.has(itemName)) tags.push("building");
  return tags;
}
