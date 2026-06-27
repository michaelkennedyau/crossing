import { register } from '../engine/registry';

/**
 * The cinematic image stage. One full-bleed graded photograph per leg, crossfading by scroll
 * progress, with slow Ken Burns + parallax. Sits under the dawn-arc scrim (#stage gets a CSS filter
 * driven by --dawn, so every photo reads cold/dark at the cold open and warms to full colour at the
 * arrival). LQIP paints instantly; the full AVIF/WebP is lazy-loaded as each leg approaches.
 *
 * The photos ARE the scenery — they replace the flat SVG ridgelines of v1 (the "dull mountain" fix).
 */
interface Entry { ar: number; lqip: string }
type Manifest = Record<string, Entry>;

interface Frame {
  el: HTMLDivElement;
  slug: string;
  center: number; // progress 0..1 at this leg's centre
  loaded: boolean;
}

export async function initImageStage(reduced: boolean): Promise<void> {
  const stage = document.getElementById('stage');
  if (!stage) return;

  let manifest: Manifest = {};
  try {
    manifest = (await fetch('/img/manifest.json').then((r) => r.json())) as Manifest;
  } catch {
    return; // no images → keep the procedural sky
  }

  const legs = Array.from(document.querySelectorAll<HTMLElement>('.leg'));
  const frames: Frame[] = [];
  legs.forEach((leg) => {
    const slug = leg.dataset.img;
    if (!slug || !manifest[slug]) return;
    const el = document.createElement('div');
    el.className = 'frame';
    el.style.backgroundImage = `url("${manifest[slug].lqip}")`;
    el.style.opacity = '0';
    stage.appendChild(el);
    frames.push({ el, slug, center: 0, loaded: false });
  });
  if (!frames.length) return;

  const widthFor = (): number => (window.innerWidth <= 820 ? 1280 : 1920);
  const loadFull = (fr: Frame): void => {
    if (fr.loaded) return;
    fr.loaded = true;
    const w = widthFor();
    const probe = new Image();
    probe.onload = () => {
      fr.el.style.backgroundImage =
        `image-set(url("/img/${fr.slug}-${w}.avif") type("image/avif"), ` +
        `url("/img/${fr.slug}-${w}.webp") type("image/webp")), url("${manifest[fr.slug].lqip}")`;
    };
    probe.src = `/img/${fr.slug}-${w}.webp`;
  };

  let spacing = 1 / Math.max(1, frames.length - 1);
  const measure = (): void => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    legs.forEach((leg, i) => {
      const fr = frames[i];
      if (!fr) return;
      const mid = leg.offsetTop + leg.offsetHeight / 2 - window.innerHeight / 2;
      fr.center = max > 0 ? Math.min(1, Math.max(0, mid / max)) : i / Math.max(1, frames.length - 1);
    });
    spacing = frames.length > 1 ? (frames[frames.length - 1].center - frames[0].center) / (frames.length - 1) : 1;
  };
  measure();
  addEventListener('resize', measure, { passive: true });

  loadFull(frames[0]); // hero — load immediately for LCP

  register(({ progress }) => {
    for (const fr of frames) {
      const d = Math.abs(progress - fr.center) / (spacing || 1);
      const op = d < 1 ? 1 - d : 0; // triangular crossfade with neighbours
      fr.el.style.opacity = op.toFixed(3);
      if (op > 0.03 && !fr.loaded) loadFull(fr);
      if (reduced) {
        fr.el.style.transform = 'scale(1.03)';
      } else {
        const rel = progress - fr.center;
        fr.el.style.transform = `scale(${(1.05 + rel * 0.05).toFixed(3)}) translate3d(0, ${(rel * window.innerHeight * 0.1).toFixed(1)}px, 0)`;
      }
    }
  });
}
