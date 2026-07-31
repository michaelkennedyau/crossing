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
