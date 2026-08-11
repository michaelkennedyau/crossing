import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildSpread, dayLabel, forecastIndex, noteTitle, pinMatchesDay, tripDate, type SpreadDay } from '../board/spread';
import { dayScore, scoreColor } from '../board/geo';
import { savePin, type WxNode } from './WeatherBoard';
import { type Itin, type ItinStop } from './Itinerary';

/**
 * The spread — nineteen nights as one rail of little cards, the discussion point and the
 * calendar planner in the same object. Days group under thin stop bands; score chips light
 * up as each date enters the live forecast horizon; a pin dot marks days you two have
 * touched. Click a day and it lifts out: the plan, the room, the sky, the events, the
 * notes — and a composer that pins a note straight onto that day.
 */
interface Pin { id: string; kind: string; node: string; title: string; detail: string; url: string; who: string }
interface AreaEvent { name: string; where: string; whenText: string; kind: string; note: string }

function DayCard({
  day, score, pinCount, onOpen, cardRef,
}: {
  day: SpreadDay; score: number | null; pinCount: number;
  onOpen: () => void; cardRef: (el: HTMLButtonElement | null) => void;
}): JSX.Element {
  return (
    <button type="button" className="spread-day" onClick={onOpen} ref={cardRef}
      aria-label={`${day.label} — ${day.title}${score !== null ? `, scores ${score} of 100` : ''}${pinCount ? `, ${pinCount} pinned` : ''}`}>
      <span className="sd-date">{day.label}</span>
      <span className="sd-title">{day.title}</span>
      <span className="sd-foot">
        {score !== null && (
          <em className="sd-score" style={{ background: scoreColor(score) }}>{score}</em>
        )}
        {pinCount > 0 && <em className="sd-pins">◉ {pinCount}</em>}
      </span>
    </button>
  );
}

function LiftOut({
  day, stop, wx, pins, events, onClose,
}: {
  day: SpreadDay; stop: ItinStop; wx: WxNode | undefined;
  pins: Pin[]; events: AreaEvent[] | 'loading' | undefined; onClose: () => void;
}): JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState('');
  const who = localStorage.getItem('north-who') ?? 'michael';

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        // capture phase, and stop it here — the bridge's own Escape lives on the bubble
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const fi = forecastIndex(new Date(), day.offset);
  const fc = wx && fi !== null ? wx.days[fi] : undefined;

  const leaveNote = (): void => {
    const text = note.trim();
    if (!text) return;
    void savePin({ kind: 'note', node: day.node, title: noteTitle(day.offset, text), detail: text, who });
    setNote('');
  };

  return (
    <div className="lift-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lift-panel" role="dialog" aria-modal="true" aria-labelledby="lift-title" ref={panelRef} tabIndex={-1}>
        <p className="card-eyebrow" style={{ color: 'var(--ember)' }}>{day.stopName} · {stop.dates}</p>
        <h3 id="lift-title" className="lift-title">{day.label} — {day.title}</h3>
        <p className="lift-plan">{day.plan}</p>

        {fc && (
          <p className="lift-wx">
            <em className="sd-score" style={{ background: scoreColor(dayScore(fc.tmax, fc.rain, fc.feels)) }}>
              {dayScore(fc.tmax, fc.rain, fc.feels)}
            </em>
            {Math.round(fc.tmax)}° that day
            {typeof fc.feels === 'number' && Math.round(fc.feels) - Math.round(fc.tmax) >= 2 ? ` · feels ${Math.round(fc.feels)}` : ''}
            {fc.rain >= 2 ? ` · ${Math.round(fc.rain)}mm of rain` : ' · rainless'} — live forecast
          </p>
        )}

        {stop.hotel?.name && (
          <div className="it-hotel lift-hotel">
            <span className="wb-h-tier">the room</span>
            <b>{stop.hotel.url ? <a href={stop.hotel.url} target="_blank" rel="noopener">{stop.hotel.name} ↗</a> : stop.hotel.name}</b>
            <i>{stop.hotel.why}</i>
            <button type="button" className="pin-btn" aria-label={`pin ${stop.hotel.name}`}
              onClick={() => void savePin({ kind: 'hotel', node: day.node, title: stop.hotel.name, detail: stop.hotel.why, url: stop.hotel.url, who })}>
              ⊕ pin
            </button>
          </div>
        )}

        {Array.isArray(events) && events.length > 0 && (
          <div className="lift-events">
            <p className="qs-title">On, nearby</p>
            {events.slice(0, 3).map((ev) => (
              <div key={ev.name} className="wb-event">
                <b>{ev.name}</b>
                <i>{ev.whenText}</i>
                <span>{ev.note}</span>
              </div>
            ))}
          </div>
        )}
        {events === 'loading' && <p className="pt-sub">reading the calendar…</p>}

        {pins.length > 0 && (
          <div className="lift-pins">
            <p className="qs-title">Pinned to this day</p>
            {pins.map((p) => (
              <div key={p.id} className="pb-pin note">
                <span className="pb-body"><b>{p.title.replace(/^[^—]*—\s*/, '')}</b>{p.detail && p.detail !== p.title && <i>{p.detail}</i>}</span>
                {p.who && <span className={`pb-who ${p.who}`}>{p.who}</span>}
              </div>
            ))}
          </div>
        )}

        <div className="lift-note">
          <input
            type="text" value={note} placeholder={`leave a note on ${day.label} — as ${who}`}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') leaveNote(); }}
          />
          <button type="button" onClick={leaveNote} disabled={!note.trim()}>pin it</button>
        </div>

        <button type="button" className="lift-close" aria-label="close" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}

