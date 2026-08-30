import { describe, expect, it } from 'vitest';
import { app } from '../../src/app';
import { journalEnv } from './stub-env';
import type { Block } from '../../src/journal/blocks';

const R = { cookie: 'jr=read-secret-token' };
const A = { cookie: 'ja=admin-secret-token' };

const BLOCKS: Block[] = [
  { t: 'p', text: 'The tender ran us in under the citadel.', by: 'seed' },
  { t: 'p', text: 'Claire added this line herself.', by: 'c' },
  { t: 'mono', text: 'refs TKD3G6', by: 'seed' },
  { t: 'img', n: 1, by: 'seed' },
  { t: 'drop', text: 'Nelson lost the sight of his right eye besieging these walls, 1794.', by: 'seed' },
  { t: 'ledger', amount: '150 EUR', text: 'the snorkel, both of us', by: 'seed' },
  { t: 'doctrine', text: 'avoid ruin, then optimise.', by: 'seed' },
  { t: 'map', by: 'seed' },
  { t: 'prompt', q: 'What did the guide say that survived the day?', by: 'seed' },
  { t: 'card', star: 'the citadel from the water', lines: [], by: 'seed' },
  { t: 'img', n: 9, by: 'seed' },
];

const CH = {
  id: 'ch06-calvi', day_date: '2026-08-20', title: 'The Citadel from the Water',
  voice: 'first tender, first walking tour', closer: 'still no rescue',
  threads: '["water","drops"]', body: JSON.stringify(BLOCKS), public: 0,
};
const ASSETS = [
  { id: '01234567-89ab-cdef-0123-456789abcdef', chapter_id: 'ch06-calvi', w: 4000, h: 3000, lqip: 'data:image/webp;base64,xx', caption: 'the walls from the tender', fmt: 'webp', enabled: 1 },
  { id: '11234567-89ab-cdef-0123-456789abcdef', chapter_id: 'ch06-calvi', w: 4000, h: 3000, lqip: '', caption: '', fmt: 'webp', enabled: 1 },
];

const fetchCh = (env: import('../../src/env').Env, slug: string, headers?: Record<string, string>) =>
  app.fetch(new Request(`http://x/journal/ch/${slug}`, headers ? { headers } : undefined), env);

describe('journal · chapter page', () => {
  it('renders every block type in the register, with author marks for family', async () => {
    const { env } = journalEnv({ chapters: [CH], assets: ASSETS });
    const html = await (await fetchCh(env, 'ch06-calvi', R)).text();
    expect(html).toContain('The Citadel from the Water');
    expect(html).toContain('first tender, first walking tour');
    expect(html).toContain('data-by="c"');                      // Claire's margin mark
    expect(html).toContain('class="hook"');                     // the hook drop leads the entry
    expect(html).toContain('class="et"');                       // entry-title voice, 28/31
    expect(html).not.toContain('data-by="seed"');               // seed unmarked
    expect(html).toContain('class="drop"');
    expect(html).toContain('€150');                             // fmtAmount
    expect(html).toContain('the doctrine');
    expect(html).toContain('CALVI');                            // the map rendered
    expect(html).toContain('What did the guide say');           // prompt visible to family
    expect(html).toContain('card unwritten');                   // Claire's empty card invitation
    expect(html).toContain('still no rescue');                  // the closer
    expect(html).toContain('data:image/webp;base64,xx');        // LQIP inline background
    expect(html).toContain('srcset');
    expect(html).toContain('back to');
  });

  it('a leading map floats to after the first paragraph — the voice opens the page', async () => {
    const leadMap = [{ t: 'map', by: 'seed' }, { t: 'p', text: 'The voice goes first.', by: 'seed' }, { t: 'p', text: 'Second.', by: 'seed' }];
    const ch = { ...CH, id: 'ch06-calvi', body: JSON.stringify(leadMap) };
    const { env } = journalEnv({ chapters: [ch] });
    const html = await (await fetchCh(env, 'ch06-calvi', R)).text();
    const voiceAt = html.indexOf('The voice goes first.');
    const mapAt = html.indexOf('class="jmap"');
    expect(voiceAt).toBeGreaterThan(-1);
    expect(mapAt).toBeGreaterThan(voiceAt);                     // map after the first p
    expect(html).toContain('Thu 20 Aug · the journal');         // humanised overline
  });

  it('unplaced photos append after a hairline; overflow img is invisible to readers, a debt for admin', async () => {
    const { env } = journalEnv({ chapters: [CH], assets: ASSETS });
    const reader = await (await fetchCh(env, 'ch06-calvi', R)).text();
    expect(reader).toContain('strip-rule');                     // asset 2 appended
    expect(reader).not.toContain('nothing uploaded yet');       // img 9 hole invisible
    const admin = await (await fetchCh(env, 'ch06-calvi', A)).text();
    expect(admin).toContain('photo 9 — nothing uploaded yet');
  });

  it('escapes hostile content everywhere', async () => {
    const evil = { ...CH, id: 'ch66-evil', title: '<script>alert(1)</script>', body: JSON.stringify([
      { t: 'p', text: '<img onerror=x>', by: 'seed' },
      { t: 'prompt', q: '"><script>steal()</script>', by: 'seed' },
    ]) };
    const { env } = journalEnv({ chapters: [evil] });
    const html = await (await fetchCh(env, 'ch66-evil', R)).text();
    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('<img onerror');
    expect(html).not.toContain('<script>steal');
  });

  it('public tier: private chapter and nonexistent slug are byte-identical gates — no oracle', async () => {
    const { env } = journalEnv({ chapters: [CH] });
    const priv = await (await fetchCh(env, 'ch06-calvi')).text();
    const none = await (await fetchCh(env, 'zzz-nope')).text();
    expect(priv).toBe(none);
    expect(priv).toContain('family-only');
    expect(priv).not.toContain('Citadel');
  });

  it('public tier sees a public chapter whole minus prompts and marks', async () => {
    const pub = { ...CH, public: 1 };
    const { env } = journalEnv({ chapters: [pub], assets: ASSETS });
    const html = await (await fetchCh(env, 'ch06-calvi')).text();
    expect(html).toContain('The Citadel from the Water');
    expect(html).toContain('€150');                             // ledger kept
    expect(html).not.toContain('What did the guide say');       // prompts omitted
    expect(html).not.toContain('data-by="');                    // no author marks in markup (CSS selectors don't count)
  });

  it('prev/next is tier-filtered — a private neighbour never leaks', async () => {
    const pub = { ...CH, public: 1 };
    const hidden = { ...CH, id: 'ch07-cap-corse', title: 'SecretNext', public: 0 };
    const { env } = journalEnv({ chapters: [pub, hidden] });
    const html = await (await fetchCh(env, 'ch06-calvi')).text();
    expect(html).not.toContain('SecretNext');
    const fam = await (await fetchCh(env, 'ch06-calvi', R)).text();
    expect(fam).toContain('SecretNext');
  });

  it('reader miss is a quiet 404, not the gate', async () => {
    const { env } = journalEnv({ chapters: [CH] });
    const res = await fetchCh(env, 'zzz-nope', R);
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('Nothing lives at this address');
  });
});

