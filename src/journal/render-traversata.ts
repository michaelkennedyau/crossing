import { esc } from './render-home';

/**
 * La Traversata, served one audience at a time — traversata.varo.au/<token> renders
 * ONLY that mode's room (no tabs, no sight of the other three). The gift keeps its own
 * cloth (paper #FCF8F0, Cormorant/Atkinson/Plex), not the journal's marine desk. The
 * short road / long road split stays: summary card up front, <details> for depth.
 */

export interface TraversataDoc {
  label: string;        // 'per la famiglia Daví'
  star: string;         // ribbon terminus: 'PALERMO'
  dedication: string;
  summary: string;
  long: string;
  glossary: { term: string; def: string }[];
  programme: string;
  intimate?: boolean;   // the room with no audience — dispatch shows it to admin eyes only
}

/** tiny renderer: paras, **bold**, *italic*, ✻ gold cues, | table rows (kids ratings) */
export function traversataMd(text: string): string {
  const out: string[] = [];
  for (const para of text.trim().split(/\n\s*\n/)) {
    const lines = para.split('\n').filter((l) => l.trim());
    if (lines.length && lines.every((l) => l.trim().startsWith('|'))) {
      const rows = lines
        .map((l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => esc(c.trim())))
        .filter((cells) => !cells.every((c) => /^:?-{2,}:?$/.test(c)))
        .map((cells) => `<tr>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`);
      out.push(`<table class="rate">${rows.join('')}</table>`);
      continue;
    }
    let p = esc(lines.map((l) => l.trim()).join(' '));
    p = p.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    p = p.replace(/\*(.+?)\*/g, '<em>$1</em>');
    out.push(p.startsWith('✻') ? `<p class="cue">${p}</p>` : `<p>${p}</p>`);
  }
  return out.join('\n');
}

function ribbon(starLabel: string): string {
  const stops = ['LONDON', 'PARIS', 'LYON', 'NICE', 'VALLETTA', 'PALERMO'];
  const W = 560, Y = 34;
  const n = stops.length + 1;
  const xs = Array.from({ length: n }, (_, i) => 30 + (i * (W - 60)) / (n - 1));
  const parts = [
    `<line x1="${xs[0]}" y1="${Y}" x2="${xs[n - 1]}" y2="${Y}" stroke="#00304D" stroke-width="1.2" stroke-dasharray="1 4"/>`,
  ];
  stops.forEach((s, i) => {
    parts.push(`<circle cx="${xs[i].toFixed(0)}" cy="${Y}" r="2.5" fill="#00304D"/>`);
    parts.push(`<text x="${xs[i].toFixed(0)}" y="${i % 2 === 0 ? Y - 10 : Y + 18}" text-anchor="middle" class="rl">${s}</text>`);
  });
  const sx = xs[n - 1].toFixed(0);
  parts.push(`<text x="${sx}" y="${Y + 5}" text-anchor="middle" class="rs">★</text>`);
  parts.push(`<text x="${sx}" y="${Y - 10}" text-anchor="middle" class="rl rg">${esc(starLabel)}</text>`);
  return `<svg viewBox="0 0 ${W} 64" role="img" aria-label="the route, ending at ${esc(starLabel.toLowerCase())}">${parts.join('')}</svg>`;
}

function shell(body: string, edition = ''): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<meta name="referrer" content="same-origin">
<title>La Traversata${edition ? ` · ${esc(edition)}` : ''}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#FCF8F0;color:#1E2A33;font-family:'Atkinson Hyperlegible',Verdana,sans-serif;line-height:1.65;font-size:17px}
.page{max-width:600px;margin:0 auto;padding:40px 20px 80px}
header{text-align:center}
.mast{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.3em;color:#B0562F}
h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:44px;color:#00304D;margin-top:8px}
.sub{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:18px;color:#5B6B76}
.edn{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#B0562F;margin-top:10px}
.ded{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;text-align:center;color:#5B6B76;margin-top:18px}
.ribbon{margin:18px 0 6px}
.ribbon svg{width:100%;height:auto}
.rl{font-family:'IBM Plex Mono',monospace;font-size:8.5px;letter-spacing:.08em;fill:#5B6B76}
.rg{fill:#B8912B}
.rs{font-size:13px;fill:#B8912B}
.card{border:1px solid #D8CDB8;border-radius:10px;padding:18px;margin:18px 0;background:#fff9}
.lane{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#B0562F;margin-bottom:10px}
.sum p{margin-top:10px}
.longroad>summary{cursor:pointer;list-style:none;border:1px solid #00304D22;border-radius:10px;padding:12px 18px;margin:6px 0 14px}
.longroad>summary::-webkit-details-marker{display:none}
.longroad>summary .lane{margin:0;color:#00304D}
.longroad>summary::after{content:' ▾';color:#B8912B}
.longroad[open]>summary::after{content:' ▴'}
.longroad p{margin-top:14px}
.longroad strong{font-family:'Cormorant Garamond',Georgia,serif;font-size:19px;color:#00304D}
.cue{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;color:#B8912B}
.rate{border-collapse:collapse;margin:14px auto;font-family:'IBM Plex Mono',monospace;font-size:12px}
.rate td{border:1px solid #D8CDB8;padding:5px 10px}
.prog pre{font-family:'IBM Plex Mono',monospace;font-size:12px;white-space:pre-wrap;color:#00304D;line-height:1.7}
.gloss dt{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:18px;color:#00304D;margin-top:10px}
.gloss dd{color:#5B6B76;font-size:15px}
footer{text-align:center;margin-top:40px;font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;color:#5B6B76}
@media print{body{background:#fff}.longroad{open:true}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
</head>
<body>
<div class="page">
<header>
  <p class="mast">LA TRAVERSATA · MMXXVI</p>
  <h1>The Crossing</h1>
  <p class="sub">three weeks and change · conditions remain grim</p>
${edition ? `<p class="edn">${esc(edition)}</p>` : ''}
</header>
${body}
</div>
</body>
</html>`;
}

export function renderTraversataMode(doc: TraversataDoc): string {
  const gl = doc.glossary
    .map((g) => `<div class="grow"><dt>${esc(g.term)}</dt><dd>${esc(g.def)}</dd></div>`)
    .join('');
  return shell(`<main>
  <p class="ded">${esc(doc.dedication)}</p>
  <figure class="ribbon">${ribbon(doc.star)}</figure>
  <div class="card sum">
    <p class="lane">the short road · forty seconds</p>
    ${traversataMd(doc.summary)}
  </div>
  <details class="longroad">
    <summary><span class="lane">the long road · four minutes</span></summary>
    ${traversataMd(doc.long)}
    <div class="card prog"><pre>${esc(doc.programme)}</pre></div>
    <div class="card gloss">
      <p class="lane">the glossary — handed over formally. it is obligatory not to smile.</p>
      <dl>${gl}</dl>
    </div>
  </details>
</main>
<footer>— Michael &amp; Claire · the hardship continues</footer>`, doc.label);
}

/** the bare host root — nothing listed, ever */
export function renderTraversataCover(): string {
  return shell(`<footer>a family document — it travels by invitation.</footer>`);
}

/** every miss is byte-identical: no token oracle */
export function renderTraversataMiss(): string {
  return shell(`<footer>nothing lives at this address.</footer>`);
}
