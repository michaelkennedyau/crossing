import { useEffect, useState } from 'react';
import { CFG, mergeCfg, type Arc, type ArcId, type Cfg, type CfgOverride } from '../planner/cfg';
import { toggleTheme } from '../theme';
import { WeatherBoard } from './WeatherBoard';
import { PinnedBoard } from './PinnedBoard';
import { Planner } from './Planner';
import { NorthChecklist } from './NorthChecklist';
import { Outlook, type OutlookPayload } from './Outlook';
import { Concierge } from '../../bridge/Concierge';

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
      <div className="clock-syd">↗ then QF1 — Saigon, and nineteen open nights from London</div>
    </div>
  );
}

function Logistics(): JSX.Element {
  const rows: [string, string, string?][] = [
    ['QF1 out', 'BNE → SYD → SIN · Sat 8 Aug · the A380'],
    ['Connect 2026', 'Sheraton Saigon · Mon 10 – Wed 12 · gala Wed night', 'https://www.marriott.com/en-us/hotels/sgnsi-sheraton-saigon-grand-opera-hotel/'],
    ['The exit', 'SGN → SIN Thu 13 am · QF1 south of midnight'],
    ['The night leg', 'QF1 · SIN → LHR · dep Thu 23:20 · lands Fri 14, 06:35'],
    ['Norway', 'Lofoten · Holmen, Å — the quiet week', 'https://www.holmenlofoten.no'],
    ['Tromsø', 'aurora window opens ~20 Aug'],
    ['Croatia', 'Sat 22 · the flotilla, or a Hvar shore base', 'https://www.theyachtweek.com'],
    ['QF2 home', 'LHR Wed 2 Sep → SYD → BNE Fri 4 Sep'],
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
  const [outlook, setOutlook] = useState<OutlookPayload | null>(null);
  const [manifest, setManifest] = useState<Record<string, { lqip?: string }>>({});
  const [theme, setTheme] = useState<string>(() => document.documentElement.getAttribute('data-theme') ?? 'dark');

  // the image manifest (aspect + LQIP per slug) — fetched once, the Planner paints LQIP-first
  useEffect(() => {
    fetch('/img/manifest.json')
      .then((r) => r.json() as Promise<Record<string, { lqip?: string }>>)
      .then(setManifest)
      .catch(() => {});
  }, []);

  // Claude's cached read of the board — absent (offline / no key) means the card never renders.
  useEffect(() => {
    fetch('/api/north/outlook')
      .then((r) => r.json() as Promise<OutlookPayload | { outlook: null }>)
      .then((j) => { if (j.outlook) setOutlook(j as OutlookPayload); })
      .catch(() => {});
  }, []);

  // live overrides — never block; the panel is usable immediately with defaults.
  // Two sources compose: /api/north/cfg (assumption tweaks) then /api/north/arcs
  // (D1 arc rows + spine), which win. Each source fails independently.
  useEffect(() => {
    void Promise.allSettled([
      fetch('/api/north/cfg').then((r) => r.json() as Promise<{ override?: CfgOverride | null }>),
      fetch('/api/north/arcs').then(
        (r) => r.json() as Promise<{ arcs?: Record<string, Arc>; spine?: { nightsTotal?: number } | null }>,
      ),
    ]).then(([cfgRes, arcsRes]) => {
      let next = CFG;
      if (cfgRes.status === 'fulfilled') next = mergeCfg(next, cfgRes.value.override);
      if (arcsRes.status === 'fulfilled') {
        const { arcs, spine } = arcsRes.value;
        if ((arcs && Object.keys(arcs).length) || spine?.nightsTotal) {
          next = mergeCfg(next, { arcs, nightsTotal: spine?.nightsTotal });
        }
      }
      if (next !== CFG) setCfg(next);
    });
  }, []);

  // open/close wiring — any [data-open-bridge] opens; deep-link via #bridge or #arc=
  useEffect(() => {
    const openBridge = (): void => {
      withTransition(() => { setOpen(true); document.body.style.overflow = 'hidden'; });
    };
    const onClick = (e: MouseEvent): void => {
      const opener = (e.target as HTMLElement).closest('[data-open-bridge]');
      if (!opener) return;
      e.preventDefault();
      // branch cards carry an #arc=… href — adopt it so the Planner mounts on that route
      const href = opener.getAttribute('href');
      if (href && href.startsWith('#arc=')) history.replaceState(null, '', href);
      openBridge();
    };
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') withTransition(() => { setOpen(false); document.body.style.overflow = ''; }); };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    if (/#(bridge|arc=)/.test(location.hash)) openBridge();

    // mission control — the G9 wall. When the viewport is an ultrawide (Samsung G9 57"
    // at native or scaled res) or #mission is forced, the bridge opens itself and the
    // whole board reflows into a single everything-at-once screen (CSS keys off body.mission).
    const mqs = [matchMedia('(min-width: 5000px)'), matchMedia('(min-width: 3400px) and (min-aspect-ratio: 21/9)')];
    const applyMission = (): void => {
      const on = mqs.some((q) => q.matches) || location.hash.includes('mission');
      document.body.classList.toggle('mission', on);
      if (on) openBridge();
    };
    applyMission();
    mqs.forEach((q) => q.addEventListener('change', applyMission));
    window.addEventListener('hashchange', applyMission);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      mqs.forEach((q) => q.removeEventListener('change', applyMission));
      window.removeEventListener('hashchange', applyMission);
    };
  }, []);

  if (!open) return null;
  const close = (): void => withTransition(() => { setOpen(false); document.body.style.overflow = ''; });

  // Claude's top-ranked arc — badged on the Planner card and on the board's matching nodes.
  const topPick = outlook
    ? ([...outlook.outlook.ranking].sort((a, b) => b.score - a.score)[0]?.arc as ArcId | undefined) ?? null
    : null;
  const topPickSegIds = topPick && cfg.arcs[topPick] ? cfg.arcs[topPick].segments.map((s) => s.id) : [];

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

        <Outlook data={outlook} cfg={cfg} />
        <PinnedBoard />
        <WeatherBoard topSegIds={topPickSegIds} outlook={outlook} cfg={cfg} />
        <ShipClock />
        <Planner cfg={cfg} pick={topPick} manifest={manifest} />
        <Concierge
          endpoint="/api/north/concierge"
          eyebrow="The concierge · ask the fortnight"
          placeholder="Where's the warmth this week? Which arc survives a wet Lofoten?"
        />
        <div className="grid2">
          <Logistics />
          <NorthChecklist />
        </div>
        <p className="colophon">Imagery curated from Wikimedia Commons · a private voyage log for il varo</p>
      </div>
    </div>
  );
}
