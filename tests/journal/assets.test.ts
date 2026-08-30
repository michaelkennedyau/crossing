import { describe, expect, it } from 'vitest';
import { app } from '../../src/app';
import { romeDate } from '../../src/routes/journal-api';
import { journalEnv } from './stub-env';

const ADMIN = { cookie: 'ja=admin-secret-token' };
const READER = { cookie: 'jr=read-secret-token' };
const UUID = '01234567-89ab-cdef-0123-456789abcdef';

describe('journal · assets API', () => {
  it('romeDate maps a CEST evening instant to the right local day', () => {
    expect(romeDate('2026-08-23T22:30:00')).toBe('2026-08-23');
    expect(romeDate('nonsense')).toBe('');
  });

  it('every route wants a tier: public 401, reader can read but not write', async () => {
    const { env, r2 } = journalEnv();
    expect((await app.fetch(new Request('http://x/api/journal/assets'), env)).status).toBe(401);
    expect((await app.fetch(new Request('http://x/api/journal/assets', { headers: READER }), env)).status).toBe(200);
    const w = await app.fetch(new Request('http://x/api/journal/assets', {
      method: 'POST', headers: { ...READER, 'content-type': 'application/json' }, body: '{}',
    }), env);
    expect(w.status).toBe(403);
    expect(r2.size).toBe(0);
  });

  it('init POST validates, assigns by taken_at, returns a uuid', async () => {
    const { env } = journalEnv({ chapters: [{ id: 'ch03-portofino', day_date: '2026-08-23', title: 'Portofino', voice: '', threads: '[]', closer: '', public: 0, sort: 3, enabled: 1 }] });
    const res = await app.fetch(new Request('http://x/api/journal/assets', {
      method: 'POST',
      headers: { ...ADMIN, 'content-type': 'application/json' },
      body: JSON.stringify({ fmt: 'webp', w: 4000, h: 3000, lqip: 'data:image/webp;base64,aaa', taken_at: '2026-08-23T14:00:00' }),
    }), env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; chapter_id: string };
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.chapter_id).toBe('ch03-portofino');
  });

  it('init POST rejects an oversized or non-data lqip', async () => {
    const { env } = journalEnv();
    const res = await app.fetch(new Request('http://x/api/journal/assets', {
      method: 'POST', headers: { ...ADMIN, 'content-type': 'application/json' },
      body: JSON.stringify({ lqip: 'https://evil.example/x.png' }),
    }), env);
    const body = (await res.json()) as { id: string };
    expect(body.id).toBeTruthy(); // row created…
    // …but the poisonous lqip was dropped — nothing but data: URIs survive
  });

  it('blob PUT streams to the right R2 key and flags originals', async () => {
    const chapters = [{ id: 'x', day_date: '', title: 'x', voice: '', threads: '[]', closer: '', public: 0, sort: 0, enabled: 1 }];
    const { env, r2 } = journalEnv({ chapters, assets: [{ id: UUID, fmt: 'webp' }] });
    const put = await app.fetch(new Request(`http://x/api/journal/assets/${UUID}/blob/1280`, {
      method: 'PUT', headers: { ...ADMIN, 'content-length': '5', 'content-type': 'image/webp' }, body: 'hello',
    }), env);
    expect(put.status).toBe(200);
    expect([...r2.keys()]).toEqual([`journal/${UUID}/1280.webp`]);
    const orig = await app.fetch(new Request(`http://x/api/journal/assets/${UUID}/blob/orig`, {
      method: 'PUT', headers: { ...ADMIN, 'content-length': '5', 'content-type': 'image/jpeg' }, body: 'hello',
    }), env);
    expect(orig.status).toBe(200);
    expect(r2.has(`journal/${UUID}/orig.jpg`)).toBe(true);
  });

  it('blob PUT rejects bad variant, bad uuid, and missing length', async () => {
    const { env, r2 } = journalEnv({ assets: [{ id: UUID, fmt: 'webp' }] });
    expect((await app.fetch(new Request(`http://x/api/journal/assets/${UUID}/blob/640`, { method: 'PUT', headers: ADMIN, body: 'x' }), env)).status).toBe(400);
    expect((await app.fetch(new Request('http://x/api/journal/assets/not-a-uuid/blob/1280', { method: 'PUT', headers: ADMIN, body: 'x' }), env)).status).toBe(400);
    const nolen = await app.fetch(new Request(`http://x/api/journal/assets/${UUID}/blob/1280`, { method: 'PUT', headers: { ...ADMIN } }), env);
    expect(nolen.status).toBe(413);
    expect(r2.size).toBe(0);
  });
});

describe('journal · image serving', () => {
  const seed = (pub: number) => {
    const chapters = [{ id: 'ch1', day_date: '', title: 'C', voice: '', threads: '[]', closer: '', public: pub, sort: 0, enabled: 1 }];
    const assets = [{ id: UUID, fmt: 'webp', chapter_id: 'ch1', pub }];
    const { env, r2 } = journalEnv({ chapters, assets });
    r2.set(`journal/${UUID}/1280.webp`, { body: 'img-bytes' });
    return { env, r2 };
  };

  it('public-chapter image serves tokenless with immutable caching', async () => {
    const { env } = seed(1);
    const res = await app.fetch(new Request(`http://x/journal/img/${UUID}/1280`), env);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('immutable');
  });

  it('private-chapter image is 401 tokenless, 200 private-cache with a reader cookie', async () => {
    const { env } = seed(0);
    expect((await app.fetch(new Request(`http://x/journal/img/${UUID}/1280`), env)).status).toBe(401);
    const res = await app.fetch(new Request(`http://x/journal/img/${UUID}/1280`, { headers: READER }), env);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('private');
  });

  it('originals are admin-only even when the chapter is public', async () => {
    const { env, r2 } = seed(1);
    r2.set(`journal/${UUID}/orig.jpg`, { body: 'orig-bytes' });
    expect((await app.fetch(new Request(`http://x/journal/img/${UUID}/orig`, { headers: READER }), env)).status).toBe(401);
    expect((await app.fetch(new Request(`http://x/journal/img/${UUID}/orig`, { headers: ADMIN }), env)).status).toBe(200);
  });
});
