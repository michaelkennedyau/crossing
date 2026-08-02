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
  extra?: string;
  cta?: boolean;
  ctaLabel?: string;
}

const LEGS: Leg[] = [
  // ── Act I — the pivot ──
  {
    n: '0', label: 'Cold open',
    eyebrow: 'a second launch · winter · the long way north',
    head: 'il varo', headClass: 'hero',
    hand: 'Every voyage has a reason. This one begins with five metres of snow — and stays a <span class="ember-word">choice</span>, remade each morning by the weather. A refresh, not a pilgrimage.',
    telemetry: 'QF · BNE → SYD · SAT 8 AUG · T− <span data-countdown>—</span><br><span class="syd-note">then QF1 · the A380 · SYD → SIN, and on</span>',
  },
  {
    n: '01', label: 'Portillo, Chile',
    eyebrow: '01 · Portillo, Chile — the door that closed',
    head: 'One storm put five metres on the pass, and the winter said no.',
    hand: 'The original crossing was Chilean. A single storm buried it, and the road over the Andes has been shut since the 14th of July. The <span class="ember-word">ember</span> slipped its mooring, and turned north.',
    telemetry: '32.84°S 70.13°W · 5 M IN ONE STORM · ROAD CLOSED SINCE 14 JUL',
  },
  // ── Act II — the fixed spine ──
  {
    n: '02', label: 'Saigon, Vietnam',
    eyebrow: '02 · the spine — Sài Gòn',
    head: 'The spine is fixed, and it starts with a conference.',
    telemetry: '10.78°N 106.70°E · CONNECT 2026 · MON 10 – WED 12 AUG · GALA WED NIGHT',
    live: 'SAIGON · 32°C · MONSOON HAZE · LANTERNS AT DUSK',
  },
  {
    n: '03', label: 'Singapore',
    eyebrow: '03 · the spine — the quiet exit',
    head: 'Thursday morning out while the hall empties — and the London flight that same night.',
    telemetry: 'THU 13 AUG · SGN → SIN · QF1 DEP 23:20',
  },
  {
    n: '04', label: 'QF1 · SIN → LHR',
    eyebrow: '04 · the spine — the night leg',
    head: 'Fourteen hours of dark, and London before breakfast.',
    telemetry: 'FIRST LOUNGE T1 · DEP THU 13 · 23:20 · LHR FRI 14 AUG 06:35',
  },
  {
    n: '05', label: 'London',
    eyebrow: '05 · the frame — two immovable dates',
    head: 'Friday the 14th in, Wednesday the 2nd out. Nineteen nights, the middle entirely open.',
    telemetry: 'LHR IN · FRI 14 AUG 06:35 — LHR OUT · WED 2 SEP · 19 NIGHTS BETWEEN',
  },
  // ── The branch — the why in one chart, then choose ──
  {
    n: '06', label: 'The branch',
    eyebrow: '06 · the branch — the crowd curve, then choose',
    head: 'Week one the south is rammed and the north is empty; on Saturday the 22nd the Med exhales.',
    chart: true, tall: true,
    hand: 'That curve is the only strategy this trip needs — nothing is booked, nothing has to be. Ten years of Platinum and an Australian passport open every door below on a same-week booking. Check the sky, then choose.',
    extra: 'BRANCH', // replaced at render with the branch cards
  },
];

