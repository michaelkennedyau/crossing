import { useEffect, useMemo, useState } from 'react';
import {
  CFG, DEFAULT_SELECTION, defaultSelection, dateAt, aud,
  type ArcId, type Cfg, type Selection, type Tier,
} from '../planner/cfg';
import { compute } from '../planner/compute';
import { flagsFor, questionsFor } from '../planner/constraints';

/**
 * The Planner — the North's replacement for the Plotting Table. Not a fixed itinerary: a rich
 * journey composer. Three rival arcs as presets; every segment's nights steppable; the cost, the
 * calendar and the consequences land live. The chosen shape rides the URL hash, so a picked arc
 * is linkable — send Claire the link, get a verdict.
 */
const ARC_IDS: ArcId[] = [
  'highlow', 'slovcroatia', 'dolosicily', 'scotgreece', 'norsardinia',
  'fjords', 'highlands', 'dolomiti', 'slovenia', 'sicily', 'sardinia',
  'cyclades', 'portugal', 'madeira', 'gulet', 'yachtweek',
];

// arc → image slug (web/public/img/<slug>-1280.webp) — the debate, seen before it is read
const ARC_IMG: Record<ArcId, string> = {
  highlow: 'n-aurora', fjords: 'n-hjorund', highlands: 'arc-highlands', dolomiti: 'arc-dolomiti',
  slovenia: 'arc-slovenia', sicily: 'arc-sicily', sardinia: 'arc-sardinia', cyclades: 'arc-cyclades',
  portugal: 'arc-portugal', madeira: 'arc-madeira', gulet: 'arc-gulet', yachtweek: 'arc-yachtweek',
  dolosicily: 'combo-italia', scotgreece: 'combo-scotgreece', slovcroatia: 'arc-slovenia', norsardinia: 'combo-norsard',
};

function encodeSel(s: Selection, cfg: Cfg): string {
  const arc = cfg.arcs[s.arc];
  return `${s.arc}:${s.tier}:${arc.segments.map((seg) => s.nights[seg.id] ?? seg.nights).join('.')}`;
}
function decodeSel(hash: string, cfg: Cfg): Selection | null {
  const m = /arc=([a-z]+):(?:(special|sane):)?([\d.]+)/i.exec(hash);
  if (!m) return null;
  const arcId = m[1] as ArcId;
  if (!ARC_IDS.includes(arcId)) return null;
  const arc = cfg.arcs[arcId];
  const parts = m[3].split('.').map((n) => Number.parseInt(n, 10));
  const sel = defaultSelection(arcId, cfg, (m[2] as Tier) || 'special');
  arc.segments.forEach((seg, i) => {
    const v = parts[i];
    if (Number.isFinite(v)) sel.nights[seg.id] = Math.min(seg.max, Math.max(seg.min, v));
  });
  return sel;
}

function tint(id: string): string {
  const map: Record<string, string> = {
    london1: 'rgba(126,142,160,0.14)', london2: 'rgba(242,180,94,0.12)',
    oye: 'rgba(47,169,140,0.18)', storfjord: 'rgba(91,200,222,0.14)',
    lofoten: 'rgba(139,232,192,0.16)', tromso: 'rgba(111,227,176,0.2)',
    split: 'rgba(242,180,94,0.1)', gulet: 'rgba(91,200,222,0.16)', dubrovnik: 'rgba(242,180,94,0.12)',
    fife: 'rgba(150,110,150,0.16)', skye: 'rgba(91,200,222,0.14)', edinburgh: 'rgba(242,180,94,0.12)',
    taormina: 'rgba(242,180,94,0.16)', aeolian: 'rgba(91,200,222,0.16)', noto: 'rgba(242,180,94,0.12)',
    venice: 'rgba(242,180,94,0.12)', altabadia: 'rgba(47,169,140,0.16)', cortina: 'rgba(139,232,192,0.14)',
    athens1: 'rgba(126,142,160,0.12)', milos: 'rgba(91,200,222,0.18)', sifnos: 'rgba(242,180,94,0.14)', athens2: 'rgba(126,142,160,0.12)',
    bled: 'rgba(47,169,140,0.18)', soca: 'rgba(91,200,222,0.16)', vipava: 'rgba(150,110,150,0.14)', ljubljana: 'rgba(126,142,160,0.12)',
    tyw: 'rgba(91,200,222,0.18)', hvar: 'rgba(242,180,94,0.14)',
    smeralda: 'rgba(91,200,222,0.2)', barbagia: 'rgba(150,110,150,0.14)', chia: 'rgba(242,180,94,0.14)',
    funchal: 'rgba(47,169,140,0.16)', pontasol: 'rgba(242,180,94,0.14)', santana: 'rgba(139,232,192,0.14)',
    lisbon: 'rgba(242,180,94,0.12)', comporta: 'rgba(139,232,192,0.16)', douro: 'rgba(150,110,150,0.16)', porto: 'rgba(126,142,160,0.12)',
  };
  return map[id] ?? 'rgba(126,142,160,0.12)';
}

