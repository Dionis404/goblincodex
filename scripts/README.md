# GoblinCodex Data Scripts

Scripts for populating the GoblinCodex database from external sources: game data extracted from a [sunflower-land](https://github.com/sunflower-land/sunflower-land) source clone (`sfl:*` scripts, the bulk of this doc), the semantic-search embedding index (`search:index`), and Telegram channel history (`telegram:backfill`).

## Scripts

### `populate-buffs-db.ts`

Parses skill, wearable, and collectible buff data from SFL TypeScript source files and **upserts** it into PostgreSQL (`sfl_items` + `sfl_buffs` tables) — safe to re-run repeatedly, never drops existing rows. Also resolves sprite paths and RU translations from the same source.

Rows not encountered in a given run are soft-deleted (`is_active = false`), never physically removed. Fields that have been hand-corrected via `update-item-by-id.ts` (tracked in each row's `manually_edited_fields`) are protected from being overwritten by the next automated run.

After each run, writes `scripts/.last-run-summary.json` (gitignored) with upsert/sweep counts and a self-check on the share of buffs with numeric-looking text but a `NULL numeric_value` (warns if it regresses more than 10 percentage points above the baseline — see `SELF_CHECK_NULL_BASELINE`/`SELF_CHECK_NULL_REGRESSION_MARGIN` in the script). No Telegram/N8N delivery is wired up yet; the planned N8N workflow (see "Future automation" below) is expected to read this file and route alerts itself.

Requires:
- `DATABASE_URL` environment variable (`postgresql://user:pass@host:5432/dbname`)
- SFL source clone at `_sfl_temp/` (or pass `--sfl-dir <path>`)

Also parses Buds, NFT pets, and common pets — three separate domains, each in its own dedicated tables (not `sfl_items`/`sfl_buffs`), upserted/soft-deleted the same way:

**Buds**
- `sfl_buds` — trait catalog: one row per trait *value* (e.g. "Diamond Gem" as a stem, "Rare" as an aura) from `budBuffs.ts`, PK `(id, trait_group)` where `trait_group` is `type`/`stem`/`aura`. Each trait grants exactly one buff (`budBuffs.ts` never pushes more than one per `if` branch), so the buff (`description_en`/`description_ru`/`label_type`/`boost_type`/`is_debuff`) lives directly on the row instead of a separate buffs table. `sprite` is left for manual entry — there's no per-trait icon in the SFL source.
- `sfl_bud_instances` — every minted Bud's actual rolled traits (`lib/buds/buds.ts`, ~5000 rows, PK `bud_id`) plus `image_url`, a direct CDN link (`https://buds.sunflower-land.com/images/{id}.webp`) — Buds are rendered server-side per ID, not composited client-side from trait layers (see `lib/buds/types.ts` `getBudImage()`). This is the full, closed mint, so one run is enough.

**NFT pets**
- `sfl_pets_nft` — breed catalog (Ram, Dragon, Phoenix, Griffin, Warthog, Wolf, Bear). `sprite` defaults to the `blank-{breed}` NFT-card background from `assets/pets/backgrounds/`; `description_en`/`description_ru` start `NULL` (no flavor text exists in the SFL source — fill manually).
- `sfl_pets_nft_traits` — trait catalog for `aura`/`bib` from `getPetBuffs.ts`, same one-buff-per-trait shape as `sfl_buds`.
- `sfl_pet_nft_instances` — every minted Pet NFT's actual rolled traits (`features/pets/data/pets-nfts.ts`, PK `pet_id`, capped at 3000 by `getPetTraits.ts`, currently ~2000 revealed) plus `image_url` (`https://pets.sunflower-land.com/marketplace/{id}_animated.webp` — also server-rendered, see `features/island/pets/lib/petShared.ts` `getPetImageForMarketplace()`). Reveals continue over time, so **this table needs periodic re-runs**, unlike Bud instances.

**Common (non-NFT) pets**
- `sfl_pets_common` — name → breed catalog (`pets.ts` `PET_TYPES`, e.g. "Barkley" → "Dog"). `sprite` resolves from the same sprite map as `sfl_items` (pet names already have `ITEM_DETAILS` images); `description_en`/`description_ru` start `NULL`.

**Shared pet mechanics** (span both NFT and common pets — kept as one table rather than split per domain since it's the same shape either way, just gated by `is_nft`)
- `sfl_pet_resources` — energy each fetchable resource restores (`pets.ts` `PET_RESOURCES`).
- `sfl_pet_fetches` — which resource a pet type (common breed or NFT breed) fetches at which level (`pets.ts` `PET_CATEGORIES`/`FETCHES_BY_CATEGORY`). Common breeds only reach the primary/secondary tier; NFT breeds also unlock a tertiary-category resource and Moonfur. Mirrors the `PET_FETCHES` reduce() in `pets.ts` — if that level schedule changes there, update `parsePetFetches()` in `populate-buffs-db.ts` to match.

`sfl:clone`'s sparse-checkout includes `src/lib/buds` and `src/features/pets/data` for this (not the rest of `src/features/pets`, which is only UI components).

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

### `sync-skill-icons.ts`

Copies bumpkin skill-tree icon sprites from the SFL source clone into `public/sprites/`, and prints a name → public-path mapping to paste manually into `src/lib/skills.ts` (the `icon` field on each `Skill`). Icons come from three different source shapes in `BUMPKIN_REVAMP_SKILL_TREE` (local asset import, reused `ITEM_DETAILS` image, or a `SUNNYSIDE` CDN path) — skills with no `image` field at all have no icon and fall back to a per-tree emoji on the site (`SKILL_TREE_EMOJI` in `ReferenceCatalog.tsx`). Not part of the automated `sfl:populate` pipeline — run it by hand only when SFL adds/changes skill-tree icons.

```sh
npx tsx scripts/sync-skill-icons.ts [--sfl-dir ./_sfl_temp] [--target-dir ./public/sprites]
```

### `index-search.ts`

Builds the semantic-search index: computes embeddings (via routerai.ru, model `qwen/qwen3-embedding-4b`) for every non-draft `guides`/`mechanics`/`news` article and every hand-written Справочник section, and upserts them into the `search_embeddings` table. This is what powers the site's neuropoisk (semantic search) — one combined index across guides, mechanics, Справочник, and the news/blog archive. Requires the `migrate-add-search-embeddings.sql` migration applied first (needs the `pgvector` Postgres extension).

Re-run this whenever guide/mechanics/news content changes (new article, edited text) — it's not triggered automatically by anything, and stale embeddings just mean search results won't reflect the latest wording. After a `news:import` run, re-run this to index the newly imported articles.

```sh
DATABASE_URL="..." ROUTERAI_API_KEY="..." npm run search:index
```

### `backfill-telegram-posts.ts`

One-off/re-runnable import of the `@URGSFL` Telegram channel's message history into the `telegram_posts` table, by scraping the public `t.me/s/URGSFL` preview page (`ON CONFLICT DO UPDATE`, safe to re-run). The separate always-on `goblin-bot` service long-polls the channel and writes new posts as they're published, but only from whenever it started running — this script fills in everything published before that. `t.me` is blocked without a VPN/proxy on some networks (e.g. Russia); set `HTTPS_PROXY` or `TELEGRAM_SCRAPE_PROXY` to route around that.

```sh
DATABASE_URL="postgresql://..." npx tsx scripts/backfill-telegram-posts.ts
```

### `import-teletype-news.ts`

One-time import of the Teletype article archive (`@urg` blog export) into the `news` content
collection. Parses each raw `.md` export's title (`# heading`), date+category (`> 📅 ... · 🏷 ...`
line — the category segment is sometimes absent entirely, not just blank), and original URL
(`> 🔗 Оригинал: ...` line), strips the metadata header, and writes `src/content/news/<slug>.md`
with clean frontmatter (slug is `<date>-<transliterated-title>`, deduped on collision). Not part of
any ongoing pipeline — new articles going forward are added by hand as new `.md` files in
`src/content/news/`, same workflow as `guides`/`mechanics`.

```sh
npx tsx scripts/import-teletype-news.ts --source "<path to Teletype export folder>" --target ./src/content/news
```

### `sync-news-images.ts`

Downloads every `img<N>.teletype.media` image referenced in `src/content/news/*.md` into
`public/blog-images/` (preserving the CDN's `xx/yy/` subpath, mirroring how `sync-sprites.ts`
mirrors SFL's own subdirectory structure) and rewrites the markdown links to the local path — so
article images are self-hosted instead of hotlinked. Also backfills each article's frontmatter
`image` field from its first successfully-downloaded image (used for card thumbnails). Skips files
that already exist locally (a given Teletype uuid's content never changes), so it's safe to re-run
after adding new articles that reference new images.

```sh
npx tsx scripts/sync-news-images.ts [--content-dir ./src/content/news] [--target-dir ./public/blog-images]
```

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
- `scripts/migrate-add-composite-pk.sql` — widens `sfl_items`' primary key from `(id)` to `(id, type)` and the matching `sfl_buffs` FK/unique constraints to `(item_id, item_type)`, fixing silent overwrites when a wearable and an unrelated item share the same display name.
- `scripts/migrate-add-game-id.sql` — adds `sfl_items.game_id` (and its index) for marketplace numbering.
- `scripts/migrate-add-search-embeddings.sql` — adds `search_embeddings` + `search_feedback` tables for semantic search (requires the `pgvector` Postgres extension to be installed on the server first).

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

### 6. Re-index search (if guide/mechanics content changed)

```sh
DATABASE_URL="..." ROUTERAI_API_KEY="..." npm run search:index
```

### 7. Commit sprites and tag the version

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
| `npm run sfl:sync-skill-icons` | Copy skill-tree icon sprites, print mapping for `src/lib/skills.ts` |
| `npm run sfl:backup` | `pg_dump` the database to `backups/` |
| `npm run search:index` | Recompute semantic-search embeddings for guides/mechanics/reference |
| `npm run telegram:backfill` | Backfill `telegram_posts` from the `@URGSFL` channel history |
| `npm run news:import` | One-time import of the Teletype archive into `src/content/news/` |
| `npm run news:sync-images` | Download and self-host `news` article images into `public/blog-images/` |

---

## Future automation

These scripts are designed to run unattended via an **N8N workflow** with a volume mount of this repository. The workflow will:
1. Run `sfl:clone` to fetch the latest SFL sources
2. Run `sfl:populate` with `DATABASE_URL` injected from N8N credentials
3. Read `scripts/.last-run-summary.json` and route any self-check warnings to Telegram via N8N's own node
4. Run `sfl:sync-sprites`
5. Commit and push the updated sprites

Until then, run the steps above manually when a new SFL version is released.
