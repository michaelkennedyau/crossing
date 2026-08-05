import { useEffect, useState } from 'react';

/**
 * The south verdict — why this door is dead for this window, the one thing that would
 * revive it, and why Europe is the better outcome. Content lives in D1 (south_intel)
 * so the read stays current without a deploy; the card renders whatever the document
 * says and nothing when it says nothing.
 */
interface Intel { verdict: string; sections: { title: string; lines: string[] }[] }

export function SouthIntel(): JSX.Element | null {
  const [intel, setIntel] = useState<Intel | null>(null);
  const [updated, setUpdated] = useState('');

  useEffect(() => {
    fetch('/api/south/intel')
      .then((r) => r.json() as Promise<{ intel: Intel | null; updatedAt?: string }>)
      .then((d) => { if (d.intel?.sections?.length) { setIntel(d.intel); setUpdated(d.updatedAt ?? ''); } })
      .catch(() => {});
  }, []);

  if (!intel) return null;

  return (
    <div className="card southintel">
      <p className="card-eyebrow" style={{ color: 'var(--ember)' }}>The verdict · read before planning anything south</p>
      <p className="si-verdict">{intel.verdict}</p>
      {intel.sections.map((s) => (
        <div key={s.title} className="si-section">
          <p className="si-title">{s.title}</p>
          {s.lines.map((l) => (
            <p key={l.slice(0, 40)} className="si-line"><span className="mk">→</span>{l}</p>
          ))}
        </div>
      ))}
      {updated && <p className="pw-stamp">the read as of {new Date(updated + 'Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</p>}
    </div>
  );
}
