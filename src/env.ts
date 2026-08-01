/// <reference types="@cloudflare/workers-types" />

/**
 * Worker bindings for The Crossing. DB is the SHARED brain D1 (varo-family-brain) — we only ever
 * touch crossing_* tables. KV is a dedicated live-data cache. ANTHROPIC_API_KEY is the only secret.
 */
export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  KV: KVNamespace;
  // Durable home for image ORIGINALS (web/.img-src). Written via the wrangler CLI
  // (web/scripts/img-r2.mjs), not through the Worker — the Worker never serves from it.
  R2_IMAGES: R2Bucket;
  AI?: Ai;
  // Secret (wrangler secret put ANTHROPIC_API_KEY) — only needed for the concierge.
  ANTHROPIC_API_KEY?: string;
  // var — QF27 launch instant, used by the countdown.
  DEPART_ISO: string;
  // var — the north launch instant (QF BNE→SYD, Sat 8 Aug), used by the north countdown.
  NORTH_DEPART_ISO: string;
}
