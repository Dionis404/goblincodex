/**
 * sync-fermentation-data.ts
 * Генерирует src/lib/fermentationData.generated.ts из исходников игры: рецепты
 * стойки ферментации (types/fermentation.ts) и стойки специй (types/spiceRack.ts).
 * Рецепты наживок из выдержанной рыбы в игре строятся циклом по рангам рыбы, поэтому
 * здесь они записаны семействами (наживка → ранг рыбы → какие маринады подходят).
 * Устаревшие (legacy/retired) рецепты, которые нельзя запустить, не входят.
 * Бусты (навыки, предметы) лежат в skills.ts, формулы — в src/lib/fermentation.ts.
 *
 * Запуск из корня репозитория (клон — npm run sfl:clone):
 *   npm run sfl:sync-fermentation [-- --sfl-dir ./_sfl_temp]
 *
 * Скрипт падает, если разобрано не то, что ожидается, — значит, игра поменяла
 * формат файлов и парсер надо поправить.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const i = process.argv.indexOf("--sfl-dir");
const sflDir = path.resolve(i > -1 && process.argv[i + 1] ? process.argv[i + 1] : "./_sfl_temp");
const read = (rel: string): string => fs.readFileSync(path.join(sflDir, rel), "utf8");

/** Объект `{ ... }`, начинающийся с первой `{` после позиции from, до парной `}`. */
function objectAfter(text: string, from: number): string {
  const open = text.indexOf("{", from);
  let depth = 0;
  for (let k = open; k < text.length; k++) {
    if (text[k] === "{") depth++;
    else if (text[k] === "}" && --depth === 0) return text.slice(open, k + 1);
  }
  throw new Error("не закрыта фигурная скобка");
}
const constBlock = (text: string, name: string): string => {
  const start = text.search(new RegExp(`(?:export )?const ${name}\\b`));
  if (start < 0) throw new Error(`не найден блок ${name}`);
  return objectAfter(text, text.indexOf("=", start));
};
const ITEM = /(?:"([^"]+)"|(\w+)):\s*(?:new Decimal\()?(\d+)\)?/g;
const items = (text: string): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const m of text.matchAll(ITEM)) out[m[1] ?? m[2]] = Number(m[3]);
  return out;
};

interface Recipe {
  name: string;
  seconds: number;
  ingredients: Record<string, number>;
  outputs: Record<string, number>;
}

/** Верхнеуровневые записи `"Имя": { durationSeconds, ingredients, outputs }`. */
function parseRecipes(block: string, constants: Record<string, number>): Recipe[] {
  const inner = block.slice(1, -1);
  const out: Recipe[] = [];
  let pos = 0;
  for (;;) {
    const m = /(?:^|\n)\s*(?:"([^"]+)"|(\w+)):\s*\{/.exec(inner.slice(pos));
    if (!m) break;
    const start = pos + m.index + m[0].length - 1;
    const body = objectAfter(inner, start);
    pos = start + body.length;
    const name = m[1] ?? m[2];
    const dur = /durationSeconds:\s*([^,\n]+),/.exec(body)?.[1].trim();
    const ing = /ingredients:\s*(\{[^}]*\})/.exec(body)?.[1];
    const outp = /outputs:\s*(\{[^}]*\})/.exec(body)?.[1];
    if (dur == null || !ing || !outp) throw new Error(`${name}: не разобран рецепт`);
    const seconds =
      dur in constants ? constants[dur] : dur.split("*").reduce((acc, n) => acc * Number(n.trim()), 1);
    if (Number.isNaN(seconds)) throw new Error(`${name}: не разобрано время "${dur}"`);
    const ingredients = items(ing);
    const outputs = items(outp);
    if (!Object.keys(ingredients).length || !Object.keys(outputs).length) throw new Error(`${name}: пустой рецепт`);
    out.push({ name, seconds, ingredients, outputs });
  }
  return out;
}

// ─── fermentation.ts ──────────────────────────────────────────────────────────
const ferm = read("src/features/game/types/fermentation.ts");
const glow = /const GREENHOUSE_FERMENT_DURATION_SEC\s*=\s*([^;]+);/.exec(ferm)?.[1];
if (!glow) throw new Error("нет GREENHOUSE_FERMENT_DURATION_SEC");
const constants = { GREENHOUSE_FERMENT_DURATION_SEC: glow.split("*").reduce((a, n) => a * Number(n.trim()), 1) };
const fermentation = parseRecipes(constBlock(ferm, "STATIC_FERMENTATION_RECIPES"), constants);
// «Pickled Cabbage to Broccoli» — миграция старых запасов, в UI скрыта у новых игроков.
const fermentationRecipes = fermentation.filter((r) => r.name !== "Pickled Cabbage to Broccoli");

const baitAgedOut = Number(/BAIT_OUTPUT_AGED\s*=\s*new Decimal\((\d+)\)/.exec(ferm)?.[1]);
const baitPrimeOut = Number(/BAIT_OUTPUT_PRIME\s*=\s*new Decimal\((\d+)\)/.exec(ferm)?.[1]);
if (!baitAgedOut || !baitPrimeOut) throw new Error("не найдены BAIT_OUTPUT_AGED/PRIME");

