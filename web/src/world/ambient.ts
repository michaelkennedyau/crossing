import { register } from '../engine/registry';
import type { FrameCtx } from '../engine/types';

/**
 * Ambient mist/snow — a faint particle drift on a <canvas>, folded into the master tick (no second
 * rAF). DPR capped at 2; fades toward nil as the Lago Frías silence beat deepens (--quiet → 1);
 * disabled entirely under reduced motion. Atmosphere over polygon count.
 */
interface Particle {
  x: number; y: number; r: number; vx: number; vy: number; a: number;
}

function spawn(w: number, h: number, atTop = false): Particle {
  return {
    x: Math.random() * w,
    y: atTop ? -8 - Math.random() * 48 : Math.random() * h,
    r: 0.6 + Math.random() * 1.6,
    vx: -0.2 + Math.random() * 0.4,
    vy: 0.15 + Math.random() * 0.5,
    a: 0.04 + Math.random() * 0.1,
  };
}

export function initAmbient(reduced: boolean): void {
  if (reduced) return; // no autonomous particle loop under reduced motion
  const canvas = document.getElementById('ambient') as HTMLCanvasElement | null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let w = window.innerWidth;
  let h = window.innerHeight;
  const resize = (): void => {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener('resize', resize, { passive: true });

  const parts: Particle[] = Array.from({ length: 60 }, () => spawn(w, h));

  register((c: FrameCtx) => {
    const fade = 1 - 0.85 * c.quiet; // mist thins to near-nil in the silence beat
    ctx.clearRect(0, 0, w, h);
    if (fade <= 0.02) return;
    const step = c.dt / 16.67;
    ctx.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      p.x += p.vx * step;
      p.y += p.vy * step;
      if (p.y > h + 8 || p.x < -8 || p.x > w + 8) Object.assign(p, spawn(w, h, true));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,216,222,${(p.a * fade).toFixed(3)})`;
      ctx.fill();
    }
  });
}
