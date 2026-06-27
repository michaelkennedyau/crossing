import { each } from './registry';
import { buildCtx, recomputeProgress } from './scroll';
import { prefersReducedMotion } from './reduced';

/**
 * The single master rAF loop. Everything continuous registers into the registry and is driven from
 * here — there is exactly one requestAnimationFrame loop in the app. Pauses when the tab is hidden.
 *
 * Reduced-motion path: no autonomous loop (no heartbeat, particles, fog drift). The dawn arc and
 * reveals still update, but only in response to user scroll (rAF-coalesced) — they are user-driven.
 */
let raf = 0;
let last = 0;
let running = false;
let scrollScheduled = false;

function loop(now: number): void {
  const dt = Math.min(50, now - last);
  last = now;
  each(buildCtx(now, dt, false));
  raf = requestAnimationFrame(loop);
}

function onVisibility(): void {
  if (document.hidden) {
    cancelAnimationFrame(raf);
  } else {
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
}

function scheduleProgress(): void {
  if (scrollScheduled) return;
  scrollScheduled = true;
  requestAnimationFrame(() => {
    scrollScheduled = false;
    recomputeProgress();
  });
}

function scheduleReducedPass(): void {
  if (scrollScheduled) return;
  scrollScheduled = true;
  requestAnimationFrame((now) => {
    scrollScheduled = false;
    recomputeProgress();
    each(buildCtx(now, 0, true));
  });
}

export function startTicker(): void {
  if (running) return;
  running = true;
  recomputeProgress();

  if (prefersReducedMotion()) {
    each(buildCtx(performance.now(), 0, true)); // one resolved pass — a complete, static frame
    addEventListener('scroll', scheduleReducedPass, { passive: true });
    addEventListener('resize', scheduleReducedPass, { passive: true });
    return;
  }

  addEventListener('scroll', scheduleProgress, { passive: true });
  addEventListener('resize', scheduleProgress, { passive: true });
  addEventListener('visibilitychange', onVisibility);
  last = performance.now();
  raf = requestAnimationFrame(loop);
}
