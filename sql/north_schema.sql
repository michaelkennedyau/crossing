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

-- Per-arc overrides/additions. json is a FULL Arc object (same shape as
-- web/src/north/planner/cfg.ts Arc); rows replace the TS default by id — the same
-- replace-by-id semantics mergeCfg already has. enabled=0 soft-hides an arc (never DELETE
-- in the shared DB). JSON-per-arc rather than relational segments on purpose: the Worker
-- never computes over arc internals (all cost math is client-side), so D1 is purely a
-- durable, live-editable store and a join+reassembly layer would buy nothing.
CREATE TABLE IF NOT EXISTS north_arcs (
  id          TEXT PRIMARY KEY,
  json        TEXT NOT NULL,
  sort        INTEGER NOT NULL DEFAULT 0,
  enabled     INTEGER NOT NULL DEFAULT 1,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- The fixed spine as a single JSON row: { nightsTotal, landIso, departIso, notes }.
-- Only nightsTotal is consumed by the client today; the rest is documentation-grade.
CREATE TABLE IF NOT EXISTS north_spine (
  id          TEXT PRIMARY KEY DEFAULT 'default',
  json        TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- The shared idea board: anything either traveller pins (a destination, a hotel, an event, a
-- stray thought) lands here. Soft-delete only (enabled=0) — shared brain DB, nothing destroyed.
CREATE TABLE IF NOT EXISTS north_pins (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL,             -- destination | hotel | event | note
  node        TEXT NOT NULL DEFAULT '',  -- weather-node id it belongs to ('' = general)
  title       TEXT NOT NULL,
  detail      TEXT NOT NULL DEFAULT '',
  url         TEXT NOT NULL DEFAULT '',
  who         TEXT NOT NULL DEFAULT '',  -- michael | claire
  enabled     INTEGER NOT NULL DEFAULT 1,
  sort        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Outlook history: every FRESH Claude read is appended here (the 3-hour cache means ≤8 rows/day).
-- This is how insights track over time — deltas per arc, and one day a sparkline of the fortnight's
-- opinion of itself. Append-only.
CREATE TABLE IF NOT EXISTS north_outlook_log (
  id          TEXT PRIMARY KEY,          -- ISO timestamp of generation
  json        TEXT NOT NULL,             -- the full Outlook payload
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- The recommended itinerary — one versioned JSON document (stops, days, hotels, dos),
-- researched by the multi-agent fleet and replaced wholesale on PUT. id 'v1' is the live one.
CREATE TABLE IF NOT EXISTS north_itinerary (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
