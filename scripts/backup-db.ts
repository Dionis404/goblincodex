/**
 * backup-db.ts
 * Shells out to `pg_dump` to take a timestamped backup of the sfl database.
 * Recommended (not required) before running `npm run sfl:populate` against
 * prod. Requires the PostgreSQL client tools (pg_dump) installed and on PATH
 * — not wired into populate-buffs-db.ts itself so the main pipeline doesn't
 * hard-depend on a binary that may be missing in some run environments
 * (e.g. a minimal N8N container).
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npm run sfl:backup
 */

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is required.");
  process.exit(1);
}

const backupsDir = path.resolve("backups");
fs.mkdirSync(backupsDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outFile = path.join(backupsDir, `sfl-${timestamp}.sql`);

console.log(`Backing up database to ${outFile} ...`);
try {
  execFileSync("pg_dump", [DATABASE_URL, "-f", outFile], { stdio: "inherit" });
  console.log(`✅ Backup written: ${outFile}`);
} catch (err) {
  console.error("Fatal: pg_dump failed. Is the PostgreSQL client (pg_dump) installed and on PATH?");
  console.error(err);
  process.exit(1);
}
