import { useEffect, useState } from 'react';

/**
 * The pass watch — the live answer to "has the mountain changed its mind". Three roads,
 * checked every three hours (web search → structured read → append-only log), plus the
 * plough window: the sky's next dry run, because crews dig in pauses. Carried statuses
 * wear their age honestly ("last confirmed 3 Aug"); CHANGED only ever means the world
 * changed, not our confidence in it. The 12 August rule is written on the card.
 */
type Status = 'open' | 'closed' | 'restricted' | 'unknown';
interface PassState {
  status: Status; detail: string; source: string;
  changed?: boolean; aged?: boolean; lastConfirmed?: string; confirmed?: boolean;
}
interface HistoryRow { asOf: string; libertadores: Status; portilloRoad: Status; samore: Status }
interface SnowDay { date: string; snowCm: number }
interface Payload {
  passes: Record<'libertadores' | 'samore' | 'portilloRoad', PassState> | null;
  asOf?: string; ageHours?: number; history?: HistoryRow[]; reason?: string;
  forecast?: { pass: SnowDay[]; valle: SnowDay[]; ploughWindow: { from: string; to: string; length: number } | null } | null;
}

const NAMES: Record<string, string> = {
  libertadores: 'Los Libertadores · CH-60',
  portilloRoad: 'Portillo access road',
  samore: 'Cardenal Samoré',
};

const ORDER = ['libertadores', 'portilloRoad', 'samore'] as const;

const day = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
};

export function PassWatch(): JSX.Element | null {
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    fetch('/api/south/passes')
      .then((r) => r.json() as Promise<Payload>)
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return null;

  const recentFlip =
    data.passes && data.asOf && Date.now() - Date.parse(data.asOf) < 48 * 3_600_000
      ? ORDER.some((id) => data.passes?.[id]?.changed)
      : false;
  const fc = data.forecast;
  const inWindow = (d: string): boolean =>
    !!fc?.ploughWindow && d >= fc.ploughWindow.from && d <= fc.ploughWindow.to;

  return (
    <div className="card passwatch">
      <p className="card-eyebrow" style={{ color: 'var(--ember)' }}>
        The pass watch · live, every three hours
        {recentFlip && <em className="pw-changed"> CHANGED</em>}
      </p>

      {!data.passes && <p className="pw-sub">{data.reason ?? 'first read pending'}</p>}

      {data.passes &&
        ORDER.map((id) => {
          const p = data.passes![id];
          return (
            <div key={id} className="pw-row">
              <span className={`pw-pill ${p.status}${p.aged ? ' aged' : ''}`}>{p.status}</span>
              <span className="pw-body">
                <b>
                  {NAMES[id]}
                  {p.changed && <em className="pw-changed"> · CHANGED</em>}
                  {p.confirmed && <em className="pw-confirmed"> · confirmed fresh</em>}
                </b>
                <i>
                  {p.aged && p.lastConfirmed ? `last confirmed ${day(p.lastConfirmed)} — ` : ''}
                  {p.detail}
                  {p.source ? ` — ${p.source}` : ''}
                </i>
              </span>
            </div>
          );
        })}

      {fc?.pass && fc.pass.length > 1 && (
        <div className="pw-plough">
          <p className="pw-strip-name" style={{ flexBasis: 'auto', marginBottom: 4 }}>
            the plough window · snow at the pass, next {fc.pass.length} days
            {fc.ploughWindow && ` — ${day(fc.ploughWindow.from)}–${day(fc.ploughWindow.to)} dry`}
          </p>
          <div className="pw-days">
            {fc.pass.map((d) => (
              <span key={d.date} className={`pw-day${d.snowCm < 2 ? ' dry' : ''}${inWindow(d.date) ? ' win' : ''}`}
                title={`${d.date}: ${d.snowCm.toFixed(1)} cm`}>
                <i>{d.snowCm >= 1 ? Math.round(d.snowCm) : ''}</i>
                <b>{d.date.slice(8)}</b>
              </span>
            ))}
          </div>
        </div>
      )}

      {data.history && data.history.length > 1 && (
        <div className="pw-strips" aria-label="Recent checks">
          {ORDER.map((id) => (
            <div key={id} className="pw-strip">
              <span className="pw-strip-name">{id === 'libertadores' ? 'CH-60' : id === 'portilloRoad' ? 'portillo' : 'samoré'}</span>
              {data.history!.map((h) => (
                <i key={h.asOf} className={`pw-dot ${h[id]}`} title={`${h.asOf.slice(5, 16)} · ${h[id]}`} />
              ))}
            </div>
          ))}
        </div>
      )}

      {typeof data.ageHours === 'number' && (
        <p className="pw-stamp">checked {data.ageHours < 1 ? 'under an hour' : `${Math.round(data.ageHours)}h`} ago · next within 3h</p>
      )}
      <p className="pw-trigger">
        △ the 12 August rule: the south revives ONLY if CH-60 is open AND QF27 Sun 16 Aug has seats AND a
        Portillo week is held — all three by 12 Aug. Otherwise the south stays down and Europe carries the trip.
      </p>
    </div>
  );
}
