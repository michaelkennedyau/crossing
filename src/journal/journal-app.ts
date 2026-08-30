import { Hono } from 'hono';
import type { Env } from '../env';
import { cookieFor, journalHeaders, resolveAuth, rigged, tokenEquals, type JournalAuth } from './auth';
import { renderGate, renderJournalHome } from './render-home';
import { renderAdminShell } from './render-admin';
import { renderChapterPage, renderMissing } from './render-chapter';
import { googleRigged, handleCallback, loginRedirect } from './google-auth';
import { TRAVERSATA_HTML } from './traversata-doc';
import { renderGuide } from './render-guide';
import { serveJournalImage } from './render-img';

/**
 * The journal's page family. Every request resolves a tier (admin | reader | public) from
 * cookies; the key routes /k/<token> and /a/<token> upgrade a share link into a cookie and
 * redirect to clean URLs. Public tier is served by the SAME renderers, filtered — no
 * duplicated page family. Secrets unset ⇒ quiet 503 (fail closed, never open).
 */

type Vars = { tier: JournalAuth['tier']; auth: JournalAuth; base: string };
export const journalApp = new Hono<{ Bindings: Env; Variables: Vars }>();

export const FAMILY_HOST = 'journal.varo.au';
const isFamilyHost = (url: string): boolean => new URL(url).hostname === FAMILY_HOST;

/** the family door — shown on the subdomain to strangers when Google isn't armed yet */
const doorPage = (rigged: boolean): string => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>The Crossing · il varo</title>
<style>body{font-family:Georgia,serif;background:#FBFCFD;color:#14212C;display:grid;place-items:center;min-height:100vh;margin:0}
main{text-align:center;padding:24px}h1{font-weight:400;font-size:28px}p{color:#43586C;font-style:italic}
a{display:inline-block;margin-top:18px;padding:10px 22px;border:1px solid #0E7C6B;border-radius:8px;color:#0E7C6B;text-decoration:none;font-style:normal;font-family:system-ui,sans-serif;font-size:14px}</style>
</head><body><main><h1>The Crossing</h1><p>a family journal · conditions remain grim</p>
${rigged ? '<a href="/auth/login">sign in with Google</a>' : '<p style="font-size:13px">the Google door isn\u2019t rigged yet \u2014 use your key link</p>'}
</main></body></html>`;

journalApp.use('*', async (c, next) => {
  if (!rigged(c.env)) return c.text('the journal isn’t rigged yet', 503);
  const family = isFamilyHost(c.req.url);
  c.set('base', family ? '' : '/journal');
  const auth = await resolveAuth(c.env, c.req.header('cookie') ?? null);
  c.set('auth', auth);
  c.set('tier', auth.tier);
  // the subdomain is family-only: strangers meet the door (auth + key routes stay reachable)
  const p = new URL(c.req.url).pathname;
  const open = p.startsWith('/journal/auth/') || p.startsWith('/journal/k/') || p.startsWith('/journal/a/') || p.startsWith('/journal/c/');
  if (family && auth.tier === 'public' && !open) {
    if (googleRigged(c.env)) return c.redirect('/auth/login', 302);
    return c.html(doorPage(false), 200, journalHeaders(true));
  }
  await next();
});

// ── the Google door ──
journalApp.get('/auth/login', async (c) => {
  if (!googleRigged(c.env)) return c.html(doorPage(false), 200, journalHeaders(true));
  return loginRedirect(c.env, `https://${FAMILY_HOST}`);
});

journalApp.get('/auth/callback', async (c) => {
  if (!googleRigged(c.env)) return c.html(doorPage(false), 200, journalHeaders(true));
  return handleCallback(c.env, c.req.raw, `https://${FAMILY_HOST}`);
});

// share-link key routes: validate against the live secret, set the cookie, redirect clean
journalApp.get('/k/:token', async (c) => {
  const ok = c.env.JOURNAL_READ_KEY && (await tokenEquals(c.req.param('token'), c.env.JOURNAL_READ_KEY));
  if (!ok) return c.html(renderGate(), 200, journalHeaders(true));
  c.header('set-cookie', cookieFor('jr', c.req.param('token')));
  return c.redirect(`${c.get('base')}/`, 302);
});

journalApp.get('/c/:token', async (c) => {
  const ok = c.env.JOURNAL_CLAIRE_KEY && (await tokenEquals(c.req.param('token'), c.env.JOURNAL_CLAIRE_KEY));
  if (!ok) return c.html(renderGate(), 200, journalHeaders(true));
  c.header('set-cookie', cookieFor('jc', c.req.param('token')));
  return c.redirect(`${c.get('base')}/admin`, 302);
});

journalApp.get('/a/:token', async (c) => {
  const ok = c.env.JOURNAL_ADMIN_KEY && (await tokenEquals(c.req.param('token'), c.env.JOURNAL_ADMIN_KEY));
  if (!ok) return c.html(renderGate(), 200, journalHeaders(true));
  c.header('set-cookie', cookieFor('ja', c.req.param('token')));
  return c.redirect(`${c.get('base')}/admin`, 302);
});

journalApp.get('/', async (c) => {
  const tier = c.get('tier');
  return c.html(await renderJournalHome(c.env, tier, new Date(), c.get('base')), 200, journalHeaders(tier !== 'public'));
});

journalApp.get('/ch/:slug', async (c) => {
  const tier = c.get('tier');
  const slug = c.req.param('slug');
  const html = /^[a-z0-9-]{1,64}$/.test(slug) ? await renderChapterPage(c.env, tier, slug, c.get('base')) : null;
  if (html === null) {
    // public misses of ANY kind are byte-identical — no existence oracle
    return tier === 'public'
      ? c.html(renderGate(), 200, journalHeaders(true))
      : c.html(renderMissing(), 404, journalHeaders(true));
  }
  return c.html(html, 200, journalHeaders(tier !== 'public'));
});

// the run-sheet — family eyes
journalApp.get('/guide', async (c) => {
  if (c.get('tier') === 'public') return c.html(renderGate(), 200, journalHeaders(true));
  return c.html(renderGuide(), 200, journalHeaders(true));
});

// the gift document — family eyes; shipped onward by Michael through the connectors
journalApp.get('/traversata', async (c) => {
  if (c.get('tier') === 'public') return c.html(renderGate(), 200, journalHeaders(true));
  return c.html(TRAVERSATA_HTML, 200, journalHeaders(true));
});

journalApp.get('/admin', async (c) => {
  if (c.get('tier') !== 'admin') return c.html(renderGate(), 200, journalHeaders(true));
  return c.html(renderAdminShell(), 200, journalHeaders(true));
});

// the Worker's first R2 read path — authorization rides the photo's chapter
journalApp.get('/img/:id/:variant', async (c) =>
  serveJournalImage(c.env, c.get('tier'), c.req.param('id'), c.req.param('variant')));
