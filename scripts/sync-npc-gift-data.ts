/**
 * sync-npc-gift-data.ts
 * Генерирует src/lib/npcGiftData.generated.ts из исходников игры
 * (src/features/game/types/gifts.ts): сколько очков дружбы даёт каждый цветок,
 * какие цветы NPC любят особо (бонус к очкам) и какие награды NPC дарят за
 * очки дружбы (запланированные пороги и повторяющаяся награда).
 *
 * Запуск из корня репозитория (клон — npm run sfl:clone):
 *   npm run sfl:sync-npc-gifts [-- --sfl-dir ./_sfl_temp]
 *
 * Скрипт падает, если разобрано не то, что ожидается, — значит, игра поменяла
 * формат файла и парсер надо поправить.
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
  const start = text.search(new RegExp(`export const ${name}\\b`));
  if (start < 0) throw new Error(`не найден блок ${name}`);
  return objectAfter(text, text.indexOf("=", start));
};
/** Вычисляет литерал объекта из исходника (без типов); BB_TO_GEM_RATIO подставляем числом. */
const literal = (code: string, constants: Record<string, number>): any =>
  new Function(...Object.keys(constants), `"use strict"; return (${code});`)(...Object.values(constants));

const gifts = read("src/features/game/types/gifts.ts");
const game = read("src/features/game/types/game.ts");
const ratio = /export const BB_TO_GEM_RATIO\s*=\s*(\d+)/.exec(game)?.[1];
if (!ratio) throw new Error("не найден BB_TO_GEM_RATIO в game.ts");
const constants = { BB_TO_GEM_RATIO: Number(ratio) };

const flowerPoints: Record<string, number> = literal(constBlock(gifts, "DEFAULT_FLOWER_POINTS"), constants);
const bonuses: Record<string, Record<string, number>> = literal(constBlock(gifts, "BUMPKIN_FLOWER_BONUSES"), constants);

interface Gift {
  friendshipPoints: number;
  items: Record<string, number>;
  coins: number;
  wearables: Record<string, number>;
  recipe?: string;
}
const npcGifts: Record<string, { planned: Gift[]; repeats: Gift }> = literal(constBlock(gifts, "BUMPKIN_GIFTS"), constants);

// ─── проверки целостности ─────────────────────────────────────────────────────
const flowerNames = Object.keys(flowerPoints);
if (flowerNames.length < 50) throw new Error(`слишком мало цветов с очками: ${flowerNames.length}`);
for (const [npc, b] of Object.entries(bonuses)) {
  for (const [flower, bonus] of Object.entries(b)) {
    if (!(flower in flowerPoints)) throw new Error(`${npc}: бонус для неизвестного цветка «${flower}»`);
    if (!(bonus > 0)) throw new Error(`${npc}/${flower}: бонус должен быть положительным`);
  }
}
for (const [npc, g] of Object.entries(npcGifts)) {
  if (!g.planned?.length || !g.repeats) throw new Error(`${npc}: нет наград`);
  let prev = 0;
  for (const gift of [...g.planned].sort((a, b) => a.friendshipPoints - b.friendshipPoints)) {
    if (!(gift.friendshipPoints > prev)) throw new Error(`${npc}: пороги наград не возрастают`);
    prev = gift.friendshipPoints;
  }
  if (!(g.repeats.friendshipPoints > 0)) throw new Error(`${npc}: нет шага повторяющейся награды`);
}

// Порядок NPC: те, кто любит цветы или даёт награды; без повторов.
const npcs = [...new Set([...Object.keys(bonuses), ...Object.keys(npcGifts)])];

const out = `// ЭТОТ ФАЙЛ СГЕНЕРИРОВАН scripts/sync-npc-gift-data.ts из исходников Sunflower Land
// (types/gifts.ts). Не править руками — запустите \`npm run sfl:sync-npc-gifts\` после \`npm run sfl:clone\`.

export interface NpcGift {
  /** Очки дружбы, при которых награда становится доступна. */
  friendshipPoints: number;
  items: Record<string, number>;
  coins: number;
  wearables: Record<string, number>;
  /** Рецепт крафта, который NPC открывает вместе с наградой. */
  recipe?: string;
}

/** Очки дружбы за один цветок без бонусов NPC. */
export const FLOWER_POINTS: Record<string, number> = ${JSON.stringify(flowerPoints, null, 2)};

/** NPC → любимые цветы → бонус к очкам сверху базовых. */
export const NPC_FLOWER_BONUSES: Record<string, Record<string, number>> = ${JSON.stringify(bonuses, null, 2)};

/** NPC → награды за дружбу: запланированные пороги и повторяющаяся награда (каждые N очков после последней). */
export const NPC_GIFTS: Record<string, { planned: NpcGift[]; repeats: NpcGift }> = ${JSON.stringify(npcGifts, null, 2)};

/** Все NPC, у которых есть бонусы к цветам или награды. */
export const NPC_NAMES: string[] = ${JSON.stringify(npcs, null, 2)};
`;
const target = path.resolve("src/lib/npcGiftData.generated.ts");
fs.writeFileSync(target, out);
console.log(`ok: ${npcs.length} NPC, ${flowerNames.length} цветов, ${Object.keys(bonuses).length} NPC с бонусами, ${Object.keys(npcGifts).length} NPC с наградами → ${path.relative(".", target)}`);