export function Planner({ cfg }: { cfg: Cfg }): JSX.Element {
  const [sel, setSel] = useState<Selection>(() => decodeSel(location.hash, CFG) ?? DEFAULT_SELECTION);

  const r = useMemo(() => compute(sel, cfg), [sel, cfg]);
  const flags = useMemo(() => flagsFor(sel, r), [sel, r]);
  const questions = useMemo(() => questionsFor(sel), [sel]);
  const arc = cfg.arcs[sel.arc];

  // keep the chosen shape in the URL hash so an arc is linkable + deep-loads
  useEffect(() => {
    const next = `#arc=${encodeSel(sel, cfg)}`;
    if (location.hash !== next) history.replaceState(null, '', next);
  }, [sel, cfg]);

  const pickArc = (id: ArcId): void => setSel((prev) => defaultSelection(id, cfg, prev.tier));
  const setTier = (tier: Tier): void => setSel((prev) => ({ ...prev, tier }));
  const step = (segId: string, d: number): void =>
    setSel((prev) => {
      const seg = arc.segments.find((x) => x.id === segId);
      if (!seg) return prev;
      const cur = prev.nights[segId] ?? seg.nights;
      const v = Math.min(seg.max, Math.max(seg.min, cur + d));
      return { ...prev, nights: { ...prev.nights, [segId]: v } };
    });

  const sailable = r.delta === 0;

  return (
    <section className="card">
      <div className="pt-head">
        <div>
          <p className="card-eyebrow" style={{ color: 'var(--live)' }}>The Planner · compose the middle</p>
          <p className="pt-sub">The spine is fixed — QF1 lands London 06:25 Sat 15 Aug, QF2 leaves Mon 31 Aug. Sixteen nights between. Pick an arc, push the nights around, and watch the cost, the calendar and the consequences land.</p>
        </div>
        <div className="pt-total">
          <div className="amt">{aud(r.cost)}</div>
          <div className="days" style={sailable ? undefined : { color: 'var(--ember-hot)' }}>
            {r.totalNights}/16 nights{sailable ? ' · sails' : ` · ${r.delta > 0 ? `${r.delta} over` : `${-r.delta} short`}`} · 15 – 31 Aug
          </div>
        </div>
      </div>

      <div className="arc-cards">
        {ARC_IDS.map((id) => {
          const a = cfg.arcs[id];
          const cost = compute(defaultSelection(id, cfg, sel.tier), cfg).cost;
          return (
            <button key={id} type="button" className={`arc-card${sel.arc === id ? ' on' : ''}`} onClick={() => pickArc(id)}>
              <span
                className="ai"
                role="img"
                aria-label={a.name}
                style={{ backgroundImage: `url("/img/${ARC_IMG[id]}-1280.webp")` }}
              />
              <span className="an">{a.name}</span>
              <span className="ac">{aud(cost)} · 16n</span>
            </button>
          );
        })}
      </div>
      <p className="pt-sub" style={{ marginTop: 8 }}>{arc.blurb}</p>

      <div className="flags" style={{ marginTop: 10 }}>
        <div className="flag ok"><span className="mk">◆</span><span><b>The case.</b> {arc.caseFor}</span></div>
        <div className="flag warn"><span className="mk">△</span><span><b>The counter.</b> {arc.caseAgainst}</span></div>
      </div>

      <div style={{ marginTop: 14 }}>
        <p className="lever-label">The rooms · both priced honestly</p>
        <div className="seg">
          <button type="button" className={sel.tier === 'special' ? 'on ember' : ''} onClick={() => setTier('special')}>The good rooms</button>
          <button type="button" className={sel.tier === 'sane' ? 'on' : ''} onClick={() => setTier('sane')}>The sane rooms</button>
        </div>
      </div>

      <div className="levers">
        {arc.segments.map((seg) => {
          const nights = sel.nights[seg.id] ?? seg.nights;
          const cell = r.cells.find((x) => x.id === seg.id);
          return (
            <div key={seg.id}>
              <p className="lever-label">
                {seg.link ? <a href={seg.link} target="_blank" rel="noopener" style={{ color: 'inherit' }}>{seg.label} ↗</a> : seg.label}
              </p>
              <div className="stepper">
                <button type="button" aria-label={`fewer nights at ${seg.short}`} onClick={() => step(seg.id, -1)}>−</button>
                <span className="v">{nights}</span>
                <button type="button" aria-label={`more nights at ${seg.short}`} onClick={() => step(seg.id, +1)}>+</button>
              </div>
              <p className="pt-sub" style={{ marginTop: 6 }}>
                {aud(seg.perNight[sel.tier])}/night{cell ? ` · from ${cell.date}` : ' · skipped'}
              </p>
            </div>
          );
        })}
      </div>

      <div className="cal">
        <p className="cal-cap">{sailable ? '✦ sixteen nights, berth to berth' : '△ the calendar doesn’t close — QF2 won’t wait'}</p>
        <div className="strip">
          {r.cells.map((c) => (
            <div key={c.id} className="seg-cell" style={{ flexGrow: c.nights, background: tint(c.id) }}>
              <div className="sn">{c.date}</div>
              <div className="sl">{c.short}</div>
              <div className="sw">{c.nights}n</div>
            </div>
          ))}
        </div>
        <div className="cal-legend">
          <span>home berth · BNE {dateAt(18)}</span>
        </div>
      </div>

      <table className="ledger">
        <tbody>
          {r.cells.map((c) => (
            <tr key={c.id}><td className="l">{c.label} ({c.nights}n)</td><td className="n">{aud(c.cost)}</td></tr>
          ))}
          <tr><td className="l">Inside the arc — flights, cars, boats</td><td className="n">{aud(r.transport)}</td></tr>
          <tr className="tot"><td>Europe total, for two</td><td className="n">{aud(r.cost)}</td></tr>
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
    </section>
  );
}
