import { describe, expect, it } from 'vitest';
import { app } from '../../src/app';
import { journalEnv } from './stub-env';
import { fpDelta, corpusRead, THRESHOLD } from '../../src/journal/traversata-gen';
import { traversataMd } from '../../src/journal/render-traversata';

/**
 * The regeneration engine's laws: the threshold decides when real API burns; the
 * fingerprint reads the corpus honestly; the desk button is admin-only and async.
 */

describe('traversata-gen · the content threshold', () => {
  it('below threshold: not due', () => {
    const { due, delta } = fpDelta({ words: 1000, edited: 5, told: 3 }, { words: 1100, edited: 9, told: 4 });
    expect(due).toBe(false);
    expect(delta).toEqual({ words: 100, edited: 4, told: 1 });
  });

  it(`any single axis crossing fires: ${THRESHOLD.words} words OR ${THRESHOLD.edited} edits OR ${THRESHOLD.told} told`, () => {
    expect(fpDelta({ words: 0, edited: 0, told: 0 }, { words: THRESHOLD.words, edited: 0, told: 0 }).due).toBe(true);
    expect(fpDelta({ words: 0, edited: 0, told: 0 }, { words: 0, edited: THRESHOLD.edited, told: 0 }).due).toBe(true);
    expect(fpDelta({ words: 0, edited: 0, told: 0 }, { words: 0, edited: 0, told: THRESHOLD.told }).due).toBe(true);
  });

  it('no prior generation: everything counts as drift', () => {
    expect(fpDelta(null, { words: 50, edited: 0, told: 0 }).delta.words).toBe(50);
  });

  it('a shrinking corpus never goes negative', () => {
    expect(fpDelta({ words: 500, edited: 9, told: 2 }, { words: 400, edited: 3, told: 1 }).delta).toEqual({ words: 0, edited: 0, told: 0 });
  });
});

describe('traversata-gen · the corpus read', () => {
  it('counts words, lived edits, and marks them in the digest', async () => {
    const body = JSON.stringify([
      { t: 'p', text: 'five words are in here', by: 'seed' },
      { t: 'p', text: 'her four lived words', by: 'c' },
      { t: 'prompt', q: 'What did the lanyard look like?', by: 'seed' },
    ]);
    const { env } = journalEnv({ chapters: [{ id: 'ch01', title: 'Gare du Nord', day_date: '2026-08-15', body, closer: 'as arranged' }] });
    const { fp, digest } = await corpusRead(env as never);
    expect(fp.words).toBe(9);
    expect(fp.edited).toBe(1);
    expect(digest).toContain('her four lived words [her edit]');
    expect(digest).toContain('open question (unanswered — never invent its answer)');
    expect(digest).toContain('closer: as arranged');
  });
});

describe('traversata-gen · the desk button', () => {
  it('regenerate is admin-only', async () => {
    const { env } = journalEnv();
    const asReader = await app.fetch(new Request('http://x/api/journal/traversata/regenerate', {
      method: 'POST', headers: { cookie: 'jr=read-secret-token' },
    }), env as never);
    expect(asReader.status).toBe(403);
  });

  it('admin gets started:true plus the drift, and the work is deferred', async () => {
    const { env } = journalEnv({ chapters: [{ id: 'ch01', title: 'x', body: JSON.stringify([{ t: 'p', text: 'a few corpus words here', by: 'seed' }]) }] });
    const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as unknown as ExecutionContext;
    const res = await app.fetch(new Request('http://x/api/journal/traversata/regenerate', {
      method: 'POST', headers: { cookie: 'ja=admin-secret-token' },
    }), env as never, ctx);
    expect(res.status).toBe(200);
    const j = await res.json() as { started: boolean; drift: { delta: { words: number } } };
    expect(j.started).toBe(true);
    expect(j.drift.delta.words).toBeGreaterThan(0);
  });
});

describe('traversata · act headers', () => {
  it('## lines become themed act headers, escaped', () => {
    const html = traversataMd('## IL DRAMMA\n\nUn minuto a Gare du Nord.\n\n## LA COMMEDIA <b>\n\nIl macinapepe.');
    expect(html).toContain('<h2 class="act">IL DRAMMA</h2>');
    expect(html).toContain('<h2 class="act">LA COMMEDIA &lt;b&gt;</h2>');
    expect(html).toContain('<p>Il macinapepe.</p>');
  });
});
