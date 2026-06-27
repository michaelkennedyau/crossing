import { Hono } from 'hono';
import type { Env } from '../env';
import { cached } from '../lib/kv-cache';
import { fetchNodes } from '../lib/weather';

export const weatherRouter = new Hono<{ Bindings: Env }>();

// Live conditions at the 3 nodes (pass status / snow rate / freezing level). KV-cached 1h.
weatherRouter.get('/', async (c) => {
  try {
    const { value, cached: hit } = await cached(c.env.KV, 'weather', 3_600, async () => ({
      nodes: await fetchNodes(),
      updated: Date.now(),
    }));
    return c.json({ ...value, cached: hit });
  } catch {
    return c.json({ nodes: [], updated: Date.now(), error: 'unavailable' });
  }
});
