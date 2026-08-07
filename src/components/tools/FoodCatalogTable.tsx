import { useMemo, useState } from 'react';
import '../SortableTable.css';
import FOOD_ICONS from '../../lib/foodIcons.json';
import BOOST_ICONS from '../../lib/boostIcons.json';
import { SKILL_ICONS } from '../../lib/skills';

/**
 * Рецепты и формулы сверены с исходниками sunflower-land (см. scripts/README.md):
 * - features/game/types/consumables.ts — FIRE_PIT_COOKABLES / KITCHEN_COOKABLES /
 *   BAKERY_COOKABLES / DELI_COOKABLES / JUICE_COOKABLES (name/experience/
 *   cookingSeconds/ingredients/building).
 * - features/game/expansion/lib/boosts.ts — getCookingTime (бусты времени) и
 *   getFoodExpBoost (бусты опыта).
 * - features/game/events/landExpansion/cook.ts — BUILDING_OIL_BOOSTS (буст от
 *   масла, зависит от здания и от ранга Swift Sizzle/Turbo Fry/Fry Frenzy).
 * - src/lib/skills.ts — ранги скиллов дерева Cooking (уже нормализованы в проекте).
 *
 * Иконки — src/lib/foodIcons.json (имя блюда/рыбы/ингредиента -> путь спрайта),
 * сгенерирован из ITEM_DETAILS / CROP_LIFECYCLE исходников игры (см. историю
 * коммита: scripts/lib/sprite-map.ts parseSpriteMap/parseCropCdnMap).
 */

function FoodIcon({ name, small }: { name: string; small?: boolean }) {
  const src = (FOOD_ICONS as Record<string, string>)[name];
  if (!src) return null;
  return <img src={src} alt="" className={small ? 'ref-marvel-icon ref-food-icon--sm' : 'ref-marvel-icon'} />;
}

/** Иконка навыка (SKILL_ICONS, src/lib/skills.ts) или предмета (boostIcons.json) по имени. */
function BoostIcon({ name }: { name: string }) {
  const src = SKILL_ICONS[name] ?? (BOOST_ICONS as Record<string, string>)[name];
  if (!src) return null;
  return <img src={src} alt="" className="ref-marvel-icon ref-food-icon--sm" />;
}

/** Значок молнии — ставится рядом со значением, изменённым активными бустами. */
function BoostBadge() {
  return (
    <span className="ref-food-boost-badge" title="Значение с учётом бустов">
      ⚡
    </span>
  );
}

/**
 * На мобильном таблица превращается в карточки (см. SortableTable.css) и
 * заголовки с кнопками сортировки скрываются — этот select дублирует ту же
 * сортировку в виде "Колонка ↑/↓", виден только на мобильном (CSS).
 */
function MobileSortSelect<K extends string>({
  columns,
  sortKey,
  sortDir,
  onChange,
}: {
  columns: { key: K; label: string }[];
  sortKey: K;
  sortDir: 'asc' | 'desc';
  onChange: (key: K, dir: 'asc' | 'desc') => void;
}) {
  const value = `${sortKey}:${sortDir}`;
  return (
    <label className="ref-food-mobile-sort">
      <span>Сортировать по</span>
      <select
        value={value}
        onChange={(e) => {
          const [key, dir] = e.target.value.split(':') as [K, 'asc' | 'desc'];
          onChange(key, dir);
        }}
        className="ref-food-rank-select"
      >
        {columns.map((col) => (
          <optgroup key={col.key} label={col.label}>
            <option value={`${col.key}:asc`}>{col.label} ↑</option>
            <option value={`${col.key}:desc`}>{col.label} ↓</option>
          </optgroup>
        ))}
      </select>
    </label>
  );
}

type Building = 'Fire Pit' | 'Kitchen' | 'Bakery' | 'Deli' | 'Smoothie Shack';

interface Recipe {
  name: string;
  building: Building;
  experience: number;
  cookingSeconds: number;
  ingredients: [string, number][];
  isCake?: boolean;
  isHoney?: boolean;
}

const FIRE_PIT: Recipe[] = [
  { name: 'Rhubarb Tart', building: 'Fire Pit', experience: 5, cookingSeconds: 60, ingredients: [['Rhubarb', 3]] },
  { name: 'Mashed Potato', building: 'Fire Pit', experience: 3, cookingSeconds: 30, ingredients: [['Potato', 8]] },
  { name: 'Pumpkin Soup', building: 'Fire Pit', experience: 24, cookingSeconds: 180, ingredients: [['Pumpkin', 10]] },
  { name: 'Reindeer Carrot', building: 'Fire Pit', experience: 36, cookingSeconds: 300, ingredients: [['Carrot', 5]] },
  { name: 'Mushroom Soup', building: 'Fire Pit', experience: 56, cookingSeconds: 600, ingredients: [['Wild Mushroom', 5]] },
  { name: 'Bumpkin Broth', building: 'Fire Pit', experience: 96, cookingSeconds: 1200, ingredients: [['Carrot', 10], ['Cabbage', 5]] },
  { name: 'Boiled Eggs', building: 'Fire Pit', experience: 90, cookingSeconds: 3600, ingredients: [['Egg', 10]] },
  { name: 'Popcorn', building: 'Fire Pit', experience: 200, cookingSeconds: 720, ingredients: [['Sunflower', 100], ['Corn', 5]] },
  { name: 'Rapid Roast', building: 'Fire Pit', experience: 300, cookingSeconds: 10, ingredients: [['Magic Mushroom', 1], ['Pumpkin', 40]] },
  { name: 'Cabbers n Mash', building: 'Fire Pit', experience: 250, cookingSeconds: 2400, ingredients: [['Mashed Potato', 10], ['Cabbage', 20]] },
  { name: 'Kale Stew', building: 'Fire Pit', experience: 400, cookingSeconds: 7200, ingredients: [['Kale', 10]] },
  { name: 'Fried Tofu', building: 'Fire Pit', experience: 400, cookingSeconds: 5400, ingredients: [['Soybean', 15], ['Sunflower', 200]] },
  { name: 'Gumbo', building: 'Fire Pit', experience: 600, cookingSeconds: 14400, ingredients: [['Potato', 50], ['Pumpkin', 30], ['Carrot', 20], ['Red Snapper', 3]] },
  { name: 'Kale Omelette', building: 'Fire Pit', experience: 1250, cookingSeconds: 12600, ingredients: [['Egg', 40], ['Kale', 5]] },
  { name: 'Rice Bun', building: 'Fire Pit', experience: 2600, cookingSeconds: 18000, ingredients: [['Rice', 2], ['Wheat', 50]] },
  { name: 'Saltbite', building: 'Fire Pit', experience: 3000, cookingSeconds: 14400, ingredients: [['Saltwort', 10]] },
  { name: 'Antipasto', building: 'Fire Pit', experience: 3000, cookingSeconds: 10800, ingredients: [['Olive', 2], ['Grape', 2]] },
  { name: 'Pizza Margherita', building: 'Fire Pit', experience: 25000, cookingSeconds: 72000, ingredients: [['Tomato', 30], ['Cheese', 5], ['Wheat', 20]] },
  { name: 'Furikake Sprinkle', building: 'Fire Pit', experience: 1000, cookingSeconds: 0, ingredients: [['Fish Flake', 1], ['Seaweed', 1]] },
];