// Семейства наживок — из union-типа BaitFermentationRecipeName (актуальные, не retired).
const unionStart = ferm.indexOf("export type BaitFermentationRecipeName");
const unionEnd = ferm.indexOf(";", unionStart);
const union = ferm.slice(unionStart, unionEnd);
const baitFamilies: Record<string, { bait: string; pickles: string[] }> = {};
for (const m of union.matchAll(/`(Capsule Bait|Umbrella Bait|Crimson Baitfish) \(Aged \$\{FishName\}, (Pickled \w+)\)`/g)) {
  (baitFamilies[m[1]] ??= { bait: m[1], pickles: [] }).pickles.push(m[2]);
}
const tierOf: Record<string, string> = {};
for (const [bait, tier] of [["Capsule Bait", "basic"], ["Umbrella Bait", "advanced"], ["Crimson Baitfish", "expert"]]) {
  if (!baitFamilies[bait]) throw new Error(`нет семейства ${bait}`);
  tierOf[bait] = tier;
  // Проверка, что цикл в игре действительно привязан к этому рангу рыбы.
  const loop = new RegExp(`getFishNamesByTier\\("${tier}"\\)[\\s\\S]*?recipes\\[\`${bait} `);
  if (!loop.test(ferm)) throw new Error(`${bait}: ранг рыбы изменился (ожидался ${tier})`);
}
const baitSeconds = Number(/const fiveMin\s*=\s*60 \* (\d+)/.exec(ferm)?.[1]) * 60;
if (!baitSeconds) throw new Error("не найден fiveMin");
const baits = Object.values(baitFamilies).map((f) => ({ ...f, fishTier: tierOf[f.bait] }));

// ─── spiceRack.ts ─────────────────────────────────────────────────────────────
const spiceText = read("src/features/game/types/spiceRack.ts");
const spice = parseRecipes(constBlock(spiceText, "SPICE_RACK_RECIPES_STATIC"), {});
const spiceMaxSlots = Number(/MAX_SPICE_RACK_SLOTS\s*=\s*(\d+)/.exec(spiceText)?.[1]);

// ─── agingFormulas.ts ─────────────────────────────────────────────────────────
const formulas = read("src/features/game/types/agingFormulas.ts");
const astrolabe = Number(/ASTROLABE_DOUBLE_CHANCE\s*=\s*(\d+)/.exec(formulas)?.[1]);
if (!astrolabe) throw new Error("нет ASTROLABE_DOUBLE_CHANCE");
if (!/isWearableActive\(\{ game, name: "Salt Bottle Onesie" \}\)/.test(formulas)) {
  throw new Error("Salt Bottle Onesie больше не используется в getSpiceRackOutput");
}
if (!/item === "Refined Salt" && refinerLevel/.test(formulas)) throw new Error("Refiner больше не привязан к Refined Salt");
if (!/getFermentationRecipe|MAX_SPICE/.test(spiceText) || !spiceMaxSlots) throw new Error("нет MAX_SPICE_RACK_SLOTS");

if (fermentationRecipes.length < 15) throw new Error(`рецептов ферментации мало: ${fermentationRecipes.length}`);
if (spice.length < 3) throw new Error(`рецептов специй мало: ${spice.length}`);

const out = `// ЭТОТ ФАЙЛ СГЕНЕРИРОВАН scripts/sync-fermentation-data.ts из исходников Sunflower Land
// (types/fermentation.ts, types/spiceRack.ts, types/agingFormulas.ts).
// Не править руками — запустите \`npm run sfl:sync-fermentation\` после \`npm run sfl:clone\`.

export interface TimedRecipe {
  name: string;
  /** Секунды готовки без бустов (0 — мгновенно). */
  seconds: number;
  ingredients: Record<string, number>;
  outputs: Record<string, number>;
}

/** Стойка ферментации: маринады, теплица, смеси, соль из отходов. */
export const FERMENTATION_RECIPES: TimedRecipe[] = ${JSON.stringify(fermentationRecipes, null, 2)};

/** Стойка специй. */
export const SPICE_RACK_RECIPES: TimedRecipe[] = ${JSON.stringify(spice, null, 2)};

export interface BaitFamily {
  bait: string;
  /** Ранг рыбы, из которой делается наживка (basic | advanced | expert). */
  fishTier: string;
  /** Подходящие маринады. */
  pickles: string[];
}

/** Наживки из выдержанной рыбы: 1 Aged/Prime Aged рыба + 1 маринад. */
export const BAIT_FAMILIES: BaitFamily[] = ${JSON.stringify(baits, null, 2)};
export const BAIT_OUTPUT_AGED = ${baitAgedOut};
export const BAIT_OUTPUT_PRIME = ${baitPrimeOut};
export const BAIT_SECONDS = ${baitSeconds};

/** Слотов на стойках: по одному на уровень Aging Shed, но не больше. */
export const RACK_MAX_SLOTS = { fermentation: 6, spice: ${spiceMaxSlots} };

/** Шанс (в процентах), что Astrolabe удвоит выход стойки ферментации или специй. */
export const ASTROLABE_DOUBLE_CHANCE = ${astrolabe};
`;
const target = path.resolve("src/lib/fermentationData.generated.ts");
fs.writeFileSync(target, out);
console.log(
  `ok: ${fermentationRecipes.length} рецептов ферментации, ${spice.length} специй, ${baits.length} семейства наживок → ${path.relative(".", target)}`,
);
