import { useEffect, useMemo, useState } from 'react';

/**
 * The board — "where are you, what's the weather." The trip's actual operating system:
 * pick your current position, and every candidate in Europe ranks itself by the next five
 * days of sky, with an honest verdict and how far it is from where you're standing.
 * Ten years of Platinum means the getting-there is a solved problem; weather is the only
 * variable that matters, and the QF2 wall (LHR, Wed 2 Sep) the only rule.
 */
interface WxDay { tmax: number; rain: number }
interface WxNode {
  id: string; name: string; country: string; lat: number; lon: number;
  temp: number | null; code: number | null; days: WxDay[];
}

const WMO: [number, string][] = [
  [0, 'clear'], [1, 'mostly clear'], [2, 'partly cloudy'], [3, 'overcast'],
  [45, 'fog'], [48, 'fog'], [51, 'drizzle'], [55, 'drizzle'], [61, 'light rain'],
  [63, 'rain'], [65, 'heavy rain'], [80, 'showers'], [82, 'showers'], [95, 'storms'],
];
function codeWord(code: number | null): string {
  if (code === null) return '—';
  let word = 'mixed';
  for (const [c, w] of WMO) if (code >= c) word = w;
  return word;
}

const R = 6371;
function km(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function hopLabel(d: number): string {
  if (d < 40) return 'you are here';
  if (d < 320) return 'a drive';
  if (d < 1700) return 'a short flight';
  return 'a long morning';
}

/** five-day sun count: days under 2 mm. The whole model — deliberately simple. */
function sunDays(n: WxNode): number {
  return n.days.slice(0, 5).filter((d) => d.rain < 2).length;
}
function tempWord(n: WxNode): string {
  const t = n.days[0]?.tmax ?? n.temp ?? 0;
  if (t >= 33) return 'hot';
  if (t >= 24) return 'warm';
  if (t >= 16) return 'mild';
  return 'cool';
}
function verdict(n: WxNode): { level: 'go' | 'maybe' | 'skip'; text: string } {
  const sun = sunDays(n);
  const t = n.days[0]?.tmax ?? 0;
  if (sun >= 4 && t >= 20 && t < 34) return { level: 'go', text: `${sun}/5 days of sun · go` };
  if (sun >= 4) return { level: 'maybe', text: `${sun}/5 sunny but ${tempWord(n)} · your call` };
  if (sun >= 2) return { level: 'maybe', text: `${sun}/5 clear days · a gamble` };
  return { level: 'skip', text: `${5 - sun}/5 days of rain · not this week` };
}

export function WeatherBoard(): JSX.Element {
  const [nodes, setNodes] = useState<WxNode[]>([]);
  const [err, setErr] = useState(false);
  const [at, setAt] = useState('london');

  useEffect(() => {
    fetch('/api/north/weather')
      .then((r) => r.json() as Promise<{ nodes: WxNode[]; error?: string }>)
      .then((d) => {
        if (!d.nodes?.length) setErr(true);
        else setNodes(d.nodes);
      })
      .catch(() => setErr(true));
  }, []);

  const here = nodes.find((n) => n.id === at);
  const ranked = useMemo(() => {
    if (!here) return [];
    return nodes
      .filter((n) => n.id !== at)
      .map((n) => ({ n, sun: sunDays(n), d: km(here.lat, here.lon, n.lat, n.lon) }))
      .sort((a, b) => b.sun - a.sun || a.d - b.d);
  }, [nodes, at, here]);

  return (
    <div className="card">
      <p className="card-eyebrow" style={{ color: 'var(--live)' }}>The board · where are you, what's the weather</p>
      <div className="wb-head">
        <label className="lever-label" htmlFor="wb-at">You are in</label>
        <select id="wb-at" className="wb-select" value={at} onChange={(e) => setAt(e.target.value)}>
          {nodes.map((n) => (
            <option key={n.id} value={n.id}>{n.name} · {n.country}</option>
          ))}
        </select>
        {here && (
          <span className="wb-now">
            {here.temp !== null ? `${Math.round(here.temp)}°` : '—'} · {codeWord(here.code)} · next 5 days: {sunDays(here)}/5 sun
          </span>
        )}
      </div>

      {err && <p className="pt-sub">The sky feed is offline — the board still works by looking out the window.</p>}

      <div className="wb-rows">
        {ranked.map(({ n, sun, d }) => {
          const v = verdict(n);
          return (
            <div key={n.id} className={`wb-row ${v.level}`}>
              <span className="wb-place"><b>{n.name}</b><i>{n.country}</i></span>
              <span className="wb-temp">{n.temp !== null ? `${Math.round(n.temp)}°` : '—'} {codeWord(n.code)}</span>
              <span className="wb-sun" aria-label={`${sun} of 5 days sunny`}>
                {'●'.repeat(sun)}{'○'.repeat(5 - sun)}
              </span>
              <span className="wb-hop">{hopLabel(d)}</span>
              <span className={`wb-verdict ${v.level}`}>{v.text}</span>
            </div>
          );
        })}
      </div>
      <p className="pt-sub" style={{ marginTop: 10 }}>
        The only wall is QF2 — London, Wednesday 2 September. Everything else is a same-week booking on an Australian passport.
      </p>
    </div>
  );
}
