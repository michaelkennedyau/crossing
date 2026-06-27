import type { Env } from './env';
import { LEG_PLACES } from './places';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The Voyage legs (exact copy from the Claude Design handoff). Server-rendered so the page is
 * beautiful and complete before any JS — the reduced-motion / no-JS parity starts here.
 */
interface Leg {
  n: string;
  label: string;
  eyebrow: string;
  head: string;
  headClass?: string;
  hand?: string;
  telemetry?: string;
  live?: string;
  tall?: boolean;
  cta?: boolean;
}

const LEGS: Leg[] = [
  {
    n: '0', label: 'Cold open',
    eyebrow: 'A maiden voyage · winter · the Andes by water',
    head: 'il varo', headClass: 'hero',
    hand: 'The launch — a hull meeting water for the first time, and the held breath before the first note.',
    telemetry: 'QF527 · BNE → SYD · SAT 4 JUL 12:15 · T− <span data-countdown>—</span><br><span class="syd-note">then Sydney overnight · QF27 to the launch · 5 Jul</span>',
  },
  {
    n: '00', label: 'The vessel',
    eyebrow: '00 · The vessel',
    head: 'A maiden voyage, at the bow of a year that is itself a launch.',
    hand: 'Two adults, three sons — seventeen, fourteen, eight. The journey is the purpose; the skiing is the coda. And one warm light, still at its <span class="ember-word">mooring</span>.',
  },
  {
    n: '01', label: 'Puerto Varas',
    eyebrow: '01 · Puerto Varas — the night before',
    head: 'Osorno holds the dark across the water. First light has not decided yet.',
    telemetry: '41.32°S 72.98°W · LAGO LLANQUIHUE · ELEV 65 m',
    live: 'PUERTO VARAS · −1°C · CLEAR · FREEZING 1,600 m',
  },
  {
    n: '02', label: 'The emerald hush',
    eyebrow: '02 · Lago Todos los Santos — the emerald hush',
    head: 'The water turns an impossible green, and the last road falls away behind Peulla.',
    telemetry: 'DEPTH 337 m · GLACIAL FLOUR · NO ROAD OUT',
    hand: 'An emerald you can only reach by water.',
  },
  {
    n: '03', label: 'The pass',
    eyebrow: '03 · Paso Pérez Rosales — the apex',
    head: 'The divide at nine hundred and seventy-six metres — Tronador hangs its glaciers over the line between two oceans.',
    telemetry: '976 m · CONTINENTAL DIVIDE · TRONADOR 3,491 m',
  },
  {
    n: '04b', label: 'Lago Frías — engine cut',
    eyebrow: 'Lago Frías — the cathedral leg',
    head: 'Engine cut.', headClass: 'cut',
    hand: 'Vertical rainforest walls, black water, a single held note — and then nothing. Sit in the silence.',
    telemetry: '— hold —', tall: true,
  },
  {
    n: '04', label: 'The arrival',
    eyebrow: '04 · Nahuel Huapi — the arrival',
    head: 'Nahuel Huapi opens wide, and the cold finally becomes light.',
    telemetry: 'PUERTO PAÑUELO · 41.07°S 71.63°W · DAYBREAK',
    hand: 'The <span class="ember-word">ember</span> reaches Llao Llao, and settles.',
  },
  {
    n: '05', label: 'The coda',
    eyebrow: '05 · Cerro Catedral — the coda',
    head: 'A few unhurried days on the snow. The skiing was never the point.',
  },
  {
    n: '06', label: 'The bridge',
    eyebrow: '06 · The bridge',
    head: 'Now watch how she runs.',
    cta: true,
  },
];

function renderLeg(leg: Leg): string {
  const headTag = leg.headClass === 'hero' ? 'h1' : 'h2';
  return `<section class="leg${leg.tall ? ' leg--tall' : ''}" data-leg="${esc(leg.n)}" data-img="${esc(LEG_IMG[leg.n] ?? '')}" data-screen-label="${esc(leg.label)}">
  <div class="leg-inner" data-reveal>
    <p class="eyebrow">${esc(leg.eyebrow)}</p>
    <${headTag} class="head ${leg.headClass ?? ''}">${esc(leg.head)}</${headTag}>
    ${leg.hand ? `<p class="hand">${leg.hand}</p>` : ''}
    ${leg.telemetry ? `<p class="telemetry">${leg.telemetry}</p>` : ''}
    ${leg.live ? `<p class="live-pill"><span class="live-dot"></span>${esc(leg.live)}</p>` : ''}
    ${leg.n === '0' ? `<p class="scrollhint">scroll to sail · the dawn lifts as you go</p>` : ''}
    ${leg.cta ? `<button class="bridge-open" data-open-bridge type="button">Open the bridge →</button>` : ''}
    ${LEG_PLACES[leg.n] ? `<a class="place" href="${esc(LEG_PLACES[leg.n].url)}" target="_blank" rel="noopener">${esc(LEG_PLACES[leg.n].kind)} · ${esc(LEG_PLACES[leg.n].name)} ↗</a>` : ''}
  </div>
</section>`;
}

