/**
 * populate-buffs-db.ts
 * Extracts skill/wearable/collectible buff data from SFL source files
 * and inserts it into PostgreSQL.
 *
 * Run from the repo root:
 *   DATABASE_URL="postgresql://..." npm run sfl:populate
 *   # or with custom sfl-dir:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/populate-buffs-db.ts --sfl-dir ./_sfl_temp
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { Pool } from "pg";
import { extractNamedBlock, extractTopLevelEntries, extractTopLevelKeys, parseSpriteMap, parseGameIds, parseWearableIds, parseMiscItemNames } from "./lib/sprite-map";
import { classifyResource } from "./lib/resource-classifier";
import { getItemTags } from "./lib/item-tags";

// ─── CLI args ─────────────────────────────────────────────────────────────────

function parseSflDir(): string {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--sfl-dir" && args[i + 1]) return path.resolve(args[i + 1]);
  }
  return path.resolve("./_sfl_temp");
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SFL_DIR = parseSflDir();
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is required.");
  process.exit(1);
}

// Known-good share of numeric-looking buffs that legitimately resolve to NULL:
// skills using inline arithmetic and wearable sets (faction armor etc.) that
// have no boostsUsed.push() in any event file. Established 2026-07-01 after
// expanding BOOST_SOURCE_FILES to cover all discoverable push() call sites.
// Update this constant whenever intentional parser coverage improves (i.e.
// the null share drops durably — not just a one-off manual fix).
const SELF_CHECK_NULL_BASELINE = 0.25;

// Alert if null share grows more than this many percentage points above the
// baseline.  10 pp leaves room for a few new inline-arith items appearing in
// SFL while still catching real regressions (e.g. an incomplete sparse-checkout
// that causes the share to spike to 50–80 %).
const SELF_CHECK_NULL_REGRESSION_MARGIN = 0.1;

/** Heuristic: does this buff text look like it should carry a numeric_value? */
function looksNumeric(text: string): boolean {
  // Fast exit: no digit, %, ASCII x-multiplier, or Unicode × present at all.
  if (!/\d|%|x\d|\dx|×/i.test(text)) return false;
  const t = text.trim();
  // "N% chance" / "N/M chance" are probability descriptions, not parseable boost values.
  if (/^\d+[%/]\d*\s*chance\b/i.test(t)) return false;
  // Bare leading digit without a sign/multiplier prefix is a mechanic label, not a value.
  // ("1 Tap Trees", "1 tap small mineral nodes") — "2x feathers" / "2× output" are kept.
  if (/^\d+\s+\w/i.test(t) && !/^\d+[%x×]/i.test(t)) return false;
  // "+/-N [one or more words] from [source]" is a yield-source description, not a pure boost value.
  // Covers "+1 wood from branches", "+10 cow xp from affection tools", "+1 Bait yield from rack".
  // Note: "+50% Coins from Bounties" is NOT caught because % sits between digit and space.
  if (/^[+\-]\d+(?:\.\d+)?(?:\s+\w+)+\s+from\b/i.test(t)) return false;
  // "requires N resource" is a recipe description, not a boost value.
  if (/\brequires?\b/i.test(t) && !/^[+\-x×]/i.test(t)) return false;
  // Narrative / prose lead-ins with embedded incidental numbers.
  if (/^(During|While|Grants?|Speed\s+up)\b/i.test(t)) return false;
  return true;
}

interface RunSummary {
  itemsUpserted: number;
  buffsUpserted: number;
  itemsSwept: number;
  buffsSwept: number;
  numericLookingTotal: number;
  numericLookingNullCount: number;
  nullNumericShare: number;
  nullNumericBaseline: number;
}

const BOOST_SOURCE_FILES = [
  "src/features/game/expansion/lib/boosts.ts",
  "src/features/game/events/landExpansion/harvest.ts",
  "src/features/game/events/landExpansion/plant.ts",
  "src/features/game/events/landExpansion/chop.ts",
  "src/features/game/events/landExpansion/fruitHarvested.ts",
  "src/features/game/events/landExpansion/fruitPlanted.ts",
  "src/features/game/events/landExpansion/ironMine.ts",
  "src/features/game/events/landExpansion/mineGold.ts",
  "src/features/game/events/landExpansion/stoneMine.ts",
  "src/features/game/events/landExpansion/deliver.ts",
  "src/features/game/events/landExpansion/harvestGreenHouse.ts",
  "src/features/game/events/landExpansion/plantGreenhouse.ts",
  "src/features/game/events/landExpansion/drillOilReserve.ts",
  "src/features/game/events/landExpansion/mineCrimstone.ts",
  "src/features/game/lib/animals.ts",
  "src/features/game/events/landExpansion/harvestBeehive.ts",
  "src/features/game/events/landExpansion/harvestFlower.ts",
  "src/features/game/events/landExpansion/startComposter.ts",
  "src/features/game/events/landExpansion/seedBought.ts",
  "src/features/game/events/landExpansion/castRod.ts",
  "src/features/game/events/landExpansion/startCrafting.ts",
  "src/features/game/types/fishing.ts",
  "src/features/game/types/salt.ts",
  "src/features/game/events/landExpansion/feedAnimal.ts",
  "src/features/game/events/landExpansion/collectRecipe.ts",
  // Additional event files discovered to contain boostsUsed.push({ name, value }) calls
  "src/features/game/events/landExpansion/plantFlower.ts",
  "src/features/game/events/landExpansion/treasureSold.ts",
  "src/features/game/events/landExpansion/buyAnimal.ts",
  "src/features/game/lib/updateBeehives.ts",
  "src/features/game/events/landExpansion/composterBait.ts",
  "src/features/game/events/landExpansion/collectLavaPit.ts",
  "src/features/game/events/landExpansion/startLavaPit.ts",
  "src/features/game/events/landExpansion/fruitTreeRemoved.ts",
  "src/features/game/events/landExpansion/fertiliseFruitPatch.ts",
  "src/features/game/events/landExpansion/placeWaterTrap.ts",
  "src/features/game/events/landExpansion/collectProcessedResource.ts",
  "src/features/game/events/landExpansion/processResource.ts",
  "src/features/game/events/landExpansion/expandLand.ts",
  "src/features/game/events/landExpansion/supplyCropMachine.ts",
  "src/features/game/events/landExpansion/feedFactionPet.ts",
];

// ─── Types ────────────────────────────────────────────────────────────────────

type BoostType = "speed" | "xp" | "yield" | "misc";

interface BuffEntry {
  text: string;
  textRu: string;
  labelType: string;
  boostType: BoostType;
  isDebuff: boolean;
}

interface SkillItem {
  name: string;
  type: "skill";
  tree: string;
  tier: number;
  island: string;
  buffs: BuffEntry[];
}

interface WearableItem {
  name: string;
  type: "wearable";
  buffs: BuffEntry[];
}

interface CollectibleItem {
  name: string;
  type: "collectible";
  requiresGameState: boolean;
  buffs: BuffEntry[];
}

/**
 * Crops/seeds/resources/flowers/fruits/fish carry no boosts and therefore
 * never appear in skills/wearables/collectibles — they exist purely so their
 * game_id (marketplace numeric ID) is captured in sfl_items.
 */
interface ProduceItem {
  name: string;
  type: "crop" | "seed" | "resource" | "flower" | "fruit" | "fish";
  buffs: [];
}

type AnyItem = SkillItem | WearableItem | CollectibleItem | ProduceItem;

// ─── Buds / Pets: dedicated tables (not sfl_items/sfl_buffs) ─────────────────
//
// Buds, NFT pets, and common pets are three separate domains, each with its
// own table — unlike skills/wearables/collectibles they don't share an
// identity space with marketplace items. Each Bud/Pet trait only ever grants
// exactly one buff (see budBuffs.ts/getPetBuffs.ts — a single buffs.push()
// per `if` branch), so the buff is flattened directly onto the trait row
// instead of living in a separate buffs table.

/** One row per Bud trait *value* (e.g. "Diamond Gem", "Rare") and its buff. */
interface BudTraitRow {
  name: string;
  traitGroup: "type" | "stem" | "aura";
  descriptionEn: string;
  descriptionRu: string;
  labelType: string;
  boostType: BoostType;
  isDebuff: boolean;
}

/** One row per minted Bud (lib/buds/buds.ts) — its actual rolled traits + CDN image. */
interface BudInstanceRow {
  budId: number;
  type: string;
  colour: string;
  stem: string;
  aura: string;
  ears: string;
}

/** NFT pet breed catalog entry (Ram, Dragon, ...). No source flavor text exists yet — fill via update-item-by-id.ts. */
interface PetNftBreedRow {
  name: string;
}

/** One row per NFT pet trait *value* (aura/bib) and its buff. */
interface PetNftTraitRow {
  name: string;
  traitGroup: "aura" | "bib";
  descriptionEn: string;
  descriptionRu: string;
  labelType: string;
  boostType: BoostType;
  isDebuff: boolean;
}

/** One row per minted Pet NFT (features/pets/data/pets-nfts.ts) — its actual rolled traits + CDN image. */
interface PetNftInstanceRow {
  petId: number;
  type: string;
  fur: string;
  accessory: string;
  bib: string;
  aura: string;
}

