/**
 * Live Europe weather for the flexible fortnight — one batched Open-Meteo call (no API key, same
 * pattern as the Andes weather lib) across every candidate node on the board. The client ranks;
 * this just fetches honestly: current conditions + six days of max-temp and rain.
 */
export interface NorthWxNode {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  temp: number | null;
  code: number | null; // WMO weather code, current
  days: { tmax: number; feels: number; rain: number }[]; // today + 5; feels = apparent max (humidity-honest)
}

export const EU_NODES: Omit<NorthWxNode, 'temp' | 'code' | 'days'>[] = [
  { id: 'london', name: 'London', country: 'England', lat: 51.51, lon: -0.13 },
  { id: 'edinburgh', name: 'Edinburgh', country: 'Scotland', lat: 55.95, lon: -3.19 },
  { id: 'lofoten', name: 'Lofoten', country: 'Norway', lat: 68.15, lon: 13.61 },
  { id: 'tromso', name: 'Tromsø', country: 'Norway', lat: 69.65, lon: 18.96 },
  { id: 'venice', name: 'Venice', country: 'Italy', lat: 45.44, lon: 12.34 },
  { id: 'cortina', name: 'Dolomites', country: 'Italy', lat: 46.54, lon: 12.14 },
  { id: 'bled', name: 'Lake Bled', country: 'Slovenia', lat: 46.37, lon: 14.11 },
  { id: 'split', name: 'Split', country: 'Croatia', lat: 43.51, lon: 16.44 },
  { id: 'hvar', name: 'Hvar', country: 'Croatia', lat: 43.17, lon: 16.44 },
  { id: 'dubrovnik', name: 'Dubrovnik', country: 'Croatia', lat: 42.65, lon: 18.09 },
  { id: 'taormina', name: 'Taormina', country: 'Sicily', lat: 37.85, lon: 15.29 },
  { id: 'palermo', name: 'Palermo', country: 'Sicily', lat: 38.12, lon: 13.36 },
  { id: 'valletta', name: 'Valletta', country: 'Malta', lat: 35.9, lon: 14.51 },
  { id: 'olbia', name: 'Costa Smeralda', country: 'Sardinia', lat: 40.92, lon: 9.5 },
  { id: 'milos', name: 'Milos', country: 'Greece', lat: 36.75, lon: 24.43 },
  { id: 'sifnos', name: 'Sifnos', country: 'Greece', lat: 36.97, lon: 24.72 },
  { id: 'athens', name: 'Athens Riviera', country: 'Greece', lat: 37.81, lon: 23.78 },
  { id: 'naxos', name: 'Naxos', country: 'Greece', lat: 37.06, lon: 25.48 },
  { id: 'samos', name: 'Samos', country: 'Greece', lat: 37.69, lon: 26.94 },
  { id: 'istanbul', name: 'Istanbul', country: 'T\u00fcrkiye', lat: 41.03, lon: 28.98 },
  { id: 'cesme', name: '\u00c7e\u015fme', country: 'T\u00fcrkiye', lat: 38.32, lon: 26.30 },
  { id: 'chamonix', name: 'Chamonix', country: 'France', lat: 45.92, lon: 6.87 },
  { id: 'lyon', name: 'Lyon', country: 'France', lat: 45.76, lon: 4.84 },
  { id: 'nice', name: 'Nice', country: 'France', lat: 43.70, lon: 7.27 },
  { id: 'kefalonia', name: 'Kefalonia', country: 'Greece', lat: 38.18, lon: 20.49 },
  { id: 'corfu', name: 'Corfu', country: 'Greece', lat: 39.62, lon: 19.92 },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', lat: 38.72, lon: -9.14 },
  { id: 'funchal', name: 'Funchal', country: 'Madeira', lat: 32.65, lon: -16.91 },
];

export async function fetchNorthWeather(): Promise<NorthWxNode[]> {
  const lats = EU_NODES.map((n) => n.lat).join(',');
  const lons = EU_NODES.map((n) => n.lon).join(',');
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}` +
    '&current=temperature_2m,weather_code&daily=temperature_2m_max,apparent_temperature_max,precipitation_sum' +
    '&forecast_days=6&timezone=auto';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const raw = (await res.json()) as unknown;
  const arr = Array.isArray(raw) ? raw : [raw];
  return EU_NODES.map((n, i) => {
    const d = arr[i] as {
      current?: { temperature_2m?: number; weather_code?: number };
      daily?: { temperature_2m_max?: number[]; apparent_temperature_max?: number[]; precipitation_sum?: number[] };
    } | undefined;
    const tmax = d?.daily?.temperature_2m_max ?? [];
    const feels = d?.daily?.apparent_temperature_max ?? [];
    const rain = d?.daily?.precipitation_sum ?? [];
    return {
      ...n,
      temp: d?.current?.temperature_2m ?? null,
      code: d?.current?.weather_code ?? null,
      days: tmax.map((t, j) => ({ tmax: t, feels: feels[j] ?? t, rain: rain[j] ?? 0 })),
    };
  });
}
