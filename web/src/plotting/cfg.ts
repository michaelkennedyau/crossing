/**
 * The Plotting Table assumptions — ported VERBATIM from the canonical engine (plotting-table.html).
 * This is the single source of truth for the maths; the reducer (compute.ts) takes it as an
 * argument and never hard-codes numbers. A live override (D1, GET /api/cfg) merges over these.
 *
 * Costs are AUD, indicative ±15%, in-region only (the long-haul QF27/QF28 sits outside).
 * skiDays clamps 2..8 (the stepper bounds; matches the build addendum).
 */
export type Cross = 'lakes' | 'road' | 'fly';
export type SecondAct = 'ski' | 'mendoza' | 'patagonia' | 'iguazu';

export interface Scenario {
  cross: Cross;
  iguazu: boolean;
  split: boolean;
  secondAct: SecondAct;
  skiDays: number;
}

export interface CrossOption {
  label: string;
  note: string;
  cost: number;
  phases: [string, number][];
}
export interface ActOption {
  label: string;
  short: string;
  cost: number;
  nights: number;
}
export interface Cfg {
  longHaul: number;
  cross: Record<Cross, CrossOption>;
  ski: { perDay5: number; lodge5: number; buffer: number };
  iguazu: { cost: number; nights: number };
  split: { boysReturnDelta: number; acts: Record<SecondAct, ActOption> };
}

export const SPLIT_OFFSET = 11; // Thu 27 Aug = 16 Aug + 11 nights (a QF28 operating day)
export const SKI_MIN = 2;
export const SKI_MAX = 8;

export const CFG: Cfg = {
  longHaul: 15000,
  cross: {
    lakes: {
      label: 'The lakes · Cruce Andino',
      note: 'fly to Puerto Montt, then the two-day lake crossing',
      cost: 7350,
      phases: [
        ['Puerto Varas', 3],
        ['Cruce Andino · Peulla', 2],
        ['Puerto Blest', 1],
      ],
    },
    road: {
      label: 'The road · fly + private drive',
      note: 'fly to Puerto Varas, drive the Seven Lakes over Samoré',
      cost: 7800,
      phases: [
        ['Puerto Varas', 1],
        ['Seven Lakes drive', 2],
      ],
    },
    fly: {
      label: 'Fly straight to skiing',
      note: 'SCL to Bariloche via Buenos Aires Aeroparque — no journey',
      cost: 2200,
      phases: [],
    },
  },
  ski: { perDay5: 720, lodge5: 400, buffer: 1 },
  iguazu: { cost: 6000, nights: 3 },
  split: {
    boysReturnDelta: 1200,
    acts: {
      ski: { label: 'Just ski, the two of you', short: 'Ski · 2', cost: 3650, nights: 5 },
      mendoza: { label: 'Mendoza · wine country', short: 'Mendoza', cost: 3600, nights: 3 },
      patagonia: { label: 'Stay on in Patagonia', short: 'Patagonia', cost: 3200, nights: 5 },
      iguazu: { label: 'Iguazú Falls, for two', short: 'Iguazú', cost: 4000, nights: 3 },
    },
  },
};

export interface Preset {
  name: string;
  s: Scenario;
}

// The six named arcs (verbatim configs from the canonical engine).
export const PRESETS: Preset[] = [
  { name: 'The Launch', s: { cross: 'lakes', iguazu: false, split: false, secondAct: 'ski', skiDays: 4 } },
  { name: 'Launch + Second Act', s: { cross: 'lakes', iguazu: false, split: true, secondAct: 'ski', skiDays: 3 } },
  { name: 'Voyage then Vines', s: { cross: 'lakes', iguazu: false, split: true, secondAct: 'mendoza', skiDays: 4 } },
  { name: 'Two Wonders', s: { cross: 'fly', iguazu: true, split: false, secondAct: 'ski', skiDays: 4 } },
  { name: 'Pure Ski', s: { cross: 'fly', iguazu: false, split: false, secondAct: 'ski', skiDays: 6 } },
  { name: 'The Long Way', s: { cross: 'road', iguazu: false, split: false, secondAct: 'ski', skiDays: 4 } },
];

// The locked plan (18 Jul 2026): the lakes, the split, Mendoza for two — 'Voyage then Vines'.
export const DEFAULT_SCENARIO: Scenario = PRESETS[2].s;

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A calendar label N nights after 16 August 2026. */
export function dateAt(off: number): string {
  const d = new Date(2026, 7, 16);
  d.setDate(d.getDate() + off);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
}

export function aud(n: number): string {
  return `$${Math.round(n).toLocaleString('en-AU')}`;
}

/** Deep-merge an override (from /api/cfg) over the canonical CFG. Shallow-ish, enough for tuning. */
export function mergeCfg(base: Cfg, override: Partial<Cfg> | null | undefined): Cfg {
  if (!override) return base;
  return {
    ...base,
    ...override,
    cross: { ...base.cross, ...(override.cross ?? {}) },
    ski: { ...base.ski, ...(override.ski ?? {}) },
    iguazu: { ...base.iguazu, ...(override.iguazu ?? {}) },
    split: {
      ...base.split,
      ...(override.split ?? {}),
      acts: { ...base.split.acts, ...(override.split?.acts ?? {}) },
    },
  };
}
