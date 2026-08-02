import { Hono } from 'hono';
import type { Env } from '../env';

/**
 * The shared idea board — pins from either traveller (destinations, hotels, events, notes)
 * persisted to north_pins on the shared brain D1. DELETE soft-hides (enabled=0); nothing is
 * ever destroyed. Writes are open like the rest of the north API — private family site.
 */
export const northPinsRouter = new Hono<{ Bindings: Env }>();

northPinsRouter.get('/', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT id, kind, node, title, detail, url, who, sort, created_at FROM north_pins WHERE enabled=1 ORDER BY sort, created_at',
  )
    .all<{ id: string; kind: string; node: string; title: string; detail: string; url: string; who: string; sort: number; created_at: string }>()
    .catch(() => ({ results: [] as never[] }));
  return c.json({ pins: rows.results ?? [] });
});

northPinsRouter.post('/', async (c) => {
  const b = (await c.req.json().catch(() => null)) as
    | { id?: string; kind?: string; node?: string; title?: string; detail?: string; url?: string; who?: string; sort?: number }
    | null;
  if (!b || typeof b.id !== 'string' || typeof b.title !== 'string' || !b.title.trim())
    return c.json({ ok: false, error: 'id and title required' }, 400);
  // urls become hrefs on the board — only ever http(s), or nothing
  if (b.url) {
    try {
      const u = new URL(b.url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return c.json({ ok: false, error: 'bad url' }, 400);
    } catch {
      return c.json({ ok: false, error: 'bad url' }, 400);
    }
  }
  const kind = ['destination', 'hotel', 'event', 'note', 'insight'].includes(b.kind ?? '') ? b.kind : 'note';
  await c.env.DB.prepare(
    'INSERT INTO north_pins (id, kind, node, title, detail, url, who, enabled, sort, created_at) ' +
      "VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now')) " +
      'ON CONFLICT(id) DO UPDATE SET kind=excluded.kind, node=excluded.node, title=excluded.title, ' +
      "detail=excluded.detail, url=excluded.url, who=excluded.who, enabled=1, sort=excluded.sort",
  )
    .bind(b.id, kind, b.node ?? '', b.title.slice(0, 200), (b.detail ?? '').slice(0, 500), (b.url ?? '').slice(0, 300), b.who ?? '', b.sort ?? 0)
    .run();
  return c.json({ ok: true });
});

northPinsRouter.delete('/:id', async (c) => {
  await c.env.DB.prepare("UPDATE north_pins SET enabled=0 WHERE id=?").bind(c.req.param('id')).run();
  return c.json({ ok: true });
});
