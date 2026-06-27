/**
 * The Base ↔ Powder forecast model — maths frozen, ported from the design handoff README. El Niño
 * (ONI +) → wetter Andes → a higher base and bigger fresh-snow spikes. Base = the level; powder =
 * the daily delta. Only the skin changes downstream; these numbers do not.
 */
const PATTERN = [0.12, 0, 0.55, 1, 0.3, 0, 0.05, 0.5, 0.92, 0.38, 0, 0.68, 1, 0.46];
const BASE_SEED = 42;

export interface ForecastDay {
  day: number;
  dailySnow: number; // cm — the "powder" / fresh-snow delta
  base: number; // cm — the accumulated level
}

export interface Forecast {
  days: ForecastDay[];
  baseNow: number;
  peakFall: number;
  wet: number;
}

export function forecast(oni: number): Forecast {
  const wet = 0.45 + 0.5 * Math.tanh(oni / 1.4);
  const days: ForecastDay[] = [];
  let prev = BASE_SEED;
  let peak = 0;
  for (let d = 0; d < 14; d++) {
    const dailySnow = Math.max(0, Math.round(PATTERN[d] * wet * 40));
    const base = prev * 0.984 + dailySnow;
    days.push({ day: d, dailySnow, base });
    prev = base;
    if (dailySnow > peak) peak = dailySnow;
  }
  return { days, baseNow: days[13].base, peakFall: peak, wet };
}
