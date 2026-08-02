import { Hono } from 'hono';
import type { Env } from '../env';
import { cached } from '../lib/kv-cache';
import { completeJson } from '../lib/anthropic';
import { EU_NODES } from '../lib/north-weather';
import { EVENTS_SCHEMA, EVENTS_TTL_SECONDS, buildEventsPrompt, eventsKvKey, sanitizeEvents, type AreaEvent } from '../lib/north-events';

/**
 * Festivals & events near a node — Claude knowledge, structured, KV-cached a week per node.
 * Passive feed: no key / failure ⇒ 200 + events: [] — a card never breaks the bridge.
 */
export const northEventsRouter = new Hono<{ Bindings: Env }>();

northEventsRouter.get('/', async (c) => {
  const nodeId = c.req.query('node') ?? '';
  const node = EU_NODES.find((n) => n.id === nodeId);
  if (!node) return c.json({ events: [], error: 'unknown node' }, 400);
  if (!c.env.ANTHROPIC_API_KEY) return c.json({ events: [], reason: 'offline' });
  const apiKey = c.env.ANTHROPIC_API_KEY;
  try {
    const { value } = await cached<AreaEvent[]>(c.env.KV, eventsKvKey(node.id), EVENTS_TTL_SECONDS, async () => {
      const { system, user } = buildEventsPrompt(node.name, node.country);
      const raw = await completeJson<unknown>(apiKey, { system, user, schema: EVENTS_SCHEMA });
      return sanitizeEvents(raw);
    });
    return c.json({ events: value, verify: 'dates are from model knowledge — verify before booking' });
  } catch {
    return c.json({ events: [], reason: 'unavailable' });
  }
});
