import type { Env } from '../env';
import type { Tier } from './auth';

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
  drops: '#8A5A83', ledger: '#A96D14', hardship: '#526579',
};

export const JOURNAL_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{--paper:#FBFCFD;--ink:#14212C;--ink-dim:#43586C;--schist:#526579;--live:#0E7C6B;--line:rgba(70,88,106,.18);
--font-display:'Fraunces',Georgia,serif;--font-mono:'IBM Plex Mono',ui-monospace,monospace;
--font-hand:'Instrument Serif',Georgia,serif;--font-body:'Outfit',system-ui,-apple-system,sans-serif;}
body{background:var(--paper);color:var(--ink);font-family:var(--font-body);line-height:1.7;-webkit-font-smoothing:antialiased;}
.page{max-width:560px;margin:0 auto;padding:48px 22px 80px;}
.over{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.24em;text-transform:uppercase;color:var(--live);}
h1{font-family:var(--font-display);font-weight:360;font-size:clamp(30px,8vw,42px);line-height:1.1;margin:14px 0 0;text-wrap:balance;}
.sub{font-family:var(--font-hand);font-style:italic;font-size:17px;color:var(--ink-dim);margin-top:10px;}
.lead{font-size:16.5px;color:var(--ink-dim);margin-top:20px;text-wrap:pretty;}
.spine{margin-top:44px;}
.chp{display:block;text-decoration:none;color:inherit;border-top:1px solid var(--line);padding:18px 0;}
.chp .d{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--schist);}
.chp h2{font-family:var(--font-display);font-weight:400;font-size:22px;margin-top:4px;}
.chp .v{font-family:var(--font-hand);font-style:italic;font-size:15px;color:var(--ink-dim);}
.chips{margin-top:8px;display:flex;flex-wrap:wrap;gap:8px;}
.chip{font-family:var(--font-mono);font-size:10px;letter-spacing:.1em;text-transform:lowercase;color:var(--schist);
border-left:2px solid var(--tint,var(--line));padding-left:6px;}
.gate{margin-top:60px;font-size:15.5px;color:var(--ink-dim);}
footer{margin-top:64px;border-top:1px solid var(--line);padding-top:16px;font-family:var(--font-mono);font-size:10px;letter-spacing:.1em;color:var(--schist);line-height:2;}
footer a{color:var(--live);text-decoration:none;}
@media print{body{background:#fff}.page{padding:0;max-width:none}}
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

export async function renderJournalHome(env: Env, tier: Tier): Promise<string> {
  const where = tier === 'public' ? 'WHERE enabled=1 AND public=1' : 'WHERE enabled=1';
  const rows = await env.DB.prepare(
    `SELECT id, day_date, title, voice, threads, closer, public, sort FROM journal_chapters ${where} ORDER BY sort, day_date, id`,
  ).all<ChapterRow>().then((r) => r.results ?? []).catch(() => [] as ChapterRow[]);

  const metaRow = await env.DB.prepare(`SELECT json FROM journal_meta WHERE id='v1'`)
    .first<{ json: string }>().catch(() => null);
  let meta: JournalMeta = {};
  try { meta = metaRow ? (JSON.parse(metaRow.json) as JournalMeta) : {}; } catch { /* defaults */ }

  const spine = rows.length
    ? `<nav class="spine">${rows.map((r) => `<a class="chp" href="/journal/ch/${esc(r.id)}">
        <span class="d">${esc(r.day_date || '—')}</span>
        <h2>${esc(r.title)}</h2>
        ${r.voice ? `<p class="v">${esc(r.voice)}</p>` : ''}
        ${chipRow(r.threads)}
      </a>`).join('')}</nav>`
    : `<p class="gate">${tier === 'public' ? 'Nothing has been made public yet.' : 'Nothing lived yet — the first chapter lands when it lands.'}</p>`;

  return journalShell(meta.title ?? 'The Crossing', `
  <header>
    <p class="over">il varo · the journal</p>
    <h1>${esc(meta.title ?? 'The Crossing')}</h1>
    <p class="sub">${esc(meta.sub ?? 'conditions remain grim')}</p>
    ${meta.hero ? `<p class="lead">${esc(meta.hero)}</p>` : ''}
  </header>
  ${spine}
  <footer>a journal of the august crossing${tier !== 'public' ? ' · <a href="/journal/doctrine">the doctrine</a> · <a href="/journal/cast">the cast</a>' : ''}</footer>`);
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
