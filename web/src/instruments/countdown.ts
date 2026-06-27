/**
 * The ship's clock. Counts down to QF27 (DEPART_ISO, surfaced on <body data-depart>). Updates the
 * cold-open telemetry and the bottom-left readout every second — a once-per-second clock, not a
 * per-frame animator, so it stays off the ticker.
 */
export function initCountdown(): void {
  const iso = document.body.dataset.depart;
  if (!iso) return;
  const target = Date.parse(iso);
  if (Number.isNaN(target)) return;

  const els = document.querySelectorAll<HTMLElement>('[data-countdown],[data-readout-countdown]');
  if (!els.length) return;

  const pad = (n: number): string => String(n).padStart(2, '0');
  const tick = (): void => {
    const ms = target - Date.now();
    let text: string;
    if (ms <= 0) {
      text = 'launched';
    } else {
      const s = Math.floor(ms / 1000);
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      text = `${d}d ${pad(h)}:${pad(m)}:${pad(s % 60)}`;
    }
    els.forEach((el) => {
      el.textContent = text;
    });
  };
  tick();
  setInterval(tick, 1000);
}
