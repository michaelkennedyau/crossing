import { describe, expect, it } from 'vitest';
import { parseGrammar, serializeBlock, parseBody, blockKey, type Block } from '../../src/journal/blocks';
import { chapterStats, diffBlocks, bumpStreak, streakLine, journalProgress, romeDate, prevDay } from '../../src/journal/progress';
import { MED_VIEW, LAND_VIEW, PORTS, ROUTE, ROUTE_ORDER, project, portById, resolveFocus, routeSplit, fmtAmount } from '../../src/journal/map-geo';

describe('journal · block grammar', () => {
  it('parses every block type and round-trips through serialize', () => {
    const text = [
      'A plain paragraph of prose, one breath.',
      '> a quoted line',
      '$ a deadpan aside',
      '::img 3',
      '::drop la ficelle, 1862 — one image, one question.',
      '::ledger 45 EUR — Marina, taxi, price agreed before boarding',
      '::doctrine avoid ruin, then optimise.',
      '::map nice',
      '::prompt What did the lanyard actually look like?',
      '::card\n  ⭐ champagne on the ficelle terrace\n  a line\n  one rule: never race a funicular',
    ].join('\n\n');
    const blocks = parseGrammar(text);
    expect(blocks.map((b) => b.t)).toEqual(['p', 'q', 'mono', 'img', 'drop', 'ledger', 'doctrine', 'map', 'prompt', 'card']);
    expect(blocks.every((b) => b.by === 'seed')).toBe(true);
    const ledger = blocks[5] as Extract<Block, { t: 'ledger' }>;
    expect(ledger.amount).toBe('45 EUR');
    expect(ledger.text).toContain('Marina');
    const card = blocks[9] as Extract<Block, { t: 'card' }>;
    expect(card.star).toBe('champagne on the ficelle terrace');
    expect(card.rule).toBe('never race a funicular');
    // round-trip: serialize each and re-parse — same blocks
    const rt = parseGrammar(blocks.map(serializeBlock).join('\n\n'));
    expect(rt).toEqual(blocks);
  });

  it('stacked directive lines in one segment each become their own block', () => {
    const blocks = parseGrammar('::ledger 981 GBP — Eurostar\n::ledger 148 EUR — the 19:00 to Lyon\n::ledger 0 EUR — the pré-plainte');
    expect(blocks).toHaveLength(3);
    expect(blocks.every((b) => b.t === 'ledger')).toBe(true);
    expect((blocks[1] as { amount: string }).amount).toBe('148 EUR');
  });

  it('joins multi-line paragraphs, drops empties and unknown directives', () => {
    const blocks = parseGrammar('line one\nline two\n\n\n::wat nope\n\n> quoted');
    expect(blocks).toHaveLength(2);
    expect((blocks[0] as { text: string }).text).toBe('line one line two');
  });

  it('parseBody filters malformed stored blocks', () => {
    const good: Block = { t: 'p', text: 'hi', by: 'm' };
    const json = JSON.stringify([good, { t: 'p' }, { t: 'nope', by: 'seed' }, 42]);
    expect(parseBody(json)).toEqual([good]);
    expect(parseBody('garbage')).toEqual([]);
  });

  it('blockKey is author-blind and content-sensitive', () => {
    const a: Block = { t: 'p', text: 'same words', by: 'seed' };
    const b: Block = { t: 'p', text: 'same words', by: 'c' };
    const c: Block = { t: 'p', text: 'different', by: 'seed' };
    expect(blockKey(a)).toBe(blockKey(b));
    expect(blockKey(a)).not.toBe(blockKey(c));
  });
});

