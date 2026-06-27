import { Hono } from 'hono';
import type { Env } from '../env';

/**
 * The Plotting Table's tunable assumptions. The canonical CFG defaults live in the client
 * (web/src/plotting/cfg.ts, ported from plotting-table.html and unit-tested). This endpoint stores
 * an optional OVERRIDE in D1 (crossing_cfg) so figures can be corrected live without a redeploy; the
 * client merges the override over its defaults. GET returns the override (or null).
 */
export const cfgRouter = new Hono<{ Bindings: Env }>();

cfgRouter.get('/', async (c) => {
  const row = await c.env.DB.prepare("SELECT json FROM crossing_cfg WHERE id='default'")
    .first<{ json: string }>()
    .catch(() => null);
  if (!row) return c.json({ override: null });
  try {
    return c.json({ override: JSON.parse(row.json) });
  } catch {
    return c.json({ override: null });
  }
});

cfgRouter.put('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object') return c.json({ ok: false, error: 'invalid body' }, 400);
  await c.env.DB.prepare(
    "INSERT INTO crossing_cfg (id, json, updated_at) VALUES ('default', ?, datetime('now')) " +
      'ON CONFLICT(id) DO UPDATE SET json=excluded.json, updated_at=datetime(\'now\')',
  )
    .bind(JSON.stringify(body))
    .run();
  return c.json({ ok: true });
});
