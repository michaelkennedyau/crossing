/** prefers-reduced-motion gate. Under reduce, the ticker runs no autonomous loop; the dawn arc and
 *  reveals still track scroll (they are user-driven, not autonomous) — see ticker.ts. */
export const prefersReducedMotion = (): boolean =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