const KITCHEN: Recipe[] = [
  { name: 'Sunflower Crunch', building: 'Kitchen', experience: 50, cookingSeconds: 600, ingredients: [['Sunflower', 300]] },
  { name: 'Mushroom Jacket Potatoes', building: 'Kitchen', experience: 240, cookingSeconds: 600, ingredients: [['Wild Mushroom', 10], ['Potato', 5]] },
  { name: 'Beetroot Blaze', building: 'Kitchen', experience: 2000, cookingSeconds: 30, ingredients: [['Magic Mushroom', 2], ['Beetroot', 50]] },
  { name: 'Roast Veggies', building: 'Kitchen', experience: 170, cookingSeconds: 7200, ingredients: [['Cauliflower', 15], ['Carrot', 10]] },
  { name: 'Club Sandwich', building: 'Kitchen', experience: 170, cookingSeconds: 10800, ingredients: [['Sunflower', 100], ['Carrot', 25], ['Wheat', 5]] },
  { name: 'Cauliflower Burger', building: 'Kitchen', experience: 255, cookingSeconds: 10800, ingredients: [['Cauliflower', 15], ['Wheat', 5]] },
  { name: 'Fruit Salad', building: 'Kitchen', experience: 225, cookingSeconds: 1800, ingredients: [['Apple', 1], ['Orange', 1], ['Blueberry', 1]] },
  { name: 'Bumpkin Salad', building: 'Kitchen', experience: 290, cookingSeconds: 12600, ingredients: [['Beetroot', 20], ['Parsnip', 10]] },
  { name: 'Goblin’s Treat', building: 'Kitchen', experience: 500, cookingSeconds: 21600, ingredients: [['Pumpkin', 10], ['Radish', 20], ['Cabbage', 10]] },
  { name: 'Pancakes', building: 'Kitchen', experience: 1000, cookingSeconds: 3600, ingredients: [['Wheat', 10], ['Egg', 10], ['Honey', 6]], isHoney: true },
  { name: 'Fish Burger', building: 'Kitchen', experience: 1300, cookingSeconds: 7200, ingredients: [['Beetroot', 10], ['Wheat', 10], ['Horse Mackerel', 1]] },
  { name: 'Ocean’s Olive', building: 'Kitchen', experience: 2000, cookingSeconds: 7200, ingredients: [['Olive Flounder', 1], ['Olive', 2]] },
  { name: 'Fried Calamari', building: 'Kitchen', experience: 1500, cookingSeconds: 18000, ingredients: [['Sunflower', 200], ['Wheat', 15], ['Squid', 1]] },
  { name: 'Fish Omelette', building: 'Kitchen', experience: 1500, cookingSeconds: 18000, ingredients: [['Egg', 40], ['Surgeonfish', 1], ['Butterflyfish', 2]] },
  { name: 'Bumpkin ganoush', building: 'Kitchen', experience: 1000, cookingSeconds: 18000, ingredients: [['Eggplant', 30], ['Potato', 50], ['Parsnip', 10]] },
  { name: 'Sushi Roll', building: 'Kitchen', experience: 2000, cookingSeconds: 3600, ingredients: [['Angelfish', 1], ['Seaweed', 1], ['Rice', 2]] },
  { name: 'Fish n Chips', building: 'Kitchen', experience: 2000, cookingSeconds: 14400, ingredients: [['Fancy Fries', 1], ['Halibut', 1]] },
  { name: 'Seafood Basket', building: 'Kitchen', experience: 2200, cookingSeconds: 18000, ingredients: [['Blowfish', 2], ['Napoleanfish', 2], ['Sunfish', 2]] },
  { name: 'Bumpkin Roast', building: 'Kitchen', experience: 2500, cookingSeconds: 43200, ingredients: [['Mashed Potato', 20], ['Roast Veggies', 5]] },
  { name: 'Goblin Brunch', building: 'Kitchen', experience: 2500, cookingSeconds: 43200, ingredients: [['Boiled Eggs', 5], ['Goblin’s Treat', 1]] },
  { name: 'Tofu Scramble', building: 'Kitchen', experience: 1000, cookingSeconds: 10800, ingredients: [['Soybean', 20], ['Egg', 20], ['Cauliflower', 10]] },
  { name: 'Chowder', building: 'Kitchen', experience: 1000, cookingSeconds: 28800, ingredients: [['Beetroot', 10], ['Wheat', 10], ['Parsnip', 5], ['Anchovy', 3]] },
  { name: 'Caprese Salad', building: 'Kitchen', experience: 6000, cookingSeconds: 10800, ingredients: [['Cheese', 1], ['Tomato', 25], ['Kale', 20]] },
  { name: 'Steamed Red Rice', building: 'Kitchen', experience: 3000, cookingSeconds: 14400, ingredients: [['Rice', 3], ['Beetroot', 50]] },
  { name: 'Spaghetti al Limone', building: 'Kitchen', experience: 15000, cookingSeconds: 54000, ingredients: [['Wheat', 10], ['Lemon', 15], ['Cheese', 3]] },
  { name: 'Surimi Rice Bowl', building: 'Kitchen', experience: 3000, cookingSeconds: 0, ingredients: [['Fish Stick', 1], ['Rice', 1], ['Onion', 1]] },
  { name: 'Creamy Crab Bite', building: 'Kitchen', experience: 10000, cookingSeconds: 0, ingredients: [['Crab Stick', 1], ['Cheese', 3]] },
  { name: 'Crimstone Infused Fish Oil', building: 'Kitchen', experience: 18000, cookingSeconds: 0, ingredients: [['Fish Oil', 1], ['Crimstone', 1]] },
];

