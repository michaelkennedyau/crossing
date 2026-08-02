import { useMemo } from 'react';
import { MAP_W, MAP_H, RAMP, RAMP_LABELS, graticule, nudgeLabels, project, tempBucket, tempRamp } from '../board/geo';
import { COASTS } from '../board/coast';
import { stamp } from './Outlook';
import { type Arc } from '../planner/cfg';

/**
 * The chart room — a proper sky chart of the board's Europe: real Natural-Earth coastlines
 * baked at chart fidelity, a 10° graticule, a compass rose in the Atlantic. Nodes sit at
 * their real lat/lon, coloured by today's max temperature, sized by five-day sun count;
 * rain today pulses a blue ring (live state, not decoration); the aurora band rides the top
 * latitudes; the top-ranked arc sails through as a dashed route with the outlook's freshness
 * stamped in the corner. Below: the heat strip — every node × six days — with its legend.
 * Clicking a node opens its card on the board.
 */
interface WxDay { tmax: number; rain: number }
interface WxNode {
  id: string; name: string; country: string; lat: number; lon: number;
  temp: number | null; code: number | null; days: WxDay[];
}

// arc-segment id → weather-node id, where they differ (reverse of the board's alias)
const SEG_NODE_ALIAS: Record<string, string> = { smeralda: 'olbia', london1: 'london', london2: 'london' };

const sunDays = (n: WxNode): number => n.days.slice(0, 5).filter((d) => d.rain < 2).length;

function auroraOn(now: number = Date.now()): boolean {
  return now >= Date.parse('2026-08-20T00:00:00Z');
}