// The crowd curve — hand-authored inline SVG, same idiom as the minimap. Decorative (aria-hidden);
// the leg copy carries the same argument in text. x: 15→31 Aug (x = 40 + (day−15) × 31.25).
const CROWD_CURVE = `<figure class="curve" aria-hidden="true">
  <svg viewBox="0 0 560 240">
    <defs>
      <linearGradient id="cg-south" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(174,189,203,.20)"/><stop offset="1" stop-color="rgba(174,189,203,0)"/>
      </linearGradient>
      <linearGradient id="cg-north" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(139,232,192,.18)"/><stop offset="1" stop-color="rgba(139,232,192,0)"/>
      </linearGradient>
    </defs>
    <rect x="40" y="26" width="500" height="182" fill="rgba(237,243,248,.03)"/>
    <text x="540" y="18" text-anchor="end" class="c-faint">THE 19 NIGHTS · FRI 14 → WED 2 SEP</text>
    <line x1="40" y1="208" x2="540" y2="208" stroke="rgba(174,189,203,.35)" stroke-width="1"/>
    <line x1="102" y1="208" x2="102" y2="212" stroke="rgba(174,189,203,.35)" stroke-width="1"/>
    <line x1="259" y1="208" x2="259" y2="212" stroke="rgba(174,189,203,.35)" stroke-width="1"/>
    <path class="c-area" fill="url(#cg-south)"
      d="M40,58 L120,55 L200,57 L259,60 C282,80 316,140 356,166 C398,186 470,192 540,194 L540,208 L40,208 Z"/>
    <path class="c-area" fill="url(#cg-north)"
      d="M40,148 L84,152 L102,172 C122,192 158,199 200,201 L540,204 L540,208 L40,208 Z"/>
    <path class="c-draw" pathLength="1" d="M40,58 L120,55 L200,57 L259,60 C282,80 316,140 356,166 C398,186 470,192 540,194"
      fill="none" stroke="var(--snow-dim)" stroke-width="1.8" stroke-linecap="round" opacity=".85"/>
    <path class="c-draw" pathLength="1" d="M40,148 L84,152 L102,172 C122,192 158,199 200,201 L540,204"
      fill="none" stroke="var(--live)" stroke-width="1.8" stroke-linecap="round"/>
    <line class="c-exhale" x1="259" y1="30" x2="259" y2="208" stroke="var(--ember)" stroke-width="1.2" stroke-dasharray="2 3"/>
    <text x="56" y="44">THE SOUTH · CROWDS &amp; PRICES</text>
    <text x="330" y="126">−20–40%</text>
    <text x="330" y="192" class="c-live">THE NORTH · QUIET FROM THE 17TH</text>
    <text x="266" y="40" class="c-ember">SAT 22 · THE EXHALE</text>
    <text x="40" y="226">14 AUG</text>
    <text x="102" y="226" text-anchor="middle">17</text>
    <text x="259" y="226" text-anchor="middle" class="c-ember">SAT 22</text>
    <text x="540" y="226" text-anchor="end">2 SEP</text>
  </svg>
  <figcaption>the crowd curve · europe, 15–31 aug</figcaption>
</figure>`;

// The live curve mounts empty; the north-engine island fills it with today's actual sky —
// six days of max temps from today forward across five board nodes. Empty stays invisible.
const LIVE_CURVE = `<figure class="curve curve--live" id="live-curve">
  <figcaption>the live sky · six days from today · re-anchors daily</figcaption>
</figure>`;