/** Common (non-NFT) pet catalog entry: name → breed ("Barkley" → "Dog"). No source flavor text exists yet. */
interface PetCommonRow {
  name: string;
  breed: string;
}

interface PetResourceRow {
  resourceName: string;
  energyYield: number | null;
}

interface PetFetchRow {
  petType: string;
  isNft: boolean;
  resourceName: string;
  unlockLevel: number;
}

interface NumericValue {
  itemName: string;
  rawValue: string;
  numericValue: number;
  valueType: "multiplier" | "divisor" | "flat_add" | "flat_sub" | "percent";
  sourceFile: string;
  confidence: "high" | "low";
}

// ─── State ────────────────────────────────────────────────────────────────────

const unresolvedKeys: string[] = [];

// ─── Utilities ───────────────────────────────────────────────────────────────

function readFile(relPath: string): string {
  const full = path.join(SFL_DIR, relPath);
  if (!fs.existsSync(full)) return "";
  return fs.readFileSync(full, "utf8");
}

function buildTranslationMap(): Map<string, string> {
  const dictPath = path.join(
    SFL_DIR,
    "src/lib/i18n/dictionaries/dictionary.json",
  );
  const raw = JSON.parse(fs.readFileSync(dictPath, "utf8")) as Record<
    string,
    string
  >;
  return new Map(Object.entries(raw));
}

/** ru.json sits alongside dictionary.json; entries missing from it fall back to the English map. */
function buildRuTranslationMap(enDict: Map<string, string>): Map<string, string> {
  const ruPath = path.join(SFL_DIR, "src/lib/i18n/dictionaries/ru.json");
  const raw = JSON.parse(fs.readFileSync(ruPath, "utf8")) as Record<
    string,
    string
  >;
  const map = new Map(enDict);
  for (const [key, value] of Object.entries(raw)) map.set(key, value);
  return map;
}

function resolveKey(key: string, dict: Map<string, string>): string {
  const v = dict.get(key);
  if (!v) {
    if (!unresolvedKeys.includes(key)) unresolvedKeys.push(key);
    return key;
  }
  return v;
}

/** Infer boost_type from boostTypeIcon expression */
function inferBoostType(iconExpr: string | null | undefined): BoostType {
  if (!iconExpr) return "misc";
  const s = iconExpr.toLowerCase().trim();
  if (s.includes("stopwatch")) return "speed";
  if (s === "xpicon" || (s.includes("xp") && !s.includes("express"))) return "xp";
  if (s === "powerup" || s.includes("level_up") || s.includes("powerup")) return "yield";
  if (s.includes("crop_lifecycle") || s.includes("crop.image")) return "yield";
  return "misc";
}

/**
 * Extract BuffEntry[] from a block of source text.
 * Handles ternary translate("skill") ? ... : translate("default") by preferring
 * the false-branch (non-skill) text.
 */
function extractBuffLabels(
  block: string,
  dict: Map<string, string>,
  ruDict: Map<string, string>,
  forceDebuff = false,
): BuffEntry[] {
  const buffs: BuffEntry[] = [];

  // Normalise ternary: remove the ? branch, keep the : branch
  // Pattern: condition ? translate("...") : translate("...")
  const cleanBlock = block
    .replace(/\?\s*translate\(["'][^"']+["']\)\s*\n?\s*:/g, ":")
    // Also handle multi-line ternary with newlines
    .replace(
      /bumpkin\.skills\[["'][^"']+["']\]\s*\n\s*\?\s*translate\(["'][^"']+["']\)\s*\n\s*:/g,
      ":",
    )
    // chapter-based ternary
    .replace(/getCurrentChapter\([^)]*\)[^?]*\?\s*translate\(["'][^"']+["']\)\s*:/g, ":");

  // Scan for BuffLabel objects: find { shortDescription: ..., labelType: ..., boostTypeIcon?: ... }
  // We interleave translate() calls, labelType values, and icon expressions in document order.
  type Event =
    | { kind: "text"; val: string; valRu: string; pos: number }
    | { kind: "label"; val: string; pos: number }
    | { kind: "icon"; val: string; pos: number };

  const events: Event[] = [];

  // translate("key") → text. Tolerates the multi-line form prettier produces
  // for long keys: translate(\n  "key",\n) — a strict single-line pattern
  // silently drops these calls (no text ever gets flushed for that buff).
  const translateRe = /translate\(\s*["']([^"']+)["']\s*,?\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = translateRe.exec(cleanBlock)) !== null) {
    events.push({
      kind: "text",
      val: resolveKey(m[1], dict),
      valRu: resolveKey(m[1], ruDict),
      pos: m.index,
    });
  }

  // labelType: "value"
  const labelRe = /labelType:\s*["']([^"']+)["']/g;
  while ((m = labelRe.exec(cleanBlock)) !== null) {
    events.push({ kind: "label", val: m[1], pos: m.index });
  }

  // boostTypeIcon: expression (up to comma/newline/})
  const iconRe = /boostTypeIcon:\s*([^,\n}]+)/g;
  while ((m = iconRe.exec(cleanBlock)) !== null) {
    events.push({ kind: "icon", val: m[1].trim(), pos: m.index });
  }

  events.sort((a, b) => a.pos - b.pos);

  let currentText: string | null = null;
  let currentTextRu: string | null = null;
  let currentLabel = "success";
  let currentIcon: string | null = null;

  const flush = () => {
    if (currentText !== null) {
      buffs.push({
        text: currentText,
        textRu: currentTextRu ?? currentText,
        labelType: currentLabel,
        boostType: inferBoostType(currentIcon),
        isDebuff: forceDebuff || currentLabel === "danger",
      });
    }
    currentLabel = "success";
    currentIcon = null;
  };

  for (const ev of events) {
    if (ev.kind === "text") {
      flush();
      currentText = ev.val;
      currentTextRu = ev.valRu;
    } else if (ev.kind === "label") {
      currentLabel = ev.val;
    } else {
      currentIcon = ev.val;
    }
  }
  flush();

  return buffs;
}

// ─── Parser: BUMPKIN_REVAMP_SKILL_TREE ───────────────────────────────────────

function parseSkills(dict: Map<string, string>, ruDict: Map<string, string>): SkillItem[] {
  const source = readFile(
    "src/features/game/types/bumpkinSkills.ts",
  );
  const block = extractNamedBlock(source, "BUMPKIN_REVAMP_SKILL_TREE");
  const entries = extractTopLevelEntries(block);

  return entries.map(({ key, block: entryBlock }) => {
    const treeM = /tree:\s*["']([^"']+)["']/.exec(entryBlock);
    const tierM = /tier:\s*(\d+)/.exec(entryBlock);
    const islandM = /island:\s*["']([^"']+)["']/.exec(entryBlock);

    // Find buff block
    const buffBlockStart = entryBlock.indexOf("buff:");
    let buffs: BuffEntry[] = [];
    let debuffs: BuffEntry[] = [];

    if (buffBlockStart !== -1) {
      const buffInner = extractNamedBlock(
        "X=" + entryBlock.slice(buffBlockStart + 5),
        "X",
      );
      buffs = extractBuffLabels(buffInner, dict, ruDict, false);
    }

    // Find debuff block
    const debuffBlockStart = entryBlock.indexOf("debuff:");
    if (debuffBlockStart !== -1) {
      const debuffInner = extractNamedBlock(
        "X=" + entryBlock.slice(debuffBlockStart + 7),
        "X",
      );
      debuffs = extractBuffLabels(debuffInner, dict, ruDict, true);
    }

    return {
      name: key,
      type: "skill" as const,
      tree: treeM?.[1] ?? "Unknown",
      tier: tierM ? parseInt(tierM[1]) : 1,
      island: islandM?.[1] ?? "basic",
      buffs: [...buffs, ...debuffs],
    };
  });
}

// ─── Parser: BUMPKIN_ITEM_BUFF_LABELS + SPECIAL_ITEM_LABELS ──────────────────

function parseWearables(dict: Map<string, string>, ruDict: Map<string, string>): WearableItem[] {
  const source = readFile(
    "src/features/game/types/bumpkinItemBuffs.ts",
  );

  const items: WearableItem[] = [];

  for (const exportName of ["BUMPKIN_ITEM_BUFF_LABELS", "SPECIAL_ITEM_LABELS"]) {
    const block = extractNamedBlock(source, exportName);
    const entries = extractTopLevelEntries(block);

    for (const { key, block: entryBlock } of entries) {
      const buffs = extractBuffLabels(entryBlock, dict, ruDict, false);
      items.push({ name: key, type: "wearable", buffs });
    }
  }

  return items;
}

// ─── Parser: COLLECTIBLE_BUFF_LABELS ─────────────────────────────────────────

function parseCollectibles(dict: Map<string, string>, ruDict: Map<string, string>): CollectibleItem[] {
  const source = readFile(
    "src/features/game/types/collectibleItemBuffs.ts",
  );
  const block = extractNamedBlock(source, "COLLECTIBLE_BUFF_LABELS");
  const entries = extractTopLevelEntries(block);

  return entries.map(({ key, block: entryBlock, isFn }) => {
    const buffs = extractBuffLabels(entryBlock, dict, ruDict, false);
    return {
      name: key,
      type: "collectible" as const,
      requiresGameState: isFn,
      buffs,
    };
  });
}

// ─── Parser: Bud & Pet trait buffs ────────────────────────────────────────────

