/**
 * sync-skill-icons.ts
 * Copies bumpkin skill icon sprites from a sunflower-land clone into
 * goblincodex/public/sprites/, and prints a name -> public path mapping to
 * paste into src/lib/skills.ts (the `icon` field on each Skill).
 *
 * Icons in BUMPKIN_REVAMP_SKILL_TREE come from four different sources:
 *   - a locally-imported file (e.g. `import strongRoots from "assets/icons/skill_icons/strong_roots.png"`)
 *     -> copyable, same as regular resource sprites.
 *   - `ITEM_DETAILS.SomeItem.image` (reuses an existing item's icon)
 *     -> resolved via parseSpriteMap() (images.ts), also copyable.
 *   - `SUNNYSIDE.category.key` -> a path on the game's asset CDN
 *     (sunflower-land.com/game-assets/... — confirmed reachable directly,
 *     not actually gated despite the PROTECTED_IMAGE_URL env var name).
 *     Resolved by looking up `category.key: \`${...}/path\`` in
 *     assets/sunnyside.ts and downloading that path — same treatment as the
 *     local-import case, just fetched over HTTP instead of copied from disk.
 *   - no `image` field at all -> genuinely no icon in the game; left out of
 *     the mapping (site falls back to a per-tree emoji for these — see
 *     SKILL_TREE_EMOJI in ReferenceCatalog.tsx).
 *
 * Run from the repo root:
 *   npx tsx scripts/sync-skill-icons.ts [--sfl-dir ./_sfl_temp] [--target-dir ./public/sprites]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parseSpriteMap, parseCropCdnMap, parseItemDetailsCdnRefs } from "./lib/sprite-map";

// extractNamedBlock() (the shared helper) finds the first word-boundary
// occurrence of the name and scans forward for `= {` — that breaks here
// because BUMPKIN_REVAMP_SKILL_TREE is referenced (as a value, via a type
// cast) inside getSkillLevel() BEFORE its real `export const ... = {`
// declaration further down the file, so it latches onto the wrong `{`.
// Anchor on the exact declaration text instead, then split entries with a
// bounded regex (matches the same "  Name: {\n    name: " shape used
// throughout the object) rather than depth-counting from a bad start point.
function extractSkillEntries(source: string): { name: string; block: string }[] {
  const declLiteral = "export const BUMPKIN_REVAMP_SKILL_TREE = {";
  const start = source.indexOf(declLiteral);
  if (start === -1) throw new Error("BUMPKIN_REVAMP_SKILL_TREE declaration not found");
  const end = source.indexOf("} satisfies Record<string, BumpkinSkillRevamp>", start);
  if (end === -1) throw new Error("BUMPKIN_REVAMP_SKILL_TREE end marker not found");
  const body = source.slice(start, end);

  // Первое поле записи — обычно name, но бывает и tree (Alternate Medicine).
  const entryRe = /\n {2}(["a-zA-Z0-9'’\-.& ]+): \{\n {4}(?:name|tree): /g;
  const matches = [...body.matchAll(entryRe)];
  return matches.map((m, i) => {
    const name = m[1].replace(/^"|"$/g, "");
    const from = m.index!;
    const to = i + 1 < matches.length ? matches[i + 1].index! : body.length;
    return { name, block: body.slice(from, to) };
  });
}

function parseArgs(): { sflDir: string; targetDir: string } {
  const args = process.argv.slice(2);
  let sflDir = "";
  let targetDir = "";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--sfl-dir" && args[i + 1]) sflDir = args[++i];
    else if (args[i] === "--target-dir" && args[i + 1]) targetDir = args[++i];
  }
  return {
    sflDir: path.resolve(sflDir || "./_sfl_temp"),
    targetDir: path.resolve(targetDir || "./public/sprites"),
  };
}

type Resolved =
  | { kind: "local"; spritePath: string }
  | { kind: "item"; spritePath: string }
  | { kind: "cdn"; spritePath: string }
  | { kind: "cdn-unresolved" }
  | { kind: "none" };

const GAME_ASSETS_BASE = "https://sunflower-land.com/game-assets";

/**
 * Flat `category.key -> path` map from assets/sunnyside.ts, for resolving
 * `SUNNYSIDE.category.key` / `SUNNYSIDE?.category?.key` image refs. Tracks
 * the nearest enclosing top-level `categoryName: {` as it scans, then grabs
 * every `key: \`${CONFIG.PROTECTED_IMAGE_URL}/path\`` line under it —
 * category is intentionally the only nesting level tracked (sub-objects
 * under a category use flat keys like `chickenSick`, not another `.` hop).
 */
