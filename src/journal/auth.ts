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

/** the request's tier, from cookies against the live secrets; admin implies reader */
export async function resolveTier(env: Env, cookieHeader: string | null): Promise<Tier> {
  const c = parseCookies(cookieHeader);
  if (env.JOURNAL_ADMIN_KEY && c.ja && (await tokenEquals(c.ja, env.JOURNAL_ADMIN_KEY))) return 'admin';
  if (env.JOURNAL_READ_KEY && c.jr && (await tokenEquals(c.jr, env.JOURNAL_READ_KEY))) return 'reader';
  return 'public';
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
