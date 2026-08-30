// Chart-room coastline baker. Fetches Natural Earth coastlines (public domain), clips to a
// config's bbox, projects, Douglas–Peucker simplifies, and writes baked path constants.
// Dev-time only — run manually when a bbox or projection changes:
//   node scripts/gen-coast.mjs board   (the Europe board — byte-stable, rarely re-run)
//   node scripts/gen-coast.mjs med     (the journal's Med plate — ne_10m; 50m lacks
//                                       Giglio and the Aeolians entirely)
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NE_50M = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_coastline.geojson';
const NE_10M = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_coastline.geojson';

const CONFIGS = {
  // Keep in lockstep with web/src/north/board/geo.ts (xk:true reproduces its formula
  // byte-for-byte, even though the XK factor algebraically cancels).
  board: {
    src: NE_50M, out: 'src/north/board/coast.ts', exportName: 'COASTS',
    header: 'Baked chart coastlines — Natural Earth 50m (public domain), clipped to the board bbox,\n * projected via the geo.ts formula',
    view: { W: 560, H: 420, LON_MIN: -20, LON_MAX: 30, LAT_MIN: 33, LAT_MAX: 71, PAD: 26, xk: true },
    clip: { lonMin: -19.5, lonMax: 29.5, latMin: 32.3, latMax: 70.9 },
    tolerance: 2.0, minPoints: 4, minExtent: 15, funchalExempt: true,
  },
  // LOCKSTEP: this view must equal MED_VIEW in src/journal/map-geo.ts (the journal maps
  // project ports through it). ne_10m is required: 50m has no Giglio/Lipari/Stromboli.
  med: {
    src: NE_10M, out: 'src/north/board/coast-med.ts', exportName: 'COASTS_MED',
    header: 'Baked Med coastlines for the journal maps — Natural Earth 10m (public domain),\n * clipped to the MED_VIEW bbox (lockstep: src/journal/map-geo.ts)',
    view: { W: 560, H: 620, LON_MIN: 6.4, LON_MAX: 16.0, LAT_MIN: 35.3, LAT_MAX: 44.9, PAD: 24 },
    clip: { lonMin: 6.1, lonMax: 16.3, latMin: 35.0, latMax: 45.2 },
    tolerance: 0.9, minPoints: 3, minExtent: 2, funchalExempt: false,
  },
};

const which = process.argv[2] ?? 'board';
const cfg = CONFIGS[which];
if (!cfg) { console.error(`unknown config '${which}' — use: ${Object.keys(CONFIGS).join(' | ')}`); process.exit(1); }
const OUT = path.resolve(HERE, '..', cfg.out);

const { W, H, LON_MIN, LON_MAX, LAT_MIN, LAT_MAX, PAD, xk } = cfg.view;
const XK = xk ? Math.cos(((LAT_MIN + LAT_MAX) / 2) * (Math.PI / 180)) : 1;
function project(lat, lon) {
  const cx = (LON_MIN + LON_MAX) / 2;
  const spanX = (LON_MAX - LON_MIN) * XK;
  const nx = ((lon - cx) * XK) / spanX + 0.5;
  const ny = (LAT_MAX - lat) / (LAT_MAX - LAT_MIN);
  return { x: PAD + nx * (W - PAD * 2), y: PAD + ny * (H - PAD * 2) };
}

function inBox([lon, lat]) {
  return lon >= cfg.clip.lonMin && lon <= cfg.clip.lonMax && lat >= cfg.clip.latMin && lat <= cfg.clip.latMax;
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

const res = await fetch(cfg.src);
if (!res.ok) { console.error(`fetch failed: ${res.status} — check network`); process.exit(1); }
const geo = await res.json();

const paths = [];
for (const f of geo.features) {
  const geom = f.geometry;
  const lines = geom.type === 'LineString' ? [geom.coordinates] : geom.type === 'MultiLineString' ? geom.coordinates : [];
  for (const line of lines) {
    for (const run of clipRuns(line)) {
      const projected = run.map(([lon, lat]) => project(lat, lon));
      const simple = simplify(projected, cfg.tolerance);
      if (simple.length < cfg.minPoints) continue;
      const xs = simple.map((p) => p.x), ys = simple.map((p) => p.y);
      const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      const nearFunchal = cfg.funchalExempt && Math.min(...xs) < 90 && Math.max(...ys) > 370;
      if (extent < cfg.minExtent && !nearFunchal) continue;
      const d = 'M' + simple.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L');
      paths.push({ d, extent });
    }
  }
}

paths.sort((a, b) => b.extent - a.extent);
const kept = paths.map((p) => p.d);
const bytes = kept.join('').length;
console.log(`paths: ${kept.length}, chars: ${bytes}`);
if (bytes > 12000) console.warn('over budget — raise tolerance or minExtent');

const ts = `/**
 * ${cfg.header}, Douglas–Peucker simplified at ${cfg.tolerance}px.
 * DO NOT hand-edit: regenerate with \`node scripts/gen-coast.mjs ${which}\` in web/.
 */
export const ${cfg.exportName}: string[] = [
${kept.map((d) => `  '${d}',`).join('\n')}
];
`;
await writeFile(OUT, ts);
console.log('wrote', OUT);
