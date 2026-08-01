import type { Env } from './env';
import { NORTH_LEG_PLACES } from './north-places';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The North — the second launch, recomposed to explain the WHY. Same voyage grammar as the Andes
 * shell (server-rendered legs, ember rail, minimap, one scroll scalar) with a cold palette under
 * the SAME token names, so the shared engine modules and bridge.css read identically.
 *
 * Narrative structure:
 *   Act I   — the pivot (Portillo buried; the ember turns north)
 *   Act II  — the fixed spine (Saigon / Singapore / QF1; the two immovable dates)
 *   Act III — the logic (the crowd curve: loud south, empty north, the Sat-22 exhale)
 *   Act IV  — the options as consequences (both worlds / cool / warm → the bridge)
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
  chart?: boolean;
  cta?: boolean;
  ctaLabel?: string;
}

const LEGS: Leg[] = [
  // ── Act I — the pivot ──
  {
    n: '0', label: 'Cold open',
    eyebrow: 'a second launch · winter · the long way north',
    head: 'il varo', headClass: 'hero',
    hand: 'Every voyage has a reason. This one begins with five metres of snow — and ends with a choice. This page is the <span class="ember-word">why</span>; the bridge is the chooser.',
    telemetry: 'QF · BNE → SYD · SAT 8 AUG · T− <span data-countdown>—</span><br><span class="syd-note">then QF1 · the A380 · SYD → SIN, and on</span>',
  },
  {
    n: '01', label: 'Portillo, Chile',
    eyebrow: '01 · Portillo, Chile — the door that closed',
    head: 'One storm put five metres on the pass, and the winter said no.',
    hand: 'The original crossing was Chilean — Portillo, the wine country, the Lakes. Then a single storm buried the pass, and the road over the Andes has been shut since the 14th of July. The trip died where it stood. The <span class="ember-word">ember</span> slipped its mooring, and turned north.',
    telemetry: '32.84°S 70.13°W · 5 M IN ONE STORM · ROAD CLOSED SINCE 14 JUL',
  },
  // ── Act II — the fixed spine ──
  {
    n: '02', label: 'Saigon, Vietnam',
    eyebrow: '02 · the spine, part one — Sài Gòn',
    head: 'The spine is fixed, and it starts with a conference.',
    telemetry: '10.78°N 106.70°E · CONNECT 2026 · MON 10 – WED 12 AUG · GALA WED NIGHT',
    live: 'SAIGON · 32°C · MONSOON HAZE · LANTERNS AT DUSK',
    hand: 'Three days at the Sheraton among four hundred planners, gala on the Wednesday night. The conference is the cover story; after it, the voyage owes nobody anything.',
  },
  {
    n: '03', label: 'Singapore',
    eyebrow: '03 · the spine, part two — the quiet exit',
    head: 'Thursday morning out while the hall empties, and Raffles by evening.',
    telemetry: 'THU 13 AUG · SGN → SIN · ONE NIGHT AT RAFFLES',
  },
  {
    n: '04', label: 'QF1 · SIN → LHR',
    eyebrow: '04 · the spine, part three — the night leg',
    head: 'Fourteen hours of dark over two continents, and London before breakfast.',
    telemetry: 'FIRST LOUNGE T1 · DEP LATE FRI 14 · LHR SAT 15 AUG 06:25',
    hand: 'Wake in Singapore. Board unhurried. Nothing behind you.',
  },
  {
    n: '05', label: 'London',
    eyebrow: '05 · the frame — two immovable dates',
    head: 'Saturday the 15th in, Monday the 31st out. Sixteen nights. The middle entirely open.',
    hand: 'QF1 lands at dawn on the 15th of August; QF2 leaves on the 31st. Those two dates are the whole contract — kind, non-negotiable, and silent on everything between. Sixteen nights in Europe, and the only question is how to spend them.',
    telemetry: 'LHR IN · SAT 15 AUG 06:25 — LHR OUT · MON 31 AUG · 16 NIGHTS BETWEEN',
  },
  // ── Act III — the logic ──
  {
    n: '06', label: 'The Med · 15–22 Aug',
    eyebrow: '06 · the logic, part one — where Europe is',
    head: 'Week one is the loudest week of the European year in the warm south.',
    hand: 'Ferragosto falls on the 15th — the day we land. Italy, France, Croatia and Greece hit their annual maximum: every beach club full, every table booked, every price at its peak. The south in week one is glorious, and it knows it.',
    telemetry: 'FERRAGOSTO FRI 15 AUG · ITALY FRANCE CROATIA GREECE AT MAX',
  },
  {
    n: '07', label: 'Arctic Norway',
    eyebrow: '07 · the logic, part two — where Europe isn’t',
    head: 'The north, meanwhile, stands empty.', headClass: 'cut',
    hand: 'Norwegian schools go back around the 17th, and the fjords fall quiet — same week, same continent, harbours and mountain tables to ourselves. And past midnight, past the weather, the sky goes <span class="ember-word">green</span>.',
    telemetry: '— SCHOOLS BACK ~MON 17 AUG · THE QUIET WEEK · AURORA WINDOW OPENS —',
    tall: true,
  },
  {
    n: '08', label: 'Saturday 22 August',
    eyebrow: '08 · the logic, resolved — the crowd curve',
    head: 'On Saturday the 22nd, Europe goes back to work — and the Med exhales.',
    chart: true,
    hand: 'Two lines cross the fortnight. The south holds its peak through the 22nd, then falls away — crowds gone home, prices down 20 to 40 per cent. The north sits quiet from the 17th. So the shape of a smart sixteen nights writes itself: the cool half first, the warm half after the <span class="ember-word">exhale</span> — or a single world, chosen knowing the tradeoff.',
    telemetry: 'SOUTH −20–40% AFTER SAT 22 · NORTH QUIET FROM MON 17',
  },
  // ── Act IV — the options as consequences ──
  {
    n: '09', label: 'Both worlds · 5 routes',
    eyebrow: '09 · the consequence — both worlds',
    head: 'Five routes play the curve straight: cool first, then south on the exhale.',
    hand: 'Norway then Sardinia, Scotland then Greece, the fjords then the Adriatic. A cool, empty week while the Med is at maximum — then the warm water as it empties and the prices drop. The logic’s first choice.',
    cta: true, ctaLabel: 'Compare the five →',
  },
  {
    n: '10', label: 'The cool north · 4 routes',
    eyebrow: '10 · the consequence — all-cool',
    head: 'Four routes stay north for the whole sixteen nights.',
    hand: 'Norway, the Highlands, the long fjords. Empty from the first morning to the last, with weather the only gamble — they give up the warm water entirely, and dodge the crowds entirely in return.',
    cta: true, ctaLabel: 'Compare the four →',
  },
  {
    n: '11', label: 'The warm south · 7 routes',
    eyebrow: '11 · the consequence — all-warm',
    head: 'Seven routes go straight to the warm water — eyes open.',
    hand: 'Sicily, the Cyclades, Sardinia, the gulets, the yacht weeks. Week one lands in the loudest days of the European year; the second week is the reward. The curve doesn’t forbid it — it just names the price.',
    cta: true, ctaLabel: 'Compare the seven →',
  },
  {
    n: '12', label: 'The bridge',
    eyebrow: '12 · the bridge',
    head: 'Sixteen routes, two price tiers, a case and a counter for each.',
    hand: 'The why is behind you. Now plot where she sails.',
    cta: true,
  },
];

