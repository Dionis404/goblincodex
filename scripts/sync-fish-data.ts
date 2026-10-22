/**
 * sync-fish-data.ts
 * Генерирует src/lib/fishData.generated.ts из исходников игры: справочник рыб
 * (обычная рыба и постоянные марвелы из FISH), гарантированный улов по наживкам
 * и приманки (chum). Марвелы глав и куски карт сюда не входят — они в разделе
 * «Морские марвелы». Данные нельзя импортировать из клона напрямую — файл
 * игры тянет за собой полпроекта (translate, game types…), поэтому
 * разбираем его текст.
 *
 * Запуск из корня репозитория (клон — npm run sfl:clone):
 *   npx tsx scripts/sync-fish-data.ts [--sfl-dir ./_sfl_temp]
 *
 * Скрипт падает, если количество разобранных записей не сошлось с ожидаемым —
 * значит, игра поменяла формат файла и парсер надо поправить.
 */
import * as fs from "node:fs";
import * as path from "node:path";

function parseArgs(): { sflDir: string } {
  const i = process.argv.indexOf("--sfl-dir");
  return { sflDir: path.resolve(i > -1 && process.argv[i + 1] ? process.argv[i + 1] : "./_sfl_temp") };
}

const { sflDir } = parseArgs();
const source = fs.readFileSync(path.join(sflDir, "src/features/game/types/fishing.ts"), "utf8");

/** Текст объявления `export const NAME ... = { ... };` — от имени до закрывающей скобки верхнего уровня. */
function blockIn(text: string, name: string): string {
  const start = text.search(new RegExp(`(?:export )?const ${name}\\b`));
  if (start < 0) throw new Error(`не найден блок ${name}`);
  const open = text.indexOf("{", text.indexOf("=", start));
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return text.slice(open, i + 1);
  }
  throw new Error(`не закрыт блок ${name}`);
}
const block = (name: string): string => blockIn(source, name);

const list = (s: string): string[] => [...s.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const key = (q?: string, bare?: string) => q ?? bare!;

export interface FishRecord {
  name: string;
  type: string;
  baits: string[];
  likes: string[];
  seasons: string[];
}

const ENTRY =
  /(?:"([^"]+)"|(\w+)):\s*\{\s*baits:\s*\[([^\]]*)\],\s*type:\s*"([^"]+)",\s*likes:\s*\[([^\]]*)\],\s*seasons:\s*\[([^\]]*)\],?\s*\}/g;

function fishFrom(text: string): FishRecord[] {
  return [...text.matchAll(ENTRY)].map((m) => ({
    name: key(m[1], m[2]),
    type: m[4],
    baits: list(m[3]),
    likes: list(m[5]),
    seasons: list(m[6]),
  }));
}

const regular = fishFrom(block("FISH"));
const chapter = fishFrom(block("CHAPTER_FISH"));
const fish = [...regular, ...chapter];

// Ожидаемое число записей берём независимо — по объявлению типов в файле.
const declared =
  list(source.slice(source.indexOf("export type FishName"), source.indexOf("export type AgedFishName"))).length +
  list(source.slice(source.indexOf("export type MarineMarvelName"), source.indexOf("export type OldFishName"))).length;
if (fish.length !== declared) {
  throw new Error(`разобрано ${fish.length} рыб, в типах объявлено ${declared} — формат FISH изменился`);
}

const guaranteedBlock = block("GUARANTEED_CATCH_BY_BAIT");
const guaranteed: Record<string, string[]> = {};
for (const m of guaranteedBlock.matchAll(/"([^"]+)":\s*\[([^\]]*)\]/g)) guaranteed[m[1]] = list(m[2]);
if (Object.keys(guaranteed).length !== 4) throw new Error("ожидалось 4 гарантированных наживки");

const chumBlock = block("CHUM_AMOUNTS");
const chum: Record<string, number> = {};
for (const m of chumBlock.matchAll(/(?:"([^"]+)"|(\w+)):\s*(\d+)/g)) chum[key(m[1], m[2])] = Number(m[3]);

// ─── Раки: ловушки, приманки и что в них попадается (crustaceans.ts) ───────────
const crustSource = fs.readFileSync(path.join(sflDir, "src/features/game/types/crustaceans.ts"), "utf8");
const crustBlock = (name: string): string => blockIn(crustSource, name);
const amounts = (name: string): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const m of crustBlock(name).matchAll(/(?:"([^"]+)"|(\w+)):\s*(\d+)/g)) out[key(m[1], m[2])] = Number(m[3]);
  return out;
};
const crabPotChums = amounts("CRAB_POT_CHUMS");
const marinerPotChums = amounts("MARINER_POT_CHUMS");

