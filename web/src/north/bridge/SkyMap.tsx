import { useMemo } from 'react';
import { MAP_W, MAP_H, project, tempRamp } from '../board/geo';
import { type Arc } from '../planner/cfg';

/**
 * The chart room — a hand-drawn sky chart of the board's Europe. Nodes sit at their real
 * lat/lon (equirectangular, chart-not-survey), coloured by today's max temperature, sized by
 * five-day sun count; rain today pulses a blue ring; the aurora band rides the top latitudes;
 * the top-ranked arc sails through as a dashed route. Below it, the heat strip: every node ×
 * six days as a temperature matrix. Clicking a node opens its card on the board.
 */
interface WxDay { tmax: number; rain: number }
interface WxNode {
  id: string; name: string; country: string; lat: number; lon: number;
  temp: number | null; code: number | null; days: WxDay[];
}

// arc-segment id → weather-node id, where they differ (reverse of the board's alias)
const SEG_NODE_ALIAS: Record<string, string> = { smeralda: 'olbia', london1: 'london', london2: 'london' };

const sunDays = (n: WxNode): number => n.days.slice(0, 5).filter((d) => d.rain < 2).length;

// stylised coastline suggestion strokes — deliberately a chart, not a survey
const COASTS: string[] = [
  'M96,392 C112,362 118,332 122,300 C130,278 152,268 172,262 C186,256 198,252 206,246', // Iberia → Biscay → Brittany
  'M196,226 C186,204 188,178 198,158 C208,142 224,138 234,150 C244,168 246,196 238,216 C230,228 214,232 202,230', // Britain
  'M326,128 C336,100 348,74 366,56 C384,42 404,36 424,32', // the Norwegian coast
  'M342,258 C352,282 366,306 378,326 C384,340 388,350 386,358 M368,344 C374,350 380,352 386,350', // Adriatic → the boot → Sicily
  'M452,322 C462,336 470,350 480,360 M488,346 C492,352 494,358 492,364', // the Aegean
];

function auroraOn(now: number = Date.now()): boolean {
  return now >= Date.parse('2026-08-20T00:00:00Z');
}

export function SkyMap({ nodes, topArc }: { nodes: WxNode[]; topArc: Arc | null }): JSX.Element | null {
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

  if (!nodes.length) return null;

  // rows north → south so the strip reads cool at the top like the map
  const byLat = [...nodes].sort((a, b) => b.lat - a.lat);
  const daysN = Math.min(6, ...nodes.map((n) => n.days.length));
  const dayLabels = Array.from({ length: daysN }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return i === 0 ? 'today' : d.toLocaleDateString('en-AU', { weekday: 'short' }).toLowerCase();
  });

  return (
    <div className="card chartroom">
      <p className="card-eyebrow" style={{ color: 'var(--live)' }}>The chart room · the sky, drawn</p>

      <svg className="skymap" viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img"
        aria-label="Chart of Europe: board destinations coloured by today's temperature, sized by sun days">
        <rect x="8" y="8" width={MAP_W - 16} height={MAP_H - 16} fill="rgba(237,243,248,.02)" stroke="rgba(126,142,160,.18)" />
        {COASTS.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="rgba(174,189,203,.3)" strokeWidth="1" strokeLinecap="round" />
        ))}

        {/* the aurora band — the top latitudes' standing invitation */}
        <path
          d="M318,52 C352,38 396,30 442,30"
          fill="none" stroke="#8be8c0" strokeWidth="6" strokeLinecap="round" strokeDasharray="1 9"
          opacity={auroraOn() ? 0.55 : 0.22}
        />
        <text x="452" y="34" className="sm-faint">aurora {auroraOn() ? 'window open' : 'from ~20 aug'}</text>

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
          return (
            <g key={n.id} className="sm-node" onClick={() => openNode(n.id)} role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNode(n.id); } }}
              aria-label={`${n.name}: ${Math.round(t)} degrees, ${sunDays(n)} of 5 sunny days`}>
              {rainToday && <circle className="sm-rain" cx={x} cy={y} r={r + 3.5} />}
              <circle cx={x} cy={y} r={r} fill={tempRamp(t)} stroke="rgba(4,8,16,.6)" strokeWidth="1" />
              <text x={labelLeft ? x - r - 4 : x + r + 4} y={y + 3} textAnchor={labelLeft ? 'end' : 'start'}>
                {n.name.toUpperCase()} {Math.round(t)}°
              </text>
            </g>
          );
        })}
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
              <span key={i} className={`heat-cell${i === 0 ? ' today' : ''}`} style={{ background: tempRamp(d.tmax) }}
                title={`${n.name} ${dayLabels[i]}: ${Math.round(d.tmax)}°${d.rain >= 2 ? ' · rain' : ''}`}>
                {Math.round(d.tmax)}
                {d.rain >= 2 && <i className="heat-rain" aria-hidden="true" />}
              </span>
            ))}
          </div>
        ))}
      </div>
      <p className="pt-sub" style={{ marginTop: 8 }}>
        colour is today's ceiling · size is sun in the next five days · the dashed line is the arc Claude currently backs
      </p>
    </div>
  );
}
