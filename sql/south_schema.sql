-- The south watch — append-only log of pass-status checks (Los Libertadores, the
-- Portillo road, Cardenal Samoré). One row per cron check; id is the ISO timestamp.
CREATE TABLE IF NOT EXISTS south_pass_log (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