export function Spread({ itin, wxNodes }: { itin: Itin; wxNodes: WxNode[] | null }): JSX.Element {
  const days = useMemo(() => buildSpread(itin.stops), [itin]);
  const [pins, setPins] = useState<Pin[]>([]);
  const [events, setEvents] = useState<Record<string, AreaEvent[] | 'loading'>>({});
  const [lift, setLift] = useState<number | null>(null);
  const cardRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const loadPins = useCallback((): void => {
    fetch('/api/north/pins')
      .then((r) => r.json() as Promise<{ pins: Pin[] }>)
      .then((d) => setPins(d.pins ?? []))
      .catch(() => {});
  }, []);
  useEffect(() => {
    loadPins();
    window.addEventListener('north:pins-changed', loadPins);
    return () => window.removeEventListener('north:pins-changed', loadPins);
  }, [loadPins]);

  const openDay = (off: number, node: string): void => {
    setLift(off);
    if (events[node] === undefined) {
      setEvents((e) => ({ ...e, [node]: 'loading' }));
      fetch(`/api/north/events?node=${node}`)
        .then((r) => r.json() as Promise<{ events: AreaEvent[] }>)
        .then((d) => setEvents((e) => ({ ...e, [node]: d.events ?? [] })))
        .catch(() => setEvents((e) => ({ ...e, [node]: [] })));
    }
  };
  const closeLift = (): void => {
    const off = lift;
    setLift(null);
    if (off !== null) requestAnimationFrame(() => cardRefs.current[off]?.focus());
  };

  const today = new Date();
  const byStop = useMemo(() => {
    const groups: { stop: ItinStop; days: SpreadDay[] }[] = [];
    for (const d of days) {
      const stop = itin.stops.find((s) => s.key === d.stopKey);
      if (!stop) continue;
      const g = groups[groups.length - 1];
      if (g && g.stop.key === stop.key) g.days.push(d);
      else groups.push({ stop, days: [d] });
    }
    return groups;
  }, [days, itin]);

  const liftDay = lift !== null ? days.find((d) => d.offset === lift) ?? null : null;
  const liftStop = liftDay ? itin.stops.find((s) => s.key === liftDay.stopKey) ?? null : null;

  return (
    <div className="card spreadcard">
      <p className="card-eyebrow" style={{ color: 'var(--live)' }}>The spread · nineteen nights on one rail</p>
      <div className="spread">
        {byStop.map(({ stop, days: stopDays }) => {
          const startsAt = tripDate(stopDays[0].offset).getTime();
          const endsAt = tripDate(stopDays[stopDays.length - 1].offset + 1).getTime();
          const current = today.getTime() >= startsAt && today.getTime() < endsAt;
          return (
            <section key={stop.key} className={`spread-stop${current ? ' now' : ''}`}>
              <p className="spread-band">{stop.name} · {stop.nights}n</p>
              <div className="spread-days">
                {stopDays.map((d) => {
                  const wx = wxNodes?.find((n) => n.id === d.node);
                  const fi = forecastIndex(today, d.offset);
                  const fc = wx && fi !== null ? wx.days[fi] : undefined;
                  return (
                    <DayCard
                      key={d.offset}
                      day={d}
                      score={fc ? dayScore(fc.tmax, fc.rain, fc.feels) : null}
                      pinCount={pins.filter((p) => pinMatchesDay(p.title, d.offset)).length}
                      onOpen={() => openDay(d.offset, d.node)}
                      cardRef={(el) => { cardRefs.current[d.offset] = el; }}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
        <section className="spread-stop">
          <p className="spread-band">home</p>
          <div className="spread-days">
            <span className="spread-day spread-end">
              <span className="sd-date">{dayLabel(19)}</span>
              <span className="sd-title">QF2 · LHR 20:50 — the only wall</span>
            </span>
          </div>
        </section>
      </div>

      {liftDay && liftStop && (
        <LiftOut
          day={liftDay}
          stop={liftStop}
          wx={wxNodes?.find((n) => n.id === liftDay.node)}
          pins={pins.filter((p) => pinMatchesDay(p.title, liftDay.offset))}
          events={events[liftDay.node]}
          onClose={closeLift}
        />
      )}
    </div>
  );
}