/**
 * extractNamedBlock() finds the first word-boundary occurrence of `name` and
 * then scans forward for the next `=`. That's fine when the export is the
 * only mention of `name` in the file, but pets.ts also *uses* PET_TYPES
 * (`name in PET_TYPES`) before it's declared, which would make the plain
 * search latch onto that usage and then walk forward to an unrelated `=`
 * (e.g. the next `export const ... =`). Anchoring on `const ${name}` first
 * guarantees we start scanning at the actual declaration.
 */
function extractConstBlock(source: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const declMatch = new RegExp(`\\bconst\\s+${escaped}\\b`).exec(source);
  if (!declMatch) return "";
  return extractNamedBlock(source.slice(declMatch.index), name);
}

/**
 * Bud/Pet trait buffs are written as `if (varName === "Trait Value") { buffs.push({...}) }`
 * inside per-trait-group helper functions (getStemBoost, getPetAuraBoost, etc).
 * `varToGroup` maps the local variable name checked in each `if` (e.g. "stem",
 * "aura", "bib") to the trait group it belongs to, so the same extractor
 * works for both budBuffs.ts and getPetBuffs.ts. Each trait only ever grants
 * one buff (a single buffs.push() per `if` branch) so the row IS the buff —
 * `extra` carries whatever identifying fields the caller's row shape needs
 * beyond name/traitGroup/description/labelType/boostType/isDebuff.
 */
function parseTraitBuffs<TGroup extends string, TRow>(
  source: string,
  varToGroup: Record<string, TGroup>,
  dict: Map<string, string>,
  ruDict: Map<string, string>,
  buildRow: (base: {
    name: string;
    traitGroup: TGroup;
    descriptionEn: string;
    descriptionRu: string;
    labelType: string;
    boostType: BoostType;
    isDebuff: boolean;
  }) => TRow,
): TRow[] {
  const rows: TRow[] = [];
  const re = /if \((\w+) === ["']([^"']+)["']\) \{\n([\s\S]*?)\n  \}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const [, varName, traitValue, inner] = m;
    const traitGroup = varToGroup[varName];
    if (!traitGroup) continue;
    const buffs = extractBuffLabels(inner, dict, ruDict, false);
    const buff = buffs[0];
    if (!buff) continue;
    rows.push(
      buildRow({
        name: traitValue,
        traitGroup,
        descriptionEn: buff.text,
        descriptionRu: buff.textRu,
        labelType: buff.labelType,
        boostType: buff.boostType,
        isDebuff: buff.isDebuff,
      }),
    );
  }
  return rows;
}

function parseBuds(dict: Map<string, string>, ruDict: Map<string, string>): BudTraitRow[] {
  const source = readFile("src/features/game/types/budBuffs.ts");
  return parseTraitBuffs(
    source,
    { type: "type", stem: "stem", aura: "aura" } as const,
    dict,
    ruDict,
    (row) => row,
  );
}

function parsePetNftTraits(dict: Map<string, string>, ruDict: Map<string, string>): PetNftTraitRow[] {
  const source = readFile("src/features/game/types/getPetBuffs.ts");
  return parseTraitBuffs(
    source,
    { aura: "aura", bib: "bib" } as const,
    dict,
    ruDict,
    (row) => row,
  );
}

/** NFT pet breed catalog (Ram, Dragon, ...). */
function parsePetNftBreeds(): PetNftBreedRow[] {
  const source = readFile("src/features/game/types/pets.ts");
  const nftTypesBlock = extractConstBlock(source, "PET_NFT_TYPES");
  return Array.from(nftTypesBlock.matchAll(/["']([^"']+)["']/g)).map((m) => ({ name: m[1] }));
}

/** Common (non-NFT) pet name → breed ("Barkley" → "Dog"). */
// "Ramsey" is a leftover test pet — pets.ts marks it "Goat - Not used" and maps
// it to breed "Ram", which is actually an NFT breed name, not a common one
// (hence it never has a resource-fetch ladder). Excluded rather than shown broken.
const EXCLUDED_COMMON_PETS = new Set(["Ramsey"]);

function parsePetsCommon(): PetCommonRow[] {
  const source = readFile("src/features/game/types/pets.ts");
  const typesBlock = extractConstBlock(source, "PET_TYPES");
  return Array.from(typesBlock.matchAll(/(\w+):\s*["']([^"']+)["']/g))
    .filter((m) => !EXCLUDED_COMMON_PETS.has(m[1]))
    .map((m) => ({
      name: m[1],
      breed: m[2],
    }));
}

/** Energy each pet resource restores, from PET_RESOURCES. */
function parsePetResources(): PetResourceRow[] {
  const source = readFile("src/features/game/types/pets.ts");
  const block = extractConstBlock(source, "PET_RESOURCES");
  const entries = extractTopLevelEntries(block);

  return entries.map(({ key, block: entryBlock }) => {
    const energyM = /energy:\s*(\d+)/.exec(entryBlock);
    return { resourceName: key, energyYield: energyM ? parseInt(energyM[1], 10) : null };
  });
}

/**
 * Which resources a pet type fetches, and at what level — mirrors the
 * PET_FETCHES reduce() in pets.ts (Acorn @1, primary category resource @3,
 * secondary @7 if present, Moonfur @12 + tertiary @25 for NFT pets, Fossil
 * Shell @20). Update the level numbers below if that reduce() ever changes.
 */
function parsePetFetches(): PetFetchRow[] {
  const source = readFile("src/features/game/types/pets.ts");

  const nftTypesBlock = extractConstBlock(source, "PET_NFT_TYPES");
  const nftTypes = new Set(
    Array.from(nftTypesBlock.matchAll(/["']([^"']+)["']/g)).map((m) => m[1]),
  );

  const fetchesByCategory = new Map<string, string>();
  const fetchesBlock = extractConstBlock(source, "FETCHES_BY_CATEGORY");
  for (const m of fetchesBlock.matchAll(/(\w+):\s*["']([^"']+)["']/g)) {
    fetchesByCategory.set(m[1], m[2]);
  }

  const categoriesBlock = extractConstBlock(source, "PET_CATEGORIES");
  const rows: PetFetchRow[] = [];

  for (const { key: petType, block: entryBlock } of extractTopLevelEntries(categoriesBlock)) {
    const primary = /primary:\s*["']([^"']+)["']/.exec(entryBlock)?.[1];
    const secondary = /secondary:\s*["']([^"']+)["']/.exec(entryBlock)?.[1];
    const tertiary = /tertiary:\s*["']([^"']+)["']/.exec(entryBlock)?.[1];
    if (!primary) continue;

    const fetches: { resourceName: string; level: number }[] = [
      { resourceName: "Acorn", level: 1 },
      { resourceName: fetchesByCategory.get(primary)!, level: 3 },
      { resourceName: "Fossil Shell", level: 20 },
    ];
    if (secondary) fetches.push({ resourceName: fetchesByCategory.get(secondary)!, level: 7 });
    if (tertiary) {
      fetches.push({ resourceName: "Moonfur", level: 12 });
      fetches.push({ resourceName: fetchesByCategory.get(tertiary)!, level: 25 });
    }

    const isNft = nftTypes.has(petType);
    for (const f of fetches) {
      rows.push({ petType, isNft, resourceName: f.resourceName, unlockLevel: f.level });
    }
  }

  return rows;
}

/**
 * Every minted Bud's actual rolled traits (lib/buds/buds.ts —
 * `Record<number, Bud>`, ~5000 entries). Distinct from parseBuds(), which
 * only catalogues the buff each trait *value* grants. Buds are rendered
 * server-side into a static image per ID (lib/buds/types.ts getBudImage()),
 * not composited client-side from trait layers — so the image is just a URL.
 */
function parseBudInstances(): BudInstanceRow[] {
  const source = readFile("src/lib/buds/buds.ts");
  const block = extractConstBlock(source, "buds");
  const entries = extractTopLevelEntries(block);

  return entries.map(({ key, block: entryBlock }) => ({
    budId: parseInt(key, 10),
    type: /type:\s*["']([^"']+)["']/.exec(entryBlock)?.[1] ?? "",
    colour: /colour:\s*["']([^"']+)["']/.exec(entryBlock)?.[1] ?? "",
    stem: /stem:\s*["']([^"']+)["']/.exec(entryBlock)?.[1] ?? "",
    aura: /aura:\s*["']([^"']+)["']/.exec(entryBlock)?.[1] ?? "",
    ears: /ears:\s*["']([^"']+)["']/.exec(entryBlock)?.[1] ?? "",
  }));
}

/** Mirrors lib/buds/types.ts getBudImage(budId, "large") for the mainnet domain. */
function getBudImageUrl(budId: number): string {
  return `https://buds.sunflower-land.com/images/${budId}.webp`;
}

/**
 * Every minted Pet NFT's actual rolled traits (features/pets/data/pets-nfts.ts
 * — `Record<number, PetTraits>`, currently ~2000 of a max 3000 supply; grows
 * over time as reveals continue, so this needs re-running periodically. Like
 * Buds, these are server-rendered per ID, not composited client-side — see
 * features/island/pets/lib/petShared.ts getPetImageForMarketplace().
 */