const BAKERY: Recipe[] = [
  { name: 'Apple Pie', building: 'Bakery', experience: 720, cookingSeconds: 14400, ingredients: [['Apple', 5], ['Wheat', 10], ['Egg', 20]] },
  { name: 'Kale & Mushroom Pie', building: 'Bakery', experience: 720, cookingSeconds: 14400, ingredients: [['Wild Mushroom', 10], ['Kale', 5], ['Wheat', 5]] },
  { name: 'Cornbread', building: 'Bakery', experience: 600, cookingSeconds: 43200, ingredients: [['Corn', 15], ['Wheat', 5], ['Egg', 10]] },
  { name: 'Sunflower Cake', building: 'Bakery', experience: 525, cookingSeconds: 23400, ingredients: [['Sunflower', 1000], ['Wheat', 10], ['Egg', 30]], isCake: true },
  { name: 'Potato Cake', building: 'Bakery', experience: 650, cookingSeconds: 37800, ingredients: [['Potato', 500], ['Wheat', 10], ['Egg', 30]], isCake: true },
  { name: 'Pumpkin Cake', building: 'Bakery', experience: 625, cookingSeconds: 37800, ingredients: [['Pumpkin', 130], ['Wheat', 10], ['Egg', 30]], isCake: true },
  { name: 'Carrot Cake', building: 'Bakery', experience: 750, cookingSeconds: 46800, ingredients: [['Carrot', 120], ['Wheat', 10], ['Egg', 30]], isCake: true },
  { name: 'Cabbage Cake', building: 'Bakery', experience: 860, cookingSeconds: 54000, ingredients: [['Cabbage', 90], ['Wheat', 10], ['Egg', 30]], isCake: true },
  { name: 'Orange Cake', building: 'Bakery', experience: 730, cookingSeconds: 14400, ingredients: [['Orange', 5], ['Egg', 30], ['Wheat', 10]], isCake: true },
  { name: 'Beetroot Cake', building: 'Bakery', experience: 1250, cookingSeconds: 79200, ingredients: [['Beetroot', 100], ['Wheat', 10], ['Egg', 30]], isCake: true },
  { name: 'Cauliflower Cake', building: 'Bakery', experience: 1190, cookingSeconds: 79200, ingredients: [['Cauliflower', 60], ['Wheat', 10], ['Egg', 30]], isCake: true },
  { name: 'Parsnip Cake', building: 'Bakery', experience: 1300, cookingSeconds: 86400, ingredients: [['Parsnip', 45], ['Wheat', 10], ['Egg', 30]], isCake: true },
  { name: 'Radish Cake', building: 'Bakery', experience: 1200, cookingSeconds: 86400, ingredients: [['Radish', 25], ['Wheat', 10], ['Egg', 30]], isCake: true },
  { name: 'Eggplant Cake', building: 'Bakery', experience: 1400, cookingSeconds: 86400, ingredients: [['Eggplant', 30], ['Wheat', 10], ['Egg', 30]], isCake: true },
  { name: 'Wheat Cake', building: 'Bakery', experience: 1100, cookingSeconds: 86400, ingredients: [['Wheat', 35], ['Egg', 30]], isCake: true },
  { name: 'Honey Cake', building: 'Bakery', experience: 4000, cookingSeconds: 28800, ingredients: [['Honey', 10], ['Wheat', 10], ['Egg', 20]], isCake: true, isHoney: true },
  { name: 'Lemon Cheesecake', building: 'Bakery', experience: 30000, cookingSeconds: 108000, ingredients: [['Lemon', 20], ['Cheese', 5], ['Egg', 40]], isCake: true },
];

const DELI: Recipe[] = [
  { name: 'Cheese', building: 'Deli', experience: 1, cookingSeconds: 1200, ingredients: [['Milk', 3]] },
  { name: 'Shroom Syrup', building: 'Deli', experience: 10000, cookingSeconds: 10, ingredients: [['Magic Mushroom', 3], ['Honey', 20]], isHoney: true },
  { name: 'Fermented Carrots', building: 'Deli', experience: 250, cookingSeconds: 86400, ingredients: [['Carrot', 20]] },
  { name: 'Blueberry Jam', building: 'Deli', experience: 500, cookingSeconds: 43200, ingredients: [['Blueberry', 5]] },
  { name: 'Sauerkraut', building: 'Deli', experience: 500, cookingSeconds: 86400, ingredients: [['Cabbage', 20]] },
  { name: 'Fancy Fries', building: 'Deli', experience: 1000, cookingSeconds: 86400, ingredients: [['Sunflower', 500], ['Potato', 500]] },
  { name: 'Blue Cheese', building: 'Deli', experience: 6000, cookingSeconds: 10800, ingredients: [['Cheese', 2], ['Blueberry', 10]] },
  { name: 'Fermented Fish', building: 'Deli', experience: 3000, cookingSeconds: 86400, ingredients: [['Tuna', 6]] },
  { name: 'Honey Cheddar', building: 'Deli', experience: 15000, cookingSeconds: 43200, ingredients: [['Cheese', 3], ['Honey', 5]], isHoney: true },
];

const SMOOTHIE_SHACK: Recipe[] = [
  { name: 'Quick Juice', building: 'Smoothie Shack', experience: 100, cookingSeconds: 1800, ingredients: [['Sunflower', 50], ['Pumpkin', 40]] },
  { name: 'Carrot Juice', building: 'Smoothie Shack', experience: 200, cookingSeconds: 3600, ingredients: [['Carrot', 30]] },
  { name: 'Purple Smoothie', building: 'Smoothie Shack', experience: 310, cookingSeconds: 1800, ingredients: [['Blueberry', 5], ['Cabbage', 10]] },
  { name: 'Orange Juice', building: 'Smoothie Shack', experience: 375, cookingSeconds: 2700, ingredients: [['Orange', 5]] },
  { name: 'Apple Juice', building: 'Smoothie Shack', experience: 500, cookingSeconds: 3600, ingredients: [['Apple', 5]] },
  { name: 'Sour Shake', building: 'Smoothie Shack', experience: 1000, cookingSeconds: 3600, ingredients: [['Lemon', 20]] },
  { name: 'Power Smoothie', building: 'Smoothie Shack', experience: 775, cookingSeconds: 5400, ingredients: [['Blueberry', 10], ['Kale', 5]] },
  { name: 'Bumpkin Detox', building: 'Smoothie Shack', experience: 975, cookingSeconds: 7200, ingredients: [['Apple', 5], ['Orange', 5], ['Carrot', 10]] },
  { name: 'Banana Blast', building: 'Smoothie Shack', experience: 1200, cookingSeconds: 10800, ingredients: [['Banana', 10], ['Egg', 10]] },
  { name: 'The Lot', building: 'Smoothie Shack', experience: 1500, cookingSeconds: 12600, ingredients: [['Blueberry', 1], ['Orange', 1], ['Grape', 1], ['Apple', 1], ['Banana', 1]] },
  { name: 'Grape Juice', building: 'Smoothie Shack', experience: 3300, cookingSeconds: 10800, ingredients: [['Grape', 5], ['Radish', 20]] },
  { name: 'Slow Juice', building: 'Smoothie Shack', experience: 7500, cookingSeconds: 86400, ingredients: [['Grape', 10], ['Kale', 100]] },
];

