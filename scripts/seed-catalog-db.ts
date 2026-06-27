#!/usr/bin/env npx tsx
/**
 * Fills nft_items + nft_boosts tables in the goblincodex DB
 * from src/data/boosts-catalog.json.
 *
 * Run: DATABASE_URL="postgresql://..." npx tsx scripts/seed-catalog-db.ts
 */

import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL env var is required');
  process.exit(1);
}

const { Pool } = pg;
const pool = new Pool({ connectionString: DATABASE_URL });

const catalogPath = path.join(__dirname, '..', 'src', 'data', 'boosts-catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create tables if not exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS nft_items (
        name          TEXT PRIMARY KEY,
        type          TEXT NOT NULL,
        description_en TEXT DEFAULT '',
        description_ru TEXT DEFAULT '',
        sprite        TEXT,
        token_id      INTEGER
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS nft_boosts (
        id         SERIAL PRIMARY KEY,
        item_name  TEXT NOT NULL REFERENCES nft_items(name) ON DELETE CASCADE,
        key        TEXT,
        en         TEXT,
        ru         TEXT,
        type       TEXT,
        resource   TEXT[],
        with_skill BOOLEAN DEFAULT FALSE,
        value      JSONB
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_nft_boosts_item ON nft_boosts(item_name)
    `);

    // Wipe existing data (idempotent re-run)
    await client.query('DELETE FROM nft_boosts');
    await client.query('DELETE FROM nft_items');

    const items = catalog.items as Array<{
      name: string;
      type: string;
      description: { en: string; ru: string };
      sprite: string | null;
      tokenId: number;
      boosts: Array<{
        key: string;
        en: string;
        ru: string;
        type: string;
        resource: string[];
        withSkill: boolean;
        value: unknown;
      }>;
    }>;

    let itemCount = 0;
    let boostCount = 0;

    for (const item of items) {
      await client.query(
        `INSERT INTO nft_items(name, type, description_en, description_ru, sprite, token_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (name) DO UPDATE SET
           type = EXCLUDED.type,
           description_en = EXCLUDED.description_en,
           description_ru = EXCLUDED.description_ru,
           sprite = EXCLUDED.sprite,
           token_id = EXCLUDED.token_id`,
        [
          item.name,
          item.type,
          item.description?.en ?? '',
          item.description?.ru ?? '',
          item.sprite ?? null,
          item.tokenId ?? 0,
        ]
      );
      itemCount++;

      for (const boost of item.boosts ?? []) {
        await client.query(
          `INSERT INTO nft_boosts(item_name, key, en, ru, type, resource, with_skill, value)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            item.name,
            boost.key ?? '',
            boost.en ?? '',
            boost.ru ?? '',
            boost.type ?? 'info',
            boost.resource ?? [],
            boost.withSkill ?? false,
            boost.value != null ? JSON.stringify(boost.value) : null,
          ]
        );
        boostCount++;
      }
    }

    await client.query('COMMIT');
    console.log(`Done: ${itemCount} items, ${boostCount} boosts inserted.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error, rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
