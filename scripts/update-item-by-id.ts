/**
 * update-item-by-id.ts
 * Manually correct a single sfl_items or sfl_buffs row, flagging the
 * touched columns as manually_edited_fields so the next npm run sfl:populate
 * doesn't silently overwrite the fix.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/update-item-by-id.ts item <item_id> --field=value [...]
 *   DATABASE_URL="postgresql://..." npx tsx scripts/update-item-by-id.ts buff <buff_id> --field=value [...]
 *
 * Examples:
 *   npx tsx scripts/update-item-by-id.ts item "Sunflower Statue" --category=Decoration
 *   npx tsx scripts/update-item-by-id.ts buff 482 --numeric_value=0.2 --value_type=percent
 */

import { Pool } from "pg";

// Keep these allowlists in sync with ITEM_PROTECTABLE_FIELDS /
// BUFF_PROTECTABLE_FIELDS in populate-buffs-db.ts. short_description is
// deliberately not editable here: it's part of sfl_buffs's natural key
// (item_id, short_description), so hand-editing it would desync the row
// from what the parser re-derives next run.
const ITEM_PROTECTABLE_FIELDS = ["category", "requires_game_state", "sprite", "tags"];
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
  fields: { field: string; rawValue: string }[];
}

function printUsage(): void {
  console.error(`
Usage:
  DATABASE_URL="..." npx tsx scripts/update-item-by-id.ts item <item_id> --field=value [...]
  DATABASE_URL="..." npx tsx scripts/update-item-by-id.ts buff <buff_id> --field=value [...]

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

  const fields: { field: string; rawValue: string }[] = [];
  for (const arg of args.slice(2)) {
    const eqIdx = arg.startsWith("--") ? arg.indexOf("=") : -1;
    if (eqIdx === -1) {
      console.error(`Error: invalid argument "${arg}" — expected --field=value.`);
      printUsage();
      process.exit(1);
    }
    fields.push({ field: arg.slice(2, eqIdx), rawValue: arg.slice(eqIdx + 1) });
  }

  if (fields.length === 0) {
    console.error("Error: no --field=value pairs provided.");
    printUsage();
    process.exit(1);
  }

  return { subcommand, id, fields };
}

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("Error: DATABASE_URL environment variable is required.");
    process.exit(1);
  }

  const { subcommand, id, fields } = parseArgs();
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

    const existing = await client.query(
      `SELECT manually_edited_fields FROM ${table} WHERE id = $1`,
      [idValue],
    );
    if (existing.rowCount === 0) {
      console.error(`Error: no ${subcommand} found with id "${id}".`);
      await client.query("ROLLBACK");
      process.exit(1);
    }

    const currentFlags: string[] = existing.rows[0].manually_edited_fields ?? [];
    const newFlags = Array.from(new Set([...currentFlags, ...coercedFields.map((f) => f.field)]));

    // field names are interpolated directly here, but only after being
    // validated against the fixed allowlist above — safe.
    const setClauses = coercedFields.map((f, i) => `${f.field} = $${i + 1}`);
    const values = coercedFields.map((f) => f.value);

    const result = await client.query(
      `UPDATE ${table}
       SET ${setClauses.join(", ")}, manually_edited_fields = $${values.length + 1}
       WHERE id = $${values.length + 2}
       RETURNING *`,
      [...values, newFlags, idValue],
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
