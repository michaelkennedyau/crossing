export { nudgeLabels } from '../../web/src/north/board/geo';

/**
 * Journal map geometry — pure, no Env. Portrait Med plate (the Nice→Valletta run is taller
 * than wide; a landscape canvas would stretch Italy 2.1×) and a rail-diagram view for the
 * land chapters. LOCKSTEP: MED_VIEW must equal the `med` config in web/scripts/gen-coast.mjs.
 */

export interface MapView { w: number; h: number; pad: number; lonMin: number; lonMax: number; latMin: number; latMax: number }

export const MED_VIEW: MapView = { w: 560, h: 620, pad: 24, lonMin: 6.4, lonMax: 16.0, latMin: 35.3, latMax: 44.9 };
export const LAND_VIEW: MapView = { w: 560, h: 620, pad: 24, lonMin: -1.5, lonMax: 8.5, latMin: 43.0, latMax: 52.2 };

export function project(lat: number, lon: number, v: MapView): { x: number; y: number } {
  return {
    x: v.pad + ((lon - v.lonMin) / (v.lonMax - v.lonMin)) * (v.w - v.pad * 2),
    y: v.pad + ((v.latMax - lat) / (v.latMax - v.latMin)) * (v.h - v.pad * 2),
  };
}

export interface Port { id: string; name: string; lat: number; lon: number; side?: 'left' | 'right' }

export const PORTS: Port[] = [
  { id: 'london', name: 'London', lat: 51.51, lon: -0.13 },
  { id: 'paris', name: 'Paris', lat: 48.85, lon: 2.35 },
  { id: 'lyon', name: 'Lyon', lat: 45.76, lon: 4.84 },
  { id: 'nice', name: 'Nice', lat: 43.7, lon: 7.27 },
  { id: 'calvi', name: 'Calvi', lat: 42.567, lon: 8.757, side: 'left' },
  { id: 'saint-florent', name: 'Saint-Florent', lat: 42.681, lon: 9.304 },
  { id: 'portoferraio', name: 'Portoferraio', lat: 42.812, lon: 10.313 },
  { id: 'portofino', name: 'Portofino', lat: 44.303, lon: 9.21 },
  { id: 'giglio', name: 'Giglio', lat: 42.362, lon: 10.921, side: 'left' },
  { id: 'porto-ercole', name: 'Porto Ercole', lat: 42.391, lon: 11.205 },
  { id: 'lipari', name: 'Lipari', lat: 38.467, lon: 14.954, side: 'left' },
  { id: 'taormina', name: 'Taormina', lat: 37.85, lon: 15.29, side: 'left' },
  { id: 'valletta', name: 'Valletta', lat: 35.9, lon: 14.51 },
  { id: 'pozzallo', name: 'Pozzallo', lat: 36.73, lon: 14.847 },
  { id: 'palermo', name: 'Palermo', lat: 38.12, lon: 13.36, side: 'left' },
];

const PORT_BY_ID = new Map(PORTS.map((p) => [p.id, p]));
export const portById = (id: string): Port | undefined => PORT_BY_ID.get(id);

export type LegMode = 'rail' | 'sea' | 'ferry';
export interface Leg { from: string; to: string; mode: LegMode; via?: [number, number][] }

export const ROUTE: Leg[] = [
  { from: 'london', to: 'paris', mode: 'rail' },
  { from: 'paris', to: 'lyon', mode: 'rail' },
  { from: 'lyon', to: 'nice', mode: 'rail' },
  { from: 'nice', to: 'calvi', mode: 'sea' },
  { from: 'calvi', to: 'saint-florent', mode: 'sea' },
  { from: 'saint-florent', to: 'portoferraio', mode: 'sea', via: [[43.01, 9.44]] }, // round Cap Corse
  { from: 'portoferraio', to: 'portofino', mode: 'sea' },
  { from: 'portofino', to: 'giglio', mode: 'sea' },
  { from: 'giglio', to: 'porto-ercole', mode: 'sea' },
  { from: 'porto-ercole', to: 'lipari', mode: 'sea' },                              // the sea day
  { from: 'lipari', to: 'taormina', mode: 'sea', via: [[38.26, 15.64]] },           // Strait of Messina
  { from: 'taormina', to: 'valletta', mode: 'sea' },
  { from: 'valletta', to: 'pozzallo', mode: 'ferry' },
  { from: 'pozzallo', to: 'palermo', mode: 'rail' },
];

