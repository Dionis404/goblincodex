-- Apply manually in DBeaver as admin BEFORE the next npm run sfl:populate.
-- Idempotent / safe to re-run.
--
-- Patches an existing prod DB (populated by the old DROP+CREATE
-- populate-buffs-db.ts) for the new UPSERT-based version: adds manual-edit
-- protection + soft-delete tracking columns, and a natural-key UNIQUE
-- constraint on sfl_buffs so future runs can upsert instead of blind-INSERT.

-- 1. New bookkeeping columns on sfl_items
ALTER TABLE sfl_items ADD COLUMN IF NOT EXISTS manually_edited_fields TEXT[] DEFAULT '{}';
ALTER TABLE sfl_items ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE sfl_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. New bookkeeping columns on sfl_buffs
ALTER TABLE sfl_buffs ADD COLUMN IF NOT EXISTS manually_edited_fields TEXT[] DEFAULT '{}';
ALTER TABLE sfl_buffs ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE sfl_buffs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 3. Backfill last_synced_at for existing rows so the very first post-migration
--    populate run's "sweep" doesn't immediately mark untouched rows inactive
--    before they've had a chance to be re-matched. (The populate run itself
--    sets last_synced_at = now() for every row it touches; this backfill
--    just ensures any row NOT re-encountered this run still has a sane
--    historical timestamp rather than NULL.)
UPDATE sfl_items SET last_synced_at = now() WHERE last_synced_at IS NULL;
UPDATE sfl_buffs SET last_synced_at = now() WHERE last_synced_at IS NULL;

-- 4. Deduplicate sfl_buffs on (item_id, short_description) before adding the
--    UNIQUE constraint. Keeps the lowest id (oldest/first-inserted row) per
--    natural key, deletes the rest.
WITH ranked AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY item_id, short_description
      ORDER BY id ASC
    ) AS rn
  FROM sfl_buffs
)
DELETE FROM sfl_buffs
WHERE ctid IN (SELECT ctid FROM ranked WHERE rn > 1);

-- 5. Add the UNIQUE constraint now that duplicates are gone.
--    Postgres has no native ADD CONSTRAINT IF NOT EXISTS, so use a DO block.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sfl_buffs_item_id_short_description_key'
  ) THEN
    ALTER TABLE sfl_buffs
      ADD CONSTRAINT sfl_buffs_item_id_short_description_key
      UNIQUE (item_id, short_description);
  END IF;
END $$;

-- 6. Supporting indexes (idempotent; same defs as the fresh-DB schema in
--    populate-buffs-db.ts's SCHEMA_SQL)
CREATE INDEX IF NOT EXISTS idx_sfl_items_is_active ON sfl_items(is_active);
CREATE INDEX IF NOT EXISTS idx_sfl_buffs_is_active ON sfl_buffs(is_active);
