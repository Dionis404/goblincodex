/**
 * sync-sprites.ts
 * Copies sprite files from a sunflower-land clone into goblincodex/public/sprites/,
 * skipping files that are already up to date (by mtime).
 *
 * Run from the repo root:
 *   npm run sfl:sync-sprites
 *   # or with custom paths:
 *   npx tsx scripts/sync-sprites.ts --sfl-dir ./_sfl_temp --target-dir ./public/sprites
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parseSpriteMap } from "./lib/sprite-map";

// ─── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs(): { sflDir: string; targetDir: string } {
  const args = process.argv.slice(2);
  let sflDir = "";
  let targetDir = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--sfl-dir" && args[i + 1]) sflDir = args[++i];
    else if (args[i] === "--target-dir" && args[i + 1]) targetDir = args[++i];
  }

  if (!sflDir) sflDir = "./_sfl_temp";
  if (!targetDir) targetDir = "./public/sprites";

  return {
    sflDir: path.resolve(sflDir),
    targetDir: path.resolve(targetDir),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const { sflDir, targetDir } = parseArgs();

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
  const uniqueSprites = new Set(spriteMap.values());

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

    // Copy if missing or source is newer
    let shouldCopy = true;
    if (fs.existsSync(destFile)) {
      const srcMtime = fs.statSync(srcFile).mtimeMs;
      const destMtime = fs.statSync(destFile).mtimeMs;
      if (srcMtime <= destMtime) {
        shouldCopy = false;
      }
    }

    if (shouldCopy) {
      fs.copyFileSync(srcFile, destFile);
      copied++;
    } else {
      upToDate++;
    }
  }

  console.log("\nDone.");
  console.log(`  Copied    : ${copied}`);
  console.log(`  Up to date: ${upToDate}`);
  console.log(`  Not found : ${missing.length}`);

  if (missing.length > 0) {
    console.log("\nMissing in source (first 20):");
    missing.slice(0, 20).forEach((p) => console.log(`  - ${p}`));
    if (missing.length > 20) console.log(`  ... and ${missing.length - 20} more`);
  }
}

main();
