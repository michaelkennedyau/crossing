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

// weather-node id → arc-segment id, where they differ (most match 1:1)
const NODE_SEG_ALIAS: Record<string, string> = { olbia: 'smeralda', london: 'london1', cortina: 'cortina' };

/** six-day micro-sparkline: tmax as a thin line, rain days (≥2 mm) as drops under it */
function Spark({ days }: { days: WxDay[] }): JSX.Element | null {
  const d6 = days.slice(0, 6);
  if (d6.length < 2) return null;
  const W = 72;
  const H = 20;
  const ts = d6.map((d) => d.tmax);
  const min = Math.min(...ts);
  const span = Math.max(1, Math.max(...ts) - min);
  const x = (i: number): number => 2 + (i * (W - 4)) / (d6.length - 1);
  const y = (t: number): number => 3.5 + (1 - (t - min) / span) * (H - 11);
  const pts = ts.map((t, i) => `${x(i).toFixed(1)},${y(t).toFixed(1)}`).join(' ');
  return (
    <svg className="wb-spark" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      {d6.map((d, i) => (d.rain >= 2 ? <circle key={i} className="rain" cx={x(i)} cy={H - 2.5} r="1.6" /> : null))}
    </svg>
  );
}

export function WeatherBoard({ topSegIds = [] }: { topSegIds?: string[] }): JSX.Element {
  const [nodes, setNodes] = useState<WxNode[]>([]);
  const [err, setErr] = useState(false);
  const [at, setAt] = useState('london');
  const topSet = useMemo(() => new Set(topSegIds), [topSegIds]);
  const inTopArc = (id: string): boolean => topSet.has(NODE_SEG_ALIAS[id] ?? id);

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
        <div className="wb-atchips" role="group" aria-label="You are in">
          {nodes.map((n) => (
            <button key={n.id} type="button" className={at === n.id ? 'on' : ''} onClick={() => setAt(n.id)}>
              {n.name}
            </button>
          ))}
        </div>
        {here && (
          <span className="wb-now">
            {here.temp !== null ? `${Math.round(here.temp)}°` : '—'} · {codeWord(here.code)} · next 5 days: {sunDays(here)}/5 sun
          </span>
        )}
      </div>

      {err && <p className="pt-sub">The sky feed is offline — the board still works by looking out the window.</p>}

      <div className="wb-rows">
        <div className="wb-row wb-row--head" aria-hidden="true">
          <span>place</span><span>now</span><span>6-day</span><span>hop</span><span>verdict</span>
        </div>
        {ranked.map(({ n, sun, d }) => {
          const v = verdict(n);
          return (
            <div key={n.id} className={`wb-row ${v.level}`}>
              <span className="wb-place">
                <b>{n.name}{inTopArc(n.id) && <span className="wb-pick" title="in Claude's top-ranked arc"> ◆</span>}</b>
                <i>{n.country}</i>
              </span>
              <span className="wb-temp">{n.temp !== null ? `${Math.round(n.temp)}°` : '—'} {codeWord(n.code)}</span>
              <span className="wb-sun" role="img" aria-label={`${sun} of 5 days sunny`}>
                <Spark days={n.days} />
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
