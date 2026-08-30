import { describe, expect, it } from 'vitest';
import { app } from '../../src/app';
import { journalEnv } from './stub-env';
import { traversataMd } from '../../src/journal/render-traversata';

/**
 * La Traversata: per-audience rooms at unguessable links. The hard law under test is
 * ISOLATION — a room never leaks a syllable of another room — plus the guest-link
 * lifecycle: minted from the dispatch desk, softly counted, individually cancellable.
 */

const DAVI = { label: 'per la famiglia Daví', star: 'PALERMO', dedication: 'For the Daví family — the English original.', summary: 'DAVIMARK the marina at forty-five', long: 'the long road, Palermo only', glossary: [{ term: 'Conditions remain superb.', def: 'everything is wonderful' }], programme: 'PROGRAMME DU JOUR — Palermo' };
const KIDS = { label: 'for the six of you', star: 'BRISBANE', dedication: 'Nicholas · Sarah · Emily', summary: 'KIDSMARK before the belt', long: 'kids long road', glossary: [], programme: 'kids programme' };
const US = { label: 'for the two of us', star: 'THE BERTH', dedication: 'For us — the one room with no audience.', intimate: true, summary: 'USMARK no audience', long: 'us long road', glossary: [], programme: 'us programme' };

const T_DAVI = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const T_KIDS = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const T_US = 'cccccccccccccccccccccccc';
const G_AURORA = 'dddddddddddddddddddddddd';

const MODES = [
  { key: 'davi', token: T_DAVI, json: JSON.stringify(DAVI) },
  { key: 'kids', token: T_KIDS, json: JSON.stringify(KIDS) },
  { key: 'us', token: T_US, json: JSON.stringify(US) },
];

const get = (env: unknown, path: string, cookie?: string) =>
  app.fetch(new Request(`http://x${path}`, cookie ? { headers: { cookie } } : undefined), env as never);

describe('traversata · the rooms', () => {
  it('a master token renders ONLY its room — zero leakage of the other editions', async () => {
    const { env } = journalEnv({ traversata: MODES });
    const res = await get(env, `/t/${T_DAVI}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('famiglia Daví');       // its own edition label
    expect(html).toContain('DAVIMARK');
    expect(html).toContain('PALERMO');             // its own star
    expect(html).not.toContain('KIDSMARK');
    expect(html).not.toContain('USMARK');
    expect(html).not.toContain('for the six of you');
    expect(html).not.toContain('THE BERTH');
  });

  it('the edition is named on the page and in the title', async () => {
    const { env } = journalEnv({ traversata: MODES });
    const html = await (await get(env, `/t/${T_KIDS}`)).text();
    expect(html).toContain('class="edn"');
    expect(html).toContain('<title>La Traversata · for the six of you</title>');
  });

  it('misses are uniform: unknown token, bad shape, disabled mode — same 404 body', async () => {
    const { env } = journalEnv({ traversata: [{ key: 'davi', token: T_DAVI, json: JSON.stringify(DAVI), enabled: 0 }] });
    const a = await get(env, '/t/ffffffffffffffffffffffff');
    const b = await get(env, '/t/NOT-A-TOKEN');
    const c = await get(env, `/t/${T_DAVI}`);
    expect(a.status).toBe(404);
    const [ta, tb, tc] = await Promise.all([a.text(), b.text(), c.text()]);
    expect(ta).toBe(tb);
    expect(tb).toBe(tc);
  });

  it('the bare root lists nothing', async () => {
    const { env } = journalEnv({ traversata: MODES });
    const res = await get(env, '/t');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('travels by invitation');
    expect(html).not.toContain(T_DAVI);
    expect(html).not.toContain('famiglia');
  });

  it('md-mini escapes hostile content and still renders emphasis + tables', () => {
    const html = traversataMd('**bold** and <script>alert(1)</script>\n\n| a | b |\n| --- | --- |\n| 1 | 2 |');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('<table class="rate"><tr><td>a</td><td>b</td></tr><tr><td>1</td><td>2</td></tr></table>');
  });
});

describe('traversata · guest links (the soft ledger)', () => {
  it('a grant renders its room and bumps the soft count; a second open bumps again', async () => {
    const { env, tGrants } = journalEnv({ traversata: MODES, grants: [{ token: G_AURORA, mode_key: 'davi', note: 'Aurora' }] });
    const res = await get(env, `/t/${G_AURORA}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('DAVIMARK');
    expect(tGrants.get(G_AURORA)!.opened_count).toBe(1);
    expect(tGrants.get(G_AURORA)!.first_opened).not.toBe('');
    await get(env, `/t/${G_AURORA}`);
    expect(tGrants.get(G_AURORA)!.opened_count).toBe(2);
  });

  it('a cancelled grant dies mid-air; the master token and other grants live on', async () => {
    const { env, tGrants } = journalEnv({
      traversata: MODES,
      grants: [{ token: G_AURORA, mode_key: 'davi', note: 'Aurora', enabled: 0 }, { token: 'ee'.repeat(12), mode_key: 'davi', note: 'Mum' }],
    });
    expect((await get(env, `/t/${G_AURORA}`)).status).toBe(404);
    expect(tGrants.get(G_AURORA)!.opened_count).toBe(0);   // a dead link counts nothing
    expect((await get(env, `/t/${'ee'.repeat(12)}`)).status).toBe(200);
    expect((await get(env, `/t/${T_DAVI}`)).status).toBe(200);
  });

  it('minting: admin gets a fresh url; the note is kept; bad modes bounce', async () => {
    const { env, tGrants } = journalEnv({ traversata: MODES });
    const res = await app.fetch(new Request('http://x/api/journal/traversata/grants', {
      method: 'POST', headers: { cookie: 'ja=admin-secret-token', 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'davi', note: 'Aurora — Monday evening' }),
    }), env as never);
    expect(res.status).toBe(200);
    const j = await res.json() as { token: string; url: string };
    expect(j.url).toBe(`https://traversata.varo.au/${j.token}`);
    expect(tGrants.get(j.token)!.note).toBe('Aurora — Monday evening');
    expect(tGrants.get(j.token)!.mode_key).toBe('davi');
    expect(tGrants.get(j.token)!.created_by).toBe('m');

    const bad = await app.fetch(new Request('http://x/api/journal/traversata/grants', {
      method: 'POST', headers: { cookie: 'ja=admin-secret-token', 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'nonsense-mode!' }),
    }), env as never);
    expect(bad.status).toBe(400);
  });

  it('reader keys cannot mint or cancel', async () => {
    const { env } = journalEnv({ traversata: MODES });
    const res = await app.fetch(new Request('http://x/api/journal/traversata/grants', {
      method: 'POST', headers: { cookie: 'jr=read-secret-token', 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'davi' }),
    }), env as never);
    expect(res.status).toBe(403);
  });

  it('cancel flips the switch in D1', async () => {
    const { env, tGrants } = journalEnv({ traversata: MODES, grants: [{ token: G_AURORA, mode_key: 'davi', note: 'Aurora' }] });
    const res = await app.fetch(new Request(`http://x/api/journal/traversata/grants/${G_AURORA}/cancel`, {
      method: 'POST', headers: { cookie: 'ja=admin-secret-token' },
    }), env as never);
    expect(res.status).toBe(200);
    expect(tGrants.get(G_AURORA)!.enabled).toBe(0);
  });
});

