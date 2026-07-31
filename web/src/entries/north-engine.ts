import { register } from '../engine/registry';
import { startTicker } from '../engine/ticker';
import { prefersReducedMotion } from '../engine/reduced';
import { applyNorthAtmosphere } from '../north/dawn';
import { initReveals } from '../world/reveals';
import { initImageStage } from '../world/image-stage';
import { initMist } from '../world/mist-gl';
import { initCountdown } from '../instruments/countdown';
import { initLegReadout } from '../instruments/leg-readout';
import { initNorthMinimap } from '../north/minimap';

/**
 * The north engine island. Same looping assembly as the Andes — one scroll scalar drives the
 * whole latitude/aurora/quiet system — with the north's own atmosphere and minimap ride.
 * Lean v1: no sound bed.
 */
const reduced = prefersReducedMotion();

register(applyNorthAtmosphere);
void initImageStage(reduced);
initMist(reduced);
initLegReadout();
initReveals();
initNorthMinimap();
initCountdown();

startTicker();
