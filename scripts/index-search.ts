/**
 * index-search.ts
 * Считает эмбеддинги для всех статей guides/, mechanics/, news/ и разделов
 * Справочника через routerai.ru и сохраняет их в таблицу search_embeddings
 * (semantic search backend).
 *
 * Требует применённой миграции scripts/migrate-add-search-embeddings.sql.
 *
 * Run from the repo root:
 *   DATABASE_URL="..." ROUTERAI_API_KEY="..." npm run search:index
 */

import "dotenv/config";
import { getEmbedding } from "../src/lib/routerai";
import { upsertSearchEmbedding } from "../src/lib/db";
import { loadCollection, stripMarkdown, REFERENCE_ENTRIES } from "../src/lib/search-content";

const MAX_CHARS = 6000; // грубый бюджет на эмбеддинг-модель, статьи справочника короче

async function main() {
  const entries = [
    ...loadCollection("guides"),
    ...loadCollection("mechanics"),
    ...loadCollection("news"),
  ].filter(e => !e.draft);

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
    const text = `${ref.title}\n${ref.summary}`;

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
