import { useEffect, useState } from 'react';
import { CFG, mergeCfg, type Cfg } from '../plotting/cfg';
import { forecast } from '../plotting/forecast';
import { PlottingTable } from './PlottingTable';
import { Checklist } from './Checklist';
import { Concierge } from './Concierge';
import { RouteChart } from './RouteChart';
import { Passage } from './Passage';
import { ChartKey } from './ChartKey';

interface Enso { oni: number; season?: string; year?: string; fallback?: boolean }
interface WxNode { node: string; temp: number | null; snow: number | null; freezing: number | null; status: 'clear' | 'storm' }

type VTDocument = Document & { startViewTransition?: (cb: () => void) => void };
const withTransition = (cb: () => void): void => {
  const d = document as VTDocument;
  if (typeof d.startViewTransition === 'function') d.startViewTransition(cb);
  else cb();
};

function pad(n: number): string { return String(n).padStart(2, '0'); }

function ShipClock(): JSX.Element {
  const iso = document.body.dataset.depart ?? '';
  const target = Date.parse(iso);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = Math.max(0, target - now);
  const sTot = Math.floor(ms / 1000);
  const d = Math.floor(sTot / 86400);
  const txt = ms <= 0 ? 'launched' : `${d}d ${pad(Math.floor((sTot % 86400) / 3600))}:${pad(Math.floor((sTot % 3600) / 60))}:${pad(sTot % 60)}`;
  return (
    <div className="card">
      <p className="card-eyebrow">Ship's clock · QF527 · BNE 4 Jul 12:15</p>
      <div className="clock-val">{txt}</div>
      <div className="clock-sub">days · hrs · min · sec to wheels-up</div>
      <div className="clock-syd">↗ Sydney overnight · then QF27, the launch · 5 Jul</div>
    </div>
  );
}

function EnsoGauge({ enso }: { enso: Enso }): JSX.Element {
  const angle = Math.max(-90, Math.min(90, (enso.oni / 2.5) * 90));
  const sign = enso.oni >= 0 ? '+' : '';
  const state = enso.oni > 0.5 ? 'El Niño — wetter Andes' : enso.oni < -0.5 ? 'La Niña — drier' : 'Neutral';
  return (
    <div className="card">
      <p className="card-eyebrow">ENSO · the live state</p>
      <div className="gauge-wrap">
        <svg viewBox="0 0 200 116" width="150" height="87" aria-hidden="true">
          <path d="M20 100 A80 80 0 0 1 100 20" fill="none" stroke="#3A6FA0" strokeWidth="6" strokeLinecap="round" opacity="0.55" />
          <path d="M100 20 A80 80 0 0 1 180 100" fill="none" stroke="var(--live-deep)" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
          <g transform={`rotate(${angle} 100 100)`} style={{ transition: 'transform 1.6s cubic-bezier(0.16,1,0.3,1)' }}>
            <line x1="100" y1="100" x2="100" y2="34" stroke="var(--ember)" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <circle cx="100" cy="100" r="5" fill="var(--ember)" />
        </svg>
        <div>
          <div className="gauge-read">ONI {sign}{enso.oni.toFixed(2)}</div>
          <div className="gauge-sub">{state}{enso.fallback ? ' · default' : ''}</div>
        </div>
      </div>
    </div>
  );
}

