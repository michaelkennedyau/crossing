import { describe, expect, it } from 'vitest';
import { app } from '../../src/app';
import { journalEnv } from './stub-env';
import type { Block } from '../../src/journal/blocks';

const M = { cookie: 'ja=admin-secret-token', 'content-type': 'application/json' };
const C = { cookie: 'jc=claire-secret-token', 'content-type': 'application/json' };
const R = { cookie: 'jr=read-secret-token', 'content-type': 'application/json' };

const seedBody = (texts: string[]): string =>
  JSON.stringify(texts.map((text) => ({ t: 'p', text, by: 'seed' })));

const CH = { id: 'ch06-calvi', day_date: '2026-08-20', title: 'The Citadel from the Water', body: seedBody(['alpha', 'beta', 'gamma']) };

const put = (env: import('../../src/env').Env, slug: string, headers: Record<string, string>, body: unknown) =>
  app.fetch(new Request(`http://x/api/journal/chapters/${slug}`, { method: 'PUT', headers, body: JSON.stringify(body) }), env);

describe('journal · chapter writes + attribution', () => {
  it("Claire's key writes with author c; the reader key cannot write; spoofed by is ignored", async () => {
    const { env, chapters } = journalEnv({ chapters: [CH] });
    const blocks = [
      { t: 'p', text: 'alpha', by: 'm' },          // spoof attempt — must stay seed
      { t: 'p', text: 'beta EDITED', by: 'm' },    // spoof attempt — must stamp c
      { t: 'p', text: 'gamma', by: 'seed' },
    ];
    const res = await put(env, 'ch06-calvi', C, { blocks });
    expect(res.status).toBe(200);
    const out = (await res.json()) as { blocks: Block[] };
    expect(out.blocks.map((b) => b.by)).toEqual(['seed', 'c', 'seed']);
    expect(JSON.parse(chapters.get('ch06-calvi')!.body).map((b: Block) => b.by)).toEqual(['seed', 'c', 'seed']);

    const denied = await put(env, 'ch06-calvi', R, { blocks });
    expect(denied.status).toBe(403);
  });

  it('michael and claire accumulate separately; save→read round-trips', async () => {
    const { env } = journalEnv({ chapters: [CH] });
    await put(env, 'ch06-calvi', M, { blocks: [{ t: 'p', text: 'alpha mine now' }, { t: 'p', text: 'beta' }, { t: 'p', text: 'gamma' }] });
    await put(env, 'ch06-calvi', C, { blocks: [{ t: 'p', text: 'alpha mine now' }, { t: 'p', text: 'beta hers now' }, { t: 'p', text: 'gamma' }] });
    const get = await app.fetch(new Request('http://x/api/journal/chapters/ch06-calvi', { headers: R }), env);
    const body = (await get.json()) as { blocks: Block[] };
    expect(body.blocks.map((b) => b.by)).toEqual(['m', 'c', 'seed']);
  });

  it('a new chapter via grammar text seeds by:seed and requires a title', async () => {
    const { env, chapters } = journalEnv();
    const missing = await put(env, 'ch99-extra', M, { text: 'hello world' });
    expect(missing.status).toBe(400);
    const res = await put(env, 'ch99-extra', M, { title: 'Extra', day_date: '2026-09-04', text: 'hello world\n\n::prompt what happened?' });
    expect(res.status).toBe(200);
    const row = chapters.get('ch99-extra')!;
    const blocks = JSON.parse(row.body) as Block[];
    expect(blocks.map((b) => [b.t, b.by])).toEqual([['p', 'seed'], ['prompt', 'seed']]);
  });

  it('crossing told reports crossed:true once and bumps the streak', async () => {
    const bigEdit = Array.from({ length: 6 }, (_, i) => ({ t: 'p', text: `rewritten paragraph ${i} ${'word '.repeat(30)}` }));
    const { env, metaDocs } = journalEnv({
      chapters: [{ ...CH, body: seedBody(['a', 'b', 'c', 'd', 'e', 'f']) }],
      assets: [{ id: '1', chapter_id: 'ch06-calvi' }, { id: '2', chapter_id: 'ch06-calvi' }, { id: '3', chapter_id: 'ch06-calvi' }],
    });
    const res = await put(env, 'ch06-calvi', M, { blocks: bigEdit });
    const out = (await res.json()) as { score: number; told: boolean; crossed: boolean; streak: string };
    expect(out.told).toBe(true);
    expect(out.crossed).toBe(true);
    expect(out.streak).toMatch(/^day 1/);
    expect(metaDocs.has('streak')).toBe(true);
    // second save while already told: crossed false
    const again = await put(env, 'ch06-calvi', M, { blocks: [...bigEdit, { t: 'p', text: 'one more' }] });
    expect(((await again.json()) as { crossed: boolean }).crossed).toBe(false);
  });

  it('empty-text blocks delete; caps enforced', async () => {
    const { env, chapters } = journalEnv({ chapters: [CH] });
    await put(env, 'ch06-calvi', M, { blocks: [{ t: 'p', text: 'alpha' }, { t: 'p', text: '   ' }, { t: 'p', text: 'gamma' }] });
    expect(JSON.parse(chapters.get('ch06-calvi')!.body)).toHaveLength(2);
    const huge = await put(env, 'ch06-calvi', M, { blocks: [{ t: 'p', text: 'x'.repeat(6000) }] });
    expect(huge.status).toBe(413);
  });

  it('progress endpoint aggregates and is family-only', async () => {
    const { env } = journalEnv({
      chapters: [CH, { id: 'ch07-cap-corse', day_date: '2026-08-21', title: 'Around Cap Corse', body: seedBody(['x']) }],
      metaDocs: { prompts: { 'ch06-calvi': ['q1', 'q2'] } },
    });
    expect((await app.fetch(new Request('http://x/api/journal/progress'), env)).status).toBe(401);
    const res = await app.fetch(new Request('http://x/api/journal/progress', { headers: R }), env);
    const prog = (await res.json()) as { pctTold: number; chapters: Record<string, { score: number }>; thin: unknown[]; streak: string };
    expect(prog.chapters['ch06-calvi']).toBeTruthy();
    expect(prog.thin.length).toBeGreaterThan(0);
    expect(typeof prog.pctTold).toBe('number');
  });

  it("claire's own key route sets jc and lands on the admin bench", async () => {
    const { env } = journalEnv();
    const res = await app.fetch(new Request('http://x/journal/c/claire-secret-token'), env);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/journal/admin');
    expect(res.headers.get('set-cookie')).toContain('jc=claire-secret-token');
    const admin = await app.fetch(new Request('http://x/journal/admin', { headers: { cookie: 'jc=claire-secret-token' } }), env);
    expect(await admin.text()).toContain('intake');
  });
});
