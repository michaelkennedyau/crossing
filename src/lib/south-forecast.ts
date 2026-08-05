/**
 * The plough window — the piece of sky that decides whether CH-60 can be dug out.
 * Ten days of daily snowfall for the pass (Portillo) and the Valle Nevado side; the
 * pure part finds the longest run of near-dry days starting from today, because crews
 * plough in pauses, not in storms. KV-cached three hours by the route.
 */
export const SNOW_KV_KEY = 'south-snow:v1';

export interface SnowDay { date: string; snowCm: number }
export interface SouthForecast {
  pass: SnowDay[];
  valle: SnowDay[];
  ploughWindow: { from: string; to: string; length: number } | null;
}

const POINTS = [
  { key: 'pass', lat: -32.84, lon: -70.13 },
  { key: 'valle', lat: -33.35, lon: -70.25 },
] as const;

export const DRY_CM = 2; // under this, a day counts as ploughable

/** the longest run of consecutive sub-2cm days — must include or follow today */
export function ploughWindow(days: SnowDay[]): SouthForecast['ploughWindow'] {
  let best: { from: string; to: string; length: number } | null = null;
  let run: SnowDay[] = [];
  for (const d of days) {
    if (d.snowCm < DRY_CM) {
      run.push(d);
      if (!best || run.length > best.length) best = { from: run[0].date, to: run[run.length - 1].date, length: run.length };
    } else {
      run = [];
    }
  }
  return best && best.length >= 2 ? best : null;
}

export async function fetchSouthSnow(): Promise<SouthForecast> {
  const lats = POINTS.map((p) => p.lat).join(',');
  const lons = POINTS.map((p) => p.lon).join(',');
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}` +
    '&daily=snowfall_sum&forecast_days=10&timezone=America%2FSantiago';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const raw = (await res.json()) as unknown;
  const arr = Array.isArray(raw) ? raw : [raw];
  const read = (i: number): SnowDay[] => {
    const d = arr[i] as { daily?: { time?: string[]; snowfall_sum?: number[] } } | undefined;
    const times = d?.daily?.time ?? [];
    const snow = d?.daily?.snowfall_sum ?? [];
    return times.map((t, j) => ({ date: t, snowCm: snow[j] ?? 0 }));
  };
  const pass = read(0);
  return { pass, valle: read(1), ploughWindow: ploughWindow(pass) };
}