// The crowd curve — hand-authored inline SVG, same idiom as the minimap. Decorative (aria-hidden);
// the leg copy carries the same argument in text. x: 15→31 Aug (x = 40 + (day−15) × 31.25).
const CROWD_CURVE = `<figure class="curve" aria-hidden="true">
  <svg viewBox="0 0 560 240">
    <rect x="40" y="26" width="500" height="182" fill="rgba(237,243,248,.03)"/>
    <text x="540" y="18" text-anchor="end" class="c-faint">THE 16 NIGHTS · SAT 15 → MON 31</text>
    <line x1="40" y1="208" x2="540" y2="208" stroke="rgba(174,189,203,.35)" stroke-width="1"/>
    <line x1="102" y1="208" x2="102" y2="212" stroke="rgba(174,189,203,.35)" stroke-width="1"/>
    <line x1="259" y1="208" x2="259" y2="212" stroke="rgba(174,189,203,.35)" stroke-width="1"/>
    <path d="M40,58 L120,55 L200,57 L259,60 C282,80 316,140 356,166 C398,186 470,192 540,194"
      fill="none" stroke="var(--snow-dim)" stroke-width="1.8" stroke-linecap="round" opacity=".85"/>
    <path d="M40,148 L84,152 L102,172 C122,192 158,199 200,201 L540,204"
      fill="none" stroke="var(--live)" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="259" y1="30" x2="259" y2="208" stroke="var(--ember)" stroke-width="1.2" stroke-dasharray="2 3"/>
    <text x="56" y="44">THE SOUTH · CROWDS &amp; PRICES</text>
    <text x="330" y="126">−20–40%</text>
    <text x="330" y="192" class="c-live">THE NORTH · QUIET FROM THE 17TH</text>
    <text x="266" y="40" class="c-ember">SAT 22 · THE EXHALE</text>
    <text x="40" y="226">15 AUG</text>
    <text x="102" y="226" text-anchor="middle">17</text>
    <text x="259" y="226" text-anchor="middle" class="c-ember">SAT 22</text>
    <text x="540" y="226" text-anchor="end">31 AUG</text>
  </svg>
  <figcaption>the crowd curve · europe, 15–31 aug</figcaption>
</figure>`;