function parseSunnysideCdnMap(sflDir: string): Map<string, string> {
  const file = path.join(sflDir, "src/assets/sunnyside.ts");
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const map = new Map<string, string>();
  let category: string | null = null;
  let depth = 0;
  for (const line of lines) {
    const catM = /^ {2}(\w+): \{\s*$/.exec(line);
    if (catM) {
      category = catM[1];
      depth = 1;
      continue;
    }
    if (category) {
      depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
      if (depth <= 0) {
        category = null;
        continue;
      }
      const kvM = /^\s+(\w+): `\$\{CONFIG\.PROTECTED_IMAGE_URL\}\/([^`]+)`,?\s*$/.exec(line);
      if (kvM) map.set(`${category}.${kvM[1]}`, kvM[2]);
    }
  }
  return map;
}

async function downloadToFile(url: string, destFile: string): Promise<boolean> {
  const res = await fetch(url);
  if (!res.ok) return false;
  fs.mkdirSync(path.dirname(destFile), { recursive: true });
  fs.writeFileSync(destFile, Buffer.from(await res.arrayBuffer()));
  return true;
}

async function main() {
  const { sflDir, targetDir } = parseArgs();
  const bumpkinSkillsPath = path.join(sflDir, "src/features/game/types/bumpkinSkills.ts");
  const source = fs.readFileSync(bumpkinSkillsPath, "utf8");

  // Local `import fooBar from "assets/some/path.png"` -> varName -> "some/path.png"
  const importRe = /^import\s+(\w+)\s+from\s+["']assets\/([^"']+)["'];/gm;
  const localImports = new Map<string, string>();
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(source))) localImports.set(m[1], m[2]);

  const itemSpriteMap = parseSpriteMap(sflDir);
  const cropCdnMap = parseCropCdnMap(sflDir);
  const itemCdnRefs = parseItemDetailsCdnRefs(sflDir);
  const cdnMap = parseSunnysideCdnMap(sflDir);

  const entries = extractSkillEntries(source);

  const resolved = new Map<string, Resolved>();
  /** Разбор одного выражения картинки из исходников игры: SUNNYSIDE.*, ITEM_DETAILS[...].image или локальный импорт. */
  const resolveExpr = (val: string): Resolved => {
    if (val.startsWith("SUNNYSIDE")) {
      const refM = /SUNNYSIDE\??\.(\w+)\??\.(\w+)/.exec(val);
      const cdnKey = refM ? `${refM[1]}.${refM[2]}` : undefined;
      const spritePath = cdnKey ? cdnMap.get(cdnKey) : undefined;
      return spritePath ? { kind: "cdn", spritePath } : { kind: "cdn-unresolved" };
    }
    if (val.startsWith("ITEM_DETAILS")) {
      // Two distinct call shapes in the source: dot notation (`ITEM_DETAILS.Sunflower.image`,
      // used whenever the item name is a valid bare identifier) and bracket notation
      // (`ITEM_DETAILS["Basic Scarecrow"].image`, used when the name has spaces/punctuation).
      // A single regex silently matched only the bracket form for a long time — dot-notation
      // refs (crops, tools, buildings, fish...) always fell through to "none" (emoji).
      const nameM =
        /ITEM_DETAILS\.(\w+)\.image/.exec(val) ??
        /ITEM_DETAILS\[["']?([^\]"']+)["']?\]\.image/.exec(val);
      const itemName = nameM?.[1];
      // Try the two CDN-only escape hatches FIRST — a crop's grown-stage art
      // (CROP_LIFECYCLE, generated at runtime, no local import to find), or a
      // bare SUNNYSIDE.category.key ref (never imported as a file at all).
      // Both are read directly off THIS item's own ITEM_DETAILS.image
      // expression, so they can't be wrong. itemSpriteMap, checked after, is a
      // broader name -> sprite lookup that also covers wearables by name —
      // for an item name that collides with an unrelated wearable (e.g. the
      // "Axe" tool vs. the cosmetic "Axe" wearable) it would silently return
      // the wrong picture if checked first.
      const cropSpritePath = itemName ? cropCdnMap.get(itemName) : undefined;
      if (cropSpritePath) return { kind: "cdn", spritePath: cropSpritePath };
      const cdnKey = itemName ? itemCdnRefs.get(itemName) : undefined;
      const itemCdnSpritePath = cdnKey ? cdnMap.get(cdnKey) : undefined;
      if (itemCdnSpritePath) return { kind: "cdn", spritePath: itemCdnSpritePath };
      const localSpritePath = itemName ? itemSpriteMap.get(itemName) : undefined;
      return localSpritePath ? { kind: "item", spritePath: localSpritePath } : { kind: "none" };
    }
    const spritePath = localImports.get(val);
    return spritePath ? { kind: "local", spritePath } : { kind: "none" };
  };

  // Иконка ветки — как SKILL_TREE_ICONS в игре (SkillCategoryList.tsx).
  const TREE_ICON_EXPR: Record<string, string> = {
    Crops: "SUNNYSIDE.skills.crops",
    Trees: "SUNNYSIDE.skills.trees",
    Cooking: "SUNNYSIDE.skills.cooking",
    Animals: "SUNNYSIDE.animals.chickenIdle",
    Fishing: "SUNNYSIDE.icons.fish",
    Greenhouse: "ITEM_DETAILS.Greenhouse.image",
    Mining: "SUNNYSIDE.tools.stone_pickaxe",
    "Bees & Flowers": 'ITEM_DETAILS["Red Pansy"].image',
    Machinery: 'ITEM_DETAILS["Crop Machine"].image',
    Compost: 'ITEM_DETAILS["Premium Composter"].image',
    Aging: 'ITEM_DETAILS["Salt"].image',
    Cave: "ITEM_DETAILS.Cave.image",
  };
  const isFound = (r: Resolved) => r.kind === "local" || r.kind === "item" || r.kind === "cdn";

  // Как getSkillImage в игре (SkillPathDetails.tsx): своя картинка навыка, иначе
  // иконка предмета, на который он даёт буст (boostedItemIcon), иначе иконка ветки.
  const fallbackFrom = new Map<string, "boosted" | "tree">();
  for (const { name: key, block: entryBlock } of entries) {
    const imgM = /(?:^|\n)\s*image:\s*([^,\n]+),?/.exec(entryBlock);
    let r: Resolved = imgM ? resolveExpr(imgM[1].trim()) : { kind: "none" };
    if (!isFound(r)) {
      const boostedM = /boostedItemIcon:\s*([^,\n]+),?/.exec(entryBlock);
      const viaBoost = boostedM ? resolveExpr(boostedM[1].trim()) : { kind: "none" as const };
      if (isFound(viaBoost)) {
        r = viaBoost;
        fallbackFrom.set(key, "boosted");
      } else {
        const tree = /\n\s*tree:\s*"([^"]+)"/.exec(entryBlock)?.[1];
        // "Fruit Patch" в игре — локальный assets/fruit/fruits.png, остальные — выражения выше.
        const treeExpr = tree ? TREE_ICON_EXPR[tree] : undefined;
        const viaTree: Resolved =
          tree === "Fruit Patch" ? { kind: "item", spritePath: "fruit/fruits.png" } : treeExpr ? resolveExpr(treeExpr) : { kind: "none" };
        if (isFound(viaTree)) {
          r = viaTree;
          fallbackFrom.set(key, "tree");
        }
      }
    }
    resolved.set(key, r);
  }

  let copied = 0;
  let downloaded = 0;
  let upToDate = 0;
  const missing: string[] = [];
  const failed: string[] = [];
  const mapping: Record<string, string> = {};

  for (const [name, r] of resolved) {
    if (r.kind === "local" || r.kind === "item") {
      const srcFile = path.join(sflDir, "src", "assets", r.spritePath);
      if (!fs.existsSync(srcFile)) {
        missing.push(`${name} -> ${r.spritePath}`);
        continue;
      }

      const destFile = path.join(targetDir, r.spritePath);
      fs.mkdirSync(path.dirname(destFile), { recursive: true });

      let shouldCopy = true;
      if (fs.existsSync(destFile)) {
        shouldCopy = fs.statSync(srcFile).mtimeMs > fs.statSync(destFile).mtimeMs;
      }
      if (shouldCopy) {
        fs.copyFileSync(srcFile, destFile);
        copied++;
      } else {
        upToDate++;
      }

      mapping[name] = `/sprites/${r.spritePath.replace(/\\/g, "/")}`;
      continue;
    }

    if (r.kind === "cdn") {
      const destFile = path.join(targetDir, r.spritePath);
      if (fs.existsSync(destFile)) {
        upToDate++;
      } else {
        const ok = await downloadToFile(`${GAME_ASSETS_BASE}/${r.spritePath}`, destFile);
        if (!ok) {
          failed.push(`${name} -> ${r.spritePath}`);
          continue;
        }
        downloaded++;
      }
      mapping[name] = `/sprites/${r.spritePath.replace(/\\/g, "/")}`;
    }
  }

  console.log(`Copied: ${copied}, downloaded from CDN: ${downloaded}, up to date: ${upToDate}, missing: ${missing.length}, failed downloads: ${failed.length}`);
  if (missing.length) console.log("Missing:\n" + missing.map((s) => `  - ${s}`).join("\n"));
  if (failed.length) console.log("Failed downloads:\n" + failed.map((s) => `  - ${s}`).join("\n"));

  const cdnUnresolved = [...resolved.entries()].filter(([, r]) => r.kind === "cdn-unresolved").map(([n]) => n);
  const none = [...resolved.entries()].filter(([, r]) => r.kind === "none").map(([n]) => n);
  console.log(`\nCDN ref found but not in sunnyside.ts's own map (${cdnUnresolved.length}):`, cdnUnresolved.join(", "));
  console.log(`\nNo picture resolved at all (${none.length}):`, none.join(", "));
  const viaBoosted = [...fallbackFrom].filter(([, v]) => v === "boosted").map(([n]) => n);
  const viaTree = [...fallbackFrom].filter(([, v]) => v === "tree").map(([n]) => n);
  console.log(`\nNo own image — boosted item icon (${viaBoosted.length}):`, viaBoosted.join(", "));
  console.log(`\nNo own image — skill tree icon (${viaTree.length}):`, viaTree.join(", "));

  const outFile = path.resolve("scripts/skill-icon-map.json");
  fs.writeFileSync(outFile, JSON.stringify(mapping, null, 2));
  console.log(`\nWrote ${Object.keys(mapping).length} icon paths to ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
