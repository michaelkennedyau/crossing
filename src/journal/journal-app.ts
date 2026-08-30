import { Hono } from 'hono';
import type { Env } from '../env';
import { cookieFor, journalHeaders, resolveAuth, rigged, tokenEquals, type JournalAuth } from './auth';
import { renderGate, renderJournalHome } from './render-home';
import { renderAdminShell } from './render-admin';
import { serveJournalImage } from './render-img';

/**
 * The journal's page family. Every request resolves a tier (admin | reader | public) from
 * cookies; the key routes /k/<token> and /a/<token> upgrade a share link into a cookie and
 * redirect to clean URLs. Public tier is served by the SAME renderers, filtered — no
 * duplicated page family. Secrets unset ⇒ quiet 503 (fail closed, never open).
 */

type Vars = { tier: JournalAuth['tier']; auth: JournalAuth };
export const journalApp = new Hono<{ Bindings: Env; Variables: Vars }>();

journalApp.use('*', async (c, next) => {
  if (!rigged(c.env)) return c.text('the journal isn’t rigged yet', 503);
  const auth = await resolveAuth(c.env, c.req.header('cookie') ?? null);
  c.set('auth', auth);
  c.set('tier', auth.tier);
  await next();
});

// share-link key routes: validate against the live secret, set the cookie, redirect clean
journalApp.get('/k/:token', async (c) => {
  const ok = c.env.JOURNAL_READ_KEY && (await tokenEquals(c.req.param('token'), c.env.JOURNAL_READ_KEY));
  if (!ok) return c.html(renderGate(), 200, journalHeaders(true));
  c.header('set-cookie', cookieFor('jr', c.req.param('token')));
  return c.redirect('/journal', 302);
});

journalApp.get('/c/:token', async (c) => {
  const ok = c.env.JOURNAL_CLAIRE_KEY && (await tokenEquals(c.req.param('token'), c.env.JOURNAL_CLAIRE_KEY));
  if (!ok) return c.html(renderGate(), 200, journalHeaders(true));
  c.header('set-cookie', cookieFor('jc', c.req.param('token')));
  return c.redirect('/journal/admin', 302);
});

journalApp.get('/a/:token', async (c) => {
  const ok = c.env.JOURNAL_ADMIN_KEY && (await tokenEquals(c.req.param('token'), c.env.JOURNAL_ADMIN_KEY));
  if (!ok) return c.html(renderGate(), 200, journalHeaders(true));
  c.header('set-cookie', cookieFor('ja', c.req.param('token')));
  return c.redirect('/journal/admin', 302);
});

journalApp.get('/', async (c) => {
  const tier = c.get('tier');
  return c.html(await renderJournalHome(c.env, tier), 200, journalHeaders(tier !== 'public'));
});

journalApp.get('/admin', async (c) => {
  if (c.get('tier') !== 'admin') return c.html(renderGate(), 200, journalHeaders(true));
  return c.html(renderAdminShell(), 200, journalHeaders(true));
});

// the Worker's first R2 read path — authorization rides the photo's chapter
journalApp.get('/img/:id/:variant', async (c) =>
  serveJournalImage(c.env, c.get('tier'), c.req.param('id'), c.req.param('variant')));
