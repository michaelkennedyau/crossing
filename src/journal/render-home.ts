import type { Env } from '../env';
import type { Tier } from './auth';
import { parseBody } from './blocks';
import { chapterStats, romeDate } from './progress';
import { renderChapterMap } from './render-map';
import { ROUTE_ORDER, fmtDay, resolveFocus } from './map-geo';

/**
 * /journal — the hybrid spine: days as chapters down the page, threads woven across as
 * quiet chips. The Register: the trip's paper cloth grown into a memory. /north/plan was
 * the itinerary as promise; this is the itinerary as memory. Public tier sees only
 * public-flagged chapters and never learns what else exists.
 */

export const esc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface ChapterRow {
  id: string; day_date: string; title: string; voice: string;
  threads: string; closer: string; public: number; sort: number;
}

export interface JournalMeta {
  title?: string; sub?: string; hero?: string; indexable?: boolean;
  threads?: Record<string, string>; // tag -> blurb
}

// one muted accent per thread — the single idea stolen from the fraser-style option
export const THREAD_TINT: Record<string, string> = {
  doctrine: '#0E7C6B', screens: '#A96D14', 'trade-channel': '#8A5A83', water: '#2E6E8E',
  drops: '#8A5A83', ledger: '#A96D14', conditions: '#526579',
};

export const JOURNAL_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{--paper:#FBFCFD;--ink:#14212C;--ink-dim:#43586C;--schist:#526579;--live:#0E7C6B;--marine:#00304D;--desk:#00304D;--gold:#B8912B;--terra:#B0562F;--chalk:#F4F7F9;--mist:#9FB3C4;--line:rgba(70,88,106,.18);--breath:8px;--gap-line:24px;--stanza:48px;--movement:96px;
--font-display:'Fraunces',Georgia,serif;--font-mono:'IBM Plex Mono',ui-monospace,monospace;
--font-hand:'Instrument Serif',Georgia,serif;--font-body:'Outfit',system-ui,-apple-system,sans-serif;}
html{overflow-x:clip;}
body{background:var(--desk);color:var(--ink);font-family:var(--font-body);line-height:1.7;-webkit-font-smoothing:antialiased;overflow-x:clip;}
.page{max-width:600px;margin:0 auto;padding:44px 18px 80px;}
.plate{background:var(--paper);border-radius:14px;padding:28px 24px 34px;margin-top:26px;box-shadow:0 10px 34px rgba(0,10,20,.28);}
.plate-eye{font-family:var(--font-mono);font-weight:500;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--terra);margin-bottom:var(--breath);}
.over{font-family:var(--font-mono);font-weight:500;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);}
h1{font-family:var(--font-display);font-weight:400;font-size:40px;line-height:44px;letter-spacing:-0.5px;margin:var(--breath) 0 0;text-wrap:balance;color:var(--chalk);}
.sub{font-family:var(--font-hand);font-style:italic;font-size:17px;color:var(--mist);margin-top:10px;}
h1.et{font-size:30px;line-height:34px;font-weight:450;letter-spacing:0;}
.eyerow{display:flex;justify-content:space-between;align-items:baseline;}
.eyerow .ed2{font-family:var(--font-mono);font-size:11px;letter-spacing:.14em;color:var(--mist);}
.dbl{height:5px;border-top:1px solid var(--gold);border-bottom:1px solid rgba(184,145,43,.25);margin-top:20px;opacity:.7;}
.lead{font-size:16.5px;color:var(--mist);margin-top:20px;text-wrap:pretty;}
.spine{margin-top:40px;position:relative;padding-left:26px;}
.spine::before{content:'';position:absolute;left:6px;top:8px;bottom:8px;width:2px;border-radius:1px;
background-color:rgba(20,33,44,.16);background-image:linear-gradient(var(--ink),var(--ink));
background-repeat:no-repeat;background-size:100% var(--told-depth,0%);transition:background-size 600ms ease-out;}
.mov{font-family:var(--font-mono);font-weight:500;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--terra);margin:56px 0 var(--breath);position:relative;}
.mov:first-child{margin-top:0;}
.chp{display:block;text-decoration:none;color:inherit;padding:12px 0;position:relative;}
.chp .knot{position:absolute;left:-25px;top:19px;width:12px;height:12px;border-radius:50%;background:var(--paper);border:2px solid var(--schist);box-sizing:border-box;}
.chp .knot.told{background:var(--ink);border-color:var(--ink);box-shadow:0 0 0 3px rgba(184,145,43,.3);}
.chp .knot.part{background:linear-gradient(var(--paper) 50%, var(--schist) 50%);border-color:var(--ink-dim);}
.chp:hover .knot{border-color:var(--ink);}
.chp:focus-visible{outline:2px solid var(--live);outline-offset:4px;border-radius:6px;}
.chp .d{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--schist);}
.chp h2{font-family:var(--font-display);font-weight:400;font-size:21px;margin-top:2px;line-height:1.25;}
.chp .v{font-family:var(--font-hand);font-style:italic;font-size:15px;color:var(--ink-dim);}

