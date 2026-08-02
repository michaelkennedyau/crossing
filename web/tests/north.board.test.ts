import { describe, expect, it } from 'vitest';
import { KNOWLEDGE } from '../src/north/board/knowledge';
import { EU_NODES } from '../../src/lib/north-weather';
import { sanitizeEvents } from '../../src/lib/north-events';

/**
 * The board's knowledge layer: every weather node must carry a why and both beds, and the
 * events feed must never let malformed model output reach a card.
 */
describe('north board · knowledge', () => {
  it.each(EU_NODES.map((n) => n.id))('%s has a why and two beds', (id) => {
    const k = KNOWLEDGE[id];
    expect(k, `KNOWLEDGE missing node ${id}`).toBeDefined();
    expect(k.why.length).toBeGreaterThan(20);
    expect(k.hotels.length).toBeGreaterThanOrEqual(2);
    expect(k.hotels.some((h) => h.tier === 'good')).toBe(true);
    expect(k.hotels.some((h) => h.tier === 'sane')).toBe(true);
  });

  it('carries no orphan nodes the weather feed does not know', () => {
    const ids = new Set(EU_NODES.map((n) => n.id));
    for (const key of Object.keys(KNOWLEDGE)) expect(ids.has(key), `orphan knowledge node ${key}`).toBe(true);
  });
});

describe('north board · sanitizeEvents', () => {
  it('caps at six and strips junk', () => {
    const raw = {
      events: [
        ...Array.from({ length: 9 }, (_, i) => ({
          name: `Festival ${i}`, where: 'Town', whenText: 'late Aug', kind: 'festival', note: 'good',
        })),
      ],
    };
    expect(sanitizeEvents(raw)).toHaveLength(6);
  });

  it('drops nameless entries and coerces unknown kinds to culture', () => {
    const out = sanitizeEvents({
      events: [
        { name: '', where: 'x', whenText: 'x', kind: 'festival', note: 'x' },
        { name: 'Regatta', where: 'Bay', whenText: 'mid-Aug', kind: 'sailing', note: 'boats' },
        'garbage',
        null,
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Regatta');
    expect(out[0].kind).toBe('culture');
  });

  it('returns [] for anything that is not a shaped object', () => {
    expect(sanitizeEvents(null)).toEqual([]);
    expect(sanitizeEvents('no')).toEqual([]);
    expect(sanitizeEvents({ events: 'no' })).toEqual([]);
  });

  it('clamps runaway strings', () => {
    const out = sanitizeEvents({
      events: [{ name: 'x'.repeat(500), where: 'y'.repeat(500), whenText: 'z', kind: 'music', note: 'n'.repeat(999) }],
    });
    expect(out[0].name.length).toBeLessThanOrEqual(120);
    expect(out[0].note.length).toBeLessThanOrEqual(240);
  });
});
