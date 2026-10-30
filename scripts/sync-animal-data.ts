/**
 * sync-animal-data.ts
 * Генерирует src/lib/animalData.generated.ts из исходников игры: уровни животных,
 * опыт за корм по уровням, продукция по уровням, рецепты корма (включая помои для
 * свиней), поглаживания (опыт инструментов и шансы по уровням), опыт жуков, щетина
 * свиней, базовый расход корма и сон, а также ранги навыков ветки «Животные».
 * Бусты-предметы (коллекционные, одежда) — логика игры (features/game/lib/animals.ts),
 * они записаны вручную в src/lib/animals.ts.
 *
 * Запуск из корня репозитория (клон — npm run sfl:clone):
 *   npm run sfl:sync-animals [-- --sfl-dir ./_sfl_temp]
 *
 * Блоки-литералы вычисляются как JS после замены `new Decimal(x)` → x и
 * `translate(...)` → "". Скрипт падает, если разобрано не то, что ожидается, —
 * значит, игра поменяла формат файлов и парсер надо поправить.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { parseSpriteMap, parseCdnSpriteMap } from "./lib/sprite-map";

const i = process.argv.indexOf("--sfl-dir");
const sflDir = path.resolve(i > -1 && process.argv[i + 1] ? process.argv[i + 1] : "./_sfl_temp");
const read = (rel: string): string => fs.readFileSync(path.join(sflDir, rel), "utf8");

/** Литерал `{...}` или `[...]`, начинающийся с первой открывающей скобки после from. */
function literalAfter(text: string, from: number, open = "{"): string {
  const close = open === "{" ? "}" : "]";
  const start = text.indexOf(open, from);
  let depth = 0;
  for (let k = start; k < text.length; k++) {
    if (text[k] === open) depth++;
    else if (text[k] === close && --depth === 0) return text.slice(start, k + 1);
  }
  throw new Error("не закрыта скобка");
}

function constBlock(text: string, name: string, open = "{"): string {
  const start = text.search(new RegExp(`(?:export )?const ${name}\\b`));
  if (start < 0) throw new Error(`не найден блок ${name}`);
  return literalAfter(text, text.indexOf("=", start), open);
}

function constNumber(text: string, name: string): number {
  const m = new RegExp(`(?:export )?const ${name}(?:\\s*:\\s*\\w+)?\\s*=\\s*([^;\\n]+)`).exec(text);
  if (!m) throw new Error(`не найдена константа ${name}`);
  return evalLiteral(m[1]) as number;
}

/** Вычисляет литерал из исходников игры (данные, а не код). */
function evalLiteral(src: string, scope: Record<string, unknown> = {}): unknown {
  const js = src
    .replace(/new Decimal\(([^()]+)\)/g, "$1")
    .replace(/translate\([^()]*\)/g, '""')
    .replace(/\s+as const\b/g, "")
    .replace(/\s+satisfies[^,\n}\]]+/g, "");
  return new Function(...Object.keys(scope), `return (${js});`)(...Object.values(scope));
}

const animalsTs = read("src/features/game/types/animals.ts");
const pigFeedsTs = read("src/features/game/types/pigFeeds.ts");
const feedAnimalTs = read("src/features/game/events/landExpansion/feedAnimal.ts");
const loveAnimalTs = read("src/features/game/events/landExpansion/loveAnimal.ts");
const libAnimalsTs = read("src/features/game/lib/animals.ts");
const feedBuffTs = read("src/features/game/events/landExpansion/applyAnimalFeedBuff.ts");
const beetlesTs = read("src/features/game/types/beetles.ts");
const skillsTs = read("src/features/game/types/bumpkinSkills.ts");

type Num = Record<string, number>;
const ANIMAL_TYPES = ["Chicken", "Cow", "Sheep", "Pig"];

const levels = evalLiteral(constBlock(animalsTs, "ANIMAL_LEVELS")) as Record<string, Num>;
const foodXp = evalLiteral(constBlock(animalsTs, "ANIMAL_FOOD_EXPERIENCE")) as Record<string, Record<string, Num>>;
const drops = evalLiteral(constBlock(animalsTs, "ANIMAL_RESOURCE_DROP")) as Record<string, Record<string, Num>>;
const bristles = evalLiteral(constBlock(animalsTs, "PIG_BRISTLES_PER_LEVEL")) as Num;
const animalsRaw = evalLiteral(constBlock(animalsTs, "ANIMALS"), {
  BUILDINGS: { Pigpen: { unlocksAtLevel: null } },
}) as Record<string, { coins: number; buildingRequired: string }>;
const foodsRaw = evalLiteral(constBlock(animalsTs, "ANIMAL_FOODS")) as Record<
  string,
  { type: string; ingredients: Num }
>;

