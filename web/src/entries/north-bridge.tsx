import { createRoot } from 'react-dom/client';
import { NorthBridge } from '../north/bridge/NorthBridge';
import { initTheme } from '../north/theme';
import bridgeCss from '../bridge/bridge.css?inline';
import northCss from '../north/bridge/north.css?inline';

/**
 * The North board's styles (arc chooser, weather board, outlook) + the day-mode token remap live
 * in north/bridge/north.css — this entry just concatenates them with the shared bridge.css and
 * injects once. Day mode is scoped to the Bridge only: the voyage scroll is a night-world by
 * design (the whole atmosphere engine is a dark-sky instrument); the Bridge is where the numbers
 * live, and numbers deserve daylight. Tokens are remapped under [data-theme="light"], per the
 * VARO theme contract (data-theme attribute + localStorage + prefers-color-scheme default).
 */
const style = document.createElement('style');
style.setAttribute('data-bridge', '');
style.textContent = bridgeCss + northCss;
document.head.appendChild(style);

initTheme();

const root = document.getElementById('bridge-root');
if (root) createRoot(root).render(<NorthBridge />);
