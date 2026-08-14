import type { Env } from './env';
import { lastStored } from './routes/north-outlook';
import { isStale } from './lib/north-outlook';
import { cached } from './lib/kv-cache';
import { fetchNorthWeather, type NorthWxNode } from './lib/north-weather';

/**
 * The living itinerary — /north/plan. Once a plan document, now the trip's day-by-day
 * truth: every booked leg with its real reference (seat numbers, payment refs), every
 * unbooked one in honest ember, the open questions named with their owners, and the page
 * aware of today — lived days compress, today glows, the horizon days wear live feels
 * chips from the same weather doctrine as the bridge. Server-rendered from the doc +
 * KV weather at request time; zero scripts beyond the print button; refresh is the update.
 */

const esc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface PlanHotel { name?: string; why?: string; url?: string }
interface PlanLeg { t?: string; what?: string; ref?: string; state?: 'booked' | 'todo' | 'info' }
interface PlanDay { date?: string; title?: string; plan?: string; legs?: PlanLeg[] }
interface PlanStop {
  key?: string; name?: string; node?: string; dates?: string; nights?: number;
  hotel?: PlanHotel; altHotel?: PlanHotel; days?: PlanDay[];
  eat?: string[]; do?: string[]; events?: string[]; watchouts?: string[];
  wow?: string;
}
interface PlanQuestion {
  q?: string; owner?: string; decides?: string; status?: string;
  imgs?: { src?: string; caption?: string }[];
}
interface PlanDoc {
  title?: string; sub?: string; stops?: PlanStop[];
  bookings?: { item?: string; status?: string; est?: string }[];
  costs?: { committed?: string; envelope?: string; note?: string };
  manifesto?: { kicker?: string; paras?: string[] };
  questions?: PlanQuestion[];
}

/** trip epoch: the QF1 landing — offsets join day cards to real dates, same law as the spread */
const EPOCH_UTC = Date.UTC(2026, 7, 14);

/** days since epoch for "now" in trip time (Europe/Paris) — the page's sense of today */
export function tripDayOffset(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  const [y, m, dd] = parts.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, dd) - EPOCH_UTC) / 86_400_000);
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
.page{max-width:880px;margin:0 auto;padding:48px 24px 80px;}
.eyebrow{font-family:var(--font-mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--live);}
h1{font-family:var(--font-display);font-weight:340;font-size:clamp(26px,4.6vw,40px);line-height:1.12;
  letter-spacing:-.01em;margin:10px 0 12px;max-width:26ch;text-wrap:balance;}
.sub{font-size:15px;color:var(--ink-dim);max-width:66ch;text-wrap:pretty;}
.stamps{display:flex;flex-wrap:wrap;gap:16px;margin-top:16px;font-family:var(--font-mono);font-size:10.5px;
  letter-spacing:.05em;color:var(--schist);}
.stamps b{font-weight:600;font-size:9px;letter-spacing:.16em;text-transform:uppercase;margin-right:6px;}
.stamps .stale{color:var(--ember);}
.print-btn{position:fixed;top:18px;right:18px;font-family:var(--font-mono);font-size:11px;letter-spacing:.08em;
  padding:8px 16px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink-dim);cursor:pointer;z-index:5;}
.print-btn:hover{border-color:var(--live);color:var(--live);}
.print-btn:focus-visible{outline:2px solid var(--live);outline-offset:2px;}
.hud{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:20px;}
.hud .dayn{font-family:var(--font-mono);font-size:12px;letter-spacing:.08em;color:var(--live);
  border:1px solid rgba(14,124,107,.35);border-radius:999px;padding:6px 14px;background:rgba(14,124,107,.05);}