// 7 ember-rail nodes from 11%→95% height; the Lago Frías node is turquoise, the last an amber berth.
const NODES = [11, 23, 37, 50, 64, 80, 95];

// leg id → image slug (web/public/img/<slug>-{1280,1920}.{avif,webp}). The image stage reads data-img.
const LEG_IMG: Record<string, string> = {
  '0': 'coldopen', '00': 'vessel', '01': 'puertovaras', '02': 'emerald', '03': 'pass',
  '04b': 'enginecut', '04': 'arrival', '05': 'coda', '06': 'bridge',
};

const CSS = `
:root{
  --void:#04060A; --slate:#0B1119; --schist:#7C8A93; --snow:#E9F0F2; --snow-dim:#A9B8BE;
  --emerald:#1FA37E; --emerald-deep:#13715A; --turquoise:#37C9C2; --turquoise-deep:#1E7E7C;
  --ember:#F2B45E; --ember-hot:#FFD089; --ember-deep:#C98438; --live:#74E0E6; --live-deep:#41B4BE;
  --font-display:'Fraunces',Georgia,serif;
  --font-mono:'IBM Plex Mono',ui-monospace,monospace;
  --font-hand:'Instrument Serif',Georgia,serif;
  --font-body:'Outfit',system-ui,-apple-system,sans-serif;
  --p:0; --dawn:0; --quiet:0;
  --sky-top:#04060A; --sky-mid:#070B12; --sky-bot:#0B1018; --horizon:#16263A;
  --horizon-a:0; --star-a:1; --fog-a:.92; --green-a:0;
}
*{box-sizing:border-box;}
html{-webkit-text-size-adjust:100%;}
body{margin:0;background:var(--void);color:var(--snow);font-family:var(--font-body);font-weight:300;
  line-height:1.65;-webkit-font-smoothing:antialiased;overflow-x:hidden;}

/* ── persistent atmosphere (fixed, behind content) ── */
#sky{position:fixed;inset:0;z-index:0;
  background:linear-gradient(180deg,var(--sky-top) 0%,var(--sky-mid) 52%,var(--sky-bot) 100%);}
/* the cinematic image stage — real location photos, graded cold→warm by --dawn (the dawn-arc scrim
   applied as a filter). The photos ARE the scenery; they replace v1's flat SVG ridgelines. */
#stage{position:fixed;inset:0;z-index:1;overflow:hidden;
  filter:saturate(calc(.4 + .66*var(--dawn))) brightness(calc(.72 + .32*var(--dawn))) contrast(1.06);}
#stage .frame{position:absolute;inset:-5%;background-size:cover;background-position:center;
  will-change:opacity,transform;transform:scale(1.05);}
/* cold-blue grade at the cold open (multiply cools + darkens any warm frame to blue-black), fading
   to the photo's own colour + warmth by the arrival */
#scrim{position:fixed;inset:0;z-index:2;pointer-events:none;mix-blend-mode:multiply;
  background:linear-gradient(180deg, #0b1c30 0%, #07131f 58%, #0a1624 100%);
  opacity:calc(.52 - .48*var(--dawn));}
/* a faint warm wash that only arrives with the dawn — the resolve into daylight */
#warmth{position:fixed;inset:0;z-index:2;pointer-events:none;mix-blend-mode:soft-light;
  background:radial-gradient(120% 90% at 58% 96%, #e8c486, transparent 60%);
  opacity:calc(var(--dawn)*var(--dawn)*.5);}
#mist{position:fixed;inset:0;z-index:3;pointer-events:none;}
#fog{position:fixed;inset:0;z-index:4;pointer-events:none;opacity:calc(var(--fog-a)*.6);filter:blur(22px);
  background:radial-gradient(60% 50% at 28% 40%, rgba(190,205,214,.10), transparent 70%),
             radial-gradient(52% 42% at 72% 64%, rgba(170,190,200,.08), transparent 70%);
  animation:fogdrift 60s ease-in-out infinite;}
#horizon{position:fixed;inset:0;z-index:5;pointer-events:none;mix-blend-mode:screen;opacity:var(--horizon-a);
  background:radial-gradient(120% 100% at 60% 100%, var(--horizon), transparent 60%);}
#grain{position:fixed;inset:0;z-index:6;pointer-events:none;opacity:.07;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size:170px 170px;}
#vignette{position:fixed;inset:0;z-index:7;pointer-events:none;
  background:radial-gradient(125% 105% at 50% 44%, transparent 50%, rgba(2,4,8,.6));}
#hush{position:fixed;inset:0;z-index:8;pointer-events:none;opacity:var(--quiet);
  background:radial-gradient(120% 90% at 50% 46%, transparent 30%, rgba(3,5,9,.66));}

/* ── the ember rail (the throughline) ── */
#rail{position:fixed;left:0;top:0;bottom:0;width:clamp(48px,7vw,72px);z-index:30;pointer-events:none;}
#rail .line{position:absolute;left:50%;top:11%;height:84%;width:1px;transform:translateX(-.5px);
  background:linear-gradient(180deg,transparent,rgba(124,138,147,.32) 12%,rgba(124,138,147,.32) 88%,transparent);}
#rail .node{position:absolute;left:50%;width:7px;height:7px;border-radius:50%;background:var(--schist);
  transform:translate(-50%,-50%);opacity:.7;}
#rail .node.frias{background:var(--turquoise);box-shadow:0 0 8px var(--turquoise);}
#rail .node.last{width:13px;height:13px;background:transparent;border:1.5px solid var(--ember);opacity:.5;}
#ember{position:absolute;left:50%;top:calc(11% + var(--p) * 84%);width:7px;height:7px;border-radius:50%;
  transform:translate(-50%,-50%);background:radial-gradient(circle,var(--ember-hot),var(--ember) 60%,var(--ember-deep));
  animation:emberbeat 3.6s ease-in-out infinite;}
#ember-berth{position:absolute;left:50%;top:95%;width:48px;height:48px;border-radius:50%;
  border:1px solid var(--ember);transform:translate(-50%,-50%);box-shadow:0 0 26px rgba(242,180,94,.4);
  opacity:clamp(0, (var(--p) - 0.93) * 14, 1);}

/* ── voyage content ── */
#voyage{position:relative;z-index:10;}
.leg{position:relative;min-height:100vh;display:flex;align-items:center;padding:clamp(24px,7vw,96px);
  padding-left:clamp(64px,10vw,128px);}
/* legibility scrim — keeps the left-aligned text readable over any photo */
.leg::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;
  background:linear-gradient(90deg, rgba(4,6,10,.62), rgba(4,6,10,.16) 46%, transparent 72%);}
.leg--tall{min-height:128vh;}
.leg-inner{max-width:640px;}
[data-reveal]{opacity:0;transform:translateY(36px);transition:opacity 1.2s cubic-bezier(.16,1,.3,1),transform 1.2s cubic-bezier(.16,1,.3,1);}
[data-reveal].in{opacity:1;transform:none;}
.eyebrow{font-family:var(--font-mono);font-size:11px;font-weight:500;letter-spacing:.3em;
  text-transform:uppercase;color:var(--snow-dim);margin:0 0 18px;}
.head{font-family:var(--font-display);font-weight:300;letter-spacing:-.01em;margin:0;
  font-size:clamp(28px,4.8vw,50px);line-height:1.07;color:var(--snow);}
.head.hero{font-size:clamp(64px,17vw,210px);line-height:.9;}
.head.cut{font-style:italic;font-size:clamp(44px,9vw,108px);}
.hand{font-family:var(--font-hand);font-style:italic;font-size:clamp(17px,2.3vw,23px);
  color:var(--snow-dim);line-height:1.5;margin:20px 0 0;max-width:46ch;}
.ember-word{color:var(--ember);font-style:italic;}
.telemetry{font-family:var(--font-mono);font-size:12px;letter-spacing:.12em;color:var(--snow-dim);margin:22px 0 0;}
.syd-note{display:inline-block;margin-top:7px;color:var(--ember);opacity:.62;}
.place{display:block;width:fit-content;margin-top:24px;font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;
  color:var(--snow-dim);text-decoration:none;border-bottom:1px solid rgba(124,138,147,.3);padding-bottom:2px;transition:.16s;}
.place:hover{color:var(--ember-hot);border-color:var(--ember);}
.live-pill{display:inline-flex;align-items:center;gap:9px;font-family:var(--font-mono);font-size:11px;
  letter-spacing:.08em;color:var(--live);border:1px solid rgba(116,224,230,.25);border-radius:999px;
  padding:7px 13px;margin:16px 0 0;}
.live-dot{width:7px;height:7px;border-radius:50%;background:var(--live);box-shadow:0 0 8px var(--live);
  animation:livepulse 2.4s ease-in-out infinite;}
.scrollhint{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.24em;text-transform:uppercase;
  color:var(--schist);margin-top:42px;}
.bridge-open{margin-top:28px;font-family:var(--font-mono);font-size:13px;letter-spacing:.06em;
  color:var(--ember-hot);background:rgba(242,180,94,.10);border:1px solid var(--ember);border-radius:8px;
  padding:11px 18px;cursor:pointer;transition:background .18s;}
.bridge-open:hover{background:rgba(242,180,94,.18);}

/* ── chrome + readout ── */
.chrome{position:fixed;left:0;right:0;top:0;z-index:40;display:flex;justify-content:space-between;
  align-items:center;padding:16px clamp(16px,4vw,32px);font-family:var(--font-mono);font-size:11px;
  letter-spacing:.2em;text-transform:uppercase;color:var(--snow-dim);
  backdrop-filter:blur(8px);background:linear-gradient(180deg,rgba(4,6,10,.5),transparent);}
.chrome-btn{font:inherit;letter-spacing:inherit;text-transform:inherit;color:var(--snow);background:rgba(233,240,242,.06);
  border:1px solid rgba(124,138,147,.3);border-radius:7px;padding:6px 12px;cursor:pointer;transition:.16s;}
.chrome-btn:hover{background:rgba(233,240,242,.12);}
.readout{position:fixed;left:clamp(16px,4vw,32px);bottom:18px;z-index:40;font-family:var(--font-mono);
  font-size:11px;letter-spacing:.14em;color:var(--snow-dim);}
.readout b{color:var(--snow);font-weight:500;}

/* ── the passage minimap (fixed, bottom-right) ── */
#minimap{position:fixed;right:clamp(14px,3vw,30px);bottom:46px;z-index:40;width:clamp(172px,19vw,224px);
  padding:9px 11px 7px;border-radius:12px;background:rgba(9,14,20,.42);border:1px solid rgba(124,138,147,.15);
  backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);pointer-events:none;}
#minimap svg{display:block;width:100%;height:auto;}
#minimap text{text-anchor:middle;font-family:var(--font-mono);font-size:7px;letter-spacing:.05em;fill:var(--snow-dim);}
#minimap .mm-stop circle{fill:var(--schist);}
#minimap .mm-pass circle{fill:var(--live);filter:drop-shadow(0 0 3px var(--live));}
#minimap .mm-icon{font-size:9px;}
#minimap-ember{fill:var(--ember-hot);filter:drop-shadow(0 0 4px var(--ember));}
.mm-title{display:block;text-align:center;font-family:var(--font-mono);font-size:7.5px;letter-spacing:.2em;
  text-transform:uppercase;color:var(--schist);margin:3px 0 0;}
.mm-timeline{list-style:none;margin:8px 0 0;padding:8px 1px 0;border-top:1px solid rgba(124,138,147,.14);}
.mm-timeline li{display:flex;gap:8px;align-items:baseline;padding:2.5px 0;font-family:var(--font-mono);
  font-size:8.5px;letter-spacing:.03em;color:var(--snow-dim);}
.mm-timeline .t-date{flex:0 0 28px;opacity:.7;}
.mm-timeline .t-launch .t-date,.mm-timeline .t-launch .t-leg{color:var(--ember);}
@media (max-width:680px){#minimap{display:none;}}

/* ── ambient particle canvas ── */
#ambient{position:fixed;inset:0;z-index:8;pointer-events:none;}

@keyframes livepulse{0%,100%{opacity:1;}50%{opacity:.45;}}
@keyframes emberbeat{0%,100%{box-shadow:0 0 8px var(--ember),0 0 18px rgba(242,180,94,.4);}
  50%{box-shadow:0 0 16px var(--ember-hot),0 0 34px rgba(242,180,94,.6);}}
@keyframes twinkle{0%,100%{opacity:calc(var(--star-a) * 1);}50%{opacity:calc(var(--star-a) * .7);}}
@keyframes fogdrift{0%,100%{transform:translate(0,0);}50%{transform:translate(3%,-2%);}}
@media (prefers-reduced-motion: reduce){
  .live-dot,#ember,#starfield,#fog{animation:none;}
  [data-reveal]{transition:opacity .4s linear;transform:none;}
}
`;

