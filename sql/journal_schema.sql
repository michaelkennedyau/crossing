-- IL VARO — THE JOURNAL: the lived record of the Aug–Sep 2026 crossing.
-- Prefixed journal_* tables on the SHARED brain D1 (varo-family-brain), IF NOT EXISTS,
-- applied OUTSIDE the wrangler migration ledger (same posture as north_schema.sql):
--   wrangler d1 execute varo-family-brain --remote --file=sql/journal_schema.sql
-- House rules: soft-delete only (enabled=0, never DELETE), bound params everywhere.

-- Days as chapters. body is a typed JSON block array parsed server-side from the
-- line grammar; threads is a JSON tag array; public=1 publishes the chapter to the
-- tokenless variant; closer is the deadpan sign-off, rendered un-explained.
CREATE TABLE IF NOT EXISTS journal_chapters (
  id          TEXT PRIMARY KEY,            -- slug: 'ch03-portofino'
  day_date    TEXT NOT NULL DEFAULT '',    -- ISO '2026-08-23' ('' for non-day pages)
  title       TEXT NOT NULL,
  voice       TEXT NOT NULL DEFAULT '',    -- italic subline
  body        TEXT NOT NULL DEFAULT '[]',  -- JSON block array
  threads     TEXT NOT NULL DEFAULT '[]',  -- JSON tags: ["doctrine","water"]
  closer      TEXT NOT NULL DEFAULT '',
  public      INTEGER NOT NULL DEFAULT 0,
  sort        INTEGER NOT NULL DEFAULT 0,
  enabled     INTEGER NOT NULL DEFAULT 1,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Photos. R2 keys are uuid-derived (journal/<id>/{1280,1920}.<fmt>, orig.<ext>) so a
-- chapter reassignment is one UPDATE here, never an R2 copy. chapter_id '' = inbox.
-- has_orig flags the ship-wifi debt: variants uploaded now, original deferred.
CREATE TABLE IF NOT EXISTS journal_assets (
  id          TEXT PRIMARY KEY,            -- uuid
  chapter_id  TEXT NOT NULL DEFAULT '',
  fmt         TEXT NOT NULL DEFAULT 'webp',
  w           INTEGER NOT NULL DEFAULT 0,
  h           INTEGER NOT NULL DEFAULT 0,
  lqip        TEXT NOT NULL DEFAULT '',    -- data: URI, ~600B
  caption     TEXT NOT NULL DEFAULT '',
  taken_at    TEXT NOT NULL DEFAULT '',    -- EXIF DateTimeOriginal, ISO
  has_orig    INTEGER NOT NULL DEFAULT 0,
  sort        INTEGER NOT NULL DEFAULT 0,
  enabled     INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Site doc (title, hero, essay, cast, thread blurbs, indexable flag) — house single-row shape.
CREATE TABLE IF NOT EXISTS journal_meta (
  id          TEXT PRIMARY KEY,
  json        TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- The future-trip feed: doctrine, corollaries, screens, contacts, ledger, protocols —
-- curated, structured, one SELECT away from any future planning session.
CREATE TABLE IF NOT EXISTS journal_intel (
  id          TEXT PRIMARY KEY,
  json        TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
