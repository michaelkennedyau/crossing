import { Hono } from 'hono';
import type { Env } from '../env';
import { cached } from '../lib/kv-cache';
import { completeJson } from '../lib/anthropic';
import { EU_NODES } from '../lib/north-weather';
import { EVENTS_SCHEMA, EVENTS_TTL_SECONDS, buildEventsPrompt, eventsKvKey, sanitizeEvents, type AreaEvent } from '../lib/north-events';

/**
 * Festivals & events near a node — whatson first, model knowledge second. The family's
 * whatson engine (discovered_events, same D1) holds researched, real entries; they lead
 * the list flagged verified. Claude's recurring-events knowledge fills behind, KV-cached
 * a week per node. Passive feed: any failure ⇒ 200 + events: [] — never breaks the bridge.
 */
export const northEventsRouter = new Hono<{ Bindings: Env }>();

// weather-node → whatson city values worth surfacing on that node's card
const NODE_CITIES: Record<string, string[]> = {
  london: ['London'], bled: ['Lake Bled', 'Soča Valley'], hvar: ['Hvar', 'Split'],
  split: ['Split', 'Hvar'], dubrovnik: ['Dubrovnik', 'Hvar'],
};

async function whatsonEvents(env: Env, nodeId: string, nodeName: string): Promise<AreaEvent[]> {
  const cities = NODE_CITIES[nodeId] ?? [nodeName];
  const marks = cities.map(() => '?').join(',');
  const rows = await env.DB.prepare(
    `SELECT title, venue, event_date, description FROM discovered_events ` +
      `WHERE city IN (${marks}) AND status != 'expired' AND (expires_at IS NULL OR expires_at >= date('now')) ` +
      `ORDER BY event_date IS NULL, event_date LIMIT 4`,
  )
    .bind(...cities)
    .all<{ title: string; venue: string | null; event_date: string | null; description: string | null }>()
    .catch(() => ({ results: [] as never[] }));
  return (rows.results ?? []).map((r) => ({
    name: r.title.slice(0, 120),
    where: (r.venue ?? cities[0]).slice(0, 120),
    whenText: (r.event_date ?? 'in the window · whatson').slice(0, 120),
    kind: 'festival' as const,
    note: (r.description ?? '').slice(0, 240),
  }));
}

northEventsRouter.get('/', async (c) => {
  const nodeId = c.req.query('node') ?? '';
  const node = EU_NODES.find((n) => n.id === nodeId);
  if (!node) return c.json({ events: [], error: 'unknown node' }, 400);

  const real = await whatsonEvents(c.env, node.id, node.name);

  if (!c.env.ANTHROPIC_API_KEY) return c.json({ events: real, reason: real.length ? undefined : 'offline' });
  const apiKey = c.env.ANTHROPIC_API_KEY;
  try {
    const { value } = await cached<AreaEvent[]>(c.env.KV, eventsKvKey(node.id), EVENTS_TTL_SECONDS, async () => {
      const { system, user } = buildEventsPrompt(node.name, node.country);
      const raw = await completeJson<unknown>(apiKey, { system, user, schema: EVENTS_SCHEMA });
      return sanitizeEvents(raw);
    });
    // whatson rows lead; model rows that duplicate a real title fall away
    const seen = new Set(real.map((e) => e.name.toLowerCase().slice(0, 24)));
    const merged = [...real, ...value.filter((e) => !seen.has(e.name.toLowerCase().slice(0, 24)))].slice(0, 6);
    return c.json({ events: merged, verify: 'whatson entries are researched · the rest is model knowledge — verify before booking' });
  } catch {
    return c.json({ events: real, reason: real.length ? undefined : 'unavailable' });
  }
});
