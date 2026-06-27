import { Hono } from 'hono';
import type { Env } from '../env';
import { cached } from '../lib/kv-cache';
import { parseLatestOni } from '../lib/oni';

const ONI_URL = 'https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt';

export const ensoRouter = new Hono<{ Bindings: Env }>();

// Live ONI → the model default + the ENSO gauge. KV-cached 24h; never blocks paint (the client
// tweens it in). Falls back to the design's +1.5 if NOAA is unreachable.
ensoRouter.get('/', async (c) => {
  try {
    const { value, cached: hit } = await cached(c.env.KV, 'enso', 86_400, async () => {
      const res = await fetch(ONI_URL);
      if (!res.ok) throw new Error(`cpc ${res.status}`);
      const { oni, season, year } = parseLatestOni(await res.text());
      return { oni, season, year, updated: Date.now() };
    });
    return c.json({ ...value, cached: hit });
  } catch {
    return c.json({ oni: 1.5, season: '', year: '', updated: Date.now(), fallback: true });
  }
});
