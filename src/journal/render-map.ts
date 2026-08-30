import { COASTS_MED } from '../../web/src/north/board/coast-med';
import {
  MED_VIEW, PORTS, ROUTE, ROUTE_ORDER, nudgeLabels, portById, project,
  resolveFocus, routeSplit, seaRouteBbox, type Focus, type Leg, type MapView, type Port,
} from './map-geo';

/**
 * Journal route maps — server-rendered SVG, CSS-only draw-in, zero reader JS.
 * Sea chapters get the Med plate (visible coast, edge-safe labels); rail chapters get
 * a station strip — the honest register for trains, no fake geography, no dead acreage.
 * The overview crops its viewBox to the sea route's own bbox.
 */

const esc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const LAND_IDS = new Set(['london', 'paris', 'lyon']);
const LABEL_CH = 6.4; // ~px per mono char at font-size 10 — edge-overflow estimate

function legPoints(leg: Leg, v: MapView): { x: number; y: number }[] {
  const from = portById(leg.from)!;
  const to = portById(leg.to)!;
  return [
    project(from.lat, from.lon, v),
    ...(leg.via ?? []).map(([lat, lon]) => project(lat, lon, v)),
    project(to.lat, to.lon, v),
  ];
}

const pathD = (pts: { x: number; y: number }[]): string =>
  'M' + pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L');

const MODE_DASH: Record<Leg['mode'], string> = { sea: 'none', rail: '6 3 1.5 3', ferry: '2 4' };

function legsPath(legs: Leg[], v: MapView): string {
  return legs.map((l) =>
    `<path d="${pathD(legPoints(l, v))}" fill="none" stroke="var(--ink-dim)" stroke-width="1.4"${
      MODE_DASH[l.mode] === 'none' ? '' : ` stroke-dasharray="${MODE_DASH[l.mode]}"`}/>`).join('');
}

function fullRoutePath(v: MapView): string {
  const pts = ROUTE.flatMap((l) => legPoints(l, v));
  return `<path d="${pathD(pts)}" fill="none" stroke="var(--schist)" stroke-width="1" stroke-dasharray="3 5" opacity=".45"/>`;
}

const coastLayer = (width: number, opacity: number): string =>
  COASTS_MED.map((d) => `<path d="${d}" fill="none" stroke="var(--schist)" stroke-width="${width}" opacity="${opacity}"/>`).join('');

/** label side honouring the frame: flip to 'end' when the text would run off the right edge */
function labelSide(p: Port, x: number, frameRight: number): 'left' | 'right' {
  if (p.side) return p.side;
  return x + 8 + p.name.length * LABEL_CH > frameRight ? 'left' : 'right';
}

