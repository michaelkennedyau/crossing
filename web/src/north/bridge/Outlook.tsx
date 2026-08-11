import { type Cfg } from '../planner/cfg';

/**
 * The outlook — Claude's read of the live board, cached server-side (3 h) and re-ranked
 * against every arc. Renders nothing at all when the feed is offline; a chip click hands
 * the arc to the Planner via the north:pick-arc event (the Planner listens).
 */
export interface OutlookRanking {
  arc: string;
  score: number;
  verdict: 'go' | 'maybe' | 'skip';
  because: string;
}
export interface OutlookData {
  headline: string;
  narrative: string;
  ranking: OutlookRanking[];
  watch: string[];
}
export interface OutlookPayload {
  outlook: OutlookData;
  generatedAt: string;
  cached?: boolean;
  /** score delta per arc vs the previous read (north_outlook_log) — the board's direction of travel */
  trend?: Record<string, number>;
  /** last read is always served instantly; past 3 h it's flagged and re-fired in the background */
  stale?: boolean;
  ageHours?: number;
}

/** ▲ rising, ▼ falling, · flat — how an arc's score moved since the last read */
export function trendMark(delta: number | undefined): { mark: string; cls: string } {
  if (!delta) return { mark: '·', cls: 'flat' };
  return delta > 0 ? { mark: `▲${delta}`, cls: 'up' } : { mark: `▼${Math.abs(delta)}`, cls: 'down' };
}

export function pickArcEvent(arc: string): void {
  window.dispatchEvent(new CustomEvent('north:open-shutter', { detail: 'planner' }));
  window.dispatchEvent(new CustomEvent('north:pick-arc', { detail: arc }));
}

export function stamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** the fired-stamp split for structured rendering: date and 24 h time as separate segments */
export function firedParts(iso: string): { date: string; time: string } | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false }),
  };
}

export function Outlook({ data, cfg }: { data: OutlookPayload | null; cfg: Cfg }): JSX.Element | null {
  if (!data?.outlook) return null;
  const o = data.outlook;
  const ranking = [...o.ranking].sort((a, b) => b.score - a.score);

  return (
    <div className="card outlook">
      <p className="card-eyebrow" style={{ color: 'var(--live)' }}>The outlook · Claude reads the sky</p>
      <h3 className="ol-headline">{o.headline}</h3>
      <p className="ol-narrative">{o.narrative}</p>

      <div className="ol-chips">
        {ranking.map((r) => {
          const arc = cfg.arcs[r.arc as keyof typeof cfg.arcs];
          if (!arc) return null;
          return (
            <button
              key={r.arc}
              type="button"
              className={`ol-chip ${r.verdict}`}
              title={r.because}
              onClick={() => pickArcEvent(r.arc)}
            >
              <span className="ol-name">{arc.name}</span>
              <span className="ol-score">
                {r.score}
                <em className={`ol-trend ${trendMark(data.trend?.[r.arc]).cls}`}> {trendMark(data.trend?.[r.arc]).mark}</em>
              </span>
              <span className="ol-because">{r.because}</span>
            </button>
          );
        })}
      </div>

      {o.watch.length > 0 && (
        <div className="ol-watch">
          <p className="qs-title">On the watch list</p>
          {o.watch.map((w, i) => (
            <div key={i} className="q"><span className="mk">→</span><span>{w}</span></div>
          ))}
        </div>
      )}

      <p className="ol-stamp">
        as of {stamp(data.generatedAt)}
        {typeof data.ageHours === 'number' && data.ageHours >= 1 ? ` · ${Math.round(data.ageHours)}h old` : ''}
      </p>
      {data.stale && (
        <p className="ol-stale">△ stale read — over three hours old; the 3-hourly re-fire will replace it</p>
      )}
    </div>
  );
}
