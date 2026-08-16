import type { Env } from './env';
import { cached } from './lib/kv-cache';
import { EU_NODES } from './lib/north-weather';
import { tripDayOffset } from './north-plan';

/**
 * The weather tab — /north/weather. Guidance, not instruments: for the confirmed shape
 * (finish the cruise in Valletta, a night in the walls, Palermo with Aurora's lunch,
 * home on the day of QF2) it
 * reads a 16-day model run for each remaining stop and says, in plain words, what each
 * leg will feel like and how to dress for it. Same voice and cloth as the itinerary page;
 * the bridge keeps the dials.
 */

const esc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface PlanDay { date?: string; title?: string; plan?: string }
interface PlanStop { key?: string; name?: string; node?: string; dates?: string; nights?: number; icon?: string; days?: PlanDay[] }
interface PlanDoc { stops?: PlanStop[] }

interface Wx16Day { tmax: number | null; feels: number | null; rain: number }
export interface Wx16Node { id: string; days: Wx16Day[] }

/** 16-day apparent-max run for the given node ids, one batched call, cached 3 h */
async function fetch16(ids: string[]): Promise<Wx16Node[]> {
  const nodes = EU_NODES.filter((n) => ids.includes(n.id));
  if (!nodes.length) return [];
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${nodes.map((n) => n.lat).join(',')}` +
    `&longitude=${nodes.map((n) => n.lon).join(',')}` +
    '&daily=temperature_2m_max,apparent_temperature_max,precipitation_sum&forecast_days=16&timezone=auto';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const raw = (await res.json()) as unknown;
  const arr = Array.isArray(raw) ? raw : [raw];
  return nodes.map((n, i) => {
    const d = (arr[i] as { daily?: { temperature_2m_max?: (number | null)[]; apparent_temperature_max?: (number | null)[]; precipitation_sum?: (number | null)[] } })?.daily;
    const tmax = d?.temperature_2m_max ?? [];
    return {
      id: n.id,
      days: tmax.map((t, j) => ({ tmax: t, feels: d?.apparent_temperature_max?.[j] ?? t, rain: d?.precipitation_sum?.[j] ?? 0 })),
    };
  });
}

/** the guidance sentence — plain words from the worst feels in the window */
export function guidance(maxFeels: number | null, rainy: boolean): string {
  const rain = rainy ? ' Keep one light rain layer handy.' : '';
  if (maxFeels == null) return 'Too far out for the models yet — guidance firms up as the days approach.';
  if (maxFeels <= 24) return `Genuinely cool — jumpers at night, perfect walking weather by day.${rain}`;
  if (maxFeels <= 28) return `Lovely — warm days, comfortable everywhere, a light layer for evenings.${rain}`;
  if (maxFeels <= 32) return `Warm — mornings and evenings are the sweet spots; shade and water through the early afternoon.${rain}`;
  return `Hot in the middle of the day — plan around it: early starts, long shaded lunches, the pool or the sea from noon to four.${rain}`;
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{--paper:#FBFCFD;--ink:#14212C;--ink-dim:#43586C;--schist:#526579;--live:#0E7C6B;--line:rgba(70,88,106,.18);
--font-display:'Fraunces',Georgia,serif;--font-mono:'IBM Plex Mono',ui-monospace,monospace;
--font-hand:'Instrument Serif',Georgia,serif;--font-body:'Outfit',system-ui,-apple-system,sans-serif;}
body{background:var(--paper);color:var(--ink);font-family:var(--font-body);line-height:1.7;-webkit-font-smoothing:antialiased;}
.page{max-width:560px;margin:0 auto;padding:48px 22px 80px;}
.over{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.24em;text-transform:uppercase;color:var(--live);}
h1{font-family:var(--font-display);font-weight:360;font-size:clamp(30px,8vw,42px);line-height:1.1;margin:14px 0 0;text-wrap:balance;}
.lead{font-size:16.5px;color:var(--ink-dim);margin-top:18px;text-wrap:pretty;}
.tabs{margin-top:18px;font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;}
.tabs a{color:var(--schist);text-decoration:none;margin-right:18px;}
.tabs a.on{color:var(--live);border-bottom:1px solid var(--live);padding-bottom:2px;}
.ch{margin-top:56px;}
.ch .when{font-family:var(--font-mono);font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--schist);}
.ch h2{font-family:var(--font-display);font-weight:400;font-size:clamp(22px,5vw,28px);margin-top:6px;}
.ch .guide{font-size:15.5px;color:var(--ink);margin-top:10px;text-wrap:pretty;}
.days{margin-top:12px;font-family:var(--font-mono);font-size:12px;line-height:2;color:var(--schist);font-variant-numeric:tabular-nums;}
.days b{color:var(--ink);font-weight:500;}
footer{margin-top:64px;border-top:1px solid var(--line);padding-top:16px;font-family:var(--font-mono);font-size:10px;letter-spacing:.1em;color:var(--schist);line-height:2;}
footer a{color:var(--live);text-decoration:none;}
@media print{body{background:#fff}.page{padding:0;max-width:none}.tabs{display:none}}
`;

export async function renderWeatherGuide(env: Env, now: Date = new Date()): Promise<string> {
  const row = await env.DB.prepare('SELECT json FROM north_itinerary WHERE id=?')
    .bind('v1').first<{ json: string }>().catch(() => null);
  let doc: PlanDoc | null = null;
  try { doc = row ? (JSON.parse(row.json) as PlanDoc) : null; } catch { doc = null; }

  const stops = doc?.stops ?? [];
  const todayOff = tripDayOffset(now);
  const ids = [...new Set(stops.map((s) => s.node).filter((n): n is string => !!n))];
  const wx = await cached(env.KV, 'north-wx16', 10800, () => fetch16(ids))
    .then((r) => (Array.isArray(r.value) ? new Map(r.value.map((n) => [n.id, n])) : null))
    .catch(() => null);

  let off = 0;
  const chapters = stops.map((s) => {
    const len = s.days?.length ?? 0;
    const start = off;
    off += len;
    if (!len || start + len <= todayOff) return '';           // past stops: gone
    const node = s.node ? wx?.get(s.node) : undefined;
    const lines: string[] = [];
    let maxFeels: number | null = null;
    let rainy = false;
    let beyond = false;
    for (let i = Math.max(start, todayOff); i < start + len; i++) {
      const fIdx = i - todayOff;
      const label = s.days?.[i - start]?.date ?? '';
      const d = node?.days[fIdx];
      if (!d || d.tmax == null) { beyond = true; continue; }
      const feels = Math.round(d.feels ?? d.tmax);
      maxFeels = maxFeels == null ? feels : Math.max(maxFeels, feels);
      if ((d.rain ?? 0) >= 2) rainy = true;
      lines.push(`<b>${esc(label)}</b> — ${Math.round(d.tmax)}°, feels ${feels}${(d.rain ?? 0) >= 2 ? ', some rain' : ''}`);
    }
    const [main] = (s.name ?? '').split(' — ');
    return `<section class="ch">
      <div class="when">${esc((s.dates ?? '').replace(' 2026', ''))}</div>
      <h2>${esc(s.icon ? `${s.icon} ` : '')}${esc(main)}</h2>
      <p class="guide">${esc(guidance(maxFeels, rainy))}${beyond && maxFeels != null ? ' (The last days here are past the model horizon — they firm up soon.)' : ''}</p>
      ${lines.length ? `<div class="days">${lines.join('<br>')}</div>` : ''}
    </section>`;
  }).filter(Boolean).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Weather for the trip · il varo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..700&family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500&family=Instrument+Serif:ital@0;1&family=Outfit:wght@300..600&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<main class="page">
  <header>
    <p class="over">il varo · the weather</p>
    <h1>What each leg will feel like</h1>
    <p class="lead">The confirmed shape: we ride the cruise to its last morning in Valletta, stay the golden weekend inside the walls, then the dawn ferry to Sicily on Monday — lunch with Aurora in Palermo, two nights at the grande dame — and fly home on the day of the Sydney flight, with hours of slack built in. Below, the model's honest read for every remaining stop, refreshed through the day.</p>
    <nav class="tabs"><a href="/north/plan">itinerary</a><a class="on" href="/north/weather">weather</a></nav>
  </header>
  ${chapters || '<p class="lead" style="margin-top:40px">Nothing left to forecast — welcome home.</p>'}
  <footer>temperatures are the day's high and what it actually feels like · the bridge at <a href="/north">/north</a> reads the sky every three hours</footer>
</main>
</body>
</html>`;
}
