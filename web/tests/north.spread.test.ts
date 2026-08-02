import { describe, expect, it } from 'vitest';
import { buildSpread, dayLabel, forecastIndex, noteTitle, pinMatchesDay, tripDate } from '../src/north/board/spread';
import { dateAt } from '../src/north/planner/cfg';

/**
 * The spread's geometry, held to the ticketed spine: 19 nights, Fri 14 Aug → Wed 2 Sep 2026,
 * and to the pin-title convention the itinerary card already writes.
 */
const mkStops = (lens: number[]) =>
  lens.map((n, i) => ({
    key: `s${i}`, name: `Stop ${i}`, node: `node${i}`, nights: n,
    days: Array.from({ length: n }, (_, j) => ({ date: `d${i}.${j}`, title: `t${i}.${j}`, plan: 'p' })),
  }));

describe('the spread · date join', () => {
  it('the live shape [2,4,2,7,4] yields 19 days with boundaries at 0/2/6/8/15', () => {
    const days = buildSpread(mkStops([2, 4, 2, 7, 4]));
    expect(days).toHaveLength(19);
    expect(days.map((d) => d.offset)).toEqual(Array.from({ length: 19 }, (_, i) => i));
    expect(days.filter((d) => d.first).map((d) => d.offset)).toEqual([0, 2, 6, 8, 15]);
  });

  it('labels agree with the planner epoch for every day of the trip', () => {
    for (let off = 0; off <= 19; off++) {
      expect(dayLabel(off).endsWith(dateAt(off)), `off ${off}: ${dayLabel(off)} vs ${dateAt(off)}`).toBe(true);
    }
    expect(dayLabel(0)).toBe('Fri 14 Aug');
    expect(dayLabel(19)).toBe('Wed 2 Sep');
  });

  it('a malformed document renders what it has, no throw', () => {
    expect(buildSpread(mkStops([2, 4]))).toHaveLength(6);
    expect(buildSpread([])).toHaveLength(0);
  });
});

describe('the spread · forecast horizon', () => {
  it('the lit window slides with today', () => {
    expect(forecastIndex(new Date(2026, 7, 12), 0)).toBe(2);
    expect(forecastIndex(new Date(2026, 7, 14), 0)).toBe(0);
    expect(forecastIndex(new Date(2026, 7, 14), 5)).toBe(5);
    expect(forecastIndex(new Date(2026, 7, 14), 6)).toBeNull();
  });
  it('past days go dark', () => {
    expect(forecastIndex(new Date(2026, 7, 20), 0)).toBeNull();
  });
  it('crosses the month boundary honestly', () => {
    expect(forecastIndex(new Date(2026, 7, 30), 18)).toBe(2); // 1 Sep, two days out
  });
});

describe('the spread · pin attachment', () => {
  it('matches the itinerary card convention, weekday optional', () => {
    expect(pinMatchesDay('Fri 14 Aug — landing softly', 0)).toBe(true);
    expect(pinMatchesDay('14 Aug — landing', 0)).toBe(true);
    expect(pinMatchesDay('mon 17 aug — vintgar at eight', 3)).toBe(true);
  });
  it('rejects the wrong day and undated titles', () => {
    expect(pinMatchesDay('Mon 17 Aug — vintgar', 0)).toBe(false);
    expect(pinMatchesDay('Grand Hotel Toplice', 3)).toBe(false);
    expect(pinMatchesDay('Tue 1 Sep — pack for QF2', 18)).toBe(true);
    expect(pinMatchesDay('Tue 1 Sep — pack for QF2', 8)).toBe(false);
  });
  it('noteTitle round-trips through the matcher', () => {
    for (const off of [0, 3, 8, 18]) {
      expect(pinMatchesDay(noteTitle(off, 'book the taxi to Hiša Franko both ways'), off)).toBe(true);
    }
  });
  it('tripDate is the QF1 landing epoch', () => {
    expect(tripDate(0).getDate()).toBe(14);
    expect(tripDate(19).getMonth()).toBe(8); // September
  });
});
