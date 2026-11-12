/**
 * optimize-blog-images.ts
 * One-shot compression pass over every PNG/JPEG mirrored in
 * public/blog-images/: resizes to <=1600px wide and re-encodes —
 * frontmatter preview images (which double as og:image) become JPEG,
 * in-article body images become WebP. Originals are deleted on success.
 *
 * Also rewrites all /blog-images/*.png|jpg references in src/content/*.md
 * to the new extensions, so article bodies and card thumbnails keep working.
 *
 * Safe to re-run: files already carrying an optimized extension are skipped.
 *
 * Run from the repo root:
 *   npx tsx scripts/optimize-blog-images.ts
 *   # or with custom paths:
 *   npx tsx scripts/optimize-blog-images.ts --content-dir ./src/content --target-dir ./public/blog-images
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { optimizeImage, toWebPath, unlinkWithRetry, withFormatExt, type OptimizedFormat } from './lib/optimize-image';

// ─── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs(): { contentDir: string; targetDir: string } {
  const args = process.argv.slice(2);
  let contentDir = '';
  let targetDir = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--content-dir' && args[i + 1]) contentDir = args[++i];
    else if (args[i] === '--target-dir' && args[i + 1]) targetDir = args[++i];
  }

  if (!contentDir) contentDir = './src/content';
  if (!targetDir) targetDir = './public/blog-images';

  return { contentDir: path.resolve(contentDir), targetDir: path.resolve(targetDir) };
}

// ─── Frontmatter preview images ───────────────────────────────────────────────
// `image:` в фронтматтере — это превью карточки И og:image статьи. Их жмём в
// JPEG (Telegram/WhatsApp не рендерят WebP в превью ссылок), тело статьи — WebP.

const FRONTMATTER_IMAGE_RE = /^image:\s*"?(\/blog-images\/[^"\n]+?)"?\s*$/m;

function collectFrontmatterImages(contentDir: string): Set<string> {
  const set = new Set<string>();
  const collections = fs.readdirSync(contentDir).filter((d) => {
    try { return fs.statSync(path.join(contentDir, d)).isDirectory(); } catch { return false; }
  });
  for (const collection of collections) {
    const dir = path.join(contentDir, collection);
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.md')) continue;
      const m = fs.readFileSync(path.join(dir, f), 'utf-8').match(FRONTMATTER_IMAGE_RE);
      if (m) set.add(m[1]);
    }
  }
  return set;
}

// ─── Filesystem walk ──────────────────────────────────────────────────────────

function* walkSources(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkSources(full);
    else if (/\.(png|jpe?g)$/i.test(entry.name)) yield full;
  }
}

// Прошлые прогоны могли оставить фронтматтерные превью в WebP (og:image в
// Telegram/WhatsApp WebP не рендерится) — доконвертируем их в JPEG.
function* walkWebpPreviews(dir: string, publicRoot: string, fmSet: Set<string>): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkWebpPreviews(full, publicRoot, fmSet);
    } else if (/\.webp$/i.test(entry.name)) {
      const jpgSibling = full.replace(/\.webp$/i, '.jpg');
      if (!fs.existsSync(jpgSibling) && fmSet.has(toWebPath(publicRoot, full))) yield full;
    }
  }
}

// ─── Reference rewrite ────────────────────────────────────────────────────────

function rewriteContentRefs(contentDir: string, mapping: Map<string, string>): number {
  let rewritten = 0;
  for (const file of walkMd(contentDir)) {
    let text = fs.readFileSync(file, 'utf-8');
    let changed = false;
    for (const [from, to] of mapping) {
      if (text.includes(from)) {
        text = text.split(from).join(to);
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(file, text, 'utf-8');
      rewritten++;
    }
  }
  return rewritten;
}

function* walkMd(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkMd(full);
    else if (entry.name.endsWith('.md')) yield full;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { contentDir, targetDir } = parseArgs();

  console.log(`Content dir: ${contentDir}`);
  console.log(`Target dir : ${targetDir}`);

  if (!fs.existsSync(targetDir)) {
    console.error(`Error: target dir does not exist: ${targetDir}`);
    process.exit(1);
  }

  const frontmatterImages = collectFrontmatterImages(contentDir);
  console.log(`Frontmatter preview images found: ${frontmatterImages.size}\n`);

  const publicRoot = path.dirname(targetDir); // public/ — web paths start from here
  const mapping = new Map<string, string>(); // old web path -> new web path
  let beforeTotal = 0;
  let afterTotal = 0;
  let converted = 0;
  let skipped = 0;
  const failures: string[] = [];

  const jobs: { srcFile: string; format: OptimizedFormat }[] = [
    ...[...walkSources(targetDir)].map((srcFile) => ({
      srcFile,
      format: (frontmatterImages.has(toWebPath(publicRoot, srcFile)) ? 'jpg' : 'webp') as OptimizedFormat,
    })),
    ...[...walkWebpPreviews(targetDir, publicRoot, frontmatterImages)].map((srcFile) => ({
      srcFile,
      format: 'jpg' as OptimizedFormat,
    })),
  ];

  for (const { srcFile, format } of jobs) {
    const webPath = toWebPath(publicRoot, srcFile);
    const outFile = withFormatExt(srcFile, format);

    if (fs.existsSync(outFile)) {
      skipped++;
      continue;
    }

    try {
      const outcome = await optimizeImage(srcFile, format);
      beforeTotal += outcome.beforeBytes;
      afterTotal += outcome.afterBytes;
      mapping.set(webPath, toWebPath(publicRoot, outcome.outFile));
      try {
        unlinkWithRetry(srcFile);
      } catch {
        // Файл залочен (антивирус/индексатор) — не страшно: ссылка ведёт на
        // оптимизованный файл, источник подчистится ручным прогоном позже.
        console.warn(`  warn: could not delete source ${path.basename(srcFile)} (busy)`);
      }
      converted++;
      console.log(`  ${path.basename(webPath)} -> ${path.basename(outFile)}  ${(outcome.beforeBytes / 1024).toFixed(0)}K -> ${(outcome.afterBytes / 1024).toFixed(0)}K`);
    } catch (e) {
      failures.push(`${webPath}: ${e instanceof Error ? e.message : String(e)}`);
      console.error(`  FAILED ${webPath}`);
    }
  }

  if (mapping.size > 0) {
    const rewrittenFiles = rewriteContentRefs(contentDir, mapping);
    console.log(`\nRewrote references in ${rewrittenFiles} content files.`);
  }

  console.log('\nDone.');
  console.log(`  Converted: ${converted}`);
  console.log(`  Skipped (already optimized): ${skipped}`);
  console.log(`  Failed   : ${failures.length}`);
  if (failures.length > 0) failures.forEach((f) => console.log(`  - ${f}`));
  console.log(`  Size     : ${(beforeTotal / 1048576).toFixed(1)} MB -> ${(afterTotal / 1048576).toFixed(1)} MB`);
}

main();