function Conditions({ nodes }: { nodes: WxNode[] }): JSX.Element {
  return (
    <div className="card">
      <p className="card-eyebrow">Pass &amp; snow · live conditions</p>
      <div className="cond-grid">
        {nodes.length === 0 && <div className="cond-row">conditions unavailable</div>}
        {nodes.map((n) => (
          <div className="cond" key={n.node}>
            <div className="cond-name">{n.node}</div>
            <div className="cond-row"><span>TEMP</span><span>{n.temp ?? '—'}°C</span></div>
            <div className="cond-row"><span>SNOW 24H</span><span>{n.snow ?? 0} cm</span></div>
            <div className="cond-row"><span>FREEZING</span><span>{n.freezing ?? '—'} m</span></div>
            <div className={`cond-status ${n.status}`}>▸ {n.status === 'storm' ? 'Storm risk' : 'Clear'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ForecastModel({ oni, setOni }: { oni: number; setOni: (n: number) => void }): JSX.Element {
  const fc = forecast(oni);
  const W = 320, H = 160, padL = 16, padR = 14, padT = 14, padB = 30;
  const iw = W - padL - padR, ih = H - padT - padB;
  const x = (d: number): number => padL + (d / 13) * iw;
  const yBase = (v: number): number => padT + ih - Math.min(1, v / 170) * ih;
  const baseLine = fc.days.map((d) => `${x(d.day).toFixed(1)},${yBase(d.base).toFixed(1)}`).join(' ');
  const baseArea = `${padL},${padT + ih} ${baseLine} ${padL + iw},${padT + ih}`;
  return (
    <div className="card">
      <p className="card-eyebrow">The forecast model · Base ↔ Powder</p>
      <div className="fc-reads">
        <div className="fc-read base"><div className="l">Base now</div><div className="v">{Math.round(fc.baseNow)} cm</div></div>
        <div className="fc-read peak"><div className="l">Peak fall</div><div className="v">{fc.peakFall} cm</div></div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="160" aria-hidden="true">
        <polygon points={baseArea} fill="rgba(124,138,147,0.14)" />
        <polyline points={baseLine} fill="none" stroke="var(--schist)" strokeWidth="1.5" />
        {fc.days.map((d) => {
          const h = Math.min(1, d.dailySnow / 46) * ih;
          return d.dailySnow > 0 ? <rect key={d.day} x={x(d.day) - 2} y={padT + ih - h} width="4" height={h} fill="var(--live)" opacity="0.85" rx="1" /> : null;
        })}
        <line x1={padL} y1={padT + ih} x2={padL + iw} y2={padT + ih} stroke="rgba(124,138,147,0.3)" strokeWidth="1" />
      </svg>
      <input className="fc-slider" type="range" min={-2.5} max={2.5} step={0.1} value={oni} onChange={(e) => setOni(Number.parseFloat(e.target.value))} />
      <div className="fc-slider-label"><span>La Niña −2.5</span><span>ONI {oni >= 0 ? '+' : ''}{oni.toFixed(1)}</span><span>+2.5 El Niño</span></div>
    </div>
  );
}

function Logistics(): JSX.Element {
  const rows: [string, string, string?][] = [
    ['QF527 in', 'BNE → SYD · Sat 4 Jul 12:15 · overnight'],
    ['QF27 in', 'SYD 12:20 → SCL 10:50 · 5 Jul'],
    ['QF28 out', 'EZE → SYD via Aeroparque'],
    ['Crossing', 'Cruce Andino', 'https://www.cruceandino.com'],
    ['Peulla', 'Hotel Natura', 'https://www.hotelnatura.cl'],
    ['Bariloche', 'Llao Llao', 'https://www.llaollao.com'],
    ['Skiing', 'Cerro Catedral', 'https://www.catedralaltapatagonia.com'],
    ['Party', '5 — two adults, sons 17 · 14 · 8'],
  ];
  return (
    <div className="card">
      <p className="card-eyebrow">Logistics · the ledger</p>
      <table className="ledger"><tbody>
        {rows.map(([l, v, url]) => (
          <tr key={l}>
            <td className="l">{l}</td>
            <td className="n" style={{ color: 'var(--snow-dim)' }}>
              {url ? (
                <a href={url} target="_blank" rel="noopener" style={{ color: 'var(--live)', textDecoration: 'none' }}>{v} ↗</a>
              ) : (
                v
              )}
            </td>
          </tr>
        ))}
      </tbody></table>
    </div>
  );
}

export function Bridge(): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [enso, setEnso] = useState<Enso>({ oni: 1.5 });
  const [nodes, setNodes] = useState<WxNode[]>([]);
  const [cfg, setCfg] = useState<Cfg>(CFG);
  const [oni, setOni] = useState(1.5);
  const [openP, setOpenP] = useState(0); // scroll fraction when the Bridge was opened (for the chart ember)

  // live data — never blocks; the panel is usable immediately with defaults
  useEffect(() => {
    fetch('/api/enso').then((r) => r.json() as Promise<Enso>).then((e) => { setEnso(e); setOni(e.oni); }).catch(() => {});
    fetch('/api/weather').then((r) => r.json() as Promise<{ nodes?: WxNode[] }>).then((w) => setNodes(w.nodes ?? [])).catch(() => {});
    fetch('/api/cfg').then((r) => r.json() as Promise<{ override?: Partial<Cfg> | null }>).then((c) => setCfg(mergeCfg(CFG, c.override))).catch(() => {});
  }, []);

  // open/close wiring — any [data-open-bridge] opens; deep-link via #bridge or #arc=
  useEffect(() => {
    const openBridge = (): void => {
      const root = getComputedStyle(document.documentElement);
      setOpenP(parseFloat(root.getPropertyValue('--p')) || 0);
      withTransition(() => { setOpen(true); document.body.style.overflow = 'hidden'; });
    };
    const onClick = (e: MouseEvent): void => {
      if ((e.target as HTMLElement).closest('[data-open-bridge]')) { e.preventDefault(); openBridge(); }
    };
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') withTransition(() => { setOpen(false); document.body.style.overflow = ''; }); };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    if (/#(bridge|arc=)/.test(location.hash)) openBridge();
    return () => { document.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); };
  }, []);

  if (!open) return null;
  const close = (): void => withTransition(() => { setOpen(false); document.body.style.overflow = ''; });

  return (
    <div className="bridge-overlay" role="dialog" aria-modal="true" aria-label="The Bridge — live instruments">
      <div className="bridge-grain" aria-hidden="true" />
      <div className="bridge-col">
        <div className="bridge-head">
          <div>
            <p className="bridge-eyebrow">The Bridge · live instruments</p>
            <h2 className="bridge-title">Watching how she runs</h2>
          </div>
          <button type="button" className="bridge-close" onClick={close}>✕ Voyage</button>
        </div>

        <div className="grid2">
          <ShipClock />
          <EnsoGauge enso={enso} />
        </div>

        <PlottingTable cfg={cfg} />

        <Conditions nodes={nodes} />
        <ForecastModel oni={oni} setOni={setOni} />
        <RouteChart nodes={nodes} openP={openP} />
        <Passage />
        <div className="grid2">
          <Logistics />
          <Checklist />
        </div>
        <Concierge />
        <ChartKey />
        <p className="colophon">Imagery curated from Wikimedia Commons · a private voyage log for il varo</p>
      </div>
    </div>
  );
}