const lookupBlock = crustBlock("CRUSTACEANS_LOOKUP");
const crustaceanLookup: Record<string, Record<string, string>> = {};
for (const pot of ["Crab Pot", "Mariner Pot"]) {
  const start = lookupBlock.indexOf(`"${pot}": {`);
  if (start < 0) throw new Error(`нет ${pot} в CRUSTACEANS_LOOKUP`);
  const open = lookupBlock.indexOf("{", start);
  const close = lookupBlock.indexOf("}", open);
  const rows: Record<string, string> = {};
  for (const m of lookupBlock.slice(open, close).matchAll(/(?:"([^"]+)"|(\w+)):\s*"([^"]+)"/g)) rows[key(m[1], m[2])] = m[3];
  crustaceanLookup[pot] = rows;
}

const trapBlock = crustBlock("WATER_TRAP");
const waterTraps: Record<string, { readyHours: number; level: number; chums: Record<string, number> }> = {};
for (const [pot, chums] of [["Crab Pot", crabPotChums], ["Mariner Pot", marinerPotChums]] as const) {
  const start = trapBlock.indexOf(`"${pot}": {`);
  const seg = trapBlock.slice(start, trapBlock.indexOf("},", start));
  const hours = /readyTimeHours:\s*(\d+)/.exec(seg)?.[1];
  const level = /level:\s*(\d+)/.exec(seg)?.[1];
  if (!hours || !level) throw new Error(`не разобраны время/уровень ${pot}`);
  waterTraps[pot] = { readyHours: Number(hours), level: Number(level), chums };
}

// Проверки целостности: каждое ракообразное из списка игры достижимо, приманки из lookup объявлены.
const declaredCrustaceans = list(crustSource.slice(crustSource.indexOf("export const CRUSTACEANS = ["), crustSource.indexOf("] as const")));
const reachable = new Set(Object.values(crustaceanLookup).flatMap((r) => Object.values(r)));
if (declaredCrustaceans.length !== 16 || declaredCrustaceans.some((c) => !reachable.has(c))) {
  throw new Error(`раки: объявлено ${declaredCrustaceans.length}, достижимо ${reachable.size} — формат crustaceans.ts изменился`);
}
for (const [pot, rows] of Object.entries(crustaceanLookup)) {
  for (const chumName of Object.keys(rows)) {
    if (chumName !== "none" && !(chumName in waterTraps[pot].chums)) throw new Error(`${pot}: приманка ${chumName} без расхода`);
  }
}

const out = `// ЭТОТ ФАЙЛ СГЕНЕРИРОВАН scripts/sync-fish-data.ts из исходников Sunflower Land
// (src/features/game/types/fishing.ts). Не править руками — запустите
// \`npm run sfl:sync-fish\` после \`npm run sfl:clone\`.

export interface FishRecord {
  name: string;
  /** basic | advanced | expert | marine marvel */
  type: string;
  /** Подходящая наживка: червь (Earthworm/Grub/Red Wiggler) или Fishing Lure. */
  baits: string[];
  /** Приманка (chum), которая повышает шанс именно этой рыбы. */
  likes: string[];
  seasons: string[];
}

/** Обычная рыба и постоянные марвелы. Марвелы глав (CHAPTER_FISH) не включены — они в разделе «Морские марвелы». */
export const FISH_RECORDS: FishRecord[] = ${JSON.stringify(regular, null, 2)};

/** Рыба, которую гарантирует наживка (Fish Flake и т.д.). */
export const GUARANTEED_CATCH: Record<string, string[]> = ${JSON.stringify(guaranteed, null, 2)};

/** Сколько единиц предмета уходит как приманка за один заброс. */
export const CHUM_AMOUNTS: Record<string, number> = ${JSON.stringify(chum, null, 2)};

/** Ловушки для ракообразных (crustaceans.ts): время, уровень бампкина и расход приманки. */
export const WATER_TRAPS: Record<string, { readyHours: number; level: number; chums: Record<string, number> }> = ${JSON.stringify(waterTraps, null, 2)};

/** Ловушка → приманка (или "none") → кто попадётся. Результат детерминирован, без случайности. */
export const CRUSTACEAN_LOOKUP: Record<string, Record<string, string>> = ${JSON.stringify(crustaceanLookup, null, 2)};
`;
const target = path.resolve("src/lib/fishData.generated.ts");
fs.writeFileSync(target, out);
console.log(
  `ok: ${regular.length} рыб (в игре всего ${fish.length}, марвелы глав пропущены), ` +
    `${Object.keys(guaranteed).length} гарантирующих наживок, ${Object.keys(chum).length} приманок, ${[...new Set(Object.values(crustaceanLookup).flatMap((r) => Object.values(r)))].length} ракообразных → ${path.relative(".", target)}`,
);