// A persistent minimap of the whole passage — Brisbane → Sydney → Santiago → the crossing → the snow.
// The ember rides the crossing portion as you scroll (positioned by minimap.ts).
function renderMinimap(): string {
  const tl: [string, string, boolean][] = [
    ['4 Jul', 'QF527 · BNE→SYD', false],
    ['4 Jul', 'Sydney · overnight', false],
    ['5 Jul', 'QF27 → the launch', true],
  ];
  return `<aside id="minimap" aria-hidden="true">
  <svg viewBox="0 0 220 96" width="100%" height="100%">
    <path id="mm-route" d="M18,72 L40,76 C74,40 116,26 150,44 C166,53 182,42 200,78" fill="none"
      stroke="rgba(124,138,147,.38)" stroke-width="1.2" stroke-dasharray="3 3.5" stroke-linecap="round"/>
    <text class="mm-icon" x="92" y="30">✈</text>
    <text class="mm-icon" x="176" y="54">⛵</text>
    <g class="mm-stop"><circle cx="18" cy="72" r="2.3"/><text x="18" y="86">BNE</text></g>
    <g class="mm-stop"><circle cx="40" cy="76" r="2.3"/><text x="46" y="90">SYD</text></g>
    <g class="mm-stop mm-pass"><circle cx="150" cy="44" r="2.7"/><text x="150" y="34">SCL</text></g>
    <g class="mm-stop"><circle cx="200" cy="78" r="2.3"/><text x="198" y="92">ski</text></g>
    <circle id="minimap-ember" cx="150" cy="44" r="3.2"/>
  </svg>
  <span class="mm-title">the passage</span>
  <ol class="mm-timeline">${tl
    .map(([d, l, launch]) => `<li class="${launch ? 't-launch' : ''}"><span class="t-date">${esc(d)}</span><span class="t-leg">${esc(l)}</span></li>`)
    .join('')}</ol>
</aside>`;
}