.meter{flex:1;min-width:220px;display:flex;align-items:center;gap:10px;}
.meter .bar{flex:1;height:8px;border-radius:4px;background:rgba(70,88,106,.15);overflow:hidden;}
.meter .fill{height:100%;background:var(--live);}
.meter b{font-family:var(--font-mono);font-size:10.5px;color:var(--schist);white-space:nowrap;font-weight:500;}
section{margin-top:40px;}
.manifesto{border-top:1px solid var(--line);padding-top:24px;}
.man-kicker{font-family:var(--font-display);font-weight:420;font-size:22px;line-height:1.25;max-width:30ch;text-wrap:balance;}
.man-p{font-size:14.5px;line-height:1.65;color:var(--ink-dim);max-width:66ch;margin-top:10px;text-wrap:pretty;}
.qs{background:rgba(169,109,20,.05);border:1px solid rgba(169,109,20,.3);border-radius:14px;padding:20px 24px;break-inside:avoid;}
.qs-h{font-family:var(--font-mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--ember);margin-bottom:8px;}
.q1{padding:12px 0;border-top:1px dashed rgba(169,109,20,.3);}
.q1:first-of-type{border-top:0;}
.q1 b{font-size:14.5px;font-weight:600;}
.q1 .qm{font-family:var(--font-mono);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ember);margin-left:8px;}
.q1 p{font-size:13px;color:var(--ink-dim);margin-top:3px;}
.q1 .qs-status{font-size:12.5px;color:var(--ink);margin-top:5px;}
.figs{display:grid;gap:12px;margin-top:12px;}
@media(min-width:700px){.figs{grid-template-columns:1fr 1fr 1fr;}}
.figs figure{border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--card);}
.figs img{width:100%;max-width:100%;display:block;}
.figs figcaption{font-family:var(--font-mono);font-size:9.5px;letter-spacing:.04em;color:var(--schist);padding:7px 10px;line-height:1.45;}
.band{margin:34px 0 8px;padding:14px 18px;background:var(--card);border:1px solid var(--line);border-radius:12px;break-inside:avoid;}
.band-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:10px;}
.band-head h2{font-family:var(--font-display);font-weight:420;font-size:19px;flex:1;min-width:0;}
.band-dates{font-family:var(--font-mono);font-size:10px;letter-spacing:.06em;color:var(--schist);white-space:nowrap;}
.band .wow{font-size:12.5px;color:var(--ink-dim);margin-top:5px;max-width:70ch;}
.band .beds{font-size:12px;color:var(--schist);margin-top:6px;}
.band .beds a{color:var(--live);text-decoration:none;}
.day{display:flex;gap:14px;padding:13px 6px;border-bottom:1px dashed var(--line);break-inside:avoid;}
.day .d{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.03em;color:var(--schist);flex:0 0 78px;padding-top:3px;}
.day .body{flex:1;min-width:0;}
.day b.t{font-size:14px;font-weight:600;}
.day p{font-size:13px;color:var(--ink-dim);margin-top:2px;}
.day.lived{opacity:.55;}
.day.lived p{display:none;}
.day.lived .legs .todo-row{display:none;}
.day.today{border-left:3px solid var(--live);padding-left:12px;background:rgba(14,124,107,.045);border-radius:0 10px 10px 0;opacity:1;}
.day.today .d{color:var(--live);font-weight:600;}
.wx{display:inline-block;font-family:var(--font-mono);font-size:10px;letter-spacing:.04em;color:var(--schist);
  border:1px solid var(--line);border-radius:999px;padding:1px 9px;margin-left:8px;vertical-align:2px;font-variant-numeric:tabular-nums;}
