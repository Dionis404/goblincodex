/**
 * lib/sprite-map.ts
 * Shared utilities for parsing sprite paths from SFL source files.
 * Used by populate-buffs-db.ts and sync-sprites.ts.
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ─── Source-parsing helpers ───────────────────────────────────────────────────

export interface RawEntry {
  key: string;
  block: string;
  isFn: boolean;
}

/**
 * Extract the inner content of a named object/array block:
 * "SOME_CONST = {" → returns the text between { and the matching }
 *
 * Handles TypeScript type annotations between the name and `= {` by finding
 * the assignment `= {` or `= [` pattern (not `=>` or type-level `[`).
 */
export function extractNamedBlock(source: string, name: string): string {
  const nameIdx = source.indexOf(name);
  if (nameIdx === -1) return "";

  let i = nameIdx + name.length;
  let openChar = "";
  while (i < source.length - 1) {
    if (source[i] === "=" && source[i + 1] !== ">") {
      let j = i + 1;
      while (j < source.length && (source[j] === " " || source[j] === "\n" || source[j] === "\r")) j++;
      if (source[j] === "{" || source[j] === "[") {
        openChar = source[j];
        i = j;
        break;
      }
    }
    i++;
  }

  if (!openChar) return "";

  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 1;
  const blockStart = i + 1;
  i++;

  while (i < source.length && depth > 0) {
    const c = source[i];
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      if (q === "`") {
        i++;
        let tDepth = 0;
        while (i < source.length) {
          if (source[i] === "\\" && i + 1 < source.length) { i += 2; continue; }
          if (source[i] === "$" && source[i + 1] === "{") { tDepth++; i += 2; continue; }
          if (tDepth > 0 && source[i] === "}") { tDepth--; i++; continue; }
          if (tDepth === 0 && source[i] === "`") break;
          i++;
        }
      } else {
        i++;
        while (i < source.length) {
          if (source[i] === "\\" && i + 1 < source.length) { i += 2; continue; }
          if (source[i] === q) break;
          i++;
        }
      }
    } else if (c === openChar) {
      depth++;
    } else if (c === closeChar) {
      depth--;
      if (depth === 0) {
        return source.slice(blockStart, i);
      }
    }
    i++;
  }
  return "";
}

/**
 * Extract all top-level key: value entries from an object block.
 * Handles quoted ("Name") and unquoted (Name) keys.
 * Handles arrow function values: (...) => [...] or (...) => {...}
 */
export function extractTopLevelEntries(block: string): RawEntry[] {
  const entries: RawEntry[] = [];
  let i = 0;

  while (i < block.length) {
    while (i < block.length && /\s/.test(block[i])) i++;
    if (i >= block.length) break;

    if (block[i] === "/" && block[i + 1] === "/") {
      while (i < block.length && block[i] !== "\n") i++;
      continue;
    }
    if (block[i] === "/" && block[i + 1] === "*") {
      while (i < block.length - 1 && !(block[i] === "*" && block[i + 1] === "/")) i++;
      i += 2;
      continue;
    }

    let key = "";
    if (block[i] === '"' || block[i] === "'") {
      const q = block[i++];
      while (i < block.length && block[i] !== q) {
        if (block[i] === "\\") i++;
        key += block[i++];
      }
      i++;
    } else if (/[A-Za-z_$]/.test(block[i])) {
      while (i < block.length && /[\w$]/.test(block[i])) {
        key += block[i++];
      }
    } else {
      i++;
      continue;
    }

    if (!key) { i++; continue; }

    while (i < block.length && /\s/.test(block[i])) i++;
    if (block[i] !== ":") { i++; continue; }
    i++;
    while (i < block.length && /\s/.test(block[i])) i++;

    let isFn = false;
    const remaining = block.slice(i);
    const arrowMatch = /^(?:\([^)]*\)|\w+)\s*=>\s*/.exec(remaining);
    if (arrowMatch) {
      isFn = true;
      i += arrowMatch[0].length;
      while (i < block.length && /\s/.test(block[i])) i++;
    }

    if (i >= block.length) break;
    const openChar = block[i];
    if (openChar !== "{" && openChar !== "[") {
      while (i < block.length && block[i] !== "," && block[i] !== "\n") i++;
      continue;
    }
    const closeChar = openChar === "{" ? "}" : "]";

    let depth = 1;
    const valStart = i + 1;
    i++;

    while (i < block.length && depth > 0) {
      const c = block[i];
      if (c === '"' || c === "'" || c === "`") {
        const q = c;
        if (q === "`") {
          i++;
          let tDepth = 0;
          while (i < block.length) {
            if (block[i] === "\\" && i + 1 < block.length) { i += 2; continue; }
            if (block[i] === "$" && block[i + 1] === "{") { tDepth++; i += 2; continue; }
            if (tDepth > 0 && block[i] === "}") { tDepth--; i++; continue; }
            if (tDepth === 0 && block[i] === "`") break;
            i++;
          }
        } else {
          i++;
          while (i < block.length) {
            if (block[i] === "\\" && i + 1 < block.length) { i += 2; continue; }
            if (block[i] === q) break;
            i++;
          }
        }
      } else if (c === openChar) {
        depth++;
      } else if (c === closeChar) {
        depth--;
        if (depth === 0) {
          entries.push({ key, block: block.slice(valStart, i), isFn });
          i++;
          break;
        }
      }
      i++;
    }
  }

  return entries;
}

// ─── Sprite map parser ────────────────────────────────────────────────────────

/**
 * Build a map of item name → relative sprite path (e.g. "sfts/beaver.gif",
 * "wearables/5.webp") by parsing SFL source files in sflDir.
 */
export function parseSpriteMap(sflDir: string): Map<string, string> {
  const spriteMap = new Map<string, string>();

  const readSfl = (relPath: string): string => {
    const full = path.join(sflDir, relPath);
    if (!fs.existsSync(full)) return "";
    return fs.readFileSync(full, "utf8");
  };

  // ── Collectibles: images.ts → ITEM_DETAILS ─────────────────────
  const imagesSource = readSfl("src/features/game/types/images.ts");
  if (imagesSource) {
    const importRe = /^import\s+(\w+)\s+from\s+["']assets\/sfts\/([^"']+)["']/gm;
    const varToFile = new Map<string, string>();
    let m: RegExpExecArray | null;
    while ((m = importRe.exec(imagesSource)) !== null) {
      varToFile.set(m[1], `sfts/${m[2]}`);
    }

    const itemDetailsBlock = extractNamedBlock(imagesSource, "ITEM_DETAILS");
    const entries = extractTopLevelEntries(itemDetailsBlock);

    for (const { key, block: entryBlock } of entries) {
      // Only match lowercase-starting variable names (excludes CROP_LIFECYCLE, SUNNYSIDE, etc.)
      const imageMatch = /\bimage:\s*([a-z]\w*)\b/.exec(entryBlock);
      if (imageMatch) {
        const filePath = varToFile.get(imageMatch[1]);
        if (filePath) spriteMap.set(key, filePath);
      }
    }
  }

  // ── Wearables: bumpkin.ts → ITEM_IDS ───────────────────────────
  const bumpkinSource = readSfl("src/features/game/types/bumpkin.ts");
  if (bumpkinSource) {
    const block = extractNamedBlock(bumpkinSource, "ITEM_IDS");
    const idRe = /["']([^"']+)["']\s*:\s*(\d+)/g;
    let m2: RegExpExecArray | null;
    while ((m2 = idRe.exec(block)) !== null) {
      spriteMap.set(m2[1], `wearables/${m2[2]}.webp`);
    }
  }

  return spriteMap;
}
