/**
 * update-item-by-id.ts
 * Manually correct a single sfl_items or sfl_buffs row, flagging the
 * touched columns as manually_edited_fields so the next npm run sfl:populate
 * doesn't silently overwrite the fix.
 *
 * sfl_items' primary key is (id, type) — an item name alone isn't unique
 * (e.g. "Parsnip" is both a wearable and a crop). If <item_id> matches more
 * than one row, pass --type=<type> to disambiguate.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/update-item-by-id.ts item <item_id> [--type=<type>] --field=value [...]
 *   DATABASE_URL="postgresql://..." npx tsx scripts/update-item-by-id.ts buff <buff_id> --field=value [...]
 *
 * Examples:
 *   npx tsx scripts/update-item-by-id.ts item "Sunflower Statue" --category=Decoration
 *   npx tsx scripts/update-item-by-id.ts item "Parsnip" --type=wearable --category=Tool
 *   npx tsx scripts/update-item-by-id.ts buff 482 --numeric_value=0.2 --value_type=percent
 */

import { Pool } from "pg";

// Keep these allowlists in sync with ITEM_PROTECTABLE_FIELDS /
// BUFF_PROTECTABLE_FIELDS in populate-buffs-db.ts. short_description is
// deliberately not editable here: it's part of sfl_buffs's natural key
// (item_id, short_description), so hand-editing it would desync the row
// from what the parser re-derives next run.
const ITEM_PROTECTABLE_FIELDS = ["category", "requires_game_state", "sprite", "tags", "is_active"];
const BUFF_PROTECTABLE_FIELDS = [
  "label_type", "short_description_ru", "boost_type", "is_debuff",
  "numeric_value", "value_type", "affected_stat", "numeric_confidence",
  "raw_value", "source_file",
];

type FieldType = "text" | "boolean" | "real" | "text[]";

const ITEM_FIELD_TYPES: Record<string, FieldType> = {
  category: "text",
  requires_game_state: "boolean",
  sprite: "text",
  tags: "text[]",
  is_active: "boolean",
};

const BUFF_FIELD_TYPES: Record<string, FieldType> = {
  label_type: "text",
  short_description_ru: "text",
  boost_type: "text",
  is_debuff: "boolean",
  numeric_value: "real",
  value_type: "text",
  affected_stat: "text",
  numeric_confidence: "text",
  raw_value: "text",
  source_file: "text",
};

function coerce(rawValue: string, type: FieldType): unknown {
  switch (type) {
    case "text":
      return rawValue;
    case "boolean":
      if (rawValue === "true") return true;
      if (rawValue === "false") return false;
      throw new Error(`invalid boolean "${rawValue}" (expected "true" or "false")`);
    case "real": {
      const n = parseFloat(rawValue);
      if (isNaN(n)) throw new Error(`invalid number "${rawValue}"`);
      return n;
    }
    case "text[]":
      return rawValue.split(",").map((s) => s.trim()).filter(Boolean);
  }
}

interface ParsedArgs {
  subcommand: "item" | "buff";
  id: string;
  type: string | null;
  fields: { field: string; rawValue: string }[];
}

