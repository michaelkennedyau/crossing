import { useEffect, useState } from 'react';

/**
 * The north manifest — persists to north_todos (D1) so it survives reload and follows across
 * devices. The canonical item list lives here; the server stores checked-state.
 */
const ITEMS: { id: string; label: string }[] = [
  { id: 'qf1out', label: 'QF seats out — BNE→SYD + QF1 to SIN, ×2, Sat 8 Aug' },
  { id: 'qf1lhr', label: 'QF1 SIN→LHR ×2 — Fri 14 Aug, the night leg' },
  { id: 'qf2home', label: 'QF2 LHR ×2 — Mon 31 Aug · Brisbane by 2 Sep' },
  { id: 'evisas', label: 'Vietnam e-visas ×2 — lodge now, 3+ working days' },
  { id: 'sheraton', label: 'Sheraton Saigon Grand Opera — Sun 9 → Thu 13 Aug' },
  { id: 'sgnpair', label: 'SIN⇄SGN pair — Sunday evening out, Thursday morning back' },
  { id: 'fasttrack', label: 'SGN departure fast-track ×2 (+ arrival priority again)' },
  { id: 'raffles', label: 'Raffles Singapore — Thu 13 Aug, one night' },
  { id: 'gala', label: 'Gala outfits — cocktail, vibrant colours, 32° outdoors' },
  { id: 'oye', label: 'Hold Union Øye — rooms in single digits, ask before debating' },
  { id: 'storfjord', label: 'Hold Storfjord — the Geiranger balcony nights' },
  { id: 'holmen', label: 'Hold Holmen Lofoten — Å, from 22 Aug' },
  { id: 'tromso', label: 'Tromsø stay inside the aurora window — from ~20 Aug' },
  { id: 'cover', label: 'Travel insurance ×2 · the boys’ fortnight with Emily confirmed' },
];

export function NorthChecklist(): JSX.Element {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/north/todos')
      .then((r) => r.json() as Promise<{ todos: { id: string; checked: number }[] }>)
      .then((d) => {
        const m: Record<string, boolean> = {};
        for (const t of d.todos) m[t.id] = !!t.checked;
        setChecked(m);
      })
      .catch(() => {});
  }, []);

  const toggle = (id: string, label: string, sort: number): void => {
    const next = !checked[id];
    setChecked((c) => ({ ...c, [id]: next }));
    fetch('/api/north/todos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, label, checked: next, sort }),
    }).catch(() => {});
  };

  return (
    <div className="card">
      <p className="card-eyebrow">The manifest · before the second launch</p>
      <ul className="checklist">
        {ITEMS.map((it, i) => (
          <li key={it.id} className={checked[it.id] ? 'done' : ''}>
            <button type="button" onClick={() => toggle(it.id, it.label, i)} aria-pressed={!!checked[it.id]}>
              <span className="box">{checked[it.id] ? '✓' : ''}</span>
              <span>{it.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
