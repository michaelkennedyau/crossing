import { Hono } from 'hono';
import type { Env } from '../env';

/**
 * The North Planner's tunable assumptions. The canonical CFG defaults live in the client
 * (web/src/north/planner/cfg.ts, unit-tested). This endpoint stores an optional OVERRIDE in D1
 * (north_cfg) so figures can be corrected live without a redeploy; the client merges the override
 * over its defaults. GET returns the override (or null).
 */
export const northCfgRouter = new Hono<{ Bindings: Env }>();

northCfgRouter.get('/', async (c) => {
  const row = await c.env.DB.prepare("SELECT json FROM north_cfg WHERE id='default'")
    .first<{ json: string }>()
    .catch(() => null);
  if (!row) return c.json({ override: null });
  try {
    return c.json({ override: JSON.parse(row.json) });
  } catch {
    return c.json({ override: null });
  }
});

northCfgRouter.put('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object') return c.json({ ok: false, error: 'invalid body' }, 400);
  await c.env.DB.prepare(
    "INSERT INTO north_cfg (id, json, updated_at) VALUES ('default', ?, datetime('now')) " +
      'ON CONFLICT(id) DO UPDATE SET json=excluded.json, updated_at=datetime(\'now\')',
  )
    .bind(JSON.stringify(body))
    .run();
  return c.json({ ok: true });
});
