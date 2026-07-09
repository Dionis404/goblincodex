/**
 * getItemTags.ts
 * Tags an sfl_items row by what kind of placeable it is.
 *
 * Name lists below are copied from the sunflower-land source (cloned via
 * `npm run sfl:clone`), not derived from any `category` field — none exists
 * for collectibles/wearables there:
 *   - NODE_NAMES   <- RESOURCES keys in src/features/game/types/resources.ts
 *   - MONUMENT_NAMES <- HelpLimitMonumentName | MegastoreMonumentName in
 *                       src/features/game/types/monuments.ts (true permanent
 *                       decorations, no consumable reward)
 *   - VILLAGE_PROJECT_NAMES <- VillageProjectName in monuments.ts (Big
 *                       Orange/Apple/Banana + Cooking Pots: friend-help
 *                       objectives that pay out via REWARD_ITEMS once, not
 *                       monuments despite sharing WorkbenchMonumentName's
 *                       TS union with the two real Help Limit monuments)
 *   - BUILDING_NAMES <- BuildingName union in src/features/game/types/buildings.ts
 *   - SHRINE_NAMES <- PetShrineName in src/features/game/types/pets.ts, plus
 *                     "Obsidian Shrine" (petShop.ts's PetShopItemName treats
 *                     it the same as the named shrines, though it's outside
 *                     the PetShrineName union itself)
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
]);

const VILLAGE_PROJECT_NAMES = new Set([
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

const SHRINE_NAMES = new Set([
  "Fox Shrine",
  "Hound Shrine",
  "Boar Shrine",
  "Sparrow Shrine",
  "Toucan Shrine",
  "Collie Shrine",
  "Badger Shrine",
  "Stag Shrine",
  "Mole Shrine",
  "Bear Shrine",
  "Tortoise Shrine",
  "Moth Shrine",
  "Legendary Shrine",
  "Bantam Shrine",
  "Trading Shrine",
  "Obsidian Shrine",
]);

/**
 * Chapter-of-origin tags. Only the last ~7 chapters (Bull Run onward) have
 * per-item chapter data left in the live source — ChapterCollectibleName /
 * ChapterWearableName in megastore.ts are comment-grouped by chapter, and
 * MEGASTORE has structured per-chapter records. Older chapters' item lists
 * were already deleted from the source when those chapters ended (only
 * their chapter banner survives, via CHAPTER_BANNERS in chapters.ts), so
 * there's no way to recover which chapter e.g. a Solar Flare-era item
 * shipped in without scraping an external wiki — not attempted here.
 */