function renderLeg(leg: Leg): string {
  const headTag = leg.headClass === 'hero' ? 'h1' : 'h2';
  return `<section class="leg${leg.tall ? ' leg--tall' : ''}" data-leg="${esc(leg.n)}" data-img="${esc(LEG_IMG[leg.n] ?? '')}" data-screen-label="${esc(leg.label)}">
  <div class="leg-inner" data-reveal>
    <p class="eyebrow">${esc(leg.eyebrow)}</p>
    <${headTag} class="head ${leg.headClass ?? ''}">${esc(leg.head)}</${headTag}>
    ${leg.hand ? `<p class="hand">${leg.hand}</p>` : ''}
    ${leg.chart ? CROWD_CURVE : ''}
    ${leg.telemetry ? `<p class="telemetry">${leg.telemetry}</p>` : ''}
    ${leg.live ? `<p class="live-pill"><span class="live-dot"></span>${esc(leg.live)}</p>` : ''}
    ${leg.n === '0' ? `<p class="scrollhint">scroll to sail · the why unfolds as you go</p>` : ''}
    ${leg.cta ? `<button class="bridge-open" data-open-bridge type="button">${esc(leg.ctaLabel ?? 'Open the bridge →')}</button>` : ''}
    ${NORTH_LEG_PLACES[leg.n] ? `<a class="place" href="${esc(NORTH_LEG_PLACES[leg.n].url)}" target="_blank" rel="noopener">${esc(NORTH_LEG_PLACES[leg.n].kind)} · ${esc(NORTH_LEG_PLACES[leg.n].name)} ↗</a>` : ''}
  </div>
</section>`;
}

// 8 ember-rail nodes from 10%→95% height; the glowing node sits at the empty-north watch (p≈0.58),
// the last is the amber berth.
const NODES = [10, 22, 34, 46, 58, 70, 82, 95];
const AURORA_NODE = 4; // the Arctic quiet-week leg (~58% of the scroll)

