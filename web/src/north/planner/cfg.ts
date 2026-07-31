/**
 * The North Planner's decision space — data, not UI. The spine is fixed: QF1 lands LHR on
 * Saturday 15 August 2026, QF2 leaves LHR on Monday 31 August = SIXTEEN nights. Everything
 * between is selectable: EIGHT rival arcs across the whole of Europe, each a chain of segments
 * with steppable nights and per-night costs at two tiers (AUD, for two, ±15%) — 'special' is the
 * memorable hotel, 'sane' is very good without the flourish. Every arc carries its honest case
 * and counter-case, so the debate ships with its own devil's advocate. A live override
 * (D1, GET /api/north/cfg) merges over these — same pattern as the Andes Plotting Table.
 */
export type ArcId =
  | 'fjords' | 'gulet' | 'highlands'
  | 'sicily' | 'dolomiti' | 'cyclades' | 'slovenia' | 'yachtweek'
  | 'sardinia' | 'madeira' | 'portugal' | 'highlow';

export type Tier = 'special' | 'sane';

export interface Segment {
  id: string;
  label: string;
  short: string;
  nights: number; // default
  min: number;
  max: number;
  perNight: { special: number; sane: number }; // AUD, two people, stay + eating at that level
  link?: string;
}

export interface Arc {
  id: ArcId;
  name: string;
  blurb: string;
  caseFor: string;
  caseAgainst: string;
  transport: number; // AUD lump — every flight/car/boat/ferry inside the arc
  segments: Segment[];
}

export interface Cfg {
  nightsTotal: number;
  arcs: Record<ArcId, Arc>;
}

export const NIGHTS_TOTAL = 16;

const LONDON_IN: Segment = { id: 'london1', label: 'London — the pause', short: 'London', nights: 2, min: 0, max: 5, perNight: { special: 1450, sane: 750 }, link: 'https://www.claridges.co.uk' };
const LONDON_OUT: Segment = { id: 'london2', label: 'London — the buffer & the weekend', short: 'London', nights: 3, min: 0, max: 5, perNight: { special: 1450, sane: 750 } };

