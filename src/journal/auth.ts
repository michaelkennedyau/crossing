import type { Env } from '../env';

/**
 * The journal's gate — the first authenticated surface on this Worker, deliberately NOT
 * inheriting the site's open posture: the journal holds family photos and named contacts.
 *
 * Two wrangler secrets: JOURNAL_READ_KEY (the family share link) and JOURNAL_ADMIN_KEY
 * (Michael's write link). Share links /journal/k/<token> and /journal/a/<token> validate
 * and upgrade to HttpOnly cookies so every later URL is clean. Rotation = `wrangler secret
 * put` + re-share; old cookies die instantly because validation is against the live secret.
 * Fail closed: secrets unset ⇒ the journal answers 503, never falls open.
 */

export type Tier = 'admin' | 'reader' | 'public';
export type WriterId = 'm' | 'c' | null;
export interface JournalAuth { tier: Tier; author: WriterId }

const enc = new TextEncoder();

async function sha256(s: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)));
}

/** constant-time equality via fixed-length digests — no length leak, no early exit */
export async function tokenEquals(a: string, b: string): Promise<boolean> {
  const [da, db] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < da.length; i++) diff |= da[i] ^ db[i];
  return diff === 0;
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0) out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return out;
}

/** cookie for the whole origin (Path=/) so /api/journal/* rides along; a year of family reads */
export const cookieFor = (name: string, token: string): string =>
  `${name}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000`;

/**
 * The request's identity: tier + writer id. Both writer keys resolve to tier 'admin' —
 * they differ only in who the words belong to. Precedence ja > jc > jr (deterministic if
 * one phone somehow holds both writer cookies).
 */
export async function resolveAuth(env: Env, cookieHeader: string | null): Promise<JournalAuth> {
  const c = parseCookies(cookieHeader);
  if (env.JOURNAL_ADMIN_KEY && c.ja && (await tokenEquals(c.ja, env.JOURNAL_ADMIN_KEY))) return { tier: 'admin', author: 'm' };
  if (env.JOURNAL_CLAIRE_KEY && c.jc && (await tokenEquals(c.jc, env.JOURNAL_CLAIRE_KEY))) return { tier: 'admin', author: 'c' };
  if (env.JOURNAL_READ_KEY && c.jr && (await tokenEquals(c.jr, env.JOURNAL_READ_KEY))) return { tier: 'reader', author: null };
  return { tier: 'public', author: null };
}

/** back-compat wrapper for tier-only call sites */
export async function resolveTier(env: Env, cookieHeader: string | null): Promise<Tier> {
  return (await resolveAuth(env, cookieHeader)).tier;
}

export const rigged = (env: Env): boolean => !!(env.JOURNAL_READ_KEY && env.JOURNAL_ADMIN_KEY);

/** headers every journal HTML response carries; private pages add no-store */
export function journalHeaders(priv: boolean): Record<string, string> {
  return {
    'content-type': 'text/html; charset=utf-8',
    'referrer-policy': 'same-origin',
    'x-robots-tag': 'noindex',
    'cache-control': priv ? 'private, no-store' : 'private, max-age=300',
  };
}