// leg id → image slug (web/public/img/<slug>-{1280,1920}.{avif,webp}). The image stage reads
// data-img; every leg carries a slug so the stage's leg↔frame indexing stays 1:1.
// 'pass' is the buried Andes pass from the Chile set — deliberately reused for the pivot leg.
const LEG_IMG: Record<string, string> = {
  '0': 'n-coldopen', '01': 'pass', '02': 'n-saigon', '03': 'n-raffles', '04': 'n-nightleg',
  '05': 'n-london', '06': 'arc-cyclades', '07': 'n-aurora', '08': 'arc-sardinia',
  '09': 'combo-norsard', '10': 'n-geiranger', '11': 'arc-sicily', '12': 'n-bridge',
};

const CSS = `
:root{
  --void:#040810; --slate:#0A1322; --schist:#7E8EA0; --snow:#EDF3F8; --snow-dim:#AEBDCB;
  --emerald:#2FA98C; --emerald-deep:#1D7361; --turquoise:#5BC8DE; --turquoise-deep:#2F7E92;
  --ember:#F2B45E; --ember-hot:#FFD089; --ember-deep:#C98438; --live:#8BE8C0; --live-deep:#4FBE92;
  --font-display:'Fraunces',Georgia,serif;
  --font-mono:'IBM Plex Mono',ui-monospace,monospace;
  --font-hand:'Instrument Serif',Georgia,serif;
  --font-body:'Outfit',system-ui,-apple-system,sans-serif;
  --p:0; --dawn:0; --quiet:0;
  --sky-top:#1A1410; --sky-mid:#140F12; --sky-bot:#101018; --horizon:#3A2A24;
  --horizon-a:.12; --star-a:0; --fog-a:.5; --green-a:0;
}
*{box-sizing:border-box;}
html{-webkit-text-size-adjust:100%;}
body{margin:0;background:var(--void);color:var(--snow);font-family:var(--font-body);font-weight:300;
  line-height:1.65;-webkit-font-smoothing:antialiased;overflow-x:hidden;}

/* ── persistent atmosphere (fixed, behind content) ── */
#sky{position:fixed;inset:0;z-index:0;
  background:linear-gradient(180deg,var(--sky-top) 0%,var(--sky-mid) 52%,var(--sky-bot) 100%);}
/* the cinematic image stage — real location photos. The grade is keyed to the Arctic hush, not
   latitude: warm at the open, darkest at the empty-north watch, warm again as the voyage turns south. */
#stage{position:fixed;inset:0;z-index:1;overflow:hidden;
  filter:saturate(calc(1.02 - .35*var(--quiet))) brightness(calc(.96 - .3*var(--quiet))) contrast(1.06);}
#stage .frame{position:absolute;inset:-5%;background-size:cover;background-position:center;
  will-change:opacity,transform;transform:scale(1.05);}
/* warm equatorial grade at the open (multiply warms any frame), fading as the north takes over */
#scrim{position:fixed;inset:0;z-index:2;pointer-events:none;mix-blend-mode:multiply;
  background:linear-gradient(180deg, #2a1c14 0%, #1d1512 58%, #141019 100%);
  opacity:calc(.42 - .42*var(--dawn));}
/* the aurora wash — rides the hush bell, peaking exactly at the Arctic watch */
#aurora{position:fixed;inset:0;z-index:2;pointer-events:none;mix-blend-mode:screen;
  background:radial-gradient(130% 70% at 50% 0%, rgba(111,227,176,.5), transparent 62%);
  opacity:calc(var(--quiet)*.6);}
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
  background:radial-gradient(120% 90% at 50% 46%, transparent 30%, rgba(2,5,8,.7));}

/* ── the ember rail (the throughline) ── */
#rail{position:fixed;left:0;top:0;bottom:0;width:clamp(48px,7vw,72px);z-index:30;pointer-events:none;}
#rail .line{position:absolute;left:50%;top:10%;height:85%;width:1px;transform:translateX(-.5px);
  background:linear-gradient(180deg,transparent,rgba(126,142,160,.32) 12%,rgba(126,142,160,.32) 88%,transparent);}
#rail .node{position:absolute;left:50%;width:7px;height:7px;border-radius:50%;background:var(--schist);
  transform:translate(-50%,-50%);opacity:.7;}
#rail .node.lights{background:var(--live);box-shadow:0 0 8px var(--live);}
#rail .node.last{width:13px;height:13px;background:transparent;border:1.5px solid var(--ember);opacity:.5;}
#ember{position:absolute;left:50%;top:calc(10% + var(--p) * 85%);width:7px;height:7px;border-radius:50%;
  transform:translate(-50%,-50%);background:radial-gradient(circle,var(--ember-hot),var(--ember) 60%,var(--ember-deep));
  animation:emberbeat 3.6s ease-in-out infinite;}
#ember-berth{position:absolute;left:50%;top:95%;width:48px;height:48px;border-radius:50%;
  border:1px solid var(--ember);transform:translate(-50%,-50%);box-shadow:0 0 26px rgba(242,180,94,.4);
  opacity:clamp(0, (var(--p) - 0.93) * 14, 1);}

/* ── voyage content ── */
#voyage{position:relative;z-index:10;}
.leg{position:relative;min-height:100vh;display:flex;align-items:center;padding:clamp(24px,7vw,96px);
  padding-left:clamp(64px,10vw,128px);}
.leg::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;
  background:linear-gradient(90deg, rgba(4,8,16,.62), rgba(4,8,16,.16) 46%, transparent 72%);}
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
  color:var(--snow-dim);text-decoration:none;border-bottom:1px solid rgba(126,142,160,.3);padding-bottom:2px;transition:.16s;}
.place:hover{color:var(--ember-hot);border-color:var(--ember);}
.live-pill{display:inline-flex;align-items:center;gap:9px;font-family:var(--font-mono);font-size:11px;
  letter-spacing:.08em;color:var(--live);border:1px solid rgba(139,232,192,.25);border-radius:999px;
  padding:7px 13px;margin:16px 0 0;}
.live-dot{width:7px;height:7px;border-radius:50%;background:var(--live);box-shadow:0 0 8px var(--live);
  animation:livepulse 2.4s ease-in-out infinite;}
.scrollhint{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.24em;text-transform:uppercase;
  color:var(--schist);margin-top:42px;}
.bridge-open{margin-top:28px;font-family:var(--font-mono);font-size:13px;letter-spacing:.06em;
  color:var(--ember-hot);background:rgba(242,180,94,.10);border:1px solid var(--ember);border-radius:8px;
  padding:11px 18px;cursor:pointer;transition:background .18s;}
.bridge-open:hover{background:rgba(242,180,94,.18);}

/* ── the crowd curve (hand-authored SVG, minimap idiom) ── */
.curve{margin:30px 0 0;max-width:560px;padding:16px 14px 8px;border:1px solid rgba(126,142,160,.18);
  border-radius:12px;background:rgba(8,13,22,.44);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}
.curve svg{display:block;width:100%;height:auto;}
.curve text{font-family:var(--font-mono);font-size:9.5px;letter-spacing:.08em;fill:var(--snow-dim);}
.curve .c-ember{fill:var(--ember);}
.curve .c-live{fill:var(--live);}
.curve .c-faint{fill:var(--schist);}
.curve figcaption{font-family:var(--font-mono);font-size:9px;letter-spacing:.2em;text-transform:uppercase;
  color:var(--schist);text-align:center;margin:8px 0 4px;}

/* ── chrome + readout ── */
.chrome{position:fixed;left:0;right:0;top:0;z-index:40;display:flex;justify-content:space-between;
  align-items:center;padding:16px clamp(16px,4vw,32px);font-family:var(--font-mono);font-size:11px;
  letter-spacing:.2em;text-transform:uppercase;color:var(--snow-dim);
  backdrop-filter:blur(8px);background:linear-gradient(180deg,rgba(4,8,16,.5),transparent);}
.chrome a{color:inherit;text-decoration:none;}
.chrome a:hover{color:var(--snow);}
.chrome-btn{font:inherit;letter-spacing:inherit;text-transform:inherit;color:var(--snow);background:rgba(237,243,248,.06);
  border:1px solid rgba(126,142,160,.3);border-radius:7px;padding:6px 12px;cursor:pointer;transition:.16s;}
.chrome-btn:hover{background:rgba(237,243,248,.12);}
.readout{position:fixed;left:clamp(16px,4vw,32px);bottom:18px;z-index:40;font-family:var(--font-mono);
  font-size:11px;letter-spacing:.14em;color:var(--snow-dim);}
.readout b{color:var(--snow);font-weight:500;}

/* ── the passage minimap (fixed, bottom-right) ── */
#minimap{position:fixed;right:clamp(14px,3vw,30px);bottom:46px;z-index:40;width:clamp(172px,19vw,224px);
  padding:9px 11px 7px;border-radius:12px;background:rgba(8,13,22,.42);border:1px solid rgba(126,142,160,.15);
  backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);pointer-events:none;}
#minimap svg{display:block;width:100%;height:auto;}
#minimap text{text-anchor:middle;font-family:var(--font-mono);font-size:7px;letter-spacing:.05em;fill:var(--snow-dim);}
#minimap .mm-stop circle{fill:var(--schist);}
#minimap .mm-pass circle{fill:var(--live);filter:drop-shadow(0 0 3px var(--live));}
#minimap .mm-icon{font-size:9px;}
#minimap-ember{fill:var(--ember-hot);filter:drop-shadow(0 0 4px var(--ember));}
.mm-title{display:block;text-align:center;font-family:var(--font-mono);font-size:7.5px;letter-spacing:.2em;
  text-transform:uppercase;color:var(--schist);margin:3px 0 0;}
.mm-timeline{list-style:none;margin:8px 0 0;padding:8px 1px 0;border-top:1px solid rgba(126,142,160,.14);}
.mm-timeline li{display:flex;gap:8px;align-items:baseline;padding:2.5px 0;font-family:var(--font-mono);
  font-size:8.5px;letter-spacing:.03em;color:var(--snow-dim);}
.mm-timeline .t-date{flex:0 0 34px;opacity:.7;}
.mm-timeline .t-launch .t-date,.mm-timeline .t-launch .t-leg{color:var(--ember);}
@media (max-width:680px){#minimap{display:none;}}

@keyframes livepulse{0%,100%{opacity:1;}50%{opacity:.45;}}
@keyframes emberbeat{0%,100%{box-shadow:0 0 8px var(--ember),0 0 18px rgba(242,180,94,.4);}
  50%{box-shadow:0 0 16px var(--ember-hot),0 0 34px rgba(242,180,94,.6);}}
@keyframes fogdrift{0%,100%{transform:translate(0,0);}50%{transform:translate(3%,-2%);}}
@media (prefers-reduced-motion: reduce){
  .live-dot,#ember,#fog{animation:none;}
  [data-reveal]{transition:opacity .4s linear;transform:none;}
}
`;

