import { describe, expect, it } from 'vitest';
import { renderPlan, tripDayOffset } from '../src/north-plan';
import type { Env } from '../src/env';

/** stubbed bindings: D1 returns the itinerary row; KV routes by key (outlook vs weather) */
function stubEnv(
  row: { json: string; updated_at: string } | null,
  opts: { outlook?: unknown; wx?: unknown } = {},
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
      get: async (key: string) => (key === 'north-wx' ? (opts.wx ?? { offline: true }) : (opts.outlook ?? null)),
      put: async () => {},
    },
  } as unknown as Env;
}

const DOC = {
  title: 'The Cool Line to Claire’s Boat — the living itinerary',
  sub: 'Part-paid, part-lived.',
  manifesto: { kicker: 'His mountains. Her boat. Aurora’s table.', paras: ['Eleven versions, one with receipts.'] },
  stops: [
    {
      key: 'london-in', name: 'London', node: 'london', dates: 'Fri 14 – Sat 15 Aug', nights: 1,
      hotel: { name: 'Marriott Kensington', why: 'lived', url: 'https://example.com' },
      altHotel: { name: '—', why: '', url: '' },
      wow: 'Where it was drawn.',
      days: [{
        date: 'Fri 14 Aug', title: 'Pints and plans', plan: 'The day the trip designed itself.',
        legs: [{ t: '13:31', what: 'Eurostar ES9028 — Premier, coach 12, seats 47+48', ref: '✓ booked · flex to Mon', state: 'booked' }],
      }],
    },
    {
      key: 'cruise', name: 'Claire’s boat', node: 'taormina', dates: 'Wed 19 – Sat 29 Aug', nights: 2,
      hotel: { name: 'Le Dumont d’Urville', why: 'paid', url: 'https://www.ponant.com/' },
      altHotel: { name: 'Deluxe', why: '', url: '' },
      days: [
        {
          date: 'Wed 19 Aug', title: 'Embark', plan: 'Aboard by four.',
          legs: [{ t: '16:00', what: 'EMBARK Le Dumont d’Urville', ref: '✓ PAID A$25,460 · Gallivanter ref 31966558', state: 'booked' }],
        },
        {
          date: 'Thu 20 Aug', title: 'Ligurian opening', plan: 'Port rhythm.',
          legs: [{ t: 'am', what: 'Sunbeds at Paloma', ref: 'to book', state: 'todo' }],
        },
      ],
    },
  ],
  questions: [
    {
      q: 'Which ending?', owner: 'Claire', decides: 'the last four day-cards',
      status: 'Wed 2 = F7 A5 J9 · Thu 3 = F9 A7 J9 · Fri 4 dead',
      imgs: [{ src: '/img/qf2-0903.png', caption: 'QF2 Thu 3 Sep — the most open flight ✓✓' }],
    },
  ],
  costs: { committed: '≈A$28,000 paid', envelope: 'A$33,500–36,500', note: 'Indicative.' },
};

const ROW = { json: JSON.stringify(DOC), updated_at: '2026-08-15 00:00:00' };
const WX = [{ id: 'taormina', name: 'Taormina', country: 'Sicily', lat: 0, lon: 0, temp: 30, code: 0,
  days: [{ tmax: 30, feels: 34, rain: 0 }, { tmax: 29, feels: 33, rain: 3 }] }];

describe('north plan · the living itinerary', () => {
  it('tripDayOffset maps Paris-time now to the trip epoch', () => {
    expect(tripDayOffset(new Date('2026-08-14T10:00:00Z'))).toBe(0);
    expect(tripDayOffset(new Date('2026-08-20T10:00:00Z'))).toBe(6);
    expect(tripDayOffset(new Date('2026-08-13T10:00:00Z'))).toBe(-1);
    // 23:30 UTC on the 14th is already the 15th in Paris
    expect(tripDayOffset(new Date('2026-08-14T23:30:00Z'))).toBe(1);
  });

  it('renders the proof: booking refs, seat numbers, payment reference, meter', async () => {
    const html = await renderPlan(stubEnv(ROW), new Date('2026-08-13T10:00:00Z'));
    expect(html).toContain('coach 12, seats 47+48');
    expect(html).toContain('31966558');
    expect(html).toContain('chip ok');
    expect(html).toContain('chip todo');
    expect(html).toContain('2 of 3 legs booked');
    expect(html).toContain('1 day to wheels-up');
  });

  it('is today-aware: lived days compress, today glows, day-N header', async () => {
    const html = await renderPlan(stubEnv(ROW), new Date('2026-08-15T10:00:00Z'));
    expect(html).toContain('day lived');   // Fri 14
    expect(html).toContain('day today');   // Sat 15 = offset 1 (second day card)
    expect(html).toContain('Day 2 of 3');
  });

  it('joins live weather chips for horizon days by stop node (offset law, not date labels)', async () => {
    // card offsets rule: the cruise stop's two cards sit at offsets 1 and 2 in this fixture
    const html = await renderPlan(stubEnv(ROW, { wx: WX }), new Date('2026-08-15T10:00:00Z'));
    expect(html).toContain('30° / feels 34');           // offset 1 = today → wx idx 0
    expect(html).toContain('29° / feels 33 · rain');    // offset 2 = tomorrow → wx idx 1
    // junk in the wx cache (not a miss — a miss would hit the real API from a test)
    const without = await renderPlan(stubEnv(ROW, { wx: { bogus: true } }), new Date('2026-08-15T10:00:00Z'));
    expect(without).not.toContain('feels 34');
  });

  it('renders the questions panel with owners and evidence figures', async () => {
    const html = await renderPlan(stubEnv(ROW), new Date('2026-08-13T10:00:00Z'));
    expect(html).toContain('Still being fleshed out');
    expect(html).toContain('Which ending?');
    expect(html).toContain('Claire');
    expect(html).toContain('/img/qf2-0903.png');
    expect(html).toContain('the most open flight');
  });

  it('backward compat: a doc without questions or legs renders clean', async () => {
    const bare = { title: 'T', sub: 's', stops: [{ key: 'x', name: 'X', node: 'london', dates: 'd', nights: 1,
      hotel: { name: 'H', why: '', url: '' }, altHotel: { name: 'A', why: '', url: '' },
      days: [{ date: 'Fri 14 Aug', title: 'day', plan: 'p' }] }] };
    const html = await renderPlan(stubEnv({ json: JSON.stringify(bare), updated_at: 'x' }), new Date('2026-08-13T10:00:00Z'));
    expect(html).toContain('</html>');
    expect(html).not.toContain('Still being fleshed out');
    expect(html).not.toContain('legs booked');   // no legs → no meter at all
  });

  it('escapes hostile leg and question content', async () => {
    const evil = JSON.parse(JSON.stringify(DOC));
    evil.stops[0].days[0].legs[0].what = '<script>alert(1)</script>';
    evil.questions[0].q = '<img onerror=x>';
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
