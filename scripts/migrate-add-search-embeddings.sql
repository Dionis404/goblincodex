-- Apply manually via DBeaver as admin before the next run of scripts/index-search.ts
-- Requires the pgvector extension (https://github.com/pgvector/pgvector) to be
-- installed on the Postgres server itself first — CREATE EXTENSION only registers
-- it for this database, it doesn't install the .so; ask the host provider if this fails.
CREATE EXTENSION IF NOT EXISTS vector;

-- One row per indexed entry: content-collection article (guides/mechanics)
-- OR a hand-written reference-table section (collection='reference', entry_id
-- matches one of REF_SECTIONS' id in ReferenceCatalog.tsx, e.g. 'bait'/'marvels').
-- embedding dimension is fixed by the routerai.ru model in use
-- (qwen/qwen3-embedding-4b → 2560); changing embedding models means
-- re-creating this column (ALTER COLUMN TYPE can't resize a vector in place
-- with existing rows) and a full re-index via index-search.ts.
CREATE TABLE IF NOT EXISTS search_embeddings (
  collection   TEXT NOT NULL,           -- 'guides' | 'mechanics' | 'reference'
  entry_id     TEXT NOT NULL,           -- content collection entry id, or REF_SECTIONS id for 'reference'
  title        TEXT NOT NULL,
  embedding    vector(2560) NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection, entry_id)
);

-- IVFFlat needs an estimate of row count to pick list count sensibly; with a
-- few dozen/hundred guide+mechanic articles this is nowhere near the size
-- where an ANN index pays for itself over a plain sequential scan, so no
-- index on `embedding` is created here. Add one (ivfflat or hnsw) if the
-- collection count grows into the thousands.

CREATE TABLE IF NOT EXISTS search_feedback (
  id           SERIAL PRIMARY KEY,
  query        TEXT NOT NULL,
  collection   TEXT NOT NULL,
  entry_id     TEXT NOT NULL,
  rating       SMALLINT NOT NULL CHECK (rating IN (-1, 1)), -- -1 = 👎, 1 = 👍
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
