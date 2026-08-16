import type { Env } from './env';
import { cached } from './lib/kv-cache';
import { fetchNorthWeather, type NorthWxNode } from './lib/north-weather';

/**
 * The itinerary as she reads it — /north/plan. Not a dashboard: an editorial, one-column
 * story of a trip that is booked and moving. Each stop is a chapter — big display head,
 * the wow as the lead paragraph, the days as prose stanzas — and the proof (seat numbers,
 * payment refs) sits in quiet mono footnote lines, never chips. Today gets a small tick of
 * presence, lived days soften, near days carry a gentle inline forecast. All decisions live
 * on the bridge; this page only ever states what is certain. SSR, no scripts but print.
 */

const esc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface PlanHotel { name?: string; why?: string; url?: string }
interface PlanLeg { t?: string; what?: string; ref?: string; state?: 'booked' | 'todo' | 'info' }
interface PlanDay { date?: string; title?: string; plan?: string; legs?: PlanLeg[] }
interface PlanStop {
  key?: string; name?: string; node?: string; dates?: string; nights?: number; icon?: string;
  img?: { src?: string; caption?: string }; notes?: string[];
  stats?: { n?: string; label?: string }[]; ports?: { flag?: string; date?: string; name?: string }[];
  hotel?: PlanHotel; altHotel?: PlanHotel; days?: PlanDay[];
  eat?: string[]; do?: string[]; events?: string[]; watchouts?: string[];
  wow?: string;
}
interface PlanDoc {
  title?: string; sub?: string; stops?: PlanStop[];
  manifesto?: { kicker?: string; paras?: string[] };
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
  --paper:#FBFCFD; --ink:#14212C; --ink-dim:#43586C; --schist:#526579;
  --ember:#A96D14; --live:#0E7C6B; --line:rgba(70,88,106,.18);
  --font-display:'Fraunces',Georgia,serif;
  --font-mono:'IBM Plex Mono',ui-monospace,monospace;
  --font-hand:'Instrument Serif',Georgia,serif;
  --font-body:'Outfit',system-ui,-apple-system,sans-serif;
}
body{background:var(--paper);color:var(--ink);font-family:var(--font-body);font-weight:400;
  line-height:1.7;-webkit-font-smoothing:antialiased;}
.page{max-width:560px;margin:0 auto;padding:48px 22px 80px;}
.print-btn{position:fixed;top:18px;right:18px;font-family:var(--font-mono);font-size:11px;letter-spacing:.08em;
  padding:8px 16px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink-dim);cursor:pointer;z-index:5;}
.print-btn:hover{border-color:var(--live);color:var(--live);}
.print-btn:focus-visible{outline:2px solid var(--live);outline-offset:2px;}
.hero .over{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.24em;text-transform:uppercase;color:var(--live);}
.hero h1{font-family:var(--font-display);font-weight:360;font-size:clamp(32px,8.5vw,46px);line-height:1.08;
  letter-spacing:-.015em;margin:14px 0 0;text-wrap:balance;}
.hero .dates{font-family:var(--font-hand);font-style:italic;font-size:19px;color:var(--ink-dim);margin-top:12px;}
.hero .lead{font-size:17px;line-height:1.7;color:var(--ink-dim);margin-top:22px;text-wrap:pretty;}
.route{margin-top:30px;font-family:var(--font-display);font-size:17px;line-height:1.8;color:var(--ink);}
.route span{white-space:nowrap;}
.route em{font-style:normal;color:var(--schist);padding:0 6px;}
.now{margin-top:26px;font-family:var(--font-mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--live);}
.tabs{margin-top:18px;font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;}
.tabs a{color:var(--schist);text-decoration:none;margin-right:18px;}
.tabs a.on{color:var(--live);border-bottom:1px solid var(--live);padding-bottom:2px;}
.sum{margin-top:28px;display:flex;flex-direction:column;gap:8px;}
.sum div{display:flex;gap:12px;align-items:baseline;font-size:14.5px;background:#fff;
  border:1px solid var(--line);border-radius:12px;padding:11px 15px;}
