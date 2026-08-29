/**
 * import-teletype-news.ts
 * One-time import of the Teletype (@urg) article archive export into the
 * `news` content collection (src/content/news/*.md). Not part of any
 * ongoing pipeline — new articles going forward are added by hand as new
 * .md files in src/content/news/, same workflow as guides/mechanics.
 *
 * Expects each source file in the shape Teletype's own export produces:
 *
 *   # Title
 *
 *   > 📅 YYYY-MM-DD [· 🏷 Category]
 *   > 🔗 Оригинал: https://teletype.in/@urg/...
 *
 *   ---
 *
 *   body markdown...
 *
 * The 🏷 category segment is sometimes absent entirely (not just blank).
 *
 * Run from the repo root:
 *   npx tsx scripts/import-teletype-news.ts --source "<path to archive folder>" --target ./src/content/news
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ─── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs(): { sourceDir: string; targetDir: string } {
  const args = process.argv.slice(2);
  let sourceDir = "";
  let targetDir = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--source" && args[i + 1]) sourceDir = args[++i];
    else if (args[i] === "--target" && args[i + 1]) targetDir = args[++i];
  }

  if (!sourceDir) {
    console.error("Error: --source <path to Teletype export folder> is required");
    process.exit(1);
  }
  if (!targetDir) targetDir = "./src/content/news";

  return { sourceDir: path.resolve(sourceDir), targetDir: path.resolve(targetDir) };
}

// ─── Transliteration (RU → ASCII, only needs to be unique/stable, not pretty) ──

const TRANSLIT_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function transliterate(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((ch) => TRANSLIT_MAP[ch] ?? ch)
    .join("");
}

const SLUG_WORD_COUNT = 4;

function slugify(date: string, title: string): string {
  const words = transliterate(title)
    .replace(/[^a-z0-9\s]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, SLUG_WORD_COUNT);
  const base = words.join("-");
  return `${date}-${base}`;
}

// ─── Parsing ────────────────────────────────────────────────────────────────

interface ParsedArticle {
  title: string;
  date: string;
  category: string | null;
  originalUrl: string | null;
  body: string;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, max: number): string {
  const clean = stripMarkdown(text);
  return clean.length > max ? clean.slice(0, max) + "..." : clean;
}

function parseArticle(raw: string, filename: string): ParsedArticle | null {
  const titleMatch = raw.match(/^#\s+(.+)$/m);
  if (!titleMatch) {
    console.warn(`  ! ${filename}: no title (# heading) found, skipping`);
    return null;
  }
  const title = titleMatch[1].trim();

  const metaMatch = raw.match(/^>\s*📅\s*([\d-]+)(?:\s*·\s*🏷\s*(.*))?\s*$/m);
  if (!metaMatch) {
    console.warn(`  ! ${filename}: no 📅 date line found, skipping`);
    return null;
  }
  const date = metaMatch[1].trim();
  const rawCategory = metaMatch[2]?.trim() ?? "";
  const category = rawCategory && rawCategory !== "—" ? rawCategory : null;

  const urlMatch = raw.match(/^>\s*🔗\s*Оригинал:\s*(\S+)/m);
  const originalUrl = urlMatch?.[1]?.trim() ?? null;

  const parts = raw.split(/\n---\n/);
  const body = parts.length > 1 ? parts.slice(1).join("\n---\n").trim() : "";
  if (!body) {
    console.warn(`  ! ${filename}: no body found after --- separator, skipping`);
    return null;
  }

  return { title, date, category, originalUrl, body };
}

// ─── Frontmatter serialization ──────────────────────────────────────────────

function yamlString(value: string): string {
  // Flat scalar strings only — always double-quote and escape embedded quotes/backslashes.
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function buildFrontmatter(fields: Record<string, string | boolean | undefined>): string {
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (typeof value === "boolean") lines.push(`${key}: ${value}`);
    else lines.push(`${key}: ${yamlString(value)}`);
  }
  lines.push("---");
  return lines.join("\n");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const { sourceDir, targetDir } = parseArgs();

  console.log(`Source dir : ${sourceDir}`);
  console.log(`Target dir : ${targetDir}`);

  if (!fs.existsSync(sourceDir)) {
    console.error(`Error: source dir does not exist: ${sourceDir}`);
    process.exit(1);
  }
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const files = fs
    .readdirSync(sourceDir)
    .filter((f) => f.endsWith(".md") && !f.toLowerCase().startsWith("readme"));

  console.log(`\nFound ${files.length} candidate files.\n`);

  const usedSlugs = new Set<string>();
  let imported = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const filename of files) {
    const filePath = path.join(sourceDir, filename);
    const raw = fs.readFileSync(filePath, "utf-8");

    const parsed = parseArticle(raw, filename);
    if (!parsed) {
      skipped++;
      failures.push(filename);
      continue;
    }

    let slug = slugify(parsed.date, parsed.title);
    if (usedSlugs.has(slug)) {
      let n = 2;
      while (usedSlugs.has(`${slug}-${n}`)) n++;
      console.warn(`  ! slug collision for "${parsed.title}" (${filename}) -> ${slug}-${n}`);
      slug = `${slug}-${n}`;
    }
    usedSlugs.add(slug);

    const frontmatter = buildFrontmatter({
      title: parsed.title,
      slug,
      date: parsed.date,
      category: parsed.category ?? undefined,
      description: truncate(parsed.body, 150),
      originalUrl: parsed.originalUrl ?? undefined,
    });

    const outPath = path.join(targetDir, `${slug}.md`);
    fs.writeFileSync(outPath, `${frontmatter}\n\n${parsed.body}\n`, "utf-8");
    imported++;
  }

  console.log("\nDone.");
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped : ${skipped}`);
  if (failures.length > 0) {
    console.log("\nSkipped files:");
    failures.forEach((f) => console.log(`  - ${f}`));
  }
}

main();
