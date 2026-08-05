import { describe, expect, it } from 'vitest';
import { diffPasses, sanitizePasses, type PassesPayload } from '../../src/lib/south-watch';

/** The pass watch's shape guards: garbage never reaches the card, and flips never pass silently. */
const mk = (lib: string, por: string, sam: string): unknown => ({
  passes: {
    libertadores: { status: lib, detail: 'd', source: 's' },
    portilloRoad: { status: por, detail: 'd', source: 's' },
    samore: { status: sam, detail: 'd', source: 's' },
  },
});

describe('south watch · sanitize', () => {
  it('accepts a clean read and stamps asOf', () => {
    const p = sanitizePasses(mk('closed', 'closed', 'open'), '2026-08-05T00:00:00Z');
    expect(p?.passes.libertadores.status).toBe('closed');
    expect(p?.passes.samore.status).toBe('open');
    expect(p?.asOf).toBe('2026-08-05T00:00:00Z');
  });
  it('coerces junk statuses to unknown and clamps strings', () => {
    const raw = mk('half-open', 'closed', 'open') as { passes: { libertadores: { detail: string } } };
    raw.passes.libertadores.detail = 'x'.repeat(999);
    const p = sanitizePasses(raw, 'now');
    expect(p?.passes.libertadores.status).toBe('unknown');
    expect(p?.passes.libertadores.detail.length).toBeLessThanOrEqual(300);
  });
  it('rejects missing passes outright', () => {
    expect(sanitizePasses({}, 'now')).toBeNull();
    expect(sanitizePasses({ passes: { libertadores: {} } }, 'now')).toBeNull();
    expect(sanitizePasses(null, 'now')).toBeNull();
  });
});

describe('south watch · change detection', () => {
  const prev = sanitizePasses(mk('closed', 'closed', 'open'), 't0') as PassesPayload;
  it('flags exactly the pass that flipped', () => {
    const next = diffPasses(prev, sanitizePasses(mk('restricted', 'closed', 'open'), 't1') as PassesPayload);
    expect(next.passes.libertadores.changed).toBe(true);
    expect(next.passes.portilloRoad.changed).toBeUndefined();
    expect(next.passes.samore.changed).toBeUndefined();
  });
  it('no previous read means no flags', () => {
    const next = diffPasses(null, sanitizePasses(mk('open', 'open', 'open'), 't1') as PassesPayload);
    expect(next.passes.libertadores.changed).toBeUndefined();
  });
});

describe('south watch · carry-forward and honest badges', () => {
  const prev = sanitizePasses(mk('closed', 'closed', 'open'), '2026-08-04T00:00:00Z') as PassesPayload;
  prev.passes.samore.lastConfirmed = '2026-08-03T00:00:00Z';

  it('unknown never destroys information — the known status carries, aged and dated', () => {
    const next = diffPasses(prev, sanitizePasses(mk('closed', 'closed', 'unknown'), '2026-08-05T00:00:00Z') as PassesPayload);
    expect(next.passes.samore.status).toBe('open');
    expect(next.passes.samore.aged).toBe(true);
    expect(next.passes.samore.lastConfirmed).toBe('2026-08-03T00:00:00Z');
    expect(next.passes.samore.changed).toBeUndefined();
  });

  it('unknown → known is confirmed, never CHANGED', () => {
    const aged = diffPasses(prev, sanitizePasses(mk('closed', 'closed', 'unknown'), 't1') as PassesPayload);
    const fresh = diffPasses(aged, sanitizePasses(mk('closed', 'closed', 'open'), 't2') as PassesPayload);
    expect(fresh.passes.samore.confirmed).toBe(true);
    expect(fresh.passes.samore.changed).toBeUndefined();
  });

  it('a real flip between known readings still earns CHANGED', () => {
    const next = diffPasses(prev, sanitizePasses(mk('open', 'closed', 'open'), 't1') as PassesPayload);
    expect(next.passes.libertadores.changed).toBe(true);
  });
});

describe('south forecast · the plough window', () => {
  it('finds the longest dry run', async () => {
    const { ploughWindow } = await import('../../src/lib/south-forecast');
    const days = [
      { date: '2026-08-05', snowCm: 0.1 }, { date: '2026-08-06', snowCm: 13.9 },
      { date: '2026-08-07', snowCm: 0.2 }, { date: '2026-08-08', snowCm: 0.2 },
      { date: '2026-08-09', snowCm: 0 }, { date: '2026-08-10', snowCm: 0 },
      { date: '2026-08-11', snowCm: 0 }, { date: '2026-08-12', snowCm: 1.3 },
      { date: '2026-08-13', snowCm: 1.3 },
    ];
    const w = ploughWindow(days);
    expect(w?.from).toBe('2026-08-07');
    expect(w?.to).toBe('2026-08-13');
    expect(w?.length).toBe(7);
  });
  it('a storm-wall forecast yields no window', async () => {
    const { ploughWindow } = await import('../../src/lib/south-forecast');
    expect(ploughWindow([{ date: 'a', snowCm: 9 }, { date: 'b', snowCm: 4 }])).toBeNull();
    expect(ploughWindow([{ date: 'a', snowCm: 9 }, { date: 'b', snowCm: 0 }])).toBeNull();
  });
});
