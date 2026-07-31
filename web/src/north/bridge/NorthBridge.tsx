import { useEffect, useState } from 'react';
import { CFG, mergeCfg, type Cfg } from '../planner/cfg';
import { toggleTheme } from '../theme';
import { Planner } from './Planner';
import { NorthChecklist } from './NorthChecklist';

/**
 * The North's bridge — a structural sibling of the Andes Bridge, lean v1: ship's clock, the
 * Planner (the heart), the ledger of fixed logistics, and the manifest. No live feeds, no
 * concierge. Styles ride the shared bridge.css; the cold token values come from the shell's :root.
 */
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
      <p className="card-eyebrow">Ship's clock · QF · BNE Sat 8 Aug</p>
      <div className="clock-val">{txt}</div>
      <div className="clock-sub">days · hrs · min · sec to wheels-up</div>
      <div className="clock-syd">↗ then QF1 — Saigon, Singapore, London, the fjords</div>
    </div>
  );
}

function Logistics(): JSX.Element {
  const rows: [string, string, string?][] = [
    ['QF1 out', 'BNE → SYD → SIN · Sat 8 Aug · the A380'],
    ['Connect 2026', 'Sheraton Saigon · Mon 10 – Wed 12 · gala Wed night', 'https://www.marriott.com/en-us/hotels/sgnsi-sheraton-saigon-grand-opera-hotel/'],
    ['The exit', 'SGN → SIN Thu am · Raffles by evening', 'https://www.raffles.com/singapore/'],
    ['The night leg', 'QF1 · SIN → LHR · Fri 14 · lands 06:25 Sat'],
    ['The north', 'Lofoten · Holmen, Å — the quiet week', 'https://www.holmenlofoten.no'],
    ['The lights', 'Tromsø · window opens ~20 Aug'],
    ['The south', 'Sat 22 · the flotilla, or a Hvar shore base', 'https://www.theyachtweek.com'],
    ['QF2 home', 'LHR Mon 31 Aug → SYD → BNE 2 Sep'],
    ['Party', '2 — just us; the boys hold Brisbane'],
  ];
  return (
    <div className="card">
      <p className="card-eyebrow">Logistics · the fixed spine</p>
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

export function NorthBridge(): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<Cfg>(CFG);
  const [theme, setTheme] = useState<string>(() => document.documentElement.getAttribute('data-theme') ?? 'dark');

  // live override — never blocks; the panel is usable immediately with defaults
  useEffect(() => {
    fetch('/api/north/cfg')
      .then((r) => r.json() as Promise<{ override?: Partial<Cfg> | null }>)
      .then((c) => setCfg(mergeCfg(CFG, c.override)))
      .catch(() => {});
  }, []);

  // open/close wiring — any [data-open-bridge] opens; deep-link via #bridge or #arc=
  useEffect(() => {
    const openBridge = (): void => {
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
    <div className="bridge-overlay" role="dialog" aria-modal="true" aria-label="The Bridge — the north planner">
      <div className="bridge-grain" aria-hidden="true" />
      <div className="bridge-col">
        <div className="bridge-head">
          <div>
            <p className="bridge-eyebrow">The Bridge · the north</p>
            <h2 className="bridge-title">Plotting where she sails</h2>
          </div>
          <span style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="bridge-close" onClick={() => setTheme(toggleTheme())} aria-label="Toggle day or night theme">
              {theme === 'light' ? '☾ Night' : '☀ Day'}
            </button>
            <button type="button" className="bridge-close" onClick={close}>✕ Voyage</button>
          </span>
        </div>

        <ShipClock />
        <Planner cfg={cfg} />
        <div className="grid2">
          <Logistics />
          <NorthChecklist />
        </div>
        <p className="colophon">Imagery curated from Wikimedia Commons · a private voyage log for il varo</p>
      </div>
    </div>
  );
}