.chips{margin-top:8px;display:flex;flex-wrap:wrap;gap:8px;}
.chip{font-family:var(--font-mono);font-size:10px;letter-spacing:.1em;text-transform:lowercase;color:var(--mist);
border-left:2px solid var(--tint,var(--line));padding-left:6px;}
.gate{margin-top:60px;font-size:15.5px;color:var(--ink-dim);}
.fn{color:var(--gold);font-style:normal;}
.keyline{font-family:var(--font-hand);font-style:italic;font-size:14px;line-height:22px;color:var(--mist);margin-top:var(--breath);display:inline-block;padding:2px 0;}
.plate .keyline{color:rgba(20,33,44,.7);background:rgba(184,145,43,.07);padding:2px 8px;border-radius:3px;}
.plate .chip{color:var(--schist);}
.metarow{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:var(--gap-line);flex-wrap:wrap;}
.metarow .editday{margin-top:0;color:var(--live);border-color:var(--live);}
.plate .chbody{margin-top:var(--gap-line);}
.tonight{border:1px solid var(--marine);border-radius:10px;padding:14px 16px;margin:26px 0 4px;display:block;text-decoration:none;color:inherit;}
.tonight .tl{font-family:var(--font-mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--marine);}
.tonight .tt{font-family:var(--font-display);font-size:19px;margin-top:2px;}
.tonight .tq{font-family:var(--font-hand);font-style:italic;font-size:14px;color:var(--ink-dim);margin-top:2px;}
.editday{display:inline-block;margin-top:12px;font-family:var(--font-mono);font-size:11px;letter-spacing:.08em;color:var(--gold);border:1px solid var(--gold);border-radius:7px;padding:5px 12px;text-decoration:none;}
details.fold{border:1px solid var(--line);border-radius:10px;padding:0 16px;margin:12px 0;}
details.fold summary{cursor:pointer;font-family:var(--font-mono);font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--schist);padding:12px 0;list-style:none;}
details.fold summary::-webkit-details-marker{display:none}
details.fold summary::before{content:'▸ ';color:var(--gold)}
details.fold[open] summary::before{content:'▾ '}
details.fold .fb{padding-bottom:14px;font-size:14px;color:var(--ink-dim);}
details.fold .fb p{margin-top:8px;}
details.fold .fb b{color:var(--ink);font-weight:600;}
details.fold dt{font-family:var(--font-display);font-weight:600;font-size:15px;color:var(--marine);margin-top:8px;}
details.fold dd{font-size:13.5px;color:var(--schist);}
footer{margin-top:64px;border-top:1px solid rgba(159,179,196,.25);padding-top:16px;font-family:var(--font-mono);font-size:10px;letter-spacing:.1em;color:var(--mist);line-height:2;}
footer a{color:var(--gold);text-decoration:none;}
:root{--tint-m:#4A6B8A;--tint-c:#A05E6E;}
.chbody{margin-top:var(--stanza);}
.hook{font-family:var(--font-hand);font-style:italic;font-size:21px;line-height:1.42;color:var(--ink);margin-top:var(--gap-line);}
.hook::before{content:'* ';color:var(--gold);font-style:normal;}
.prose{font-size:16px;line-height:27px;margin-top:var(--gap-line);max-width:34em;text-wrap:pretty;}
.quiet{font-family:var(--font-hand);font-style:italic;font-size:16px;color:var(--ink-dim);margin-top:18px;}
.aside{font-family:var(--font-mono);font-size:12px;color:var(--schist);margin-top:16px;letter-spacing:.02em;}
[data-by=m]{border-left:2px solid var(--tint-m);padding-left:14px;}
[data-by=c]{border-left:2px solid var(--tint-c);padding-left:14px;}
.drop{font-family:var(--font-hand);font-style:italic;font-size:15px;color:var(--schist);border-left:2px solid #8A5A83;padding-left:12px;margin:22px 0;}
.ledger{font-family:var(--font-mono);font-size:12px;color:var(--schist);border-left:2px solid #A96D14;padding-left:12px;margin:10px 0;display:flex;gap:12px;}
.ledger .amt{font-variant-numeric:tabular-nums;min-width:5.5ch;text-align:right;}
.doct{border-left:2px solid var(--live);padding-left:12px;margin:24px 0;}
.doct .d-eye{font-family:var(--font-mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--live);}
.doct p{font-family:var(--font-display);font-weight:400;font-size:18px;margin-top:2px;}
.prompt{font-family:var(--font-hand);font-style:italic;font-size:18px;color:var(--ink-dim);text-align:center;margin:36px 0;}
.prompt::before{content:'— ';color:var(--schist);}
.dinkus{text-align:center;color:var(--gold);font-size:14px;letter-spacing:.5em;padding-left:.5em;margin:var(--stanza) 0;}
.phint{text-align:center;font-family:var(--font-mono);font-size:10px;letter-spacing:.1em;margin-top:-26px;margin-bottom:30px;}
.phint a{color:var(--gold);text-decoration:none;}
.card{border:1px solid var(--line);border-radius:10px;padding:14px;margin:26px 0;display:flex;flex-direction:column;gap:4px;}
.card .c-eye{font-family:var(--font-mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--schist);}
.card .c-star{font-family:var(--font-display);font-size:16px;}
.card .c-star .star{color:var(--gold);}
.card .cl{font-family:var(--font-mono);font-size:11.5px;color:var(--schist);}
.card .c-un{font-style:italic;}
.card .c-rule{font-family:var(--font-hand);font-style:italic;font-size:14px;color:var(--ink-dim);margin-top:4px;}
.closer{font-family:var(--font-hand);font-style:italic;font-size:16px;color:var(--ink-dim);text-align:right;margin-top:44px;}
.pn{border-top:1px solid var(--line);margin-top:40px;padding-top:14px;display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:11px;}
.pn a{color:var(--live);text-decoration:none;max-width:45%;}
.shot{width:100vw;margin-inline:calc(50% - 50vw);margin-block:var(--stanza);}
.shot img{display:block;margin-inline:auto;max-width:100%;max-height:82vh;width:auto;height:auto;}
.shot figcaption{font-family:var(--font-hand);font-style:italic;font-size:15px;color:var(--ink-dim);max-width:560px;margin:8px auto 0;padding-inline:22px;}
.ph-miss{border:1px dashed var(--line);border-radius:8px;aspect-ratio:3/2;display:grid;place-items:center;font-family:var(--font-mono);font-size:11px;color:var(--schist);margin:24px 0;}
.strip-rule{border:0;border-top:1px solid var(--line);margin:40px 0 8px;}
.jmap{margin:var(--stanza) 0;}
.jmap svg{width:100%;height:auto;display:block;}
.jmap .ml{font-family:var(--font-mono);font-size:15px;letter-spacing:.04em;fill:var(--schist);}
.jmap .mf{fill:var(--marine);}
.jmap .ma{font-family:var(--font-mono);font-size:30px;letter-spacing:.1em;fill:var(--schist);}
.jmap figcaption{font-family:var(--font-hand);font-style:italic;font-size:14px;color:var(--ink-dim);text-align:center;margin-top:6px;}
.m-draw{stroke-dasharray:1;stroke-dashoffset:1;animation:jdraw 1.6s cubic-bezier(.4,0,.2,1) .3s forwards;}
@keyframes jdraw{to{stroke-dashoffset:0}}
.spine-map svg{height:210px;width:auto;margin:28px auto 0;}
.told-stamp{display:inline-block;font-family:var(--font-mono);font-weight:600;font-size:9px;line-height:1;letter-spacing:.26em;text-transform:uppercase;color:var(--gold);
border:1.5px solid var(--gold);border-radius:2px;outline:1px solid rgba(184,145,43,.45);outline-offset:3px;padding:4px 8px 4px 10px;margin-left:12px;
transform:rotate(-3deg);opacity:.85;mix-blend-mode:multiply;animation:settle 240ms ease-out both;}
@keyframes settle{from{transform:rotate(-3deg) scale(1.7);opacity:0;}to{transform:rotate(-3deg) scale(1);opacity:.85;}}
.dots{display:inline-flex;gap:4px;margin-left:8px;vertical-align:1px;}
.dots i{width:5px;height:5px;border-radius:50%;display:inline-block;}
.dots .dm{background:var(--tint-m);}
.dots .dc{background:var(--tint-c);}
.star{color:var(--gold);}
.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;}
.prompt + .prompt{margin-top:-16px;}
.pn a{font-family:var(--font-hand);font-style:italic;font-size:14px;}
@media (prefers-reduced-motion: reduce){.m-draw{animation:none;stroke-dashoffset:0;}.told-stamp{animation:none;}}
@media print{
  *{print-color-adjust:exact;-webkit-print-color-adjust:exact;}
  body{background:#fff}.page{padding:0;max-width:none}
  .plate{box-shadow:none;border:1px solid #ddd;border-radius:0}
  h1,.sub,.lead,.keyline{color:#14212C!important}
  .shot{width:100%;margin-inline:0}
  .shot img{max-height:95vh}
  .shot,.jmap,.card,.doct{break-inside:avoid}
  .pn{display:none}
  .m-draw{animation:none;stroke-dashoffset:0}
  .told-stamp{animation:none}
}
`;

export const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..700&family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500&family=Instrument+Serif:ital@0;1&family=Outfit:wght@300..600&display=swap" rel="stylesheet">`;

export function journalShell(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)} · il varo</title>
${FONT_LINKS}
<style>${JOURNAL_CSS}</style>
</head>
<body>
<main class="page">
${body}
</main>
</body>
</html>`;
}

export function chipRow(threadsJson: string): string {
  let tags: string[] = [];
  try { tags = (JSON.parse(threadsJson) as string[]).filter((t) => typeof t === 'string'); } catch { /* none */ }
  if (!tags.length) return '';
  return `<div class="chips">${tags.map((t) =>
    `<span class="chip" style="--tint:${THREAD_TINT[t] ?? 'var(--line)'}">${esc(t)}</span>`).join('')}</div>`;
}

// the five movements of the crossing — sort ranges to part-eyebrows on the cord
const MOVEMENTS: { upTo: number; label: string }[] = [
  { upTo: 50, label: 'I · LONDON & FRANCE' },
  { upTo: 150, label: 'II · THE SHIP' },
  { upTo: 170, label: 'III · MALTA' },
  { upTo: 200, label: 'IV · SICILY' },
  { upTo: Infinity, label: 'V · HOME' },
];
export const movementOf = (sort: number): string => MOVEMENTS.find((m) => sort <= m.upTo)!.label;

export async function renderJournalHome(env: Env, tier: Tier, now: Date = new Date(), base = '/journal'): Promise<string> {
  const fam = tier !== 'public';
  const where = fam ? 'WHERE enabled=1' : 'WHERE enabled=1 AND public=1';
  const cols = fam ? 'id, day_date, title, voice, body, threads, closer, public, sort' : 'id, day_date, title, voice, threads, closer, public, sort';
  const rows = await env.DB.prepare(
    `SELECT ${cols} FROM journal_chapters ${where} ORDER BY sort, day_date, id`,
  ).all<ChapterRow & { body?: string }>().then((r) => r.results ?? []).catch(() => [] as (ChapterRow & { body?: string })[]);

  const metaRow = await env.DB.prepare(`SELECT json FROM journal_meta WHERE id=?`).bind('v1')
    .first<{ json: string }>().catch(() => null);
  let meta: JournalMeta = {};
  try { meta = metaRow ? (JSON.parse(metaRow.json) as JournalMeta) : {}; } catch { /* defaults */ }

  // family only: the game's rings and dots (photo counts + seed prompts in two cheap reads)
  let photoMap = new Map<string, number>();
  let promptsMap: Record<string, string[]> = {};
  if (fam && rows.length) {
    const pr = await env.DB.prepare(
      'SELECT chapter_id, COUNT(*) AS n FROM journal_assets WHERE enabled=1 GROUP BY chapter_id',
    ).all<{ chapter_id: string; n: number }>().then((r) => r.results ?? []).catch(() => []);
    photoMap = new Map(pr.map((r) => [r.chapter_id, r.n]));
    const pm = await env.DB.prepare('SELECT json FROM journal_meta WHERE id=?').bind('prompts')
      .first<{ json: string }>().catch(() => null);
    try { promptsMap = pm ? JSON.parse(pm.json) as Record<string, string[]> : {}; } catch { /* none */ }
  }

  // the overview map's honest progress: the last day-chapter lived (Rome) with a resolvable port
  const today = romeDate(now);
  let progressPort: string | undefined;
  for (const r of rows) {
    if (!r.day_date || r.day_date > today) continue;
    const f = resolveFocus(r.id);
    if (f?.portId && ROUTE_ORDER.includes(f.portId)) progressPort = f.portId;
  }

  const rowHtml = (r: ChapterRow & { body?: string }): string => {
    const day = r.day_date ? fmtDay(r.day_date) : '—';
    if (fam && r.body !== undefined) {
      const st = chapterStats(parseBody(r.body), photoMap.get(r.id) ?? 0, (promptsMap[r.id] ?? []).length);
      const dots = `${st.words.m > 0 ? '<i class="dm" aria-hidden="true"></i>' : ''}${st.words.c > 0 ? '<i class="dc" aria-hidden="true"></i>' : ''}${
        st.words.m > 0 || st.words.c > 0 ? `<span class="vh">${st.words.m > 0 && st.words.c > 0 ? 'both their words' : st.words.m > 0 ? 'his words' : 'her words'}</span>` : ''}`;
      const knot = st.told ? 'knot told' : st.score > 0 ? 'knot part' : 'knot';
      return `<a class="chp" href="${base}/ch/${esc(r.id)}"><span class="${knot}" aria-hidden="true"></span>
        <span class="d">${esc(day)}${st.told ? '<span class="told-stamp">told</span>' : ''}${dots ? `<span class="dots">${dots}</span>` : ''}</span>
        <h2>${esc(r.title)}</h2>
        ${r.voice ? `<p class="v">${esc(r.voice)}</p>` : ''}
      </a>`;
    }
    return `<a class="chp" href="${base}/ch/${esc(r.id)}"><span class="knot" aria-hidden="true"></span>
        <span class="d">${esc(day)}</span>
        <h2>${esc(r.title)}</h2>
        ${r.voice ? `<p class="v">${esc(r.voice)}</p>` : ''}
      </a>`;
  };

  let lastMovement = '';
  const spineRows = rows.map((r) => {
    const mov = movementOf(r.sort);
    const eyebrow = mov !== lastMovement ? `<p class="mov">${esc(mov)}</p>` : '';
    lastMovement = mov;
    return eyebrow + rowHtml(r);
  }).join('');

  // family self-instruction: tonight's chapter (thinnest lived day), how it works, the house phrases
  let famDeck = '';
  if (fam && rows.length) {
    let tonight: { id: string; title: string; voice: string; open: number } | null = null;
    let best = 101;
    let scoreSum = 0, dayCount = 0, mw = 0, cw = 0;
    for (const r of rows) {
      if (r.body === undefined) continue;
      const stAll = chapterStats(parseBody(r.body), photoMap.get(r.id) ?? 0, (promptsMap[r.id] ?? []).length);
      mw += stAll.words.m; cw += stAll.words.c;
      if (r.day_date) { scoreSum += stAll.score; dayCount++; }
      if (!r.day_date || r.day_date > today) continue;
      if (stAll.score < best) { best = stAll.score; tonight = { id: r.id, title: r.title, voice: r.voice, open: stAll.promptsOpen }; }
    }
    void scoreSum; void dayCount; void mw; void cw;
    // plate 6.1: the cord is the only progress surface — no bar, no fraction, no percentage
    const gstrip = `<p class="keyline">the cord holds the ink · <span class="dots"><i class="dm" aria-hidden="true"></i><i class="dc" aria-hidden="true"></i></span> margin threads are yours and hers · the arithmetic lives in <a href="${base}/admin#game" style="color:var(--gold)">score</a></p>`;
    famDeck = `${gstrip}${tonight ? `<a class="tonight" href="${base}/ch/${esc(tonight.id)}">
      <span class="tl">tonight's chapter</span>
      <p class="tt">${esc(tonight.title)}</p>
      <p class="tq">${tonight.open ? `${tonight.open} question${tonight.open === 1 ? '' : 's'} waiting — tap ✎ edit inside` : esc(tonight.voice)}</p>
    </a>` : ''}
    <details class="fold"><summary>how this works</summary><div class="fb">
      <p><b>Reading:</b> every day of the crossing is a chapter, already written. Tap any knot on the cord.</p>
      <p><b>Writing:</b> every chapter has an <b>✎ edit this day</b> button — it opens the day as editable paragraphs in <a href="${base}/admin#chapters">write</a> — change anything, answer the italic questions, add your own lines. Edited words quietly take your colour: <i class="own om" style="width:7px;height:7px;border-radius:50%;display:inline-block;background:var(--tint-m)"></i> his, <i style="width:7px;height:7px;border-radius:50%;display:inline-block;background:var(--tint-c)"></i> hers.</p>
      <p><b>Photos:</b> <a href="${base}/admin#bench">photos</a> takes them straight from the camera roll and files them to the right day.</p>
      <p><b>The game:</b> a chapter you've made yours crosses <b>told</b> and its knot fills. <a href="${base}/admin#game">The scoreboard</a> keeps the marriage honest.</p>
    </div></details>
    <details class="fold"><summary>the house phrases — it is obligatory not to smile</summary><div class="fb"><dl>
      <dt>Conditions remain superb.</dt><dd>The daily report, filed without smiling. Also true.</dd>
      <dt>As arranged.</dt><dd>Everything went to plan, including the parts that were never planned.</dd>
      <dt>included</dt><dd>Already paid for, therefore attending. No appeals are heard.</dd>
      <dt>deferred</dt><dd>Better than done, when done would be worse. See: Mont Blanc.</dd>
      <dt>one rule</dt><dd>Claire's daily law. One per day, correct by evening.</dd>
      <dt>told</dt><dd>A chapter that has stopped being the plan and become the memory.</dd>
    </dl></div></details>`;
  }

  let toldDepth = 0;
  if (fam) {
    let lastTold = -1;
    rows.forEach((r, i) => {
      if (r.body === undefined) return;
      const st = chapterStats(parseBody(r.body), photoMap.get(r.id) ?? 0, (promptsMap[r.id] ?? []).length);
      if (st.told) lastTold = i;
    });
    if (lastTold >= 0) toldDepth = Math.round(((lastTold + 1) / rows.length) * 100);
  }
  const spine = rows.length
    ? `<nav class="spine" style="--told-depth:${toldDepth}%">${spineRows}</nav>`
    : `<p class="gate">${tier === 'public' ? 'Nothing has been made public yet.' : 'Nothing lived yet — the first chapter lands when it lands.'}</p>`;

  return journalShell(meta.title ?? 'The Crossing', `
  <header>
    <p class="over">il varo · the journal</p>
    <h1>${esc(meta.title ?? 'The Crossing')}</h1>
    <p class="sub">${esc(meta.sub ?? 'conditions remain superb')}<span class="fn">*</span></p>
    <p class="keyline"><span class="fn">*</span>&nbsp;the house report, filed daily, delivered without smiling.</p>
    ${meta.hero ? `<p class="lead">${esc(meta.hero)}</p>` : ''}
    <div class="dbl" aria-hidden="true"></div>
  </header>
  ${rows.length ? `<section class="plate">${renderChapterMap(null, undefined, 'overview', progressPort)}${famDeck}${spine}</section>` : famDeck + spine}
  <footer>a journal of the august crossing${tier !== 'public' ? ` · <a href="${base}/guide">the run-sheet</a> · <a href="${base}/traversata">la traversata</a>` : ''}</footer>`);
}

/** the quiet gate — no existence hints */
export function renderGate(): string {
  return journalShell('The Crossing', `
  <header>
    <p class="over">il varo · the journal</p>
    <h1>This page is family-only.</h1>
    <p class="lead">If someone sent you here, ask them for the link with the key in it.</p>
  </header>`);
}
