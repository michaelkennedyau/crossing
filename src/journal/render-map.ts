import { COASTS_MED } from '../../web/src/north/board/coast-med';
import {
  LAND_VIEW, MED_VIEW, PORTS, ROUTE, ROUTE_ORDER, nudgeLabels, portById, project,
  resolveFocus, routeSplit, type Focus, type Leg, type MapView, type Port,
} from './map-geo';

/**
 * Per-chapter route maps — server-rendered SVG in the CROWD_CURVE idiom: figure +
 * figcaption, CSS-var strokes, pathLength draw-in (CSS-only; reader pages ship no JS).
 * A napkin sketch, not cartography. Land chapters get the rail-diagram LAND_VIEW.
 */

const esc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const LAND_IDS = new Set(['london', 'paris', 'lyon']);

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

function portsLayer(v: MapView, ports: Port[], visited: Set<string>, focusedId?: string): string {
  const projected = ports.map((p) => ({ p, ...project(p.lat, p.lon, v) }));
  const inView = projected
    .filter(({ x, y }) => x >= 0 && y >= 0 && x <= v.w && y <= v.h)
    .map(({ p, x, y }) => ({ p, x, y, side: p.side ?? ((x > v.w - 90 ? 'left' : 'right') as 'left' | 'right') }));
  const dyOf = nudgeLabels(inView.map(({ p, x, y, side }) => ({ id: p.id, x, y, side })));
  return inView.map(({ p, x, y, side }) => {
    const focused = p.id === focusedId;
    const past = visited.has(p.id);
    const dy = dyOf[p.id] ?? 0;
    const lx = side === 'left' ? x - 8 : x + 8;
    const anchor = side === 'left' ? 'end' : 'start';
    const leader = Math.abs(dy) > 5 ? `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${lx.toFixed(1)}" y2="${(y + dy).toFixed(1)}" stroke="var(--line)" stroke-width=".7"/>` : '';
    return `<g>${leader}<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" ${
      focused ? 'fill="var(--live)"' : past ? 'fill="var(--schist)"' : 'fill="var(--paper)" stroke="var(--schist)"'}/>${
      focused ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6.5" fill="none" stroke="var(--live)"/>` : ''
    }<text x="${lx.toFixed(1)}" y="${(y + dy + 3).toFixed(1)}" text-anchor="${anchor}" class="ml${focused ? ' mf' : ''}">${esc(p.name.toUpperCase())}</text></g>`;
  }).join('');
}

const MODE_WORD: Record<Leg['mode'], string> = { sea: 'by sea', rail: 'by rail', ferry: 'by ferry' };

/** the chapter map (or, with variant 'overview', the home spine's silhouette) */
export function renderChapterMap(slug: string | null, arg?: string, variant?: 'overview', progressPortId?: string): string {
  if (variant === 'overview') return renderOverview(progressPortId);
  const focus: Focus | null = resolveFocus(slug, arg);
  const land = focus?.portId ? LAND_IDS.has(focus.portId) : false;
  const v = land ? LAND_VIEW : MED_VIEW;
  const split = routeSplit(focus);

  const visited = new Set<string>();
  for (const l of split.before) { visited.add(l.from); visited.add(l.to); }
  if (split.current) visited.add(split.current.from);
  if (focus?.portId) visited.add(focus.portId);

  const coast = land ? '' : COASTS_MED.map((d) => `<path d="${d}" fill="none" stroke="var(--line)" stroke-width="1"/>`).join('');
  const current = split.current
    ? `<path class="m-draw" d="${pathD(legPoints(split.current, v))}" pathLength="1" fill="none" stroke="var(--live)" stroke-width="1.8"/>`
    : '';

  const showPorts = land ? PORTS.filter((p) => LAND_IDS.has(p.id) || p.id === 'nice') : PORTS;
  const caption = split.current
    ? `${split.current.from.replace(/-/g, ' ')} → ${split.current.to.replace(/-/g, ' ')} · ${MODE_WORD[split.current.mode]} · leg ${ROUTE.indexOf(split.current) + 1} of ${ROUTE.length}`
    : focus?.portId
      ? `${focus.portId.replace(/-/g, ' ')} · where it begins`
      : 'the route, entire';

  return `<figure class="jmap"><svg viewBox="0 0 ${v.w} ${v.h}" aria-hidden="true" role="img">
${coast}${fullRoutePath(v)}${legsPath(split.before, v)}${current}${portsLayer(v, showPorts, visited, focus?.portId)}
</svg><figcaption>${esc(caption)}</figcaption></figure>`;
}

/** the home spine's small silhouette: whole route, two anchors, truth about progress */
function renderOverview(progressPortId?: string): string {
  const v = MED_VIEW;
  const visited = new Set<string>();
  if (progressPortId) {
    for (const id of ROUTE_ORDER) { visited.add(id); if (id === progressPortId) break; }
  }
  const doneLegs = ROUTE.filter((l) => visited.has(l.from) && visited.has(l.to));
  const anchors = ['nice', 'valletta'].map((id) => {
    const p = portById(id)!;
    const { x, y } = project(p.lat, p.lon, v);
    return `<text x="${(x + 12).toFixed(1)}" y="${(y + 8).toFixed(1)}" class="ma">${p.name.toUpperCase()}</text>`;
  }).join('');
  const dots = PORTS.filter((p) => !LAND_IDS.has(p.id)).map((p) => {
    const { x, y } = project(p.lat, p.lon, v);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" ${visited.has(p.id) ? 'fill="var(--schist)"' : 'fill="var(--paper)" stroke="var(--schist)" stroke-width="2"'}/>`;
  }).join('');
  return `<figure class="jmap spine-map"><svg viewBox="0 0 ${v.w} ${v.h}" aria-hidden="true" role="img">
${COASTS_MED.map((d) => `<path d="${d}" fill="none" stroke="var(--line)" stroke-width="1.5"/>`).join('')}
<path d="${pathD(ROUTE.flatMap((l) => legPoints(l, v)))}" fill="none" stroke="var(--schist)" stroke-width="2.5" stroke-dasharray="4 7" opacity=".5"/>
${doneLegs.map((l) => `<path d="${pathD(legPoints(l, v))}" fill="none" stroke="var(--ink-dim)" stroke-width="3"/>`).join('')}
${dots}${anchors}
</svg><figcaption>the route · london by rail · nice → valletta by sea</figcaption></figure>`;
}
