-- Apply manually via DBeaver as admin before the next run of populate-buffs-db.ts
-- (Only needed if sfl_items already exists without this column;
--  populate-buffs-db.ts now also creates it from scratch on every run)
ALTER TABLE sfl_items ADD COLUMN IF NOT EXISTS game_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_sfl_items_game_id ON sfl_items(game_id);
