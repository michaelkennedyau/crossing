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

/** five buckets, cool → hot: the shared colour language of the board */
export function tempRamp(tmax: number): string {
  if (tmax < 10) return '#7fd8f2'; // cold — the aurora latitudes
  if (tmax < 18) return '#8be8c0'; // cool — live green
  if (tmax < 24) return '#e8e0a8'; // mild — sand
  if (tmax < 28) return '#f2b45e'; // warm — ember
  if (tmax < 33) return '#e8a061'; // hot
  return '#e88b8b'; // heat dome
}
