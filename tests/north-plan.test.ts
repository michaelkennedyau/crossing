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
  manifesto: { kicker: 'His mountains. Her boat.', paras: [] },
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

  it('reads as a story with quiet proof: kicker hero, refs as plain green words, no icons', async () => {
    const html = await renderPlan(stubEnv(ROW), new Date('2026-08-13T10:00:00Z'));
    expect(html).toContain('His mountains. Her boat.');
    expect(html).toContain('coach 12, seats 47+48');
    expect(html).toContain('31966558');
    expect(html).toContain('class="ok"');
    expect(html).toContain('it starts tomorrow');
    for (const glyph of ['✓', '↗', '→', '⎙']) expect(html).not.toContain(glyph);
    expect(html).not.toContain('class="route"');
  });

  it('splits stop names into display head + italic voice line', async () => {
    const html = await renderPlan(stubEnv(ROW), new Date('2026-08-13T10:00:00Z'));
    expect(html).toContain('<h2>The boat</h2>');
    expect(html).toContain('paid, waiting, certain');
  });

  it('starts from now: the past folds into an auto-collapsed details, today is named plainly', async () => {
    const html = await renderPlan(stubEnv(ROW), new Date('2026-08-15T10:00:00Z'));
    expect(html).toContain('<details class="done">');       // the fold exists (collapsed: no open attr)
    expect(html).not.toContain('<details class="done" open');
    expect(html).toContain('the story so far');
    const fold = html.slice(html.indexOf('<details class="done">'), html.indexOf('</details>'));
    expect(fold).toContain('<h2>London</h2>');              // whole past stop lives inside the fold
    expect(fold).toContain('Pints and plans');              // its days keep their prose
    const after = html.slice(html.indexOf('</details>'));
    expect(after).not.toContain('<h2>London</h2>');         // and only inside the fold
    expect(html).toContain('stanza today');
    expect(html).toContain('today: the boat');
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

// ── the weather tab ──
import { renderWeatherGuide, guidance } from '../src/north-weather-page';

describe('north weather · the guidance tab', () => {
  it('guidance speaks in plain bands', () => {
    expect(guidance(22, false)).toContain('cool');
    expect(guidance(27, false)).toContain('Lovely');
    expect(guidance(31, true)).toContain('rain layer');
    expect(guidance(36, false)).toContain('Hot in the middle of the day');
    expect(guidance(null, false)).toContain('Too far out');
  });

  it('renders remaining stops with day lines from the 16-day cache and explains the shape', async () => {
    const wx16 = [{ id: 'taormina', days: Array.from({ length: 16 }, () => ({ tmax: 30, feels: 33, rain: 0 })) }];
    const env = {
      DB: { prepare: () => ({ bind: () => ({ first: async () => ({ json: JSON.stringify(DOC) }) }), first: async () => null }) },
      KV: { get: async (k: string) => (k === 'north-wx16' ? wx16 : { offline: true }), put: async () => {} },
    } as unknown as Env;
    const html = await renderWeatherGuide(env, new Date('2026-08-15T10:00:00Z'));
    expect(html).toContain('Aurora joins for lunch');
    expect(html).toContain('golden night inside the walls');
    expect(html).toContain('Palermo for three Sicilian nights');
    expect(html).toContain('feels 33');
    expect(html).toContain('Hot in the middle of the day');   // feels 33 is the hot band, and the page says so
    expect(html).not.toContain('<h2>London</h2>'); // past stop gone here too
  });
});

describe('north plan · views and tidbits', () => {
  it('renders a stop image with caption, notes as tidbits, and the icon in the chapter head', async () => {
    const rich = JSON.parse(JSON.stringify(DOC));
    rich.stops[1].img = { src: '/img/arc-sardinia-1280.webp', caption: 'the water' };
    rich.stops[1].notes = ['Named for the explorer who named Adélie Land after his wife.'];
    rich.stops[1].icon = '🛳️';
    const html = await renderPlan(stubEnv({ json: JSON.stringify(rich), updated_at: 'x' }), new Date('2026-08-13T10:00:00Z'));
    expect(html).toContain('/img/arc-sardinia-1280.webp');
    expect(html).toContain('the water');
    expect(html).toContain('Adélie Land');
    expect(html).toContain('🛳️ The boat');
  });
});
