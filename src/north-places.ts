/**
 * Real properties + operators along the northern route, verified live. Surfaced as rationed links
 * on the Voyage legs (the ember marks the chosen path; these stay quiet) and in the Bridge ledger.
 */
import type { Place } from './places';

// keyed by data-leg — a single quiet link per relevant leg (ids match the redesigned "why" page:
// 02 Saigon · 03 Singapore · 10 the all-cool family · 11 the all-warm family)
export const NORTH_LEG_PLACES: Record<string, Place> = {
  '02': { kind: 'stay', name: 'Sheraton Saigon Grand Opera', url: 'https://www.marriott.com/en-us/hotels/sgnsi-sheraton-saigon-grand-opera-hotel/' },
  '03': { kind: 'stay', name: 'Raffles Singapore', url: 'https://www.raffles.com/singapore/' },
  '10': { kind: 'stay', name: 'Holmen Lofoten', url: 'https://www.holmenlofoten.no' },
  '11': { kind: 'sail with', name: 'The Yacht Week', url: 'https://www.theyachtweek.com' },
};

// all links (Bridge ledger + rival arcs)
export const NORTH_LINKS = {
  sheraton: 'https://www.marriott.com/en-us/hotels/sgnsi-sheraton-saigon-grand-opera-hotel/',
  raffles: 'https://www.raffles.com/singapore/',
  unionOye: 'https://www.unionoye.no',
  storfjord: 'https://www.storfjordhotel.com',
  holmen: 'https://www.holmenlofoten.no',
  claridges: 'https://www.claridges.co.uk',
  fifeArms: 'https://thefifearms.com',
  connect26: 'https://www.connect26.com.au',
};