const BUILDINGS: { key: Building; label: string; icon: string; recipes: Recipe[] }[] = [
  { key: 'Fire Pit', label: 'Fire Pit', icon: '\u{1F525}', recipes: FIRE_PIT },
  { key: 'Kitchen', label: 'Kitchen', icon: '\u{1F373}', recipes: KITCHEN },
  { key: 'Bakery', label: 'Bakery', icon: '\u{1F370}', recipes: BAKERY },
  { key: 'Deli', label: 'Deli', icon: '\u{1F9C0}', recipes: DELI },
  { key: 'Smoothie Shack', label: 'Smoothie Shack', icon: '\u{1F964}', recipes: SMOOTHIE_SHACK },
];

/**
 * Рыба — не рецепт готовки: её можно съесть сырой сразу (без здания/ингредиентов)
 * или заложить в Aging Shed за соль, чтобы получить Aged Fish (и с шансом 10% —
 * Prime Aged Fish, ×1.3 XP). Формулы сверены с features/game/types/agingBase.ts
 * (getAgingMaxXP / getAgingSaltCost / getAgingTimeMs) — см. также FishAgingTable.tsx
 * и src/content/mechanics/fish-aging.md.
 */
const FISH_BASE_XP: Record<string, number> = {
  Anchovy: 80, 'Red Snapper': 100, Butterflyfish: 110, 'Sea Bass': 140, Blowfish: 170,
  'Olive Flounder': 180, Napoleanfish: 180, Tilapia: 190, Tuna: 200, 'Mahi Mahi': 200,
  'Blue Marlin': 200, 'Football fish': 200, Sunfish: 200, 'Sea Horse': 240, Halibut: 220,
  'Moray Eel': 220, 'Zebra Turkeyfish': 220, Oarfish: 220, Clownfish: 210, Surgeonfish: 210,
  Walleye: 210, Weakfish: 210, 'Horse Mackerel': 250, Squid: 250, Angelfish: 250, Porgy: 250,
  Muskellunge: 250, Cobia: 310, 'Rock Blackfish': 320, Trout: 330, Coelacanth: 410, Ray: 430,
  Parrotfish: 440, 'Barred Knifejaw': 580, 'Hammerhead shark': 750, 'Whale Shark': 1370,
  'Saw Shark': 1920, 'White Shark': 2000,
};

const PRIME_AGED_XP_MULTIPLIER = 1.3;

function getAgingMaxXP(baseXP: number): number {
  if (baseXP <= 200) return baseXP * 3;
  if (baseXP <= 330) return baseXP * 4;
  return baseXP * 5;
}
function getAgingSaltCost(baseXP: number): number {
  return Math.round(getAgingMaxXP(baseXP) / 50);
}
function getAgingTimeHours(baseXP: number): number {
  const maxXP = getAgingMaxXP(baseXP);
  const j = baseXP <= 200 ? 300 : baseXP <= 330 ? 500 : 1000;
  return (maxXP - baseXP) / j;
}

interface FishRow {
  name: string;
  rawXp: number;
  agedXp: number;
  primeAgedXp: number;
  saltCost: number;
  agingHours: number;
}

const FISH_ROWS: FishRow[] = Object.entries(FISH_BASE_XP).map(([name, baseXP]) => {
  const agedXp = getAgingMaxXP(baseXP);
  return {
    name,
    rawXp: baseXP,
    agedXp,
    primeAgedXp: Math.floor(agedXp * PRIME_AGED_XP_MULTIPLIER),
    saltCost: getAgingSaltCost(baseXP),
    agingHours: getAgingTimeHours(baseXP),
  };
});

// ── Бусты времени готовки (ранги — src/lib/skills.ts, сверено с boosts.ts) ──

interface TimeBoosts {
  fastFeastsRank: 0 | 1 | 2 | 3; // Fire Pit + Kitchen: x0.9/0.85/0.8
  frostedCakesRank: 0 | 1 | 2 | 3; // Cakes: x0.9/0.8/0.7
  oilFilled: boolean; // масло залито в конкретное здание прямо сейчас
  swiftSizzleRank: 0 | 1 | 2 | 3; // ранг Swift Sizzle (масло, Fire Pit)
  turboFryRank: 0 | 1 | 2 | 3; // ранг Turbo Fry (масло, Kitchen)
  fryFrenzyRank: 0 | 1 | 2 | 3; // ранг Fry Frenzy (масло, Deli)
  lunasHat: boolean; // x0.5, все здания
  chefsCleaver: boolean; // x0.85, все здания
  factionMedallion: boolean; // x0.75, все здания
  totem: boolean; // Super Totem / Time Warp Totem, x0.5, все здания
  desertGnome: boolean; // x0.9, все здания
  legendaryShrine: boolean; // x0.5, временный, стакается с Boar Shrine
  boarShrine: boolean; // x0.8, временный, стакается с Legendary Shrine
  gourmetHourglass: boolean; // x0.5, временный
}

const FAST_FEASTS_RANKS = [0.1, 0.15, 0.2];
const FROSTED_CAKES_RANKS = [0.1, 0.2, 0.3];
// Базовый % (без скилла) + ранги по зданию — src/lib/skills.ts / cook.ts BUILDING_OIL_BOOSTS
const OIL_BOOSTS: Record<Building, number[]> = {
  'Fire Pit': [0.2, 0.4, 0.45, 0.5], // Swift Sizzle
  Kitchen: [0.25, 0.5, 0.55, 0.6], // Turbo Fry
  Deli: [0.4, 0.6, 0.65, 0.7], // Fry Frenzy
  'Smoothie Shack': [0.3], // фиксированный, скилла нет
  Bakery: [0.35], // фиксированный, скилла нет
};

