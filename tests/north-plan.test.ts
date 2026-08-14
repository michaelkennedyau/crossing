import { describe, expect, it } from 'vitest';
import { renderPlan } from '../src/north-plan';
import type { Env } from '../src/env';

/** minimal stubbed bindings: D1 returns the given itinerary row, KV the given outlook */
function stubEnv(row: { json: string; updated_at: string } | null, outlook: unknown = null): Env {
  return {
    DB: {
      prepare: () => ({
        bind: () => ({ first: async () => row }),
        first: async () => null,
      }),
    },
    KV: { get: async () => outlook },
  } as unknown as Env;
}

const DOC = {
  title: 'A week in Greece, then open',
  sub: 'Book the week, keep the freedom.',
  stops: [
    {
      key: 'milos', name: 'Milos — the board’s 91', dates: 'Sun 16 – Fri 21 Aug', nights: 5,
      hotel: { name: 'Skinopi Lodge', why: 'nine villas alone on the gulf', url: 'https://www.skinopi.com/' },
      altHotel: { name: 'Milos Cove', why: 'the full-service version', url: 'https://miloscove.com/' },
      days: [{ date: 'Sun 16 Aug', title: 'The morning hop', plan: 'Fly in, swim.' }],
      eat: ['O! Hamos!'], do: ['Kleftiko'], events: [], watchouts: ['Meltemi sets the schedule'],
    },
    {
      key: 'open', name: 'Then open', dates: 'Fri 21 – Sun 30 Aug', nights: 10,
      hotel: { name: 'Unbooked — deliberately', why: 'the board decides', url: 'https://crossing.varo.au/north' },
      altHotel: { name: 'The standing leaders', why: 'Sifnos or the Riviera', url: 'https://www.verina.gr/' },
      days: [{ date: 'Fri 21 Aug', title: 'The first open morning', plan: 'Check the bridge, pick, go.' }],
      eat: [], do: [], events: [], watchouts: [],
    },
    {
      key: 'london', name: 'London — the soft landing', dates: 'Mon 31 Aug – Wed 2 Sep', nights: 2,
      hotel: { name: 'The Zetter', why: 'the sane pick', url: 'https://www.thezetter.com/' },
      altHotel: { name: 'Claridge’s', why: 'the ceremony version', url: 'https://www.claridges.co.uk/' },
      days: [{ date: 'Mon 31 Aug', title: 'Fly up', plan: 'Curtain at 19:30.' }],
      eat: [], do: [], events: [], watchouts: [],
    },
  ],
  bookings: [{ item: 'Skinopi Lodge, 5 nights', status: 'book-now', est: 'A$5,500–7,000' }],
  costs: { committed: 'A$8,000–10,300', envelope: 'A$18,000–28,000', note: 'Indicative, August peak.' },
};

const OUTLOOK = {
  outlook: {
    headline: 'The Aegean is the only place on the board that is actually pleasant.',
    narrative: 'n', watch: [],
    ranking: [
      { arc: 'cyclades', score: 91, verdict: 'go', because: 'feels at or under tmax' },
      { arc: 'scotgreece', score: 78, verdict: 'go', because: 'both ends working' },
    ],
  },
  generatedAt: new Date().toISOString(),
};

describe('north plan · the printed document', () => {
  it('renders the doc: title, every stop, beds, bookings and totals', async () => {
    const html = await renderPlan(stubEnv({ json: JSON.stringify(DOC), updated_at: '2026-08-11 07:00:00' }, OUTLOOK));
    for (const s of ['A week in Greece, then open', 'Milos', 'Then open', 'London — the soft landing']) {
      expect(html).toContain(s);
    }
    expect(html).toContain('Skinopi Lodge');
    expect(html).toContain('https://www.skinopi.com/');
    expect(html).toContain('A$8,000–10,300');
    expect(html).toContain('book now');
  });

  it('carries the outlook read with its fired stamp, and stands without one', async () => {
    const row = { json: JSON.stringify(DOC), updated_at: '2026-08-11 07:00:00' };
    const withOl = await renderPlan(stubEnv(row, OUTLOOK));
    expect(withOl).toContain('actually pleasant');
    expect(withOl).toContain('outlook fired');
    expect(withOl).toContain('91');
    const without = await renderPlan(stubEnv(row, null));
    expect(without).toContain('A week in Greece');
    expect(without).not.toContain('the board&#39;s current read');
  });

  it('escapes hostile doc content', async () => {
    const evil = { ...DOC, title: '<script>alert(1)</script>' };
    const html = await renderPlan(stubEnv({ json: JSON.stringify(evil), updated_at: 'x' }, null));
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  it('degrades to a valid page when no doc is published', async () => {
    const html = await renderPlan(stubEnv(null, null));
    expect(html).toContain('</html>');
    expect(html).toContain('/north');
  });

  it('renders the manifesto and wow strips when the doc carries them', async () => {
    const sold = {
      ...DOC,
      manifesto: { kicker: 'The Grand Tour — the real one.', paras: ['Six countries, three seas.', 'You outflanked it.'] },
      stops: [
        { ...DOC.stops[0], wow: 'You built a machine to find the best swimming in Europe. It found this.' },
        ...DOC.stops.slice(1),
      ],
    };
    const html = await renderPlan(stubEnv({ json: JSON.stringify(sold), updated_at: 'x' }, null));
    expect(html).toContain('The Grand Tour — the real one.');
    expect(html).toContain('Six countries, three seas.');
    expect(html).toContain('It found this.');
    expect(html.match(/class="wow"/g)?.length).toBe(1); // only the wow-bearing stop gets a strip
  });

  it('a bare doc renders no manifesto or wow markup, and hostile wow text is escaped', async () => {
    const bare = await renderPlan(stubEnv({ json: JSON.stringify(DOC), updated_at: 'x' }, null));
    expect(bare).not.toContain('class="wow"');
    expect(bare).not.toContain('class="manifesto"');
    const evil = { ...DOC, stops: [{ ...DOC.stops[0], wow: '<script>alert(1)</script>' }, ...DOC.stops.slice(1)] };
    const html = await renderPlan(stubEnv({ json: JSON.stringify(evil), updated_at: 'x' }, null));
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });
});
