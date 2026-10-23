/**
 * sync-flower-data.ts
 * Генерирует src/lib/flowerData.generated.ts: семена цветов (цена в монетах,
 * уровень, время роста, сезон), предметы для скрещивания с количеством и
 * рецепты «цветок → что можно скрестить».
 *
 * Параметры семян, количества и сезонность берутся из исходников игры
 * (types/flowers.ts, types/seeds.ts). Сам рецепт (какой цветок получится из
 * семени и предмета) в открытом коде игры не определён — его выбирает сервер,
 * поэтому таблица лежит в scripts/data/flower-recipes.json (снята вручную со
 * страницы sfl-calculator.com/en/flower-recipes) и проверяется на согласие с
 * кодом игры.
 *
 * Запуск из корня репозитория (клон — npm run sfl:clone):
 *   npm run sfl:sync-flowers [-- --sfl-dir ./_sfl_temp]
 *
 * Скрипт падает, если таблица рецептов противоречит коду игры (лишний или
 * неизвестный предмет, у цветка нет рецепта, неверное количество семян).
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
/** Число или произведение вида `3 * 24 * 60 * 60`. */
const num = (expr: string): number => expr.split("*").reduce((acc, n) => acc * Number(n.trim()), 1);

const flowersSrc = read("src/features/game/types/flowers.ts");
const seedsSrc = read("src/features/game/types/seeds.ts");

// ─── семена ───────────────────────────────────────────────────────────────────
const SEED_NAMES = [
  "Sunpetal Seed", "Bloom Seed", "Lily Seed",
  "Lavender Seed", "Gladiolus Seed", "Clover Seed", "Edelweiss Seed",
] as const;
const seedsBlock = constBlock(flowersSrc, "FLOWER_SEEDS");

interface SeedRecord {
  /** Цена в монетах. */
  price: number;
  level: number;
  /** Дни роста без бустов. */
  days: number;
  /** Сезон года, в который семя продаётся; null — круглый год. */
  season: string | null;
  /** 1 — первый набор скрещиваемых предметов, 2 — второй. */
  set: 1 | 2;
  flowers: string[];
}

const recipeFile = JSON.parse(fs.readFileSync(path.resolve("scripts/data/flower-recipes.json"), "utf8")) as {
  seeds: Record<string, string[]>;
  recipes: Record<string, string[]>;
};

// сезонность: SEASONAL_SEEDS в seeds.ts
const seasonBlock = constBlock(seedsSrc, "SEASONAL_SEEDS");
const seasonOf = (seed: string): string | null => {
  const found: string[] = [];
  for (const season of ["spring", "summer", "autumn", "winter"]) {
    const from = seasonBlock.indexOf(`${season}:`);
    const open = seasonBlock.indexOf("[", from);
    const close = seasonBlock.indexOf("]", open);
    if (seasonBlock.slice(open, close).includes(`"${seed}"`)) found.push(season);
  }
  // Семя, которое есть во всех четырёх сезонах, продаётся круглый год.
  return found.length === 4 ? null : found.length === 1 ? found[0] : (() => { throw new Error(`${seed}: странная сезонность ${found}`); })();
};

// ─── предметы скрещивания: количество ─────────────────────────────────────────
const amounts = (name: string): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const m of constBlock(flowersSrc, name).matchAll(/(?:"([^"]+)"|(\w+)):\s*(\d+)/g)) out[m[1] ?? m[2]] = Number(m[3]);
  return out;
};
const AMOUNTS: Record<1 | 2, Record<string, number>> = {
  1: amounts("SET_1_FLOWER_CROSS_BREED_AMOUNTS"),
  2: amounts("SET_2_FLOWER_CROSS_BREED_AMOUNTS"),
};
// какое семя к какому набору относится — FLOWER_CROSS_BREED_AMOUNTS
const mapBlock = constBlock(flowersSrc, "FLOWER_CROSS_BREED_AMOUNTS");
const setOfSeed = (seed: string): 1 | 2 => {
  const m = new RegExp(`"${seed}":\\s*SET_(\\d)_FLOWER_CROSS_BREED_AMOUNTS`).exec(mapBlock);
  if (!m) throw new Error(`${seed}: нет в FLOWER_CROSS_BREED_AMOUNTS`);
  return Number(m[1]) as 1 | 2;
};

