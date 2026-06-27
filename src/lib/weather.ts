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
  hourly?: { freezing_level_height?: number[] };
}

export async function fetchNodes(): Promise<NodeWx[]> {
  const lat = NODES.map((n) => n.lat).join(',');
  const lon = NODES.map((n) => n.lon).join(',');
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,snowfall&hourly=freezing_level_height&forecast_days=1&timezone=auto`;
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
      freezing: d.hourly?.freezing_level_height?.[0] ?? null,
      status: (snow ?? 0) > 1 ? 'storm' : 'clear',
    };
  });
}
