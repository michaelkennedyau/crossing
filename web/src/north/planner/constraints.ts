import type { Selection } from './cfg';
import type { ComputeResult } from './compute';

/**
 * Constraint rules as data — flags surfaced on conflict, and the open questions per arc.
 * Same grammar as the Andes constraints: rules over the selection, not conditionals in the view.
 */
export interface Flag {
  level: 'ok' | 'note' | 'warn';
  text: string;
}

// Best-of-both combos: the arc's warm half should not begin before the Med empties (~Sat 22, night 7).
const COMBO_WARM: Record<string, string> = {
  highlow: 'tyw',
  dolosicily: 'taormina',
  scotgreece: 'milos',
  slovcroatia: 'gulet',
  norsardinia: 'smeralda',
};

export function flagsFor(sel: Selection, c: ComputeResult): Flag[] {
  const f: Flag[] = [];

  if (c.delta !== 0) {
    const dir = c.delta > 0 ? `trim ${c.delta}` : `add ${-c.delta}`;
    f.push({ level: 'warn', text: `${c.totalNights} nights against a fixed 19 — QF2 leaves LHR on Wednesday 2 September regardless. ${dir[0].toUpperCase()}${dir.slice(1)} night${Math.abs(c.delta) === 1 ? '' : 's'} somewhere.` });
  }

  const endsInLondon = c.lastCell?.id === 'london2';
  const finalNights = endsInLondon ? c.lastCell!.nights : 0;
  if (!endsInLondon || finalNights < 1)
    f.push({ level: 'warn', text: 'Never fly into a same-day QF2 on a separate ticket — keep at least one London night at the end as the buffer.' });
  else if (finalNights === 1)
    f.push({ level: 'note', text: 'One London night before QF2 is the legal minimum; two turns the buffer into a weekend.' });

  if (sel.arc === 'fjords') {
    if ((sel.nights['oye'] ?? 0) > 0 || (sel.nights['lofoten'] ?? 0) > 0)
      f.push({ level: 'note', text: 'Union Øye and Holmen are single-digit-room houses two weeks out in August — hold rooms first, debate nights after.' });
    const tromso = c.cells.find((x) => x.id === 'tromso');
    if (tromso && tromso.startOff + tromso.nights < 6)
      f.push({ level: 'note', text: 'The aurora season only opens around 20 August — a Tromsø watch that ends before then is a city break, not a lights hunt.' });
  }

  if (sel.arc === 'gulet') {
    f.push({ level: 'warn', text: 'Mid-August Dalmatia is 34°C and the whole continent afloat — the private boat insulates you from the crowds, not the heat.' });
    f.push({ level: 'note', text: 'Charters run Saturday to Saturday — align the gulet week to a Sat start (15 or 22 Aug) or pay a broken-week premium.' });
  }

  if (sel.arc === 'highlands') {
    const ed = c.cells.find((x) => x.id === 'edinburgh');
    if (ed) f.push({ level: 'note', text: 'Edinburgh nights land inside the Fringe (to 31 Aug) — rooms scarce and double-priced; the city itself is the show.' });
  }

  if (sel.arc === 'sicily') {
    f.push({ level: 'warn', text: 'You land in Ferragosto week (15 Aug) — all of Italy is on the same beach until the 20th; book every table and hydrofoil now.' });
    if ((sel.nights['noto'] ?? 0) > 0)
      f.push({ level: 'note', text: 'Noto and Syracuse run 35°C+ inland in August — mornings for the baroque, pools for the afternoons.' });
  }

  if (sel.arc === 'dolomiti') {
    f.push({ level: 'ok', text: 'Late-August Dolomites are the quiet sweet spot — Italian holidays ebb after the 20th and the rifugi breathe again.' });
    if ((sel.nights['venice'] ?? 0) > 2)
      f.push({ level: 'note', text: 'Venice in August is a sauna with queues — two nights is a flourish, more is an endurance event.' });
  }

  if (sel.arc === 'cyclades') {
    f.push({ level: 'note', text: 'The August meltemi owns the ferry timetable — keep one flex day between islands and treat it as spent.' });
    f.push({ level: 'warn', text: 'Peak-season Cyclades: Milos and Sifnos are the quiet choices, but August quiet is a relative term.' });
  }

  if (sel.arc === 'slovenia') {
    if ((sel.nights['soca'] ?? 0) > 0)
      f.push({ level: 'note', text: 'Hiša Franko books out months ahead — secure the table before committing the Soča nights around it.' });
  }

  if (sel.arc === 'yachtweek') {
    f.push({ level: 'warn', text: 'Party pace, 34°C, and theoretical sleep for seven straight nights — schedule the Hvar recovery like it is medical.' });
    f.push({ level: 'note', text: 'Routes run Saturday to Saturday — the flotilla week must start Sat 22 Aug, which fixes London and Split in front of it.' });
  }

  if (sel.arc === 'sardinia') {
    const sm = c.cells.find((x) => x.id === 'smeralda');
    if (sm && sm.startOff < 7)
      f.push({ level: 'warn', text: 'Costa Smeralda in Ferragosto week is the dearest sea on the Mediterranean — push those nights past the 22nd or pay double for the same beach.' });
    f.push({ level: 'note', text: 'Second-half Sardinia (from ~22 Aug) is the year’s warmest water with thinning crowds — back-load the coast, front-load Barbagia.' });
  }

  if (sel.arc === 'madeira') {
    f.push({ level: 'ok', text: 'Madeira barely has a season — 26° and open levadas while the Med boils. The crowd-proof warm arc.' });
    f.push({ level: 'note', text: 'The classic levada walks want a guide booked days ahead, not months — the island rewards mornings.' });
  }

  if (sel.arc === 'portugal') {
    f.push({ level: 'warn', text: 'The Atlantic is 18–19° and means it — Comporta is pines, rice fields and pools, not Med swimming.' });
    const cp = c.cells.find((x) => x.id === 'comporta');
    if (cp && cp.startOff < 9)
      f.push({ level: 'note', text: 'Comporta before ~24 Aug is Lisbon-on-sea — its own glamorous scene, but nobody’s idea of solitude.' });
  }

  if (sel.arc === 'highlow') {
    const tyw = c.cells.find((x) => x.id === 'tyw');
    if (tyw && tyw.startOff !== 8)
      f.push({ level: 'warn', text: `The flotilla must start Saturday 22 August (night 8) — this shape has it starting ${7 - tyw.startOff > 0 ? 'early' : 'late'}. Rebalance the north nights until the hinge lands on the Saturday.` });
    f.push({ level: 'note', text: 'Tromsø → Split is a full travel day over Oslo — Saturday the 22nd is spent in the air, and that is the price of two worlds.' });
  }

  if (sel.arc === 'slovcroatia') {
    f.push({ level: 'ok', text: 'No mid-trip flights — Ljubljana to Split is a morning on the road. The only combo that never re-enters an airport.' });
    f.push({ level: 'note', text: 'Charters run Saturday to Saturday — the gulet week wants Sat 22 Aug, which fixes the Slovenian nights in front of it.' });
  }
  if (sel.arc === 'dolosicily') {
    f.push({ level: 'note', text: 'One booking rhythm: the Dolomites need nothing in Ferragosto week, but Taormina and the Aeolians from the 22nd must be booked now.' });
  }
  if (sel.arc === 'scotgreece') {
    f.push({ level: 'note', text: 'EDI→Athens has limited direct rotations — check the Saturday schedule before anchoring the swap day.' });
  }
  if (sel.arc === 'norsardinia') {
    f.push({ level: 'note', text: 'Tromsø → Olbia is the longest hinge on the board (via Oslo, ~7h door to door) — the Saturday is entirely spent.' });
  }

  const warmId = COMBO_WARM[sel.arc];
  if (warmId) {
    f.push({ level: 'ok', text: 'The crowd curve, played: the cool half runs while the Med is rammed, and the warm half begins as Europe goes back to work.' });
    const warm = c.cells.find((x) => x.id === warmId);
    if (warm && warm.startOff < 8 && sel.arc !== 'highlow')
      f.push({ level: 'note', text: `The warm half starts ${warm.date}, before the Med empties on ~22 Aug — later is calmer and cheaper.` });
  }

  f.push({ level: 'ok', text: 'The spine as ticketed: QF1 lands LHR 06:35 Friday 14 August; QF2 departs Wednesday 2 September. Nineteen nights, and nothing in between is owed to anybody.' });
  return f;
}

