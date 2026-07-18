import { CFG, SPLIT_OFFSET, type Cfg, type Scenario } from './cfg';

/**
 * The reducer — pure, deterministic, side-effect free. Ported faithfully from compute() in
 * plotting-table.html. Same maths: crossing cost + ski base (skiDays·perDay5 + skiNights·lodge5)
 * + Iguazú (if on) + split (second-act cost + boys' return delta). Calendar phases derive from
 * 17 August forward; each is tagged 'all' (the five) or 'parents' (the for-two second act).
 *
 * Unit-tested against the artifact's outputs for all six presets (see plotting.compute.test.ts).
 */
export type Who = 'all' | 'parents';

export interface Phase {
  label: string;
  nights: number;
  who: Who;
}

export interface Leg {
  label: string;
  amount: number;
}

export interface ComputeResult {
  cost: number;
  legs: Leg[];
  phases: Phase[];
  totalNights: number;
  preSki: number;
  arrivalOff: number;
  /** nights at the mountain before the boys leave on the 27th (null when not split). */
  sharedToSplit: number | null;
  actShort: string | null;
}

export function compute(s: Scenario, cfg: Cfg = CFG): ComputeResult {
  const m = cfg.cross[s.cross];
  const skiNights = s.skiDays + cfg.ski.buffer;
  const skiCost = s.skiDays * cfg.ski.perDay5 + skiNights * cfg.ski.lodge5;

  const legs: Leg[] = [];
  const phases: Phase[] = [];
  let cost = 0;

  if (s.iguazu) {
    phases.push({ label: 'Iguazú Falls', nights: cfg.iguazu.nights, who: 'all' });
    cost += cfg.iguazu.cost;
    legs.push({ label: 'Iguazú leg (flights, lodge, falls)', amount: cfg.iguazu.cost });
  }

  legs.push({ label: m.label, amount: m.cost });
  cost += m.cost;
  for (const [label, nights] of m.phases) phases.push({ label, nights, who: 'all' });

  const preSki = (s.iguazu ? cfg.iguazu.nights : 0) + m.phases.reduce((a, p) => a + p[1], 0);

  cost += skiCost;
  legs.push({ label: `Bariloche — Llao Llao, lifts, food (${s.skiDays}d)`, amount: skiCost });

  let actShort: string | null = null;
  if (s.split) {
    const act = cfg.split.acts[s.secondAct];
    actShort = act.short;
    const sharedNights = Math.max(1, SPLIT_OFFSET - preSki);
    phases.push({ label: 'Catedral · Llao Llao', nights: Math.min(skiNights, sharedNights), who: 'all' });
    phases.push({ label: act.short, nights: act.nights, who: 'parents' });
    cost += act.cost + cfg.split.boysReturnDelta;
    legs.push({ label: `Second act · ${act.label} (2 pax)`, amount: act.cost });
    legs.push({ label: 'Boys’ separate return', amount: cfg.split.boysReturnDelta });
  } else {
    phases.push({ label: 'Catedral · Llao Llao', nights: skiNights, who: 'all' });
  }

  const totalNights = phases.reduce((a, p) => a + p.nights, 0);

  return {
    cost,
    legs,
    phases,
    totalNights,
    preSki,
    arrivalOff: preSki,
    sharedToSplit: s.split ? Math.max(0, SPLIT_OFFSET - preSki) : null,
    actShort,
  };
}
