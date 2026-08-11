import type { Env } from './env';
import { lastStored } from './routes/north-outlook';
import { isStale } from './lib/north-outlook';

/**
 * The plan, printed — /north/plan. The bridge is the live instrument; this is the document:
 * the committed week in full, the open middle wearing the board's current read, the booking
 * list with honest numbers. Server-rendered from the same north_itinerary doc the bridge
 * reads (threshold.ts pattern: await, degrade, never throw), light-first because paper is,
 * and the only script on the page is the print button.
 */

const esc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface PlanHotel { name?: string; why?: string; url?: string }
interface PlanDay { date?: string; title?: string; plan?: string }
interface PlanStop {
  key?: string; name?: string; dates?: string; nights?: number;
  hotel?: PlanHotel; altHotel?: PlanHotel; days?: PlanDay[];
  eat?: string[]; do?: string[]; events?: string[]; watchouts?: string[];
}
interface PlanBooking { item?: string; status?: string; est?: string }
interface PlanDoc {
  title?: string; sub?: string; stops?: PlanStop[];
  bookings?: PlanBooking[];
  costs?: { committed?: string; envelope?: string; note?: string };
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --paper:#FBFCFD; --card:#FFFFFF; --ink:#14212C; --ink-dim:#3D5468; --schist:#526579;
  --ember:#A96D14; --live:#0E7C6B; --line:rgba(70,88,106,.22);
  --font-display:'Fraunces',Georgia,serif;
  --font-mono:'IBM Plex Mono',ui-monospace,monospace;
  --font-hand:'Instrument Serif',Georgia,serif;
  --font-body:'Outfit',system-ui,-apple-system,sans-serif;
}
body{background:var(--paper);color:var(--ink);font-family:var(--font-body);font-weight:400;
  line-height:1.6;-webkit-font-smoothing:antialiased;}
.page{max-width:860px;margin:0 auto;padding:48px 24px 80px;}
.eyebrow{font-family:var(--font-mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--live);}
h1{font-family:var(--font-display);font-weight:340;font-size:clamp(28px,5vw,44px);line-height:1.12;
  letter-spacing:-.01em;margin:10px 0 14px;max-width:24ch;text-wrap:balance;}
.sub{font-size:15.5px;color:var(--ink-dim);max-width:64ch;text-wrap:pretty;}
.stamps{display:flex;flex-wrap:wrap;gap:16px;margin-top:18px;font-family:var(--font-mono);font-size:10.5px;
  letter-spacing:.05em;color:var(--schist);}
.stamps b{font-weight:600;font-size:9px;letter-spacing:.16em;text-transform:uppercase;margin-right:6px;}
.stamps .stale{color:var(--ember);}
.print-btn{position:fixed;top:18px;right:18px;font-family:var(--font-mono);font-size:11px;letter-spacing:.08em;
  padding:8px 16px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink-dim);cursor:pointer;}
.print-btn:hover{border-color:var(--live);color:var(--live);}
.print-btn:focus-visible{outline:2px solid var(--live);outline-offset:2px;}
section{margin-top:44px;}
.sec-head{font-family:var(--font-mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;
  color:var(--live);border-bottom:1px solid var(--line);padding-bottom:8px;margin-bottom:18px;}
.stop{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px 24px;margin-bottom:18px;
  break-inside:avoid;}
.stop-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:10px;}
.stop-head h2{font-family:var(--font-display);font-weight:420;font-size:21px;letter-spacing:-.005em;flex:1;min-width:0;}
.stop-dates{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.06em;color:var(--schist);white-space:nowrap;}
.beds{margin:14px 0 4px;display:grid;gap:10px;}
@media(min-width:640px){.beds{grid-template-columns:1fr 1fr;}}
.bed{border-left:3px solid var(--live);padding:2px 0 2px 12px;}
.bed.alt{border-left-color:var(--line);}
.bed b{font-size:14px;font-weight:600;}
.bed a{color:var(--live);text-decoration:none;font-family:var(--font-mono);font-size:10px;letter-spacing:.04em;}
.bed p{font-size:12.5px;color:var(--ink-dim);margin-top:2px;}
.day{display:flex;gap:14px;padding:9px 0;border-top:1px dashed var(--line);}
.day:first-of-type{border-top:0;}
.day .d{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.04em;color:var(--schist);flex:0 0 74px;padding-top:3px;}
.day b{font-size:13.5px;font-weight:600;}
.day p{font-size:13px;color:var(--ink-dim);margin-top:1px;}
.lists{display:grid;gap:14px;margin-top:14px;}
@media(min-width:640px){.lists{grid-template-columns:1fr 1fr;}}
.list b{font-family:var(--font-mono);font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--schist);}
.list li{font-size:12.5px;color:var(--ink-dim);margin:5px 0 0 16px;}
.list .warn li{color:var(--ember);}
.read{background:rgba(14,124,107,.05);border:1px solid rgba(14,124,107,.25);border-radius:14px;
  padding:20px 24px;margin-bottom:18px;break-inside:avoid;}
