import { createRoot } from 'react-dom/client';
import { Bridge } from '../bridge/Bridge';
import bridgeCss from '../bridge/bridge.css?inline';

// Inject the Bridge's styles once (bundled into this island's JS as a string — no separate CSS file
// for the SSR shell to chase). The cold-instrument tokens come from the shell's :root.
const style = document.createElement('style');
style.setAttribute('data-bridge', '');
style.textContent = bridgeCss;
document.head.appendChild(style);

const root = document.getElementById('bridge-root');
if (root) createRoot(root).render(<Bridge />);
