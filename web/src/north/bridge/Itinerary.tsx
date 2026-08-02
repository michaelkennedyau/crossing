import { useState } from 'react';
import { savePin } from './WeatherBoard';

/**
 * The plan on paper — the recommended itinerary as the READING view (the spread is the
 * instrument view of the same document; the bridge owns the single fetch and passes it
 * down). Every hotel and every day is pinnable to the shared board.
 */
export interface ItinHotel { name: string; why: string; url: string }
export interface ItinDay { date: string; title: string; plan: string }
export interface ItinStop {
  key: string; name: string; node: string; dates: string; nights: number;
  hotel: ItinHotel; altHotel: ItinHotel; days: ItinDay[];
  eat: string[]; do: string[]; events: string[]; watchouts: string[];
}
export interface Itin { title: string; sub: string; stops: ItinStop[] }

export function Itinerary({ itin }: { itin: Itin | null }): JSX.Element | null {
  const [open, setOpen] = useState<string | null>(null);

  if (!itin) return null;
  const who = localStorage.getItem('north-who') ?? 'michael';
  // first stop reads open by default; '' means the reader closed everything on purpose
  const effectiveOpen = open ?? itin.stops[0]?.key ?? null;

  return (
    <div className="card itinerary">
      <p className="card-eyebrow" style={{ color: 'var(--ember)' }}>The plan on paper · researched, not booked</p>
      <h3 className="it-title">{itin.title}</h3>
      <p className="it-sub">{itin.sub}</p>

      {itin.stops.map((s) => {
        const isOpen = effectiveOpen === s.key;
        return (
          <div key={s.key} className={`it-stop${isOpen ? ' open' : ''}`}>
            <button type="button" className="it-head" aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? '' : s.key)}>
              <b>{s.name}</b>
              <i>{s.dates} · {s.nights}n</i>
              <em>{isOpen ? '▾' : '▸'}</em>
            </button>
            {isOpen && (
              <div className="it-body">
                <div className="it-hotels">
                  {[s.hotel, s.altHotel].filter((h) => h?.name).map((h, hi) => (
                    <div key={h.name} className="it-hotel">
                      <span className="wb-h-tier">{hi === 0 ? 'the room' : 'the sane room'}</span>
                      <b>{h.url ? <a href={h.url} target="_blank" rel="noopener">{h.name} ↗</a> : h.name}</b>
                      <i>{h.why}</i>
                      <button type="button" className="pin-btn" aria-label={`pin ${h.name}`}
                        onClick={() => void savePin({ kind: 'hotel', node: s.node, title: h.name, detail: h.why, url: h.url, who })}>
                        ⊕ pin
                      </button>
                    </div>
                  ))}
                </div>

                {s.days.map((d) => (
                  <div key={d.date} className="it-day">
                    <span className="it-date">{d.date}</span>
                    <span className="it-plan"><b>{d.title}</b> — {d.plan}</span>
                    <button type="button" className="pin-btn" aria-label={`pin ${d.date}`}
                      onClick={() => void savePin({ kind: 'note', node: s.node, title: `${d.date} — ${d.title}`, detail: d.plan, who })}>
                      ⊕
                    </button>
                  </div>
                ))}

                {s.eat.length > 0 && <p className="it-list"><b>eat</b>{s.eat.map((x) => <span key={x}>{x}</span>)}</p>}
                {s.do.length > 0 && <p className="it-list"><b>do</b>{s.do.map((x) => <span key={x}>{x}</span>)}</p>}
                {s.events.length > 0 && <p className="it-list it-list--ev"><b>on</b>{s.events.map((x) => <span key={x}>{x}</span>)}</p>}
                {s.watchouts.length > 0 && <p className="it-list it-list--warn"><b>△</b>{s.watchouts.map((x) => <span key={x}>{x}</span>)}</p>}
              </div>
            )}
          </div>
        );
      })}
      <p className="pt-sub" style={{ marginTop: 10 }}>researched by the fleet · dates verified where possible — anything marked verify, verify</p>
    </div>
  );
}
