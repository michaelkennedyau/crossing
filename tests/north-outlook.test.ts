import { describe, expect, it } from 'vitest';
import {
  OUTLOOK_SCHEMA, buildOutlookPrompt, sanitizeOutlook,
} from '../src/lib/north-outlook';
import type { NorthWxNode } from '../src/lib/north-weather';
import { CFG } from '../web/src/north/planner/cfg';

const NODES: NorthWxNode[] = [
  {
    id: 'lofoten', name: 'Lofoten', country: 'Norway', lat: 68.15, lon: 13.61,
    temp: 11.2, code: 61,
    days: [{ tmax: 12, feels: 9, rain: 6 }, { tmax: 13, feels: 11, rain: 2 }, { tmax: 11, feels: 8, rain: 8 }],
  },
  {
    id: 'taormina', name: 'Taormina', country: 'Sicily', lat: 37.85, lon: 15.29,
    temp: 31.4, code: 0,
    days: [{ tmax: 33, feels: 38, rain: 0 }, { tmax: 34, feels: 39, rain: 0 }, { tmax: 32, feels: 36, rain: 0 }],
  },
];

describe('north outlook · the prompt', () => {
  it('carries every arc and every node, compactly', () => {
    const { system, user } = buildOutlookPrompt(NODES, CFG, '2026-08-01T00:00:00Z');
    expect(system).toContain('nineteen open nights');
    const parsed = JSON.parse(user) as { asOf: string; nodes: unknown[]; arcs: { id: string }[] };
    expect(parsed.asOf).toBe('2026-08-01T00:00:00Z');
    expect(parsed.nodes).toHaveLength(2);
    expect(parsed.arcs.map((a) => a.id).sort()).toEqual(Object.keys(CFG.arcs).sort());
    // compact: no lat/lon/code noise in what the model reads
    expect(user).not.toContain('"lat"');
    expect(user).not.toContain('"code"');
  });
});

describe('north outlook · the schema', () => {
  it('locks every object down — no additionalProperties leaks', () => {
    const walk = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const o = node as Record<string, unknown>;
      if (o.type === 'object') {
        expect(o.additionalProperties).toBe(false);
        expect(Array.isArray(o.required)).toBe(true);
      }
      for (const v of Object.values(o)) walk(v);
    };
    walk(OUTLOOK_SCHEMA);
  });

  it('uses no numeric bounds (unsupported in structured outputs)', () => {
    const s = JSON.stringify(OUTLOOK_SCHEMA);
    expect(s).not.toContain('minimum');
    expect(s).not.toContain('maximum');
  });
});

describe('north outlook · sanitize', () => {
  const good = {
    headline: 'The south bakes, the north drips',
    narrative: 'Sicily holds 33-34° with no rain; Lofoten takes 6 mm and stays at 12°.',
    ranking: [
      { arc: 'sicily', score: 88, verdict: 'go', because: 'Taormina 33° and dry all week.' },
      { arc: 'fjords', score: 30, verdict: 'skip', because: 'Lofoten 6 mm today and 12°.' },
    ],
    watch: ['heat building in Taormina'],
  };
  const known = Object.keys(CFG.arcs);

  it('passes a clean outlook through intact', () => {
    const o = sanitizeOutlook(good, known);
    expect(o?.ranking).toHaveLength(2);
    expect(o?.headline).toBe(good.headline);
  });

  it('drops unknown arcs and clamps out-of-range scores', () => {
    const o = sanitizeOutlook(
      {
        ...good,
        ranking: [
          ...good.ranking,
          { arc: 'atlantis', score: 99, verdict: 'go', because: 'invented' },
          { arc: 'gulet', score: 400, verdict: 'maybe', because: 'hot deck' },
          { arc: 'madeira', score: -5, verdict: 'go', because: 'levadas' },
        ],
      },
      known,
    );
    expect(o?.ranking.map((r) => r.arc)).not.toContain('atlantis');
    expect(o?.ranking.find((r) => r.arc === 'gulet')?.score).toBe(100);
    expect(o?.ranking.find((r) => r.arc === 'madeira')?.score).toBe(0);
  });

  it('caps the watch list at six and drops non-strings', () => {
    const o = sanitizeOutlook({ ...good, watch: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 42] }, known);
    expect(o?.watch).toHaveLength(6);
  });

  it('returns null on garbage, an empty ranking, or a missing headline', () => {
    expect(sanitizeOutlook(null, known)).toBeNull();
    expect(sanitizeOutlook('nope', known)).toBeNull();
    expect(sanitizeOutlook({ ...good, ranking: [{ arc: 'atlantis', score: 1, verdict: 'go', because: 'x' }] }, known)).toBeNull();
    expect(sanitizeOutlook({ ...good, headline: undefined }, known)).toBeNull();
  });
});