// A persistent minimap of the whole passage — Brisbane → Saigon → Singapore → London → the Arctic,
// then south to the Adriatic as the Med exhales. The ember rides nearly all of it as you scroll.
function renderMinimap(): string {
  const tl: [string, string, boolean][] = [
    ['15–20', 'Lofoten · the quiet week', false],
    ['22 Aug', 'TOS → SPU · the exhale', true],
    ['31 Aug', 'QF2 · home by 2 Sep', false],
  ];
  return `<aside id="minimap" aria-hidden="true">
  <svg viewBox="0 0 220 96" width="100%" height="100%">
    <path id="mm-route" d="M16,82 C40,64 58,42 76,38 L90,26 L96,40 C120,52 142,58 164,44 C180,34 190,24 198,14 C206,26 212,42 214,58" fill="none"
      stroke="rgba(126,142,160,.38)" stroke-width="1.2" stroke-dasharray="3 3.5" stroke-linecap="round"/>
    <text class="mm-icon" x="58" y="34">✈</text>
    <text class="mm-icon" x="206" y="76">⛵</text>
    <g class="mm-stop"><circle cx="16" cy="82" r="2.3"/><text x="18" y="94">BNE</text></g>
    <g class="mm-stop"><circle cx="90" cy="26" r="2.3"/><text x="86" y="17">SGN</text></g>
    <g class="mm-stop"><circle cx="96" cy="40" r="2.3"/><text x="104" y="52">SIN</text></g>
    <g class="mm-stop"><circle cx="164" cy="44" r="2.3"/><text x="164" y="60">LHR</text></g>
    <g class="mm-stop mm-pass"><circle cx="198" cy="14" r="2.7"/><text x="192" y="8">TOS</text></g>
    <g class="mm-stop"><circle cx="214" cy="58" r="2.3"/><text x="208" y="70">SPU</text></g>
    <circle id="minimap-ember" cx="16" cy="82" r="3.2"/>
  </svg>
  <span class="mm-title">north, then south</span>
  <ol class="mm-timeline">${tl
    .map(([d, l, launch]) => `<li class="${launch ? 't-launch' : ''}"><span class="t-date">${esc(d)}</span><span class="t-leg">${esc(l)}</span></li>`)
    .join('')}</ol>
</aside>`;
}

