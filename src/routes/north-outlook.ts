import { Hono } from 'hono';
import type { Env } from '../env';
import { cached } from '../lib/kv-cache';
import { completeJson } from '../lib/anthropic';
import { fetchNorthWeather } from '../lib/north-weather';
import {
  OUTLOOK_KV_KEY, OUTLOOK_SCHEMA, ageHours, isStale,
  buildOutlookPrompt, sanitizeOutlook, type Outlook,
} from '../lib/north-outlook';
import { CFG, mergeCfg, isArcLike, type Arc } from '../../web/src/north/planner/cfg';

/**
 * The state of the fortnight — the live board + the arcs, re-processed through Claude into a
 * ranked outlook. The GET always serves the last read instantly (KV, falling back to the D1
 * log) with an honest staleness flag; ALL regeneration lives in the 3-hourly cron
 * (src/worker.ts scheduled — 15-min budget) because a post-response waitUntil gets cancelled
 * ~30 s in, mid-Claude-call. Opening the bridge never waits on a model call.
 * This is a PASSIVE feed rendered as a card, so "no key" and "upstream broke" are both 200 +
 * outlook:null — a Claude 5xx/refusal must never break the bridge. (The concierge keeps its 503:
 * that's a user action.) POST /refresh is open, like PUT /api/north/cfg — private family site.
 */
export const northOutlookRouter = new Hono<{ Bindings: Env }>();

const LOCK_KEY = 'north-outlook:lock';

export interface OutlookPayloadStored {
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

/** the full regeneration: live board → Claude re-rank → trend vs the log → log + KV latest */
export async function produceOutlook(env: Env, apiKey: string): Promise<OutlookPayloadStored> {
  const [{ value: nodes }, cfg] = await Promise.all([
    cached(env.KV, 'north-wx', 1800, fetchNorthWeather),
    mergedCfg(env),
  ]);
  const { system, user } = buildOutlookPrompt(nodes, cfg, new Date().toISOString());
  const raw = await completeJson<unknown>(apiKey, { system, user, schema: OUTLOOK_SCHEMA });
  const outlook = sanitizeOutlook(raw, Object.keys(cfg.arcs));
  if (!outlook) throw new Error('outlook failed sanitize');
  const generatedAt = new Date().toISOString();
  // trend: compare against the last logged read, then append this one (append-only history)
  const prev = await env.DB.prepare('SELECT json FROM north_outlook_log ORDER BY id DESC LIMIT 1')
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
  const payload: OutlookPayloadStored = { outlook, generatedAt, trend };
  await env.DB.prepare('INSERT OR REPLACE INTO north_outlook_log (id, json) VALUES (?, ?)')
    .bind(generatedAt, JSON.stringify(payload))
    .run()
    .catch(() => {});
  await env.KV.put(OUTLOOK_KV_KEY, JSON.stringify(payload)).catch(() => {});
  return payload;
}

/** last stored read: KV latest first, D1 log as the durable fallback */
async function lastStored(env: Env): Promise<OutlookPayloadStored | null> {
  const kv = await env.KV.get<OutlookPayloadStored>(OUTLOOK_KV_KEY, 'json').catch(() => null);
  if (kv?.outlook) return kv;
  const row = await env.DB.prepare('SELECT json FROM north_outlook_log ORDER BY id DESC LIMIT 1')
    .first<{ json: string }>()
    .catch(() => null);
  if (!row) return null;
  try {
    const p = JSON.parse(row.json) as OutlookPayloadStored;
    return p?.outlook ? p : null;
  } catch {
    return null;
  }
}

// Instant, always: serve the last stored read with an honest age. Regeneration is the
// cron's job (a waitUntil here gets cancelled ~30 s in, mid-Claude-call — learned live).
northOutlookRouter.get('/', async (c) => {
  if (!c.env.ANTHROPIC_API_KEY) return c.json({ outlook: null, reason: 'offline' });
  const stored = await lastStored(c.env);
  if (!stored) return c.json({ outlook: null, reason: 'warming — first read lands on the next cron' });
  return c.json({
    ...stored,
    cached: true,
    stale: isStale(stored.generatedAt),
    ageHours: Math.round(ageHours(stored.generatedAt) * 10) / 10,
  });
});

// Explicit re-fire: the one path that's allowed to wait on the model (an intentional click,
// ~45 s). A KV lock keeps two impatient travellers from double-spending the call.
northOutlookRouter.post('/refresh', async (c) => {
  if (!c.env.ANTHROPIC_API_KEY) return c.json({ ok: false, reason: 'offline' }, 503);
  const held = await c.env.KV.get(LOCK_KEY).catch(() => null);
  if (held) return c.json({ ok: true, running: true });
  await c.env.KV.put(LOCK_KEY, '1', { expirationTtl: 120 }).catch(() => {});
  try {
    const payload = await produceOutlook(c.env, c.env.ANTHROPIC_API_KEY);
    return c.json({ ok: true, generatedAt: payload.generatedAt });
  } catch (err) {
    console.error('outlook refresh failed', err instanceof Error ? err.message : String(err));
    return c.json({ ok: false, reason: 'unavailable' }, 502);
  } finally {
    await c.env.KV.delete(LOCK_KEY).catch(() => {});
  }
});