.day.today .wx{color:var(--live);border-color:rgba(14,124,107,.4);}
.legs{margin-top:7px;display:grid;gap:4px;}
.leg{display:flex;gap:10px;align-items:baseline;font-size:12.5px;}
.leg .lt{font-family:var(--font-mono);font-size:10.5px;color:var(--schist);flex:0 0 52px;font-variant-numeric:tabular-nums;}
.leg .lw{color:var(--ink);}
.leg .chip{font-family:var(--font-mono);font-size:9px;letter-spacing:.06em;white-space:nowrap;border-radius:999px;padding:1px 8px;}
.leg .chip.ok{color:var(--live);border:1px solid rgba(14,124,107,.4);background:rgba(14,124,107,.06);}
.leg .chip.todo{color:var(--ember);border:1px solid rgba(169,109,20,.4);background:rgba(169,109,20,.06);}
.leg .chip.info{color:var(--schist);border:1px solid var(--line);}
.held{margin-top:34px;font-family:var(--font-mono);font-size:10.5px;color:var(--schist);border-top:1px solid var(--line);padding-top:14px;}
.costs{display:grid;gap:12px;margin-top:26px;}
@media(min-width:640px){.costs{grid-template-columns:1fr 1fr;}}
.total{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:13px 17px;}
.total b{font-family:var(--font-mono);font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--schist);}
.total div{font-family:var(--font-mono);font-size:13.5px;color:var(--ink);margin-top:4px;}
.cost-note{font-size:12px;color:var(--schist);margin-top:10px;}
footer{margin-top:44px;font-family:var(--font-mono);font-size:10px;letter-spacing:.08em;color:var(--schist);}
footer a{color:var(--live);text-decoration:none;}
@media print{
  .print-btn{display:none;}
  body{background:#fff;}
  .page{padding:0;max-width:none;}
  .band,.qs,.total,.figs figure{border-color:#ccc;}
  .day.lived{opacity:.8;}
  .day.lived p{display:block;}
  a{color:inherit;}
}
`;

function legHtml(l: PlanLeg): string {
  const cls = l.state === 'booked' ? 'ok' : l.state === 'todo' ? 'todo' : 'info';
  const rowCls = l.state === 'todo' ? 'leg todo-row' : 'leg';
  return `<div class="${rowCls}"><span class="lt">${esc(l.t)}</span><span class="lw">${esc(l.what)}</span>${
    l.ref ? `<span class="chip ${cls}">${esc(l.ref)}</span>` : ''}</div>`;
}

function wxChip(node: string | undefined, off: number, todayOff: number, wx: Map<string, NorthWxNode> | null): string {
  if (!node || !wx) return '';
  const n = wx.get(node);
  const idx = off - todayOff;
  if (!n || idx < 0 || idx > 5 || !n.days[idx]) return '';
  const d = n.days[idx];
  return `<span class="wx">${Math.round(d.tmax)}° / feels ${Math.round(d.feels)}${d.rain >= 2 ? ' · rain' : ''}</span>`;
}

export async function renderPlan(env: Env, now: Date = new Date()): Promise<string> {
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
  const wxNodes = await cached(env.KV, 'north-wx', 1800, fetchNorthWeather)
    .then((r) => (Array.isArray(r.value) ? new Map(r.value.map((n) => [n.id, n])) : null))
    .catch(() => null);

  const todayOff = tripDayOffset(now);
  const stops = doc?.stops ?? [];
  const totalDays = stops.reduce((a, s) => a + (s.days?.length ?? 0), 0);

  const allLegs = stops.flatMap((s) => s.days ?? []).flatMap((day) => day.legs ?? []);
  const booked = allLegs.filter((l) => l.state === 'booked').length;
  const actionable = booked + allLegs.filter((l) => l.state === 'todo').length;

  const olStale = outlook ? isStale(outlook.generatedAt) : false;
  const olStamp = outlook
    ? new Date(outlook.generatedAt).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

  const inTrip = todayOff >= 0 && todayOff < totalDays;
  let currentStop = '';
  {
    let off = 0;
    for (const s of stops) {
      const len = s.days?.length ?? 0;
      if (todayOff >= off && todayOff < off + len) { currentStop = s.name ?? ''; break; }
      off += len;
    }
  }

  let off = 0;
  const timeline = stops.map((s) => {
    const days = (s.days ?? []).map((day) => {
      const state = off < todayOff ? 'lived' : off === todayOff ? 'today' : 'ahead';
      const chip = wxChip(s.node, off, todayOff, wxNodes);
      const html = `<div class="day ${state}">
        <span class="d">${esc(day.date)}</span>
        <div class="body">
          <b class="t">${esc(day.title)}</b>${chip}
          <p>${esc(day.plan)}</p>
          ${day.legs?.length ? `<div class="legs">${day.legs.map(legHtml).join('')}</div>` : ''}
        </div>
      </div>`;
      off += 1;
      return html;
    }).join('');
    return `<div class="band">
      <div class="band-head"><h2>${esc(s.name)}</h2><span class="band-dates">${esc(s.dates)} · ${esc(s.nights)}n</span></div>
      ${s.wow ? `<p class="wow">${esc(s.wow)}</p>` : ''}
      ${s.hotel?.name ? `<p class="beds">bed: <b>${esc(s.hotel.name)}</b>${s.hotel.url ? ` <a href="${esc(s.hotel.url)}">↗</a>` : ''}${
        s.altHotel?.name && s.altHotel.name !== '—' ? ` · alt: ${esc(s.altHotel.name)}` : ''}</p>` : ''}
    </div>${days}`;
  }).join('');

  const questions = doc?.questions?.length
    ? `<section class="qs">
      <div class="qs-h">Still being fleshed out — five questions, five owners</div>
      ${doc.questions.map((q) => `<div class="q1">
        <b>${esc(q.q)}</b><span class="qm">${esc(q.owner)}</span>
        <p>decides: ${esc(q.decides)}</p>
        ${q.status ? `<p class="qs-status">${esc(q.status)}</p>` : ''}
        ${q.imgs?.length ? `<div class="figs">${q.imgs.map((im) =>
          `<figure><img src="${esc(im.src)}" alt="${esc(im.caption)}" loading="lazy"><figcaption>${esc(im.caption)}</figcaption></figure>`).join('')}</div>` : ''}
      </div>`).join('')}
    </section>` : '';

  const body = !doc
    ? `<section><p class="sub">The itinerary isn't published yet — the bridge at <a href="/north">/north</a> is the live instrument.</p></section>`
    : `
  ${doc.manifesto?.kicker || doc.manifesto?.paras?.length ? `<section class="manifesto">
    ${doc.manifesto?.kicker ? `<p class="man-kicker">${esc(doc.manifesto.kicker)}</p>` : ''}
    ${(doc.manifesto?.paras ?? []).map((p) => `<p class="man-p">${esc(p)}</p>`).join('')}
  </section>` : ''}
  ${questions}
  <section>${timeline}</section>
  <div class="held">held: QF2 LHR→BNE Wed 2 Sep 20:50 — the ending under negotiation (see the panel above)</div>
  ${doc.costs ? `<div class="costs">
    <div class="total"><b>Committed</b><div>${esc(doc.costs.committed)}</div></div>
    <div class="total"><b>Envelope</b><div>${esc(doc.costs.envelope)}</div></div>
  </div><p class="cost-note">${esc(doc.costs.note)}</p>` : ''}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(doc?.title ?? 'The itinerary')} · il varo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..700&family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Instrument+Serif:ital@0;1&family=Outfit:wght@300..600&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<button type="button" class="print-btn" onclick="window.print()">print ⎙</button>
<main class="page">
  <header>
    <p class="eyebrow">il varo · the north · the living itinerary</p>
    <h1>${esc(doc?.title ?? 'The Cool Line to Claire’s Boat')}</h1>
    <p class="sub">${esc(doc?.sub ?? '')}</p>
    <div class="stamps">
      ${row ? `<span><b>updated</b>${esc(row.updated_at)}Z</span>` : ''}
      ${outlook ? `<span class="${olStale ? 'stale' : ''}"><b>${olStale ? '△ stale' : 'outlook fired'}</b>${esc(olStamp)}</span>` : ''}
      <span><b>live board</b><a href="/north" style="color:var(--live);text-decoration:none">crossing.varo.au/north</a></span>
    </div>
    <div class="hud">
      <span class="dayn">${inTrip ? `Day ${todayOff + 1} of ${totalDays}${currentStop ? ` — ${esc(currentStop)}` : ''}` : todayOff < 0 ? `${-todayOff} day${todayOff === -1 ? '' : 's'} to wheels-up` : 'the trip, completed'}</span>
      <div class="meter"><div class="bar"><div class="fill" style="width:${actionable ? Math.round((booked / actionable) * 100) : 0}%"></div></div>
        <b>${booked} of ${actionable} legs booked</b></div>
    </div>
  </header>
  ${body}
  <footer>booked rows carry their real references; ember rows are being fleshed out · the bridge reads the sky every three hours · <a href="/north">/north</a></footer>
</main>
</body>
</html>`;
}
