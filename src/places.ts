/**
 * Real properties + operators along the route, verified live. Surfaced as rationed links on the
 * Voyage legs (the ember marks the chosen path; these stay quiet) and in the Bridge logistics.
 */
export interface Place {
  kind: string;
  name: string;
  url: string;
}

// keyed by data-leg — a single quiet link per relevant leg
export const LEG_PLACES: Record<string, Place> = {
  '01': { kind: 'cross with', name: 'Cruce Andino', url: 'https://www.cruceandino.com' },
  '02': { kind: 'stay', name: 'Hotel Natura · Peulla', url: 'https://www.hotelnatura.cl' },
  '04': { kind: 'stay', name: 'Llao Llao', url: 'https://www.llaollao.com' },
  '05': { kind: 'ski', name: 'Cerro Catedral', url: 'https://www.catedralaltapatagonia.com' },
};

// all links (Bridge logistics + second-act arcs)
export const LINKS = {
  cruceAndino: 'https://www.cruceandino.com',
  peulla: 'https://www.hotelnatura.cl',
  llaoLlao: 'https://www.llaollao.com',
  catedral: 'https://www.catedralaltapatagonia.com',
  cavas: 'https://www.cavaswinelodge.com',
  theVines: 'https://www.vinesresortandspa.com',
  awasiIguazu: 'https://www.awasi.com/awasi-iguazu',
};
