-- Apply manually via DBeaver as admin before the next run of populate-buffs-db.ts.
--
-- Fixes silent data loss: sfl_items.id (the item's display name) is NOT
-- unique on its own — a wearable and an unrelated crop/collectible/etc. can
-- share the same name while being different NFT items in different game
-- namespaces (e.g. "Parsnip" wearable, game_id=56 via ITEM_IDS, vs. "Parsnip"
-- crop, game_id=208 via KNOWN_IDS). Under the old `id TEXT PRIMARY KEY`, the
-- second upsert silently overwrote the first. The natural key is (id, type).
--
-- Safe to re-run: every DROP is IF EXISTS and the composite constraints are
-- dropped-and-recreated rather than assumed absent.

BEGIN;

-- 1. Backfill item_type on sfl_buffs from the still-single-id sfl_items
--    table before either table's key shape changes.
ALTER TABLE sfl_buffs ADD COLUMN IF NOT EXISTS item_type TEXT;
UPDATE sfl_buffs b
SET item_type = i.type
FROM sfl_items i
WHERE b.item_id = i.id AND b.item_type IS NULL;

-- 2. Drop old (and, on a re-run, current) FK/unique constraints before
--    changing sfl_items' primary key shape (Postgres won't let you drop a PK
--    that's still referenced).
ALTER TABLE sfl_buffs DROP CONSTRAINT IF EXISTS sfl_buffs_item_id_fkey;
ALTER TABLE sfl_buffs DROP CONSTRAINT IF EXISTS sfl_buffs_item_id_short_description_key;
ALTER TABLE sfl_buffs DROP CONSTRAINT IF EXISTS sfl_buffs_item_id_type_fkey;
ALTER TABLE sfl_buffs DROP CONSTRAINT IF EXISTS sfl_buffs_item_id_type_short_description_key;

-- 3. Swap sfl_items' primary key from (id) to (id, type).
ALTER TABLE sfl_items DROP CONSTRAINT IF EXISTS sfl_items_pkey;
ALTER TABLE sfl_items ADD PRIMARY KEY (id, type);

-- 4. Re-add the FK as composite, and the natural-key unique constraint
--    widened to include item_type (item_id alone no longer disambiguates
--    the item).
ALTER TABLE sfl_buffs ALTER COLUMN item_type SET NOT NULL;
ALTER TABLE sfl_buffs
  ADD CONSTRAINT sfl_buffs_item_id_type_fkey
  FOREIGN KEY (item_id, item_type) REFERENCES sfl_items(id, type) ON DELETE CASCADE;
ALTER TABLE sfl_buffs
  ADD CONSTRAINT sfl_buffs_item_id_type_short_description_key
  UNIQUE (item_id, item_type, short_description);

COMMIT;
