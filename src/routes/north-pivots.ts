import { Hono } from 'hono';
import type { Env } from '../env';

/**
 * Grab-and-go pivot plans — one per non-committed board destination, researched by the
 * fleet and stored in whatson's curated_experiences (id crossing-pivot-<node>, guide
 * 'crossing', category 'pivot', full JSON in highlights). The board's deep cards read
 * them here. No row is just { pivot: null } — a card never breaks.
 */
export const northPivotsRouter = new Hono<{ Bindings: Env }>();

northPivotsRouter.get('/', async (c) => {
  const node = c.req.query('node') ?? '';
  if (!/^[a-z-]{2,24}$/.test(node)) return c.json({ pivot: null, error: 'bad node' }, 400);
  const row = await c.env.DB.prepare("SELECT highlights FROM curated_experiences WHERE id=? AND category='pivot'")
    .bind(`crossing-pivot-${node}`)
    .first<{ highlights: string }>()
    .catch(() => null);
  if (!row) return c.json({ pivot: null });
  try {
    return c.json({ pivot: JSON.parse(row.highlights) as unknown });
  } catch {
    return c.json({ pivot: null });
  }
});