describe('journal · home spine dynamics', () => {
  it('family home shows rings, dots, overview map; public home shows the map but no game', async () => {
    const claireBlock: Block[] = [{ t: 'p', text: 'hers '.repeat(160), by: 'c' }];
    const chapters = [
      { ...CH, body: JSON.stringify(claireBlock), public: 1 },
      { ...CH, id: 'ch07-cap-corse', title: 'Around Cap Corse', public: 0 },
    ];
    const { env } = journalEnv({ chapters, assets: ASSETS });
    const fam = await (await app.fetch(new Request('http://x/journal', { headers: R }), env)).text();
    expect(fam).toContain('knot told');                         // Claire's chapter crossed told
    expect(fam).toContain('dc');                                // Claire's dot
    expect(fam).toContain('spine-map');
    expect(fam).toContain('class="mov"');                       // the movements on the cord
    expect(fam).toContain('Thu 20 Aug');                        // humanised dates
    expect(fam).not.toContain('2026-08-20');                    // ISO gone from the page
    const pub = await (await app.fetch(new Request('http://x/journal'), env)).text();
    expect(pub).toContain('spine-map');                         // the silhouette is public
    expect(pub).toContain('class="knot"');                      // neutral knots only
    expect(pub).not.toContain('knot told');
    expect(pub).not.toContain('told-stamp">told');
    expect(pub).not.toContain('Around Cap Corse');
  });
});

describe('journal · the run-sheet', () => {
  it('family sees the guide; public gets the gate; the ritual is taught', async () => {
    const { env } = journalEnv();
    const fam = await (await app.fetch(new Request('http://x/journal/guide', { headers: R }), env)).text();
    expect(fam).toContain('What we do now.');
    expect(fam).toContain('crepi il lupo');
    expect(fam).toContain('in bocca al lupo');
    expect(fam).toContain('BA619');
    const pub = await (await app.fetch(new Request('http://x/journal/guide'), env)).text();
    expect(pub).toContain('family-only');
    expect(pub).not.toContain('crepi il lupo');
  });
});

describe('journal · self-instruction', () => {
  it('family home teaches itself: the grim key, tonight card, how-it-works, house phrases', async () => {
    const lived = { ...CH, day_date: '2026-08-20', public: 0 };
    const { env } = journalEnv({ chapters: [lived] });
    const fam = await (await app.fetch(new Request('http://x/journal', { headers: R }), env)).text();
    expect(fam).toContain('everything is wonderful. house usage');
    expect(fam).toContain("tonight's chapter");
    expect(fam).toContain('how this works');
    expect(fam).toContain('obligatory not to smile');
    expect(fam).toContain('the cord holds the ink');            // the barometer line (plate 6.1)
    expect(fam).toContain('--told-depth');
    expect(fam).toContain('A smile voids the sentence');
  });

  it('public home gets the grim key but never the family deck', async () => {
    const pub = { ...CH, public: 1 };
    const { env } = journalEnv({ chapters: [pub] });
    const html = await (await app.fetch(new Request('http://x/journal'), env)).text();
    expect(html).toContain('everything is wonderful. house usage');
    expect(html).not.toContain('how this works');
    expect(html).not.toContain("tonight's chapter");
    expect(html).not.toContain('the house phrases');
    expect(html).not.toContain('the cord holds the ink');
  });

  it('the first prompt on a chapter carries the pen affordance, family only', async () => {
    const { env } = journalEnv({ chapters: [CH], assets: ASSETS });
    const fam = await (await fetchCh(env, 'ch06-calvi', R)).text();
    expect((fam.match(/answer these →/g) ?? []).length).toBe(1);
    expect(fam).toContain('/admin#ch/ch06-calvi');
    expect(fam).toContain('✎ edit this day');
    const pub = await (await fetchCh(env, 'ch06-calvi')).text();
    expect(pub).not.toContain('answer these →');
    expect(pub).not.toContain('edit this day');
  });
});
