-- LA TRAVERSATA — the gift document, one row per audience mode, each with its own
-- unguessable share token (traversata.varo.au/<token> renders ONLY that mode).
-- Prefixed table on the SHARED brain D1 (varo-family-brain), IF NOT EXISTS, applied
-- OUTSIDE the wrangler migration ledger (same posture as journal_schema.sql):
--   wrangler d1 execute varo-family-brain --remote --file=sql/traversata_schema.sql
-- House rules: soft-delete only (enabled=0, never DELETE), bound params everywhere.
-- No open-tracking columns, by design — the gift travels without a receipt.

CREATE TABLE IF NOT EXISTS traversata_modes (
  key         TEXT PRIMARY KEY,            -- 'davi' | 'kids' | 'elders' | 'friends'
  token       TEXT NOT NULL UNIQUE,        -- 24-hex share token; rotate to revoke a link
  json        TEXT NOT NULL,               -- {label, star, dedication, summary, long, glossary[], programme}
  enabled     INTEGER NOT NULL DEFAULT 1,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Guest links: every SEND mints its own token via the dispatch desk's dropdown.
-- Softly trackable (opened count + first/last stamps, nothing about the viewer)
-- and individually cancellable (enabled=0) without touching the room or other sends.
CREATE TABLE IF NOT EXISTS traversata_grants (
  token         TEXT PRIMARY KEY,            -- 24-hex unique url per recipient
  mode_key      TEXT NOT NULL,               -- which edition
  note          TEXT NOT NULL DEFAULT '',    -- who it went to: 'Aurora', 'Mum', 'the chat'
  opened_count  INTEGER NOT NULL DEFAULT 0,
  first_opened  TEXT NOT NULL DEFAULT '',
  last_opened   TEXT NOT NULL DEFAULT '',
  enabled       INTEGER NOT NULL DEFAULT 1,  -- 0 = cancelled
  created_by    TEXT NOT NULL DEFAULT '',    -- 'm' | 'c'
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
