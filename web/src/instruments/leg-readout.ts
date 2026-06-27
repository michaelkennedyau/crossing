import { register } from '../engine/registry';

/**
 * The bottom-left leg readout — the current leg's name, from floor(progress · legCount). Registered
 * into the ticker but only writes the DOM when the leg index actually changes.
 */
export function initLegReadout(): void {
  const el = document.querySelector<HTMLElement>('[data-readout-leg]');
  if (!el) return;
  const labels = Array.from(document.querySelectorAll<HTMLElement>('.leg')).map(
    (s) => s.dataset.screenLabel ?? '',
  );
  if (!labels.length) return;

  let last = -1;
  register(({ progress }) => {
    const idx = Math.min(labels.length - 1, Math.floor(progress * labels.length));
    if (idx !== last) {
      last = idx;
      if (labels[idx]) el.textContent = labels[idx];
    }
  });
}
