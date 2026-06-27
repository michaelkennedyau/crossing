/// <reference types="@cloudflare/workers-types" />

/**
 * Worker bindings for The Crossing. DB is the SHARED brain D1 (varo-family-brain) — we only ever
 * touch crossing_* tables. KV is a dedicated live-data cache. ANTHROPIC_API_KEY is the only secret.
 */
export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  KV: KVNamespace;
  AI?: Ai;
  // Secret (wrangler secret put ANTHROPIC_API_KEY) — only needed for the concierge.
  ANTHROPIC_API_KEY?: string;
  // var — QF27 launch instant, used by the countdown.
  DEPART_ISO: string;
}
