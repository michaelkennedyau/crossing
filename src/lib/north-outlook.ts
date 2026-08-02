import type { NorthWxNode } from './north-weather';
import type { Arc, Cfg } from '../../web/src/north/planner/cfg';

/**
 * The state of the fortnight — pure prompt/shape logic for the live Claude re-ranking of the
 * arcs against the real six-day forecast. No fetch in this file so vitest covers it; the route
 * (src/routes/north-outlook.ts) wires it to completeJson + KV.
 */

// Versioned so a prompt/schema change never serves a stale cached shape. Bump on change.
export const OUTLOOK_KV_KEY = 'north-outlook:v1';
export const OUTLOOK_TTL_SECONDS = 10800; // 3 h ⇒ ≤8 Anthropic calls/day at full churn

// Staleness: the last read is ALWAYS served instantly; past this age a background
// regeneration fires (plus the daily cron floor). Nobody ever waits on Claude.
export const OUTLOOK_STALE_HOURS = 3;

/** hours since generatedAt; Infinity for garbage timestamps (treat as maximally stale) */
export function ageHours(generatedAt: string, now: number = Date.now()): number {
  const t = Date.parse(generatedAt);
  if (Number.isNaN(t)) return Infinity;
  return Math.max(0, (now - t) / 3_600_000);
}

export function isStale(generatedAt: string, now: number = Date.now()): boolean {
  return ageHours(generatedAt, now) > OUTLOOK_STALE_HOURS;
}

export interface OutlookRanking {
  arc: string;
  score: number; // 0–100, clamped in sanitize (numeric bounds unsupported in structured outputs)
  verdict: 'go' | 'maybe' | 'skip';
  because: string;
}

export interface Outlook {
  headline: string;
  narrative: string;
  ranking: OutlookRanking[];
  watch: string[];
}

export const OUTLOOK_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'narrative', 'ranking', 'watch'],
  properties: {
    headline: { type: 'string' },
    narrative: { type: 'string' },
    ranking: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['arc', 'score', 'verdict', 'because'],
        properties: {
          arc: { type: 'string' },
          score: { type: 'integer' },
          verdict: { type: 'string', enum: ['go', 'maybe', 'skip'] },
          because: { type: 'string' },
        },
      },
    },
    watch: { type: 'array', items: { type: 'string' } },
  },
};

const SYSTEM = `You are the weather strategist for "il varo — The North": a couple's nineteen open nights in Europe, August 2026. Michael and Claire land at London Heathrow on QF1 on Friday 14 August 2026 and fly home on QF2 on Wednesday 2 September — nineteen nights, deliberately undecided between rival "arcs" (candidate itineraries). Your job: read the REAL six-day forecast supplied for the candidate places and rank EVERY arc by how the current sky suits it.

Rules:
- Rank every arc in the input, no omissions; each entry's "arc" is the arc's id exactly as given.
- Score 0–100 (higher = the forecast favours it now). Verdict: "go" (weather makes its case), "maybe" (mixed), "skip" (the sky argues against it this week).
- "because" is ONE concrete sentence grounded in the supplied numbers — name the place and the figure (e.g. rain totals, tmax). Never invent data not in the input.
- "headline" is one line — the state of the fortnight. "narrative" is 2–3 sentences reading the whole board: where the warmth is, where the rain sits, what that means for the cool/warm split.
- "watch" lists up to 6 short things worth watching (building rain, a heat spike, an aurora-friendly clear window in the north).
- Australian spelling, metric, no emoji. Concrete, dry, a little wry — never breathless.`;

export function buildOutlookPrompt(
  nodes: NorthWxNode[],
  cfg: Cfg,
  nowIso: string,
): { system: string; user: string } {
  const arcs = Object.values(cfg.arcs).map((a: Arc) => ({
    id: a.id,
    name: a.name,
    mood: a.mood,
    places: a.segments.map((s) => s.short),
    caseFor: a.caseFor,
    caseAgainst: a.caseAgainst,
  }));
  const wx = nodes.map((n) => ({
    id: n.id,
    name: n.name,
    country: n.country,
    temp: n.temp,
    days: n.days.map((d) => ({ tmax: d.tmax, rain: d.rain })),
  }));
  return {
    system: SYSTEM,
    user: JSON.stringify({ asOf: nowIso, nodes: wx, arcs }),
  };
}

/** Belt-and-braces over the schema guarantee: unknown arcs dropped, scores clamped, watch capped. */
export function sanitizeOutlook(raw: unknown, knownArcIds: string[]): Outlook | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Partial<Outlook>;
  if (typeof o.headline !== 'string' || typeof o.narrative !== 'string' || !Array.isArray(o.ranking)) {
    return null;
  }
  const known = new Set(knownArcIds);
  const ranking = o.ranking
    .filter(
      (r): r is OutlookRanking =>
        !!r && typeof r === 'object' && typeof r.arc === 'string' && known.has(r.arc)
        && typeof r.because === 'string' && ['go', 'maybe', 'skip'].includes(r.verdict as string),
    )
    .map((r) => ({ ...r, score: Math.max(0, Math.min(100, Math.round(Number(r.score) || 0))) }));
  if (!ranking.length) return null;
  const watch = (Array.isArray(o.watch) ? o.watch : [])
    .filter((w): w is string => typeof w === 'string')
    .slice(0, 6);
  return { headline: o.headline, narrative: o.narrative, ranking, watch };
}
