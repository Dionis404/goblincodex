/**
 * sync-composter-data.ts
 * Генерирует src/lib/composterData.generated.ts из исходников игры: три
 * компостера (что выдают, время, ускорение), рецепты по сезонам года,
 * диапазон червей и стоимость построек. Бусты (навыки, предметы) в файл не
 * входят — их значения лежат в skills.ts, а формулы описаны в src/lib/composter.ts.
 *
 * Запуск из корня репозитория (клон — npm run sfl:clone):
 *   npm run sfl:sync-composter [-- --sfl-dir ./_sfl_temp]
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
/** Число или произведение вида `6 * 60 * 60 * 1000`. */
const num = (expr: string): number => expr.split("*").reduce((acc, n) => acc * Number(n.trim()), 1);
const ITEM = /(?:"([^"]+)"|(\w+)):\s*(?:new Decimal\()?(\d+)\)?/g;
const items = (text: string): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const m of text.matchAll(ITEM)) out[m[1] ?? m[2]] = Number(m[3]);
  return out;
};

const COMPOSTERS = ["Compost Bin", "Turbo Composter", "Premium Composter"] as const;
const SEASONS = ["spring", "summer", "autumn", "winter"] as const;

// ─── composters.ts ────────────────────────────────────────────────────────────
const composters = read("src/features/game/types/composters.ts");
const detailsBlock = constBlock(composters, "composterDetails");
interface ComposterRecord {
  worm: string;
  produce: string;
  produceAmount: number;
  hours: number;
  /** Сколько яиц (или перьев с Feathery Business) нужно для ускорения. */
  speedUpAmount: number;
  /** На сколько часов ускорение сокращает готовку. */
  speedUpHours: number;
}
const composterRecords: Record<string, ComposterRecord> = {};
for (const name of COMPOSTERS) {
  const seg = objectAfter(detailsBlock, detailsBlock.indexOf(`"${name}"`));
  const field = (f: string): string => {
    const m = new RegExp(`${f}:\\s*([^,\\n]+),`).exec(seg);
    if (!m) throw new Error(`${name}: нет поля ${f}`);
    return m[1].trim();
  };
  composterRecords[name] = {
    worm: field("worm").replace(/"/g, ""),
    produce: field("produce").replace(/"/g, ""),
    produceAmount: num(field("produceAmount")),
    hours: num(field("timeToFinishMilliseconds")) / 3_600_000,
    speedUpAmount: num(field("resourceBoostRequirements")),
    speedUpHours: num(field("resourceBoostMilliseconds")) / 3_600_000,
  };
}

const reqBlock = constBlock(composters, "SEASON_COMPOST_REQUIREMENTS");
const recipes: Record<string, Record<string, Record<string, number>>> = {};
for (const name of COMPOSTERS) {
  const seg = objectAfter(reqBlock, reqBlock.indexOf(`"${name}"`));
  recipes[name] = {};
  for (const season of SEASONS) {
    const inner = objectAfter(seg, seg.indexOf(`${season}:`));
    const found = items(inner);
    if (Object.keys(found).length === 0) throw new Error(`${name}/${season}: пустой рецепт`);
    recipes[name][season] = found;
  }
}

// ─── composterBait.ts: сколько червей выпадает при сборе ──────────────────────
const bait = read("src/features/game/events/landExpansion/composterBait.ts");
const wormBlock = constBlock(bait, "WORM_AMOUNTS");
const wormAmounts: Record<string, number[]> = {};
for (const m of wormBlock.matchAll(/(?:"([^"]+)"|(\w+)):\s*\[([^\]]*)\]/g)) {
  wormAmounts[m[1] ?? m[2]] = m[3].split(",").map((n) => Number(n.trim())).filter((n) => !Number.isNaN(n));
}
for (const c of Object.values(composterRecords)) {
  if (!wormAmounts[c.worm]?.length) throw new Error(`нет диапазона для червя ${c.worm}`);
}

// ─── buildings.ts: стоимость построек ─────────────────────────────────────────
const buildings = read("src/features/game/types/buildings.ts");
interface BuildingRecord { level: number; coins: number; hours: number; ingredients: Record<string, number> }
const buildingRecords: Record<string, BuildingRecord> = {};
for (const name of COMPOSTERS) {
  // Имя встречается и в union-типе; нужна запись с полем unlocksAtLevel.
  const at = buildings.search(new RegExp(`"${name}":\\s*\\{\\s*unlocksAtLevel`));
  if (at < 0) throw new Error(`${name}: не найдена запись в BUILDINGS`);
  const seg = objectAfter(buildings, at);
  const level = /level:\s*(\d+)/.exec(seg)?.[1];
  const coins = /coins:\s*(\d+)/.exec(seg)?.[1];
  const seconds = /constructionSeconds:\s*([^,\n]+),/.exec(seg)?.[1];
  const ing = /ingredients:\s*(\{[\s\S]*?\}),/.exec(seg)?.[1];
  if (!level || !coins || !seconds || !ing) throw new Error(`${name}: не разобрана постройка`);
  buildingRecords[name] = { level: Number(level), coins: Number(coins), hours: num(seconds) / 3600, ingredients: items(ing) };
}

const out = `// ЭТОТ ФАЙЛ СГЕНЕРИРОВАН scripts/sync-composter-data.ts из исходников Sunflower Land
// (types/composters.ts, events/landExpansion/composterBait.ts, types/buildings.ts).
// Не править руками — запустите \`npm run sfl:sync-composter\` после \`npm run sfl:clone\`.

export interface ComposterRecord {
  /** Червь, который выпадает при сборе (Earthworm | Grub | Red Wiggler). */
  worm: string;
  /** Компост, который делает компостер. */
  produce: string;
  /** Сколько компоста за запуск без бустов. */
  produceAmount: number;
  /** Часы готовки без бустов. */
  hours: number;
  /** Сколько яиц нужно для ускорения (с Feathery Business — перьев). */
  speedUpAmount: number;
  /** На сколько часов ускорение сокращает готовку. */
  speedUpHours: number;
}

export interface BuildingRecord {
  level: number;
  coins: number;
  /** Часы строительства. */
  hours: number;
  ingredients: Record<string, number>;
}

export const COMPOSTERS: Record<string, ComposterRecord> = ${JSON.stringify(composterRecords, null, 2)};

/** Что нужно для запуска: компостер → сезон года → предмет → количество. */
export const COMPOST_RECIPES: Record<string, Record<string, Record<string, number>>> = ${JSON.stringify(recipes, null, 2)};

/** Сколько червей выпадает при сборе (случайный выбор из списка, до бустов). */
export const WORM_AMOUNTS: Record<string, number[]> = ${JSON.stringify(wormAmounts, null, 2)};

export const COMPOSTER_BUILDINGS: Record<string, BuildingRecord> = ${JSON.stringify(buildingRecords, null, 2)};
`;
const target = path.resolve("src/lib/composterData.generated.ts");
fs.writeFileSync(target, out);
console.log(`ok: ${COMPOSTERS.length} компостера, ${COMPOSTERS.length * SEASONS.length} рецептов, ${Object.keys(wormAmounts).length} червя → ${path.relative(".", target)}`);