// ── The branch — two named routes with mini route-maps, plus the full board. Static SSR links
// (the bridge opens and decodes #arc=…); the tier chips are a light progressive enhancement. ──
function renderBranch(): string {
  return `<div class="branch">
  <div class="tier-chips" role="group" aria-label="Room tier" style="--i:0">
    <button type="button" class="chip on" data-tier="special">the good rooms</button>
    <button type="button" class="chip" data-tier="sane">the sane rooms</button>
  </div>

  <a class="bcard rec" data-open-bridge data-arc-link href="#arc=slovcroatia:special:2.4.2.7.4"
    style="--i:1;--bimg:url('/img/arc-slovenia-1280.webp')">
    <svg class="bmap" viewBox="0 0 140 84" aria-hidden="true">
      <path d="M14,22 C36,20 54,26 64,32 L56,48 C66,56 76,60 86,64 L112,72" fill="none"
        stroke="rgba(174,189,203,.45)" stroke-width="1.2" stroke-dasharray="3 3" stroke-linecap="round"/>
      <circle cx="14" cy="22" r="2.4" fill="var(--schist)"/><text x="14" y="14">LHR</text>
      <circle cx="64" cy="32" r="2.4" fill="var(--live)"/><text x="66" y="24">BLED</text>
      <circle cx="56" cy="48" r="2.4" fill="var(--live)"/><text x="40" y="52">SOČA</text>
      <circle cx="86" cy="64" r="2.4" fill="var(--ember)"/><text x="86" y="78">SPLIT</text>
      <circle cx="112" cy="72" r="2.4" fill="var(--ember)"/><text x="120" y="64">HVAR</text>
    </svg>
    <span class="bt">
      <em class="btag">◆ recommended</em>
      <b>Slovenia + Croatia</b>
      <i>Lakes and Hiša Franko in the quiet week, one road south, the gulet on the exhale — no mid-trip flights.</i>
      <u><span data-price-special>$42,500</span><span data-price-sane hidden>$23,600</span> · 19 nights · for two</u>
    </span>
  </a>

  <a class="bcard" data-open-bridge data-arc-link href="#arc=highlow:special:2.4.2.7.4"
    style="--i:2;--bimg:url('/img/n-aurora-1280.webp')">
    <svg class="bmap" viewBox="0 0 140 84" aria-hidden="true">
      <path d="M14,66 C34,46 48,24 66,14 L92,10 C104,28 112,48 118,68" fill="none"
        stroke="rgba(174,189,203,.45)" stroke-width="1.2" stroke-dasharray="3 3" stroke-linecap="round"/>
      <circle cx="14" cy="66" r="2.4" fill="var(--schist)"/><text x="14" y="80">LHR</text>
      <circle cx="66" cy="14" r="2.4" fill="var(--live)"/><text x="54" y="10">LOFOTEN</text>
      <circle cx="92" cy="10" r="2.4" fill="var(--live)"/><text x="104" y="10">TROMSØ</text>
      <circle cx="118" cy="68" r="2.4" fill="var(--ember)"/><text x="118" y="80">SPLIT</text>
    </svg>
    <span class="bt">
      <em class="btag btag--rival">the rival</em>
      <b>Norway + Croatia</b>
      <i>Lofoten and the aurora watch, then the flotilla south — the story arc, with a coin-flip sky.</i>
      <u><span data-price-special>$34,000</span><span data-price-sane hidden>$21,600</span> · 19 nights · for two</u>
    </span>
  </a>

  <button class="bcard ball" data-open-bridge type="button" style="--i:3">
    <span class="bt"><b>All sixteen routes →</b><i>Two price tiers, a case and a counter for each — the full board.</i></span>
  </button>
</div>`;
}

function renderLeg(leg: Leg): string {
  const headTag = leg.headClass === 'hero' ? 'h1' : 'h2';
  return `<section class="leg${leg.tall ? ' leg--tall' : ''}" data-leg="${esc(leg.n)}" data-img="${esc(LEG_IMG[leg.n] ?? '')}" data-screen-label="${esc(leg.label)}">
  <div class="leg-inner" data-reveal>
    <p class="eyebrow">${esc(leg.eyebrow)}</p>
    <${headTag} class="head ${leg.headClass ?? ''}">${esc(leg.head)}</${headTag}>
    ${leg.hand ? `<p class="hand">${leg.hand}</p>` : ''}
    ${leg.chart ? CROWD_CURVE + LIVE_CURVE : ''}
    ${leg.extra === 'BRANCH' ? renderBranch() : ''}
    ${leg.telemetry ? `<p class="telemetry">${leg.telemetry}</p>` : ''}
    ${leg.live ? `<p class="live-pill"><span class="live-dot"></span>${esc(leg.live)}</p>` : ''}
    ${leg.n === '0' ? `<p class="scrollhint">scroll to sail · the why unfolds as you go</p>` : ''}
    ${leg.cta ? `<button class="bridge-open" data-open-bridge type="button">${esc(leg.ctaLabel ?? 'Open the bridge →')}</button>` : ''}
    ${NORTH_LEG_PLACES[leg.n] ? `<a class="place" href="${esc(NORTH_LEG_PLACES[leg.n].url)}" target="_blank" rel="noopener">${esc(NORTH_LEG_PLACES[leg.n].kind)} · ${esc(NORTH_LEG_PLACES[leg.n].name)} ↗</a>` : ''}
  </div>
</section>`;
}

// 7 ember-rail nodes from 10%→95% height; the glowing node sits at the buried-pass pivot (~17%),
// the last is the amber berth.
const NODES = [10, 24, 38, 52, 66, 80, 95];
const AURORA_NODE = 1; // the Portillo hush

