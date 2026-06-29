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
import { extractNamedBlock, extractTopLevelEntries, parseSpriteMap } from "./lib/sprite-map";

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
  "src/features/game/events/landExpansion/harvestFlower.ts",
  "src/features/game/events/landExpansion/feedAnimal.ts",
  "src/features/game/events/landExpansion/collectRecipe.ts",
];

// ─── Types ────────────────────────────────────────────────────────────────────

type BoostType = "speed" | "xp" | "yield" | "misc";

interface BuffEntry {
  text: string;
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

type AnyItem = SkillItem | WearableItem | CollectibleItem;

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
    | { kind: "text"; val: string; pos: number }
    | { kind: "label"; val: string; pos: number }
    | { kind: "icon"; val: string; pos: number };

  const events: Event[] = [];

  // translate("key") → text
  const translateRe = /translate\(["']([^"']+)["']\)/g;
  let m: RegExpExecArray | null;
  while ((m = translateRe.exec(cleanBlock)) !== null) {
    events.push({ kind: "text", val: resolveKey(m[1], dict), pos: m.index });
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
  let currentLabel = "success";
  let currentIcon: string | null = null;

  const flush = () => {
    if (currentText !== null) {
      buffs.push({
        text: currentText,
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

function parseSkills(dict: Map<string, string>): SkillItem[] {
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
      buffs = extractBuffLabels(buffInner, dict, false);
    }

    // Find debuff block
    const debuffBlockStart = entryBlock.indexOf("debuff:");
    if (debuffBlockStart !== -1) {
      const debuffInner = extractNamedBlock(
        "X=" + entryBlock.slice(debuffBlockStart + 7),
        "X",
      );
      debuffs = extractBuffLabels(debuffInner, dict, true);
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

function parseWearables(dict: Map<string, string>): WearableItem[] {
  const source = readFile(
    "src/features/game/types/bumpkinItemBuffs.ts",
  );

  const items: WearableItem[] = [];

  for (const exportName of ["BUMPKIN_ITEM_BUFF_LABELS", "SPECIAL_ITEM_LABELS"]) {
    const block = extractNamedBlock(source, exportName);
    const entries = extractTopLevelEntries(block);

    for (const { key, block: entryBlock } of entries) {
      const buffs = extractBuffLabels(entryBlock, dict, false);
      items.push({ name: key, type: "wearable", buffs });
    }
  }

  return items;
}

// ─── Parser: COLLECTIBLE_BUFF_LABELS ─────────────────────────────────────────

function parseCollectibles(dict: Map<string, string>): CollectibleItem[] {
  const source = readFile(
    "src/features/game/types/collectibleItemBuffs.ts",
  );
  const block = extractNamedBlock(source, "COLLECTIBLE_BUFF_LABELS");
  const entries = extractTopLevelEntries(block);

  return entries.map(({ key, block: entryBlock, isFn }) => {
    const buffs = extractBuffLabels(entryBlock, dict, false);
    return {
      name: key,
      type: "collectible" as const,
      requiresGameState: isFn,
      buffs,
    };
  });
}

// ─── Parser: Numeric values from boostsUsed.push ─────────────────────────────

function parseNumericValues(): Map<string, NumericValue[]> {
  const result = new Map<string, NumericValue[]>();

  // Pattern: boostsUsed.push({ name: "...", value: "..." })
  const PUSH_RE =
    /boostsUsed\.push\(\s*\{\s*(?:name:\s*["']([^"']+)["'][^}]*?value:\s*["']([^"']+)["']|value:\s*["']([^"']+)["'][^}]*?name:\s*["']([^"']+)["'])\s*\}\s*\)/gs;

  for (const relPath of BOOST_SOURCE_FILES) {
    const source = readFile(relPath);
    if (!source) continue;
    const fname = path.basename(relPath, ".ts");

    let m: RegExpExecArray | null;
    PUSH_RE.lastIndex = 0;
    while ((m = PUSH_RE.exec(source)) !== null) {
      const name = (m[1] ?? m[4])?.trim();
      const raw = (m[2] ?? m[3])?.trim();
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
DROP TABLE IF EXISTS sfl_buffs;
DROP TABLE IF EXISTS sfl_items;

CREATE TABLE sfl_items (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL,
  category     TEXT,
  requires_game_state BOOLEAN DEFAULT FALSE,
  sprite       TEXT
);

CREATE TABLE sfl_buffs (
  id                 SERIAL PRIMARY KEY,
  item_id            TEXT REFERENCES sfl_items(id) ON DELETE CASCADE,
  label_type         TEXT,
  short_description  TEXT,
  boost_type         TEXT,
  is_debuff          BOOLEAN DEFAULT FALSE,
  numeric_value      REAL,
  value_type         TEXT,
  affected_stat      TEXT,
  numeric_confidence TEXT,
  raw_value          TEXT,
  source_file        TEXT
);
`;

async function populateDB(
  pool: Pool,
  items: AnyItem[],
  numericValues: Map<string, NumericValue[]>,
  spriteMap: Map<string, string>,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create schema
    await client.query(SCHEMA_SQL);

    let itemsInserted = 0;
    let buffsInserted = 0;
    const lowConfidenceItems: string[] = [];

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

      await client.query(
        `INSERT INTO sfl_items (id, type, category, requires_game_state, sprite)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [item.name, item.type, category, requiresGameState, sprite],
      );
      itemsInserted++;

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

        await client.query(
          `INSERT INTO sfl_buffs
             (item_id, label_type, short_description, boost_type, is_debuff,
              numeric_value, value_type, affected_stat, numeric_confidence, raw_value, source_file)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            item.name,
            buff.labelType,
            buff.text,
            buff.boostType,
            buff.isDebuff,
            nv?.numericValue ?? null,
            nv?.valueType ?? null,
            null, // affected_stat: TODO — needs deeper analysis
            nv?.confidence ?? null,
            nv?.rawValue ?? null,
            nv?.sourceFile ?? null,
          ],
        );
        buffsInserted++;
      }
    }

    await client.query("COMMIT");
    console.log("\n✅ Database populated:");
    console.log(
      `   Items: ${itemsInserted} (${items.filter((i) => i.type === "skill").length} skills, ` +
        `${items.filter((i) => i.type === "wearable").length} wearables, ` +
        `${items.filter((i) => i.type === "collectible").length} collectibles)`,
    );
    console.log(`   Buffs: ${buffsInserted}`);
    console.log(
      `   Numeric values matched: ${items.filter((i) => numericValues.has(i.name)).length}/${items.length}`,
    );

    if (lowConfidenceItems.length > 0) {
      console.log(
        `\n⚠  Low-confidence numeric extractions (${lowConfidenceItems.length}):`,
      );
      lowConfidenceItems.slice(0, 20).forEach((n) => console.log(`     - ${n}`));
      if (lowConfidenceItems.length > 20)
        console.log(`     ... and ${lowConfidenceItems.length - 20} more`);
    }
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
  console.log(`   ${dict.size} keys loaded`);

  console.log("\n🔍 Parsing skills...");
  const skills = parseSkills(dict);
  console.log(`   ${skills.length} skills`);

  console.log("\n🔍 Parsing wearables...");
  const wearables = parseWearables(dict);
  console.log(`   ${wearables.length} wearables`);

  console.log("\n🔍 Parsing collectibles...");
  const collectibles = parseCollectibles(dict);
  console.log(`   ${collectibles.length} collectibles`);

  console.log("\n🔍 Extracting numeric boost values...");
  const numericValues = parseNumericValues();
  console.log(`   ${numericValues.size} items with numeric values`);

  console.log("\n🔍 Parsing sprite paths...");
  const spriteMap = parseSpriteMap(SFL_DIR);
  console.log(`   ${spriteMap.size} sprites mapped`);

  const allItems: AnyItem[] = [...skills, ...wearables, ...collectibles];

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
    await populateDB(pool, allItems, numericValues, spriteMap);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