describe('journal · the game brain', () => {
  const seedP = (text: string): Block => ({ t: 'p', text, by: 'seed' });

  it('all-seed chapter with photos caps at the photo band', () => {
    const st = chapterStats([seedP('a b c'), seedP('d e f')], 3, 0);
    expect(st.score).toBe(15);
    expect(st.told).toBe(false);
  });

  it('personalised chapter crosses told on words alone', () => {
    const blocks: Block[] = [
      { t: 'p', text: Array(160).fill('word').join(' '), by: 'c' },
      { t: 'p', text: 'seed line', by: 'seed' },
    ];
    const st = chapterStats(blocks, 0, 0);
    // editedFraction 0.5/0.6 → 37.5 + words 25 → 62.5 → not told; add prompts answered
    expect(st.score).toBeGreaterThanOrEqual(62);
    const st2 = chapterStats(blocks, 1, 2); // photo + 2 seed prompts answered (removed)
    expect(st2.told).toBe(true);
  });

  it('lived requires told AND no open prompts', () => {
    const blocks: Block[] = [
      { t: 'p', text: Array(200).fill('w').join(' '), by: 'm' },
      { t: 'prompt', q: 'still open?', by: 'seed' },
    ];
    const st = chapterStats(blocks, 3, 1); // 1 seed prompt, still present → answered 0
    expect(st.promptsOpen).toBe(1);
    expect(st.lived).toBe(false);
  });

  it('diffBlocks: unchanged inherits, edited stamps, reorder preserves, dupes consume greedily', () => {
    const stored: Block[] = [seedP('alpha'), seedP('beta'), { t: 'p', text: 'gamma', by: 'm' }, seedP('dupe'), seedP('dupe')];
    const incoming: Block[] = [
      { t: 'p', text: 'gamma', by: 'seed' },   // reordered; incoming by is ignored
      { t: 'p', text: 'beta edited', by: 'seed' },
      { t: 'p', text: 'alpha', by: 'seed' },
      { t: 'p', text: 'dupe', by: 'seed' },
      { t: 'p', text: 'dupe', by: 'seed' },
      { t: 'p', text: 'brand new', by: 'seed' },
    ];
    const out = diffBlocks(stored, incoming, 'c');
    expect(out.map((b) => b.by)).toEqual(['m', 'c', 'seed', 'seed', 'seed', 'c']);
  });

  it('streaks: idempotent same-day, consecutive, gap reset, best watermark', () => {
    let s = bumpStreak(null, '2026-08-20');
    expect(s).toEqual({ lastDay: '2026-08-20', length: 1, best: 1 });
    s = bumpStreak(s, '2026-08-20');
    expect(s.length).toBe(1);
    s = bumpStreak(s, '2026-08-21');
    s = bumpStreak(s, '2026-08-22');
    expect(s).toEqual({ lastDay: '2026-08-22', length: 3, best: 3 });
    s = bumpStreak(s, '2026-08-25'); // gap
    expect(s).toEqual({ lastDay: '2026-08-25', length: 1, best: 3 });
    expect(streakLine(s, '2026-08-25')).toBe('day 1 · best 3');
    expect(streakLine(s, '2026-08-30')).toBe('the streak stands at nought · best 3');
  });

  it('romeDate crosses the CEST boundary; prevDay is tz-proof', () => {
    expect(romeDate('2026-08-20T22:30:00Z')).toBe('2026-08-21');
    expect(prevDay('2026-09-01')).toBe('2026-08-31');
  });

  it('journalProgress: thin only among lived days, tonight is the thinnest', () => {
    const mk = (id: string, day: string, by: 'seed' | 'm'): { id: string; day_date: string; title: string; blocks: Block[]; photoCount: number; seedPromptCount: number } => ({
      id, day_date: day, title: id,
      blocks: [{ t: 'p', text: by === 'm' ? Array(200).fill('w').join(' ') : 'seed', by }],
      photoCount: by === 'm' ? 3 : 0, seedPromptCount: 0,
    });
    const prog = journalProgress(
      [mk('ch00', '2026-08-14', 'm'), mk('ch01', '2026-08-15', 'seed'), mk('ch20', '2026-09-03', 'seed')],
      '2026-08-16',
    );
    expect(prog.thin.map((t) => t.id)).toEqual(['ch01']);   // ch20 not lived yet
    expect(prog.tonight?.id).toBe('ch01');
    expect(prog.totals.m).toBeGreaterThan(0);
    expect(prog.totals.c).toBe(0);
  });
});

describe('journal · map geometry', () => {
  it('every route endpoint and via resolves and projects inside its view — the anti-NaN gate', () => {
    for (const leg of ROUTE) {
      expect(portById(leg.from), leg.from).toBeTruthy();
      expect(portById(leg.to), leg.to).toBeTruthy();
      for (const [lat, lon] of leg.via ?? []) {
        const { x, y } = project(lat, lon, MED_VIEW);
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
      }
    }
    expect(ROUTE_ORDER[0]).toBe('london');
    expect(ROUTE_ORDER[ROUTE_ORDER.length - 1]).toBe('palermo');
  });

  it('only the land cities fall outside the Med view', () => {
    const outside = PORTS.filter((p) => {
      const { x, y } = project(p.lat, p.lon, MED_VIEW);
      return x < 0 || y < 0 || x > MED_VIEW.w || y > MED_VIEW.h;
    }).map((p) => p.id);
    expect(outside.sort()).toEqual(['london', 'lyon', 'paris']);
    const lyon = project(45.76, 4.84, LAND_VIEW);
    expect(lyon.x).toBeGreaterThan(0);
    expect(lyon.y).toBeGreaterThan(0);
  });

  it('resolveFocus: slug tails, aliases, leg args, garbage', () => {
    expect(resolveFocus('ch06-calvi')).toEqual({ portId: 'calvi' });
    expect(resolveFocus('ch14-the-volcano-upstage', 'naxos')).toEqual({ portId: 'taormina' });
    expect(resolveFocus(null, 'porto-ercole--lipari')).toEqual({ legIndex: 9 });
    expect(resolveFocus('ch12-at-sea')).toBeNull();
    expect(resolveFocus(null, 'atlantis')).toBeNull();
  });

  it('routeSplit: portofino has six legs behind it; london has no arriving leg', () => {
    const s = routeSplit({ portId: 'portofino' });
    expect(s.before).toHaveLength(6);
    expect(s.current?.to).toBe('portofino');
    const l = routeSplit({ portId: 'london' });
    expect(l.current).toBeNull();
  });

  it('fmtAmount is deterministic', () => {
    expect(fmtAmount('45 EUR')).toBe('€45');
    expect(fmtAmount('£981')).toBe('£981');
    expect(fmtAmount('23,280 AUD')).toBe('AUD 23,280');
    expect(fmtAmount('two pints')).toBe('two pints');
  });
});