const CHAPTER_ITEM_NAMES: Record<string, string> = {
  // Bull Run
  "Cow Scratcher": "chapter-bull-run",
  "Spinning Wheel": "chapter-bull-run",
  "Sleepy Rug": "chapter-bull-run",
  "Meteorite": "chapter-bull-run",
  "Sheaf of Plenty": "chapter-bull-run",
  "Mechanical Bull": "chapter-bull-run",
  "Crop Circle": "chapter-bull-run",
  "Cowboy Hat": "chapter-bull-run",
  "Cowgirl Skirt": "chapter-bull-run",
  "Cowboy Shirt": "chapter-bull-run",
  "Dream Scarf": "chapter-bull-run",
  "Milk Apron": "chapter-bull-run",
  "Cowboy Trouser": "chapter-bull-run",
  // Winds of Change
  "Kite": "chapter-winds-of-change",
  "Acorn House": "chapter-winds-of-change",
  "Spring Duckling": "chapter-winds-of-change",
  "Igloo": "chapter-winds-of-change",
  "Ugly Duckling": "chapter-winds-of-change",
  "Lake Rug": "chapter-winds-of-change",
  "Hammock": "chapter-winds-of-change",
  "Mammoth": "chapter-winds-of-change",
  "Cup of Chocolate": "chapter-winds-of-change",
  "Acorn Hat": "chapter-winds-of-change",
  "Ladybug Suit": "chapter-winds-of-change",
  "Crab Hat": "chapter-winds-of-change",
  "Sickle": "chapter-winds-of-change",
  // Great Bloom
  "Flower-Scribed Statue": "chapter-great-bloom",
  "Balloon Rug": "chapter-great-bloom",
  "Giant Yam": "chapter-great-bloom",
  "Heart Air Balloon": "chapter-great-bloom",
  "Giant Zucchini": "chapter-great-bloom",
  "Giant Kale": "chapter-great-bloom",
  "Mini Floating Island": "chapter-great-bloom",
  "Bloomwarden Suit": "chapter-great-bloom",
  "Embersteel Suit": "chapter-great-bloom",
  "Amberfall Suit": "chapter-great-bloom",
  "Glacierguard Suit": "chapter-great-bloom",
  "Flower Mask": "chapter-great-bloom",
  "Love Charm Shirt": "chapter-great-bloom",
  "Frost Sword": "chapter-great-bloom",
  "Oracle Syringe": "chapter-great-bloom",
  // Better Together
  "Floor Mirror": "chapter-better-together",
  "Long Rug": "chapter-better-together",
  "Garbage Bin": "chapter-better-together",
  "Wheelbarrow": "chapter-better-together",
  "Snail King": "chapter-better-together",
  "Reelmaster's Chair": "chapter-better-together",
  "Rat King": "chapter-better-together",
  "Fruit Tune Box": "chapter-better-together",
  "Double Bed": "chapter-better-together",
  "Giant Artichoke": "chapter-better-together",
  "Teamwork Monument": "chapter-better-together",
  "Garbage Bin Hat": "chapter-better-together",
  "Architect Ruler": "chapter-better-together",
  "Raccoon Onesie": "chapter-better-together",
  "Recycle Shirt": "chapter-better-together",
  "Pickaxe Shark": "chapter-better-together",
  // Paw Prints
  "Petnip Plant": "chapter-paw-prints",
  "Pet Kennel": "chapter-paw-prints",
  "Pet Toys": "chapter-paw-prints",
  "Pet Playground": "chapter-paw-prints",
  "Fish Bowl": "chapter-paw-prints",
  "Giant Acorn": "chapter-paw-prints",
  "Giant Gold Bone": "chapter-paw-prints",
  "Lunar Temple": "chapter-paw-prints",
  "Magma Stone": "chapter-paw-prints",
  "Cornucopia": "chapter-paw-prints",
  "Messy Bed": "chapter-paw-prints",
  "Pet Specialist Hat": "chapter-paw-prints",
  "Pet Specialist Pants": "chapter-paw-prints",
  "Pet Specialist Shirt": "chapter-paw-prints",
  "Saw Fish": "chapter-paw-prints",
  // Crabs and Traps
  "Meerkat": "chapter-crabs-and-traps",
  "Crimstone Clam": "chapter-crabs-and-traps",
  "Poseidon's Throne": "chapter-crabs-and-traps",
  "Oaken": "chapter-crabs-and-traps",
  "Fish Hook Hat": "chapter-crabs-and-traps",
  "Fish Hook Vest": "chapter-crabs-and-traps",
  "Fish Hook Waders": "chapter-crabs-and-traps",
  "Corn Silk Hair": "chapter-crabs-and-traps",
  // Salt Awakening
  "Crystal Altar": "chapter-salt-awakening",
  "Dino Egg Trophy": "chapter-salt-awakening",
  "Salt Lamp": "chapter-salt-awakening",
  "Salt Crystal Bed": "chapter-salt-awakening",
  "World Map Rug": "chapter-salt-awakening",
  "Ripped Salt Bag": "chapter-salt-awakening",
  "Spa Hat": "chapter-salt-awakening",
  "Spa Robe": "chapter-salt-awakening",
  "Spa Slippers": "chapter-salt-awakening",
  "Bubble Aura": "chapter-salt-awakening",
  "Deep Sea Salt Cave Background": "chapter-salt-awakening",
};

/** Chapter banners (`${ChapterName} Banner`) — chapter.ts CHAPTER_BANNERS, one per chapter (all 14). */
const CHAPTER_BANNER_NAMES: Record<string, string> = {
  "Solar Flare Banner": "chapter-solar-flare",
  "Dawn Breaker Banner": "chapter-dawn-breaker",
  "Witches' Eve Banner": "chapter-witches-eve",
  "Catch the Kraken Banner": "chapter-catch-the-kraken",
  "Spring Blossom Banner": "chapter-spring-blossom",
  "Clash of Factions Banner": "chapter-clash-of-factions",
  "Pharaoh's Treasure Banner": "chapter-pharaohs-treasure",
  "Bull Run Banner": "chapter-bull-run",
  "Winds of Change Banner": "chapter-winds-of-change",
  "Great Bloom Banner": "chapter-great-bloom",
  "Better Together Banner": "chapter-better-together",
  "Paw Prints Banner": "chapter-paw-prints",
  "Crabs and Traps Banner": "chapter-crabs-and-traps",
  "Salt Awakening Banner": "chapter-salt-awakening",
};

