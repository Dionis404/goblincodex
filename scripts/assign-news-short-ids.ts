/**
 * assign-news-short-ids.ts
 * One-time migration: assigns a short numeric `shortId` (1, 2, 3, ...) to
 * every article in src/content/news/*.md, ordered by publish `date`
 * (ties broken by filename). Not part of any ongoing pipeline — a new
 * article going forward gets the next number by hand: max(shortId) + 1
 * across the collection (this script prints that number too, so you can
 * just run it again after adding a new .md to see what's next).
 *
 * Run from the repo root:
 *   npx tsx scripts/assign-news-short-ids.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";

const NEWS_DIR = path.resolve("./src/content/news");

function extractFrontmatter(raw: string): { fm: string; body: string } | null {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;
  return { fm: match[1], body: match[2] };
}

function getField(fm: string, key: string): string | null {
  const match = fm.match(new RegExp(`^${key}:\\s*"?([^"\\n]*)"?\\s*$`, "m"));
  return match ? match[1].trim() : null;
}

function hasField(fm: string, key: string): boolean {
  return new RegExp(`^${key}:`, "m").test(fm);
}

function insertShortId(fm: string, shortId: number): string {
  // Insert right after `title:` line so it reads naturally near the top.
  const lines = fm.split("\n");
  const titleIdx = lines.findIndex((l) => /^title:/.test(l));
  const insertAt = titleIdx >= 0 ? titleIdx + 1 : 0;
  lines.splice(insertAt, 0, `shortId: ${shortId}`);
  return lines.join("\n");
}

function main() {
  const files = fs.readdirSync(NEWS_DIR).filter((f) => f.endsWith(".md"));
  console.log(`Found ${files.length} article files in ${NEWS_DIR}\n`);

  type Entry = { filename: string; date: string; fm: string; body: string; existingShortId: number | null };
  const entries: Entry[] = [];

  for (const filename of files) {
    const filePath = path.join(NEWS_DIR, filename);
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = extractFrontmatter(raw);
    if (!parsed) {
      console.warn(`  ! ${filename}: could not parse frontmatter, skipping`);
      continue;
    }
    const date = getField(parsed.fm, "date") ?? "";
    const existing = getField(parsed.fm, "shortId");
    entries.push({
      filename,
      date,
      fm: parsed.fm,
      body: parsed.body,
      existingShortId: existing ? Number(existing) : hasField(parsed.fm, "shortId") ? Number(parsed.fm.match(/^shortId:\s*(\d+)/m)?.[1]) : null,
    });
  }

  const alreadyAssigned = entries.filter((e) => e.existingShortId != null && !Number.isNaN(e.existingShortId));
  const unassigned = entries.filter((e) => e.existingShortId == null || Number.isNaN(e.existingShortId));

  if (alreadyAssigned.length > 0 && unassigned.length === 0) {
    const max = Math.max(...alreadyAssigned.map((e) => e.existingShortId!));
    console.log(`All ${entries.length} articles already have shortId. Next free shortId: ${max + 1}`);
    return;
  }

  if (alreadyAssigned.length > 0) {
    console.log(`${alreadyAssigned.length} articles already have shortId — leaving them untouched.`);
  }

  unassigned.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.filename.localeCompare(b.filename);
  });

  const usedIds = new Set(alreadyAssigned.map((e) => e.existingShortId!));
  let next = alreadyAssigned.length > 0 ? Math.max(...usedIds) + 1 : 1;

  let assigned = 0;
  for (const entry of unassigned) {
    while (usedIds.has(next)) next++;
    const newFm = insertShortId(entry.fm, next);
    const outPath = path.join(NEWS_DIR, entry.filename);
    fs.writeFileSync(outPath, `---\n${newFm}\n---\n${entry.body}`, "utf-8");
    usedIds.add(next);
    assigned++;
    next++;
  }

  console.log(`\nDone. Assigned shortId to ${assigned} article(s).`);
  const finalMax = Math.max(...usedIds);
  console.log(`Next free shortId for a new article: ${finalMax + 1}`);
}

main();