export const CFG: Cfg = {
  nightsTotal: NIGHTS_TOTAL,
  arcs: {
    fjords: {
      id: 'fjords',
      name: 'The Fjords',
      blurb: 'Sunnmøre, Lofoten, and the aurora watch — water through mountains, working properly this time.',
      caseFor: 'Water through mountains at its absolute best, in the fortnight Europe empties out — the trip Chile was trying to be.',
      caseAgainst: 'It can rain three straight days and never apologise; if the brief is warmth, this is Brisbane winter with better scenery.',
      transport: 4800,
      segments: [
        { ...LONDON_IN },
        { id: 'oye', label: 'Hjørundfjord — Union Øye', short: 'Union Øye', nights: 3, min: 0, max: 5, perNight: { special: 2100, sane: 900 }, link: 'https://www.unionoye.no' },
        { id: 'storfjord', label: 'Storfjord · Geiranger', short: 'Storfjord', nights: 2, min: 0, max: 4, perNight: { special: 1550, sane: 800 }, link: 'https://www.storfjordhotel.com' },
        { id: 'lofoten', label: 'Lofoten — Holmen, Å', short: 'Lofoten', nights: 4, min: 0, max: 6, perNight: { special: 1150, sane: 650 }, link: 'https://www.holmenlofoten.no' },
        { id: 'tromso', label: 'Tromsø — the lights', short: 'Tromsø', nights: 2, min: 0, max: 4, perNight: { special: 750, sane: 450 } },
        { ...LONDON_OUT },
      ],
    },
    gulet: {
      id: 'gulet',
      name: 'The Gulet',
      blurb: 'A private boat out of Split — the warm-sea answer, deck dinners and islands on demand.',
      caseFor: 'A private deck, a crew of three, and islands on demand — nobody else’s schedule touches yours.',
      caseAgainst: 'The boat insulates you from the crowds, not the 34° — you will live in swimwear and mild sweat.',
      transport: 2600,
      segments: [
        { ...LONDON_IN },
        { id: 'split', label: 'Split — embarkation eve', short: 'Split', nights: 1, min: 0, max: 3, perNight: { special: 800, sane: 450 } },
        { id: 'gulet', label: 'The gulet — Dalmatian coast', short: 'Gulet', nights: 7, min: 0, max: 10, perNight: { special: 3400, sane: 1800 } },
        { id: 'dubrovnik', label: 'Dubrovnik — the walls', short: 'Dubrovnik', nights: 3, min: 0, max: 4, perNight: { special: 950, sane: 550 } },
        { ...LONDON_OUT },
      ],
    },
    highlands: {
      id: 'highlands',
      name: 'The Highlands',
      blurb: 'No more aeroplanes — Braemar, Skye and the Fringe, all reachable on wheels.',
      caseFor: 'Zero flights after Saigon-and-back, and The Fife Arms is the best hotel argument in Britain.',
      caseAgainst: 'Midge season, Fringe crowds, and the same grey you flew sixteen thousand kilometres to escape.',
      transport: 1400,
      segments: [
        { ...LONDON_IN },
        { id: 'fife', label: 'Braemar — The Fife Arms', short: 'Fife Arms', nights: 4, min: 0, max: 6, perNight: { special: 2300, sane: 1100 }, link: 'https://thefifearms.com' },
        { id: 'skye', label: 'Skye — the far west', short: 'Skye', nights: 4, min: 0, max: 6, perNight: { special: 1350, sane: 700 } },
        { id: 'edinburgh', label: 'Edinburgh — Fringe week', short: 'Edinburgh', nights: 3, min: 0, max: 4, perNight: { special: 1050, sane: 600 } },
        { ...LONDON_OUT },
      ],
    },
    sicily: {
      id: 'sicily',
      name: 'Sicily',
      blurb: 'Taormina, the Aeolians by hydrofoil, and baroque Noto — the food arc.',
      caseFor: 'The best eating of any arc, Ferragosto energy, and the Aeolians at golden hour justify the whole pivot south.',
      caseAgainst: 'Peak Italian August — 35° inland, everything pre-booked, and Taormina is a queue with a view.',
      transport: 2800,
      segments: [
        { ...LONDON_IN },
        { id: 'taormina', label: 'Taormina — Grand Hotel Timeo', short: 'Taormina', nights: 4, min: 0, max: 6, perNight: { special: 2600, sane: 1100 }, link: 'https://www.belmond.com/hotels/europe/italy/taormina/belmond-grand-hotel-timeo/' },
        { id: 'aeolian', label: 'The Aeolians — Therasia, Salina', short: 'Aeolians', nights: 4, min: 0, max: 6, perNight: { special: 2200, sane: 900 }, link: 'https://www.therasiaresort.it' },
        { id: 'noto', label: 'Noto & Syracuse — the baroque south', short: 'Noto', nights: 3, min: 0, max: 5, perNight: { special: 1500, sane: 700 } },
        { ...LONDON_OUT },
      ],
    },
    dolomiti: {
      id: 'dolomiti',
      name: 'Dolomites + Venice',
      blurb: 'Rifugio lunches under pale towers, with Venice as a two-night flourish.',
      caseFor: 'Alpine mornings, rifugio lunches and real hiking — warmth without the melt, and Venice thrown in.',
      caseAgainst: 'A driving holiday at heart, and August passes mean cyclists and campervans at twenty an hour.',
      transport: 2200,
      segments: [
        { ...LONDON_IN },
        { id: 'venice', label: 'Venice — the flourish', short: 'Venice', nights: 2, min: 0, max: 4, perNight: { special: 2400, sane: 1000 } },
        { id: 'altabadia', label: 'Alta Badia — the high pastures', short: 'Alta Badia', nights: 5, min: 0, max: 7, perNight: { special: 1700, sane: 900 } },
        { id: 'cortina', label: 'Cortina & Val Gardena', short: 'Cortina', nights: 4, min: 0, max: 6, perNight: { special: 1600, sane: 850 } },
        { ...LONDON_OUT },
      ],
    },
    cyclades: {
      id: 'cyclades',
      name: 'Greek Islands',
      blurb: 'Milos and Sifnos — the Cyclades with taste, no caldera coach parties.',
      caseFor: 'Milos and Sifnos are what Santorini pretends to be — the warm-sea answer, done quietly.',
      caseAgainst: 'The meltemi owns the August ferry timetable, and every island plan needs a flex day it may actually use.',
      transport: 3000,
      segments: [
        { ...LONDON_IN },
        { id: 'athens1', label: 'Athens — the landing', short: 'Athens', nights: 1, min: 0, max: 3, perNight: { special: 900, sane: 500 } },
        { id: 'milos', label: 'Milos — the volcanic coast', short: 'Milos', nights: 4, min: 0, max: 6, perNight: { special: 1600, sane: 800 } },
        { id: 'sifnos', label: 'Sifnos — the eating island', short: 'Sifnos', nights: 4, min: 0, max: 6, perNight: { special: 1400, sane: 700 } },
        { id: 'athens2', label: 'Athens — the exhale', short: 'Athens', nights: 2, min: 0, max: 3, perNight: { special: 900, sane: 500 } },
        { ...LONDON_OUT },
      ],
    },
    slovenia: {
      id: 'slovenia',
      name: 'Slovenia + Alps',
      blurb: 'Bled, the Soča, Hiša Franko and karst wine — the quiet genius nobody debates for.',
      caseFor: 'Alpine lakes, a world-top-fifty table at Hiša Franko, and no crowds because nobody thinks to argue for it.',
      caseAgainst: 'No sea, no name-drop, and if it rains it is simply a wet week in the mountains.',
      transport: 1800,
      segments: [
        { ...LONDON_IN },
        { id: 'bled', label: 'Bled & Bohinj — the lakes', short: 'Bled', nights: 4, min: 0, max: 6, perNight: { special: 1300, sane: 700 } },
        { id: 'soca', label: 'The Soča — Hiša Franko country', short: 'Soča', nights: 3, min: 0, max: 5, perNight: { special: 1200, sane: 650 }, link: 'https://www.hisafranko.com' },
        { id: 'vipava', label: 'Vipava & the karst — the cellars', short: 'Vipava', nights: 2, min: 0, max: 4, perNight: { special: 900, sane: 500 } },
        { id: 'ljubljana', label: 'Ljubljana — the exhale', short: 'Ljubljana', nights: 2, min: 0, max: 3, perNight: { special: 800, sane: 450 } },
        { ...LONDON_OUT },
      ],
    },
    sardinia: {
      id: 'sardinia',
      name: 'Sardinia',
      blurb: 'The Costa Smeralda, inland Barbagia, and the clearest swimming water in Europe.',
      caseFor: 'The best swimming water in Europe, full stop — and inland Barbagia is another century entirely.',
      caseAgainst: 'Ferragosto on the Costa Smeralda is the most expensive fortnight on the Mediterranean, and every bill shows it.',
      transport: 2600,
      segments: [
        { ...LONDON_IN },
        { id: 'smeralda', label: 'Costa Smeralda — the emerald coast', short: 'C. Smeralda', nights: 4, min: 0, max: 6, perNight: { special: 3800, sane: 1400 } },
        { id: 'barbagia', label: 'Barbagia — Su Gologone, inland', short: 'Barbagia', nights: 3, min: 0, max: 5, perNight: { special: 1100, sane: 700 }, link: 'https://www.sugologone.it' },
        { id: 'chia', label: 'Chia & the south — the long beaches', short: 'Chia', nights: 4, min: 0, max: 6, perNight: { special: 1600, sane: 800 } },
        { ...LONDON_OUT },
      ],
    },
    madeira: {
      id: 'madeira',
      name: 'Madeira',
      blurb: 'Reid’s on the cliff, levadas in the laurel forest — the island August cannot crowd.',
      caseFor: 'The crowd-proof answer — 26° every day, levada walks in world-heritage forest, and Reid’s Palace on its cliff; August barely registers there.',
      caseAgainst: 'It is not the Med — the ocean is for looking at, the pools are for swimming, and nightlife is a clifftop gin at nine.',
      transport: 2000,
      segments: [
        { ...LONDON_IN },
        { id: 'funchal', label: 'Funchal — Reid’s Palace', short: 'Funchal', nights: 5, min: 0, max: 7, perNight: { special: 1900, sane: 900 }, link: 'https://www.belmond.com/hotels/europe/portugal/madeira/belmond-reids-palace/' },
        { id: 'pontasol', label: 'Ponta do Sol — the sunset west', short: 'West coast', nights: 4, min: 0, max: 6, perNight: { special: 1100, sane: 600 } },
        { id: 'santana', label: 'Santana — the laurel north', short: 'Santana', nights: 2, min: 0, max: 4, perNight: { special: 800, sane: 500 } },
        { ...LONDON_OUT },
      ],
    },
    portugal: {
      id: 'portugal',
      name: 'Portugal',
      blurb: 'Lisbon light, Comporta pines, and the Douro on the eve of harvest.',
      caseFor: 'Lisbon light, Comporta’s pines-and-rice-fields cool, and the Douro in late August is harvest-eve gold.',
      caseAgainst: 'The Atlantic is eighteen degrees and means it, and week one is Portugal’s own holidays — Comporta is Lisbon-on-sea.',
      transport: 2200,
      segments: [
        { ...LONDON_IN },
        { id: 'lisbon', label: 'Lisbon — the light', short: 'Lisbon', nights: 3, min: 0, max: 5, perNight: { special: 1300, sane: 700 } },
        { id: 'comporta', label: 'Comporta — pines and rice fields', short: 'Comporta', nights: 4, min: 0, max: 6, perNight: { special: 2200, sane: 1000 }, link: 'https://www.sublimecomporta.pt' },
        { id: 'douro', label: 'The Douro — Six Senses, harvest eve', short: 'Douro', nights: 3, min: 0, max: 5, perNight: { special: 2400, sane: 1100 }, link: 'https://www.sixsenses.com/en/resorts/douro-valley/' },
        { id: 'porto', label: 'Porto — the exhale', short: 'Porto', nights: 1, min: 0, max: 3, perNight: { special: 900, sane: 550 } },
        { ...LONDON_OUT },
      ],
    },
    highlow: {
      id: 'highlow',
      name: 'North → South',
      blurb: 'Lofoten and the lights in the quiet week, then south to the party as Europe empties.',
      caseFor: 'The crowd curve played perfectly — Arctic scenery while the Med is rammed, the flotilla the very Saturday everyone else goes back to work.',
      caseAgainst: 'Two climates, one suitcase, and a full travel day over Oslo in the middle — this arc earns its scenery in airports.',
      transport: 5200,
      segments: [
        { id: 'london1', label: 'London — one night to land', short: 'London', nights: 1, min: 0, max: 3, perNight: { special: 1450, sane: 750 }, link: 'https://www.claridges.co.uk' },
        { id: 'lofoten', label: 'Lofoten — Holmen, Å', short: 'Lofoten', nights: 4, min: 0, max: 6, perNight: { special: 1150, sane: 650 }, link: 'https://www.holmenlofoten.no' },
        { id: 'tromso', label: 'Tromsø — the lights open', short: 'Tromsø', nights: 2, min: 0, max: 4, perNight: { special: 750, sane: 450 } },
        { id: 'tyw', label: 'The Yacht Week — Sat 22, as the Med empties', short: 'Flotilla', nights: 7, min: 0, max: 7, perNight: { special: 2000, sane: 1200 }, link: 'https://www.theyachtweek.com' },
        { id: 'london2', label: 'London — the buffer & the weekend', short: 'London', nights: 2, min: 0, max: 5, perNight: { special: 1450, sane: 750 } },
      ],
    },
    yachtweek: {
      id: 'yachtweek',
      name: 'Yacht Week',
      blurb: 'The Croatia flotilla — Split to Hvar to Vis, raft-ups, and Hvar to recover.',
      caseFor: 'The story you will tell for a decade — a flotilla, Hvar at 3am, and a fortnight nobody at Coastal will believe.',
      caseAgainst: 'The average age aboard is twenty-six, the sleep is theoretical, and it is the hottest week of the Croatian year.',
      transport: 2400,
      segments: [
        { ...LONDON_IN },
        { id: 'split', label: 'Split — embarkation eve', short: 'Split', nights: 1, min: 0, max: 3, perNight: { special: 800, sane: 450 } },
        { id: 'tyw', label: 'The Yacht Week — Split–Hvar–Vis', short: 'Flotilla', nights: 7, min: 0, max: 7, perNight: { special: 2000, sane: 1200 }, link: 'https://www.theyachtweek.com' },
        { id: 'hvar', label: 'Hvar — Palace Elisabeth, to recover', short: 'Hvar', nights: 3, min: 0, max: 5, perNight: { special: 1600, sane: 800 } },
        { ...LONDON_OUT },
      ],
    },
  },
};

/** The chosen shape: an arc, a cost tier, and (possibly stepped) nights per segment id. */
export interface Selection {
  arc: ArcId;
  tier: Tier;
  nights: Record<string, number>;
}

export function defaultSelection(arc: ArcId, cfg: Cfg = CFG, tier: Tier = 'special'): Selection {
  const nights: Record<string, number> = {};
  for (const s of cfg.arcs[arc].segments) nights[s.id] = s.nights;
  return { arc, tier, nights };
}

export const DEFAULT_SELECTION: Selection = defaultSelection('fjords');

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A calendar label N nights after 15 August 2026 (QF1 lands LHR that morning). */
export function dateAt(off: number): string {
  const d = new Date(2026, 7, 15);
  d.setDate(d.getDate() + off);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
}

export function aud(n: number): string {
  return `$${Math.round(n).toLocaleString('en-AU')}`;
}

/** Deep-merge an override (from /api/north/cfg) over the canonical CFG. Arcs replace by id. */
export function mergeCfg(base: Cfg, override: Partial<Cfg> | null | undefined): Cfg {
  if (!override) return base;
  return {
    ...base,
    ...override,
    arcs: { ...base.arcs, ...(override.arcs ?? {}) },
  };
}
