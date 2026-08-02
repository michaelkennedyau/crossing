import { useCallback, useEffect, useState } from 'react';

/**
 * The idea board — everything either of you has pinned, grouped by destination, growing as
 * the debate does. Pins arrive from the weather board's deep cards (destinations, hotels,
 * events) and from anywhere else that calls savePin. Unpinning soft-hides; nothing is lost.
 * Renders nothing until the first pin exists — the board earns its place.
 */
interface Pin {
  id: string; kind: string; node: string; title: string;
  detail: string; url: string; who: string; sort: number; created_at: string;
}

const NODE_NAMES: Record<string, string> = {
  london: 'London', edinburgh: 'Edinburgh', lofoten: 'Lofoten', tromso: 'Tromsø',
  venice: 'Venice', cortina: 'Dolomites', bled: 'Lake Bled', split: 'Split', hvar: 'Hvar',
  dubrovnik: 'Dubrovnik', taormina: 'Taormina', olbia: 'Costa Smeralda', milos: 'Milos',
  lisbon: 'Lisbon', funchal: 'Funchal',
};

const KIND_MARK: Record<string, string> = { destination: '⌖', hotel: '⌂', event: '✦', insight: '◉', note: '✎' };

/** hrefs on the board are http(s) or nothing — stored urls are re-checked at render too */
function safeHref(u: string): string | null {
  try {
    const p = new URL(u).protocol;
    return p === 'http:' || p === 'https:' ? u : null;
  } catch {
    return null;
  }
}

export function PinnedBoard(): JSX.Element | null {
  const [pins, setPins] = useState<Pin[]>([]);

  const load = useCallback((): void => {
    fetch('/api/north/pins')
      .then((r) => r.json() as Promise<{ pins: Pin[] }>)
      .then((d) => setPins(d.pins ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('north:pins-changed', load);
    return () => window.removeEventListener('north:pins-changed', load);
  }, [load]);

  const unpin = (id: string): void => {
    void fetch(`/api/north/pins/${encodeURIComponent(id)}`, { method: 'DELETE' })
      .then(load)
      .catch(() => {});
  };

  if (!pins.length) return null;

  const groups = new Map<string, Pin[]>();
  for (const p of pins) {
    const key = p.node || 'the trip';
    const g = groups.get(key) ?? [];
    g.push(p);
    groups.set(key, g);
  }

  return (
    <div className="card pinned">
      <p className="card-eyebrow" style={{ color: 'var(--ember)' }}>The idea board · {pins.length} pinned between you</p>
      <div className="pb-groups">
        {[...groups.entries()].map(([node, group]) => (
          <div key={node} className="pb-group">
            <p className="pb-node">{NODE_NAMES[node] ?? node}</p>
            {group.map((p) => (
              <div key={p.id} className={`pb-pin ${p.kind}`}>
                <span className="pb-mark" aria-hidden="true">{KIND_MARK[p.kind] ?? '✎'}</span>
                <span className="pb-body">
                  <b>{safeHref(p.url) ? <a href={safeHref(p.url) ?? undefined} target="_blank" rel="noopener">{p.title} ↗</a> : p.title}</b>
                  {p.detail && <i>{p.detail}</i>}
                </span>
                {p.who && <span className={`pb-who ${p.who}`}>{p.who}</span>}
                <button type="button" className="pb-un" aria-label={`unpin ${p.title}`} onClick={() => unpin(p.id)}>✕</button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
