import type { Env } from '../env';
import type { JournalAuth } from './auth';

/**
 * Google sign-in for journal.varo.au — the whole OIDC code flow in the Worker, no new
 * dashboards. /auth/login → accounts.google.com → /auth/callback verifies the id_token
 * against Google's JWKS (KV-cached) and mints a 30-day HMAC-signed session cookie.
 * Emails map to identities via the JOURNAL_EMAILS secret (JSON: email → {tier, author}),
 * so Michael is 'm' and Claire is 'c' with no key links involved. Unknown Googles get
 * the gate. Fail-closed: missing secrets ⇒ the flow reports itself unrigged.
 */

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GOOGLE_JWKS = 'https://www.googleapis.com/oauth2/v3/certs';
const SESSION_DAYS = 30;

const enc = new TextEncoder();

export interface SessionClaims { email: string; tier: 'admin' | 'reader'; author: 'm' | 'c' | null; exp: number }

const b64url = (buf: ArrayBuffer | Uint8Array): string =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const raw = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function mintSession(secret: string, claims: SessionClaims): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify(claims)));
  const sig = b64url(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(payload)));
  return `${payload}.${sig}`;
}

export async function readSession(secret: string, cookie: string | undefined, now = Date.now()): Promise<SessionClaims | null> {
  if (!cookie) return null;
  const dot = cookie.lastIndexOf('.');
  if (dot < 1) return null;
  const payload = cookie.slice(0, dot);
  const sig = cookie.slice(dot + 1);
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), b64urlDecode(sig) as unknown as ArrayBuffer, enc.encode(payload));
    if (!ok) return null;
    const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(payload))) as SessionClaims;
    if (typeof claims.exp !== 'number' || claims.exp * 1000 < now) return null;
    if (claims.tier !== 'admin' && claims.tier !== 'reader') return null;
    return claims;
  } catch {
    return null;
  }
}

export type EmailMap = Record<string, { tier: 'admin' | 'reader'; author?: 'm' | 'c' }>;

export function parseEmailMap(raw: string | undefined): EmailMap {
  if (!raw) return {};
  try {
    const j = JSON.parse(raw) as EmailMap;
    return typeof j === 'object' && j ? j : {};
  } catch {
    return {};
  }
}

export const googleRigged = (env: Env): boolean =>
  !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.JOURNAL_SESSION_KEY && env.JOURNAL_EMAILS);

/** the login redirect — state+nonce bound to a short-lived cookie */
export async function loginRedirect(env: Env, origin: string): Promise<Response> {
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const nonce = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const url = new URL(GOOGLE_AUTH);
  url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID!);
  url.searchParams.set('redirect_uri', `${origin}/auth/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email');
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('prompt', 'select_account');
  return new Response(null, {
    status: 302,
    headers: {
      location: url.toString(),
      'set-cookie': `jgs=${state}.${nonce}; HttpOnly; Secure; SameSite=Lax; Path=/auth; Max-Age=600`,
    },
  });
}

interface JwkKey { kid: string; n: string; e: string; kty: string }

async function googleKeys(env: Env): Promise<JwkKey[]> {
  const cached = await env.KV.get<JwkKey[]>('google-jwks', 'json').catch(() => null);
  if (cached) return cached;
  const res = await fetch(GOOGLE_JWKS);
  if (!res.ok) throw new Error(`jwks ${res.status}`);
  const { keys } = (await res.json()) as { keys: JwkKey[] };
  await env.KV.put('google-jwks', JSON.stringify(keys), { expirationTtl: 43200 }).catch(() => {});
  return keys;
}

/** verify a Google id_token: signature vs JWKS, iss, aud, exp, nonce */
export async function verifyIdToken(env: Env, idToken: string, expectedNonce: string, now = Date.now()): Promise<{ email: string } | null> {
  const [h, p, s] = idToken.split('.');
  if (!h || !p || !s) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64urlDecode(h))) as { kid?: string; alg?: string };
    if (header.alg !== 'RS256') return null;
    const jwk = (await googleKeys(env)).find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey(
      'jwk', { kty: 'RSA', n: jwk.n, e: jwk.e },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'],
    );
    const ok = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5', key,
      b64urlDecode(s) as unknown as ArrayBuffer, enc.encode(`${h}.${p}`),
    );
    if (!ok) return null;
    const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(p))) as {
      iss?: string; aud?: string; exp?: number; nonce?: string; email?: string; email_verified?: boolean;
    };
    if (claims.iss !== 'https://accounts.google.com' && claims.iss !== 'accounts.google.com') return null;
    if (claims.aud !== env.GOOGLE_CLIENT_ID) return null;
    if (typeof claims.exp !== 'number' || claims.exp * 1000 < now) return null;
    if (claims.nonce !== expectedNonce) return null;
    if (!claims.email || claims.email_verified === false) return null;
    return { email: claims.email.toLowerCase() };
  } catch {
    return null;
  }
}

/** the callback: code → tokens → verified email → mapped identity → session cookie */
export async function handleCallback(env: Env, req: Request, origin: string): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get('code') ?? '';
  const state = url.searchParams.get('state') ?? '';
  const jgs = (req.headers.get('cookie') ?? '').match(/(?:^|;\s*)jgs=([^;]+)/)?.[1] ?? '';
  const [cookieState, nonce] = jgs.split('.');
  if (!code || !state || state !== cookieState || !nonce) {
    return new Response('sign-in didn’t line up — try the door again', { status: 400 });
  }
  const tokenRes = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${origin}/auth/callback`, grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) return new Response('google said no — try again', { status: 502 });
  const { id_token } = (await tokenRes.json()) as { id_token?: string };
  const verified = id_token ? await verifyIdToken(env, id_token, nonce) : null;
  if (!verified) return new Response('that sign-in couldn’t be verified', { status: 401 });

  const who = parseEmailMap(env.JOURNAL_EMAILS)[verified.email];
  if (!who) {
    return new Response(
      '<!doctype html><meta charset="utf-8"><body style="font-family:Georgia,serif;display:grid;place-items:center;height:100vh;margin:0;background:#FBFCFD;color:#43586C"><p>this door doesn’t know that Google.</p></body>',
      { status: 403, headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }
  const session = await mintSession(env.JOURNAL_SESSION_KEY!, {
    email: verified.email, tier: who.tier, author: who.author ?? null,
    exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400,
  });
  return new Response(null, {
    status: 302,
    headers: {
      location: '/',
      'set-cookie': `js=${session}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}`,
    },
  });
}

/** resolve a session cookie into a journal identity (null = no/invalid session) */
export async function sessionAuth(env: Env, cookieHeader: string | null): Promise<JournalAuth | null> {
  if (!env.JOURNAL_SESSION_KEY) return null;
  const js = (cookieHeader ?? '').match(/(?:^|;\s*)js=([^;]+)/)?.[1];
  if (!js) return null;
  const claims = await readSession(env.JOURNAL_SESSION_KEY, js);
  if (!claims) return null;
  return { tier: claims.tier, author: claims.author };
}
