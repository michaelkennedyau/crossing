import { Hono } from 'hono';
import type { Env } from '../env';
import { journalHeaders, resolveTier, rigged, type Tier } from '../journal/auth';

/**
 * /api/journal/* — the journal's write surface. Unlike the rest of the site's open APIs,
 * every route here demands a tier: reads want reader+, writes want admin. Uploads are
 * per-photo per-variant raw-body PUTs streamed straight to R2 (never batch — Workers body
 * limits are plan-tied). Bound params + size caps everywhere: the D1 is the shared brain.
 */

type Vars = { tier: Tier };
export const journalApiApp = new Hono<{ Bindings: Env; Variables: Vars }>();

const VARIANTS = new Set(['1280', '1920', 'orig']);
const FMTS = new Set(['webp', 'jpeg']);
const MAX_BLOB = 80 * 1024 * 1024;        // hard per-variant cap (Z9 original headroom)
const MAX_LQIP = 2_000;                    // a 28px data URI is ~600B; anything big is wrong

journalApiApp.use('*', async (c, next) => {
  if (!rigged(c.env)) return c.json({ error: 'not rigged' }, 503);
  const tier = await resolveTier(c.env, c.req.header('cookie') ?? null);
  if (tier === 'public') return c.json({ error: 'family only' }, 401);
  if (c.req.method !== 'GET' && tier !== 'admin') return c.json({ error: 'admin only' }, 403);
  c.set('tier', tier);
  await next();
});

/** map an EXIF/ISO instant to the chapter whose day_date matches, Europe/Rome */
export function romeDate(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(t));
}

// ── assets ──

journalApiApp.get('/assets', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT id, chapter_id, fmt, w, h, lqip, caption, taken_at, has_orig, sort FROM journal_assets WHERE enabled=1 ORDER BY taken_at, id',
  ).all().then((r) => r.results ?? []).catch(() => []);
  return c.json({ assets: rows });
});

journalApiApp.post('/assets', async (c) => {
  let body: { fmt?: string; w?: number; h?: number; lqip?: string; taken_at?: string; chapter_id?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: 'bad json' }, 400); }
  const fmt = FMTS.has(body.fmt ?? '') ? (body.fmt as string) : 'webp';
  const lqip = typeof body.lqip === 'string' && body.lqip.length <= MAX_LQIP && (body.lqip === '' || body.lqip.startsWith('data:image/')) ? body.lqip : '';
  const takenAt = typeof body.taken_at === 'string' ? body.taken_at.slice(0, 32) : '';
  const w = Number.isFinite(body.w) ? Math.min(Math.max(0, Math.round(body.w as number)), 20000) : 0;
  const h = Number.isFinite(body.h) ? Math.min(Math.max(0, Math.round(body.h as number)), 20000) : 0;

  // chapter: explicit wins; else the Europe/Rome date of the shot picks the day's chapter
  let chapterId = typeof body.chapter_id === 'string' ? body.chapter_id.slice(0, 64) : '';
  if (!chapterId && takenAt) {
    const day = romeDate(takenAt);
    if (day) {
      const row = await c.env.DB.prepare('SELECT id FROM journal_chapters WHERE day_date=? AND enabled=1 ORDER BY sort LIMIT 1')
        .bind(day).first<{ id: string }>().catch(() => null);
      chapterId = row?.id ?? '';
    }
  }

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO journal_assets (id, chapter_id, fmt, w, h, lqip, taken_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).bind(id, chapterId, fmt, w, h, lqip, takenAt).run();
  return c.json({ id, chapter_id: chapterId });
});

journalApiApp.put('/assets/:id/blob/:variant', async (c) => {
  const id = c.req.param('id');
  const variant = c.req.param('variant');
  if (!/^[0-9a-f-]{36}$/.test(id) || !VARIANTS.has(variant)) return c.json({ error: 'bad ref' }, 400);
  const row = await c.env.DB.prepare('SELECT fmt FROM journal_assets WHERE id=? AND enabled=1')
    .bind(id).first<{ fmt: string }>().catch(() => null);
  if (!row) return c.json({ error: 'unknown asset' }, 404);

  const len = Number(c.req.header('content-length') ?? '0');
  if (!len || len > MAX_BLOB) return c.json({ error: 'bad length' }, 413);

  const isOrig = variant === 'orig';
  const declared = c.req.header('content-type') ?? '';
  const ext = isOrig
    ? (declared.includes('png') ? 'png' : declared.includes('heic') ? 'heic' : 'jpg')
    : row.fmt === 'jpeg' ? 'jpg' : 'webp';
  const contentType = isOrig ? (declared || 'application/octet-stream') : row.fmt === 'jpeg' ? 'image/jpeg' : 'image/webp';
  const key = `journal/${id}/${isOrig ? 'orig' : variant}.${ext}`;

  await c.env.R2_IMAGES.put(key, c.req.raw.body, { httpMetadata: { contentType } });
  if (isOrig) {
    await c.env.DB.prepare('UPDATE journal_assets SET has_orig=1 WHERE id=?').bind(id).run().catch(() => {});
  }
  return c.json({ ok: true, key });
});

journalApiApp.patch('/assets/:id', async (c) => {
  const id = c.req.param('id');
  if (!/^[0-9a-f-]{36}$/.test(id)) return c.json({ error: 'bad ref' }, 400);
  let body: { caption?: string; chapter_id?: string; sort?: number; enabled?: number };
  try { body = await c.req.json(); } catch { return c.json({ error: 'bad json' }, 400); }
  const sets: string[] = [];
  const args: (string | number)[] = [];
  if (typeof body.caption === 'string') { sets.push('caption=?'); args.push(body.caption.slice(0, 500)); }
  if (typeof body.chapter_id === 'string') { sets.push('chapter_id=?'); args.push(body.chapter_id.slice(0, 64)); }
  if (typeof body.sort === 'number' && Number.isFinite(body.sort)) { sets.push('sort=?'); args.push(Math.round(body.sort)); }
  if (body.enabled === 0 || body.enabled === 1) { sets.push('enabled=?'); args.push(body.enabled); }
  if (!sets.length) return c.json({ error: 'nothing to set' }, 400);
  await c.env.DB.prepare(`UPDATE journal_assets SET ${sets.join(', ')} WHERE id=?`).bind(...args, id).run();
  return c.json({ ok: true });
});

// ── chapters (thin PR2 versions; the grammar-parsing PUT lands in PR3) ──

journalApiApp.get('/chapters', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT id, day_date, title, voice, threads, closer, public, sort FROM journal_chapters WHERE enabled=1 ORDER BY sort, day_date, id',
  ).all().then((r) => r.results ?? []).catch(() => []);
  return c.json({ chapters: rows });
});

export { journalHeaders };
