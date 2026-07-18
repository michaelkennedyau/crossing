import { useEffect, useMemo, useState } from 'react';
import {
  PRESETS, DEFAULT_SCENARIO, SPLIT_OFFSET, SKI_MIN, SKI_MAX, dateAt, aud,
  type Cfg, type Cross, type Scenario, type SecondAct,
} from '../plotting/cfg';
import { compute, type Who } from '../plotting/compute';
import { flagsFor, questionsFor } from '../plotting/constraints';

const CROSSES: { val: Cross; label: string }[] = [
  { val: 'lakes', label: 'The lakes' },
  { val: 'road', label: 'The road' },
  { val: 'fly', label: 'Fly in' },
];
const ACTS: { val: SecondAct; label: string }[] = [
  { val: 'ski', label: 'Ski on' },
  { val: 'mendoza', label: 'Mendoza' },
  { val: 'patagonia', label: 'Patagonia' },
  { val: 'iguazu', label: 'Iguazú' },
];

const sameScenario = (a: Scenario, b: Scenario): boolean =>
  a.cross === b.cross && a.iguazu === b.iguazu && a.split === b.split &&
  a.secondAct === b.secondAct && a.skiDays === b.skiDays;

function encodeArc(s: Scenario): string {
  const parts = [s.cross, s.split ? 'split' : 'whole', s.secondAct, `ski${s.skiDays}`];
  if (s.iguazu) parts.push('ig');
  return parts.join('.');
}
function decodeArc(hash: string): Scenario | null {
  const m = /arc=([a-z0-9.]+)/i.exec(hash);
  if (!m) return null;
  const p = m[1].split('.');
  const cross = p[0] as Cross;
  if (!['lakes', 'road', 'fly'].includes(cross)) return null;
  const secondAct = (p[2] ?? 'ski') as SecondAct;
  const ski = Number.parseInt((p[3] ?? '').replace('ski', ''), 10);
  return {
    cross,
    split: p[1] === 'split',
    secondAct: ['ski', 'mendoza', 'patagonia', 'iguazu'].includes(secondAct) ? secondAct : 'ski',
    skiDays: Number.isFinite(ski) ? Math.min(SKI_MAX, Math.max(SKI_MIN, ski)) : 4,
    iguazu: p.includes('ig'),
  };
}

function tint(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('puerto varas')) return 'rgba(46,108,120,0.18)';
  if (l.includes('cruce') || l.includes('seven') || l.includes('blest')) return 'rgba(31,163,126,0.16)';
  if (l.includes('catedral')) return 'rgba(124,138,147,0.14)';
  if (l.includes('iguaz')) return 'rgba(55,201,194,0.16)';
  if (l.includes('mendoza')) return 'rgba(150,110,150,0.16)';
  if (l.includes('patagonia')) return 'rgba(80,140,150,0.16)';
  if (l.includes('ski')) return 'rgba(124,138,147,0.14)';
  return 'rgba(124,138,147,0.12)';
}