describe('traversata · the dispatch desk', () => {
  it('admin sees the dropdown, every room including the intimate one, and the ledger', async () => {
    const { env } = journalEnv({ traversata: MODES, grants: [{ token: G_AURORA, mode_key: 'davi', note: 'Aurora', opened_count: 2, last_opened: '2026-08-31 19:40:00' }] });
    const html = await (await get(env, '/journal/traversata', 'ja=admin-secret-token')).text();
    expect(html).toContain('id="t-mint"');
    expect(html).toContain('for the two of us');       // intimate plate, admin eyes
    expect(html).toContain('Aurora');                  // the ledger row
    expect(html).toContain('opened ×2');
    expect(html).toContain(`data-cancel="${G_AURORA}"`);
  });

  it('a reader sees rooms but never the intimate one, the form, or the ledger', async () => {
    const { env } = journalEnv({ traversata: MODES, grants: [{ token: G_AURORA, mode_key: 'davi', note: 'Aurora' }] });
    const html = await (await get(env, '/journal/traversata', 'jr=read-secret-token')).text();
    expect(html).toContain('famiglia Daví');
    expect(html).not.toContain('for the two of us');
    expect(html).not.toContain(T_US);                  // not even the intimate room's link
    expect(html).not.toContain('id="t-mint"');
    expect(html).not.toContain(G_AURORA);
  });

  it('the public never reaches the desk', async () => {
    const { env } = journalEnv({ traversata: MODES });
    const html = await (await get(env, '/journal/traversata')).text();
    expect(html).not.toContain('famiglia');
    expect(html).not.toContain(T_DAVI);
  });
});

describe('traversata · editing without a redeploy', () => {
  it('PUT merges partially — the [NAME] fill touches one field only', async () => {
    const { env, tModes } = journalEnv({ traversata: MODES });
    const res = await app.fetch(new Request('http://x/api/journal/traversata/davi', {
      method: 'PUT', headers: { cookie: 'ja=admin-secret-token', 'content-type': 'application/json' },
      body: JSON.stringify({ dedication: 'For the Daví family, with the name filled in.' }),
    }), env as never);
    expect(res.status).toBe(200);
    const stored = JSON.parse(tModes.get('davi')!.json) as { dedication: string; summary: string; label: string };
    expect(stored.dedication).toBe('For the Daví family, with the name filled in.');
    expect(stored.summary).toBe(DAVI.summary);         // untouched
    expect(stored.label).toBe(DAVI.label);
  });

  it('rotate mints a new master token and the old one dies', async () => {
    const { env, tModes } = journalEnv({ traversata: MODES });
    const res = await app.fetch(new Request('http://x/api/journal/traversata/davi/rotate', {
      method: 'POST', headers: { cookie: 'ja=admin-secret-token' },
    }), env as never);
    expect(res.status).toBe(200);
    const j = await res.json() as { token: string };
    expect(tModes.get('davi')!.token).toBe(j.token);
    expect((await get(env, `/t/${T_DAVI}`)).status).toBe(404);
    expect((await get(env, `/t/${j.token}`)).status).toBe(200);
  });
});