// leg id → image slug (web/public/img/<slug>-{1280,1920}.{avif,webp}). The image stage reads
// data-img; every leg carries a slug so the stage's leg↔frame indexing stays 1:1.
// 'pass' is the buried Andes pass from the Chile set — deliberately reused for the pivot leg.
const LEG_IMG: Record<string, string> = {
  '0': 'n-coldopen', '01': 'pass', '02': 'n-saigon', '03': 'n-raffles', '04': 'n-nightleg',
  '05': 'n-london', '06': 'n-bridge',
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
  /* fluid space scale — one rhythm for the narrative blocks */
  --s1:clamp(6px,.8vw,10px); --s2:clamp(12px,1.4vw,16px); --s3:clamp(18px,2.2vw,26px);
  --s4:clamp(26px,3.2vw,36px); --s5:clamp(38px,4.6vw,54px);
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
  background:radial-gradient(130% 70% at 50% 0%, rgba(140,180,220,.45), transparent 62%);
  opacity:calc(var(--quiet)*.4);}
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
  font-size:clamp(28px,4.8vw,50px);line-height:1.07;color:var(--snow);text-wrap:balance;}
.head.hero{font-size:clamp(64px,16vw,196px);line-height:.9;font-variation-settings:'opsz' 144;}
.head.cut{font-style:italic;font-size:clamp(44px,9vw,108px);}
.hand{font-family:var(--font-hand);font-style:italic;font-size:clamp(17px,2.3vw,23px);
  color:var(--snow-dim);line-height:1.55;margin:var(--s3) 0 0;max-width:44ch;text-wrap:pretty;}
.ember-word{color:var(--ember);font-style:italic;}
.telemetry{font-family:var(--font-mono);font-size:12px;letter-spacing:.12em;color:var(--snow-dim);margin:var(--s3) 0 0;}
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

/* ── the branch ── */
.branch{margin-top:var(--s3);display:grid;gap:11px;max-width:560px;}
.tier-chips{display:flex;gap:7px;margin-bottom:2px;}
.chip{font-family:var(--font-mono);font-size:11px;letter-spacing:.06em;color:var(--snow-dim);
  background:rgba(237,243,248,.05);border:1px solid rgba(126,142,160,.25);border-radius:999px;
  padding:7px 13px;cursor:pointer;transition:.14s;}
.chip.on{color:var(--ember-hot);border-color:var(--ember);background:rgba(242,180,94,.12);}
.bcard{position:relative;overflow:hidden;isolation:isolate;
  display:flex;gap:15px;align-items:center;text-align:left;text-decoration:none;color:var(--snow);
  background:rgba(8,13,22,.52);border:1px solid rgba(126,142,160,.22);border-radius:14px;
  padding:13px 16px;cursor:pointer;transition:.16s;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}
/* arc photography behind the route-map, under a left-to-right scrim — imagery-led like the Planner */
.bcard::after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;
  background-image:linear-gradient(90deg,rgba(8,13,22,.94) 34%,rgba(8,13,22,.3)),var(--bimg,none);
  background-size:cover;background-position:center;opacity:.55;transition:opacity .4s;}
.bcard:hover::after{opacity:.78;}
/* ember sweep along the top edge on hover */
.bcard::before{content:"";position:absolute;left:0;top:0;height:1px;width:0;z-index:1;
  background:linear-gradient(90deg,var(--ember),transparent);transition:width .5s ease;}
.bcard:hover::before{width:100%;}
.bcard:hover{border-color:rgba(126,142,160,.5);transform:translateY(-2px);}
/* staggered reveal — keyframed (not transitioned) so hover transforms stay snappy after */
[data-reveal] .tier-chips,[data-reveal] .bcard{opacity:0;}
[data-reveal].in .tier-chips,[data-reveal].in .bcard{
  animation:brise .9s cubic-bezier(.16,1,.3,1) both;animation-delay:calc(var(--i,0)*90ms + .1s);}
