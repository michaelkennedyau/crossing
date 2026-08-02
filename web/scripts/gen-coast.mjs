// Chart-room coastline baker. Fetches Natural Earth 50m coastlines (public domain), clips to
// the board's bbox, projects through the SAME formula as web/src/north/board/geo.ts, simplifies
// with Douglas–Peucker, and writes web/src/north/board/coast.ts as baked path constants.
// Dev-time only — run manually when the bbox or projection changes:
//   node scripts/gen-coast.mjs
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', 'src/north/board/coast.ts');
const SRC = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_coastline.geojson';

// ── projection: keep in lockstep with web/src/north/board/geo.ts ──
const MAP_W = 560, MAP_H = 420, LON_MIN = -20, LON_MAX = 30, LAT_MIN = 33, LAT_MAX = 71, PAD = 26;
const XK = Math.cos(((LAT_MIN + LAT_MAX) / 2) * (Math.PI / 180));
function project(lat, lon) {
  const cx = (LON_MIN + LON_MAX) / 2;
  const spanX = (LON_MAX - LON_MIN) * XK;
  const nx = ((lon - cx) * XK) / spanX + 0.5;
  const ny = (LAT_MAX - lat) / (LAT_MAX - LAT_MIN);
  return { x: PAD + nx * (MAP_W - PAD * 2), y: PAD + ny * (MAP_H - PAD * 2) };
}

// clip bbox is slightly looser than the projection lat floor so Madeira's tick survives
const CLIP = { lonMin: -19.5, lonMax: 29.5, latMin: 32.3, latMax: 70.9 };
const TOLERANCE = 2.0; // px, Douglas–Peucker
const MIN_POINTS = 4;
const MIN_EXTENT = 15; // px — drops islet noise (Madeira window exempt)

function inBox([lon, lat]) {
  return lon >= CLIP.lonMin && lon <= CLIP.lonMax && lat >= CLIP.latMin && lat <= CLIP.latMax;
}

/** split a coordinate run into the sub-runs that live inside the bbox */
function clipRuns(coords) {
  const runs = [];
  let run = [];
  for (const c of coords) {
    if (inBox(c)) run.push(c);
    else if (run.length) { runs.push(run); run = []; }
  }
  if (run.length) runs.push(run);
  return runs;
}

function perpDist(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

function simplify(pts, tol) {
  if (pts.length <= 2) return pts;
  let maxD = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= tol) return [pts[0], pts[pts.length - 1]];
  return [...simplify(pts.slice(0, idx + 1), tol).slice(0, -1), ...simplify(pts.slice(idx), tol)];
}

const res = await fetch(SRC);
if (!res.ok) { console.error(`fetch failed: ${res.status} — try the 110m file or check network`); process.exit(1); }
const geo = await res.json();

const paths = [];
for (const f of geo.features) {
  const geom = f.geometry;
  const lines = geom.type === 'LineString' ? [geom.coordinates] : geom.type === 'MultiLineString' ? geom.coordinates : [];
  for (const line of lines) {
    for (const run of clipRuns(line)) {
      const projected = run.map(([lon, lat]) => project(lat, lon));
      const simple = simplify(projected, TOLERANCE);
      if (simple.length < MIN_POINTS) continue;
      const xs = simple.map((p) => p.x), ys = simple.map((p) => p.y);
      const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      const nearFunchal = Math.min(...xs) < 90 && Math.max(...ys) > 370;
      if (extent < MIN_EXTENT && !nearFunchal) continue;
      const d = 'M' + simple.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L');
      paths.push({ d, extent });
    }
  }
}

paths.sort((a, b) => b.extent - a.extent);
const kept = paths.map((p) => p.d);
const bytes = kept.join('').length;
console.log(`paths: ${kept.length}, chars: ${bytes}`);
if (bytes > 12000) console.warn('over budget — raise TOLERANCE or MIN_EXTENT');

const ts = `/**
 * Baked chart coastlines — Natural Earth 50m (public domain), clipped to the board bbox,
 * projected via the geo.ts formula, Douglas–Peucker simplified at ${TOLERANCE}px.
 * DO NOT hand-edit: regenerate with \`node scripts/gen-coast.mjs\` in web/.
 */
export const COASTS: string[] = [
${kept.map((d) => `  '${d}',`).join('\n')}
];
`;
await writeFile(OUT, ts);
console.log('wrote', OUT);