/**
 * Origin categories for items not tied to one specific chapter: recurring
 * NPC/event features (Blacksmiths, Pirate event, Treasure/Beach Bounty,
 * Potion House, Faction Shop) and one-off pre-chapter-system eras (Legacy,
 * the Goblin War event, the MOM event, the Traveling Salesman, quest
 * rewards). Source: craftables.ts (LegacyItem/BarnItem/MarketItem/
 * WarBanner/WarTentItem/MOMEventItem/TravelingSalesmanItem/QuestItem),
 * collectibles.ts (HeliosBlacksmithItem/GoblinBlacksmithItemName/
 * GoblinPirateItemName/TreasureCollectibleItem/PotionHouseItemName),
 * factionShop.ts (FactionShopCollectibleName/FactionShopWearableName,
 * excluding the shared HourglassType members already handled as
 * temporary-boost removals elsewhere).
 */
const ORIGIN_NAME_SETS: Record<string, Set<string>> = {
  legacy: new Set([
    // LegacyItem
    "Sunflower Statue", "Potato Statue", "Christmas Tree", "Gnome",
    "Sunflower Tombstone", "Sunflower Rock", "Fountain",
    "Woody the Beaver", "Apprentice Beaver", "Foreman Beaver", "Nyon Statue",
    "Homeless Tent", "Egg Basket", "Farmer Bath", "Mysterious Head",
    "Tunnel Mole", "Rocky the Mole", "Nugget", "Rock Golem",
    // BarnItem
    "Farm Cat", "Farm Dog", "Chicken Coop", "Gold Egg", "Easter Bunny", "Rooster",
    // MarketItem
    "Nancy", "Scarecrow", "Kuebiko", "Golden Cauliflower", "Mysterious Parsnip", "Carrot Sword",
  ]),
  "war-event": new Set([
    "Human War Banner", "Goblin War Banner",
    "Sunflower Amulet", "Carrot Amulet", "Beetroot Amulet", "Green Amulet",
    "Warrior Shirt", "Warrior Pants", "Warrior Helmet", "Sunflower Shield",
    "Skull Hat", "War Skull", "War Tombstone", "Undead Rooster",
  ]),
  "mom-event": new Set(["Engine Core", "Observatory"]),
  "traveling-salesman": new Set(["Wicker Man", "Golden Bonsai", "Victoria Sisters", "Christmas Bear"]),
  "quest-item": new Set(["Goblin Key", "Sunflower Key", "Ancient Goblin Sword", "Ancient Human Warhammer"]),
  "blacksmith-goblin": new Set(["Purple Trail", "Obie", "Mushroom House", "Maximus"]),
  "blacksmith-helios": new Set([
    "Immortal Pear", "Basic Scarecrow", "Bale", "Scary Mike", "Laurie the Chuckle Crow",
    "Iron Beetle", "Gold Beetle", "Fairy Circle", "Squirrel", "Macaw", "Butterfly", "Salt Sculpture",
  ]),
  "pirate-event": new Set([
    "Iron Idol", "Heart of Davy Jones", "Karkinos", "Emerald Turtle",
    "Tin Turtle", "Parasaur Skull", "Golden Bear Head",
  ]),
  "treasure": new Set(["Treasure Map", "Adrift Ark", "Castellan", "Sunlit Citadel", "Baobab Tree", "Camel"]),
  "potion-house": new Set(["Lab Grown Carrot", "Lab Grown Radish", "Lab Grown Pumpkin"]),
  "faction-shop": new Set([
    // Bumpkin faction
    "Bumpkin Throne", "Bumpkin Charm Egg", "Sapphire Bumpkin Goblet", "Bumpkin Bunting",
    "Bumpkin Candles", "Bumpkin Left Wall Sconce", "Bumpkin Right Wall Sconce", "Bumpkin Faction Rug",
    "Bumpkin Armor", "Bumpkin Helmet", "Bumpkin Sword", "Bumpkin Pants", "Bumpkin Sabatons",
    "Bumpkin Crown", "Bumpkin Shield", "Bumpkin Quiver", "Bumpkin Medallion",
    // Goblin faction
    "Goblin Throne", "Goblin Mischief Egg", "Emerald Goblin Goblet", "Goblin Bunting",
    "Goblin Candles", "Goblin Left Wall Sconce", "Goblin Right Wall Sconce", "Goblin Faction Rug",
    "Goblin Armor", "Goblin Helmet", "Goblin Pants", "Goblin Sabatons", "Goblin Axe",
    "Goblin Crown", "Goblin Shield", "Goblin Quiver", "Goblin Medallion",
    // Sunflorian faction
    "Sunflorian Throne", "Golden Sunflorian Egg", "Opal Sunflorian Goblet", "Sunflorian Bunting",
    "Sunflorian Candles", "Sunflorian Left Wall Sconce", "Sunflorian Right Wall Sconce", "Sunflorian Faction Rug",
    "Sunflorian Armor", "Sunflorian Sword", "Sunflorian Helmet", "Sunflorian Pants", "Sunflorian Sabatons",
    "Sunflorian Crown", "Sunflorian Shield", "Sunflorian Quiver", "Sunflorian Medallion",
    // Nightshade faction
    "Nightshade Throne", "Nightshade Veil Egg", "Amethyst Nightshade Goblet", "Nightshade Bunting",
    "Nightshade Candles", "Nightshade Left Wall Sconce", "Nightshade Right Wall Sconce", "Nightshade Faction Rug",
    "Nightshade Armor", "Nightshade Helmet", "Nightshade Pants", "Nightshade Sabatons", "Nightshade Sword",
    "Nightshade Crown", "Nightshade Shield", "Nightshade Quiver", "Nightshade Medallion",
    // Shared
    "Golden Faction Goblet", "Ruby Faction Goblet", "Knight Gambit", "Royal Braids",
  ]),
  // Recurring yearly themed shops (halloweenShop.ts / minigameShop.ts) — a
  // different mechanic from numbered Chapters, these repeat every year with
  // (mostly) the same items. Shared reward tokens common to every event
  // (Super Totem, Treasure Key, Rare Key, Luxury Key) are deliberately left
  // untagged here since they aren't specific to any one event.
  "event-easter": new Set([
    "White Tunnel Bunny", "White Bunny Lantern", "Orange Tunnel Bunny", "Orange Bunny Lantern", "Carrot House",
    "Bunny Pants", "Handheld Bunny", "Carrot Pitchfork", "Bunny Mask", "Easter Apron",
  ]),
  "event-festival-of-colors": new Set([
    "Floating Toy", "Paint Buckets", "Rainbow Well", "Rainbow Flower", "Pony Toy",
    "Red Slime Balloon", "Blue Slime Balloon",
    "Paint Splattered Hair", "Paint Splattered Shirt", "Paint Splattered Overalls",
    "Paint Spray Can", "Slime Hat", "Slime Wings", "Slime Aura",
  ]),
  "event-halloween": new Set([
    "Cerberus", "Witch's Cauldron", "Raveyard", "Haunted House", "Mimic Egg", "Haunted Tomb",
    "Guillotine", "Vampire Coffin",
    "Moonseeker Potion", "Frizzy Bob Cut", "Two-toned Layered", "Halloween Deathscythe",
    "Moonseeker Hand Puppet", "Sweet Devil Horns", "Trick and Treat", "Jack O'Sweets",
    "Frank Onesie", "Research Uniform", "Sweet Devil Dress", "Underworld Stimpack",
    "Sweet Devil Wings", "Wisp Aura",
  ]),
  "event-holiday": new Set([
    "Festive Tree", "Holiday Decorative Totem", "Red Holiday Ornament", "Green Holiday Ornament",
    "Gift Turtle", "Red Nose Reindeer", "Tuxedo Claus", "Winter Alpaca", "Penguin Surprise",
    "Frozen Meat", "Ho Ho oh oh…",
    "Comfy Xmas Sweater", "Comfy Xmas Pants", "Candy Halbred", "Xmas Top Hat", "Reindeer Mask",
    "Snowman Mask", "Cool Glasses", "Cookie Shield", "Holiday Feast Background",
    "Cozy Reindeer Onesie", "Diamond Snow Aura",
  ]),
  "event-april-fools": new Set([
    "Teeth Toy", "Fake Treasure", "Fake Mouse", "Pet Tree", "Definitely not a Flower",
    "Neon Noiz Jacket", "404 Chic Top", "Neon Noiz Pants", "404 Chic Skirt", "Admin Fools Tools",
    "Neon Noiz Shoes", "404 Chic Boots", "Aether Specs", "Faulty Barrier Background",
    "Cardboard Wings", "Glitch Aura",
  ]),
};

/** Tag a catalog item by what kind of placeable it is (node / monument / village-project / building / shrine), plus chapter-of-origin / event-origin tags where the source still has that data. */
export function getItemTags(itemName: string, itemType: string): string[] {
  const tags: string[] = [];
  if (NODE_NAMES.has(itemName)) tags.push("node");
  if (MONUMENT_NAMES.has(itemName)) tags.push("monument");
  if (VILLAGE_PROJECT_NAMES.has(itemName)) tags.push("village-project");
  if (BUILDING_NAMES.has(itemName)) tags.push("building");
  if (SHRINE_NAMES.has(itemName)) tags.push("shrine");

  const chapterTag = CHAPTER_BANNER_NAMES[itemName] ?? CHAPTER_ITEM_NAMES[itemName];
  if (chapterTag) tags.push(chapterTag);

  for (const [origin, names] of Object.entries(ORIGIN_NAME_SETS)) {
    if (names.has(itemName)) tags.push(origin);
  }

  return tags;
}
