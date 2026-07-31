/**
 * Real properties + operators along the northern route, verified live. Surfaced as rationed links
 * on the Voyage legs (the ember marks the chosen path; these stay quiet) and in the Bridge ledger.
 */
import type { Place } from './places';

// keyed by data-leg — a single quiet link per relevant leg
export const NORTH_LEG_PLACES: Record<string, Place> = {
  '01': { kind: 'stay', name: 'Sheraton Saigon Grand Opera', url: 'https://www.marriott.com/en-us/hotels/sgnsi-sheraton-saigon-grand-opera-hotel/' },
  '02': { kind: 'stay', name: 'Raffles Singapore', url: 'https://www.raffles.com/singapore/' },
  '05': { kind: 'stay', name: 'Hotel Union Øye', url: 'https://www.unionoye.no' },
  '06': { kind: 'stay', name: 'Storfjord Hotel', url: 'https://www.storfjordhotel.com' },
  '07': { kind: 'stay', name: 'Holmen Lofoten', url: 'https://www.holmenlofoten.no' },
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
