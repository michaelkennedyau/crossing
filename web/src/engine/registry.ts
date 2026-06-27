import type { Animator, FrameCtx } from './types';

/**
 * The registry. Animators register an update(ctx) callback; the single ticker calls each() once per
 * frame. This is the one place continuous animation is allowed to live — no scattered rAF loops.
 */
const animators = new Set<Animator>();

export function register(a: Animator): () => void {
  animators.add(a);
  return () => {
    animators.delete(a);
  };
}

export function each(ctx: FrameCtx): void {
  for (const a of animators) a(ctx);
}

export function animatorCount(): number {
  return animators.size;
}
