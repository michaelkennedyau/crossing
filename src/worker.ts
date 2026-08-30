/// <reference types="@cloudflare/workers-types" />
import { app } from './app';
import type { Env } from './env';
import { produceOutlook } from './routes/north-outlook';
import { cached } from './lib/kv-cache';
import { completeJson } from './lib/anthropic';
import { EU_NODES } from './lib/north-weather';
import { EVENTS_SCHEMA, EVENTS_TTL_SECONDS, buildEventsPrompt, eventsKvKey, sanitizeEvents } from './lib/north-events';
import { checkPasses } from './routes/south-passes';
import { getMode, producersOff } from './lib/windup';

/**
 * Worker entry (mirrors travel/app/src/worker/index.ts). The Worker owns the SSR shell ("/") and
 * the API ("/api/*", "/health"); every other path is a built client asset served by env.ASSETS.
 * No index.html is emitted by the Vite build, so "/" is never shadowed by a static asset.
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);
      const ssr = url.pathname === '/' || url.pathname === '/andes' || url.pathname === '/north' || url.pathname === '/north/plan' || url.pathname === '/north/weather' || url.pathname === '/north/aurora';
      if (ssr || url.pathname === '/health' || url.pathname.startsWith('/api/')) {
        return await app.fetch(request, env, ctx);
      }
      return await env.ASSETS.fetch(request);
    } catch (err) {
      // Never surface a bare 1101 — log the stack to observability and answer gracefully.
      console.error('worker exception', request.url, err instanceof Error ? err.stack : String(err));
      return new Response(
        '<!DOCTYPE html><meta charset="utf-8"><title>il varo</title>' +
          '<body style="background:#04060A;color:#A9B8BE;font-family:ui-monospace,monospace;display:grid;place-items:center;height:100vh;margin:0">' +
          '<p>heavy weather — the bridge will be back shortly.</p></body>',
        { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } },
      );
    }
  },

  // The daily floor: regenerate the outlook and pre-warm every node's events knowledge.
  // Each step is independently fire-tolerant; events are KV-cached a week so most are no-ops.
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) return;
    // windup insurance: even if the cron trigger is ever restored, producers only run in 'live'
    if (producersOff(await getMode(env.KV))) return;
    // one slow web search must never starve the rest of the cycle — race, log, move on
    const bounded = async (label: string, work: () => Promise<unknown>, ms = 240_000): Promise<void> => {
      try {
        await Promise.race([
          work(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), ms)),
        ]);
      } catch (err) {
        console.error(`cron ${label} failed`, err instanceof Error ? err.message : String(err));
      }
    };
    ctx.waitUntil(
      (async () => {
        await bounded('outlook', () => produceOutlook(env, apiKey));
        await bounded('pass watch', () => checkPasses(env, apiKey));
        for (const node of EU_NODES) {
          try {
            await cached(env.KV, eventsKvKey(node.id), EVENTS_TTL_SECONDS, async () => {
              const { system, user } = buildEventsPrompt(node.name, node.country);
              const raw = await completeJson<unknown>(apiKey, { system, user, schema: EVENTS_SCHEMA });
              return sanitizeEvents(raw);
            });
          } catch (err) {
            console.error('cron events failed', node.id, err instanceof Error ? err.message : String(err));
          }
        }
      })(),
    );
  },
} satisfies ExportedHandler<Env>;