export function renderNorth(env: Env): string {
  return `<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>il varo — The North</title>
<meta name="description" content="Why the ember turned north — the buried Andes pass, the fixed QF spine, the crowd curve of late August, and sixteen rival routes on the bridge.">
<meta name="theme-color" content="#040810">
<meta property="og:title" content="il varo — The North">
<meta property="og:description" content="The winter the Andes shut their door, the ember turned north. This is the why — the crowd curve, the exhale, and the sixteen routes it leaves open.">
<meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..700&family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Instrument+Serif:ital@0;1&family=Outfit:wght@300..600&display=swap" rel="stylesheet">
<link rel="preload" as="image" href="/img/n-coldopen-1280.avif" type="image/avif" fetchpriority="high">
<style>${CSS}</style>
</head>
<body data-depart="${esc(env.NORTH_DEPART_ISO ?? '')}">
<div id="sky"></div>
<div id="stage" aria-hidden="true"></div>
<div id="scrim"></div>
<div id="aurora"></div>
<canvas id="mist"></canvas>
<div id="fog"></div>
<div id="horizon"></div>
<div id="grain"></div>
<div id="vignette"></div>
<div id="hush"></div>

<nav id="rail" aria-hidden="true">
  <span class="line"></span>
  ${NODES.map((top, i) => `<span class="node${i === AURORA_NODE ? ' lights' : ''}${i === NODES.length - 1 ? ' last' : ''}" style="top:${top}%"></span>`).join('')}
  <span id="ember"></span>
  <span id="ember-berth"></span>
</nav>

<header class="chrome">
  <span>Il Varo · <a href="/">Two Worlds</a> · The North</span>
  <span><button class="chrome-btn" data-open-bridge type="button">Bridge</button></span>
</header>

<main id="voyage">
${LEGS.map(renderLeg).join('\n')}
</main>

<p class="readout"><b data-readout-leg>Cold open</b> · QF1 T− <span data-readout-countdown>—</span></p>
${renderMinimap()}
<div id="bridge-root"></div>
<script type="module" src="/assets/north-engine.js"></script>
<script type="module" src="/assets/north-bridge.js"></script>
</body>
</html>`;
}
