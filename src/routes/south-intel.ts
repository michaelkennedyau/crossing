import { Hono } from 'hono';
import type { Env } from '../env';

/**
 * The south verdict — an editable document (D1 south_intel, seeded from
 * sql/south_intel_seed.sql) so the page's honest read of the mountain updates
 * without a deploy. No row is just { intel: null }.
 */
export const southIntelRouter = new Hono<{ Bindings: Env }>();

southIntelRouter.get('/', async (c) => {
  const row = await c.env.DB.prepare('SELECT json, updated_at FROM south_intel WHERE id=?')
    .bind('v1')
    .first<{ json: string; updated_at: string }>()
    .catch(() => null);
  if (!row) return c.json({ intel: null });
  try {
    return c.json({ intel: JSON.parse(row.json) as unknown, updatedAt: row.updated_at });
  } catch {
    return c.json({ intel: null });
  }
});
