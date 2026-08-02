import { Hono } from 'hono';
import type { Env } from '../env';
import { isArcLike, type Arc } from '../../web/src/north/planner/cfg';

/**
 * The North's arc/spine store — the cfg-override pattern promoted to per-arc rows. Canonical
 * arc defaults stay in the client TS (web/src/north/planner/cfg.ts); D1 (north_arcs) holds
 * full-Arc override rows that replace by id, plus a single north_spine row. GET returns both;
 * the client merges over its defaults via mergeCfg. DELETE soft-hides (enabled=0) — nothing
 * is ever destroyed in the shared brain DB. Writes are open like PUT /api/north/cfg — the
 * site's standing no-auth posture for a private family domain.
 */
export const northArcsRouter = new Hono<{ Bindings: Env }>();

// The Phase-3 outlook is computed from the arc set — bust its cache on any write.
const OUTLOOK_KV_KEY = 'north-outlook:v1';

interface SpineOverride {
  nightsTotal?: number;
  landIso?: string;
  departIso?: string;
  notes?: string;
}

northArcsRouter.get('/', async (c) => {
  const [arcRows, spineRow] = await Promise.all([
    c.env.DB.prepare('SELECT id, json FROM north_arcs WHERE enabled=1 ORDER BY sort, id')
      .all<{ id: string; json: string }>()
      .then((r) => r.results ?? [])
      .catch(() => [] as { id: string; json: string }[]),
    c.env.DB.prepare("SELECT json FROM north_spine WHERE id='default'")
      .first<{ json: string }>()
      .catch(() => null),
  ]);

  const arcs: Record<string, Arc> = {};
  for (const row of arcRows) {
    try {
      const parsed = JSON.parse(row.json) as unknown;
      if (isArcLike(parsed)) arcs[row.id] = parsed;
    } catch {
      /* skip malformed rows — the client falls back to its TS default for that id */
    }
  }

  let spine: SpineOverride | null = null;
  if (spineRow) {
    try {
      spine = JSON.parse(spineRow.json) as SpineOverride;
    } catch {
      spine = null;
    }
  }

  return c.json({ arcs, spine });
});

// PUT /spine before /:id so 'spine' isn't swallowed by the param route.
northArcsRouter.put('/spine', async (c) => {
  const body = (await c.req.json().catch(() => null)) as SpineOverride | null;
  if (!body || typeof body !== 'object') return c.json({ ok: false, error: 'invalid body' }, 400);
  if (body.nightsTotal !== undefined && !Number.isFinite(body.nightsTotal)) {
    return c.json({ ok: false, error: 'nightsTotal must be a number' }, 400);
  }
  await c.env.DB.prepare(
    "INSERT INTO north_spine (id, json, updated_at) VALUES ('default', ?, datetime('now')) " +
      'ON CONFLICT(id) DO UPDATE SET json=excluded.json, updated_at=datetime(\'now\')',
  )
    .bind(JSON.stringify(body))
    .run();
  c.env.KV.delete(OUTLOOK_KV_KEY).catch(() => {});
  return c.json({ ok: true });
});

northArcsRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = (await c.req.json().catch(() => null)) as unknown;
  if (!isArcLike(body)) return c.json({ ok: false, error: 'not a valid arc' }, 400);
  await c.env.DB.prepare(
    'INSERT INTO north_arcs (id, json, enabled, updated_at) VALUES (?, ?, 1, datetime(\'now\')) ' +
      'ON CONFLICT(id) DO UPDATE SET json=excluded.json, enabled=1, updated_at=datetime(\'now\')',
  )
    .bind(id, JSON.stringify({ ...body, id }))
    .run();
  c.env.KV.delete(OUTLOOK_KV_KEY).catch(() => {});
  return c.json({ ok: true });
});

northArcsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare("UPDATE north_arcs SET enabled=0, updated_at=datetime('now') WHERE id=?")
    .bind(id)
    .run();
  c.env.KV.delete(OUTLOOK_KV_KEY).catch(() => {});
  return c.json({ ok: true });
});
