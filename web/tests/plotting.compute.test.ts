import { describe, it, expect } from 'vitest';
import { compute } from '../src/plotting/compute';
import { CFG, PRESETS, type Scenario } from '../src/plotting/cfg';

/**
 * Parity gate (build addendum §1.3): the ported reducer MUST match plotting-table.html's outputs
 * for all six presets before any UI is wired. Expected values are derived from the canonical maths:
 *   cost = (iguazu?6000) + crossCost + (skiDays·720 + (skiDays+1)·400) + (split? actCost + 1200)
 *   nights = crossPhaseNights + (iguazu?3) + Catedral + (split? actNights)
 */
const EXPECTED: Record<string, { cost: number; totalNights: number; sharedToSplit: number | null }> = {
  'The Launch': { cost: 12230, totalNights: 11, sharedToSplit: null },
  'Launch + Second Act': { cost: 15960, totalNights: 15, sharedToSplit: 5 },
  'Voyage then Vines': { cost: 17030, totalNights: 14, sharedToSplit: 5 },
  'Two Wonders': { cost: 13080, totalNights: 8, sharedToSplit: null },
  'Pure Ski': { cost: 9320, totalNights: 7, sharedToSplit: null },
  'The Long Way': { cost: 12680, totalNights: 8, sharedToSplit: null },
};

describe('Plotting Table reducer — parity with plotting-table.html', () => {
  for (const preset of PRESETS) {
    it(`${preset.name} matches the canonical engine`, () => {
      const r = compute(preset.s);
      const e = EXPECTED[preset.name];
      expect(r.cost).toBe(e.cost);
      expect(r.totalNights).toBe(e.totalNights);
      expect(r.sharedToSplit).toBe(e.sharedToSplit);
      // totalNights must equal the sum of the phase nights
      expect(r.phases.reduce((a, p) => a + p.nights, 0)).toBe(r.totalNights);
    });
  }

  it('split arcs carry exactly one for-two (parents) phase; non-split carry none', () => {
    for (const preset of PRESETS) {
      const r = compute(preset.s);
      const parents = r.phases.filter((p) => p.who === 'parents').length;
      expect(parents).toBe(preset.s.split ? 1 : 0);
    }
  });

  it('is pure — identical inputs give deep-equal outputs', () => {
    const s: Scenario = { cross: 'lakes', iguazu: true, split: true, secondAct: 'iguazu', skiDays: 5 };
    expect(compute(s)).toEqual(compute(s));
  });

  it('takes CFG as an argument — a tuned crossing cost flows through', () => {
    const base = compute(PRESETS[0].s);
    const tuned = compute(PRESETS[0].s, {
      ...CFG,
      cross: { ...CFG.cross, lakes: { ...CFG.cross.lakes, cost: CFG.cross.lakes.cost + 1000 } },
    });
    expect(tuned.cost).toBe(base.cost + 1000);
  });

  it('skiDays drives the ski base; +1 day = +perDay5 + lodge5', () => {
    const a = compute({ cross: 'fly', iguazu: false, split: false, secondAct: 'ski', skiDays: 4 });
    const b = compute({ cross: 'fly', iguazu: false, split: false, secondAct: 'ski', skiDays: 5 });
    expect(b.cost - a.cost).toBe(CFG.ski.perDay5 + CFG.ski.lodge5);
  });
});
