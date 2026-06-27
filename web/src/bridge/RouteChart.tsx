import { useEffect, useRef, useState } from 'react';

/**
 * The bathymetric route chart — the Bridge's spine instrument (brief §7, README §6). A cold, glowing
 * navigator's chart: depth-contour lakes, a hand-drawn route that draws on open, the 976 m pass, the
 * nodes with Instrument Serif labels + live weather pinned, and the amber ember at the scroll
 * fraction the Bridge was opened from. Antique-chart marginalia in dim snow — the "hand" against the
 * mono telemetry.
 */
interface WxNode {
  node: string;
  temp: number | null;
  freezing: number | null;
  status: 'clear' | 'storm';
}

const NODES: { x: number; y: number; label: string; sub?: string; wx?: number; pass?: boolean; lpos?: 'left' }[] = [
  { x: 64, y: 300, label: 'Puerto Varas', wx: 0 },
  { x: 196, y: 246, label: 'Peulla' },
  { x: 330, y: 116, label: 'Paso Pérez Rosales', sub: '976 m', wx: 1, pass: true },
  { x: 414, y: 214, label: 'Lago Frías' },
  { x: 544, y: 244, label: 'Llao Llao' },
  { x: 606, y: 348, label: 'Cerro Catedral', wx: 2, lpos: 'left' },
];

const ROUTE =
  'M64,300 C120,292 156,272 196,246 C252,210 296,168 330,116 C360,168 392,196 414,214 ' +
  'C470,236 506,232 544,244 C580,272 596,318 606,348';

const LAKES = [
  { cx: 150, cy: 270, rx: 66, ry: 31, c: '31,163,126' }, // Lago Todos los Santos (emerald)
  { cx: 420, cy: 230, rx: 30, ry: 17, c: '55,201,194' }, // Lago Frías (turquoise)
  { cx: 566, cy: 272, rx: 80, ry: 41, c: '31,163,126' }, // Nahuel Huapi
];

export function RouteChart({ nodes, openP }: { nodes: WxNode[]; openP: number }): JSX.Element {
  const routeRef = useRef<SVGPathElement>(null);
  const [ember, setEmber] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const path = routeRef.current;
    if (!path) return;
    const len = path.getTotalLength();
    const pt = path.getPointAtLength(Math.min(1, Math.max(0, openP)) * len);
    setEmber({ x: pt.x, y: pt.y });

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // static — already drawn
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;
    void path.getBoundingClientRect(); // reflow so the transition takes
    requestAnimationFrame(() => {
      path.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(0.16, 1, 0.3, 1)';
      path.style.strokeDashoffset = '0';
    });
  }, [openP]);

  return (
    <div className="card routechart">
      <p className="card-eyebrow">The route chart · el cruce de los Andes</p>
      <svg viewBox="0 0 680 440" className="chart-svg" role="img" aria-label="Bathymetric chart of the Andes crossing — Puerto Varas to Cerro Catedral">
        <g stroke="rgba(124,138,147,0.08)" strokeWidth="0.5">
          {[80, 160, 240, 320, 400].map((y) => <line key={`h${y}`} x1="0" y1={y} x2="680" y2={y} />)}
          {[100, 200, 300, 400, 500, 600].map((x) => <line key={`v${x}`} x1={x} y1="0" x2={x} y2="440" />)}
        </g>

        {LAKES.map((l, i) => (
          <g key={i}>
            {[1, 0.68, 0.4].map((s, j) => (
              <ellipse key={j} cx={l.cx} cy={l.cy} rx={l.rx * s} ry={l.ry * s}
                fill={`rgba(${l.c},0.05)`} stroke={`rgba(${l.c},${0.22 + j * 0.14})`} strokeWidth="1" />
            ))}
          </g>
        ))}

        <path ref={routeRef} d={ROUTE} className="route-line" fill="none" />

        {NODES.map((n, i) => {
          const w = n.wx != null ? nodes[n.wx] : undefined;
          const lx = n.lpos === 'left' ? n.x - 9 : n.x + 9;
          const anchor = n.lpos === 'left' ? 'end' : 'start';
          const wxText = w ? `${w.temp != null ? `${Math.round(w.temp)}°` : '—'} · FL ${w.freezing ?? '—'}` : null;
          return (
            <g key={i}>
              <circle cx={n.x} cy={n.y} r={n.pass ? 4.5 : 3.2} className={n.pass ? 'cnode pass' : 'cnode'} />
              <text x={lx} y={n.y - 5} textAnchor={anchor} className="node-label">{n.label}</text>
              {n.sub && <text x={lx} y={n.y + 9} textAnchor={anchor} className="node-sub">{n.sub}</text>}
              {wxText &&
                (n.pass ? (
                  <text x={n.x} y={n.y - 14} textAnchor="middle" className="node-wx">{wxText}</text>
                ) : (
                  <text x={lx} y={n.sub ? n.y + 23 : n.y + 9} textAnchor={anchor} className="node-wx">{wxText}</text>
                ))}
            </g>
          );
        })}

        {ember && <circle cx={ember.x} cy={ember.y} r="5" className="chart-ember" />}

        <text x="226" y="304" className="margin-note">no road out</text>
        <text x="248" y="150" className="margin-note">the divide</text>
        <text x="150" y="264" className="depth">337</text>
        <text x="566" y="268" className="depth">464</text>

        <g transform="translate(640, 50)" className="compass">
          <circle r="15" fill="none" stroke="rgba(124,138,147,0.3)" strokeWidth="0.8" />
          <path d="M0,-14 L3,0 L0,4 L-3,0 Z" fill="var(--snow-dim)" />
          <text x="0" y="-18" className="compass-n">N</text>
        </g>
      </svg>
    </div>
  );
}