// Каждое здание с масляным скиллом читает свой отдельный ранг — Swift Sizzle,
// Turbo Fry и Fry Frenzy прокачиваются независимо друг от друга.
function oilSkillRankFor(building: Building, b: TimeBoosts): number {
  if (building === 'Fire Pit') return b.swiftSizzleRank;
  if (building === 'Kitchen') return b.turboFryRank;
  if (building === 'Deli') return b.fryFrenzyRank;
  return 0;
}

function timeMultiplier(recipe: Recipe, b: TimeBoosts): number {
  let mult = 1;
  if ((recipe.building === 'Fire Pit' || recipe.building === 'Kitchen') && b.fastFeastsRank > 0) {
    mult *= 1 - FAST_FEASTS_RANKS[b.fastFeastsRank - 1];
  }
  if (recipe.isCake && b.frostedCakesRank > 0) {
    mult *= 1 - FROSTED_CAKES_RANKS[b.frostedCakesRank - 1];
  }
  if (b.oilFilled) {
    const ranks = OIL_BOOSTS[recipe.building];
    const skillRank = oilSkillRankFor(recipe.building, b);
    const idx = ranks.length > 1 ? Math.min(skillRank, ranks.length - 1) : 0;
    mult *= 1 - ranks[idx];
  }
  if (b.lunasHat) mult *= 0.5;
  if (b.chefsCleaver) mult *= 0.85;
  if (b.factionMedallion) mult *= 0.75;
  if (b.totem) mult *= 0.5;
  if (b.desertGnome) mult *= 0.9;
  if (b.legendaryShrine) mult *= 0.5;
  if (b.boarShrine) mult *= 0.8;
  if (b.gourmetHourglass) mult *= 0.5;
  return mult;
}

// ── Бусты опыта (ранги — src/lib/skills.ts, сверено с boosts.ts) ──

interface XpBoosts {
  munchingMasteryRank: 0 | 1 | 2 | 3; // все блюда: +5/+7.5/+10%
  juicyBoostRank: 0 | 1 | 2 | 3; // Smoothie Shack: +10/+20/+30%
  driveThroughDeliRank: 0 | 1 | 2 | 3; // Deli: +15/+20/+25%
  buzzworthyTreatsRank: 0 | 1 | 2 | 3; // блюда с мёдом: +10/+20/+30%
  fishyFeastRank: 0 | 1 | 2 | 3; // рыба (сырая/выдержанная): +20/+30/+40%
  goldenSpatula: boolean; // +10%, все блюда
  pan: boolean; // +25%, все блюда
  vip: boolean; // +10%, все блюда
  observatory: boolean; // +5%, все блюда
  blossombeard: boolean; // +10%, все блюда
  luminousAnglerfishTopper: boolean; // +50%, только рыба
  skillShrimpy: boolean; // +20%, только рыба
}

const MUNCHING_MASTERY_RANKS = [0.05, 0.075, 0.1];
const JUICY_BOOST_RANKS = [0.1, 0.2, 0.3];
const DRIVE_THROUGH_DELI_RANKS = [0.15, 0.2, 0.25];
const BUZZWORTHY_TREATS_RANKS = [0.1, 0.2, 0.3];
const FISHY_FEAST_RANKS = [0.2, 0.3, 0.4];

// Бусты, общие для всех блюд и рыбы (Golden Spatula/Pan/VIP/Observatory/Blossombeard).
function universalXpMultiplier(b: XpBoosts): number {
  let mult = 1;
  if (b.munchingMasteryRank > 0) mult *= 1 + MUNCHING_MASTERY_RANKS[b.munchingMasteryRank - 1];
  if (b.goldenSpatula) mult *= 1.1;
  if (b.pan) mult *= 1.25;
  if (b.vip) mult *= 1.1;
  if (b.observatory) mult *= 1.05;
  if (b.blossombeard) mult *= 1.1;
  return mult;
}

function xpMultiplier(recipe: Recipe, b: XpBoosts): number {
  let mult = universalXpMultiplier(b);
  if (recipe.building === 'Smoothie Shack' && b.juicyBoostRank > 0) {
    mult *= 1 + JUICY_BOOST_RANKS[b.juicyBoostRank - 1];
  }
  if (recipe.building === 'Deli' && b.driveThroughDeliRank > 0) {
    mult *= 1 + DRIVE_THROUGH_DELI_RANKS[b.driveThroughDeliRank - 1];
  }
  if (recipe.isHoney && b.buzzworthyTreatsRank > 0) {
    mult *= 1 + BUZZWORTHY_TREATS_RANKS[b.buzzworthyTreatsRank - 1];
  }
  return mult;
}

