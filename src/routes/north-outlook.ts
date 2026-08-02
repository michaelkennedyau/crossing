import { Hono } from 'hono';
import type { Env } from '../env';
import { cached } from '../lib/kv-cache';
import { completeJson } from '../lib/anthropic';
import { fetchNorthWeather } from '../lib/north-weather';
import {
  OUTLOOK_KV_KEY, OUTLOOK_SCHEMA, OUTLOOK_TTL_SECONDS,
  buildOutlookPrompt, sanitizeOutlook, type Outlook,
} from '../lib/north-outlook';
import { CFG, mergeCfg, isArcLike, type Arc } from '../../web/src/north/planner/cfg';

/**
 * The state of the fortnight — the live board + the arcs, re-processed through Claude into a
 * ranked outlook. Aggressively KV-cached (3 h) so the token spend is bounded (~$0.07/call at
 * claude-opus-5, ≤8 calls/day); the weather inside it reuses the board's own 30-min cache entry.
 * This is a PASSIVE feed rendered as a card, so "no key" and "upstream broke" are both 200 +
 * outlook:null — a Claude 5xx/refusal must never break the bridge. (The concierge keeps its 503:
 * that's a user action.) POST /refresh is open, like PUT /api/north/cfg — private family site.
 */
export const northOutlookRouter = new Hono<{ Bindings: Env }>();

interface OutlookPayload {
  outlook: Outlook;
  generatedAt: string;
  trend?: Record<string, number>;
}

async function mergedCfg(env: Env) {
  // Same composition as the client: D1 arc rows replace TS defaults by id.
  const rows = await env.DB.prepare('SELECT id, json FROM north_arcs WHERE enabled=1 ORDER BY sort, id')
    .all<{ id: string; json: string }>()
    .then((r) => r.results ?? [])
    .catch(() => [] as { id: string; json: string }[]);
  const arcs: Record<string, Arc> = {};
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.json) as unknown;
      if (isArcLike(parsed)) arcs[row.id] = parsed;
    } catch { /* skip */ }
  }
  return mergeCfg(CFG, { arcs });
}

northOutlookRouter.get('/', async (c) => {
  if (!c.env.ANTHROPIC_API_KEY) return c.json({ outlook: null, reason: 'offline' });
  const apiKey = c.env.ANTHROPIC_API_KEY;
  try {
    const { value, cached: hit } = await cached<OutlookPayload>(
      c.env.KV,
      OUTLOOK_KV_KEY,
      OUTLOOK_TTL_SECONDS,
      async () => {
        const [{ value: nodes }, cfg] = await Promise.all([
          cached(c.env.KV, 'north-wx', 1800, fetchNorthWeather),
          mergedCfg(c.env),
        ]);
        const { system, user } = buildOutlookPrompt(nodes, cfg, new Date().toISOString());
        const raw = await completeJson<unknown>(apiKey, { system, user, schema: OUTLOOK_SCHEMA });
        const outlook = sanitizeOutlook(raw, Object.keys(cfg.arcs));
        if (!outlook) throw new Error('outlook failed sanitize');
        const generatedAt = new Date().toISOString();
        // trend: compare against the last logged read, then append this one (append-only history)
        const prev = await c.env.DB.prepare('SELECT json FROM north_outlook_log ORDER BY id DESC LIMIT 1')
          .first<{ json: string }>()
          .catch(() => null);
        const trend: Record<string, number> = {};
        if (prev) {
          try {
            const p = JSON.parse(prev.json) as { outlook?: { ranking?: { arc: string; score: number }[] } };
            const prevScores = new Map((p.outlook?.ranking ?? []).map((r) => [r.arc, r.score]));
            for (const r of outlook.ranking) {
              const was = prevScores.get(r.arc);
              if (typeof was === 'number') trend[r.arc] = r.score - was;
            }
          } catch { /* first read */ }
        }
        const payload = { outlook, generatedAt, trend };
        await c.env.DB.prepare('INSERT OR REPLACE INTO north_outlook_log (id, json) VALUES (?, ?)')
          .bind(generatedAt, JSON.stringify(payload))
          .run()
          .catch(() => {});
        return payload;
      },
    );
    return c.json({ ...value, cached: hit });
  } catch {
    return c.json({ outlook: null, reason: 'unavailable' });
  }
});

northOutlookRouter.post('/refresh', async (c) => {
  await c.env.KV.delete(OUTLOOK_KV_KEY).catch(() => {});
  return c.json({ ok: true });
});
