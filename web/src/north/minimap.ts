import { register } from '../engine/registry';

/**
 * The north passage minimap ember. Unlike the Andes (where the flights were a lead-in and the
 * ember rode only the crossing), this voyage IS the route — the ember rides nearly all of it,
 * starting just clear of the Brisbane berth.
 */
export function initNorthMinimap(): void {
  const route = document.getElementById('mm-route') as unknown as SVGPathElement | null;
  const ember = document.getElementById('minimap-ember');
  if (!route || !ember || typeof route.getTotalLength !== 'function') return;
  const len = route.getTotalLength();
  const f0 = 0.05; // fraction of the route already sailed at the cold open
  register(({ progress }) => {
    const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
    const pt = route.getPointAtLength((f0 + (1 - f0) * p) * len);
    ember.setAttribute('cx', pt.x.toFixed(1));
    ember.setAttribute('cy', pt.y.toFixed(1));
  });
}
