/**
 * Chart-room geometry — pure and tested. An equirectangular projection with mid-latitude
 * x-compression over the board's Europe (lon −20→30, lat 33→71) into a 560×420 viewBox,
 * and the temperature ramp every weather visualisation shares (same family as the live curve).
 */
export const MAP_W = 560;
export const MAP_H = 420;
const LON_MIN = -20;
const LON_MAX = 30;
const LAT_MIN = 33;
const LAT_MAX = 71;
const PAD = 26;
// cos of the mid latitude (~52°): honest-enough x-compression for a chart, not a survey
const XK = Math.cos(((LAT_MIN + LAT_MAX) / 2) * (Math.PI / 180));

export function project(lat: number, lon: number): { x: number; y: number } {
  const cx = (LON_MIN + LON_MAX) / 2;
  const spanX = (LON_MAX - LON_MIN) * XK;
  const nx = ((lon - cx) * XK) / spanX + 0.5;
  const ny = (LAT_MAX - lat) / (LAT_MAX - LAT_MIN);
  return {
    x: PAD + nx * (MAP_W - PAD * 2),
    y: PAD + ny * (MAP_H - PAD * 2),
  };
}

/** six buckets, cool → hot: the shared colour language of the board */
export const RAMP = ['#7fd8f2', '#8be8c0', '#e8e0a8', '#f2b45e', '#e8a061', '#e88b8b'] as const;
export const RAMP_LABELS = ['<10', '10–17', '18–23', '24–27', '28–32', '33+'] as const;

export function tempBucket(tmax: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (tmax < 10) return 0; // cold — the aurora latitudes
  if (tmax < 18) return 1; // cool — live green
  if (tmax < 24) return 2; // mild — sand
  if (tmax < 28) return 3; // warm — ember
  if (tmax < 33) return 4; // hot
  return 5; // heat dome
}

export function tempRamp(tmax: number): string {
  return RAMP[tempBucket(tmax)];
}

/**
 * Scored outcome for one day at one place — the board's judgement, not just a temperature.
 * 100 is a perfect day for this couple; heat above 31° and cold below 18° bleed points at
 * 4/degree, rain at 4/mm capped at 40. Pure, clamped, honest.
 */
export function dayScore(tmax: number, rainMm: number): number {
  let s = 100;
  if (tmax > 31) s -= (tmax - 31) * 4;
  if (tmax < 18) s -= (18 - tmax) * 4;
  s -= Math.min(40, Math.max(0, rainMm) * 4);
  return Math.max(0, Math.min(100, Math.round(s)));
}

/** verdict colours for the score view: go / your-call / a-gamble / not-this-week */
export function scoreColor(score: number): string {
  if (score >= 75) return '#8be8c0';
  if (score >= 50) return '#e8e0a8';
  if (score >= 25) return '#f2b45e';
  return '#e88b8b';
}

/** 10° graticule strictly inside the bbox, for the chart's instrument furniture */
export function graticule(): { lats: { deg: number; y: number }[]; lons: { deg: number; x: number }[] } {
  const lats = [40, 50, 60, 70].map((deg) => ({ deg, y: project(deg, 0).y }));
  const lons = [-10, 0, 10, 20].map((deg) => ({ deg, x: project(50, deg).x }));
  return { lats, lons };
}

/**
 * Deterministic label de-collision: returns a per-id dy for the LABEL only (dots never move).
 * Same-side labels whose x differ by <70px (mono label overlap range) are swept top→down and
 * pushed apart to minGap. Sorted by y then id, so input order never changes the result.
 */
export function nudgeLabels(
  items: { id: string; x: number; y: number; side: 'left' | 'right' }[],
  minGap = 9,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const side of ['left', 'right'] as const) {
    const group = items
      .filter((i) => i.side === side)
      .sort((a, b) => a.y - b.y || (a.id < b.id ? -1 : 1));
    for (let i = 0; i < group.length; i++) {
      out[group[i].id] = 0;
      for (let j = 0; j < i; j++) {
        if (Math.abs(group[i].x - group[j].x) >= 70) continue;
        const prevLabelY = group[j].y + out[group[j].id];
        const thisLabelY = group[i].y + out[group[i].id];
        if (thisLabelY - prevLabelY < minGap) out[group[i].id] = prevLabelY + minGap - group[i].y;
      }
    }
  }
  return out;
}
