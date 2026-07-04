# GoblinCodex SFL Data Scripts

Scripts for extracting game data from a [sunflower-land](https://github.com/sunflower-land/sunflower-land) source clone and populating the GoblinCodex database.

## Scripts

### `populate-buffs-db.ts`

Parses skill, wearable, and collectible buff data from SFL TypeScript source files and **upserts** it into PostgreSQL (`sfl_items` + `sfl_buffs` tables) — safe to re-run repeatedly, never drops existing rows. Also resolves sprite paths and RU translations from the same source.

Rows not encountered in a given run are soft-deleted (`is_active = false`), never physically removed. Fields that have been hand-corrected via `update-item-by-id.ts` (tracked in each row's `manually_edited_fields`) are protected from being overwritten by the next automated run.

After each run, writes `scripts/.last-run-summary.json` (gitignored) with upsert/sweep counts and a self-check on the share of buffs with numeric-looking text but a `NULL numeric_value` (warns if over 10% — see `SELF_CHECK_NULL_THRESHOLD` in the script). No Telegram/N8N delivery is wired up yet; the planned N8N workflow (see "Future automation" below) is expected to read this file and route alerts itself.

Requires:
- `DATABASE_URL` environment variable (`postgresql://user:pass@host:5432/dbname`)
- SFL source clone at `_sfl_temp/` (or pass `--sfl-dir <path>`)

### `update-item-by-id.ts`

Manually correct a single `sfl_items` or `sfl_buffs` row. Marks each touched column in `manually_edited_fields` so the next `sfl:populate` run won't clobber the fix.

```sh
DATABASE_URL="..." npx tsx scripts/update-item-by-id.ts item "Sunflower Statue" --category=Decoration
DATABASE_URL="..." npx tsx scripts/update-item-by-id.ts buff 482 --numeric_value=0.2 --value_type=percent
```

Allowed `item` fields: `category`, `requires_game_state`, `sprite`, `tags` — editing `tags` freezes the whole array (no auto-detected tag added later will merge in for that item).
Allowed `buff` fields: `label_type`, `short_description_ru`, `boost_type`, `is_debuff`, `numeric_value`, `value_type`, `affected_stat`, `numeric_confidence`, `raw_value`, `source_file`. `short_description` (the English text) can't be edited this way — it's part of the row's natural key.

### `backup-db.ts`

Shells out to `pg_dump` for a timestamped backup before running `sfl:populate` against prod. Recommended, not required (not wired into the main pipeline) — needs the PostgreSQL client tools (`pg_dump`) installed and on `PATH`. Writes to `backups/` (gitignored).

### `sync-sprites.ts`

Copies sprite image files from the SFL source clone into `public/sprites/`, skipping files that are already up to date (compares mtime).

Defaults: `--sfl-dir ./_sfl_temp`, `--target-dir ./public/sprites`

### `lib/sprite-map.ts`, `lib/resource-classifier.ts`, `lib/item-tags.ts`

Shared parsers used by the scripts above: sprite path resolution, resource-keyword classification for `affected_stat`, and node/monument/building tagging for `tags`.

---

## First-time setup

### 1. Clone SFL sources

```sh
npm run sfl:clone
```

This does a sparse shallow clone of only the directories needed for parsing (types, i18n, assets, the boost-bearing event handlers under `events/landExpansion`, `expansion/lib`, and `lib`). The clone lands in `_sfl_temp/` which is gitignored.

### 2. Apply migrations (if upgrading an existing DB)

Apply these once in DBeaver as the `admin` user, in order, before the next `sfl:populate` run. Skip entirely if populating a brand-new database — `populate-buffs-db.ts` creates the full current schema from scratch via `CREATE TABLE IF NOT EXISTS`.

- `scripts/migrate-add-sprite.sql` — adds `sfl_items.sprite`.
- `scripts/migrate-add-ru-tags.sql` — adds `short_description_ru`, `affected_stat`, `tags`.
- `scripts/migrate-add-upsert-tracking.sql` — adds `manually_edited_fields`, `last_synced_at`, `is_active` to both tables, and the `UNIQUE (item_id, short_description)` constraint on `sfl_buffs` that makes upserting possible (dedupes any pre-existing duplicate rows first).

### 3. (Optional) Back up before populating prod

```sh
DATABASE_URL="postgresql://user:pass@host:5432/dbname" npm run sfl:backup
```

### 4. Populate the database

```sh
DATABASE_URL="postgresql://user:pass@host:5432/dbname" npm run sfl:populate
```

### 5. Sync sprites to public/

```sh
npm run sfl:sync-sprites
```

### 6. Commit sprites and tag the version

```sh
git add public/sprites/
git commit -m "chore: sync SFL sprites"
git tag vX.Y.Z
```

---

## npm scripts

| Command | Description |
|---|---|
| `npm run sfl:clone` | Sparse-clone SFL repo into `_sfl_temp/` |
| `npm run sfl:populate` | Parse SFL sources and upsert the database |
| `npm run sfl:sync-sprites` | Copy sprite assets into `public/sprites/` |
| `npm run sfl:backup` | `pg_dump` the database to `backups/` |

---

## Future automation

These scripts are designed to run unattended via an **N8N workflow** with a volume mount of this repository. The workflow will:
1. Run `sfl:clone` to fetch the latest SFL sources
2. Run `sfl:populate` with `DATABASE_URL` injected from N8N credentials
3. Read `scripts/.last-run-summary.json` and route any self-check warnings to Telegram via N8N's own node
4. Run `sfl:sync-sprites`
5. Commit and push the updated sprites

Until then, run the steps above manually when a new SFL version is released.
