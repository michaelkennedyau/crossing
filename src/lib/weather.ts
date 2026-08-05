/**
 * Live conditions at the three route nodes via Open-Meteo (no key). Returns current temperature +
 * snowfall and the freezing-level height — the last feeds the powder "quality" factor in the
 * forecast model. A crude pass-status read (storm risk if snow is falling) per the design.
 */
export interface NodeWx {
  node: string;
  lat: number;
  lon: number;
  temp: number | null;
  snow: number | null;
  freezing: number | null;
  status: 'clear' | 'storm';
}

const NODES = [
  { node: 'Puerto Varas', lat: -41.32, lon: -72.99 },
  { node: 'Paso Pérez Rosales', lat: -41.06, lon: -71.88 },
  { node: 'Bariloche · Catedral', lat: -41.17, lon: -71.44 },
];

interface OMResp {
  current?: { temperature_2m?: number; snowfall?: number };
  hourly?: { time?: number[]; freezing_level_height?: number[] };
}

/** the reading for NOW, not midnight — hourly[0] was systematically the overnight value.
 * times are epoch seconds (timeformat=unixtime) so the comparison is exact on a UTC worker. */
function currentHourValue(times: number[] | undefined, values: number[] | undefined): number | null {
  if (!values?.length) return null;
  if (!times?.length) return values[0] ?? null;
  const now = Date.now() / 1000;
  let idx = 0;
  for (let i = 0; i < times.length; i++) {
    if (times[i] <= now) idx = i;
    else break;
  }
  return values[idx] ?? null;
}

export async function fetchNodes(): Promise<NodeWx[]> {
  const lat = NODES.map((n) => n.lat).join(',');
  const lon = NODES.map((n) => n.lon).join(',');
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,snowfall&hourly=freezing_level_height&forecast_days=1&timezone=auto&timeformat=unixtime`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const data = (await res.json()) as OMResp | OMResp[];
  const arr = Array.isArray(data) ? data : [data];
  return NODES.map((n, i) => {
    const d = arr[i] ?? {};
    const snow = d.current?.snowfall ?? null;
    return {
      node: n.node,
      lat: n.lat,
      lon: n.lon,
      temp: d.current?.temperature_2m ?? null,
      snow,
      freezing: currentHourValue(d.hourly?.time, d.hourly?.freezing_level_height),
      status: (snow ?? 0) > 1 ? 'storm' : 'clear',
    };
  });
}
