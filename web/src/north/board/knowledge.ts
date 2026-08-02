/**
 * Board knowledge — the why and the beds, per destination node, written for exactly two
 * travellers: a couple in their mid-40s, ten years of Platinum, budget-minded but allergic to
 * bad weather and mediocrity. One honest why; two beds each (the good room and the sane room).
 */
export interface HotelRec {
  name: string;
  tier: 'good' | 'sane';
  note: string;
  url?: string;
}

export interface NodeKnowledge {
  why: string;
  hotels: HotelRec[];
}

export const KNOWLEDGE: Record<string, NodeKnowledge> = {
  london: {
    why: 'The hinge of the whole fortnight — theatre, one serious dinner, and the QF2 wall. Never the destination, always the reset.',
    hotels: [
      { name: 'Claridge’s', tier: 'good', note: 'the occasion version of a reset', url: 'https://www.claridges.co.uk' },
      { name: 'The Zetter Clerkenwell', tier: 'sane', note: 'quiet, characterful, walkable to real restaurants' },
    ],
  },
  edinburgh: {
    why: 'Fringe until 31 Aug — the city at maximum voltage. Electric for one or two nights, exhausting for four.',
    hotels: [
      { name: 'Gleneagles Townhouse', tier: 'good', note: 'members-club energy on St Andrew Square', url: 'https://gleneagles.com/townhouse' },
      { name: 'Eden Locke', tier: 'sane', note: 'apart-hotel calm above the George Street noise' },
    ],
  },
  lofoten: {
    why: 'Empty from the 17th when Norwegian schools return — the best scenery-per-day in Europe with the peaks to yourselves.',
    hotels: [
      { name: 'Holmen Lofoten', tier: 'good', note: 'the last village; Kitchen on the Edge dinners', url: 'https://www.holmenlofoten.no' },
      { name: 'Eliassen Rorbuer, Hamnøy', tier: 'sane', note: 'the postcard cabins — book the sea-facing rows' },
    ],
  },
  tromso: {
    why: 'The aurora window opens ~20 Aug. Two nights is a hunt; the city itself is a harbour, a bridge and good seafood.',
    hotels: [
      { name: 'Scandic Ishavshotel', tier: 'good', note: 'harbourfront, ask high floor north-facing', url: 'https://www.scandichotels.com' },
      { name: 'Clarion The Edge', tier: 'sane', note: 'modern, central, does the job' },
    ],
  },
  venice: {
    why: 'A two-night flourish, not a base — August Venice is a sauna with queues, but dawn on the lagoon forgives it.',
    hotels: [
      { name: 'The Gritti Palace', tier: 'good', note: 'the Canal Grande balcony cliché, worth it once', url: 'https://www.marriott.com' },
      { name: 'Ca’ di Dio', tier: 'sane', note: 'design-quiet on the Riva, away from the crush' },
    ],
  },
  cortina: {
    why: 'Rifugio lunches under pale towers; late August is the quiet sweet spot after Italian holidays ebb.',
    hotels: [
      { name: 'Rosapetra Spa Resort', tier: 'good', note: 'alpine-modern with a real spa for hiking legs' },
      { name: 'Hotel de la Poste', tier: 'sane', note: 'the classic Cortina address, creaky in the good way' },
    ],
  },
  bled: {
    why: 'Alpine lakes while the Med boils, and Hiša Franko within reach — the quiet-genius base nobody debates for.',
    hotels: [
      { name: 'Vila Bled', tier: 'good', note: 'Tito’s lakeside villa, faded-grand, unbeatable position' },
      { name: 'Garden Village Bled', tier: 'sane', note: 'glamping done properly — treehouses over a stream' },
    ],
  },
  split: {
    why: 'The gateway, not the stay — embarkation eve inside Diocletian’s walls, dinner, boat in the morning.',
    hotels: [
      { name: 'Vestibul Palace', tier: 'good', note: 'sleeping inside a Roman palace, seven rooms' },
      { name: 'Hotel Park', tier: 'sane', note: 'Bačvice-side classic, pool, easy transfers' },
    ],
  },
  hvar: {
    why: 'The party is available, not compulsory — big night at Carpe Diem, recovery swim by noon; late Aug takes the edge off.',
    hotels: [
      { name: 'Palace Elisabeth', tier: 'good', note: 'the grande dame on the main square', url: 'https://suncanihvar.com' },
      { name: 'Riva Marina', tier: 'sane', note: 'front-row on the yacht harbour — earplugs included, spiritually' },
    ],
  },
  dubrovnik: {
    why: 'Disembarkation theatre — the walls at 7am before the ships, then a direct flight to London exists all summer.',
    hotels: [
      { name: 'Villa Dubrovnik', tier: 'good', note: 'cliff, sea platform, old town by boat shuttle', url: 'https://www.villa-dubrovnik.hr' },
      { name: 'Hotel Kompas', tier: 'sane', note: 'Lapad bay, swimmable, bus-close to the walls' },
    ],
  },
  taormina: {
    why: 'The best eating of the board and Etna behind it — post-Ferragosto the queues thin and the light goes gold.',
    hotels: [
      { name: 'Grand Hotel Timeo', tier: 'good', note: 'the terrace under the Greek theatre', url: 'https://www.belmond.com' },
      { name: 'Villa Ducale', tier: 'sane', note: 'family-run, Etna views, honest luxury' },
    ],
  },
  olbia: {
    why: 'Europe’s clearest water — silly money in Ferragosto week, half price and warmer sea from the 22nd.',
    hotels: [
      { name: 'Petra Segreta, San Pantaleo', tier: 'good', note: 'granite-hills retreat above the Costa Smeralda circus' },
      { name: 'Su Gologone, Oliena', tier: 'sane', note: 'inland Barbagia icon — another century, an hour away', url: 'https://www.sugologone.it' },
    ],
  },
  milos: {
    why: 'What Santorini pretends to be — volcanic coves, Sarakiniko moonscape, and the meltemi as the only bully.',
    hotels: [
      { name: 'Milos Cove', tier: 'good', note: 'private-cove suites on the quiet south side', url: 'https://miloscove.com' },
      { name: 'Salt Suites, Pollonia', tier: 'sane', note: 'white-on-white calm in the eating village' },
    ],
  },
  lisbon: {
    why: 'Atlantic light and a food city that never needs a booking war — the un-Med warm option.',
    hotels: [
      { name: 'Bairro Alto Hotel', tier: 'good', note: 'rooftop over the Tejo, everything walkable' },
      { name: 'Memmo Alfama', tier: 'sane', note: 'terrace pool hidden in the old quarter' },
    ],
  },
  funchal: {
    why: 'The crowd-proof island — 26° like a metronome while the Med boils, levadas in world-heritage forest.',
    hotels: [
      { name: 'Reid’s Palace', tier: 'good', note: 'the cliff, the tea, the 130-year habit', url: 'https://www.belmond.com' },
      { name: 'Castanheiro Boutique', tier: 'sane', note: 'five old townhouses stitched together downtown' },
    ],
  },
};