// Рыба (сырая и выдержанная) получает универсальные бусты + Fishy Feast +
// Luminous Anglerfish Topper + Skill Shrimpy (все — специфичны для FISH_CONSUMABLES).
function fishXpMultiplier(b: XpBoosts): number {
  let mult = universalXpMultiplier(b);
  if (b.fishyFeastRank > 0) mult *= 1 + FISHY_FEAST_RANKS[b.fishyFeastRank - 1];
  if (b.luminousAnglerfishTopper) mult *= 1.5;
  if (b.skillShrimpy) mult *= 1.2;
  return mult;
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'мгновенно';
  const s = Math.round(totalSeconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d} д`);
  if (h > 0) parts.push(`${h} ч`);
  if (d === 0 && m > 0) parts.push(`${m} мин`);
  if (d === 0 && h === 0 && m === 0) parts.push(`${sec} сек`);
  return parts.join(' ') || '0 сек';
}

function RankSelect({
  label,
  icon,
  value,
  onChange,
  max = 3,
}: {
  label: string;
  icon?: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <label className="ref-marvel-boost-check">
      {icon && <BoostIcon name={icon} />}
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ref-food-rank-select"
      >
        <option value={0}>выкл</option>
        {Array.from({ length: max }, (_, i) => i + 1).map((r) => (
          <option key={r} value={r}>
            ранг {r}
          </option>
        ))}
      </select>
    </label>
  );
}

function Check({
  label,
  icon,
  checked,
  onChange,
}: {
  label: string;
  icon?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="ref-marvel-boost-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {icon && <BoostIcon name={icon} />}
      <span>{label}</span>
    </label>
  );
}

type SortKey = 'name' | 'experience' | 'cookingSeconds' | 'xpPerHour';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Блюдо' },
  { key: 'experience', label: 'Опыт' },
  { key: 'cookingSeconds', label: 'Время' },
  { key: 'xpPerHour', label: 'XP/час' },
];

function BuildingTable({
  recipes,
  timeBoosts,
  xpBoosts,
}: {
  recipes: Recipe[];
  timeBoosts: TimeBoosts;
  xpBoosts: XpBoosts;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('experience');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const rows = useMemo(() => {
    return recipes.map((r) => {
      const tMult = timeMultiplier(r, timeBoosts);
      const xMult = xpMultiplier(r, xpBoosts);
      const boostedSeconds = r.cookingSeconds * tMult;
      const boostedXp = r.experience * xMult;
      const xpPerHour = boostedSeconds > 0 ? (boostedXp / boostedSeconds) * 3600 : Infinity;
      return { ...r, boostedSeconds, boostedXp, xpPerHour, boosted: tMult < 1 || xMult > 1 };
    });
  }, [recipes, timeBoosts, xpBoosts]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (sortKey === 'name') {
        av = a.name;
        bv = b.name;
      } else if (sortKey === 'experience') {
        av = a.boostedXp;
        bv = b.boostedXp;
      } else if (sortKey === 'cookingSeconds') {
        av = a.boostedSeconds;
        bv = b.boostedSeconds;
      } else {
        av = a.xpPerHour === Infinity ? Number.MAX_SAFE_INTEGER : a.xpPerHour;
        bv = b.xpPerHour === Infinity ? Number.MAX_SAFE_INTEGER : b.xpPerHour;
      }
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  return (
    <div>
      <MobileSortSelect
        columns={COLUMNS}
        sortKey={sortKey}
        sortDir={sortDir}
        onChange={(key, dir) => {
          setSortKey(key);
          setSortDir(dir);
        }}
      />
      <div className="gc-sortable-wrap">
        <table className="gc-sortable-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th key={col.key}>
                <button type="button" className="gc-sortable-th-btn" onClick={() => toggleSort(col.key)}>
                  {col.label}
                  <span className={`gc-sortable-arrow${sortKey === col.key ? ' gc-sortable-arrow--active' : ''}`}>
                    {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                  </span>
                </button>
              </th>
            ))}
            <th>Ингредиенты</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((r) => (
            <tr key={r.name}>
              <td className="gc-sortable-name" data-label="Блюдо">
                <FoodIcon name={r.name} />
                {r.name}
              </td>
              <td
                data-label="Опыт"
                className={r.boostedXp !== r.experience ? 'ref-marvel-odds ref-marvel-odds--boosted' : undefined}
              >
                {Math.round(r.boostedXp)}
                {r.boostedXp !== r.experience && <BoostBadge />}
              </td>
              <td
                data-label="Время"
                className={r.boostedSeconds !== r.cookingSeconds ? 'ref-marvel-odds ref-marvel-odds--boosted' : undefined}
              >
                {formatDuration(r.boostedSeconds)}
                {r.boostedSeconds !== r.cookingSeconds && <BoostBadge />}
              </td>
              <td data-label="XP/час">{r.xpPerHour === Infinity ? '—' : Math.round(r.xpPerHour).toLocaleString('ru-RU')}</td>
              <td className="ref-table-resources" data-label="Ингредиенты">
                <span className="ref-resource-chips">
                  {r.ingredients.map(([name, amount]) => (
                    <span className="ref-resource-chip" key={name}>
                      <FoodIcon name={name} small />
                      {amount}× {name}
                    </span>
                  ))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}

type FishSortKey = 'name' | 'rawXp' | 'agedXp' | 'primeAgedXp' | 'saltCost' | 'agingHours' | 'agingXpPerHour';

const FISH_COLUMNS: { key: FishSortKey; label: string }[] = [
  { key: 'name', label: 'Рыба' },
  { key: 'rawXp', label: 'Сырая (XP)' },
  { key: 'saltCost', label: 'Соль' },
  { key: 'agingHours', label: 'Время соления' },
  { key: 'agedXp', label: 'Aged (XP)' },
  { key: 'primeAgedXp', label: 'Prime Aged (XP)' },
  { key: 'agingXpPerHour', label: 'XP/час (соление)' },
];

// ── Шанс на Prime Aged Fish (features/game/types/agingFormulas.ts getPrimeAgedChance) ──
const PRIME_AGED_BASE_CHANCE = 10; // %
const FISH_SMOKING_RANKS = [2, 3, 4]; // множитель на базовый шанс

interface PrimeChanceBoosts {
  fishSmokingRank: 0 | 1 | 2 | 3;
  saltSculpture: boolean; // Salt Sculpture ур. ≥2: +4%
  wingedVase: boolean; // +14%
}

function primeAgedChance(b: PrimeChanceBoosts): number {
  let chance = PRIME_AGED_BASE_CHANCE;
  if (b.fishSmokingRank > 0) chance *= FISH_SMOKING_RANKS[b.fishSmokingRank - 1];
  if (b.saltSculpture) chance += 4;
  if (b.wingedVase) chance += 14;
  return Math.min(chance, 100);
}

function FishTable({ xpBoosts }: { xpBoosts: XpBoosts }) {
  const [sortKey, setSortKey] = useState<FishSortKey>('rawXp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [primeBoosts, setPrimeBoosts] = useState<PrimeChanceBoosts>({
    fishSmokingRank: 0,
    saltSculpture: false,
    wingedVase: false,
  });

  function toggleSort(key: FishSortKey) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const chance = primeAgedChance(primeBoosts);

  const rows = useMemo(() => {
    const mult = fishXpMultiplier(xpBoosts);
    const chanceRatio = chance / 100;
    return FISH_ROWS.map((f) => {
      const boostedRawXp = Math.round(f.rawXp * mult);
      const boostedAgedXp = Math.round(f.agedXp * mult);
      const boostedPrimeAgedXp = Math.round(f.primeAgedXp * mult);
      // Средневзвешенный XP выдержанной рыбы с учётом шанса на Prime Aged.
      const avgAgedXp = boostedAgedXp * (1 - chanceRatio) + boostedPrimeAgedXp * chanceRatio;
      const agingXpPerHour = f.agingHours > 0 ? (avgAgedXp - boostedRawXp) / f.agingHours : Infinity;
      return {
        ...f,
        boostedRawXp,
        boostedAgedXp,
        boostedPrimeAgedXp,
        agingXpPerHour,
      };
    });
  }, [xpBoosts, chance]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let av: number | string = sortKey === 'name' ? a.name : a[sortKey];
      let bv: number | string = sortKey === 'name' ? b.name : b[sortKey];
      if (typeof av === 'number' && av === Infinity) av = Number.MAX_SAFE_INTEGER;
      if (typeof bv === 'number' && bv === Infinity) bv = Number.MAX_SAFE_INTEGER;
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  return (
    <div>
      <div className="ref-marvel-boost-widget">
        <div className="ref-food-boost-checks">
          <Check
            label="Salt Sculpture ур. 2+ (+4%)"
            icon="Salt Sculpture"
            checked={primeBoosts.saltSculpture}
            onChange={(v) => setPrimeBoosts((p) => ({ ...p, saltSculpture: v }))}
          />
          <Check
            label="Winged Vase (+14%)"
            icon="Winged Vase"
            checked={primeBoosts.wingedVase}
            onChange={(v) => setPrimeBoosts((p) => ({ ...p, wingedVase: v }))}
          />
        </div>
        <div className="ref-food-boost-selects">
          <RankSelect
            label="Fish Smoking (шанс Prime Aged)"
            icon="Fish Smoking"
            value={primeBoosts.fishSmokingRank}
            onChange={(v) => setPrimeBoosts((p) => ({ ...p, fishSmokingRank: v as 0 | 1 | 2 | 3 }))}
          />
        </div>
        <p className="ref-marvel-boost-total">
          <strong>Шанс Prime Aged: {chance}%</strong>
        </p>
      </div>
      <p className="ref-section-desc">
        Колонка «XP/час (соление)» считается по среднему XP выдержанной рыбы с учётом шанса
        Prime Aged выше — а не по гарантированной обычной Aged Fish.
      </p>
      <MobileSortSelect
        columns={FISH_COLUMNS}
        sortKey={sortKey}
        sortDir={sortDir}
        onChange={(key, dir) => {
          setSortKey(key);
          setSortDir(dir);
        }}
      />
      <div className="gc-sortable-wrap">
        <table className="gc-sortable-table">
          <thead>
            <tr>
              {FISH_COLUMNS.map((col) => (
                <th key={col.key}>
                  <button type="button" className="gc-sortable-th-btn" onClick={() => toggleSort(col.key)}>
                    {col.label}
                    <span className={`gc-sortable-arrow${sortKey === col.key ? ' gc-sortable-arrow--active' : ''}`}>
                      {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r) => (
              <tr key={r.name}>
                <td className="gc-sortable-name" data-label="Рыба">
                  <FoodIcon name={r.name} />
                  {r.name}
                </td>
                <td
                  data-label="Сырая (XP)"
                  className={r.boostedRawXp !== r.rawXp ? 'ref-marvel-odds ref-marvel-odds--boosted' : undefined}
                >
                  {r.boostedRawXp}
                  {r.boostedRawXp !== r.rawXp && <BoostBadge />}
                </td>
                <td data-label="Соль">{r.saltCost}</td>
                <td data-label="Время соления">{formatDuration(r.agingHours * 3600)}</td>
                <td
                  data-label="Aged (XP)"
                  className={r.boostedAgedXp !== r.agedXp ? 'ref-marvel-odds ref-marvel-odds--boosted' : undefined}
                >
                  {r.boostedAgedXp}
                  {r.boostedAgedXp !== r.agedXp && <BoostBadge />}
                </td>
                <td
                  data-label="Prime Aged (XP)"
                  className={r.boostedPrimeAgedXp !== r.primeAgedXp ? 'ref-marvel-odds ref-marvel-odds--boosted' : undefined}
                >
                  {r.boostedPrimeAgedXp}
                  {r.boostedPrimeAgedXp !== r.primeAgedXp && <BoostBadge />}
                </td>
                <td data-label="XP/час (соление)">
                  {r.agingXpPerHour === Infinity ? '—' : Math.round(r.agingXpPerHour).toLocaleString('ru-RU')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FoodCatalogTable() {
  const [activeTab, setActiveTab] = useState<Building | 'Fish'>('Fire Pit');

  const [timeBoosts, setTimeBoosts] = useState<TimeBoosts>({
    fastFeastsRank: 0,
    frostedCakesRank: 0,
    oilFilled: false,
    swiftSizzleRank: 0,
    turboFryRank: 0,
    fryFrenzyRank: 0,
    lunasHat: false,
    chefsCleaver: false,
    factionMedallion: false,
    totem: false,
    desertGnome: false,
    legendaryShrine: false,
    boarShrine: false,
    gourmetHourglass: false,
  });

  const [xpBoosts, setXpBoosts] = useState<XpBoosts>({
    munchingMasteryRank: 0,
    juicyBoostRank: 0,
    driveThroughDeliRank: 0,
    buzzworthyTreatsRank: 0,
    fishyFeastRank: 0,
    goldenSpatula: false,
    pan: false,
    vip: false,
    observatory: false,
    blossombeard: false,
    luminousAnglerfishTopper: false,
    skillShrimpy: false,
  });

  const activeGroup = activeTab === 'Fish' ? null : BUILDINGS.find((b) => b.key === activeTab)!;

  return (
    <div>
      <div className="ref-marvel-boost-widget">
        <div className="ref-food-boost-checks">
          <Check
            label="Масло залито в здание"
            checked={timeBoosts.oilFilled}
            onChange={(v) => setTimeBoosts((t) => ({ ...t, oilFilled: v }))}
          />
          <Check
            label="Luna's Hat (×0.5)"
            icon="Luna's Hat"
            checked={timeBoosts.lunasHat}
            onChange={(v) => setTimeBoosts((t) => ({ ...t, lunasHat: v }))}
          />
          <Check
            label="Master Chef's Cleaver (×0.85)"
            icon="Master Chef's Cleaver"
            checked={timeBoosts.chefsCleaver}
            onChange={(v) => setTimeBoosts((t) => ({ ...t, chefsCleaver: v }))}
          />
          <Check
            label="Медальон фракции (×0.75)"
            icon="Sunflorian Medallion"
            checked={timeBoosts.factionMedallion}
            onChange={(v) => setTimeBoosts((t) => ({ ...t, factionMedallion: v }))}
          />
          <Check
            label="Super/Time Warp Totem (×0.5)"
            icon="Super Totem"
            checked={timeBoosts.totem}
            onChange={(v) => setTimeBoosts((t) => ({ ...t, totem: v }))}
          />
          <Check
            label="Desert Gnome (×0.9)"
            icon="Desert Gnome"
            checked={timeBoosts.desertGnome}
            onChange={(v) => setTimeBoosts((t) => ({ ...t, desertGnome: v }))}
          />
          <Check
            label="Legendary Shrine (×0.5)"
            icon="Legendary Shrine"
            checked={timeBoosts.legendaryShrine}
            onChange={(v) => setTimeBoosts((t) => ({ ...t, legendaryShrine: v }))}
          />
          <Check
            label="Boar Shrine (×0.8)"
            icon="Boar Shrine"
            checked={timeBoosts.boarShrine}
            onChange={(v) => setTimeBoosts((t) => ({ ...t, boarShrine: v }))}
          />
          <Check
            icon="Gourmet Hourglass"
            label="Gourmet Hourglass (×0.5)"
            checked={timeBoosts.gourmetHourglass}
            onChange={(v) => setTimeBoosts((t) => ({ ...t, gourmetHourglass: v }))}
          />
        </div>
        <div className="ref-food-boost-selects">
          <RankSelect
            label="Fast Feasts (Fire Pit/Kitchen)"
            icon="Fast Feasts"
            value={timeBoosts.fastFeastsRank}
            onChange={(v) => setTimeBoosts((t) => ({ ...t, fastFeastsRank: v as 0 | 1 | 2 | 3 }))}
          />
          <RankSelect
            label="Frosted Cakes (торты)"
            icon="Frosted Cakes"
            value={timeBoosts.frostedCakesRank}
            onChange={(v) => setTimeBoosts((t) => ({ ...t, frostedCakesRank: v as 0 | 1 | 2 | 3 }))}
          />
          <RankSelect
            label="Swift Sizzle (масло, Fire Pit)"
            icon="Swift Sizzle"
            value={timeBoosts.swiftSizzleRank}
            onChange={(v) => setTimeBoosts((t) => ({ ...t, swiftSizzleRank: v as 0 | 1 | 2 | 3 }))}
          />
          <RankSelect
            label="Turbo Fry (масло, Kitchen)"
            icon="Turbo Fry"
            value={timeBoosts.turboFryRank}
            onChange={(v) => setTimeBoosts((t) => ({ ...t, turboFryRank: v as 0 | 1 | 2 | 3 }))}
          />
          <RankSelect
            label="Fry Frenzy (масло, Deli)"
            icon="Fry Frenzy"
            value={timeBoosts.fryFrenzyRank}
            onChange={(v) => setTimeBoosts((t) => ({ ...t, fryFrenzyRank: v as 0 | 1 | 2 | 3 }))}
          />
        </div>
      </div>

      <div className="ref-marvel-boost-widget">
        <div className="ref-food-boost-checks">
          <Check
            label="Golden Spatula (+10%)"
            icon="Golden Spatula"
            checked={xpBoosts.goldenSpatula}
            onChange={(v) => setXpBoosts((x) => ({ ...x, goldenSpatula: v }))}
          />
          <Check
            label="Pan (+25%)"
            icon="Pan"
            checked={xpBoosts.pan}
            onChange={(v) => setXpBoosts((x) => ({ ...x, pan: v }))}
          />
          <Check label="VIP Access (+10%)" checked={xpBoosts.vip} onChange={(v) => setXpBoosts((x) => ({ ...x, vip: v }))} />
          <Check
            label="Observatory (+5%)"
            icon="Observatory"
            checked={xpBoosts.observatory}
            onChange={(v) => setXpBoosts((x) => ({ ...x, observatory: v }))}
          />
          <Check
            label="Blossombeard (+10%)"
            icon="Blossombeard"
            checked={xpBoosts.blossombeard}
            onChange={(v) => setXpBoosts((x) => ({ ...x, blossombeard: v }))}
          />
          <Check
            label="Luminous Anglerfish Topper (+50%, рыба)"
            icon="Luminous Anglerfish Topper"
            checked={xpBoosts.luminousAnglerfishTopper}
            onChange={(v) => setXpBoosts((x) => ({ ...x, luminousAnglerfishTopper: v }))}
          />
          <Check
            label="Skill Shrimpy (+20%, рыба)"
            icon="Skill Shrimpy"
            checked={xpBoosts.skillShrimpy}
            onChange={(v) => setXpBoosts((x) => ({ ...x, skillShrimpy: v }))}
          />
        </div>
        <div className="ref-food-boost-selects">
          <RankSelect
            label="Munching Mastery (все блюда)"
            icon="Munching Mastery"
            value={xpBoosts.munchingMasteryRank}
            onChange={(v) => setXpBoosts((x) => ({ ...x, munchingMasteryRank: v as 0 | 1 | 2 | 3 }))}
          />
          <RankSelect
            label="Juicy Boost (Smoothie Shack)"
            icon="Juicy Boost"
            value={xpBoosts.juicyBoostRank}
            onChange={(v) => setXpBoosts((x) => ({ ...x, juicyBoostRank: v as 0 | 1 | 2 | 3 }))}
          />
          <RankSelect
            label="Drive-Through Deli"
            icon="Drive-Through Deli"
            value={xpBoosts.driveThroughDeliRank}
            onChange={(v) => setXpBoosts((x) => ({ ...x, driveThroughDeliRank: v as 0 | 1 | 2 | 3 }))}
          />
          <RankSelect
            label="Buzzworthy Treats (блюда с мёдом)"
            icon="Buzzworthy Treats"
            value={xpBoosts.buzzworthyTreatsRank}
            onChange={(v) => setXpBoosts((x) => ({ ...x, buzzworthyTreatsRank: v as 0 | 1 | 2 | 3 }))}
          />
          <RankSelect
            label="Fishy Feast (рыба)"
            icon="Fishy Feast"
            value={xpBoosts.fishyFeastRank}
            onChange={(v) => setXpBoosts((x) => ({ ...x, fishyFeastRank: v as 0 | 1 | 2 | 3 }))}
          />
        </div>
      </div>

      <div className="ref-food-tabs">
        {BUILDINGS.map((b) => (
          <button
            key={b.key}
            type="button"
            className={`ref-food-tab${b.key === activeTab ? ' ref-food-tab--active' : ''}`}
            onClick={() => setActiveTab(b.key)}
          >
            <span aria-hidden="true">{b.icon}</span> {b.label}
            <span className="ref-accordion-count">{b.recipes.length}</span>
          </button>
        ))}
        <button
          type="button"
          className={`ref-food-tab${activeTab === 'Fish' ? ' ref-food-tab--active' : ''}`}
          onClick={() => setActiveTab('Fish')}
        >
          <span aria-hidden="true">🐟</span> Рыба
          <span className="ref-accordion-count">{FISH_ROWS.length}</span>
        </button>
      </div>

      {activeGroup ? (
        <BuildingTable recipes={activeGroup.recipes} timeBoosts={timeBoosts} xpBoosts={xpBoosts} />
      ) : (
        <FishTable xpBoosts={xpBoosts} />
      )}
    </div>
  );
}
