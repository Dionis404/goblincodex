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
function block(name: string): string {
  const start = source.search(new RegExp(`(?:export )?const ${name}\\b`));
  if (start < 0) throw new Error(`не найден блок ${name}`);
  const open = source.indexOf("{", source.indexOf("=", start));
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) return source.slice(open, i + 1);
  }
  throw new Error(`не закрыт блок ${name}`);
}

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
`;
const target = path.resolve("src/lib/fishData.generated.ts");
fs.writeFileSync(target, out);
console.log(
  `ok: ${regular.length} рыб (в игре всего ${fish.length}, марвелы глав пропущены), ` +
    `${Object.keys(guaranteed).length} гарантирующих наживок, ${Object.keys(chum).length} приманок → ${path.relative(".", target)}`,
);
