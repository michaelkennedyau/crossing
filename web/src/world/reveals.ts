/**
 * Section reveals. Each [data-reveal] block fades + rises once as it scrolls into view. Uses
 * IntersectionObserver (off the main thread of the ticker); falls back to showing everything.
 */
export function initReveals(): void {
  const blocks = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (!('IntersectionObserver' in window)) {
    blocks.forEach((b) => b.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
  );
  blocks.forEach((b) => io.observe(b));
}