// route ids in visit order (dedup — every port appears once)
export const ROUTE_ORDER: string[] = [ROUTE[0].from, ...ROUTE.map((l) => l.to)];

const ALIASES: Record<string, string> = {
  'gare-du-nord': 'paris', 'naxos': 'taormina', 'giardini-naxos': 'taormina',
  'elba': 'portoferraio', 'st-florent': 'saint-florent', 'cap-corse': 'saint-florent',
  'malta': 'valletta', 'mdina': 'valletta', 'crossing': 'palermo', 'monreale': 'palermo',
};

export interface Focus { portId?: string; legIndex?: number }

/** explicit arg wins ('nice' or 'porto-ercole--lipari'); else the slug's tail resolves */
export function resolveFocus(slug: string | null, arg?: string): Focus | null {
  if (arg) {
    if (arg.includes('--')) {
      const [a, b] = arg.split('--');
      const i = ROUTE.findIndex((l) => l.from === a && l.to === b);
      return i >= 0 ? { legIndex: i } : null;
    }
    const id = ALIASES[arg] ?? arg;
    return PORT_BY_ID.has(id) ? { portId: id } : null;
  }
  if (!slug) return null;
  const tail = slug.replace(/^ch\d+[a-z]?-/, '');
  const id = ALIASES[tail] ?? (PORT_BY_ID.has(tail) ? tail : undefined);
  if (id && PORT_BY_ID.has(id)) return { portId: id };
  // try any port id contained in the tail (e.g. 'the-1140' no, 'knights-city' no)
  for (const p of PORTS) if (tail.includes(p.id)) return { portId: p.id };
  return null;
}

export interface RouteSplit { before: Leg[]; current: Leg | null; after: Leg[] }

/** legs strictly before the arriving leg / the arriving (or focused) leg / the rest */
export function routeSplit(focus: Focus | null): RouteSplit {
  if (!focus) return { before: [], current: null, after: [...ROUTE] };
  let idx = -1;
  if (typeof focus.legIndex === 'number') idx = focus.legIndex;
  else if (focus.portId) idx = ROUTE.findIndex((l) => l.to === focus.portId);
  if (idx < 0) return { before: [], current: null, after: [...ROUTE] }; // e.g. London: no arriving leg
  return { before: ROUTE.slice(0, idx), current: ROUTE[idx], after: ROUTE.slice(idx + 1) };
}

/** the sea route's own bbox (land cities excluded) — the overview crops to this */
export function seaRouteBbox(v: MapView, pad = 30): { x: number; y: number; w: number; h: number } {
  const land = new Set(['london', 'paris', 'lyon']);
  const pts: { x: number; y: number }[] = [];
  for (const p of PORTS) if (!land.has(p.id)) pts.push(project(p.lat, p.lon, v));
  for (const l of ROUTE) for (const [lat, lon] of l.via ?? []) pts.push(project(lat, lon, v));
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad;
  return { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y };
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2026-08-14' → 'Thu 14 Aug' — dates as memory, not logs. Bad input returns itself. */
export function fmtDay(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** deterministic money formatting for ledger blocks — no Intl surprises */
export function fmtAmount(amount: string): string {
  const m = amount.match(/^([€£$]?)\s*([\d,.]+)\s*([A-Z]{3})?$/);
  if (!m) return amount;
  const [, sym, num, ccy] = m;
  const s = sym || (ccy === 'EUR' ? '€' : ccy === 'GBP' ? '£' : ccy ? `${ccy} ` : '');
  return `${s}${num}`;
}