// Помои: списки рыбы/раков объявлены массивами, а в PIG_FEEDS разворачиваются через each().
const arrays: Record<string, unknown> = {};
for (const m of pigFeedsTs.matchAll(/const (\w+) = \[/g)) arrays[m[1]] = evalLiteral(constBlock(pigFeedsTs, m[1], "["));
const each = (q: number, items: string[]) => Object.fromEntries(items.map((x) => [x, q]));
const pigFeeds = evalLiteral(constBlock(pigFeedsTs, "PIG_FEEDS"), { ...arrays, each }) as Record<
  string,
  { tier: number; ingredients: Num }
>;

const requiredQty = evalLiteral(constBlock(feedAnimalTs, "REQUIRED_FOOD_QTY")) as Num;
const sleepMs = constNumber(feedAnimalTs, "ANIMAL_SLEEP_DURATION");
const loveItemXp = evalLiteral(constBlock(loveAnimalTs, "ITEM_XP")) as Num;
const loveChances = evalLiteral(constBlock(loveAnimalTs, "ANIMAL_ITEM_CHANCES")) as Record<string, Num>;
const mudPerApplication = constNumber(libAnimalsTs, "MUD_PER_APPLICATION");
const mudXpMultiplier = constNumber(libAnimalsTs, "MUD_XP_MULTIPLIER");
const feedBuffHarvests = constNumber(feedBuffTs, "BASE_FEED_BUFF_HARVESTS");
const mudHarvests = constNumber(feedBuffTs, "MUD_HARVESTS");
const beetleXp = evalLiteral(constBlock(beetlesTs, "BEETLE_FEEDING_XP")) as Num;

// Ранги навыков ветки «Животные», которые влияют на корм, опыт, сон и продукцию.
const SKILLS = [
  "Efficient Feeding",
  "Chonky Feed",
  "Clucky Grazing",
  "Sheepwise Diet",
  "Cow-Smart Nutrition",
  "Swill Savvy",
  "Restless Animals",
  "Abundant Harvest",
  "Fine Fibers",
  "Featherweight",
  "Merino Whisperer",
  "Leathercraft Mastery",
  "Double Bale",
  "Heartwarming Instruments",
  "Truffle Yield",
  "Bristle Payout",
];
const skillTree = skillsTs.slice(skillsTs.indexOf("export const BUMPKIN_REVAMP_SKILL_TREE"));
const skillEffects: Record<string, Record<string, unknown>> = {};
for (const name of SKILLS) {
  const at = skillTree.search(new RegExp(`\\n  "?${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"?: \\{`));
  if (at < 0) throw new Error(`навык не найден: ${name}`);
  const entry = literalAfter(skillTree, at);
  const effAt = entry.indexOf("effect:");
  if (effAt < 0) throw new Error(`у навыка нет upgrade.effect: ${name}`);
  skillEffects[name] = evalLiteral(literalAfter(entry, effAt)) as Record<string, unknown>;
}

// ── Проверки ──────────────────────────────────────────────────────────────
const fail = (msg: string) => {
  throw new Error(msg);
};
for (const a of ANIMAL_TYPES) {
  if (Object.keys(levels[a] ?? {}).length !== 16) fail(`ANIMAL_LEVELS.${a}: ожидалось 16 уровней`);
  if (Object.keys(foodXp[a] ?? {}).length !== 16) fail(`ANIMAL_FOOD_EXPERIENCE.${a}: ожидалось 16 уровней`);
  if (Object.keys(drops[a] ?? {}).length !== 16) fail(`ANIMAL_RESOURCE_DROP.${a}: ожидалось 16 уровней`);
  if (!requiredQty[a]) fail(`REQUIRED_FOOD_QTY.${a} не найден`);
}
if (Object.keys(pigFeeds).length !== 4) fail("PIG_FEEDS: ожидалось 4 вида помоев");
if (Object.keys(pigFeeds["Gourmet Slop"].ingredients).length < 20) fail("PIG_FEEDS: не развернулись списки рыбы");
if (sleepMs !== 24 * 3600 * 1000) console.warn(`внимание: базовый сон ${sleepMs / 3600000} ч`);
if (Object.keys(loveItemXp).length !== 3) fail("ITEM_XP: ожидалось 3 инструмента");

// ── Иконки ────────────────────────────────────────────────────────────────
const spriteMap = parseSpriteMap(sflDir);
for (const [n, p] of parseCdnSpriteMap(sflDir)) if (!spriteMap.has(n)) spriteMap.set(n, p);

const iconNames = new Set<string>([
  ...ANIMAL_TYPES,
  ...Object.keys(foodsRaw),
  ...Object.values(foodsRaw).flatMap((f) => Object.keys(f.ingredients)),
  ...Object.values(pigFeeds).flatMap((f) => Object.keys(f.ingredients)),
  ...Object.values(drops).flatMap((byLevel) => Object.values(byLevel).flatMap((d) => Object.keys(d))),
  "Pig Bristles",
  ...Object.keys(loveItemXp),
  ...Object.keys(beetleXp),
  "Salt Lick",
  "Honey Treat",
  "Truffle Seasoning",
  "Mud",
  // Бусты из features/game/lib/animals.ts (см. src/lib/animals.ts)
  ...[
    "Chicken Coop", "Rich Chicken", "Undead Rooster", "Ayam Cemani", "Squid Chicken", "Ascended Chicken",
    "Chicken Suit", "Alien Chicken", "Black Sheep Onesie", "White Sheep Onesie", "Astronaut Sheep",
    "Ascended Sheep", "Merino Jumper", "Toxic Tuft", "Longhorn Cowfish", "Spa Cow", "Milk Apron",
    "Cowbell Necklace", "Moo-ver", "Mootant", "Training Whistle", "Bale", "Cattlegrim", "Barn Manager",
    "Fat Chicken", "Dr Cow", "Mermaid Sheep", "Cluckulator", "Infernal Bullwhip", "Collie Shrine",
    "Bantam Shrine", "El Pollo Veloz", "Speed Chicken", "Janitor Chicken", "Flamingo Chicken", "Dream Scarf",
    "Farm Dog", "Beetle Sheep", "Mammoth", "Ascended Cow", "Wrangler", "Gold Egg", "Golden Cow",
    "Golden Sheep", "Pig Onesie", "Baby Cow", "Spa Sheep", "Vibraphone",
  ],
]);
// Иконки навыков — как в игре (scripts/sync-skill-icons.ts → skill-icon-map.json).
const skillIcons = JSON.parse(fs.readFileSync("scripts/skill-icon-map.json", "utf8")) as Record<string, string>;
const icons: Record<string, string> = {};
const noIcon: string[] = [];
for (const name of [...iconNames, ...SKILLS].sort()) {
  const rel = spriteMap.get(name);
  const skillIcon = skillIcons[name];
  if (SKILLS.includes(name) && skillIcon && fs.existsSync(`public${skillIcon}`)) icons[name] = skillIcon;
  else if (rel && fs.existsSync(path.join("public/sprites", rel))) icons[name] = `/sprites/${rel}`;
  else noIcon.push(name);
}

// ── Запись ────────────────────────────────────────────────────────────────
const byLevel = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [Number(k), v]));
const out = {
  ANIMAL_TYPES,
  ANIMAL_COINS: Object.fromEntries(ANIMAL_TYPES.map((a) => [a, animalsRaw[a].coins])),
  ANIMAL_BUILDING: Object.fromEntries(ANIMAL_TYPES.map((a) => [a, animalsRaw[a].buildingRequired])),
  ANIMAL_LEVELS: Object.fromEntries(ANIMAL_TYPES.map((a) => [a, byLevel(levels[a])])),
  ANIMAL_FOOD_XP: Object.fromEntries(ANIMAL_TYPES.map((a) => [a, byLevel(foodXp[a])])),
  ANIMAL_DROPS: Object.fromEntries(ANIMAL_TYPES.map((a) => [a, byLevel(drops[a])])),
  PIG_BRISTLES_PER_LEVEL: byLevel(bristles),
  ANIMAL_FOOD_RECIPES: Object.fromEntries(
    Object.entries(foodsRaw).map(([n, f]) => [n, { type: f.type, ingredients: f.ingredients }]),
  ),
  PIG_FEEDS: pigFeeds,
  REQUIRED_FOOD_QTY: requiredQty,
  ANIMAL_SLEEP_HOURS: sleepMs / 3600000,
  LOVE_ITEM_XP: loveItemXp,
  LOVE_ITEM_CHANCES: byLevel(loveChances),
  BEETLE_FEEDING_XP: beetleXp,
  MUD_PER_APPLICATION: mudPerApplication,
  MUD_XP_MULTIPLIER: mudXpMultiplier,
  FEED_BUFF_HARVESTS: feedBuffHarvests,
  MUD_HARVESTS: mudHarvests,
  ANIMAL_SKILL_EFFECTS: skillEffects,
  ANIMAL_ICONS: icons,
};

const header = `// Сгенерировано scripts/sync-animal-data.ts из исходников sunflower-land — не править вручную.
// Обновление: npm run sfl:sync-animals
/* eslint-disable */
`;
const body = Object.entries(out)
  .map(([k, v]) => `export const ${k} = ${JSON.stringify(v, null, 2)} as const;`)
  .join("\n\n");
const target = path.resolve("src/lib/animalData.generated.ts");
fs.writeFileSync(target, `${header}\n${body}\n`);

console.log(`Записано: ${target}`);
console.log(`  животных ${ANIMAL_TYPES.length}, кормов ${Object.keys(foodsRaw).length}, помоев ${Object.keys(pigFeeds).length}, навыков ${SKILLS.length}`);
console.log(`  иконок ${Object.keys(icons).length}, без иконки ${noIcon.length}: ${noIcon.join(", ")}`);
