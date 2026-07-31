import { CFG, NIGHTS_TOTAL, dateAt, type Cfg, type Selection } from './cfg';

/**
 * The reducer — pure, deterministic, side-effect free. A selection (arc + nights per segment)
 * becomes a dated calendar, a cost ledger and a night count against the fixed 16-night spine.
 * Unit-tested in web/tests/north.compute.test.ts.
 */
export interface Cell {
  id: string;
  label: string;
  short: string;
  nights: number;
  startOff: number; // nights after 15 Aug
  date: string; // calendar label of the first night
  cost: number;
  link?: string;
}

export interface ComputeResult {
  cells: Cell[]; // zero-night segments are dropped
  totalNights: number;
  delta: number; // totalNights - 16; 0 is the only sailable shape
  stayCost: number;
  transport: number;
  cost: number; // stay + transport
  lastCell: Cell | null;
}

export function compute(sel: Selection, cfg: Cfg = CFG): ComputeResult {
  const arc = cfg.arcs[sel.arc];
  const cells: Cell[] = [];
  let off = 0;
  let stayCost = 0;

  for (const seg of arc.segments) {
    const nights = Math.max(0, sel.nights[seg.id] ?? seg.nights);
    if (nights === 0) continue;
    const cost = nights * seg.perNight[sel.tier];
    cells.push({
      id: seg.id, label: seg.label, short: seg.short, nights,
      startOff: off, date: dateAt(off), cost, link: seg.link,
    });
    off += nights;
    stayCost += cost;
  }

  const totalNights = off;
  return {
    cells,
    totalNights,
    delta: totalNights - (cfg.nightsTotal ?? NIGHTS_TOTAL),
    stayCost,
    transport: arc.transport,
    cost: stayCost + arc.transport,
    lastCell: cells.length ? cells[cells.length - 1] : null,
  };
}
