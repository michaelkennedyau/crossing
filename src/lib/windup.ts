/**
 * Windup mode — the trip's lifecycle flag, read only on rare producer paths (cron, the two
 * /refresh POSTs, the events model-fill). Pages never read it: after the freeze the weather
 * KV keys are pinned TTL-less, so every cached() call is a permanent hit with no gate needed.
 *
 *  live   — the planning era: cron + refreshes may spend model calls
 *  wound  — decisions locked: producers off, cheap on-demand Open-Meteo still flows
 *  frozen — landed: everything served from pinned KV + D1, zero external calls
 *
 * Fail-closed: an absent or garbled key reads as 'wound', so the deploy alone stops the spend.
 * Flip with: wrangler kv key put --binding KV windup:mode live|wound|frozen --remote
 */
export type WindupMode = 'live' | 'wound' | 'frozen';

export const MODE_KEY = 'windup:mode';

export async function getMode(kv: KVNamespace): Promise<WindupMode> {
  const v = await kv.get(MODE_KEY).catch(() => null);
  return v === 'live' || v === 'frozen' ? v : 'wound';
}

/** producers (model-call spenders) run only in 'live' */
export const producersOff = (m: WindupMode): boolean => m !== 'live';
