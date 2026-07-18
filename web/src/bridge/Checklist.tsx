import { useEffect, useState } from 'react';

/**
 * The manifest — a small prep checklist that persists to crossing_todos (D1) so it survives reload
 * and follows across devices. The canonical item list lives here; the server stores checked-state.
 */
const ITEMS: { id: string; label: string }[] = [
  { id: 'sydney', label: 'Sydney overnight — QF527 lands SYD 15 Aug 13:50; hotel near the airport' },
  { id: 'cruce', label: 'Book the Cruce Andino — Peulla & Puerto Blest family rooms (quote-only)' },
  { id: 'qf28', label: 'Book QF28 returns — boys Thu 27 Aug, adults Sun 30 Aug (dep SCL 13:10)' },
  { id: 'skis', label: 'Boots only — rent skis at Catedral (158 cm crossing limit)' },
  { id: 'buffer', label: 'Hold the weather-buffer day over Paso Pérez Rosales' },
  { id: 'llao', label: 'Confirm Llao Llao — five, 22–27 Aug' },
  { id: 'return', label: 'Boys’ return: BRC→Santiago via Aeroparque, overnight, QF28' },
  { id: 'mendoza', label: 'Uco Valley lodge for two — Cavas or The Vines, 27–30 Aug; MDZ→SCL hop Sun' },
  { id: 'cover', label: 'Travel insurance + Argentine entry for five' },
];

export function Checklist(): JSX.Element {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/todos')
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
    fetch('/api/todos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, label, checked: next, sort }),
    }).catch(() => {});
  };

  return (
    <div className="card">
      <p className="card-eyebrow">The manifest · before the launch</p>
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
