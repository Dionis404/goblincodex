/**
 * index-search.ts
 * Считает эмбеддинги для всех статей guides/ и mechanics/ через routerai.ru
 * и сохраняет их в таблицу search_embeddings (semantic search backend).
 *
 * Требует применённой миграции scripts/migrate-add-search-embeddings.sql.
 *
 * Run from the repo root:
 *   DATABASE_URL="..." ROUTERAI_API_KEY="..." npm run search:index
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { getEmbedding } from "../src/lib/routerai";
import { upsertSearchEmbedding } from "../src/lib/db";

interface Entry {
  collection: "guides" | "mechanics";
  id: string;
  title: string;
  description: string;
  body: string;
  draft: boolean;
}

// Разделы src/components/ReferenceCatalog.tsx (REF_SECTIONS) — это статичные
// React-таблицы, не content collection, поэтому в отдельный "документ" для
// поиска описываются вручную. Держать id/label в синхроне с REF_SECTIONS при
// добавлении новых разделов.
interface ReferenceEntry {
  id: string;
  title: string;
  keywords: string;
}

const REFERENCE_ENTRIES: ReferenceEntry[] = [
  {
    id: "skills",
    title: "Навыки",
    keywords: "деревья навыков бампкина, очки навыков, ранги, требования по уровню",
  },
  {
    id: "expansions",
    title: "Стоимость расширений",
    keywords: "цена и требования расширения острова по этапам, ресурсы на расширение",
  },
  {
    id: "levels",
    title: "Опыт и Возвышение",
    keywords: "таблица опыта бампкина по уровням, опыт для Возвышения (Ascension), сколько XP нужно на уровень",
  },
  {
    id: "bait",
    title: "Улов по наживке",
    keywords:
      "какая рыба ловится на какую наживку, гарантированный улов, Fish Flake, Fish Stick, Fish Oil, Crab Stick, обычная продвинутая редкая рыба, на что ловить рыбу",
  },
  {
    id: "upgrades",
    title: "Апгрейд ресурсов",
    keywords: "улучшение узлов ресурсов через обсидиан, стоимость апгрейда дерева камня золота железа",
  },
  {
    id: "obsidian",
    title: "Обсидиан (Lava Pit)",
    keywords: "рецепты Lava Pit по сезонам, что сдать чтобы получить обсидиан",
  },
  {
    id: "marvels",
    title: "Морские марвелы",
    keywords:
      "морские существа марвелы, шанс улова рыбы марвелом, Crocodile Dumbo Octopus Seahorse Dad Crystal Shrimp Deep Sea Slug Deep Sea Pig Starlight Tuna, какая рыба ловится марвелом",
  },
  {
    id: "food",
    title: "Еда и готовка",
    keywords: "таблица блюд, время готовки, сытость, буст от еды, что приготовить",
  },
];

// Плоский YAML-фронтматтер (все значения — строки/числа/booleans без вложенности,
// как в src/content.config.ts) — своего парсера достаточно, без новой зависимости.
function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  const data: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    data[kv[1]] = value;
  }
  return { data, body: match[2] };
}

function loadCollection(collection: "guides" | "mechanics"): Entry[] {
  const dir = path.resolve(`./src/content/${collection}`);
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".md"));

  return files.map(file => {
    const raw = fs.readFileSync(path.join(dir, file), "utf-8");
    const { data, body } = parseFrontmatter(raw);
    return {
      collection,
      id: file.replace(/\.md$/, ""),
      title: data.title ?? file,
      description: data.description ?? "",
      body,
      draft: data.draft === "true",
    };
  });
}

// Markdown-разметку убираем по-простому — заголовки/жирный/ссылки не несут
// смысла для эмбеддинга, а только шумят токенами.
function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MAX_CHARS = 6000; // грубый бюджет на эмбеддинг-модель, статьи справочника короче

async function main() {
  const entries = [...loadCollection("guides"), ...loadCollection("mechanics")].filter(
    e => !e.draft,
  );

  console.log(`Найдено статей для индексации: ${entries.length}`);

  let ok = 0;
  let failed = 0;

  for (const entry of entries) {
    const text = `${entry.title}\n${entry.description}\n${stripMarkdown(entry.body)}`.slice(
      0,
      MAX_CHARS,
    );

    try {
      const embedding = await getEmbedding(text);
      await upsertSearchEmbedding(entry.collection, entry.id, entry.title, embedding);
      ok++;
      console.log(`  ✓ [${entry.collection}] ${entry.id}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ [${entry.collection}] ${entry.id}:`, e instanceof Error ? e.message : e);
    }
  }

  console.log(`Найдено разделов Справочника для индексации: ${REFERENCE_ENTRIES.length}`);

  for (const ref of REFERENCE_ENTRIES) {
    const text = `${ref.title}\n${ref.keywords}`;

    try {
      const embedding = await getEmbedding(text);
      await upsertSearchEmbedding("reference", ref.id, ref.title, embedding);
      ok++;
      console.log(`  ✓ [reference] ${ref.id}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ [reference] ${ref.id}:`, e instanceof Error ? e.message : e);
    }
  }

  console.log(`\nГотово: ${ok} проиндексировано, ${failed} с ошибкой.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
