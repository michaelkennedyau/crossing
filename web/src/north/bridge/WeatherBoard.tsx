import { useEffect, useMemo, useState } from 'react';
import { KNOWLEDGE } from '../board/knowledge';
import { trendMark, type OutlookPayload } from './Outlook';
import { type Cfg } from '../planner/cfg';

/**
 * The board — "where are you, what's the weather," grown into the trip's operating system.
 * Every row is now a card that opens into a card: the why, Claude's live insight on that
 * coast (with its direction of travel), the two beds, and the festivals nearby — and any of
 * it can be pinned to the shared idea board by either traveller. Click an insight and it
 * stays at the top of the board until you let it go.
 */
interface WxDay { tmax: number; rain: number }
export interface WxNode {
  id: string; name: string; country: string; lat: number; lon: number;
  temp: number | null; code: number | null; days: WxDay[];
}
interface AreaEvent { name: string; where: string; whenText: string; kind: string; note: string }

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

interface NodeInsight { arc: string; arcName: string; score: number; verdict: string; because: string; delta: number }

/** the strongest arc that sails through this node — Claude's live read of the coast it sits on */
function nodeInsight(nodeId: string, outlook: OutlookPayload | null, cfg: Cfg): NodeInsight | null {
  if (!outlook?.outlook) return null;
  const seg = NODE_SEG_ALIAS[nodeId] ?? nodeId;
  const ranked = [...outlook.outlook.ranking].sort((a, b) => b.score - a.score);
  for (const r of ranked) {
    const arc = cfg.arcs[r.arc as keyof typeof cfg.arcs];
    if (arc?.segments.some((s) => s.id === seg)) {
      return { arc: r.arc, arcName: arc.name, score: r.score, verdict: r.verdict, because: r.because, delta: outlook.trend?.[r.arc] ?? 0 };
    }
  }
  return null;
}

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** upsert a pin on the shared board and tell every listening card the board grew */
export async function savePin(p: { kind: string; node: string; title: string; detail?: string; url?: string; who: string }): Promise<void> {
  await fetch('/api/north/pins', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: `${p.kind}:${p.node}:${slug(p.title)}`, ...p }),
  }).catch(() => {});
  window.dispatchEvent(new Event('north:pins-changed'));
}

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

