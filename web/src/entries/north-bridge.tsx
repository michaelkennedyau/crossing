import { createRoot } from 'react-dom/client';
import { NorthBridge } from '../north/bridge/NorthBridge';
import { initTheme } from '../north/theme';
import bridgeCss from '../bridge/bridge.css?inline';

/**
 * Day mode — scoped to the Bridge only. The voyage scroll is a night-world by design (the whole
 * atmosphere engine is a dark-sky instrument); the Bridge is where the numbers live, and numbers
 * deserve daylight. Tokens are remapped under [data-theme="light"], per the VARO theme contract
 * (data-theme attribute + localStorage + prefers-color-scheme default).
 */
const LIGHT_CSS = `
.presets--wrap{flex-wrap:wrap;}
.presets--wrap .preset{flex:0 0 auto;}
.chooser-bar{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:16px 0 2px;}
.seg--chips{flex-wrap:wrap;}
.seg--chips button{flex:0 0 auto;font-size:11px;padding:7px 11px;border-radius:999px;}
.arc-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(212px,1fr));gap:11px;margin:12px 0 6px;}
.arc-card{display:flex;flex-direction:column;padding:0;overflow:hidden;text-align:left;cursor:pointer;
  background:rgba(233,240,242,.04);border:1px solid rgba(124,138,147,.2);border-radius:12px;transition:.16s;}
.arc-card:hover{border-color:rgba(124,138,147,.45);transform:translateY(-2px);}
.arc-card.on{border-color:var(--ember);box-shadow:0 0 0 1px var(--ember),0 6px 22px rgba(0,0,0,.25);}
.arc-card .ai{position:relative;display:block;height:108px;background-size:cover;background-position:center;
  filter:saturate(.92);border-bottom:1px solid rgba(124,138,147,.14);}
.arc-card.on .ai{filter:none;}
.arc-card .am{position:absolute;left:8px;bottom:7px;font-style:normal;font-family:var(--font-mono);font-size:8.5px;
  letter-spacing:.12em;text-transform:uppercase;color:var(--snow);background:rgba(4,8,16,.55);
  border:1px solid rgba(233,240,242,.18);border-radius:999px;padding:3px 8px;backdrop-filter:blur(4px);}
.arc-card .ax{position:absolute;right:8px;top:7px;font-style:normal;font-family:var(--font-mono);font-size:9px;
  letter-spacing:.08em;color:#1A1205;background:var(--ember);border-radius:999px;padding:3px 8px;font-weight:600;}
.arc-card .an{font-family:var(--font-mono);font-size:12px;letter-spacing:.02em;color:var(--snow);padding:9px 11px 3px;}
.arc-card .aw{font-family:var(--font-hand);font-style:italic;font-size:12.5px;line-height:1.45;color:var(--snow-dim);
  padding:0 11px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
.arc-card .ac{font-family:var(--font-mono);font-size:10px;color:var(--snow-dim);padding:7px 11px 10px;margin-top:auto;}
.plan-anchor{scroll-margin-top:18px;}
/* the board */
.wb-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px;}
.wb-head .lever-label{margin:0;}
.wb-select{font-family:var(--font-mono);font-size:12px;color:var(--snow);background:rgba(9,14,20,.7);
  border:1px solid rgba(124,138,147,.3);border-radius:8px;padding:8px 10px;}
.wb-now{font-family:var(--font-mono);font-size:11px;color:var(--live);letter-spacing:.04em;}
.wb-rows{display:grid;gap:2px;}
.wb-row{display:grid;grid-template-columns:minmax(110px,1.2fr) minmax(90px,1fr) 74px minmax(84px,.9fr) minmax(140px,1.4fr);
  gap:10px;align-items:baseline;padding:8px 6px;border-bottom:1px solid rgba(124,138,147,.1);border-radius:6px;}
.wb-row.go{background:rgba(139,232,192,.05);}
.wb-place b{font-family:var(--font-mono);font-size:12.5px;font-weight:600;color:var(--snow);}
.wb-place i{display:block;font-style:normal;font-family:var(--font-mono);font-size:9px;letter-spacing:.1em;
  text-transform:uppercase;color:var(--schist);}
.wb-temp,.wb-hop{font-family:var(--font-mono);font-size:11px;color:var(--snow-dim);}
.wb-sun{font-family:var(--font-mono);font-size:11px;letter-spacing:2px;color:var(--ember);}
.wb-verdict{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.04em;}
.wb-verdict.go{color:var(--live);}
.wb-verdict.maybe{color:var(--ember);}
.wb-verdict.skip{color:var(--schist);}
@media (max-width:640px){.wb-row{grid-template-columns:1fr 1fr;} .wb-sun,.wb-hop{display:none;}}
[data-theme="light"] .bridge-overlay .wb-select{background:rgba(255,255,255,.9);}
[data-theme="light"] .bridge-overlay .wb-row.go{background:rgba(14,124,107,.06);}
@media (prefers-reduced-motion: reduce){.arc-card:hover{transform:none;}}
[data-theme="light"] .bridge-overlay{
  --snow:#14212C; --snow-dim:#46586A; --schist:#5E7086;
  --ember:#A96D14; --ember-hot:#8A5A0E; --ember-deep:#8A5A0E;
  --live:#0E7C6B; --live-deep:#0A5C50;
  background:rgba(240,244,248,.86); box-shadow:none;
}
[data-theme="light"] .bridge-grain{opacity:.035;}
[data-theme="light"] .bridge-overlay .card{
  background:rgba(255,255,255,.82); border-color:rgba(70,88,106,.16);
  box-shadow:0 2px 18px rgba(20,33,44,.07);
}
[data-theme="light"] .bridge-overlay .bridge-close,
[data-theme="light"] .bridge-overlay .preset,
[data-theme="light"] .bridge-overlay .seg button,
[data-theme="light"] .bridge-overlay .stepper button{
  background:rgba(20,33,44,.05); border-color:rgba(70,88,106,.24);
}
[data-theme="light"] .bridge-overlay .bridge-close:hover,
[data-theme="light"] .bridge-overlay .stepper button:hover{background:rgba(20,33,44,.1);}
[data-theme="light"] .bridge-overlay .preset.on{background:rgba(169,109,20,.1);}
[data-theme="light"] .bridge-overlay .seg button.on{background:rgba(14,124,107,.1);}
[data-theme="light"] .bridge-overlay .seg button.on.ember{background:rgba(169,109,20,.1);}
[data-theme="light"] .bridge-overlay .stepper{border-color:rgba(70,88,106,.24);}
[data-theme="light"] .bridge-overlay .clock-val,
[data-theme="light"] .bridge-overlay .pt-total .amt{text-shadow:none;}
[data-theme="light"] .bridge-overlay .ledger td{border-bottom-color:rgba(70,88,106,.14);}
[data-theme="light"] .bridge-overlay .ledger tr.tot td{border-top-color:rgba(70,88,106,.35);}
[data-theme="light"] .bridge-overlay .flag,
[data-theme="light"] .bridge-overlay .q,
[data-theme="light"] .bridge-overlay .checklist li{border-bottom-color:rgba(70,88,106,.12);}
[data-theme="light"] .bridge-overlay .checklist .box{border-color:rgba(70,88,106,.4);}
[data-theme="light"] .bridge-overlay .checklist li.done .box{background:rgba(14,124,107,.1);}
[data-theme="light"] .bridge-overlay .seg-cell{border-color:rgba(70,88,106,.18);}
[data-theme="light"] .bridge-overlay .arc-card{background:rgba(255,255,255,.8);border-color:rgba(70,88,106,.2);}
[data-theme="light"] .bridge-overlay .arc-card.on{box-shadow:0 0 0 1px var(--ember),0 6px 18px rgba(20,33,44,.12);}
`;

// Inject the shared Bridge styles once (bundled into this island's JS as a string). The instrument
// skin is token-driven — the north shell's cold :root values re-skin it, and the light block above
// remaps the same tokens for day use.
const style = document.createElement('style');
style.setAttribute('data-bridge', '');
style.textContent = bridgeCss + LIGHT_CSS;
document.head.appendChild(style);

initTheme();

const root = document.getElementById('bridge-root');
if (root) createRoot(root).render(<NorthBridge />);
