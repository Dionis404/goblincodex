-- Apply manually via DBeaver as admin before the first run of populate-buffs-db.ts
-- (Only needed if sfl_items table already exists without the sprite column)
ALTER TABLE sfl_items ADD COLUMN IF NOT EXISTS sprite TEXT;