export function renderShell(env: Env): string {
  return `<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>il varo — The Crossing</title>
<meta name="description" content="A maiden voyage — a family's winter crossing of the Andes by water. The launch.">
<meta name="theme-color" content="#04060A">
<meta property="og:title" content="il varo — The Crossing">
<meta property="og:description" content="The launch. A hull meeting water for the first time, and the held breath before the first note.">
<meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..700&family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Instrument+Serif:ital@0;1&family=Outfit:wght@300..600&display=swap" rel="stylesheet">
<link rel="preload" as="image" href="/img/coldopen-1280.avif" type="image/avif" fetchpriority="high">
<style>${CSS}</style>
</head>
<body data-depart="${esc(env.DEPART_ISO)}">
<div id="sky"></div>
<div id="stage"></div>
<div id="scrim"></div>
<div id="warmth"></div>
<canvas id="mist"></canvas>
<div id="fog"></div>
<div id="horizon"></div>
<div id="grain"></div>
<div id="vignette"></div>
<div id="hush"></div>

<nav id="rail" aria-hidden="true">
  <span class="line"></span>
  ${NODES.map((top, i) => `<span class="node${i === 4 ? ' frias' : ''}${i === NODES.length - 1 ? ' last' : ''}" style="top:${top}%"></span>`).join('')}
  <span id="ember"></span>
  <span id="ember-berth"></span>
</nav>

<header class="chrome">
  <span>Il Varo · The Crossing</span>
  <span><button class="chrome-btn" data-toggle-sound type="button">Sound</button> <button class="chrome-btn" data-open-bridge type="button">Bridge</button></span>
</header>

<main id="voyage">
${LEGS.map(renderLeg).join('\n')}
</main>

<p class="readout"><b data-readout-leg>Cold open</b> · QF527 T− <span data-readout-countdown>—</span></p>
${renderMinimap()}
<div id="bridge-root"></div>
<script type="module" src="/assets/engine.js"></script>
<script type="module" src="/assets/bridge.js"></script>
</body>
</html>`;
}
