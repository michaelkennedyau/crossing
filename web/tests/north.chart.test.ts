import { describe, expect, it } from 'vitest';
import { MAP_W, MAP_H, project, tempRamp } from '../src/north/board/geo';
import { EU_NODES } from '../../src/lib/north-weather';
import { ageHours, isStale } from '../../src/lib/north-outlook';

/**
 * The chart room's geometry, the shared temperature language, and the outlook's staleness
 * clock — all pure, all held to the board's real node list.
 */
describe('chart room · projection', () => {
  it.each(EU_NODES.map((n) => [n.id, n.lat, n.lon] as const))('%s lands inside the chart with margin', (_id, lat, lon) => {
    const { x, y } = project(lat, lon);
    expect(x).toBeGreaterThanOrEqual(12);
    expect(x).toBeLessThanOrEqual(MAP_W - 12);
    expect(y).toBeGreaterThanOrEqual(12);
    expect(y).toBeLessThanOrEqual(MAP_H - 12);
  });

  it('keeps the compass honest', () => {
    const tromso = project(69.65, 18.96);
    const milos = project(36.75, 24.43);
    const lisbon = project(38.72, -9.14);
    const venice = project(45.44, 12.34);
    expect(tromso.y).toBeLessThan(milos.y); // north is up
    expect(lisbon.x).toBeLessThan(venice.x); // west is left
  });
});

describe('chart room · temperature ramp', () => {
  it('walks cool to hot through the five buckets', () => {
    const seq = [8, 15, 20, 26, 30, 36].map(tempRamp);
    expect(new Set(seq).size).toBe(6);
    expect(seq[0]).toBe('#7fd8f2');
    expect(seq[5]).toBe('#e88b8b');
  });

  it('boundary degrees fall into the warmer-side bucket exactly at the edge', () => {
    expect(tempRamp(9.9)).toBe('#7fd8f2');
    expect(tempRamp(10)).toBe('#8be8c0');
    expect(tempRamp(33)).toBe('#e88b8b');
  });
});

describe('outlook · staleness clock', () => {
  const now = Date.parse('2026-08-02T12:00:00Z');

  it('fresh inside three hours', () => {
    expect(isStale('2026-08-02T11:00:00Z', now)).toBe(false);
    expect(Math.round(ageHours('2026-08-02T11:00:00Z', now))).toBe(1);
  });

  it('four hours old is stale', () => {
    expect(isStale('2026-08-02T07:59:00Z', now)).toBe(true);
    expect(ageHours('2026-08-02T07:59:00Z', now)).toBeGreaterThan(3);
  });

  it('garbage timestamps are maximally stale — regenerate, never trust', () => {
    expect(ageHours('not-a-date', now)).toBe(Infinity);
    expect(isStale('', now)).toBe(true);
  });

  it('a future timestamp clamps to zero age', () => {
    expect(ageHours('2026-08-02T13:00:00Z', now)).toBe(0);
    expect(isStale('2026-08-02T13:00:00Z', now)).toBe(false);
  });
});

// ── the upgrade: baked coasts, label physics, buckets, graticule, the wall clock ──
import { COASTS } from '../src/north/board/coast';
import { RAMP, graticule, nudgeLabels, tempBucket } from '../src/north/board/geo';
import { nextOutlookRefresh } from '../src/north/board/clock';

describe('chart room · coastline bakes', () => {
  const coords = COASTS.flatMap((d) =>
    d.replace(/^M/, '').split(' L').map((p) => p.split(',').map(Number) as [number, number]),
  );

  it('every baked coordinate lands inside the frame', () => {
    for (const [x, y] of coords) {
      expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(8);
      expect(x).toBeLessThanOrEqual(MAP_W - 8);
      expect(y).toBeGreaterThanOrEqual(8);
      expect(y).toBeLessThanOrEqual(MAP_H - 8);
    }
  });

  it('Britain exists as a real silhouette (no more egg)', () => {
    const nw = project(58.7, -5.8);
    const se = project(49.9, 1.8);
    const britain = COASTS.filter((d) => {
      const pts = d.replace(/^M/, '').split(' L').map((p) => p.split(',').map(Number));
      const inside = pts.filter(([x, y]) => x >= nw.x && x <= se.x && y >= nw.y && y <= se.y);
      return inside.length >= pts.length * 0.6 && pts.length >= 8;
    });
    expect(britain.length).toBeGreaterThanOrEqual(1);
    const spans = britain.map((d) => {
      const ys = d.replace(/^M/, '').split(' L').map((p) => Number(p.split(',')[1]));
      return Math.max(...ys) - Math.min(...ys);
    });
    expect(Math.max(...spans)).toBeGreaterThanOrEqual(40);
  });

  it('stays inside the chart budget', () => {
    expect(COASTS.join('').length).toBeLessThan(12000);
    expect(COASTS.length).toBeGreaterThanOrEqual(8);
    expect(COASTS.length).toBeLessThanOrEqual(40);
  });
});

