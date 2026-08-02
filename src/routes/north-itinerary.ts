import { Hono } from 'hono';
import type { Env } from '../env';

/**
 * The recommended itinerary — a single JSON document (stops → days/hotels/eat/do/events),
 * written by the research fleet and read by the bridge's itinerary card. PUT replaces v1
 * wholesale; open write like the rest of the north API — private family site. GET never
 * fails the bridge: no row is just { itinerary: null }.
 */
export const northItineraryRouter = new Hono<{ Bindings: Env }>();

northItineraryRouter.get('/', async (c) => {
  const row = await c.env.DB.prepare('SELECT json, updated_at FROM north_itinerary WHERE id=?')
    .bind('v1')
    .first<{ json: string; updated_at: string }>()
    .catch(() => null);
  if (!row) return c.json({ itinerary: null });
  try {
    return c.json({ itinerary: JSON.parse(row.json) as unknown, updatedAt: row.updated_at });
  } catch {
    return c.json({ itinerary: null });
  }
});

northItineraryRouter.put('/', async (c) => {
  const body = (await c.req.json().catch(() => null)) as { title?: string; stops?: unknown[] } | null;
  if (!body || typeof body.title !== 'string' || !Array.isArray(body.stops) || !body.stops.length)
    return c.json({ ok: false, error: 'title and stops required' }, 400);
  const json = JSON.stringify(body);
  if (json.length > 200_000) return c.json({ ok: false, error: 'too large' }, 400);
  await c.env.DB.prepare(
    "INSERT INTO north_itinerary (id, json, updated_at) VALUES ('v1', ?, datetime('now')) " +
      "ON CONFLICT(id) DO UPDATE SET json=excluded.json, updated_at=datetime('now')",
  )
    .bind(json)
    .run();
  return c.json({ ok: true });
});