export function PlottingTable({ cfg }: { cfg: Cfg }): JSX.Element {
  const [s, setS] = useState<Scenario>(() => decodeArc(location.hash) ?? DEFAULT_SCENARIO);
  const [cmpOpen, setCmpOpen] = useState(false);
  const [cmpName, setCmpName] = useState(PRESETS[3].name); // default compare vs "Two Wonders"

  const r = useMemo(() => compute(s, cfg), [s, cfg]);
  const flags = useMemo(() => flagsFor(s, r), [s, r]);
  const questions = useMemo(() => questionsFor(s), [s]);

  // keep the arc in the URL hash so a chosen path is linkable + deep-loads
  useEffect(() => {
    const next = `#arc=${encodeArc(s)}`;
    if (location.hash !== next) history.replaceState(null, '', next);
  }, [s]);

  const active = PRESETS.find((p) => sameScenario(p.s, s));
  const asFive = r.phases.filter((p) => p.who === 'all').reduce((a, p) => a + p.nights, 0);
  const forTwo = r.phases.filter((p) => p.who === 'parents').reduce((a, p) => a + p.nights, 0);
  const homeBoys = s.split ? dateAt(SPLIT_OFFSET) : dateAt(r.totalNights);
  const homeParents = dateAt(r.totalNights);

  const set = (patch: Partial<Scenario>): void => setS((prev) => ({ ...prev, ...patch }));

  // strip with running calendar offset
  let off = 0;
  const cells = r.phases.map((p) => {
    const cell = { ...p, date: dateAt(off) };
    off += p.nights;
    return cell;
  });

  const cmp = PRESETS.find((p) => p.name === cmpName) ?? PRESETS[3];
  const cmpR = compute(cmp.s, cfg);

  return (
    <section className="card">
      <div className="pt-head">
        <div>
          <p className="card-eyebrow" style={{ color: 'var(--live)' }}>The Plotting Table · steer the shape</p>
          <p className="pt-sub">Dates are fixed — QF27 lands Santiago 10:50, 17 August. The variable is the shape. Choose, and watch the cost, the calendar and the consequences land.</p>
        </div>
        <div className="pt-total">
          <div className="amt">{aud(r.cost)}</div>
          <div className="days">{r.totalNights} nights · {asFive} as five · {forTwo} for two · home {s.split ? `${homeBoys} / ${homeParents}` : homeParents}</div>
        </div>
      </div>

      <div className="presets">
        {PRESETS.map((p) => (
          <button key={p.name} type="button" className={`preset${active?.name === p.name ? ' on' : ''}`} onClick={() => setS(p.s)}>
            {p.name}
          </button>
        ))}
        {!active && <button type="button" className="preset on">Custom</button>}
      </div>

      <div className="levers">
        <div>
          <p className="lever-label">Cross the Andes</p>
          <div className="seg">
            {CROSSES.map((o) => (
              <button key={o.val} type="button" className={s.cross === o.val ? 'on' : ''} onClick={() => set({ cross: o.val })}>{o.label}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="lever-label">Iguazú · the falls</p>
          <div className="seg">
            <button type="button" className={s.iguazu ? 'on' : ''} onClick={() => set({ iguazu: true })}>Add it</button>
            <button type="button" className={!s.iguazu ? 'on' : ''} onClick={() => set({ iguazu: false })}>Skip</button>
          </div>
        </div>
        <div>
          <p className="lever-label">Ski days · the family</p>
          <div className="stepper">
            <button type="button" onClick={() => set({ skiDays: Math.max(SKI_MIN, s.skiDays - 1) })}>−</button>
            <span className="v">{s.skiDays}</span>
            <button type="button" onClick={() => set({ skiDays: Math.min(SKI_MAX, s.skiDays + 1) })}>+</button>
          </div>
        </div>
        <div>
          <p className="lever-label">The split · boys home 27 Aug</p>
          <div className="seg">
            <button type="button" className={`${s.split ? 'on ember' : ''}`} onClick={() => set({ split: true })}>Boys home · 15th</button>
            <button type="button" className={!s.split ? 'on' : ''} onClick={() => set({ split: false })}>Stay five</button>
          </div>
          {s.split && (
            <div className="subact">
              <p className="lever-label" style={{ color: 'var(--ember)' }}>Second act · for two</p>
              <div className="seg">
                {ACTS.map((o) => (
                  <button key={o.val} type="button" className={s.secondAct === o.val ? 'on ember' : ''} onClick={() => set({ secondAct: o.val })}>{o.label}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="cal">
        <p className="cal-cap">{s.split ? '✦ 27 Aug · boys home · 5 → 2' : '✦ all five, all the way'}</p>
        <div className="ember-track" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => <span key={`f${i}`} className="ember-dot" />)}
          {s.split && <span className="ember-div" />}
          {s.split && Array.from({ length: 2 }).map((_, i) => <span key={`t${i}`} className="ember-dot" />)}
        </div>
        <div className="strip">
          {cells.map((c, i) => (
            <div key={i} className={`seg-cell${c.who === 'parents' ? ' two' : ''}`} style={{ flexGrow: c.nights, background: tint(c.label) }}>
              <div className="sn">{c.date}</div>
              <div className="sl">{c.label}</div>
              <div className="sw">{c.nights}n · {c.who === 'parents' ? '2' : '5'}</div>
            </div>
          ))}
        </div>
        <div className="cal-legend">
          <span><span className="swatch five" />All five</span>
          <span><span className="swatch two" />For two — the ember edge</span>
        </div>
      </div>

      <table className="ledger">
        <tbody>
          {r.legs.map((l, i) => (
            <tr key={i}><td className="l">{l.label}</td><td className="n">{aud(l.amount)}</td></tr>
          ))}
          <tr className="tot"><td>In-region total</td><td className="n">{aud(r.cost)}</td></tr>
        </tbody>
      </table>

      <div className="flags">
        <p className="flags-title">What it triggers</p>
        {flags.map((f, i) => (
          <div key={i} className={`flag ${f.level}`}>
            <span className="mk">{f.level === 'warn' ? '△' : f.level === 'ok' ? '●' : '◆'}</span>
            <span>{f.text}</span>
          </div>
        ))}
        <p className="qs-title">Open questions for this arc</p>
        {questions.map((q, i) => (
          <div key={i} className="q"><span className="mk">→</span><span>{q}</span></div>
        ))}
      </div>

      <div className="cmp-toggle">
        <button type="button" className="bridge-close" onClick={() => setCmpOpen((v) => !v)}>
          {cmpOpen ? 'Hide compare' : 'Hold side by side'}
        </button>
      </div>
      {cmpOpen && (
        <div className="cmp-grid">
          <div className="cmp-col cur">
            <h4>{active?.name ?? 'Custom'} — this arc</h4>
            <div className="cmp-row"><span>Cost</span><b>{aud(r.cost)}</b></div>
            <div className="cmp-row"><span>Nights</span><b>{r.totalNights}</b></div>
            <div className="cmp-row"><span>As five / for two</span><b>{asFive} / {forTwo}</b></div>
            <div className="cmp-row"><span>Crossing</span><b>{s.cross}</b></div>
            <div className="cmp-row"><span>Iguazú</span><b>{s.iguazu ? 'yes' : 'no'}</b></div>
            <div className="cmp-row"><span>Second act</span><b>{s.split ? s.secondAct : '—'}</b></div>
          </div>
          <div className="cmp-col">
            <h4>
              <select className="cmp-select" value={cmpName} onChange={(e) => setCmpName(e.target.value)}>
                {PRESETS.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </h4>
            <div className="cmp-row"><span>Cost</span><b>{aud(cmpR.cost)}</b></div>
            <div className="cmp-row"><span>Nights</span><b>{cmpR.totalNights}</b></div>
            <div className="cmp-row"><span>As five / for two</span><b>{cmpR.phases.filter((p: { who: Who }) => p.who === 'all').reduce((a, p) => a + p.nights, 0)} / {cmpR.phases.filter((p) => p.who === 'parents').reduce((a, p) => a + p.nights, 0)}</b></div>
            <div className="cmp-row"><span>Crossing</span><b>{cmp.s.cross}</b></div>
            <div className="cmp-row"><span>Iguazú</span><b>{cmp.s.iguazu ? 'yes' : 'no'}</b></div>
            <div className="cmp-row"><span>Second act</span><b>{cmp.s.split ? cmp.s.secondAct : '—'}</b></div>
          </div>
        </div>
      )}
    </section>
  );
}