describe('chart room · label physics', () => {
  const items = EU_NODES.map((n) => {
    const p = project(n.lat, n.lon);
    return { id: n.id, x: p.x, y: p.y, side: p.x > MAP_W - 90 ? ('left' as const) : ('right' as const) };
  });

  it('same-side near-column labels end at least 9px apart', () => {
    const dy = nudgeLabels(items);
    for (const a of items) {
      for (const b of items) {
        if (a.id >= b.id || a.side !== b.side || Math.abs(a.x - b.x) >= 70) continue;
        const gap = Math.abs(a.y + dy[a.id] - (b.y + dy[b.id]));
        expect(gap, `${a.id} vs ${b.id}`).toBeGreaterThanOrEqual(9 - 1e-6);
      }
    }
  });

  it('Split and Hvar specifically separate; offsets only, dots never move', () => {
    const dy = nudgeLabels(items);
    const split = items.find((i) => i.id === 'split')!;
    const hvar = items.find((i) => i.id === 'hvar')!;
    expect(Math.abs(split.y + dy.split - (hvar.y + dy.hvar))).toBeGreaterThanOrEqual(9 - 1e-6);
    expect(split.y).toBe(project(43.51, 16.44).y);
  });

  it('is deterministic under input reversal', () => {
    expect(nudgeLabels([...items].reverse())).toEqual(nudgeLabels(items));
  });
});

describe('chart room · buckets and ramp stay in lockstep', () => {
  it('RAMP[tempBucket(t)] === tempRamp(t) across the sweep', () => {
    for (const t of [-5, 9.9, 10, 17.9, 18, 23.9, 24, 27.9, 28, 32.9, 33, 41]) {
      expect(RAMP[tempBucket(t)]).toBe(tempRamp(t));
    }
  });
  it('the hot edge marks buckets 4 and 5 only', () => {
    expect(tempBucket(27.9)).toBeLessThan(4);
    expect(tempBucket(28)).toBe(4);
    expect(tempBucket(33)).toBe(5);
  });
});

describe('chart room · graticule', () => {
  it('four lats and four lons, all inside the frame', () => {
    const g = graticule();
    expect(g.lats.map((l) => l.deg)).toEqual([40, 50, 60, 70]);
    expect(g.lons.map((l) => l.deg)).toEqual([-10, 0, 10, 20]);
    for (const l of g.lats) { expect(l.y).toBeGreaterThan(10); expect(l.y).toBeLessThan(MAP_H - 10); }
    for (const l of g.lons) { expect(l.x).toBeGreaterThan(10); expect(l.x).toBeLessThan(MAP_W - 10); }
  });
  it('round-trips through project', () => {
    expect(graticule().lats.find((l) => l.deg === 50)?.y).toBe(project(50, 0).y);
  });
});

describe('the wall clock · next outlook re-fire', () => {
  it('rolls to the next 3-hour UTC boundary', () => {
    expect(nextOutlookRefresh(Date.parse('2026-08-02T02:59:00Z')).toISOString()).toBe('2026-08-02T03:00:00.000Z');
    expect(nextOutlookRefresh(Date.parse('2026-08-02T03:00:00Z')).toISOString()).toBe('2026-08-02T06:00:00.000Z');
    expect(nextOutlookRefresh(Date.parse('2026-08-02T23:30:00Z')).toISOString()).toBe('2026-08-03T00:00:00.000Z');
  });
});

describe('chart room · scored outcomes', () => {
  it('a perfect day scores 100, and the floor is 0', async () => {
    const { dayScore } = await import('../src/north/board/geo');
    expect(dayScore(25, 0)).toBe(100);
    expect(dayScore(48, 30)).toBe(0);
  });
  it('heat, cold and rain each bleed points monotonically', async () => {
    const { dayScore } = await import('../src/north/board/geo');
    expect(dayScore(33, 0)).toBeLessThan(dayScore(31, 0));
    expect(dayScore(12, 0)).toBeLessThan(dayScore(18, 0));
    expect(dayScore(25, 8)).toBeLessThan(dayScore(25, 1));
    expect(dayScore(25, 50)).toBe(dayScore(25, 10)); // rain penalty caps at 40
  });
  it('score colours map to the verdict bands', async () => {
    const { scoreColor } = await import('../src/north/board/geo');
    expect(scoreColor(80)).toBe('#8be8c0');
    expect(scoreColor(60)).toBe('#e8e0a8');
    expect(scoreColor(30)).toBe('#f2b45e');
    expect(scoreColor(10)).toBe('#e88b8b');
  });
});
