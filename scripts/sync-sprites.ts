/**
 * sync-sprites.ts
 * Copies sprite files from a sunflower-land clone into goblincodex/public/sprites/,
 * skipping files whose content is already identical (compared by bytes — mtime
 * is useless here: a fresh `git pull` stamps changed files "now", while our copy
 * may be newer than the upstream edit, so a replaced picture was never picked up).
 *
 * Pictures that the game keeps on its asset CDN (`SUNNYSIDE.*` refs: buildings,
 * crafting items, animal food, decorations, rocks…) aren't in the repo; they are
 * downloaded from the CDN to the same relative path. Already-present CDN files
 * are kept as is unless --refresh-cdn is passed (then they are compared by bytes).
 *
 * Run from the repo root:
 *   npm run sfl:sync-sprites
 *   # or with custom paths:
 *   npx tsx scripts/sync-sprites.ts --sfl-dir ./_sfl_temp --target-dir ./public/sprites
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parseSpriteMap, parseCdnSpriteMap } from "./lib/sprite-map";

// ─── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs(): { sflDir: string; targetDir: string; refreshCdn: boolean } {
  const args = process.argv.slice(2);
  let sflDir = "";
  let targetDir = "";
  const refreshCdn = args.includes("--refresh-cdn");

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--sfl-dir" && args[i + 1]) sflDir = args[++i];
    else if (args[i] === "--target-dir" && args[i + 1]) targetDir = args[++i];
  }

  if (!sflDir) sflDir = "./_sfl_temp";
  if (!targetDir) targetDir = "./public/sprites";

  return {
    sflDir: path.resolve(sflDir),
    targetDir: path.resolve(targetDir),
    refreshCdn,
  };
}

const GAME_ASSETS_BASE = "https://sunflower-land.com/game-assets";

function sameContent(a: string, b: string): boolean {
  const x = fs.readFileSync(a);
  const y = fs.readFileSync(b);
  return x.length === y.length && x.equals(y);
}

/** GET с повторами: CDN иногда рвёт соединение при параллельных запросах. */
async function fetchBytes(url: string): Promise<Buffer | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    } catch {
      /* повтор */
    }
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  return null;
}

// Sprites referenced by populate-buffs-db.ts / the frontend that aren't
// derivable from parseSpriteMap() (no ITEM_DETAILS-style import to scan) —
// hand-built from known filename conventions.
const EXTRA_SPRITES = [
  "pets/backgrounds/blank-dragon.webp",
  "pets/backgrounds/blank-ram.webp",
  "pets/backgrounds/blank-phoenix.webp",
  "pets/backgrounds/blank-griffin.webp",
  "pets/backgrounds/blank-warthog.webp",
  "pets/backgrounds/blank-wolf.webp",
  "pets/backgrounds/blank-bear.webp",
  // Bud "Type" (island) backgrounds — one per TypeTrait value, shown behind
  // a Bud's rendered image (see BudsCatalog.tsx).
  "buds-backgrounds/plaza_shadow.png",
  "buds-backgrounds/woodlands_shadow.png",
  "buds-backgrounds/cave_shadow.png",
  "buds-backgrounds/sea_shadow.png",
  "buds-backgrounds/castle_shadow.png",
  "buds-backgrounds/port_shadow.png",
  "buds-backgrounds/retreat_shadow.png",
  "buds-backgrounds/saphiro_shadow.png",
  "buds-backgrounds/snow_shadow.png",
  "buds-backgrounds/beach_shadow.png",
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { sflDir, targetDir, refreshCdn } = parseArgs();

  console.log(`SFL source : ${sflDir}`);
  console.log(`Target dir : ${targetDir}`);

  if (!fs.existsSync(sflDir)) {
    console.error(`Error: sfl-dir does not exist: ${sflDir}`);
    console.error("Run: npm run sfl:clone");
    process.exit(1);
  }

  console.log("\nParsing sprite map from SFL sources...");
  const spriteMap = parseSpriteMap(sflDir);
  console.log(`  ${spriteMap.size} sprites found in source`);

  // Collect unique sprite paths (multiple items can share a sprite)
  const uniqueSprites = new Set([...spriteMap.values(), ...EXTRA_SPRITES]);

  let copied = 0;
  let upToDate = 0;
  const missing: string[] = [];

  for (const spritePath of uniqueSprites) {
    // Source: <sfl-dir>/src/assets/<spritePath>
    const srcFile = path.join(sflDir, "src", "assets", spritePath);

    if (!fs.existsSync(srcFile)) {
      missing.push(spritePath);
      continue;
    }

    // Destination: <target-dir>/<spritePath>
    const destFile = path.join(targetDir, spritePath);
    const destDir = path.dirname(destFile);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Copy if missing or the content differs
    const existed = fs.existsSync(destFile);
    if (!existed || !sameContent(srcFile, destFile)) {
      fs.copyFileSync(srcFile, destFile);
      copied++;
      if (existed) console.log(`  updated: ${spritePath}`);
    } else {
      upToDate++;
    }
  }

  // ── CDN: картинки, которых нет в репозитории игры ──────────────────
  const cdnPaths = new Set(
    [...parseCdnSpriteMap(sflDir).values()].filter((rel) => !uniqueSprites.has(rel)),
  );
  let cdnDownloaded = 0;
  let cdnUpdated = 0;
  let cdnPresent = 0;
  const cdnFailed: string[] = [];
  const queue = [...cdnPaths];
  console.log(`\nCDN sprites referenced: ${queue.length}`);
  const worker = async () => {
    while (queue.length) {
      const rel = queue.shift()!;
      const dest = path.join(targetDir, rel);
      const exists = fs.existsSync(dest);
      // Файл бывает и в репозитории игры (не попал в карту) — берём оттуда.
      const inRepo = path.join(sflDir, "src", "assets", rel);
      if (fs.existsSync(inRepo)) {
        if (!exists || !sameContent(inRepo, dest)) {
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.copyFileSync(inRepo, dest);
          cdnDownloaded++;
        } else cdnPresent++;
        continue;
      }
      if (exists && !refreshCdn) {
        cdnPresent++;
        continue;
      }
      const bytes = await fetchBytes(`${GAME_ASSETS_BASE}/${rel}`);
      if (!bytes) {
        cdnFailed.push(rel);
        continue;
      }
      if (exists) {
        if (fs.readFileSync(dest).equals(bytes)) {
          cdnPresent++;
          continue;
        }
        cdnUpdated++;
        console.log(`  updated (cdn): ${rel}`);
      } else {
        cdnDownloaded++;
      }
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, bytes);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));

  console.log("\nDone.");
  console.log(`  Copied    : ${copied}`);
  console.log(`  Up to date: ${upToDate}`);
  console.log(`  Not found : ${missing.length}`);
  console.log(`  CDN       : ${cdnDownloaded} downloaded, ${cdnUpdated} updated, ${cdnPresent} already present, ${cdnFailed.length} failed`);
  if (cdnFailed.length) cdnFailed.forEach((p) => console.log(`    cdn failed: ${p}`));

  if (missing.length > 0) {
    console.log("\nMissing in source (first 20):");
    missing.slice(0, 20).forEach((p) => console.log(`  - ${p}`));
    if (missing.length > 20) console.log(`  ... and ${missing.length - 20} more`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
