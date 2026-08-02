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