function printUsage(): void {
  console.error(`
Usage:
  DATABASE_URL="..." npx tsx scripts/update-item-by-id.ts item <item_id> [--type=<type>] --field=value [...]
  DATABASE_URL="..." npx tsx scripts/update-item-by-id.ts buff <buff_id> --field=value [...]

--type disambiguates <item_id> when the name matches more than one row
(sfl_items' key is (id, type), e.g. "Parsnip" is both a wearable and a crop).

Allowed item fields: ${ITEM_PROTECTABLE_FIELDS.join(", ")}
Allowed buff fields: ${BUFF_PROTECTABLE_FIELDS.join(", ")}
`);
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const subcommand = args[0];
  const id = args[1];

  if (subcommand !== "item" && subcommand !== "buff") {
    console.error(`Error: first argument must be "item" or "buff", got: ${subcommand ?? "(none)"}`);
    printUsage();
    process.exit(1);
  }
  if (!id) {
    console.error("Error: missing <item_id>/<buff_id> argument.");
    printUsage();
    process.exit(1);
  }

  let type: string | null = null;
  const fields: { field: string; rawValue: string }[] = [];
  for (const arg of args.slice(2)) {
    const eqIdx = arg.startsWith("--") ? arg.indexOf("=") : -1;
    if (eqIdx === -1) {
      console.error(`Error: invalid argument "${arg}" — expected --field=value.`);
      printUsage();
      process.exit(1);
    }
    const field = arg.slice(2, eqIdx);
    const rawValue = arg.slice(eqIdx + 1);
    if (subcommand === "item" && field === "type") {
      type = rawValue;
      continue;
    }
    fields.push({ field, rawValue });
  }

  if (fields.length === 0) {
    console.error("Error: no --field=value pairs provided.");
    printUsage();
    process.exit(1);
  }

  return { subcommand, id, type, fields };
}

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("Error: DATABASE_URL environment variable is required.");
    process.exit(1);
  }

  const { subcommand, id, type, fields } = parseArgs();
  const table = subcommand === "item" ? "sfl_items" : "sfl_buffs";
  const allowlist = subcommand === "item" ? ITEM_PROTECTABLE_FIELDS : BUFF_PROTECTABLE_FIELDS;
  const fieldTypes = subcommand === "item" ? ITEM_FIELD_TYPES : BUFF_FIELD_TYPES;

  const invalid = fields.filter((f) => !allowlist.includes(f.field));
  if (invalid.length > 0) {
    console.error(
      `Error: field(s) not allowed for "${subcommand}": ${invalid.map((f) => f.field).join(", ")}\n` +
        `Allowed: ${allowlist.join(", ")}`,
    );
    process.exit(1);
  }

  let idValue: string | number = id;
  if (subcommand === "buff") {
    idValue = parseInt(id, 10);
    if (isNaN(idValue)) {
      console.error(`Error: buff id must be a number, got "${id}".`);
      process.exit(1);
    }
  }

  let coercedFields: { field: string; value: unknown }[];
  try {
    coercedFields = fields.map(({ field, rawValue }) => ({
      field,
      value: coerce(rawValue, fieldTypes[field]),
    }));
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }

  // Parse DATABASE_URL manually (not connectionString) to keep the SCRAM-safe
  // empty-password handling consistent with populate-buffs-db.ts.
  const url = new URL(DATABASE_URL);
  const pool = new Pool({
    host: url.hostname,
    port: url.port ? parseInt(url.port) : 5432,
    database: url.pathname.slice(1),
    user: url.username || undefined,
    password: url.password || "",
    ssl: url.searchParams.get("ssl") === "true" ? { rejectUnauthorized: false } : undefined,
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // sfl_items' key is (id, type) — an item name alone can match more than
    // one row (e.g. "Parsnip" the wearable vs. "Parsnip" the crop).
    const lookupClauses = ["id = $1"];
    const lookupValues: unknown[] = [idValue];
    if (subcommand === "item" && type !== null) {
      lookupClauses.push(`type = $${lookupValues.length + 1}`);
      lookupValues.push(type);
    }

    const existing = await client.query(
      `SELECT manually_edited_fields${subcommand === "item" ? ", type" : ""} FROM ${table} WHERE ${lookupClauses.join(" AND ")}`,
      lookupValues,
    );
    if (existing.rowCount === 0) {
      console.error(`Error: no ${subcommand} found with id "${id}"${type !== null ? ` and type "${type}"` : ""}.`);
      await client.query("ROLLBACK");
      process.exit(1);
    }
    if (subcommand === "item" && existing.rowCount! > 1) {
      const types = existing.rows.map((r) => r.type).join(", ");
      console.error(
        `Error: "${id}" matches ${existing.rowCount} rows (types: ${types}). Pass --type=<type> to disambiguate.`,
      );
      await client.query("ROLLBACK");
      process.exit(1);
    }

    const currentFlags: string[] = existing.rows[0].manually_edited_fields ?? [];
    const newFlags = Array.from(new Set([...currentFlags, ...coercedFields.map((f) => f.field)]));
    // The disambiguation check above guarantees exactly one row at this
    // point, so its own type (whether user-supplied or inferred) precisely
    // targets that row in the UPDATE below.
    const resolvedType: string | null = subcommand === "item" ? existing.rows[0].type : null;

    // field names are interpolated directly here, but only after being
    // validated against the fixed allowlist above — safe.
    const setClauses = coercedFields.map((f, i) => `${f.field} = $${i + 1}`);
    const values = coercedFields.map((f) => f.value);

    const whereClauses = [`id = $${values.length + 2}`];
    const whereValues: unknown[] = [idValue];
    if (subcommand === "item") {
      whereClauses.push(`type = $${values.length + 3}`);
      whereValues.push(resolvedType);
    }

    const result = await client.query(
      `UPDATE ${table}
       SET ${setClauses.join(", ")}, manually_edited_fields = $${values.length + 1}
       WHERE ${whereClauses.join(" AND ")}
       RETURNING *`,
      [...values, newFlags, ...whereValues],
    );

    await client.query("COMMIT");

    console.log(`✅ Updated ${subcommand} "${id}":`);
    console.log(result.rows[0]);
    console.log(`\nmanually_edited_fields: [${newFlags.join(", ")}]`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Fatal:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
