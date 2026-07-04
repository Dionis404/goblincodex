-- Apply manually via DBeaver as admin before the next run of populate-buffs-db.ts
-- (Only needed if sfl_buffs/sfl_items already exist without these columns;
--  populate-buffs-db.ts now also creates them from scratch on every run)
ALTER TABLE sfl_buffs ADD COLUMN IF NOT EXISTS short_description_ru TEXT;
ALTER TABLE sfl_buffs ADD COLUMN IF NOT EXISTS affected_stat TEXT;
ALTER TABLE sfl_items ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_sfl_buffs_affected_stat ON sfl_buffs(affected_stat);
CREATE INDEX IF NOT EXISTS idx_sfl_items_tags ON sfl_items USING GIN(tags);
