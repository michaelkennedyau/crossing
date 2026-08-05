import { Hono } from 'hono';
import type { Env } from '../env';
import { cached } from '../lib/kv-cache';
import { completeJson, searchBrief } from '../lib/anthropic';
import { SNOW_KV_KEY, fetchSouthSnow, type SouthForecast } from '../lib/south-forecast';
import {
  PASSES_KV_KEY, PASSES_SCHEMA, buildSearchPrompt, buildStructurePrompt,
  diffPasses, sanitizePasses, type PassesPayload,
} from '../lib/south-watch';

/**
 * The pass watch API — the live answer to "has the mountain changed its mind". GET is
 * instant (KV latest, D1 log fallback) and carries a 14-check history strip; the actual
 * checking lives in the 3-hourly cron (src/worker.ts) plus the synchronous POST /refresh
 * for an on-demand read. Same serve-stored philosophy as the outlook: nobody waits.
 */
export const southPassesRouter = new Hono<{ Bindings: Env }>();

export async function checkPasses(env: Env, apiKey: string): Promise<PassesPayload> {
  const now = new Date().toISOString();
  const { system: ss, user: su } = buildSearchPrompt(now);
  const brief = await searchBrief(apiKey, { system: ss, user: su });
  const { system: ts, user: tu } = buildStructurePrompt(brief);
  const raw = await completeJson<unknown>(apiKey, { system: ts, user: tu, schema: PASSES_SCHEMA });
  const clean = sanitizePasses(raw, now);
  if (!clean) throw new Error('pass watch failed sanitize');
  const prevRow = await env.DB.prepare('SELECT json FROM south_pass_log ORDER BY id DESC LIMIT 1')
    .first<{ json: string }>()
    .catch(() => null);
  let prev: PassesPayload | null = null;
  if (prevRow) {
    try { prev = JSON.parse(prevRow.json) as PassesPayload; } catch { /* first read */ }
  }
  const payload = diffPasses(prev, clean);
  await env.DB.prepare('INSERT OR REPLACE INTO south_pass_log (id, json) VALUES (?, ?)')
    .bind(now, JSON.stringify(payload))
    .run()
    .catch(() => {});
  await env.KV.put(PASSES_KV_KEY, JSON.stringify(payload)).catch(() => {});
  return payload;
}

southPassesRouter.get('/', async (c) => {
  let latest = await c.env.KV.get<PassesPayload>(PASSES_KV_KEY, 'json').catch(() => null);
  if (!latest) {
    const row = await c.env.DB.prepare('SELECT json FROM south_pass_log ORDER BY id DESC LIMIT 1')
      .first<{ json: string }>()
      .catch(() => null);
    if (row) { try { latest = JSON.parse(row.json) as PassesPayload; } catch { /* noop */ } }
  }
  if (!latest) return c.json({ passes: null, reason: 'no reads yet — the first check lands on the next cron' });
  const history = await c.env.DB.prepare('SELECT id, json FROM south_pass_log ORDER BY id DESC LIMIT 14')
    .all<{ id: string; json: string }>()
    .then((r) => (r.results ?? []).map((row) => {
      try {
        const p = JSON.parse(row.json) as PassesPayload;
        return { asOf: row.id, libertadores: p.passes.libertadores.status, portilloRoad: p.passes.portilloRoad.status, samore: p.passes.samore.status };
      } catch { return null; }
    }).filter(Boolean).reverse())
    .catch(() => []);
  const ageHours = Math.round(((Date.now() - Date.parse(latest.asOf)) / 3_600_000) * 10) / 10;
  // the plough window rides along — crews dig in pauses, so the sky is half the answer
  let forecast: SouthForecast | null = null;
  try {
    forecast = (await cached<SouthForecast>(c.env.KV, SNOW_KV_KEY, 10800, fetchSouthSnow)).value;
  } catch { /* passes still render without the sky */ }
  return c.json({ ...latest, ageHours, history, forecast });
});

// on-demand check — explicit action, allowed to wait (~30-60s of search + structure)
southPassesRouter.post('/refresh', async (c) => {
  if (!c.env.ANTHROPIC_API_KEY) return c.json({ ok: false, reason: 'offline' }, 503);
  try {
    const payload = await checkPasses(c.env, c.env.ANTHROPIC_API_KEY);
    return c.json({ ok: true, asOf: payload.asOf });
  } catch (err) {
    console.error('pass watch refresh failed', err instanceof Error ? err.message : String(err));
    return c.json({ ok: false, reason: 'unavailable' }, 502);
  }
});
