import { Hono } from 'hono';
import type { Env } from '../env';

/**
 * The crossing checklist — persisted to crossing_todos on the shared brain D1 so it survives reload
 * and follows across devices. The client owns the canonical item list (stable ids); this stores the
 * checked-state. Direct prepared statements (brain's pattern); upsert on toggle.
 */
export const todosRouter = new Hono<{ Bindings: Env }>();

todosRouter.get('/', async (c) => {
  const rows = await c.env.DB.prepare('SELECT id, label, checked, sort FROM crossing_todos ORDER BY sort')
    .all<{ id: string; label: string; checked: number; sort: number }>()
    .catch(() => ({ results: [] as { id: string; label: string; checked: number; sort: number }[] }));
  return c.json({ todos: rows.results ?? [] });
});

todosRouter.post('/', async (c) => {
  const b = (await c.req.json().catch(() => null)) as
    | { id?: string; label?: string; checked?: boolean; sort?: number }
    | null;
  if (!b || typeof b.id !== 'string') return c.json({ ok: false, error: 'id required' }, 400);
  await c.env.DB.prepare(
    'INSERT INTO crossing_todos (id, label, checked, sort, updated_at) ' +
      "VALUES (?, ?, ?, ?, datetime('now')) " +
      'ON CONFLICT(id) DO UPDATE SET checked=excluded.checked, label=excluded.label, ' +
      "sort=excluded.sort, updated_at=datetime('now')",
  )
    .bind(b.id, b.label ?? '', b.checked ? 1 : 0, b.sort ?? 0)
    .run();
  return c.json({ ok: true });
});