function parsePetNftInstances(): PetNftInstanceRow[] {
  const source = readFile("src/features/pets/data/pets-nfts.ts");
  const block = extractConstBlock(source, "PETS_NFT_DATA");
  const entries = extractTopLevelEntries(block);

  return entries.map(({ key, block: entryBlock }) => ({
    petId: parseInt(key, 10),
    type: /type:\s*["']([^"']+)["']/.exec(entryBlock)?.[1] ?? "",
    fur: /fur:\s*["']([^"']+)["']/.exec(entryBlock)?.[1] ?? "",
    accessory: /accessory:\s*["']([^"']+)["']/.exec(entryBlock)?.[1] ?? "",
    bib: /bib:\s*["']([^"']+)["']/.exec(entryBlock)?.[1] ?? "",
    aura: /aura:\s*["']([^"']+)["']/.exec(entryBlock)?.[1] ?? "",
  }));
}

/**
 * Mirrors features/island/pets/lib/petShared.ts getPetImageForMarketplace()
 * for the mainnet domain — the marketplace/card variant reads best as a
 * single representative image. Other CDN variants exist per ID if ever
 * needed: /idles/, /sleepings/ (append "_animated" for the animated webp),
 * /sheets/ (Phaser spritesheet), /opensea/.
 */
function getPetNftImageUrl(petId: number): string {
  return `https://pets.sunflower-land.com/marketplace/${petId}_animated.webp`;
}

// ─── Parser: Crops/seeds/resources/flowers/fruits/fish (no buffs) ────────────

// Each entry names the SFL source file, the top-level Record block to read
// keys from, and the ProduceItem type those keys should be tagged with.
const PRODUCE_SOURCES: { file: string; block: string; type: ProduceItem["type"] }[] = [
  { file: "crops.ts", block: "CROPS", type: "crop" },
  { file: "crops.ts", block: "GREENHOUSE_CROPS", type: "crop" },
  { file: "crops.ts", block: "CROP_SEEDS", type: "seed" },
  { file: "crops.ts", block: "GREENHOUSE_SEEDS", type: "seed" },
  // seeds.ts SEEDS is a spread of the above seed blocks, not a literal object —
  // omitted here since its keys are already covered individually.
  { file: "resources.ts", block: "COMMODITIES", type: "resource" },
  { file: "resources.ts", block: "RESOURCES", type: "resource" },
  { file: "resources.ts", block: "ANIMAL_RESOURCES", type: "resource" },
  // flowers.ts FLOWERS is also a spread; use its underlying per-variety blocks.
  { file: "flowers.ts", block: "SUNPETAL_FLOWERS", type: "flower" },
  { file: "flowers.ts", block: "BLOOM_FLOWERS", type: "flower" },
  { file: "flowers.ts", block: "LILY_FLOWERS", type: "flower" },
  { file: "flowers.ts", block: "EDELWEISS_FLOWERS", type: "flower" },
  { file: "flowers.ts", block: "GLADIOLUS_FLOWERS", type: "flower" },
  { file: "flowers.ts", block: "LAVENDER_FLOWERS", type: "flower" },
  { file: "flowers.ts", block: "CLOVER_FLOWERS", type: "flower" },
  { file: "flowers.ts", block: "FLOWER_SEEDS", type: "seed" },
  { file: "fruits.ts", block: "PATCH_FRUIT", type: "fruit" },
  { file: "fruits.ts", block: "PATCH_FRUIT_SEEDS", type: "seed" },
  { file: "fruits.ts", block: "GREENHOUSE_FRUIT", type: "fruit" },
  { file: "fruits.ts", block: "GREENHOUSE_FRUIT_SEEDS", type: "seed" },
  { file: "fishing.ts", block: "FISH", type: "fish" },
  { file: "fishing.ts", block: "CHAPTER_FISH", type: "fish" },
  { file: "beans.ts", block: "EXOTIC_CROPS", type: "crop" },
];

/**
 * Names already covered by skills/wearables/collectibles are skipped — this
 * only fills in the produce that has a game_id but no buff row anywhere else.
 */
function parseProduceItems(gameIds: Map<string, number>, existingNames: Set<string>): ProduceItem[] {
  const items: ProduceItem[] = [];
  const seen = new Set<string>();

  for (const { file, block: blockName, type } of PRODUCE_SOURCES) {
    const source = readFile(`src/features/game/types/${file}`);
    if (!source) continue;

    const block = extractNamedBlock(source, blockName);
    const keys = extractTopLevelKeys(block);

    for (const key of keys) {
      if (existingNames.has(key) || seen.has(key)) continue;
      if (!gameIds.has(key)) continue;
      seen.add(key);
      items.push({ name: key, type, buffs: [] });
    }
  }

  return items;
}

/**
 * Purely decorative collectibles (e.g. "Pufferfish", "Fat Crab") carry no
 * buffs at all, so they never appear in COLLECTIBLE_BUFF_LABELS and are
 * invisible to parseCollectibles(). They do have an image (images.ts
 * ITEM_DETAILS) and a game_id (KNOWN_IDS) — anything left over there after
 * every other parser has run is one of these.
 */
function parseDecorCollectibles(gameIds: Map<string, number>, existingNames: Set<string>): CollectibleItem[] {
  const items: CollectibleItem[] = [];
  const seen = new Set<string>();

  const source = readFile("src/features/game/types/images.ts");
  const block = extractNamedBlock(source, "ITEM_DETAILS");
  const keys = extractTopLevelKeys(block);

  for (const key of keys) {
    if (existingNames.has(key) || seen.has(key)) continue;
    if (!gameIds.has(key)) continue;
    seen.add(key);
    items.push({ name: key, type: "collectible", requiresGameState: false, buffs: [] });
  }

  return items;
}

/**
 * Purely cosmetic wearables (hats, tops, pants, hair, backgrounds, etc.)
 * carry no buffs at all, so they never appear in BUMPKIN_ITEM_BUFF_LABELS /
 * SPECIAL_ITEM_LABELS and are invisible to parseWearables() — unlike
 * collectibles, there was no fallback pass for these at all, so ~426 of the
 * game's 558 wearable IDs (bumpkin.ts ITEM_IDS) were simply never synced.
 * Every ITEM_IDS name not already captured as a buffed wearable is one of
 * these; wearableIds already covers all of them (sprite too, via
 * parseSpriteMap's `wearables/${id}.webp` convention).
 */
function parseDecorWearables(wearableIds: Map<string, number>, existingNames: Set<string>): WearableItem[] {
  return [...wearableIds.keys()]
    .filter((name) => !existingNames.has(name))
    .map((name) => ({ name, type: "wearable" as const, buffs: [] }));
}

// ─── Parser: Numeric values from boostsUsed.push ─────────────────────────────

function parseNumericValues(): Map<string, NumericValue[]> {
  const result = new Map<string, NumericValue[]>();

  // name/value pair, quote-aware via backreference so an apostrophe inside a
  // double-quoted name (e.g. "Lumberjack's Extra") doesn't truncate the match.
  // Groups: name-first branch -> [1]=quote [2]=name [3]=quote [4]=value
  //         value-first branch -> [5]=quote [6]=value [7]=quote [8]=name
  const NAME_VALUE_PAIR =
    String.raw`(?:name:\s*(["'])((?:(?!\1)[\s\S])+?)\1[^}]*?value:\s*(["'])((?:(?!\3)[\s\S])+?)\3` +
    String.raw`|value:\s*(["'])((?:(?!\5)[\s\S])+?)\5[^}]*?name:\s*(["'])((?:(?!\7)[\s\S])+?)\7)`;

  // Pattern: boostsUsed.push({ name: "...", value: "..." })
  // (also accepts the "boostUsed" typo used in expansion/lib/boosts.ts)
  const PUSH_RE = new RegExp(
    String.raw`boosts?Used\.push\(\s*\{\s*${NAME_VALUE_PAIR}\s*\}\s*\)`,
    "gs",
  );
  // Pattern: boostsUsed: [{ name: "...", value: "..." }] (array-literal form, e.g. Money Tree)
  const PUSH_ARRAY_RE = new RegExp(
    String.raw`boosts?Used:\s*\[\s*\{\s*${NAME_VALUE_PAIR}\s*\}\s*\]`,
    "gs",
  );

  for (const relPath of BOOST_SOURCE_FILES) {
    const source = readFile(relPath);
    if (!source) continue;
    const fname = path.basename(relPath, ".ts");

    const matches = [
      ...source.matchAll(PUSH_RE),
      ...source.matchAll(PUSH_ARRAY_RE),
    ];
    for (const m of matches) {
      const name = (m[2] ?? m[8])?.trim();
      const raw = (m[4] ?? m[6])?.trim();
      if (!name || !raw) continue;

      // Skip template literal values like `+${...}`
      if (raw.includes("$")) continue;

      let numericValue: number;
      let valueType: NumericValue["valueType"];
      let confidence: "high" | "low" = "high";

      if (raw.startsWith("x") || raw.startsWith("X")) {
        numericValue = parseFloat(raw.slice(1));
        valueType = numericValue < 1 ? "divisor" : "multiplier";
      } else if (raw.startsWith("+")) {
        const stripped = raw.slice(1);
        if (stripped.endsWith("%")) {
          numericValue = parseFloat(stripped) / 100;
          valueType = "percent";
        } else {
          numericValue = parseFloat(stripped);
          valueType = "flat_add";
        }
      } else if (raw.startsWith("-")) {
        const stripped = raw.slice(1);
        if (stripped.endsWith("%")) {
          numericValue = parseFloat(stripped) / 100;
          valueType = "percent";
          confidence = "low"; // negative percent — context-dependent
        } else {
          numericValue = parseFloat(stripped);
          valueType = "flat_sub";
        }
      } else if (raw.endsWith("%")) {
        numericValue = parseFloat(raw) / 100;
        valueType = "percent";
        confidence = "low";
      } else {
        numericValue = parseFloat(raw);
        valueType = "flat_add";
        confidence = "low";
      }

      if (isNaN(numericValue)) continue;

      const entry: NumericValue = {
        itemName: name,
        rawValue: raw,
        numericValue,
        valueType,
        sourceFile: fname,
        confidence,
      };

      if (!result.has(name)) result.set(name, []);
      const existing = result.get(name)!;
      // Deduplicate by rawValue + sourceFile
      if (!existing.some((e) => e.rawValue === raw && e.sourceFile === fname)) {
        existing.push(entry);
      }
    }
  }

  return result;
}

