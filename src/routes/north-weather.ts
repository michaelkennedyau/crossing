import { Hono } from 'hono';
import type { Env } from '../env';
import { cached } from '../lib/kv-cache';
import { fetchNorthWeather } from '../lib/north-weather';

export const northWeatherRouter = new Hono<{ Bindings: Env }>();

// The board's live feed — every candidate node in one batched call, KV-cached 30 minutes.
northWeatherRouter.get('/', async (c) => {
  try {
    const { value: nodes } = await cached(c.env.KV, 'north-wx', 1800, fetchNorthWeather);
    return c.json({ nodes });
  } catch {
    return c.json({ nodes: [], error: 'unavailable' });
  }
});
