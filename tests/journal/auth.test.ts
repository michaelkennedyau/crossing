import { describe, expect, it } from 'vitest';
import { app } from '../../src/app';
import { tokenEquals, parseCookies, resolveTier } from '../../src/journal/auth';
import { journalEnv } from './stub-env';

const CHAPTERS = [
  { id: 'ch03-portofino', day_date: '2026-08-23', title: 'Portofino', voice: 'arrival by water', threads: '["water","doctrine"]', closer: 'conditions remain superb', public: 1, sort: 3, enabled: 1 },
  { id: 'ch08-etna', day_date: '2026-08-28', title: 'Etna', voice: 'the mountain read from the deck', threads: '["screens","ledger"]', closer: 'as arranged', public: 0, sort: 8, enabled: 1 },
];

describe('journal · token mechanics', () => {
  it('constant-time compare: equal, unequal, and different lengths', async () => {
    expect(await tokenEquals('abc', 'abc')).toBe(true);
    expect(await tokenEquals('abc', 'abd')).toBe(false);
    expect(await tokenEquals('abc', 'abcdef')).toBe(false);
  });

  it('parses cookies tolerantly', () => {
    expect(parseCookies('jr=tok1; ja=tok2')).toEqual({ jr: 'tok1', ja: 'tok2' });
    expect(parseCookies(null)).toEqual({});
    expect(parseCookies('garbage')).toEqual({});
  });

  it('resolves tiers: admin beats reader, wrong tokens are public', async () => {
    const { env } = journalEnv();
    expect(await resolveTier(env, 'ja=admin-secret-token')).toBe('admin');
    expect(await resolveTier(env, 'jr=read-secret-token')).toBe('reader');
    expect(await resolveTier(env, 'jr=wrong; ja=alsowrong')).toBe('public');
    expect(await resolveTier(env, null)).toBe('public');
  });
});

describe('journal · the gate', () => {
  it('secrets unset ⇒ 503, never open', async () => {
    const { env } = journalEnv({ readKey: null, adminKey: null });
    const res = await app.fetch(new Request('http://x/journal'), env);
    expect(res.status).toBe(503);
  });

  it('right reader key ⇒ Set-Cookie with HttpOnly/Secure/SameSite + 302 to clean URL', async () => {
    const { env } = journalEnv();
    const res = await app.fetch(new Request('http://x/journal/k/read-secret-token'), env);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/journal/');
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('jr=read-secret-token');
    for (const attr of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/']) expect(cookie).toContain(attr);
  });

  it('wrong key ⇒ the quiet gate page, no cookie, no chapter titles', async () => {
    const { env } = journalEnv({ chapters: CHAPTERS });
    const res = await app.fetch(new Request('http://x/journal/k/not-the-token'), env);
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toBeNull();
    const html = await res.text();
    expect(html).toContain('family-only');
    expect(html).not.toContain('Portofino');
    expect(html).not.toContain('Etna');
  });

  it('admin key route sets ja and redirects to /journal/admin', async () => {
    const { env } = journalEnv();
    const res = await app.fetch(new Request('http://x/journal/a/admin-secret-token'), env);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/journal/admin');
    expect(res.headers.get('set-cookie')).toContain('ja=admin-secret-token');
  });

  it('/journal/admin without the admin cookie is the gate — reader cookie is not enough', async () => {
    const { env } = journalEnv({ chapters: CHAPTERS });
    const res = await app.fetch(new Request('http://x/journal/admin', { headers: { cookie: 'jr=read-secret-token' } }), env);
    const html = await res.text();
    expect(html).toContain('family-only');
  });
});

describe('journal · tier filtering on the home spine', () => {
  it('reader sees every enabled chapter', async () => {
    const { env } = journalEnv({ chapters: CHAPTERS });
    const res = await app.fetch(new Request('http://x/journal', { headers: { cookie: 'jr=read-secret-token' } }), env);
    const html = await res.text();
    expect(html).toContain('Portofino');
    expect(html).toContain('Etna');
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(res.headers.get('referrer-policy')).toBe('same-origin');
  });

  it('public tier sees only public chapters — the private title never leaks', async () => {
    const { env } = journalEnv({ chapters: CHAPTERS });
    const res = await app.fetch(new Request('http://x/journal'), env);
    const html = await res.text();
    expect(html).toContain('Portofino');
    expect(html).not.toContain('Etna');
  });

  it('empty journal degrades politely per tier', async () => {
    const { env } = journalEnv();
    const pub = await (await app.fetch(new Request('http://x/journal'), env)).text();
    expect(pub).toContain('Nothing has been made public yet');
    const fam = await (await app.fetch(new Request('http://x/journal', { headers: { cookie: 'jr=read-secret-token' } }), env)).text();
    expect(fam).toContain('Nothing lived yet');
  });

  it('escapes hostile chapter content', async () => {
    const evil = [{ ...CHAPTERS[0], title: '<script>alert(1)</script>', public: 1 }];
    const { env } = journalEnv({ chapters: evil });
    const html = await (await app.fetch(new Request('http://x/journal'), env)).text();
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });
});
