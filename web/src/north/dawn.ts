import type { FrameCtx } from '../engine/types';

/**
 * The latitude arc — the North's answer to the Andes dawn. The Chile piece ran dark → daylight;
 * this one runs warm Brisbane dusk → the cold buried pass (the pivot) → Saigon warmth → equatorial
 * night → North Sea grey → a deliberate DARK DIP at the empty-north watch (≈0.58, leg 07 of the
 * 13-leg "why" page, the engine-cut analogue) → the aurora bloom → the Adriatic gold of the
 * options → berth.
 * Same exported grammar as engine/dawn.ts; --dawn here reads as "northness" (the stage filter cools
 * with it). The quiet bell is computed locally — the shared buildCtx's bell belongs to Lago Frías.
 */
interface Stop {
  p: number;
  top: string; mid: string; bot: string; hz: string;
  hzA: number; starA: number; fogA: number; greenA: number;
}

const STOPS: Stop[] = [
  // p values track the 13-leg centres (leg 07, the tall empty-north watch, centres at ≈0.58)
  { p: 0.0, top: '#1A1410', mid: '#140F12', bot: '#101018', hz: '#58362A', hzA: 0.14, starA: 0.0, fogA: 0.55, greenA: 0.0 }, // Brisbane winter dusk
  { p: 0.08, top: '#0B1220', mid: '#0D1626', bot: '#101B2E', hz: '#46586C', hzA: 0.1, starA: 0.3, fogA: 0.65, greenA: 0.0 }, // the buried pass — cold blue
  { p: 0.16, top: '#201410', mid: '#191013', bot: '#12101A', hz: '#6A3E2A', hzA: 0.18, starA: 0.0, fogA: 0.6, greenA: 0.0 }, // Saigon warmth
  { p: 0.3, top: '#090C16', mid: '#0A101E', bot: '#0C1424', hz: '#1E3048', hzA: 0.06, starA: 0.55, fogA: 0.4, greenA: 0.05 }, // QF1 night leg
  { p: 0.41, top: '#131A24', mid: '#1A2430', bot: '#232E3A', hz: '#4A5866', hzA: 0.12, starA: 0.0, fogA: 0.7, greenA: 0.1 }, // London grey
  { p: 0.5, top: '#0C1E28', mid: '#12303A', bot: '#17424A', hz: '#2E6A66', hzA: 0.1, starA: 0.05, fogA: 0.5, greenA: 0.55 }, // the logic turns north
  { p: 0.58, top: '#050A12', mid: '#071018', bot: '#0A1822', hz: '#123828', hzA: 0.04, starA: 0.8, fogA: 0.3, greenA: 0.8 }, // the empty north — dark dip
  { p: 0.66, top: '#071420', mid: '#0B2430', bot: '#123A34', hz: '#3EC08A', hzA: 0.5, starA: 0.6, fogA: 0.2, greenA: 1.0 }, // aurora bloom → the exhale
  { p: 0.85, top: '#12283A', mid: '#1E4456', bot: '#2E6070', hz: '#E8B476', hzA: 0.45, starA: 0.1, fogA: 0.16, greenA: 0.5 }, // the warm options
  { p: 1.0, top: '#182F42', mid: '#2A5064', bot: '#457888', hz: '#F2D9A6', hzA: 0.7, starA: 0.05, fogA: 0.1, greenA: 0.3 }, // the bridge, berth gold
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

/** the Arctic hush bell: k² peaking at p≈0.58 (the empty-north watch), half-width 0.09 — the lights want the dark. */
export function auroraQuiet(p: number): number {
  const k = Math.max(0, 1 - Math.abs(clamp01(p) - 0.58) / 0.09);
  return k * k;
}

/**
 * The north atmosphere animator. Ignores ctx.quiet (that bell is Lago Frías's) and writes its own;
 * everything else mirrors engine/dawn.applyAtmosphere so the shared CSS contract holds.
 */
export function applyNorthAtmosphere(ctx: FrameCtx): void {
  const { a, b, t } = bracket(ctx.progress);
  const ts = smooth(t);
  const r = document.documentElement.style;
  r.setProperty('--p', ctx.progress.toFixed(4));
  r.setProperty('--dawn', ctx.dawn.toFixed(4));
  r.setProperty('--quiet', auroraQuiet(ctx.progress).toFixed(4));
  r.setProperty('--sky-top', lerpHex(a.top, b.top, ts));
  r.setProperty('--sky-mid', lerpHex(a.mid, b.mid, ts));
  r.setProperty('--sky-bot', lerpHex(a.bot, b.bot, ts));
  r.setProperty('--horizon', lerpHex(a.hz, b.hz, ts));
  r.setProperty('--horizon-a', lerp(a.hzA, b.hzA, t).toFixed(3));
  r.setProperty('--star-a', lerp(a.starA, b.starA, t).toFixed(3));
  r.setProperty('--fog-a', lerp(a.fogA, b.fogA, t).toFixed(3));
  r.setProperty('--green-a', lerp(a.greenA, b.greenA, t).toFixed(3));
}