function portsLayer(v: MapView, ports: Port[], visited: Set<string>, focusedId: string | undefined, frameRight: number): string {
  const projected = ports.map((p) => ({ p, ...project(p.lat, p.lon, v) }));
  const inView = projected
    .filter(({ x, y }) => x >= 0 && y >= 0 && x <= v.w && y <= v.h)
    .map(({ p, x, y }) => ({ p, x, y, side: labelSide(p, x, frameRight) }));
  const dyOf = nudgeLabels(inView.map(({ p, x, y, side }) => ({ id: p.id, x, y, side })));
  return inView.map(({ p, x, y, side }) => {
    const focused = p.id === focusedId;
    const past = visited.has(p.id);
    const dy = dyOf[p.id] ?? 0;
    const lx = side === 'left' ? x - 9 : x + 9;
    const anchor = side === 'left' ? 'end' : 'start';
    const leader = Math.abs(dy) > 5 ? `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${lx.toFixed(1)}" y2="${(y + dy).toFixed(1)}" stroke="var(--line)" stroke-width=".7"/>` : '';
    return `<g>${leader}<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" ${
      focused ? 'fill="var(--live)"' : past ? 'fill="var(--schist)"' : 'fill="var(--paper)" stroke="var(--schist)"'}/>${
      focused ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6.5" fill="none" stroke="var(--live)"/>` : ''
    }<text x="${lx.toFixed(1)}" y="${(y + dy + 3).toFixed(1)}" text-anchor="${anchor}" class="ml${focused ? ' mf' : ''}">${esc(p.name.toUpperCase())}</text></g>`;
  }).join('');
}

const MODE_WORD: Record<Leg['mode'], string> = { sea: 'by sea', rail: 'by rail', ferry: 'by ferry' };

/** the rail strip — four stations on a line, the day's leg drawing in */
function renderRailStrip(focus: Focus | null): string {
  const stations = ['london', 'paris', 'lyon', 'nice'];
  const W = 560, H = 110, PAD = 46, Y = 62;
  const xs = new Map(stations.map((id, i) => [id, PAD + (i * (W - PAD * 2)) / (stations.length - 1)]));
  const railIdx = focus?.legIndex ?? (focus?.portId ? ROUTE.findIndex((l) => l.to === focus.portId) : -1);
  const current = railIdx >= 0 && railIdx <= 2 ? ROUTE[railIdx] : null;
  const livedUpto = current ? stations.indexOf(current.from) : focus?.portId ? stations.indexOf(focus.portId) : -1;

  const base = `<line x1="${PAD}" y1="${Y}" x2="${W - PAD}" y2="${Y}" stroke="var(--line)" stroke-width="2"/>`;
  const lived = livedUpto > 0
    ? `<line x1="${PAD}" y1="${Y}" x2="${xs.get(stations[livedUpto])!.toFixed(1)}" y2="${Y}" stroke="var(--ink-dim)" stroke-width="2"/>` : '';
  const draw = current
    ? `<line class="m-draw" pathLength="1" x1="${xs.get(current.from)!.toFixed(1)}" y1="${Y}" x2="${xs.get(current.to)!.toFixed(1)}" y2="${Y}" stroke="var(--live)" stroke-width="2.5"/>` : '';
  const ticks = stations.map((id, i) => {
    const x = xs.get(id)!;
    const p = portById(id)!;
    const focused = focus?.portId === id || current?.to === id;
    const above = i % 2 === 0;
    return `<g><line x1="${x.toFixed(1)}" y1="${Y - 6}" x2="${x.toFixed(1)}" y2="${Y + 6}" stroke="var(--schist)" stroke-width="1.5"/>${
      focused ? `<circle cx="${x.toFixed(1)}" cy="${Y}" r="6.5" fill="none" stroke="var(--live)"/>` : ''
    }<text x="${x.toFixed(1)}" y="${above ? Y - 16 : Y + 26}" text-anchor="middle" class="ml${focused ? ' mf' : ''}">${esc(p.name.toUpperCase())}</text></g>`;
  }).join('');
  const caption = current
    ? `${current.from} → ${current.to} · by rail · leg ${railIdx + 1} of ${ROUTE.length}`
    : focus?.portId ? `${focus.portId} · where it begins` : 'the rail leg';
  return `<figure class="jmap jmap-rail"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true" role="img">
${base}${lived}${draw}${ticks}
</svg><figcaption>${esc(caption)}</figcaption></figure>`;
}

/** the chapter map (or, with variant 'overview', the home spine's silhouette) */
export function renderChapterMap(slug: string | null, arg?: string, variant?: 'overview', progressPortId?: string): string {
  if (variant === 'overview') return renderOverview(progressPortId);
  const focus: Focus | null = resolveFocus(slug, arg);
  // rail chapters (london/paris/lyon) get the station strip; 'nice' gets the Med plate,
  // ringed with no arriving leg — the map of arriving at the sea, not another train diagram
  if (focus?.portId && LAND_IDS.has(focus.portId)) return renderRailStrip(focus);
  if (typeof focus?.legIndex === 'number' && focus.legIndex <= 2) return renderRailStrip(focus);

  const v = MED_VIEW;
  const split = focus?.portId === 'nice' ? { before: [], current: null, after: ROUTE } : routeSplit(focus);
  const visited = new Set<string>();
  for (const l of split.before) { visited.add(l.from); visited.add(l.to); }
  if (split.current) visited.add(split.current.from);
  if (focus?.portId) visited.add(focus.portId);

  const current = split.current
    ? `<path class="m-draw" d="${pathD(legPoints(split.current, v))}" pathLength="1" fill="none" stroke="var(--live)" stroke-width="1.8"/>`
    : '';
  const caption = split.current
    ? `${split.current.from.replace(/-/g, ' ')} → ${split.current.to.replace(/-/g, ' ')} · ${MODE_WORD[split.current.mode]} · leg ${ROUTE.indexOf(split.current) + 1} of ${ROUTE.length}`
    : focus?.portId
      ? `${focus.portId.replace(/-/g, ' ')} · where it begins`
      : 'the route, entire';

  return `<figure class="jmap"><svg viewBox="0 0 ${v.w} ${v.h}" aria-hidden="true" role="img">
${coastLayer(1.2, 0.3)}${fullRoutePath(v)}${legsPath(split.before, v)}${current}${portsLayer(v, PORTS, visited, focus?.portId, v.w)}
</svg><figcaption>${esc(caption)}</figcaption></figure>`;
}

/** the home silhouette: viewBox cropped to the sea route, anchors edge-safe, honest progress */
function renderOverview(progressPortId?: string): string {
  const v = MED_VIEW;
  const box = seaRouteBbox(v, 34);
  const frameRight = box.x + box.w;
  const visited = new Set<string>();
  if (progressPortId) {
    for (const id of ROUTE_ORDER) { visited.add(id); if (id === progressPortId) break; }
  }
  const doneLegs = ROUTE.filter((l) => visited.has(l.from) && visited.has(l.to));
  const anchors = ['nice', 'valletta'].map((id) => {
    const p = portById(id)!;
    const { x, y } = project(p.lat, p.lon, v);
    const flip = x + 14 + p.name.length * 16 > frameRight; // ~16px/char at font-size 26
    return `<text x="${(flip ? x - 16 : x + 14).toFixed(1)}" y="${(y + 9).toFixed(1)}" text-anchor="${flip ? 'end' : 'start'}" class="ma">${p.name.toUpperCase()}</text>`;
  }).join('');
  const dots = PORTS.filter((p) => !LAND_IDS.has(p.id)).map((p) => {
    const { x, y } = project(p.lat, p.lon, v);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" ${visited.has(p.id) ? 'fill="var(--schist)"' : 'fill="var(--paper)" stroke="var(--schist)" stroke-width="2"'}/>`;
  }).join('');
  return `<figure class="jmap spine-map"><svg viewBox="${box.x.toFixed(0)} ${box.y.toFixed(0)} ${box.w.toFixed(0)} ${box.h.toFixed(0)}" aria-hidden="true" role="img">
${coastLayer(1.6, 0.35)}
<path d="${pathD(ROUTE.flatMap((l) => legPoints(l, v)))}" fill="none" stroke="var(--schist)" stroke-width="2.5" stroke-dasharray="4 7" opacity=".5"/>
${doneLegs.map((l) => `<path d="${pathD(legPoints(l, v))}" fill="none" stroke="var(--ink-dim)" stroke-width="3"/>`).join('')}
${dots}${anchors}
</svg><figcaption>the route · london by rail · nice → valletta by sea</figcaption></figure>`;
}
