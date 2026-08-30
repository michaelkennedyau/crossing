import { afterEach, describe, expect, it, vi } from 'vitest';
import { mintSession, readSession, parseEmailMap, verifyIdToken, handleCallback, sessionAuth } from '../../src/journal/google-auth';
import { app } from '../../src/app';
import { journalEnv } from './stub-env';

const SECRET = 'test-session-secret';

const googled = (over: Record<string, unknown> = {}) => {
  const { env, ...rest } = journalEnv(over as Parameters<typeof journalEnv>[0]);
  Object.assign(env as unknown as Record<string, unknown>, {
    GOOGLE_CLIENT_ID: 'client-123',
    GOOGLE_CLIENT_SECRET: 'sssh',
    JOURNAL_SESSION_KEY: SECRET,
    JOURNAL_EMAILS: JSON.stringify({
      'michael@capfocus.com.au': { tier: 'admin', author: 'm' },
      'claire@example.com': { tier: 'admin', author: 'c' },
      'nana@example.com': { tier: 'reader' },
    }),
  });
  return { env, ...rest };
};

describe('journal · sessions', () => {
  it('mints and reads a session; tampering and expiry both kill it', async () => {
    const claims = { email: 'claire@example.com', tier: 'admin' as const, author: 'c' as const, exp: Math.floor(Date.now() / 1000) + 60 };
    const cookie = await mintSession(SECRET, claims);
    expect(await readSession(SECRET, cookie)).toEqual(claims);
    expect(await readSession(SECRET, cookie.slice(0, -2) + 'xx')).toBeNull();          // bad sig
    expect(await readSession('other-secret', cookie)).toBeNull();                      // wrong key
    const stale = await mintSession(SECRET, { ...claims, exp: Math.floor(Date.now() / 1000) - 10 });
    expect(await readSession(SECRET, stale)).toBeNull();                               // expired
  });

  it('sessionAuth resolves a valid js cookie into tier+author', async () => {
    const { env } = googled();
    const cookie = await mintSession(SECRET, { email: 'claire@example.com', tier: 'admin', author: 'c', exp: Math.floor(Date.now() / 1000) + 60 });
    expect(await sessionAuth(env, `js=${cookie}`)).toEqual({ tier: 'admin', author: 'c' });
    expect(await sessionAuth(env, 'js=garbage.garbage')).toBeNull();
    expect(await sessionAuth(env, null)).toBeNull();
  });

  it('a Google session writes with its author through the real API', async () => {
    const { env, chapters } = googled({ chapters: [{ id: 'ch06-calvi', title: 'C', body: JSON.stringify([{ t: 'p', text: 'alpha', by: 'seed' }]) }] });
    const cookie = await mintSession(SECRET, { email: 'claire@example.com', tier: 'admin', author: 'c', exp: Math.floor(Date.now() / 1000) + 60 });
    const res = await app.fetch(new Request('http://x/api/journal/chapters/ch06-calvi', {
      method: 'PUT', headers: { cookie: `js=${cookie}`, 'content-type': 'application/json' },
      body: JSON.stringify({ blocks: [{ t: 'p', text: 'alpha edited' }] }),
    }), env);
    expect(res.status).toBe(200);
    expect(JSON.parse(chapters.get('ch06-calvi')!.body)[0].by).toBe('c');
  });

  it('parseEmailMap tolerates garbage', () => {
    expect(parseEmailMap(undefined)).toEqual({});
    expect(parseEmailMap('not json')).toEqual({});
    expect(parseEmailMap('{"a@b.c":{"tier":"reader"}}')).toEqual({ 'a@b.c': { tier: 'reader' } });
  });
});

