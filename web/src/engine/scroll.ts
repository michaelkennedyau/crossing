import type { FrameCtx } from './types';
import { ease, friasQuiet } from './dawn';

/**
 * Scroll → progress (0..1), the spine of the whole piece. Recomputed on scroll/resize (rAF-debounced
 * by the ticker); buildCtx() assembles the frame context every tick from the current progress.
 */
let progress = 0;
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

export function recomputeProgress(): void {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress = max > 0 ? clamp01(window.scrollY / max) : 0;
}

export const getProgress = (): number => progress;

export function buildCtx(t: number, dt: number, reduced = false): FrameCtx {
  return { t, dt, progress, dawn: ease(progress), quiet: friasQuiet(progress), reduced };
}