export function SkyMap({
  nodes,
  topArc,
  outlookStamp = null,
}: {
  nodes: WxNode[];
  topArc: Arc | null;
  outlookStamp?: { generatedAt: string; stale: boolean } | null;
}): JSX.Element | null {
  const openNode = (id: string): void => {
    window.dispatchEvent(new CustomEvent('north:open-node', { detail: id }));
  };

  const route = useMemo(() => {
    if (!topArc) return '';
    const pts: string[] = [];
    for (const seg of topArc.segments) {
      const nodeId = SEG_NODE_ALIAS[seg.id] ?? seg.id;
      const n = nodes.find((x) => x.id === nodeId);
      if (!n) continue;
      const { x, y } = project(n.lat, n.lon);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.length >= 2 ? pts.join(' ') : '';
  }, [topArc, nodes]);

  const grat = useMemo(() => graticule(), []);
  const labelDy = useMemo(
    () =>
      nudgeLabels(
        nodes.map((n) => {
          const p = project(n.lat, n.lon);
          return { id: n.id, x: p.x, y: p.y, side: p.x > MAP_W - 90 ? ('left' as const) : ('right' as const) };
        }),
      ),
    [nodes],
  );

  if (!nodes.length) return null;

  // rows north → south so the strip reads cool at the top like the map
  const byLat = [...nodes].sort((a, b) => b.lat - a.lat);
  const daysN = Math.min(6, ...nodes.map((n) => n.days.length));
  const dayLabels = Array.from({ length: daysN }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return i === 0 ? 'today' : d.toLocaleDateString('en-AU', { weekday: 'short' }).toLowerCase();
  });

  const rose = project(60, -17);

  return (
    <div className="card chartroom">
      <p className="card-eyebrow" style={{ color: 'var(--live)' }}>The chart room · the sky, drawn</p>

      <svg className="skymap" viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img"
        aria-label="Chart of Europe: board destinations coloured by today's temperature, sized by sun days">
        <rect x="8" y="8" width={MAP_W - 16} height={MAP_H - 16} fill="var(--chart-wash)" stroke="var(--chart-frame)" />

        {/* graticule — 10° of instrument honesty */}
        {grat.lats.map((l) => (
          <g key={`lat${l.deg}`}>
            <line x1={10} y1={l.y} x2={MAP_W - 10} y2={l.y} stroke="var(--chart-grid)" strokeWidth="0.75" />
            <text className="sm-grat" x={14} y={l.y - 3}>{l.deg}°N</text>
          </g>
        ))}
        {grat.lons.map((l) => (
          <g key={`lon${l.deg}`}>
            <line x1={l.x} y1={10} x2={l.x} y2={MAP_H - 10} stroke="var(--chart-grid)" strokeWidth="0.75" />
            <text className="sm-grat" x={l.x + 3} y={MAP_H - 14}>{Math.abs(l.deg)}°{l.deg < 0 ? 'W' : l.deg > 0 ? 'E' : ''}</text>
          </g>
        ))}

        {COASTS.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="var(--chart-coast)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        ))}

        {/* compass rose in the open Atlantic */}
        <g className="sm-rose" aria-hidden="true">
          <line x1={rose.x} y1={rose.y - 11} x2={rose.x} y2={rose.y + 11} stroke="var(--chart-coast)" strokeWidth="0.9" />
          <line x1={rose.x - 11} y1={rose.y} x2={rose.x + 11} y2={rose.y} stroke="var(--chart-coast)" strokeWidth="0.9" />
          <path d={`M${rose.x},${rose.y - 6} L${rose.x + 2.4},${rose.y} L${rose.x},${rose.y + 6} L${rose.x - 2.4},${rose.y} Z`}
            fill="var(--chart-coast)" />
          <text className="sm-grat" x={rose.x} y={rose.y - 15} textAnchor="middle">N</text>
        </g>

        {/* the aurora band — the top latitudes' standing invitation */}
        <path
          d="M318,52 C352,38 396,30 442,30"
          fill="none" stroke="var(--live)" strokeWidth="6" strokeLinecap="round" strokeDasharray="1 9"
          opacity={auroraOn() ? 0.55 : 0.25}
        />
        <text className="sm-faint" x={MAP_W - 14} y={44} textAnchor="end">
          aurora {auroraOn() ? 'window open' : 'from ~20 aug'}
        </text>

        {route && (
          <polyline points={route} fill="none" stroke="var(--ember)" strokeWidth="1.4"
            strokeDasharray="4 4" strokeLinecap="round" opacity=".8" />
        )}

        {byLat.map((n) => {
          const { x, y } = project(n.lat, n.lon);
          const t = n.days[0]?.tmax ?? n.temp ?? 15;
          const r = 3 + sunDays(n) * 0.8;
          const rainToday = (n.days[0]?.rain ?? 0) >= 2;
          const labelLeft = x > MAP_W - 90;
          const dy = labelDy[n.id] ?? 0;
          return (
            <g key={n.id} className="sm-node" onClick={() => openNode(n.id)} role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNode(n.id); } }}
              aria-label={`${n.name}: ${Math.round(t)} degrees, ${sunDays(n)} of 5 sunny days`}>
              {rainToday && <circle className="sm-rain" cx={x} cy={y} r={r + 3.5} />}
              <circle cx={x} cy={y} r={r} fill={tempRamp(t)} stroke="var(--chart-ink)" strokeWidth="1" />
              {Math.abs(dy) > 5 && (
                <line x1={labelLeft ? x - r - 2 : x + r + 2} y1={y} x2={labelLeft ? x - r - 8 : x + r + 8} y2={y + dy}
                  stroke="var(--chart-grid)" strokeWidth="0.75" />
              )}
              <text x={labelLeft ? x - r - 4 : x + r + 4} y={y + 3 + dy} textAnchor={labelLeft ? 'end' : 'start'}>
                {n.name.toUpperCase()} {Math.round(t)}°
              </text>
            </g>
          );
        })}

        {outlookStamp && (
          <text className="sm-faint" x={MAP_W - 14} y={MAP_H - 16} textAnchor="end">
            {outlookStamp.stale && <tspan fill="var(--ember)">△ stale read · </tspan>}
            outlook {stamp(outlookStamp.generatedAt)}
          </text>
        )}
      </svg>

      <div className="heat" role="img" aria-label="Six-day maximum temperature matrix for every destination">
        <div className="heat-row heat-row--head">
          <span />
          {dayLabels.map((d, i) => (
            <span key={i} className={i === 0 ? 'today' : ''}>{d}</span>
          ))}
        </div>
        {byLat.map((n) => (
          <div key={n.id} className="heat-row">
            <span className="heat-name">{n.name}</span>
            {n.days.slice(0, daysN).map((d, i) => (
              <span key={i} className={`heat-cell heat-cell--b${tempBucket(d.tmax)}${i === 0 ? ' today' : ''}`}
                style={{ background: tempRamp(d.tmax) }}
                title={`${n.name} ${dayLabels[i]}: ${Math.round(d.tmax)}°${d.rain >= 2 ? ' · rain' : ''}`}>
                {Math.round(d.tmax)}
                {d.rain >= 2 && <i className="heat-rain" aria-hidden="true" />}
              </span>
            ))}
          </div>
        ))}
        <div className="heat-legend" aria-hidden="true">
          {RAMP.map((c, i) => (
            <span key={c} className="hl-swatch"><i style={{ background: c }} />{RAMP_LABELS[i]}</span>
          ))}
          <span className="hl-key">▪ edge = hot</span>
          <span className="hl-key">● = rain</span>
        </div>
      </div>
      <p className="pt-sub" style={{ marginTop: 8 }}>
        colour is today's ceiling · size is sun in the next five days · the dashed line is the arc Claude currently backs
      </p>
    </div>
  );
}