@keyframes brise{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:none;}}
.bcard.rec{border-color:var(--ember);box-shadow:0 0 0 1px var(--ember),0 8px 26px rgba(0,0,0,.3);}
.bcard .bmap{flex:0 0 128px;height:auto;}
.bcard .bmap text{font-family:var(--font-mono);font-size:7px;letter-spacing:.05em;fill:var(--snow-dim);}
.bcard .bt{display:grid;gap:3px;font-weight:300;}
.bcard .bt b{font-family:var(--font-mono);font-size:13px;font-weight:600;letter-spacing:.02em;}
.bcard .bt i{font-family:var(--font-hand);font-style:italic;font-size:13.5px;line-height:1.45;color:var(--snow-dim);}
.bcard .bt u{text-decoration:none;font-family:var(--font-mono);font-size:10.5px;color:var(--snow-dim);letter-spacing:.06em;}
.btag{font-style:normal;width:fit-content;font-family:var(--font-mono);font-size:9px;letter-spacing:.14em;
  text-transform:uppercase;color:#1A1205;background:var(--ember);border-radius:999px;padding:2.5px 8px;font-weight:600;}
.btag--rival{background:transparent;color:var(--live);border:1px solid rgba(139,232,192,.4);}
.bcard.ball{border-style:dashed;background:rgba(8,13,22,.3);font:inherit;}
@media (max-width:560px){.bcard{flex-direction:column;align-items:flex-start;}.bcard .bmap{flex-basis:auto;width:150px;}}
@media (prefers-reduced-motion: reduce){
  .bcard:hover{transform:none;}
  [data-reveal] .tier-chips,[data-reveal] .bcard{opacity:1;animation:none;}
  .bcard::before{transition:none;}
  .curve .c-draw{stroke-dasharray:none;stroke-dashoffset:0;transition:none;}
  .curve .c-area{opacity:1;transition:none;}
}

/* ── the crowd curve (hand-authored SVG, minimap idiom) ── */
.curve{margin:var(--s4) 0 0;max-width:560px;padding:16px 14px 8px;border:1px solid rgba(126,142,160,.18);
  border-radius:12px;background:rgba(8,13,22,.44);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}
.curve svg{display:block;width:100%;height:auto;}
.curve--live:not(:has(svg)){display:none;}
/* the two curves draw themselves in as the leg reveals; the areas breathe up after */
.curve .c-draw{stroke-dasharray:1;stroke-dashoffset:1;
  transition:stroke-dashoffset 1.8s cubic-bezier(.4,0,.2,1) .35s;}
[data-reveal].in .c-draw{stroke-dashoffset:0;}
.curve .c-area{opacity:0;transition:opacity 1.2s ease 1.4s;}
[data-reveal].in .c-area{opacity:1;}
.curve .c-exhale{filter:drop-shadow(0 0 4px rgba(242,180,94,.75));}
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

/* ── mobile passage bar — the minimap's small-screen stand-in, riding the same --p scalar ── */
#passbar{display:none;}
@media (max-width:680px){
  #passbar{display:block;position:fixed;left:0;right:0;bottom:0;height:2px;z-index:41;
    background:rgba(126,142,160,.18);}
  #passbar i{position:absolute;inset:0;background:linear-gradient(90deg,var(--ember-deep),var(--ember));
    transform-origin:0 50%;transform:scaleX(var(--p));}
}

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
    ['14 Aug', 'LHR · 19 open nights', false],
    ['22 Aug', 'the exhale · go south', true],
    ['2 Sep', 'QF2 · home 4 Sep', false],
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
<div id="passbar" aria-hidden="true"><i></i></div>
<div id="bridge-root"></div>
<script>
// branch tier chips — swap :special:/:sane: in the route links and the shown price. No framework;
// the links work without this script (they default to the good rooms).
document.addEventListener('click', function (e) {
  var chip = e.target && e.target.closest ? e.target.closest('.chip[data-tier]') : null;
  if (!chip) return;
  var tier = chip.getAttribute('data-tier');
  document.querySelectorAll('.chip[data-tier]').forEach(function (c) { c.classList.toggle('on', c === chip); });
  document.querySelectorAll('a[data-arc-link]').forEach(function (a) {
    a.setAttribute('href', a.getAttribute('href').replace(/:(special|sane):/, ':' + tier + ':'));
  });
  document.querySelectorAll('[data-price-special]').forEach(function (el) { el.hidden = tier !== 'special'; });
  document.querySelectorAll('[data-price-sane]').forEach(function (el) { el.hidden = tier !== 'sane'; });
});
</script>
<script type="module" src="/assets/north-engine.js"></script>
<script type="module" src="/assets/north-bridge.js"></script>
</body>
</html>`;
}