// ─── Database ─────────────────────────────────────────────────────────────────

const SCHEMA_SQL = `
-- id (item name) alone is NOT unique: a wearable and an unrelated
-- crop/collectible/etc. can share the same display name while being
-- different NFT items in different game namespaces (e.g. "Parsnip" the
-- wearable vs. "Parsnip" the crop). The natural key is (id, type).
CREATE TABLE IF NOT EXISTS sfl_items (
  id                     TEXT NOT NULL,
  type                   TEXT NOT NULL,
  category               TEXT,
  requires_game_state    BOOLEAN DEFAULT FALSE,
  sprite                 TEXT,
  tags                   TEXT[] DEFAULT '{}',
  game_id                INTEGER,
  manually_edited_fields TEXT[] DEFAULT '{}',
  last_synced_at         TIMESTAMPTZ,
  is_active              BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (id, type)
);

CREATE TABLE IF NOT EXISTS sfl_buffs (
  id                     SERIAL PRIMARY KEY,
  item_id                TEXT,
  item_type              TEXT,
  label_type             TEXT,
  short_description      TEXT,
  short_description_ru   TEXT,
  boost_type             TEXT,
  is_debuff              BOOLEAN DEFAULT FALSE,
  numeric_value          REAL,
  value_type             TEXT,
  affected_stat          TEXT,
  numeric_confidence     TEXT,
  raw_value              TEXT,
  source_file            TEXT,
  manually_edited_fields TEXT[] DEFAULT '{}',
  last_synced_at         TIMESTAMPTZ,
  is_active              BOOLEAN DEFAULT TRUE,
  CONSTRAINT sfl_buffs_item_id_type_fkey FOREIGN KEY (item_id, item_type) REFERENCES sfl_items(id, type) ON DELETE CASCADE,
  CONSTRAINT sfl_buffs_item_id_type_short_description_key UNIQUE (item_id, item_type, short_description)
);

CREATE INDEX IF NOT EXISTS idx_sfl_buffs_affected_stat ON sfl_buffs(affected_stat);
CREATE INDEX IF NOT EXISTS idx_sfl_items_tags ON sfl_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_sfl_items_game_id ON sfl_items(game_id);
CREATE INDEX IF NOT EXISTS idx_sfl_items_is_active ON sfl_items(is_active);
CREATE INDEX IF NOT EXISTS idx_sfl_buffs_is_active ON sfl_buffs(is_active);

-- ─── Buds ───────────────────────────────────────────────────────────────────

-- Trait catalog: one row per trait *value* (e.g. "Diamond Gem" as a stem) and
-- the single buff it grants (budBuffs.ts never pushes more than one buff per
-- trait). sprite/description_en/description_ru are edited manually for now —
-- there's no per-trait icon or flavor text in the SFL source to derive them
-- from automatically.
CREATE TABLE IF NOT EXISTS sfl_buds (
  id                     TEXT NOT NULL,
  trait_group            TEXT NOT NULL, -- 'type' | 'stem' | 'aura'
  sprite                 TEXT,
  description_en         TEXT,
  description_ru         TEXT,
  label_type             TEXT,
  boost_type             TEXT,
  is_debuff              BOOLEAN DEFAULT FALSE,
  manually_edited_fields TEXT[] DEFAULT '{}',
  last_synced_at         TIMESTAMPTZ,
  is_active              BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (id, trait_group)
);

-- Registry of every minted Bud's actual rolled traits, plus its pre-rendered
-- marketplace image (SFL renders these server-side, not composited client-side
-- — see lib/buds/types.ts getBudImage()). Join (type|stem|aura) to sfl_buds.id
-- (matching trait_group) to resolve a specific Bud's buffs.
CREATE TABLE IF NOT EXISTS sfl_bud_instances (
  bud_id         INTEGER PRIMARY KEY,
  type           TEXT NOT NULL,
  colour         TEXT NOT NULL,
  stem           TEXT NOT NULL,
  aura           TEXT NOT NULL,
  ears           TEXT NOT NULL,
  image_url      TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ,
  is_active      BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_sfl_bud_instances_is_active ON sfl_bud_instances(is_active);

-- ─── NFT Pets ───────────────────────────────────────────────────────────────

-- Breed catalog (Ram, Dragon, Phoenix, ...). No flavor text/dedicated icon
-- exists in the SFL source — sprite defaults to the "blank-{breed}" NFT-card
-- background from assets/pets/backgrounds/; description_en/ru start NULL and
-- are filled manually via update-item-by-id.ts.
CREATE TABLE IF NOT EXISTS sfl_pets_nft (
  id                     TEXT PRIMARY KEY,
  sprite                 TEXT,
  description_en         TEXT,
  description_ru         TEXT,
  manually_edited_fields TEXT[] DEFAULT '{}',
  last_synced_at         TIMESTAMPTZ,
  is_active              BOOLEAN DEFAULT TRUE
);

-- Trait catalog for NFT pets: one row per aura/bib trait value and its buff
-- (getPetBuffs.ts never pushes more than one buff per trait, same as Buds).
CREATE TABLE IF NOT EXISTS sfl_pets_nft_traits (
  id                     TEXT NOT NULL,
  trait_group            TEXT NOT NULL, -- 'aura' | 'bib'
  sprite                 TEXT,
  description_en         TEXT,
  description_ru         TEXT,
  label_type             TEXT,
  boost_type             TEXT,
  is_debuff              BOOLEAN DEFAULT FALSE,
  manually_edited_fields TEXT[] DEFAULT '{}',
  last_synced_at         TIMESTAMPTZ,
  is_active              BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (id, trait_group)
);

-- Registry of every minted Pet NFT's actual rolled traits, plus its
-- pre-rendered marketplace image (also server-side rendered, not composited —
-- see features/island/pets/lib/petShared.ts getPetImage()/getPetImageForMarketplace()).
-- "type" is the breed — join to sfl_pets_nft.id and sfl_pet_fetches.pet_type
-- for its catalog entry and resource schedule; join (bib|aura) to
-- sfl_pets_nft_traits.id (matching trait_group) for buffs.
-- Grows over time as new NFTs are revealed (currently ~2000 of a 3000 cap) —
-- re-run sfl:populate periodically to pick up newly revealed pets.
CREATE TABLE IF NOT EXISTS sfl_pet_nft_instances (
  pet_id         INTEGER PRIMARY KEY,
  type           TEXT NOT NULL,
  fur            TEXT NOT NULL,
  accessory      TEXT NOT NULL,
  bib            TEXT NOT NULL,
  aura           TEXT NOT NULL,
  image_url      TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ,
  is_active      BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_sfl_pet_nft_instances_type ON sfl_pet_nft_instances(type);
CREATE INDEX IF NOT EXISTS idx_sfl_pet_nft_instances_is_active ON sfl_pet_nft_instances(is_active);

-- ─── Common (non-NFT) Pets ──────────────────────────────────────────────────

-- Name → breed catalog ("Barkley" → "Dog"). sprite resolves from the same
-- sprite map as sfl_items (ITEM_DETAILS images already cover pet names);
-- description_en/ru start NULL and are filled manually.
CREATE TABLE IF NOT EXISTS sfl_pets_common (
  id                     TEXT PRIMARY KEY,
  breed                  TEXT NOT NULL,
  sprite                 TEXT,
  description_en         TEXT,
  description_ru         TEXT,
  manually_edited_fields TEXT[] DEFAULT '{}',
  last_synced_at         TIMESTAMPTZ,
  is_active              BOOLEAN DEFAULT TRUE
);

-- ─── Shared Pet mechanics (span both NFT and common pets) ──────────────────

-- Energy a pet resource restores when fed to a pet (PET_RESOURCES in pets.ts).
CREATE TABLE IF NOT EXISTS sfl_pet_resources (
  resource_name TEXT PRIMARY KEY,
  energy_yield  INTEGER,
  last_synced_at TIMESTAMPTZ,
  is_active      BOOLEAN DEFAULT TRUE
);

-- Which resource a pet type (common breed OR NFT breed, see is_nft) fetches
-- at which level (derived from PET_CATEGORIES + FETCHES_BY_CATEGORY; see
-- parsePetFetches()). Kept as one shared table rather than split per domain
-- since it's the same mechanic/shape for both, just gated by is_nft.
CREATE TABLE IF NOT EXISTS sfl_pet_fetches (
  id             SERIAL PRIMARY KEY,
  pet_type       TEXT NOT NULL,
  is_nft         BOOLEAN DEFAULT FALSE,
  resource_name  TEXT NOT NULL REFERENCES sfl_pet_resources(resource_name),
  unlock_level   INTEGER NOT NULL,
  last_synced_at TIMESTAMPTZ,
  is_active      BOOLEAN DEFAULT TRUE,
  UNIQUE (pet_type, resource_name, unlock_level)
);

CREATE INDEX IF NOT EXISTS idx_sfl_pet_fetches_pet_type ON sfl_pet_fetches(pet_type);
CREATE INDEX IF NOT EXISTS idx_sfl_pet_fetches_is_active ON sfl_pet_fetches(is_active);
`;

