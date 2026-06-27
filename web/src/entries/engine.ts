import { register } from '../engine/registry';
import { startTicker } from '../engine/ticker';
import { applyAtmosphere } from '../engine/dawn';
import { prefersReducedMotion } from '../engine/reduced';
import { initReveals } from '../world/reveals';
import { initImageStage } from '../world/image-stage';
import { initMist } from '../world/mist-gl';
import { initCountdown } from '../instruments/countdown';
import { initLegReadout } from '../instruments/leg-readout';
import { initSound } from '../sound/score';

/**
 * The engine island. Boots the looping assembly: one scalar (scroll progress) drives the whole
 * sky/dawn/quiet system (atmosphere), the ember (pure CSS reading --p), the leg readout and the
 * ambient mist. The ember rail, ridgelines, water and hush are all CSS off the engine's variables.
 */
const reduced = prefersReducedMotion();

register(applyAtmosphere);
void initImageStage(reduced);
initMist(reduced);
initLegReadout();
initReveals();
initCountdown();
initSound();

startTicker();
