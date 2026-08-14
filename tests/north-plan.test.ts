import { describe, expect, it } from 'vitest';
import { renderPlan, tripDayOffset } from '../src/north-plan';
import type { Env } from '../src/env';

/** stubbed bindings: D1 returns the itinerary row; KV routes by key */
function stubEnv(
  row: { json: string; updated_at: string } | null,
  opts: { wx?: unknown } = {},
): Env {
  return {
    DB: {
      prepare: () => ({
        bind: () => ({ first: async () => row }),
        first: async () => null,
      }),
    },
    KV: {
      // north-wx defaults to junk (a KV miss would trigger a real Open-Meteo fetch from inside a test)
      get: async (key: string) => (key === 'north-wx' ? (opts.wx ?? { offline: true }) : null),
      put: async () => {},
    },
  } as unknown as Env;
}

const DOC = {
  title: 'The Cool Line to Claire’s Boat',
  sub: 'Booked, paid, and rolling.',
  manifesto: { kicker: 'His mountains. Her boat. Aurora’s table.', paras: ['It took eleven versions to land on the trip that was always there.'] },
  stops: [
    {
      key: 'london-in', name: 'London — the landing', node: 'london', dates: 'Fri 14 – Sat 15 Aug', nights: 1,
      hotel: { name: 'Marriott Kensington', why: 'lived', url: 'https://example.com' },
      altHotel: { name: '—', why: '', url: '' },
      wow: 'Where it was drawn.',
      days: [{
        date: 'Fri 14 Aug', title: 'Pints and plans', plan: 'The day the trip designed itself.',
        legs: [{ t: '13:31', what: 'Eurostar ES9028 — Premier, coach 12, seats 47+48', ref: '✓ booked', state: 'booked' }],
      }],
    },
    {
      key: 'cruise', name: 'The boat — paid, waiting, certain', node: 'taormina', dates: 'Wed 19 – Sat 29 Aug', nights: 2,
      hotel: { name: 'Le Dumont d’Urville', why: 'paid', url: 'https://www.ponant.com/' },
      altHotel: { name: 'Deluxe', why: '', url: '' },
      wow: 'The heart of the whole thing.',
      days: [
        {
          date: 'Wed 19 Aug', title: 'Embark', plan: 'Aboard by four.',
          legs: [{ t: '16:00', what: 'EMBARK Le Dumont d’Urville', ref: '✓ PAID IN FULL · Gallivanter ref 31966558', state: 'booked' }],
        },
        { date: 'Thu 20 Aug', title: 'Ligurian opening', plan: 'Port rhythm.' },
      ],
    },
  ],
  // decision machinery, if present in an older doc, must be ignored by this renderer
  questions: [{ q: 'Which ending?', owner: 'Claire', decides: 'x', status: 'F9 A7 J9' }],
};

const ROW = { json: JSON.stringify(DOC), updated_at: '2026-08-15 00:00:00' };
const WX = [{ id: 'taormina', name: 'Taormina', country: 'Sicily', lat: 0, lon: 0, temp: 30, code: 0,
  days: [{ tmax: 30, feels: 34, rain: 0 }, { tmax: 29, feels: 33, rain: 3 }] }];

describe('north plan · the editorial itinerary', () => {
  it('tripDayOffset maps Paris-time now to the trip epoch', () => {
    expect(tripDayOffset(new Date('2026-08-14T10:00:00Z'))).toBe(0);
    expect(tripDayOffset(new Date('2026-08-20T10:00:00Z'))).toBe(6);
    expect(tripDayOffset(new Date('2026-08-13T10:00:00Z'))).toBe(-1);
    // 23:30 UTC on the 14th is already the 15th in Paris
    expect(tripDayOffset(new Date('2026-08-14T23:30:00Z'))).toBe(1);
  });

  it('reads as a story with quiet proof: kicker hero, route line, refs as ✓ facts', async () => {
    const html = await renderPlan(stubEnv(ROW), new Date('2026-08-13T10:00:00Z'));
    expect(html).toContain('His mountains. Her boat. Aurora’s table.');
    expect(html).toContain('class="route"');
    expect(html).toContain('coach 12, seats 47+48');
    expect(html).toContain('31966558');
    expect(html).toContain('class="ok"');
    expect(html).toContain('1 day to wheels-up');
  });

  it('splits stop names into display head + italic voice line', async () => {
    const html = await renderPlan(stubEnv(ROW), new Date('2026-08-13T10:00:00Z'));
    expect(html).toContain('<h2>The boat</h2>');
    expect(html).toContain('paid, waiting, certain');
  });

  it('is today-aware: lived stanzas soften, today is marked, day-N header', async () => {
    const html = await renderPlan(stubEnv(ROW), new Date('2026-08-15T10:00:00Z'));
    expect(html).toContain('stanza lived');
    expect(html).toContain('stanza today');
    expect(html).toContain('day 2 of 3');
  });

  it('joins gentle inline weather for horizon days by stop node (offset law)', async () => {
    const html = await renderPlan(stubEnv(ROW, { wx: WX }), new Date('2026-08-15T10:00:00Z'));
    expect(html).toContain('30° / feels 34');
    expect(html).toContain('29° / feels 33 · rain');
    const without = await renderPlan(stubEnv(ROW, { wx: { bogus: true } }), new Date('2026-08-15T10:00:00Z'));
    expect(without).not.toContain('feels 34');
  });

  it('ignores decision machinery: questions in the doc never render', async () => {
    const html = await renderPlan(stubEnv(ROW), new Date('2026-08-13T10:00:00Z'));
    expect(html).not.toContain('Still being fleshed out');
    expect(html).not.toContain('Which ending?');
    expect(html).not.toContain('F9 A7');
  });

  it('escapes hostile content in legs and day text', async () => {
    const evil = JSON.parse(JSON.stringify(DOC));
    evil.stops[0].days[0].legs[0].what = '<script>alert(1)</script>';
    evil.stops[0].days[0].title = '<img onerror=x>';
    const html = await renderPlan(stubEnv({ json: JSON.stringify(evil), updated_at: 'x' }), new Date('2026-08-13T10:00:00Z'));
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<img onerror');
  });

  it('degrades to a valid page when no doc is published', async () => {
    const html = await renderPlan(stubEnv(null), new Date('2026-08-13T10:00:00Z'));
    expect(html).toContain('</html>');
    expect(html).toContain('/north');
  });
});
