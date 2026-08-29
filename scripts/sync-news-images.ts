/**
 * sync-news-images.ts
 * Downloads every img{1,2,3}.teletype.media image referenced in
 * src/content/news/*.md into public/blog-images/ (preserving the CDN's
 * files/xx/yy/ subpath, mirroring sync-sprites.ts's own approach of
 * mirroring source subdirectory structure), rewrites the markdown links to
 * the local path, and backfills each article's frontmatter `image` field
 * from its first successfully-downloaded image (used for card thumbnails).
 *
 * Skips images that already exist locally — a given Teletype uuid's content
 * never changes, so this is safe to re-run after adding new articles.
 *
 * Run from the repo root:
 *   npm run news:sync-images
 *   # or with custom paths:
 *   npx tsx scripts/sync-news-images.ts --content-dir ./src/content/news --target-dir ./public/blog-images
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { Agent, fetch as undiciFetch } from "undici";

// Некоторые CDN (в т.ч. img*.teletype.media) периодически подвешивают чтение
// тела ответа через обычный global fetch/undici при keep-alive + пайплайнинге
// — заголовки приходят (200 OK), а сам поток данных зависает и упирается в
// AbortSignal.timeout. Отдельный агент без keep-alive/пайплайнинга и по
// одному соединению на запрос обходит эту проблему (проверено вручную).
const noKeepAliveAgent = new Agent({
  keepAliveTimeout: 1,
  keepAliveMaxTimeout: 1,
  pipelining: 0,
  connections: 1,
});

// ─── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs(): { contentDir: string; targetDir: string } {
  const args = process.argv.slice(2);
  let contentDir = "";
  let targetDir = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--content-dir" && args[i + 1]) contentDir = args[++i];
    else if (args[i] === "--target-dir" && args[i + 1]) targetDir = args[++i];
  }

  if (!contentDir) contentDir = "./src/content/news";
  if (!targetDir) targetDir = "./public/blog-images";

  return { contentDir: path.resolve(contentDir), targetDir: path.resolve(targetDir) };
}

const IMAGE_URL_RE = /https:\/\/img[123]\.teletype\.media\/files\/([0-9a-f]{2})\/([0-9a-f]{2})\/([^)\s"]+)/g;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;
const BETWEEN_REQUESTS_DELAY_MS = 250;

function localSubpath(prefix1: string, prefix2: string, filename: string): string {
  return path.join(prefix1, prefix2, filename);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadOnce(url: string, destFile: string): Promise<{ ok: boolean; reason?: string }> {
  try {
    const res = await undiciFetch(url, {
      signal: AbortSignal.timeout(15000),
      dispatcher: noKeepAliveAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://teletype.in/',
        'Connection': 'close',
      },
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(destFile), { recursive: true });
    fs.writeFileSync(destFile, buf);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

async function downloadTo(url: string, destFile: string): Promise<{ ok: boolean; reason?: string }> {
  let last: { ok: boolean; reason?: string } = { ok: false, reason: 'not attempted' };
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    last = await downloadOnce(url, destFile);
    if (last.ok) return last;
    if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS * attempt);
  }
  return last;
}

function updateImageFrontmatter(content: string, localWebPath: string): string {
  if (/^image:\s*/m.test(content)) return content; // already has one, don't overwrite
  return content.replace(/^---\n/, `---\nimage: "${localWebPath}"\n`);
}

async function main() {
  const { contentDir, targetDir } = parseArgs();

  console.log(`Content dir: ${contentDir}`);
  console.log(`Target dir : ${targetDir}`);

  if (!fs.existsSync(contentDir)) {
    console.error(`Error: content dir does not exist: ${contentDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(contentDir).filter((f) => f.endsWith(".md"));
  console.log(`\nScanning ${files.length} articles...\n`);

  let downloaded = 0;
  let alreadyPresent = 0;
  const failed: string[] = [];

  for (const filename of files) {
    const filePath = path.join(contentDir, filename);
    let content = fs.readFileSync(filePath, "utf-8");

    const matches = [...content.matchAll(IMAGE_URL_RE)];
    if (matches.length === 0) continue;

    const replacements: { url: string; localWebPath: string }[] = [];
    let firstLocalWebPath: string | null = null;

    for (const m of matches) {
      const [url, p1, p2, filenamePart] = m;
      const subpath = localSubpath(p1, p2, filenamePart);
      const destFile = path.join(targetDir, subpath);
      const webPath = `/blog-images/${subpath.replace(/\\/g, "/")}`;

      if (fs.existsSync(destFile)) {
        alreadyPresent++;
      } else {
        process.stdout.write(`  downloading ${subpath}... `);
        const result = await downloadTo(url, destFile);
        console.log(result.ok ? 'ok' : `FAILED (${result.reason})`);
        if (!result.ok) {
          failed.push(`${filename}: ${url} (${result.reason})`);
          continue;
        }
        downloaded++;
        await sleep(BETWEEN_REQUESTS_DELAY_MS);
      }

      replacements.push({ url, localWebPath: webPath });
      if (!firstLocalWebPath) firstLocalWebPath = webPath;
    }

    if (replacements.length > 0) {
      for (const { url, localWebPath } of replacements) {
        content = content.split(url).join(localWebPath);
      }
      if (firstLocalWebPath) {
        content = updateImageFrontmatter(content, firstLocalWebPath);
      }
      fs.writeFileSync(filePath, content, "utf-8");
    }
  }

  console.log("\nDone.");
  console.log(`  Downloaded     : ${downloaded}`);
  console.log(`  Already present: ${alreadyPresent}`);
  console.log(`  Failed         : ${failed.length}`);

  if (failed.length > 0) {
    console.log("\nFailed (first 20):");
    failed.slice(0, 20).forEach((f) => console.log(`  - ${f}`));
    if (failed.length > 20) console.log(`  ... and ${failed.length - 20} more`);
  }
}

main();
