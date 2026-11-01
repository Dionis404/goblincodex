-- Apply manually via DBeaver as admin.
--
-- Moves the telegram_posts / telegram_stats DDL out of the app runtime
-- (src/lib/db.ts used to CREATE TABLE IF NOT EXISTS on first request) into
-- migrations, so the full schema lives in scripts/migrate-*.sql like the
-- rest. Safe to re-run: IF NOT EXISTS everywhere, and existing prod data is
-- untouched.

BEGIN;

CREATE TABLE IF NOT EXISTS telegram_posts (
  id           BIGINT PRIMARY KEY,
  message_date TIMESTAMPTZ NOT NULL,
  text         TEXT NOT NULL,
  image_url    TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS telegram_stats (
  channel      TEXT PRIMARY KEY,
  subscribers  INTEGER NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