.sum .si{flex:0 0 26px;text-align:center;}
.sum .sd{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.08em;color:var(--schist);flex:0 0 118px;text-transform:uppercase;}
@media print{.sum div{border-color:#ccc;}}
.ch{margin-top:72px;}
.ch .when{font-family:var(--font-mono);font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--schist);}
.ch h2{font-family:var(--font-display);font-weight:400;font-size:clamp(24px,4.6vw,32px);line-height:1.15;
  margin-top:8px;letter-spacing:-.01em;text-wrap:balance;}
.ch .voice{font-family:var(--font-hand);font-style:italic;font-size:18px;color:var(--ink-dim);margin-top:6px;}
.ch .lead{font-size:16px;color:var(--ink-dim);margin-top:16px;text-wrap:pretty;}
.ch .bed{font-size:13.5px;color:var(--schist);margin-top:12px;}
.ch .bed a{color:var(--live);text-decoration:none;}
.view{margin-top:16px;}
.view img{width:100%;max-width:100%;display:block;border-radius:14px;}
.view figcaption{font-family:var(--font-hand);font-style:italic;font-size:13.5px;color:var(--schist);margin-top:7px;}
.tid{margin-top:18px;border-left:2px solid var(--line);padding-left:16px;}
.tid p{font-size:14px;color:var(--ink-dim);margin-top:9px;text-wrap:pretty;}
.tid p:first-child{margin-top:0;}
.stats{display:flex;gap:26px;margin-top:16px;flex-wrap:wrap;}
.stats div b{font-family:var(--font-display);font-weight:420;font-size:26px;display:block;line-height:1.1;}
.stats div span{font-size:12px;color:var(--schist);}
.ports{margin-top:16px;padding-left:14px;border-left:2px solid var(--line);}
.ports div{display:flex;gap:10px;align-items:baseline;padding:3px 0;font-size:14px;}
.ports .pf{flex:0 0 22px;}
.ports .pd{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.06em;color:var(--schist);flex:0 0 58px;text-transform:uppercase;}
.stanza{margin-top:26px;}
.stanza .dw{display:block;font-family:var(--font-mono);font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--schist);}
.stanza.today .dw{color:var(--live);}
.stanza.today .dw::after{content:' — today';}
.stanza h3{font-size:16.5px;font-weight:600;margin-top:4px;display:inline;}
.stanza .wx{font-family:var(--font-mono);font-size:11px;color:var(--schist);margin-left:10px;white-space:nowrap;font-variant-numeric:tabular-nums;}
.stanza.today .wx{color:var(--live);}
.stanza p{font-size:15.5px;color:var(--ink-dim);margin-top:6px;text-wrap:pretty;}
.stanza.lived{opacity:.5;}
.stanza.lived p{display:none;}
.facts{margin-top:8px;font-size:13px;line-height:1.8;color:var(--schist);}
.facts .ok{color:var(--live);}
hr{border:0;border-top:1px solid var(--line);margin-top:72px;}
footer{margin-top:40px;font-family:var(--font-mono);font-size:10px;letter-spacing:.1em;color:var(--schist);line-height:2;}
footer a{color:var(--live);text-decoration:none;}
@media print{
  .print-btn{display:none;}
  body{background:#fff;}
  .page{padding:0;max-width:none;}
  .stanza.lived{opacity:.85;}
  .stanza.lived p{display:block;}
  .ch{break-inside:avoid;margin-top:44px;}
  a{color:inherit;}
}
`;

function factLine(legs: PlanLeg[] | undefined): string {
  if (!legs?.length) return '';
  const bits = legs.map((l) => {
    // no per-day clock times — the prose carries the rhythm; facts carry only the what and the word
    const cleanRef = String(l.ref ?? '').replace(/^[✓✔]\s*/, '');
    const word = l.state === 'booked' ? `<span class="ok">${esc(cleanRef || 'booked')}</span>` : esc(cleanRef);
    return `${esc(l.what)}${l.ref || l.state === 'booked' ? ` · ${word}` : ''}`;
  });
  return `<div class="facts">${bits.join('<br>')}</div>`;
}

function wxText(node: string | undefined, off: number, todayOff: number, wx: Map<string, NorthWxNode> | null): string {
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
  const wxNodes = await cached(env.KV, 'north-wx', 1800, fetchNorthWeather)
    .then((r) => (Array.isArray(r.value) ? new Map(r.value.map((n) => [n.id, n])) : null))
    .catch(() => null);

  const todayOff = tripDayOffset(now);
  const stops = doc?.stops ?? [];
  const totalDays = stops.reduce((a, s) => a + (s.days?.length ?? 0), 0);
  const inTrip = todayOff >= 0 && todayOff < totalDays;

  let currentStop = '';
  {
    let o = 0;
    for (const s of stops) {
      const len = s.days?.length ?? 0;
      if (todayOff >= o && todayOff < o + len) { currentStop = (s.name ?? '').split(' — ')[0]; break; }
      o += len;
    }
  }

  let off = 0;
  const chapters = stops.map((s) => {
    const [main, subline] = (s.name ?? '').split(' — ');
    const stanzas = (s.days ?? []).map((day) => {
      const past = off < todayOff;
      const state = past ? 'lived' : off === todayOff ? 'today' : 'ahead';
      const wx = wxText(s.node, off, todayOff, wxNodes);
      const html = past ? '' : `<div class="stanza ${state}">
        <span class="dw">${esc(day.date)}</span>
        <h3>${esc(day.title)}</h3>${wx}
        <p>${esc(day.plan)}</p>
        ${factLine(day.legs)}
      </div>`;
      off += 1;
      return html;
    }).join('');
    if (!stanzas) return '';
    return `<section class="ch">
      <div class="when">${esc(s.dates)} · ${esc(s.nights)} night${(s.nights ?? 0) === 1 ? '' : 's'}</div>
      <h2>${s.icon ? `${esc(s.icon)} ` : ''}${esc(main)}</h2>
      ${subline ? `<p class="voice">${esc(subline)}</p>` : ''}
      ${s.img?.src ? `<figure class="view"><img src="${esc(s.img.src)}" alt="${esc(s.img.caption)}" loading="lazy">${
        s.img.caption ? `<figcaption>${esc(s.img.caption)}</figcaption>` : ''}</figure>` : ''}
      ${s.wow ? `<p class="lead">${esc(s.wow)}</p>` : ''}
      ${s.stats?.length ? `<div class="stats">${s.stats.map((t) => `<div><b>${esc(t.n)}</b><span>${esc(t.label)}</span></div>`).join('')}</div>` : ''}
      ${s.ports?.length ? `<div class="ports">${s.ports.map((p2) => `<div><span class="pf">${esc(p2.flag)}</span><span class="pd">${esc(p2.date)}</span><span>${esc(p2.name)}</span></div>`).join('')}</div>` : ''}
      ${s.notes?.length ? `<div class="tid">${s.notes.map((t) => `<p>${esc(t)}</p>`).join('')}</div>` : ''}
      ${s.hotel?.name && s.hotel.name !== '—' ? `<p class="bed">sleeping at ${
        s.hotel.url ? `<a href="${esc(s.hotel.url)}"><b>${esc(s.hotel.name)}</b></a>` : `<b>${esc(s.hotel.name)}</b>`}</p>` : ''}
      ${stanzas}
    </section>`;
  }).join('');

  const body = !doc
    ? `<p class="lead" style="margin-top:40px">The itinerary isn't published yet — the bridge at <a href="/north">/north</a> is the live instrument.</p>`
    : chapters;

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
<button type="button" class="print-btn" onclick="window.print()">print</button>
<main class="page">
  <header class="hero">
    <p class="over">il varo · the itinerary</p>
    <h1>${esc(doc?.manifesto?.kicker ?? 'His mountains. Her boat. Aurora’s table.')}</h1>
    <p class="dates">14 August – 2 September 2026 · nineteen nights</p>
    ${doc?.manifesto?.paras?.length ? `<p class="lead">${esc(doc.manifesto.paras[0])}</p>` : doc?.sub ? `<p class="lead">${esc(doc.sub)}</p>` : ''}
    <p class="now">${inTrip ? `today${currentStop ? `: ${esc(currentStop.toLowerCase())}` : ''}` : todayOff < 0 ? 'it starts tomorrow' : 'home'}</p>
    <nav class="tabs"><a class="on" href="/north/plan">itinerary</a><a href="/north/weather">weather</a></nav>
    ${(() => {
      let o = 0;
      const rows = stops.map((s2) => {
        const len = s2.days?.length ?? 0;
        const past = o + len <= todayOff;
        o += len;
        if (past || !len) return '';
        return `<div><span class="si">${esc(s2.icon ?? '')}</span><span class="sd">${esc((s2.dates ?? '').replace(' 2026', ''))}</span><span>${esc((s2.name ?? '').split(' — ')[0])}</span></div>`;
      }).filter(Boolean).join('');
      return rows ? `<div class="sum">${rows}</div>` : '';
    })()}
  </header>
  ${body}
  <hr>
  <footer>everything marked booked or paid is confirmed</footer>
</main>
</body>
</html>`;
}
