import type { FrameCtx } from './types';

/**
 * The dawn arc — 8 stops from the Claude Design handoff. Each maps a scroll fraction to the sky
 * colours (top/mid/bot + horizon) and four alphas (horizon glow, starfield, fog, water green).
 * Luminance rises overall but DIPS at the cathedral leg (≈0.68, the loudest, most enclosed bar)
 * and then resolves bright — that dip is intentional.
 */
interface Stop {
  p: number;
  top: string; mid: string; bot: string; hz: string;
  hzA: number; starA: number; fogA: number; greenA: number;
}

const STOPS: Stop[] = [
  { p: 0.0, top: '#04060A', mid: '#070B12', bot: '#0B1018', hz: '#16263A', hzA: 0.0, starA: 1.0, fogA: 0.92, greenA: 0.0 },
  { p: 0.13, top: '#070F1B', mid: '#0C1826', bot: '#122334', hz: '#1E3650', hzA: 0.05, starA: 0.55, fogA: 0.82, greenA: 0.05 },
  { p: 0.28, top: '#0D2030', mid: '#163646', bot: '#1C4A4E', hz: '#2A5860', hzA: 0.08, starA: 0.12, fogA: 0.62, greenA: 0.3 },
  { p: 0.44, top: '#123440', mid: '#1A564E', bot: '#216A5A', hz: '#2E7A66', hzA: 0.1, starA: 0.0, fogA: 0.48, greenA: 0.72 },
  { p: 0.58, top: '#0D1E26', mid: '#123238', bot: '#173E44', hz: '#1F4A4E', hzA: 0.06, starA: 0.0, fogA: 0.4, greenA: 0.58 },
  { p: 0.68, top: '#0A171D', mid: '#0F262C', bot: '#143036', hz: '#163438', hzA: 0.03, starA: 0.0, fogA: 0.56, greenA: 0.5 },
  { p: 0.84, top: '#1E4350', mid: '#386C78', bot: '#5C949C', hz: '#E6C488', hzA: 0.55, starA: 0.0, fogA: 0.26, greenA: 0.86 },
  { p: 1.0, top: '#2C5A6E', mid: '#4E8A94', bot: '#86B6B8', hz: '#F2D9A6', hzA: 0.9, starA: 0.0, fogA: 0.12, greenA: 1.0 },
];

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (t: number): number => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

type RGB = [number, number, number];
const hexToRgb = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lerpHex = (a: string, b: string, t: number): string => {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  return `rgb(${Math.round(lerp(ra[0], rb[0], t))},${Math.round(lerp(ra[1], rb[1], t))},${Math.round(lerp(ra[2], rb[2], t))})`;
};

function bracket(p: number): { a: Stop; b: Stop; t: number } {
  const x = clamp01(p);
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (x <= b.p) {
      const span = b.p - a.p;
      return { a, b, t: span > 0 ? (x - a.p) / span : 0 };
    }
  }
  const last = STOPS[STOPS.length - 1];
  return { a: last, b: last, t: 0 };
}

/** dawn scalar: a gentle eased temperature 0..1 for animators (ember glow, saturation, etc.). */
export const ease = (p: number): number => smooth(clamp01(p));

/** the Lago Frías hush bell: k² peaking at p≈0.655, half-width 0.115 (README). */
export function friasQuiet(p: number): number {
  const k = Math.max(0, 1 - Math.abs(clamp01(p) - 0.655) / 0.115);
  return k * k;
}

/**
 * The atmosphere animator. One scalar — scroll progress — drives the whole sky/dawn/quiet system.
 * Registered into the single ticker; writes CSS custom properties the shell + islands consume.
 */
export function applyAtmosphere(ctx: FrameCtx): void {
  const { a, b, t } = bracket(ctx.progress);
  const ts = smooth(t); // smoothstep the colour blend; alphas stay linear
  const r = document.documentElement.style;
  r.setProperty('--p', ctx.progress.toFixed(4));
  r.setProperty('--dawn', ctx.dawn.toFixed(4));
  r.setProperty('--quiet', ctx.quiet.toFixed(4));
  r.setProperty('--sky-top', lerpHex(a.top, b.top, ts));
  r.setProperty('--sky-mid', lerpHex(a.mid, b.mid, ts));
  r.setProperty('--sky-bot', lerpHex(a.bot, b.bot, ts));
  r.setProperty('--horizon', lerpHex(a.hz, b.hz, ts));
  r.setProperty('--horizon-a', lerp(a.hzA, b.hzA, t).toFixed(3));
  r.setProperty('--star-a', lerp(a.starA, b.starA, t).toFixed(3));
  r.setProperty('--fog-a', lerp(a.fogA, b.fogA, t).toFixed(3));
  r.setProperty('--green-a', lerp(a.greenA, b.greenA, t).toFixed(3));
}