.read .rl{font-family:var(--font-mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--live);}
.read h3{font-family:var(--font-display);font-weight:420;font-size:19px;margin:8px 0 4px;text-wrap:balance;}
.read .rk{display:flex;gap:12px;padding:8px 0 0;font-size:12.5px;color:var(--ink-dim);}
.read .rk b{font-family:var(--font-mono);font-size:13px;color:var(--live);flex:0 0 30px;}
.book{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;}
.book td{padding:10px 14px;border-top:1px solid var(--line);font-size:13px;vertical-align:top;}
.book tr:first-child td{border-top:0;}
.book .st{font-family:var(--font-mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;padding-top:13px;}
.book .st.now{color:var(--ember);font-weight:600;}
.book .st.later{color:var(--schist);}
.book .st.fixed{color:var(--live);}
.book .est{font-family:var(--font-mono);font-size:11px;color:var(--schist);white-space:nowrap;text-align:right;}
.totals{display:grid;gap:12px;margin-top:16px;}
@media(min-width:640px){.totals{grid-template-columns:1fr 1fr;}}
.total{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 18px;}
.total b{font-family:var(--font-mono);font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--schist);}
.total div{font-family:var(--font-mono);font-size:15px;color:var(--ink);margin-top:4px;}
.cost-note{font-size:12px;color:var(--schist);margin-top:12px;}
.tagline{font-family:var(--font-hand);font-style:italic;font-size:15px;color:var(--ink-dim);margin-top:4px;}
footer{margin-top:48px;font-family:var(--font-mono);font-size:10px;letter-spacing:.08em;color:var(--schist);}
footer a{color:var(--live);text-decoration:none;}
@media print{
  .print-btn{display:none;}
  body{background:#fff;}
  .page{padding:0;max-width:none;}
  .stop,.read,.book,.total{border-color:#ccc;box-shadow:none;}
  section{margin-top:28px;}
  a{color:inherit;}
  .bed a::after{content:' · ' attr(href);font-size:9px;color:#888;}
}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important;}}
`;

function bedHtml(h: PlanHotel | undefined, alt: boolean): string {
  if (!h?.name) return '';
  return `<div class="bed${alt ? ' alt' : ''}">
    <b>${esc(h.name)}</b>${h.url ? ` <a href="${esc(h.url)}">${alt ? 'alt' : 'book'} ↗</a>` : ''}
    <p>${esc(h.why)}</p>
  </div>`;
}

function listHtml(label: string, items: string[] | undefined, warn = false): string {
  if (!items?.length) return '';
  return `<div class="list"><b>${esc(label)}</b><ul class="${warn ? 'warn' : ''}">${items
    .map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`;
}

function stopHtml(s: PlanStop): string {
  return `<article class="stop">
    <div class="stop-head"><h2>${esc(s.name)}</h2><span class="stop-dates">${esc(s.dates)} · ${esc(s.nights)}n</span></div>
    <div class="beds">${bedHtml(s.hotel, false)}${bedHtml(s.altHotel, true)}</div>
    ${(s.days ?? []).map((d) => `<div class="day"><span class="d">${esc(d.date)}</span><div><b>${esc(d.title)}</b><p>${esc(d.plan)}</p></div></div>`).join('')}
    <div class="lists">
      ${listHtml('Eat', s.eat)}${listHtml('Do', s.do)}${listHtml('Events', s.events)}${listHtml('Watch out', s.watchouts, true)}
    </div>
  </article>`;
}

const STATUS_LABEL: Record<string, [string, string]> = {
  'book-now': ['book now', 'now'],
  'when-the-middle-closes': ['when the middle closes', 'later'],
  fixed: ['fixed', 'fixed'],
};

export async function renderPlan(env: Env): Promise<string> {
  const row = await env.DB.prepare('SELECT json, updated_at FROM north_itinerary WHERE id=?')
    .bind('v1')
    .first<{ json: string; updated_at: string }>()
    .catch(() => null);
  let doc: PlanDoc | null = null;
  try {
    doc = row ? (JSON.parse(row.json) as PlanDoc) : null;
  } catch {
    doc = null;
  }
  const outlook = await lastStored(env).catch(() => null);

  const stops = doc?.stops ?? [];
  const committed = stops.filter((s) => s.key !== 'open' && s.key !== 'london');
  const open = stops.find((s) => s.key === 'open');
  const tail = stops.find((s) => s.key === 'london');

  const olStale = outlook ? isStale(outlook.generatedAt) : false;
  const olStamp = outlook
    ? new Date(outlook.generatedAt).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';
  const top3 = outlook ? [...outlook.outlook.ranking].sort((a, b) => b.score - a.score).slice(0, 3) : [];

  const body = !doc
    ? `<section><p class="sub">The plan document isn't published yet — the bridge at <a href="/north">/north</a> is still the live instrument.</p></section>`
    : `
  <section>
    <div class="sec-head">The committed week</div>
    ${committed.map(stopHtml).join('')}
  </section>
  <section>
    <div class="sec-head">Then open — ten nights the board decides</div>
    ${outlook ? `<div class="read">
      <div class="rl">the board's current read · fired ${esc(olStamp)}${olStale ? ' · <span class="stale">△ stale — the 3-hourly re-fire will replace it</span>' : ''}</div>
      <h3>${esc(outlook.outlook.headline)}</h3>
      ${top3.map((r) => `<div class="rk"><b>${esc(r.score)}</b><div><b style="font-family:var(--font-body);font-size:12.5px;color:var(--ink)">${esc(r.arc)}</b> — ${esc(r.because)}</div></div>`).join('')}
      <p class="cost-note">The live version of this panel — trends, every arc, the sky drawn — is the bridge: <a href="/north">crossing.varo.au/north</a></p>
    </div>` : ''}
    ${open ? stopHtml(open) : ''}
  </section>
  <section>
    <div class="sec-head">The fixed tail</div>
    ${tail ? stopHtml(tail) : ''}
  </section>
  ${doc.bookings?.length ? `<section>
    <div class="sec-head">The booking list</div>
    <table class="book">${doc.bookings.map((b) => {
      const [label, cls] = STATUS_LABEL[b.status ?? ''] ?? [b.status ?? '', 'later'];
      return `<tr><td class="st ${cls}">${esc(label)}</td><td>${esc(b.item)}</td><td class="est">${esc(b.est)}</td></tr>`;
    }).join('')}</table>
    ${doc.costs ? `<div class="totals">
      <div class="total"><b>Committed</b><div>${esc(doc.costs.committed)}</div></div>
      <div class="total"><b>Whole-trip envelope</b><div>${esc(doc.costs.envelope)}</div></div>
    </div><p class="cost-note">${esc(doc.costs.note)}</p>` : ''}
  </section>` : ''}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(doc?.title ?? 'The plan')} · il varo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..700&family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Instrument+Serif:ital@0;1&family=Outfit:wght@300..600&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<button type="button" class="print-btn" onclick="window.print()">print ⎙</button>
<main class="page">
  <header>
    <p class="eyebrow">il varo · the north · the plan</p>
    <h1>${esc(doc?.title ?? 'A week in Greece, then open')}</h1>
    <p class="sub">${esc(doc?.sub ?? '')}</p>
    <div class="stamps">
      ${row ? `<span><b>plan</b>updated ${esc(row.updated_at)}Z</span>` : ''}
      ${outlook ? `<span class="${olStale ? 'stale' : ''}"><b>${olStale ? '△ stale' : 'outlook fired'}</b>${esc(olStamp)}</span>` : ''}
      <span><b>live board</b><a href="/north" style="color:var(--live);text-decoration:none">crossing.varo.au/north</a></span>
    </div>
  </header>
  ${body}
  <footer>the committed half is booked once; the open half is decided each morning at the bridge · <a href="/north">/north</a></footer>
</main>
</body>
</html>`;
}