const seeds: Record<string, SeedRecord> = {};
for (const name of SEED_NAMES) {
  const seg = objectAfter(seedsBlock, seedsBlock.indexOf(`"${name}"`));
  const field = (re: RegExp): string => {
    const m = re.exec(seg);
    if (!m) throw new Error(`${name}: не разобрано поле ${re}`);
    return m[1].trim();
  };
  const flowers = recipeFile.seeds[name];
  if (!flowers?.length) throw new Error(`${name}: нет цветов в scripts/data/flower-recipes.json`);
  seeds[name] = {
    price: Number(field(/price:\s*(\d+)/)),
    level: Number(field(/level:\s*(\d+)/)),
    days: num(field(/plantSeconds:\s*([^,\n]+),/)) / 86400,
    season: seasonOf(name),
    set: setOfSeed(name),
    flowers,
  };
}

// ─── проверки целостности ─────────────────────────────────────────────────────
const allFlowers = new Set(Object.values(seeds).flatMap((s) => s.flowers));
const seedOfFlower = new Map(Object.entries(seeds).flatMap(([n, s]) => s.flowers.map((f) => [f, n] as const)));
if (allFlowers.size !== Object.keys(recipeFile.recipes).length) {
  throw new Error(`цветов в группах ${allFlowers.size}, рецептов ${Object.keys(recipeFile.recipes).length}`);
}
for (const f of allFlowers) {
  if (!recipeFile.recipes[f]?.length) throw new Error(`${f}: нет рецепта`);
}
for (const [flower, ings] of Object.entries(recipeFile.recipes)) {
  const seed = seedOfFlower.get(flower);
  if (!seed) throw new Error(`${flower}: нет в группах семян`);
  const set = seeds[seed].set;
  for (const ing of ings) {
    if (!(ing in AMOUNTS[set])) throw new Error(`${flower} (${seed}): предмет «${ing}» не из набора ${set}`);
  }
  if (new Set(ings).size !== ings.length) throw new Error(`${flower}: повтор предмета в рецепте`);
}
// все предметы-цветы в рецептах должны быть цветами того же набора
for (const set of [1, 2] as const) {
  for (const name of Object.keys(AMOUNTS[set])) {
    if (AMOUNTS[set][name] === 1 && !allFlowers.has(name)) {
      throw new Error(`набор ${set}: «${name}» (×1) не найден среди цветов — таблица устарела?`);
    }
  }
}

const out = `// ЭТОТ ФАЙЛ СГЕНЕРИРОВАН scripts/sync-flower-data.ts из исходников Sunflower Land
// (types/flowers.ts, types/seeds.ts) и таблицы рецептов scripts/data/flower-recipes.json.
// Не править руками — запустите \`npm run sfl:sync-flowers\` после \`npm run sfl:clone\`.

export interface FlowerSeedRecord {
  /** Цена семени в монетах. */
  price: number;
  /** Уровень Бампкина для покупки. */
  level: number;
  /** Дни роста без бустов. */
  days: number;
  /** Сезон года, в который семя продаётся; null — круглый год. */
  season: string | null;
  /** 1 — первый набор скрещиваемых предметов, 2 — второй. */
  set: 1 | 2;
  /** Цветы, которые вырастают из этого семени. */
  flowers: string[];
}

export const FLOWER_SEEDS: Record<string, FlowerSeedRecord> = ${JSON.stringify(seeds, null, 2)};

/** Сколько штук предмета нужно для скрещивания: набор → предмет → количество. */
export const CROSSBREED_AMOUNTS: Record<1 | 2, Record<string, number>> = ${JSON.stringify(AMOUNTS, null, 2)};

/** Цветок → предметы, из которых он получается (с семенем его группы). */
export const FLOWER_RECIPES: Record<string, string[]> = ${JSON.stringify(recipeFile.recipes, null, 2)};
`;
const target = path.resolve("src/lib/flowerData.generated.ts");
fs.writeFileSync(target, out);
console.log(`ok: ${SEED_NAMES.length} семян, ${allFlowers.size} цветов → ${path.relative(".", target)}`);