describe('journal · id_token verification (self-signed JWKS)', () => {
  afterEach(() => vi.unstubAllGlobals());

  const b64url = (buf: ArrayBuffer | Uint8Array | string): string => {
    const bytes = typeof buf === 'string' ? new TextEncoder().encode(buf) : new Uint8Array(buf);
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  async function makeToken(claims: Record<string, unknown>): Promise<{ token: string; jwks: unknown }> {
    const pair = (await crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
      true, ['sign', 'verify'],
    )) as CryptoKeyPair;
    const pub = (await crypto.subtle.exportKey('jwk', pair.publicKey)) as JsonWebKey;
    const header = b64url(JSON.stringify({ alg: 'RS256', kid: 'test-kid' }));
    const payload = b64url(JSON.stringify(claims));
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(`${header}.${payload}`));
    return { token: `${header}.${payload}.${b64url(sig)}`, jwks: { keys: [{ kid: 'test-kid', kty: 'RSA', n: pub.n, e: pub.e }] } };
  }

  it('accepts a valid token and rejects wrong aud/nonce/expired', async () => {
    const { env } = googled();
    const good = {
      iss: 'https://accounts.google.com', aud: 'client-123',
      exp: Math.floor(Date.now() / 1000) + 300, nonce: 'n1',
      email: 'Claire@Example.com', email_verified: true,
    };
    const { token, jwks } = await makeToken(good);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(jwks))));
    expect(await verifyIdToken(env, token, 'n1')).toEqual({ email: 'claire@example.com' });
    expect(await verifyIdToken(env, token, 'wrong-nonce')).toBeNull();
    const { token: badAud, jwks: j2 } = await makeToken({ ...good, aud: 'someone-else' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(j2))));
    expect(await verifyIdToken(env, badAud, 'n1')).toBeNull();
    const { token: stale, jwks: j3 } = await makeToken({ ...good, exp: Math.floor(Date.now() / 1000) - 10 });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(j3))));
    expect(await verifyIdToken(env, stale, 'n1')).toBeNull();
  });

  it('handleCallback rejects a state/cookie mismatch before touching Google', async () => {
    const { env } = googled();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const res = await handleCallback(env, new Request('https://journal.varo.au/auth/callback?code=abc&state=X', {
      headers: { cookie: 'jgs=Y.nonce1' },
    }), 'https://journal.varo.au');
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('journal · the family host', () => {
  // host-gate logic keys on journal.varo.au; simulate via full URLs
  const famUrl = (path: string, cookie?: string) =>
    new Request(`https://journal.varo.au/journal${path}`, cookie ? { headers: { cookie } } : undefined);

  it('a stranger on the subdomain meets the door (unrigged Google shows the key hint)', async () => {
    const { env } = journalEnv({ chapters: [{ id: 'ch06-calvi', title: 'Secret', body: '[]' }] });
    const res = await app.fetch(famUrl(''), env);
    const html = await res.text();
    expect(html).toContain('family journal');
    expect(html).not.toContain('Secret');
    expect(html).toContain('key link');            // google unrigged → hint, no redirect loop
  });

  it('rigged Google redirects strangers to /auth/login; key routes stay reachable', async () => {
    const { env } = googled();
    const res = await app.fetch(famUrl(''), env);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/auth/login');
    const key = await app.fetch(famUrl('/k/read-secret-token'), env);
    expect(key.status).toBe(302);                  // the key route worked, not the door
    expect(key.headers.get('set-cookie')).toContain('jr=');
  });

  it('a Google session on the subdomain sees the spine with clean base-less links', async () => {
    const { env } = googled({ chapters: [{ id: 'ch06-calvi', day_date: '2026-08-20', title: 'The Citadel', body: '[]' }] });
    const cookie = await mintSession(SECRET, { email: 'michael@capfocus.com.au', tier: 'admin', author: 'm', exp: Math.floor(Date.now() / 1000) + 60 });
    const res = await app.fetch(famUrl('', `js=${cookie}`), env);
    const html = await res.text();
    expect(html).toContain('The Citadel');
    expect(html).toContain('href="/ch/ch06-calvi"');       // base '' on the family host
    expect(html).not.toContain('href="/journal/ch/');
  });

  it('crossing.varo.au behaviour is untouched: /journal links keep their prefix', async () => {
    const { env } = journalEnv({ chapters: [{ id: 'ch06-calvi', day_date: '2026-08-20', title: 'The Citadel', body: '[]', public: 1 }] });
    const res = await app.fetch(new Request('https://crossing.varo.au/journal'), env);
    const html = await res.text();
    expect(html).toContain('href="/journal/ch/ch06-calvi"');
  });
});
