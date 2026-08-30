import { Hono } from 'hono';
import type { Env } from '../env';
import { cookieFor, journalHeaders, resolveAuth, rigged, tokenEquals, type JournalAuth } from './auth';
import { renderGate, renderJournalHome } from './render-home';
import { renderAdminShell } from './render-admin';
import { renderChapterPage, renderMissing } from './render-chapter';
import { googleRigged, handleCallback, loginRedirect } from './google-auth';
import { esc, journalShell } from './render-home';
import { TRAVERSATA_HOST } from './traversata-app';
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

// the gift's dispatch desk — family eyes; SENDING is admin-only (the two of them).
// Every send mints a guest link via the dropdown: softly counted in D1 (a tally and a
// timestamp, never the viewer), individually cancellable. Master tokens stay as
// untracked previews; the intimate room is never listed below admin tier.
const fmtStamp = (iso: string): string => {
  if (!iso) return '';
  const t = Date.parse(iso.replace(' ', 'T') + 'Z');
  if (Number.isNaN(t)) return iso;
  return new Intl.DateTimeFormat('en-AU', { timeZone: 'Europe/Rome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(t));
};

journalApp.get('/traversata', async (c) => {
  const tier = c.get('tier');
  if (tier === 'public') return c.html(renderGate(), 200, journalHeaders(true));
  const rows = await c.env.DB.prepare('SELECT key, token, json FROM traversata_modes WHERE enabled=1 ORDER BY rowid')
    .all<{ key: string; token: string; json: string }>().then((r) => r.results ?? []).catch(() => []);
  const modes = rows.map((r) => {
    let doc: { label?: string; dedication?: string; intimate?: boolean } = {};
    try { doc = JSON.parse(r.json) as typeof doc; } catch { /* an unreadable row still lists */ }
    return { key: r.key, token: r.token, label: doc.label ?? r.key, dedication: doc.dedication ?? '', intimate: !!doc.intimate };
  }).filter((m) => !m.intimate || tier === 'admin');   // the room with no audience stays unlisted

  const plates = modes.map((m) => `<section class="plate">
    <p class="plate-eye">${esc(m.label)}</p>
    <p class="t-ded">${esc(m.dedication)}</p>
    <p class="t-go"><a href="https://${TRAVERSATA_HOST}/${esc(m.token)}">step into the room →</a></p>
  </section>`).join('\n');

  let desk = '';
  if (tier === 'admin') {
    const grants = await c.env.DB.prepare(
      'SELECT token, mode_key, note, opened_count, last_opened, enabled, created_at FROM traversata_grants ORDER BY created_at DESC LIMIT 100',
    ).all<{ token: string; mode_key: string; note: string; opened_count: number; last_opened: string; enabled: number; created_at: string }>()
      .then((r) => r.results ?? []).catch(() => []);
    const labelOf = new Map(modes.map((m) => [m.key, m.label]));
    const options = modes.map((m) => `<option value="${esc(m.key)}">${esc(m.label)}</option>`).join('');
    const ledger = grants.map((g) => `<div class="t-row${g.enabled ? '' : ' t-dead'}">
      <span class="t-who">${esc(g.note || '—')}<span class="t-room"> · ${esc(labelOf.get(g.mode_key) ?? g.mode_key)}</span></span>
      <span class="t-open">${g.enabled ? (g.opened_count ? `opened ×${g.opened_count} · ${esc(fmtStamp(g.last_opened))}` : 'not opened yet') : 'cancelled'}</span>
      <span class="t-url">https://${TRAVERSATA_HOST}/${esc(g.token)}</span>
      ${g.enabled ? `<button class="t-x" type="button" data-cancel="${esc(g.token)}">cancel this link</button>` : ''}
    </div>`).join('');
    desk = `<section class="plate">
    <p class="plate-eye">send an edition</p>
    <div class="t-form">
      <select id="t-mode" aria-label="which edition">${options}</select>
      <input id="t-note" maxlength="80" placeholder="who it's for — Aurora, Mum, the chat" aria-label="who it's for">
      <button id="t-mint" type="button">mint their link</button>
    </div>
    <p class="t-share" id="t-out" hidden></p>
    ${ledger ? `<div class="t-ledger">${ledger}</div>` : '<p class="t-none">nothing sent yet — every send gets its own link, softly counted, cancellable</p>'}
  </section>`;
  }

  const script = tier === 'admin' ? `<script>
(function(){
  var mint=document.getElementById('t-mint');
  if(!mint) return;
  mint.addEventListener('click', function(){
    var out=document.getElementById('t-out');
    fetch('/api/journal/traversata/grants',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({mode:document.getElementById('t-mode').value,note:document.getElementById('t-note').value})})
      .then(function(r){return r.json();})
      .then(function(j){out.hidden=false;out.textContent=j.url?j.url:'no luck — try again';})
      .catch(function(){out.hidden=false;out.textContent='no luck — try again';});
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-cancel]'),function(b){
    b.addEventListener('click',function(){
      fetch('/api/journal/traversata/grants/'+b.getAttribute('data-cancel')+'/cancel',{method:'POST'})
        .then(function(){location.reload();});
    });
  });
})();
</script>` : '';

  return c.html(journalShell('La Traversata · dispatch', `
<style>
.t-ded{font-family:var(--font-hand);font-style:italic;color:var(--ink-dim);margin:2px 0 12px}
.t-go{margin-top:4px;font-size:14px}
.t-form{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.t-form select,.t-form input{font:14px var(--font-body);color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:9px 10px}
.t-form input{flex:1;min-width:160px}
.t-form button{font:500 13px var(--font-body);color:var(--paper);background:var(--marine);border:0;border-radius:8px;padding:9px 16px;cursor:pointer}
.t-share{font-family:var(--font-mono);font-size:12.5px;word-break:break-all;user-select:all;background:var(--paper);border:1px dashed var(--gold);border-radius:8px;padding:10px 12px;margin-top:12px}
.t-ledger{margin-top:18px;border-top:1px solid var(--line)}
.t-row{display:grid;grid-template-columns:1fr auto;gap:2px 10px;padding:11px 0;border-bottom:1px solid var(--line);font-size:13.5px;align-items:baseline}
.t-who{font-weight:600}
.t-room{font-weight:400;color:var(--ink-dim)}
.t-open{font-family:var(--font-mono);font-size:11px;letter-spacing:.04em;color:var(--ink-dim)}
.t-url{grid-column:1/-1;font-family:var(--font-mono);font-size:11.5px;word-break:break-all;color:var(--ink-dim);user-select:all}
.t-x{grid-column:1/-1;justify-self:start;font:11px var(--font-mono);color:var(--terra);background:none;border:1px solid var(--line);border-radius:6px;padding:4px 10px;cursor:pointer}
.t-dead{opacity:.45}
.t-dead .t-who{text-decoration:line-through}
.t-none{font-size:14px;color:var(--ink-dim);margin-top:12px}
</style>
  <header>
    <p class="over">il varo · la traversata</p>
    <h1 class="et">The dispatch desk.</h1>
    <p class="sub">choose a room, name the guest, mint their link — each opens one room only</p>
    <div class="dbl" aria-hidden="true"></div>
  </header>
  ${desk}
  ${plates || '<section class="plate"><p>the rooms aren’t seeded yet — run npm run db:seed:traversata</p></section>'}
  <footer>a cancelled link dies mid-air; the room never knows · <a href="${c.get('base') || '/journal'}/guide">the run-sheet</a> · <a href="${c.get('base') || '/journal'}">the spine</a></footer>
  ${script}`), 200, journalHeaders(true));
});

journalApp.get('/admin', async (c) => {
  if (c.get('tier') !== 'admin') return c.html(renderGate(), 200, journalHeaders(true));
  return c.html(renderAdminShell(), 200, journalHeaders(true));
});

// the Worker's first R2 read path — authorization rides the photo's chapter
journalApp.get('/img/:id/:variant', async (c) =>
  serveJournalImage(c.env, c.get('tier'), c.req.param('id'), c.req.param('variant')));
