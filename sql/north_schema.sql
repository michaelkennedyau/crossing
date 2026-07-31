-- IL VARO — "The North": persistence on the SHARED brain D1 (varo-family-brain).
-- Prefixed north_* tables only, created with IF NOT EXISTS so this is non-destructive to brain.
-- Applied OUTSIDE the wrangler migration system (the shared d1_migrations ledger already holds
-- brain's 0001–0076, which would cause a numbered migration here to be skipped):
--   wrangler d1 execute varo-family-brain --remote --file=sql/north_schema.sql

CREATE TABLE IF NOT EXISTS north_todos (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  checked     INTEGER NOT NULL DEFAULT 0,
  sort        INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Single tunable CFG row (the Planner assumptions as JSON) so figures can be corrected
-- live without a redeploy. Seeded from the client CFG on first read.
CREATE TABLE IF NOT EXISTS north_cfg (
  id          TEXT PRIMARY KEY DEFAULT 'default',
  json        TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