export function questionsFor(sel: Selection): string[] {
  const q = ['Flights are solved — ticketed PE Flex with upgrades queued. Only beds and boats remain, and everything below books same-week.'];
  if (sel.arc === 'fjords') {
    q.push('Union Øye and Holmen availability decide this debate — ask before falling in love.');
    q.push('LHR→Ålesund and Tromsø→LHR both connect via Oslo — book as one SAS itinerary so a late leg is their problem.');
  }
  if (sel.arc === 'gulet') {
    q.push('Which boat and crew — Split or Dubrovnik embarkation, and who brokers the charter?');
  }
  if (sel.arc === 'highlands') {
    q.push('Car from London, or train to Edinburgh and hire from there — how much of the A9 do you actually want?');
  }
  if (sel.arc === 'sicily') {
    q.push('Timeo vs Villa Sant’Andrea (the beach twin) — and can Therasia give a Salina-facing room in Ferragosto week?');
  }
  if (sel.arc === 'dolomiti') {
    q.push('Fly LHR→Venice and drive up, or LHR→Innsbruck and come over the passes from the north?');
  }
  if (sel.arc === 'cyclades') {
    q.push('Fly into Milos direct (via Athens) or ferry the whole chain — and which flex day absorbs a meltemi cancellation?');
  }
  if (sel.arc === 'slovenia') {
    q.push('Hiša Franko table + rooms first, then build the Soča days around the reservation, not the reverse.');
  }
  if (sel.arc === 'yachtweek') {
    q.push('Own cabin on a premium boat or charter the whole yacht with skipper — the second doubles the cost and halves the chaos.');
  }
  if (sel.arc === 'sardinia') {
    q.push('Which Sardinia are we buying — Cala di Volpe-tier on the Costa Smeralda, or Su Gologone agriturismo-chic with the coast as day trips?');
  }
  if (sel.arc === 'madeira') {
    q.push('Reid’s classic wing or a quinta — and does Porto Santo’s nine-kilometre beach warrant a night of its own?');
  }
  if (sel.arc === 'portugal') {
    q.push('The Douro by car or by the riverside train from Porto — and are the harvest-eve events around the 29th worth anchoring to?');
  }
  if (sel.arc === 'highlow') {
    q.push('Same-day LHR→Lofoten on arrival Saturday, or the one London night first? Landing 06:25 makes the afternoon Oslo connection possible but brutal.');
    q.push('Flotilla cabin vs whole boat — and does the party south swap to a Hvar shore base if the flotilla feels like too much boat?');
  }
  return q;
}
