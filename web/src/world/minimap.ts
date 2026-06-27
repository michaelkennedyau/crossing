import { register } from '../engine/registry';

/**
 * The passage minimap ember. The flights (BNE→SYD→SCL) are the lead-in; the Voyage scroll maps to
 * the crossing portion of the route (SCL → the snow), so the ember rides that segment by progress.
 */
export function initMinimap(): void {
  const route = document.getElementById('mm-route') as unknown as SVGPathElement | null;
  const ember = document.getElementById('minimap-ember');
  if (!route || !ember || typeof route.getTotalLength !== 'function') return;
  const len = route.getTotalLength();
  const f0 = 0.6; // fraction of the route at Santiago — where the crossing begins
  register(({ progress }) => {
    const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
    const pt = route.getPointAtLength((f0 + (1 - f0) * p) * len);
    ember.setAttribute('cx', pt.x.toFixed(1));
    ember.setAttribute('cy', pt.y.toFixed(1));
  });
}