export function WeatherBoard({
  nodes: nodesProp,
  topSegIds = [],
  outlook = null,
  cfg,
}: {
  /** null = still loading, [] = feed offline — the bridge owns the single fetch */
  nodes: WxNode[] | null;
  topSegIds?: string[];
  outlook?: OutlookPayload | null;
  cfg: Cfg;
}): JSX.Element {
  const nodes = useMemo(() => nodesProp ?? [], [nodesProp]);
  const err = nodesProp !== null && nodesProp.length === 0;
  const [at, setAt] = useState('london');
  const [open, setOpen] = useState<string | null>(null);
  const [events, setEvents] = useState<Record<string, AreaEvent[] | 'loading'>>({});
  const [who, setWho] = useState<string>(() => localStorage.getItem('north-who') ?? 'michael');
  const [focus, setFocus] = useState<string | null>(() => localStorage.getItem('north-focus'));
  const topSet = useMemo(() => new Set(topSegIds), [topSegIds]);
  const inTopArc = (id: string): boolean => topSet.has(NODE_SEG_ALIAS[id] ?? id);

  const setWhoBoth = (w: string): void => { setWho(w); localStorage.setItem('north-who', w); };
  const setFocusBoth = (id: string | null): void => {
    setFocus(id);
    if (id) localStorage.setItem('north-focus', id);
    else localStorage.removeItem('north-focus');
  };

  const openRow = (id: string): void => {
    setOpen(id);
    if (events[id] === undefined) {
      setEvents((e) => ({ ...e, [id]: 'loading' }));
      fetch(`/api/north/events?node=${id}`)
        .then((r) => r.json() as Promise<{ events: AreaEvent[] }>)
        .then((d) => setEvents((e) => ({ ...e, [id]: d.events ?? [] })))
        .catch(() => setEvents((e) => ({ ...e, [id]: [] })));
    }
  };
  const toggleRow = (id: string): void => {
    if (open === id) setOpen(null);
    else openRow(id);
  };

  // the chart room hands over here: a clicked map node opens its card and scrolls to it
  useEffect(() => {
    const onOpenNode = (e: Event): void => {
      const id = (e as CustomEvent<string>).detail;
      if (!id) return;
      openRow(id);
      requestAnimationFrame(() => {
        document.querySelector(`[data-node="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    };
    window.addEventListener('north:open-node', onOpenNode);
    return () => window.removeEventListener('north:open-node', onOpenNode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, open]);

  const here = nodes.find((n) => n.id === at);
  const focused = nodes.find((n) => n.id === focus) ?? null;
  const focusedInsight = focused ? nodeInsight(focused.id, outlook, cfg) : null;
  const ranked = useMemo(() => {
    if (!here) return [];
    return nodes
      .filter((n) => n.id !== at)
      .map((n) => ({ n, sun: sunDays(n), d: km(here.lat, here.lon, n.lat, n.lon) }))
      .sort((a, b) => b.sun - a.sun || a.d - b.d);
  }, [nodes, at, here]);

  const deepPanel = (n: WxNode): JSX.Element => {
    const k = KNOWLEDGE[n.id];
    const ins = nodeInsight(n.id, outlook, cfg);
    const evs = events[n.id];
    return (
      <div className="wb-deep" role="region" aria-label={`${n.name} in depth`}>
        {k && <p className="wb-why">{k.why}</p>}

        {ins && (
          <button
            type="button"
            className={`wb-insight ${ins.verdict}`}
            title="keep this insight at the top of the board"
            onClick={() => setFocusBoth(n.id)}
          >
            <b>{ins.arcName}</b> · {ins.score} <em className={`ol-trend ${trendMark(ins.delta).cls}`}>{trendMark(ins.delta).mark}</em>
            <span>{ins.because}</span>
          </button>
        )}

        {k && (
          <div className="wb-hotels">
            {k.hotels.map((h) => (
              <div key={h.name} className={`wb-hotel ${h.tier}`}>
                <span className="wb-h-tier">{h.tier === 'good' ? 'the good room' : 'the sane room'}</span>
                <b>{h.url ? <a href={h.url} target="_blank" rel="noopener">{h.name} ↗</a> : h.name}</b>
                <i>{h.note}</i>
                <button
                  type="button"
                  className="pin-btn"
                  aria-label={`pin ${h.name}`}
                  onClick={() => void savePin({ kind: 'hotel', node: n.id, title: h.name, detail: h.note, url: h.url, who })}
                >
                  ⊕ pin
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="wb-events">
          <p className="qs-title">Around {n.name} in the window</p>
          {evs === 'loading' && <p className="pt-sub">reading the calendar…</p>}
          {Array.isArray(evs) && evs.length === 0 && <p className="pt-sub">nothing notable recurs here in the window — which is its own argument.</p>}
          {Array.isArray(evs) &&
            evs.map((ev) => (
              <div key={ev.name} className="wb-event">
                <b>{ev.name}</b>
                <i>{ev.where} · {ev.whenText} · {ev.kind}</i>
                <span>{ev.note}</span>
                <button
                  type="button"
                  className="pin-btn"
                  aria-label={`pin ${ev.name}`}
                  onClick={() => void savePin({ kind: 'event', node: n.id, title: ev.name, detail: `${ev.whenText} — ${ev.note}`, who })}
                >
                  ⊕ pin
                </button>
              </div>
            ))}
          {Array.isArray(evs) && evs.length > 0 && <p className="wb-verify">dates from model knowledge — verify before booking</p>}
        </div>

        <button
          type="button"
          className="pin-btn pin-btn--dest"
          onClick={() => void savePin({ kind: 'destination', node: n.id, title: n.name, detail: k?.why ?? '', who })}
        >
          ⊕ pin {n.name} to the board
        </button>
      </div>
    );
  };

  return (
    <div className="card">
      <p className="card-eyebrow" style={{ color: 'var(--live)' }}>The board · where are you, what's the weather</p>

      {focused && (
        <div className="wb-focus" role="status">
          <span className="wb-focus-name">◉ {focused.name}</span>
          {focusedInsight ? (
            <span className="wb-focus-line">
              <b>{focusedInsight.arcName}</b> · {focusedInsight.score}{' '}
              <em className={`ol-trend ${trendMark(focusedInsight.delta).cls}`}>{trendMark(focusedInsight.delta).mark}</em> · {focusedInsight.because}
            </span>
          ) : (
            <span className="wb-focus-line">{KNOWLEDGE[focused.id]?.why ?? ''}</span>
          )}
          <button type="button" className="wb-focus-x" aria-label="let the insight go" onClick={() => setFocusBoth(null)}>✕</button>
        </div>
      )}

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
        <div className="wb-who" role="group" aria-label="Pinning as">
          {['michael', 'claire'].map((w) => (
            <button key={w} type="button" className={who === w ? 'on' : ''} onClick={() => setWhoBoth(w)}>
              {w}
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
          const isOpen = open === n.id;
          return (
            <div key={n.id} data-node={n.id} className={`wb-rowwrap${isOpen ? ' open' : ''}`}>
              <button
                type="button"
                className={`wb-row wb-row--btn ${v.level}`}
                aria-expanded={isOpen}
                onClick={() => toggleRow(n.id)}
              >
                <span className="wb-place">
                  <b>{n.name}{inTopArc(n.id) && <span className="wb-pick" title="in Claude's top-ranked arc"> ◆</span>}</b>
                  <i>{n.country}</i>
                </span>
                <span className="wb-temp">{n.temp !== null ? `${Math.round(n.temp)}°` : '—'} {codeWord(n.code)}</span>
                <span className="wb-sun" role="img" aria-label={`${sun} of 5 days sunny`}>
                  <Spark days={n.days} />
                </span>
                <span className="wb-hop">{hopLabel(d)}</span>
                <span className={`wb-verdict ${v.level}`}>{v.text} <i className="wb-caret">{isOpen ? '▾' : '▸'}</i></span>
              </button>
              {isOpen && deepPanel(n)}
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
