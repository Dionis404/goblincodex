# GoblinCodex SFL Data Scripts

Scripts for extracting game data from a [sunflower-land](https://github.com/sunflower-land/sunflower-land) source clone and populating the GoblinCodex database.

## Scripts

### `populate-buffs-db.ts`

Parses skill, wearable, and collectible buff data from SFL TypeScript source files and writes it to PostgreSQL (`sfl_items` + `sfl_buffs` tables). Also resolves sprite paths from the same source.

Requires:
- `DATABASE_URL` environment variable (`postgresql://user:pass@host:5432/dbname`)
- SFL source clone at `_sfl_temp/` (or pass `--sfl-dir <path>`)

### `sync-sprites.ts`

Copies sprite image files from the SFL source clone into `public/sprites/`, skipping files that are already up to date (compares mtime).

Defaults: `--sfl-dir ./_sfl_temp`, `--target-dir ./public/sprites`

### `lib/sprite-map.ts`

Shared parser used by both scripts above. Builds a `Map<itemName, relativeSpritePath>` by reading SFL source files.

---

## First-time setup

### 1. Clone SFL sources

```sh
npm run sfl:clone
```

This does a sparse shallow clone of only the directories needed for parsing (types, i18n, assets). The clone lands in `_sfl_temp/` which is gitignored.

### 2. Apply the sprite migration (if upgrading an existing DB)

If `sfl_items` already exists without the `sprite` column, apply this once in DBeaver as the `admin` user:

```sql
-- scripts/migrate-add-sprite.sql
ALTER TABLE sfl_items ADD COLUMN IF NOT EXISTS sprite TEXT;
```

Skip this step if populating a fresh database — `populate-buffs-db.ts` creates the full schema from scratch.

### 3. Populate the database

```sh
DATABASE_URL="postgresql://user:pass@host:5432/dbname" npm run sfl:populate
```

### 4. Sync sprites to public/

```sh
npm run sfl:sync-sprites
```

### 5. Commit sprites and tag the version

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
| `npm run sfl:populate` | Parse SFL sources and populate the database |
| `npm run sfl:sync-sprites` | Copy sprite assets into `public/sprites/` |

---

## Future automation

These scripts are designed to run unattended via an **N8N workflow** with a volume mount of this repository. The workflow will:
1. Run `sfl:clone` to fetch the latest SFL sources
2. Run `sfl:populate` with `DATABASE_URL` injected from N8N credentials
3. Run `sfl:sync-sprites`
4. Commit and push the updated sprites

Until then, run the steps above manually when a new SFL version is released.