// Columns a hand-edit (scripts/update-item-by-id.ts) is allowed to freeze
// against future automated overwrites. Keep in sync with that script's
// allowlists. `short_description` is deliberately excluded: it's part of
// sfl_buffs's natural key (item_id, short_description), so editing it would
// desync the row from what the parser re-derives next run, producing a
// duplicate insert instead of an update.
const ITEM_PROTECTABLE_FIELDS = ["category", "requires_game_state", "sprite", "tags", "is_active"];
const BUFF_PROTECTABLE_FIELDS = [
  "label_type", "short_description_ru", "boost_type", "is_debuff",
  "numeric_value", "value_type", "affected_stat", "numeric_confidence",
  "raw_value", "source_file",
];

async function populateDB(
  pool: Pool,
  items: AnyItem[],
  numericValues: Map<string, NumericValue[]>,
  spriteMap: Map<string, string>,
  gameIds: Map<string, number>,
  wearableIds: Map<string, number>,
  miscNames: Set<string>,
  petResources: PetResourceRow[],
  petFetches: PetFetchRow[],
  budTraits: BudTraitRow[],
  budInstances: BudInstanceRow[],
  petNftBreeds: PetNftBreedRow[],
  petNftTraits: PetNftTraitRow[],
  petNftInstances: PetNftInstanceRow[],
  petsCommon: PetCommonRow[],
): Promise<RunSummary> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Read the transaction's own frozen `now()` rather than capturing a
    // client-side `new Date()` before BEGIN: every `now()` call inside this
    // transaction (including each upsert's `last_synced_at = now()`) returns
    // the same transaction-start instant, not the actual statement time. A
    // client-side timestamp captured moments earlier can end up *later*
    // than that frozen instant depending on connection/clock timing, which
    // made the end-of-run sweep below (`last_synced_at < runStartTimestamp`)
    // catch every row just upserted in this same run, not just stale ones —
    // wiped is_active for the entire catalog in one run. Reading `now()`
    // from inside the transaction guarantees an exact, comparable value.
    const { rows: [{ now: runStartTimestamp }] } = await client.query<{ now: Date }>("SELECT now()");

    // Create schema (idempotent; never destroys existing rows)
    await client.query(SCHEMA_SQL);

    let itemsUpserted = 0;
    let buffsUpserted = 0;
    const lowConfidenceItems: string[] = [];
    let numericLookingNullCount = 0;
    let numericLookingTotal = 0;

    for (const item of items) {
      const category =
        item.type === "skill"
          ? (item as SkillItem).tree
          : null;

      const requiresGameState =
        item.type === "collectible"
          ? (item as CollectibleItem).requiresGameState
          : false;

      const sprite = spriteMap.get(item.name) ?? null;
      const tags = getItemTags(item.name, item.type);
      // Only fall back to the generic "misc" bucket when nothing more
      // specific already applies (e.g. WarItems in game.ts overlaps with
      // WarTentItem, which getItemTags() already tags "war-event" — no need
      // for both).
      if (miscNames.has(item.name) && tags.length === 0) tags.push("misc");
      // Skills aren't marketplace items and have no game_id of their own —
      // without this, a skill can accidentally pick up an unrelated item's ID
      // by name collision (e.g. skill "Green Thumb" vs. a same-named Bud).
      // Wearables are a separate NFT collection with their own ID numbering
      // (bumpkin.ts ITEM_IDS) — a wearable and an unrelated inventory item
      // can also share a name (e.g. "Parsnip") while pointing at different IDs.
      const gameId =
        item.type === "skill"
          ? null
          : item.type === "wearable"
            ? wearableIds.get(item.name) ?? null
            : gameIds.get(item.name) ?? null;

      await client.query(
        `INSERT INTO sfl_items (id, type, category, requires_game_state, sprite, tags, game_id, last_synced_at, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now(), TRUE)
         ON CONFLICT (id, type) DO UPDATE SET
           category = CASE WHEN 'category' = ANY(sfl_items.manually_edited_fields) THEN sfl_items.category ELSE EXCLUDED.category END,
           requires_game_state = CASE WHEN 'requires_game_state' = ANY(sfl_items.manually_edited_fields) THEN sfl_items.requires_game_state ELSE EXCLUDED.requires_game_state END,
           sprite = CASE WHEN 'sprite' = ANY(sfl_items.manually_edited_fields) THEN sfl_items.sprite ELSE EXCLUDED.sprite END,
           tags = CASE WHEN 'tags' = ANY(sfl_items.manually_edited_fields) THEN sfl_items.tags ELSE EXCLUDED.tags END,
           game_id = EXCLUDED.game_id,
           last_synced_at = now(),
           is_active = CASE WHEN 'is_active' = ANY(sfl_items.manually_edited_fields) THEN sfl_items.is_active ELSE TRUE END`,
        [item.name, item.type, category, requiresGameState, sprite, tags, gameId],
      );
      itemsUpserted++;

      const numericList = numericValues.get(item.name) ?? [];

      for (const buff of item.buffs) {
        // Match numeric value: prefer same-type (speed buff → multiplier/divisor)
        // For now, take the first numeric value for this item if available
        const nv = numericList[0] ?? null;

        if (nv?.confidence === "low") {
          if (!lowConfidenceItems.includes(item.name)) {
            lowConfidenceItems.push(item.name);
          }
        }

        const affectedStat = classifyResource(buff.text);
        if (looksNumeric(buff.text)) {
          numericLookingTotal++;
          if (nv?.numericValue == null) numericLookingNullCount++;
        }

        await client.query(
          `INSERT INTO sfl_buffs
             (item_id, item_type, label_type, short_description, short_description_ru, boost_type, is_debuff,
              numeric_value, value_type, affected_stat, numeric_confidence, raw_value, source_file,
              last_synced_at, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now(), TRUE)
           ON CONFLICT (item_id, item_type, short_description) DO UPDATE SET
             label_type = CASE WHEN 'label_type' = ANY(sfl_buffs.manually_edited_fields) THEN sfl_buffs.label_type ELSE EXCLUDED.label_type END,
             short_description_ru = CASE WHEN 'short_description_ru' = ANY(sfl_buffs.manually_edited_fields) THEN sfl_buffs.short_description_ru ELSE EXCLUDED.short_description_ru END,
             boost_type = CASE WHEN 'boost_type' = ANY(sfl_buffs.manually_edited_fields) THEN sfl_buffs.boost_type ELSE EXCLUDED.boost_type END,
             is_debuff = CASE WHEN 'is_debuff' = ANY(sfl_buffs.manually_edited_fields) THEN sfl_buffs.is_debuff ELSE EXCLUDED.is_debuff END,
             numeric_value = CASE WHEN 'numeric_value' = ANY(sfl_buffs.manually_edited_fields) THEN sfl_buffs.numeric_value ELSE EXCLUDED.numeric_value END,
             value_type = CASE WHEN 'value_type' = ANY(sfl_buffs.manually_edited_fields) THEN sfl_buffs.value_type ELSE EXCLUDED.value_type END,
             affected_stat = CASE WHEN 'affected_stat' = ANY(sfl_buffs.manually_edited_fields) THEN sfl_buffs.affected_stat ELSE EXCLUDED.affected_stat END,
             numeric_confidence = CASE WHEN 'numeric_confidence' = ANY(sfl_buffs.manually_edited_fields) THEN sfl_buffs.numeric_confidence ELSE EXCLUDED.numeric_confidence END,
             raw_value = CASE WHEN 'raw_value' = ANY(sfl_buffs.manually_edited_fields) THEN sfl_buffs.raw_value ELSE EXCLUDED.raw_value END,
             source_file = CASE WHEN 'source_file' = ANY(sfl_buffs.manually_edited_fields) THEN sfl_buffs.source_file ELSE EXCLUDED.source_file END,
             last_synced_at = now(),
             is_active = TRUE`,
          [
            item.name,
            item.type,
            buff.labelType,
            buff.text,
            buff.textRu,
            buff.boostType,
            buff.isDebuff,
            nv?.numericValue ?? null,
            nv?.valueType ?? null,
            affectedStat,
            nv?.confidence ?? null,
            nv?.rawValue ?? null,
            nv?.sourceFile ?? null,
          ],
        );
        buffsUpserted++;
      }
    }

    let petResourcesUpserted = 0;
    for (const resource of petResources) {
      await client.query(
        `INSERT INTO sfl_pet_resources (resource_name, energy_yield, last_synced_at, is_active)
         VALUES ($1, $2, now(), TRUE)
         ON CONFLICT (resource_name) DO UPDATE SET
           energy_yield = EXCLUDED.energy_yield,
           last_synced_at = now(),
           is_active = TRUE`,
        [resource.resourceName, resource.energyYield],
      );
      petResourcesUpserted++;
    }

    let petFetchesUpserted = 0;
    for (const fetch of petFetches) {
      await client.query(
        `INSERT INTO sfl_pet_fetches (pet_type, is_nft, resource_name, unlock_level, last_synced_at, is_active)
         VALUES ($1, $2, $3, $4, now(), TRUE)
         ON CONFLICT (pet_type, resource_name, unlock_level) DO UPDATE SET
           is_nft = EXCLUDED.is_nft,
           last_synced_at = now(),
           is_active = TRUE`,
        [fetch.petType, fetch.isNft, fetch.resourceName, fetch.unlockLevel],
      );
      petFetchesUpserted++;
    }

    for (const trait of budTraits) {
      const sprite = spriteMap.get(trait.name) ?? null;
      await client.query(
        `INSERT INTO sfl_buds
           (id, trait_group, sprite, description_en, description_ru, label_type, boost_type, is_debuff, last_synced_at, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), TRUE)
         ON CONFLICT (id, trait_group) DO UPDATE SET
           sprite = CASE WHEN 'sprite' = ANY(sfl_buds.manually_edited_fields) THEN sfl_buds.sprite ELSE EXCLUDED.sprite END,
           description_en = CASE WHEN 'description_en' = ANY(sfl_buds.manually_edited_fields) THEN sfl_buds.description_en ELSE EXCLUDED.description_en END,
           description_ru = CASE WHEN 'description_ru' = ANY(sfl_buds.manually_edited_fields) THEN sfl_buds.description_ru ELSE EXCLUDED.description_ru END,
           label_type = EXCLUDED.label_type,
           boost_type = EXCLUDED.boost_type,
           is_debuff = EXCLUDED.is_debuff,
           last_synced_at = now(),
           is_active = TRUE`,
        [trait.name, trait.traitGroup, sprite, trait.descriptionEn, trait.descriptionRu, trait.labelType, trait.boostType, trait.isDebuff],
      );
    }

    for (const bud of budInstances) {
      await client.query(
        `INSERT INTO sfl_bud_instances (bud_id, type, colour, stem, aura, ears, image_url, last_synced_at, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now(), TRUE)
         ON CONFLICT (bud_id) DO UPDATE SET
           type = EXCLUDED.type,
           colour = EXCLUDED.colour,
           stem = EXCLUDED.stem,
           aura = EXCLUDED.aura,
           ears = EXCLUDED.ears,
           image_url = EXCLUDED.image_url,
           last_synced_at = now(),
           is_active = TRUE`,
        [bud.budId, bud.type, bud.colour, bud.stem, bud.aura, bud.ears, getBudImageUrl(bud.budId)],
      );
    }

    for (const breed of petNftBreeds) {
      const sprite = `pets/backgrounds/blank-${breed.name.toLowerCase()}.webp`;
      await client.query(
        `INSERT INTO sfl_pets_nft (id, sprite, last_synced_at, is_active)
         VALUES ($1, $2, now(), TRUE)
         ON CONFLICT (id) DO UPDATE SET
           sprite = CASE WHEN 'sprite' = ANY(sfl_pets_nft.manually_edited_fields) THEN sfl_pets_nft.sprite ELSE EXCLUDED.sprite END,
           last_synced_at = now(),
           is_active = TRUE`,
        [breed.name, sprite],
      );
    }

    for (const trait of petNftTraits) {
      await client.query(
        `INSERT INTO sfl_pets_nft_traits
           (id, trait_group, description_en, description_ru, label_type, boost_type, is_debuff, last_synced_at, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now(), TRUE)
         ON CONFLICT (id, trait_group) DO UPDATE SET
           description_en = CASE WHEN 'description_en' = ANY(sfl_pets_nft_traits.manually_edited_fields) THEN sfl_pets_nft_traits.description_en ELSE EXCLUDED.description_en END,
           description_ru = CASE WHEN 'description_ru' = ANY(sfl_pets_nft_traits.manually_edited_fields) THEN sfl_pets_nft_traits.description_ru ELSE EXCLUDED.description_ru END,
           label_type = EXCLUDED.label_type,
           boost_type = EXCLUDED.boost_type,
           is_debuff = EXCLUDED.is_debuff,
           last_synced_at = now(),
           is_active = TRUE`,
        [trait.name, trait.traitGroup, trait.descriptionEn, trait.descriptionRu, trait.labelType, trait.boostType, trait.isDebuff],
      );
    }

    for (const pet of petNftInstances) {
      await client.query(
        `INSERT INTO sfl_pet_nft_instances (pet_id, type, fur, accessory, bib, aura, image_url, last_synced_at, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now(), TRUE)
         ON CONFLICT (pet_id) DO UPDATE SET
           type = EXCLUDED.type,
           fur = EXCLUDED.fur,
           accessory = EXCLUDED.accessory,
           bib = EXCLUDED.bib,
           aura = EXCLUDED.aura,
           image_url = EXCLUDED.image_url,
           last_synced_at = now(),
           is_active = TRUE`,
        [pet.petId, pet.type, pet.fur, pet.accessory, pet.bib, pet.aura, getPetNftImageUrl(pet.petId)],
      );
    }

    for (const pet of petsCommon) {
      const sprite = spriteMap.get(pet.name) ?? null;
      await client.query(
        `INSERT INTO sfl_pets_common (id, breed, sprite, last_synced_at, is_active)
         VALUES ($1, $2, $3, now(), TRUE)
         ON CONFLICT (id) DO UPDATE SET
           breed = EXCLUDED.breed,
           sprite = CASE WHEN 'sprite' = ANY(sfl_pets_common.manually_edited_fields) THEN sfl_pets_common.sprite ELSE EXCLUDED.sprite END,
           last_synced_at = now(),
           is_active = TRUE`,
        [pet.name, pet.breed, sprite],
      );
    }

    // Soft-delete sweep: anything not touched this run (no longer present in
    // SFL source) gets marked inactive, never physically deleted.
    const itemsSwept = await client.query(
      `UPDATE sfl_items SET is_active = FALSE
       WHERE last_synced_at < $1 AND is_active = TRUE
         AND NOT ('is_active' = ANY(manually_edited_fields))`,
      [runStartTimestamp],
    );
    const buffsSwept = await client.query(
      `UPDATE sfl_buffs SET is_active = FALSE WHERE last_synced_at < $1 AND is_active = TRUE`,
      [runStartTimestamp],
    );
    const petResourcesSwept = await client.query(
      `UPDATE sfl_pet_resources SET is_active = FALSE WHERE last_synced_at < $1 AND is_active = TRUE`,
      [runStartTimestamp],
    );
    const petFetchesSwept = await client.query(
      `UPDATE sfl_pet_fetches SET is_active = FALSE WHERE last_synced_at < $1 AND is_active = TRUE`,
      [runStartTimestamp],
    );
    const budTraitsSwept = await client.query(
      `UPDATE sfl_buds SET is_active = FALSE WHERE last_synced_at < $1 AND is_active = TRUE`,
      [runStartTimestamp],
    );
    const budInstancesSwept = await client.query(
      `UPDATE sfl_bud_instances SET is_active = FALSE WHERE last_synced_at < $1 AND is_active = TRUE`,
      [runStartTimestamp],
    );
    const petNftBreedsSwept = await client.query(
      `UPDATE sfl_pets_nft SET is_active = FALSE WHERE last_synced_at < $1 AND is_active = TRUE`,
      [runStartTimestamp],
    );
    const petNftTraitsSwept = await client.query(
      `UPDATE sfl_pets_nft_traits SET is_active = FALSE WHERE last_synced_at < $1 AND is_active = TRUE`,
      [runStartTimestamp],
    );
    const petNftInstancesSwept = await client.query(
      `UPDATE sfl_pet_nft_instances SET is_active = FALSE WHERE last_synced_at < $1 AND is_active = TRUE`,
      [runStartTimestamp],
    );
    const petsCommonSwept = await client.query(
      `UPDATE sfl_pets_common SET is_active = FALSE WHERE last_synced_at < $1 AND is_active = TRUE`,
      [runStartTimestamp],
    );

    await client.query("COMMIT");
    console.log("\n✅ Database upserted:");
    console.log(
      `   Items: ${itemsUpserted} (${items.filter((i) => i.type === "skill").length} skills, ` +
        `${items.filter((i) => i.type === "wearable").length} wearables, ` +
        `${items.filter((i) => i.type === "collectible").length} collectibles)`,
    );
    console.log(`   Buffs: ${buffsUpserted}`);
    console.log(
      `   Numeric values matched: ${items.filter((i) => numericValues.has(i.name)).length}/${items.length}`,
    );
    console.log(
      `   Pet resources: ${petResourcesUpserted}, pet fetches: ${petFetchesUpserted}`,
    );
    console.log(
      `   Buds: ${budTraits.length} traits, ${budInstances.length} instances`,
    );
    console.log(
      `   NFT pets: ${petNftBreeds.length} breeds, ${petNftTraits.length} traits, ${petNftInstances.length} instances`,
    );
    console.log(`   Common pets: ${petsCommon.length}`);
    console.log(
      `   Swept inactive: ${itemsSwept.rowCount} items, ${buffsSwept.rowCount} buffs, ` +
        `${petResourcesSwept.rowCount} pet resources, ${petFetchesSwept.rowCount} pet fetches, ` +
        `${budTraitsSwept.rowCount} bud traits, ${budInstancesSwept.rowCount} bud instances, ` +
        `${petNftBreedsSwept.rowCount} pet NFT breeds, ${petNftTraitsSwept.rowCount} pet NFT traits, ` +
        `${petNftInstancesSwept.rowCount} pet NFT instances, ${petsCommonSwept.rowCount} common pets`,
    );

    if (lowConfidenceItems.length > 0) {
      console.log(
        `\n⚠  Low-confidence numeric extractions (${lowConfidenceItems.length}):`,
      );
      lowConfidenceItems.slice(0, 20).forEach((n) => console.log(`     - ${n}`));
      if (lowConfidenceItems.length > 20)
        console.log(`     ... and ${lowConfidenceItems.length - 20} more`);
    }

    const nullNumericShare = numericLookingTotal > 0 ? numericLookingNullCount / numericLookingTotal : 0;
    const nullAlarmThreshold = SELF_CHECK_NULL_BASELINE + SELF_CHECK_NULL_REGRESSION_MARGIN;
    const nullExcess = nullNumericShare - SELF_CHECK_NULL_BASELINE;

    if (nullNumericShare > nullAlarmThreshold) {
      console.warn(
        `\n⚠ SELF-CHECK REGRESSION: ${numericLookingNullCount} buffs with numeric-looking text but NULL numeric_value ` +
          `(${(nullNumericShare * 100).toFixed(1)}% — +${(nullExcess * 100).toFixed(1)} pp above baseline ${(SELF_CHECK_NULL_BASELINE * 100).toFixed(0)}%, ` +
          `alarm at baseline+${(SELF_CHECK_NULL_REGRESSION_MARGIN * 100).toFixed(0)} pp = ${(nullAlarmThreshold * 100).toFixed(0)}%)`,
      );
    } else {
      console.log(
        `\n✓ SELF-CHECK OK: ${numericLookingNullCount} null-numeric buffs ` +
          `(${(nullNumericShare * 100).toFixed(1)}% — within ${(nullExcess * 100).toFixed(1)} pp of baseline ${(SELF_CHECK_NULL_BASELINE * 100).toFixed(0)}%)`,
      );
    }

    return {
      itemsUpserted,
      buffsUpserted,
      itemsSwept: itemsSwept.rowCount ?? 0,
      buffsSwept: buffsSwept.rowCount ?? 0,
      numericLookingTotal,
      numericLookingNullCount,
      nullNumericShare,
      nullNumericBaseline: SELF_CHECK_NULL_BASELINE,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`SFL source : ${SFL_DIR}`);

  if (!fs.existsSync(SFL_DIR)) {
    console.error(`Error: sfl-dir does not exist: ${SFL_DIR}`);
    console.error("Run: npm run sfl:clone");
    process.exit(1);
  }

  console.log("📖 Loading translations...");
  const dict = buildTranslationMap();
  const ruDict = buildRuTranslationMap(dict);
  console.log(`   ${dict.size} keys loaded (en), ${ruDict.size} keys loaded (ru, en-fallback)`);

  console.log("\n🔍 Parsing skills...");
  const skills = parseSkills(dict, ruDict);
  console.log(`   ${skills.length} skills`);

  console.log("\n🔍 Parsing wearables...");
  const wearables = parseWearables(dict, ruDict);
  console.log(`   ${wearables.length} wearables`);

  console.log("\n🔍 Parsing collectibles...");
  const collectibles = parseCollectibles(dict, ruDict);
  console.log(`   ${collectibles.length} collectibles`);

  console.log("\n🔍 Extracting numeric boost values...");
  const numericValues = parseNumericValues();
  console.log(`   ${numericValues.size} items with numeric values`);

  console.log("\n🔍 Parsing sprite paths...");
  const spriteMap = parseSpriteMap(SFL_DIR);
  console.log(`   ${spriteMap.size} sprites mapped`);

  console.log("\n🔍 Parsing game IDs...");
  const gameIds = parseGameIds(SFL_DIR);
  console.log(`   ${gameIds.size} game IDs mapped`);

  const wearableIds = parseWearableIds(SFL_DIR);
  console.log(`   ${wearableIds.size} wearable IDs mapped`);

  console.log("\n🔍 Parsing buff-less cosmetic wearables...");
  const decorWearables = parseDecorWearables(wearableIds, new Set(wearables.map((w) => w.name)));
  console.log(`   ${decorWearables.length} additional cosmetic wearables`);

  // Only collectible names are excluded here: those overlaps (e.g. "Ancient
  // Tree", "Beehive") are the same game entity described in two SFL source
  // files, sharing one game_id — a redundant row, not a distinct item.
  // Skills and wearables are different namespaces (skills aren't marketplace
  // items at all; wearables have their own ID space via ITEM_IDS), so a
  // same-named produce item (e.g. wearable "Parsnip" vs. crop "Parsnip") is a
  // genuinely different entity and must get its own (id, type) row.
  const collectibleNames = new Set(collectibles.map((c) => c.name));

  console.log("\n🔍 Parsing crops/seeds/resources/flowers/fruits/fish...");
  const produce = parseProduceItems(gameIds, collectibleNames);
  console.log(`   ${produce.length} additional produce items`);

  // Buff-less decorative collectibles (e.g. Pufferfish, Fat Crab) are
  // invisible to parseCollectibles() — anything already captured above
  // (by name, across every type) is excluded so this only fills the gap.
  const allExistingNames = new Set([...skills, ...wearables, ...decorWearables, ...collectibles, ...produce].map((i) => i.name));

  console.log("\n🔍 Parsing buff-less decorative collectibles...");
  const decorCollectibles = parseDecorCollectibles(gameIds, allExistingNames);
  console.log(`   ${decorCollectibles.length} additional decorative collectibles`);

  const miscNames = parseMiscItemNames(SFL_DIR);
  console.log(`   ${miscNames.size} misc/junk item names (tickets, tokens, clutter)`);

  console.log("\n🔍 Parsing Bud trait buffs (type/stem/aura)...");
  const budTraits = parseBuds(dict, ruDict);
  console.log(`   ${budTraits.length} Bud traits with buffs`);

  console.log("\n🔍 Parsing minted Bud instances...");
  const budInstances = parseBudInstances();
  console.log(`   ${budInstances.length} Bud instances`);

  console.log("\n🔍 Parsing NFT pet breeds and trait buffs (aura/bib)...");
  const petNftBreeds = parsePetNftBreeds();
  const petNftTraits = parsePetNftTraits(dict, ruDict);
  console.log(`   ${petNftBreeds.length} breeds, ${petNftTraits.length} traits with buffs`);

  console.log("\n🔍 Parsing minted Pet NFT instances...");
  const petNftInstances = parsePetNftInstances();
  console.log(`   ${petNftInstances.length} Pet NFT instances`);

  console.log("\n🔍 Parsing common pet catalog (name → breed)...");
  const petsCommon = parsePetsCommon();
  console.log(`   ${petsCommon.length} common pets`);

  console.log("\n🔍 Parsing Pet fetchable resources...");
  const petResources = parsePetResources();
  const petFetches = parsePetFetches();
  console.log(`   ${petResources.length} pet resources, ${petFetches.length} pet fetch rules`);

  const allItems: AnyItem[] = [
    ...skills, ...wearables, ...decorWearables, ...collectibles, ...produce, ...decorCollectibles,
  ];

  if (unresolvedKeys.length > 0) {
    console.log(`\n⚠  Unresolved i18n keys (${unresolvedKeys.length}):`);
    unresolvedKeys.slice(0, 30).forEach((k) => console.log(`     - ${k}`));
    if (unresolvedKeys.length > 30)
      console.log(`     ... and ${unresolvedKeys.length - 30} more`);
  }

  console.log(`\n💾 Connecting to database...`);
  // Parse DATABASE_URL to ensure password field is always a string (pg SCRAM requirement)
  const url = new URL(DATABASE_URL!);
  const pool = new Pool({
    host: url.hostname,
    port: url.port ? parseInt(url.port) : 5432,
    database: url.pathname.slice(1),
    user: url.username || undefined,
    password: url.password || "",
    ssl: url.searchParams.get("ssl") === "true" ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await pool.query("SELECT 1");
    console.log("   Connected.");
    const summary = await populateDB(
      pool, allItems, numericValues, spriteMap, gameIds, wearableIds, miscNames,
      petResources, petFetches, budTraits, budInstances, petNftBreeds, petNftTraits,
      petNftInstances, petsCommon,
    );

    const summaryPath = path.resolve("scripts/.last-run-summary.json");
    fs.writeFileSync(
      summaryPath,
      JSON.stringify(
        {
          ranAt: new Date().toISOString(),
          ...summary,
          unresolvedI18nKeyCount: unresolvedKeys.length,
        },
        null,
        2,
      ),
    );
    console.log(`\n📄 Run summary written to ${summaryPath}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
