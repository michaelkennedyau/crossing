/**
 * The Threshold — crossing.varo.au's landing. The Andes stand as a door between two worlds:
 * south to the deferred family crossing (preserved intact at /andes), north to the second
 * launch (/north). One ridgeline is the hinge; the ember sits in the doorway, undecided no more.
 * Static and self-contained: no JS islands, hover states only, complete before any asset loads.
 */
export function renderThreshold(): string {
  return `<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>il varo — two worlds</title>
<meta name="description" content="The Andes as a door. South, the family crossing, deferred. North, the second launch — for two.">
<meta name="theme-color" content="#04060A">
<meta property="og:title" content="il varo — two worlds">
<meta property="og:description" content="One warm light, two voyages. Choose a door.">
<meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..700&family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Instrument+Serif:ital@0;1&family=Outfit:wght@300..600&display=swap" rel="stylesheet">
<style>
:root{
  --void:#04060A; --snow:#E9F0F2; --snow-dim:#A9B8BE; --schist:#7C8A93;
  --ember:#F2B45E; --ember-hot:#FFD089;
  --emerald:#1FA37E; --turquoise:#37C9C2;
  --aurora:#6FE3B0; --ice:#BFE3F2; --polar:#0A1420;
  --font-display:'Fraunces',Georgia,serif;
  --font-mono:'IBM Plex Mono',ui-monospace,monospace;
  --font-hand:'Instrument Serif',Georgia,serif;
  --font-body:'Outfit',system-ui,-apple-system,sans-serif;
}
*{box-sizing:border-box;}
html,body{height:100%;}
body{margin:0;background:var(--void);color:var(--snow);font-family:var(--font-body);font-weight:300;
  -webkit-font-smoothing:antialiased;overflow:hidden;}

.worlds{position:fixed;inset:0;display:flex;}
.world{position:relative;flex:1 1 50%;display:flex;align-items:flex-end;text-decoration:none;color:inherit;
  padding:clamp(24px,5vw,64px);transition:flex-grow .9s cubic-bezier(.16,1,.3,1);overflow:hidden;}
.world:hover,.world:focus-visible{flex-grow:1.45;}
.world:focus-visible{outline:2px solid var(--ember);outline-offset:-6px;}

/* south — the Andes by water, warm ember dusk over emerald dark */
.world.south{background:
  radial-gradient(120% 90% at 70% 100%, rgba(242,180,94,.14), transparent 58%),
  radial-gradient(100% 80% at 30% 80%, rgba(31,163,126,.12), transparent 60%),
  linear-gradient(180deg,#04060A 0%,#071019 55%,#0B1826 100%);}
/* north — polar night, aurora over ice */
.world.north{background:
  radial-gradient(130% 70% at 50% 0%, rgba(111,227,176,.20), transparent 60%),
  radial-gradient(90% 70% at 70% 90%, rgba(191,227,242,.08), transparent 60%),
  linear-gradient(180deg,#040810 0%,#081120 55%,#0A1826 100%);}

/* the door — one ridgeline as the hinge between the worlds */
.ridge{position:absolute;top:0;bottom:0;left:50%;width:1px;z-index:3;pointer-events:none;
  background:linear-gradient(180deg,transparent,rgba(124,138,147,.5) 18%,rgba(124,138,147,.5) 82%,transparent);}
.ridge svg{position:absolute;left:50%;bottom:14vh;transform:translateX(-50%);width:clamp(280px,44vw,620px);
  height:auto;opacity:.9;}
.ridge .peak{fill:none;stroke:rgba(233,240,242,.35);stroke-width:1.1;}
.ridge .doorway{fill:none;stroke:var(--ember);stroke-width:1.2;opacity:.85;}
/* the ember in the doorway */
.ridge .door-ember{fill:var(--ember-hot);}
@keyframes emberbeat{0%,100%{opacity:.85;}50%{opacity:1;}}
.ridge .door-ember{animation:emberbeat 3.6s ease-in-out infinite;}

.w-inner{position:relative;z-index:2;max-width:34ch;}
.world.north .w-inner{margin-left:auto;text-align:right;}
.w-eyebrow{font-family:var(--font-mono);font-size:11px;font-weight:500;letter-spacing:.3em;
  text-transform:uppercase;color:var(--snow-dim);margin:0 0 14px;}
.w-head{font-family:var(--font-display);font-weight:300;letter-spacing:-.01em;margin:0;
  font-size:clamp(30px,4.6vw,58px);line-height:1.05;}
.w-hand{font-family:var(--font-hand);font-style:italic;font-size:clamp(15px,1.7vw,19px);
  color:var(--snow-dim);line-height:1.5;margin:14px 0 0;}
.w-go{display:inline-block;margin-top:22px;font-family:var(--font-mono);font-size:11.5px;letter-spacing:.14em;
  text-transform:uppercase;border-bottom:1px solid rgba(124,138,147,.4);padding-bottom:3px;transition:.16s;}
.world.south .w-go{color:var(--ember);}
.world.north .w-go{color:var(--aurora);}
.world:hover .w-go{border-color:currentColor;}
.w-state{font-family:var(--font-mono);font-size:10px;letter-spacing:.2em;text-transform:uppercase;
  color:var(--schist);margin:10px 0 0;}

.masthead{position:fixed;top:0;left:0;right:0;z-index:4;display:flex;justify-content:center;
  padding:22px;font-family:var(--font-mono);font-size:11px;letter-spacing:.3em;text-transform:uppercase;
  color:var(--snow-dim);pointer-events:none;}
.foot{position:fixed;bottom:12px;left:0;right:0;z-index:4;text-align:center;font-family:var(--font-mono);
  font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--schist);pointer-events:none;}

@media (max-width:720px){
  .worlds{flex-direction:column;}
  .world{align-items:center;}
  .world .w-inner,.world.north .w-inner{margin:0 auto;text-align:center;}
  .ridge{top:50%;bottom:auto;left:0;right:0;width:auto;height:1px;
    background:linear-gradient(90deg,transparent,rgba(124,138,147,.5) 18%,rgba(124,138,147,.5) 82%,transparent);}
  .ridge svg{display:none;}
}
@media (prefers-reduced-motion: reduce){
  .world{transition:none;}
  .ridge .door-ember{animation:none;}
}
</style>
</head>
<body>
<p class="masthead">il varo · two worlds · one warm light</p>

<div class="worlds">
  <a class="world south" href="/andes" aria-label="South — The Crossing, the Andes by water, all five, deferred">
    <div class="w-inner">
      <p class="w-eyebrow">South · 41°S</p>
      <h1 class="w-head">The Crossing</h1>
      <p class="w-hand">The Andes by water — all five, the lakes, the pass, the snow. The mountain closed its door this winter; the voyage keeps.</p>
      <span class="w-go">Enter the south →</span>
      <p class="w-state">Deferred · five metres at the pass</p>
    </div>
  </a>
  <a class="world north" href="/north" aria-label="North — The second launch, Saigon to the fjords, for two, August 2026">
    <div class="w-inner">
      <p class="w-eyebrow">68°N → 43°N</p>
      <h1 class="w-head">The North</h1>
      <p class="w-hand">The second launch — Saigon first, then nineteen open nights steered by the sky. Land, look up, decide. A refresh, not a pilgrimage.</p>
      <span class="w-go">← Enter the north</span>
      <p class="w-state">Underway · departs 8 August</p>
    </div>
  </a>
</div>

<div class="ridge" aria-hidden="true">
  <svg viewBox="0 0 600 150">
    <path class="peak" d="M0,132 L70,108 L120,120 L180,84 L232,104 L268,70 L286,88 L300,58 L314,88 L332,70 L368,104 L420,84 L480,120 L530,108 L600,132"/>
    <path class="doorway" d="M282,132 L282,96 Q300,74 318,96 L318,132"/>
    <circle class="door-ember" cx="300" cy="112" r="3.4"/>
  </svg>
</div>

<p class="foot">crossing.varo.au · a private voyage log</p>
</body>
</html>`;
}
