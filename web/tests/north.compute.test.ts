import { describe, expect, it } from 'vitest';
import { CFG, dateAt, defaultSelection, type ArcId } from '../src/north/planner/cfg';
import { compute } from '../src/north/planner/compute';
import { flagsFor } from '../src/north/planner/constraints';

/**
 * The North Planner reducer, held to the fixed spine: nineteen nights, 14 August → 2 September 2026, as ticketed.
 */
describe('north planner · the spine', () => {
  it('dates anchor to the QF1 arrival as ticketed', () => {
    expect(dateAt(0)).toBe('14 Aug');
    expect(dateAt(19)).toBe('2 Sep');
    expect(dateAt(21)).toBe('4 Sep');
  });

  it.each(Object.keys(CFG.arcs) as ArcId[])('%s defaults close the 19-night calendar', (arc) => {
    const r = compute(defaultSelection(arc));
    expect(r.totalNights).toBe(19);
    expect(r.delta).toBe(0);
    expect(r.lastCell?.id).toBe('london2');
  });

  it('costs roll up — stay plus the arc transport lump', () => {
    expect(compute(defaultSelection('fjords')).cost).toBe(30900);
    expect(compute(defaultSelection('gulet')).cost).toBe(40500);
    expect(compute(defaultSelection('highlands')).cost).toBe(31500);
  });

  it('the sane tier is honest — cheaper than special on every arc', () => {
    for (const arc of Object.keys(CFG.arcs) as ArcId[]) {
      const special = compute(defaultSelection(arc, CFG, 'special')).cost;
      const sane = compute(defaultSelection(arc, CFG, 'sane')).cost;
      expect(sane).toBeLessThan(special);
    }
    expect(compute(defaultSelection('fjords', CFG, 'sane')).cost).toBe(18200);
  });

  it('every arc ships with its case and its counter', () => {
    for (const arc of Object.values(CFG.arcs)) {
      expect(arc.caseFor.length).toBeGreaterThan(20);
      expect(arc.caseAgainst.length).toBeGreaterThan(20);
    }
  });

  it('the calendar carries running start dates', () => {
    const r = compute(defaultSelection('fjords'));
    const byId = Object.fromEntries(r.cells.map((c) => [c.id, c]));
    expect(byId['london1'].date).toBe('14 Aug');
    expect(byId['oye'].date).toBe('16 Aug');
    expect(byId['lofoten'].date).toBe('21 Aug');
    expect(byId['tromso'].date).toBe('26 Aug');
    expect(byId['london2'].date).toBe('29 Aug');
  });

  it('zero-night segments drop out of the calendar', () => {
    const sel = defaultSelection('fjords');
    sel.nights['storfjord'] = 0;
    const r = compute(sel);
    expect(r.cells.find((c) => c.id === 'storfjord')).toBeUndefined();
    expect(r.delta).toBe(-2);
  });
});

