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
  // Word-boundary match: a plain indexOf would also hit `name` as a substring
  // of an earlier, unrelated identifier (e.g. "CROPS" inside "EXOTIC_CROPS"
  // or "GREENHOUSE_CROPS"), silently extracting the wrong block.
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const boundaryMatch = new RegExp(`(?<![\\w$])${escaped}(?![\\w$])`).exec(source);
  const nameIdx = boundaryMatch ? boundaryMatch.index : -1;
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
    if (c === "/" && i + 1 < source.length && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      i++;
      continue;
    }
    if (c === "/" && i + 1 < source.length && source[i + 1] === "*") {
      while (i < source.length - 1 && !(source[i] === "*" && source[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
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
    } else if (/[A-Za-z_$0-9]/.test(block[i])) {
      // Leading digit covers bare numeric keys (e.g. Bud/Pet NFT id registries:
      // `1: { ... }`), which are otherwise indistinguishable from identifiers here.
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

/**
 * Extract all top-level keys from an object block, regardless of the value's
 * shape (string, number, object, array, or a `...spread`). Unlike
 * extractTopLevelEntries, this doesn't skip primitive-valued entries (e.g.
 * `Record<Name, string>` maps), which just need their keys.
 */
export function extractTopLevelKeys(block: string): string[] {
  const keys: string[] = [];
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

    // Skip spread entries: ...foo,
    if (block[i] === "." && block[i + 1] === "." && block[i + 2] === ".") {
      i += 3;
      while (i < block.length && block[i] !== "," && block[i] !== "\n") i++;
      if (block[i] === ",") i++;
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
      while (i < block.length && /[\w$]/.test(block[i])) key += block[i++];
    } else {
      i++;
      continue;
    }

    if (!key) { i++; continue; }

    while (i < block.length && /\s/.test(block[i])) i++;
    if (block[i] !== ":") { i++; continue; }
    keys.push(key);
    i++;

    // Skip the value up to the next top-level comma, respecting nested
    // brackets/quotes so commas inside them don't end the entry early.
    let depth = 0;
    while (i < block.length) {
      const c = block[i];
      if (c === '"' || c === "'" || c === "`") {
        const q = c;
        i++;
        while (i < block.length) {
          if (block[i] === "\\" && i + 1 < block.length) { i += 2; continue; }
          if (block[i] === q) { i++; break; }
          i++;
        }
        continue;
      }
      if (c === "{" || c === "[" || c === "(") { depth++; i++; continue; }
      if (c === "}" || c === "]" || c === ")") {
        if (depth === 0) break;
        depth--; i++; continue;
      }
      if (c === "," && depth === 0) { i++; break; }
      i++;
    }
  }

  return keys;
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
    // Images live under many asset subfolders, not just sfts/ (fish/, food/,
    // decorations/, animals/, monuments/, etc.) — capture the whole
    // post-"assets/" path so every subfolder resolves, not only sfts/.
    const importRe = /^import\s+(\w+)\s+from\s+["']assets\/([^"']+)["']/gm;
    const varToFile = new Map<string, string>();
    let m: RegExpExecArray | null;
    while ((m = importRe.exec(imagesSource)) !== null) {
      varToFile.set(m[1], m[2]);
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
  // Only fills gaps — some names collide with an unrelated ITEM_DETAILS entry
  // (e.g. "Axe" is both a consumable tool, resolved above via its own image,
  // and a cosmetic wearable); the ITEM_DETAILS sprite is the more relevant one
  // when both exist, so don't clobber it.
  for (const [itemName, id] of parseWearableIds(sflDir)) {
    if (!spriteMap.has(itemName)) spriteMap.set(itemName, `wearables/${id}.webp`);
  }

  return spriteMap;
}

/**
 * Crop icon paths — the `.crop` (fully grown) stage of CROP_LIFECYCLE lives on
 * the game's asset CDN, generated at runtime from a name→slug map rather than
 * imported as a local file (features/island/plots/lib/plant.ts:
 * `${CONFIG.PROTECTED_IMAGE_URL}/crops/${IMAGES[name]}/crop.png`) — so it can't
 * be picked up by the local-import scan in parseSpriteMap. Returns crop name
 * -> CDN-relative path (e.g. "crops/sunflower/crop.png"), for callers that can
 * fetch over HTTP (see sync-skill-icons.ts's `cdn`-kind download).
 */
export function parseCropCdnMap(sflDir: string): Map<string, string> {
  const file = path.join(sflDir, "src/features/island/plots/lib/plant.ts");
  if (!fs.existsSync(file)) return new Map();
  const source = fs.readFileSync(file, "utf8");
  const block = extractNamedBlock(source, "export const IMAGES");
  const map = new Map<string, string>();
  const re = /(\w+):\s*"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) map.set(m[1], `crops/${m[2]}/crop.png`);
  return map;
}

/**
 * Items whose ITEM_DETAILS.image is itself a `SUNNYSIDE.category.key` CDN ref
 * (e.g. Axe -> SUNNYSIDE.tools.axe) rather than a locally-imported file —
 * `parseSpriteMap` skips these (its regex only matches lowercase local import
 * vars). Returns item name -> "category.key", for resolving against the same
 * category.key -> path map sync-skill-icons.ts already builds from
 * assets/sunnyside.ts for direct SUNNYSIDE.* skill image refs.
 */
export function parseItemDetailsCdnRefs(sflDir: string): Map<string, string> {
  const file = path.join(sflDir, "src/features/game/types/images.ts");
  if (!fs.existsSync(file)) return new Map();
  const source = fs.readFileSync(file, "utf8");
  const itemDetailsBlock = extractNamedBlock(source, "ITEM_DETAILS");
  const entries = extractTopLevelEntries(itemDetailsBlock);
  const map = new Map<string, string>();
  for (const { key, block: entryBlock } of entries) {
    const m = /\bimage:\s*SUNNYSIDE\??\.(\w+)\??\.(\w+)/.exec(entryBlock);
    if (m) map.set(key, `${m[1]}.${m[2]}`);
  }
  return map;
}

/**
 * Build a map of wearable name → numeric game ID by parsing ITEM_IDS in
 * src/features/game/types/bumpkin.ts. Wearables are a separate NFT
 * collection from collectibles/crops/resources (KNOWN_IDS in index.ts) with
 * their own, unrelated ID numbering — a wearable and an inventory item can
 * share a name (e.g. "Parsnip") while having completely different IDs.
 */
/**
 * Extract `key: 123` pairs from a block (quoted or bare keys). Quote-aware
 * via backreference so an apostrophe inside a quoted name (e.g.
 * "Luna's Crescent") doesn't truncate the match — a plain `[^"']+` class
 * would stop at the apostrophe and silently mis-key the entry.
 */
function parseKeyIdPairs(block: string): Map<string, number> {
  const result = new Map<string, number>();
  const idRe = /(?:(["'])((?:(?!\1)[\s\S])+?)\1|([A-Za-z_$][\w$]*))\s*:\s*(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = idRe.exec(block)) !== null) {
    const itemName = m[2] ?? m[3];
    result.set(itemName, parseInt(m[4], 10));
  }
  return result;
}

export function parseWearableIds(sflDir: string): Map<string, number> {
  const full = path.join(sflDir, "src/features/game/types/bumpkin.ts");
  if (!fs.existsSync(full)) return new Map();
  const source = fs.readFileSync(full, "utf8");

  const block = extractNamedBlock(source, "ITEM_IDS");
  return parseKeyIdPairs(block);
}

// ─── Game ID parser ───────────────────────────────────────────────────────────

/**
 * Build a map of item name → numeric game ID (as used in marketplace URLs like
 * .../marketplace/collectibles/{id}) by parsing KNOWN_IDS in
 * src/features/game/types/index.ts. Covers all InventoryItemName entries
 * (crops, resources, wearables-adjacent collectibles, etc.) — a superset of
 * the wearable-only ITEM_IDS in bumpkin.ts.
 */
export function parseGameIds(sflDir: string): Map<string, number> {
  const full = path.join(sflDir, "src/features/game/types/index.ts");
  if (!fs.existsSync(full)) return new Map();
  const source = fs.readFileSync(full, "utf8");

  const block = extractNamedBlock(source, "KNOWN_IDS");
  return parseKeyIdPairs(block);
}

// ─── Misc/junk item names ─────────────────────────────────────────────────────

/**
 * Extract every quoted string literal from a `export type <name> = ...;`
 * union declaration, up to the terminating top-level semicolon (bracket
 * depth-aware, so nested generics like `Extract<X, "a" | "b">` don't end
 * the scan early). Type references inside the union (e.g. `| ChapterTicket`)
 * are not string literals and are silently skipped — resolve those
 * separately by calling this again with their own type name.
 */
export function extractTypeUnionLiterals(source: string, typeName: string): string[] {
  const nameRe = new RegExp(`(?<![\\w$])type\\s+${typeName}(?![\\w$])`);
  const m = nameRe.exec(source);
  if (!m) return [];

  let i = m.index + m[0].length;
  while (i < source.length && source[i] !== "=") i++;
  i++;
  const start = i;

  let depth = 0;
  while (i < source.length) {
    const c = source[i];
    if (c === "<" || c === "(" || c === "{") depth++;
    else if (c === ">" || c === ")" || c === "}") depth--;
    else if (c === ";" && depth <= 0) break;
    i++;
  }

  const body = source.slice(start, i);
  const literals: string[] = [];
  const strRe = /["']([^"']+)["']/g;
  let sm: RegExpExecArray | null;
  while ((sm = strRe.exec(body)) !== null) literals.push(sm[1]);
  return literals;
}

/**
 * Names of tickets/tokens/war-points/seasonal-event currency and clutter —
 * real inventory items (they have a sprite + game_id) but not decorative
 * collectibles. Sourced dynamically (not hand-copied) because the game adds
 * new seasonal tickets/tokens every chapter/event, which would make a static
 * list go stale immediately.
 */
export function parseMiscItemNames(sflDir: string): Set<string> {
  const names = new Set<string>();

  const readSfl = (relPath: string): string => {
    const full = path.join(sflDir, relPath);
    if (!fs.existsSync(full)) return "";
    return fs.readFileSync(full, "utf8");
  };

  const unionSources: { file: string; type: string }[] = [
    { file: "src/features/game/types/game.ts", type: "Coupons" },
    { file: "src/features/game/types/game.ts", type: "Points" },
    { file: "src/features/game/types/game.ts", type: "WarItems" },
    { file: "src/features/game/types/chapters.ts", type: "ChapterTicket" },
    { file: "src/features/game/types/chapters.ts", type: "ChapterRaffleTicket" },
    { file: "src/features/game/types/garbage.ts", type: "GarbageName" },
  ];
  for (const { file, type } of unionSources) {
    const source = readSfl(file);
    if (!source) continue;
    for (const name of extractTypeUnionLiterals(source, type)) names.add(name);
  }

  const clutterSource = readSfl("src/features/game/types/clutter.ts");
  if (clutterSource) {
    for (const blockName of ["FARM_GARBAGE", "FARM_PEST"]) {
      const block = extractNamedBlock(clutterSource, blockName);
      for (const key of extractTopLevelKeys(block)) names.add(key);
    }
  }

  return names;
}