describe('north planner · the rules', () => {
  it('a calendar that does not close is flagged hard', () => {
    const sel = defaultSelection('fjords');
    sel.nights['lofoten'] = 6;
    const f = flagsFor(sel, compute(sel));
    expect(f.some((x) => x.level === 'warn' && x.text.includes('QF2'))).toBe(true);
  });

  it('losing the final London buffer triggers the same-day QF2 warning', () => {
    const sel = defaultSelection('fjords');
    sel.nights['london2'] = 0;
    const f = flagsFor(sel, compute(sel));
    expect(f.some((x) => x.level === 'warn' && x.text.includes('same-day QF2'))).toBe(true);
  });

  it('a single-night buffer is noted, not warned', () => {
    const sel = defaultSelection('fjords');
    sel.nights['london2'] = 1;
    sel.nights['tromso'] = 4;
    sel.nights['lofoten'] = 6;
    sel.nights['storfjord'] = 3;
    const r = compute(sel);
    expect(r.delta).toBe(0);
    const f = flagsFor(sel, r);
    expect(f.some((x) => x.level === 'note' && x.text.includes('legal minimum'))).toBe(true);
    expect(f.some((x) => x.level === 'warn' && x.text.includes('same-day'))).toBe(false);
  });

  it('the tiny-house note rides every fjords arc with Øye or Holmen nights', () => {
    const sel = defaultSelection('fjords');
    const f = flagsFor(sel, compute(sel));
    expect(f.some((x) => x.text.includes('single-digit-room'))).toBe(true);
  });

  it('the gulet arc always carries the August heat warning', () => {
    const sel = defaultSelection('gulet');
    const f = flagsFor(sel, compute(sel));
    expect(f.some((x) => x.level === 'warn' && x.text.includes('34°C'))).toBe(true);
  });

  it('Sicily lands in Ferragosto week and says so', () => {
    const sel = defaultSelection('sicily');
    const f = flagsFor(sel, compute(sel));
    expect(f.some((x) => x.level === 'warn' && x.text.includes('Ferragosto'))).toBe(true);
  });

  it('the Cyclades carry the meltemi ferry note', () => {
    const sel = defaultSelection('cyclades');
    const f = flagsFor(sel, compute(sel));
    expect(f.some((x) => x.text.includes('meltemi'))).toBe(true);
  });

  it('Sardinia warns on Ferragosto-week Costa Smeralda pricing', () => {
    const sel = defaultSelection('sardinia');
    const f = flagsFor(sel, compute(sel));
    expect(f.some((x) => x.level === 'warn' && x.text.includes('Costa Smeralda'))).toBe(true);
  });

  it('Madeira carries the crowd-proof ok flag', () => {
    const sel = defaultSelection('madeira');
    const f = flagsFor(sel, compute(sel));
    expect(f.some((x) => x.level === 'ok' && x.text.includes('crowd-proof'))).toBe(true);
  });

  it('Portugal is honest about the Atlantic', () => {
    const sel = defaultSelection('portugal');
    const f = flagsFor(sel, compute(sel));
    expect(f.some((x) => x.level === 'warn' && x.text.includes('Atlantic'))).toBe(true);
  });

  it('North → South: the default hinge lands the flotilla on Sat 22 Aug', () => {
    const sel = defaultSelection('highlow');
    const r = compute(sel);
    const tyw = r.cells.find((x) => x.id === 'tyw');
    expect(tyw?.date).toBe('22 Aug');
    expect(flagsFor(sel, r).some((x) => x.text.includes('Rebalance'))).toBe(false);
  });

  it('North → South: moving the north nights breaks the hinge and says so', () => {
    const sel = defaultSelection('highlow');
    sel.nights['lofoten'] = 4;
    sel.nights['london2'] = 5;
    const r = compute(sel);
    expect(r.delta).toBe(0);
    expect(flagsFor(sel, r).some((x) => x.level === 'warn' && x.text.includes('Rebalance'))).toBe(true);
  });

  it('every combo lands its warm half on or after the Sat-22 exhale by default', () => {
    for (const arc of ['highlow', 'dolosicily', 'scotgreece', 'slovcroatia', 'norsardinia'] as ArcId[]) {
      const sel = defaultSelection(arc);
      const f = flagsFor(sel, compute(sel));
      expect(f.some((x) => x.text.includes('crowd curve'))).toBe(true);
      expect(f.some((x) => x.text.includes('before the Med empties'))).toBe(false);
    }
  });

  it('an early warm half gets the calmer-and-cheaper note', () => {
    const sel = defaultSelection('dolosicily');
    sel.nights['altabadia'] = 4;
    sel.nights['london2'] = 4;
    const r = compute(sel);
    expect(r.delta).toBe(0);
    expect(flagsFor(sel, r).some((x) => x.text.includes('before the Med empties'))).toBe(true);
  });

  it('Slovenia + Croatia is the no-airport combo and says so', () => {
    const sel = defaultSelection('slovcroatia');
    const f = flagsFor(sel, compute(sel));
    expect(f.some((x) => x.level === 'ok' && x.text.includes('No mid-trip flights'))).toBe(true);
  });

  it('Yacht Week warns about the pace and pins the Saturday start', () => {
    const sel = defaultSelection('yachtweek');
    const f = flagsFor(sel, compute(sel));
    expect(f.some((x) => x.level === 'warn' && x.text.includes('theoretical'))).toBe(true);
    expect(f.some((x) => x.text.includes('Sat 22 Aug'))).toBe(true);
  });
});
