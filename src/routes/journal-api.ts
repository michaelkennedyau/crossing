import { Hono } from 'hono';
import type { Env } from '../env';
import { journalHeaders, resolveAuth, rigged, type JournalAuth } from '../journal/auth';
import { parseBody, parseGrammar, isBlockLike, type Block } from '../journal/blocks';
import { bumpStreak, chapterStats, diffBlocks, journalProgress, romeDate as progressRomeDate, streakLine, type ChapterInput, type Streak } from '../journal/progress';
import { TRAVERSATA_HOST } from '../journal/traversata-app';
import { corpusDrift, regenerateTraversata } from '../journal/traversata-gen';

/**
 * /api/journal/* — the journal's write surface. Unlike the rest of the site's open APIs,
 * every route here demands a tier: reads want reader+, writes want admin. Uploads are
 * per-photo per-variant raw-body PUTs streamed straight to R2 (never batch — Workers body
 * limits are plan-tied). Bound params + size caps everywhere: the D1 is the shared brain.
 */

type Vars = { tier: JournalAuth['tier']; auth: JournalAuth };
export const journalApiApp = new Hono<{ Bindings: Env; Variables: Vars }>();

const VARIANTS = new Set(['1280', '1920', 'orig']);
const FMTS = new Set(['webp', 'jpeg']);
const MAX_BLOB = 80 * 1024 * 1024;        // hard per-variant cap (Z9 original headroom)
const MAX_LQIP = 2_000;                    // a 28px data URI is ~600B; anything big is wrong

journalApiApp.use('*', async (c, next) => {
  if (!rigged(c.env)) return c.json({ error: 'not rigged' }, 503);
  const auth = await resolveAuth(c.env, c.req.header('cookie') ?? null);
  if (auth.tier === 'public') return c.json({ error: 'family only' }, 401);
  if (c.req.method !== 'GET' && auth.author === null) return c.json({ error: 'writers only' }, 403);
  c.set('auth', auth);
  c.set('tier', auth.tier);
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
  const lqip = typeof body.lqip === 'string' && body.lqip.length <= MAX_LQIP
    && (body.lqip === '' || /^data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/=]+$/.test(body.lqip)) ? body.lqip : '';
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

// ── chapters ──

const SLUG_RE = /^[a-z0-9-]{1,64}$/;
const MAX_BLOCKS = 200;
const MAX_BLOCK_CHARS = 5_000;

async function metaDoc<T>(env: Env, id: string): Promise<T | null> {
  const row = await env.DB.prepare('SELECT json FROM journal_meta WHERE id=?').bind(id)
    .first<{ json: string }>().catch(() => null);
  if (!row) return null;
  try { return JSON.parse(row.json) as T; } catch { return null; }
}

async function promptCounts(env: Env): Promise<Record<string, string[]>> {
  return (await metaDoc<Record<string, string[]>>(env, 'prompts')) ?? {};
}

async function photoCounts(env: Env): Promise<Map<string, number>> {
  const rows = await env.DB.prepare(
    'SELECT chapter_id, COUNT(*) AS n FROM journal_assets WHERE enabled=1 GROUP BY chapter_id',
  ).all<{ chapter_id: string; n: number }>().then((r) => r.results ?? []).catch(() => []);
  return new Map(rows.map((r) => [r.chapter_id, r.n]));
}

journalApiApp.get('/chapters', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT id, day_date, title, voice, threads, closer, public, sort FROM journal_chapters WHERE enabled=1 ORDER BY sort, day_date, id',
  ).all().then((r) => r.results ?? []).catch(() => []);
  return c.json({ chapters: rows });
});

journalApiApp.get('/chapters/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (!SLUG_RE.test(slug)) return c.json({ error: 'bad slug' }, 400);
  const row = await c.env.DB.prepare(
    'SELECT id, day_date, title, voice, body, threads, closer, public, sort FROM journal_chapters WHERE id=? AND enabled=1',
  ).bind(slug).first<{ id: string; day_date: string; title: string; voice: string; body: string; threads: string; closer: string; public: number; sort: number }>().catch(() => null);
  if (!row) return c.json({ error: 'unknown chapter' }, 404);
  const blocks = parseBody(row.body);
  const prompts = (await promptCounts(c.env))[slug] ?? [];
  const photos = (await photoCounts(c.env)).get(slug) ?? 0;
  const stats = chapterStats(blocks, photos, prompts.length);
  const { body: _b, ...meta } = row;
  return c.json({ chapter: meta, blocks, prompts, score: stats.score, told: stats.told, photoCount: photos });
});

journalApiApp.put('/chapters/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (!SLUG_RE.test(slug)) return c.json({ error: 'bad slug' }, 400);
  const author = c.get('auth').author;
  if (!author) return c.json({ error: 'writers only' }, 403);

  let body: { title?: string; voice?: string; closer?: string; threads?: unknown; public?: unknown; sort?: number; blocks?: unknown; text?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: 'bad json' }, 400); }

  // incoming blocks: editor path (author-blind — any client `by` is discarded) or grammar path
  let incoming: Block[] | null = null;
  if (Array.isArray(body.blocks)) {
    const cleaned = (body.blocks as unknown[])
      .map((b) => (b && typeof b === 'object' ? { ...(b as Record<string, unknown>), by: 'seed' } : b))
      .filter(isBlockLike);
    if (cleaned.length > MAX_BLOCKS) return c.json({ error: 'too many blocks' }, 413);
    for (const b of cleaned) {
      const textLen = 'text' in b ? b.text.length : 'q' in b ? b.q.length : 0;
      if (textLen > MAX_BLOCK_CHARS) return c.json({ error: 'block too long' }, 413);
    }
    incoming = cleaned.filter((b) => !('text' in b) || b.text.trim() !== '');
  } else if (typeof body.text === 'string') {
    if (body.text.length > 120_000) return c.json({ error: 'too long' }, 413);
    incoming = parseGrammar(body.text, 'seed');
  }

  const existing = await c.env.DB.prepare('SELECT body FROM journal_chapters WHERE id=?')
    .bind(slug).first<{ body: string }>().catch(() => null);

  let finalBlocks: Block[] | null = null;
  if (incoming) {
    const stored = existing ? parseBody(existing.body) : [];
    // the grammar path seeds; the editor path diffs. A grammar PUT on an EXISTING chapter
    // still diffs (protects edits); on a new chapter everything lands as 'seed'.
    finalBlocks = existing ? diffBlocks(stored, incoming, author) : incoming;
  }

  const threads = Array.isArray(body.threads) ? JSON.stringify((body.threads as unknown[]).filter((t) => typeof t === 'string').slice(0, 12)) : null;
  const pub = body.public === 1 || body.public === true ? 1 : body.public === 0 || body.public === false ? 0 : null;

  const sets: string[] = [];
  const args: (string | number)[] = [];
  if (typeof body.title === 'string' && body.title.trim()) { sets.push('title=?'); args.push(body.title.slice(0, 200)); }
  if (typeof body.voice === 'string') { sets.push('voice=?'); args.push(body.voice.slice(0, 300)); }
  if (typeof body.closer === 'string') { sets.push('closer=?'); args.push(body.closer.slice(0, 200)); }
  if (threads !== null) { sets.push('threads=?'); args.push(threads); }
  if (pub !== null) { sets.push('public=?'); args.push(pub); }
  if (typeof body.sort === 'number' && Number.isFinite(body.sort)) { sets.push('sort=?'); args.push(Math.round(body.sort)); }
  if (finalBlocks) { sets.push('body=?'); args.push(JSON.stringify(finalBlocks)); }

  if (existing) {
    if (!sets.length) return c.json({ error: 'nothing to set' }, 400);
    sets.push("updated_at=datetime('now')");
    await c.env.DB.prepare(`UPDATE journal_chapters SET ${sets.join(', ')} WHERE id=?`).bind(...args, slug).run();
  } else {
    if (typeof body.title !== 'string' || !body.title.trim()) return c.json({ error: 'title required for a new chapter' }, 400);
    await c.env.DB.prepare(
      'INSERT INTO journal_chapters (id, day_date, title, voice, body, threads, closer, public, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(
      slug,
      typeof (body as { day_date?: string }).day_date === 'string' ? (body as { day_date?: string }).day_date! .slice(0, 10) : '',
      body.title.slice(0, 200),
      (body.voice ?? '').slice(0, 300),
      JSON.stringify(finalBlocks ?? []),
      threads ?? '[]',
      (body.closer ?? '').slice(0, 200),
      pub ?? 0,
      typeof body.sort === 'number' ? Math.round(body.sort) : 0,
    ).run();
  }

  // scoring + told-crossing + streak (either author's save counts, Europe/Rome day)
  const today = progressRomeDate(new Date());
  const prompts = (await promptCounts(c.env))[slug] ?? [];
  const photos = (await photoCounts(c.env)).get(slug) ?? 0;
  const beforeStats = existing ? chapterStats(parseBody(existing.body), photos, prompts.length) : null;
  const blocksNow = finalBlocks ?? (existing ? parseBody(existing.body) : []);
  const stats = chapterStats(blocksNow, photos, prompts.length);
  const crossed = !!(stats.told && beforeStats && !beforeStats.told);

  const streak = bumpStreak((await metaDoc<Streak>(c.env, 'streak')), today);
  await c.env.DB.prepare(
    "INSERT INTO journal_meta (id, json, updated_at) VALUES ('streak', ?, datetime('now')) ON CONFLICT(id) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at",
  ).bind(JSON.stringify(streak)).run().catch(() => {});

  return c.json({ ok: true, blocks: blocksNow, score: stats.score, told: stats.told, crossed, streak: streakLine(streak, today) });
});

journalApiApp.delete('/chapters/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (!SLUG_RE.test(slug)) return c.json({ error: 'bad slug' }, 400);
  await c.env.DB.prepare('UPDATE journal_chapters SET enabled=0 WHERE id=?').bind(slug).run();
  return c.json({ ok: true });
});

// ── la traversata: the gift's rooms, editable without a redeploy ──

const TMODE_RE = /^[a-z]{2,16}$/;
const mintHex = (): string => [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('');
const isGlossEntry = (g: unknown): g is { term: string; def: string } =>
  typeof g === 'object' && g !== null
  && typeof (g as Record<string, unknown>).term === 'string'
  && typeof (g as Record<string, unknown>).def === 'string';

journalApiApp.put('/traversata/:key', async (c) => {
  const key = c.req.param('key');
  if (!TMODE_RE.test(key)) return c.json({ error: 'bad key' }, 400);
  let body: Record<string, unknown>;
  try { body = await c.req.json(); } catch { return c.json({ error: 'bad json' }, 400); }
  const row = await c.env.DB.prepare('SELECT json FROM traversata_modes WHERE key=? AND enabled=1')
    .bind(key).first<{ json: string }>().catch(() => null);
  if (!row) return c.json({ error: 'unknown mode' }, 404);
  let doc: Record<string, unknown>;
  try { doc = JSON.parse(row.json) as Record<string, unknown>; } catch { doc = {}; }
  const take = (k: string, max: number): void => {
    if (typeof body[k] === 'string') doc[k] = (body[k] as string).slice(0, max);
  };
  take('label', 200); take('star', 60); take('dedication', 400);
  take('summary', 20_000); take('long', 40_000); take('programme', 4_000);
  if (Array.isArray(body.glossary)) {
    doc.glossary = (body.glossary as unknown[]).filter(isGlossEntry).slice(0, 12)
      .map((g) => ({ term: g.term.slice(0, 200), def: g.def.slice(0, 600) }));
  }
  await c.env.DB.prepare("UPDATE traversata_modes SET json=?, updated_at=datetime('now') WHERE key=?")
    .bind(JSON.stringify(doc), key).run();
  return c.json({ ok: true, mode: doc });
});

// rotation is revocation: the old link dies the moment the new token lands
journalApiApp.post('/traversata/:key/rotate', async (c) => {
  const key = c.req.param('key');
  if (!TMODE_RE.test(key)) return c.json({ error: 'bad key' }, 400);
  const row = await c.env.DB.prepare('SELECT key FROM traversata_modes WHERE key=? AND enabled=1')
    .bind(key).first<{ key: string }>().catch(() => null);
  if (!row) return c.json({ error: 'unknown mode' }, 404);
  const token = mintHex();
  await c.env.DB.prepare("UPDATE traversata_modes SET token=?, updated_at=datetime('now') WHERE key=?")
    .bind(token, key).run();
  return c.json({ ok: true, token, url: `https://${TRAVERSATA_HOST}/${token}` });
});

// the rooms rewritten from the corpus — the desk's button (always forced; the cron
// respects the threshold on its own). Runs in the background; the page says so.
journalApiApp.post('/traversata/regenerate', async (c) => {
  if (c.get('tier') !== 'admin') return c.json({ error: 'the desk is admin-only' }, 403);
  const drift = await corpusDrift(c.env).catch(() => null);
  c.executionCtx.waitUntil(regenerateTraversata(c.env, { force: true })
    .then((r) => console.log('traversata regen (manual)', JSON.stringify({ ok: r.ok, failed: r.failed })))
    .catch((err) => console.error('traversata regen failed', err instanceof Error ? err.message : String(err))));
  return c.json({ ok: true, started: true, drift });
});

// guest links — one minted per SEND from the dispatch desk's dropdown. Softly counted
// (a tally and a timestamp, never the viewer), individually cancellable.
journalApiApp.post('/traversata/grants', async (c) => {
  if (c.get('tier') !== 'admin') return c.json({ error: 'the desk is admin-only' }, 403);
  let body: { mode?: string; note?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: 'bad json' }, 400); }
  const mode = typeof body.mode === 'string' ? body.mode : '';
  if (!TMODE_RE.test(mode)) return c.json({ error: 'bad mode' }, 400);
  const row = await c.env.DB.prepare('SELECT key FROM traversata_modes WHERE key=? AND enabled=1')
    .bind(mode).first<{ key: string }>().catch(() => null);
  if (!row) return c.json({ error: 'unknown mode' }, 404);
  const note = (typeof body.note === 'string' ? body.note : '').slice(0, 80);
  const token = mintHex();
  await c.env.DB.prepare('INSERT INTO traversata_grants (token, mode_key, note, created_by) VALUES (?, ?, ?, ?)')
    .bind(token, mode, note, c.get('auth').author ?? '').run();
  return c.json({ ok: true, token, url: `https://${TRAVERSATA_HOST}/${token}` });
});

journalApiApp.post('/traversata/grants/:token/cancel', async (c) => {
  if (c.get('tier') !== 'admin') return c.json({ error: 'the desk is admin-only' }, 403);
  const token = c.req.param('token');
  if (!/^[a-f0-9]{16,64}$/.test(token)) return c.json({ error: 'bad token' }, 400);
  await c.env.DB.prepare('UPDATE traversata_grants SET enabled=0 WHERE token=?').bind(token).run();
  return c.json({ ok: true });
});

// ── the game state, one fetch ──

journalApiApp.get('/progress', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT id, day_date, title, body FROM journal_chapters WHERE enabled=1 ORDER BY sort, day_date, id',
  ).all<{ id: string; day_date: string; title: string; body: string }>().then((r) => r.results ?? []).catch(() => []);
  const prompts = await promptCounts(c.env);
  const photos = await photoCounts(c.env);
  const inputs: ChapterInput[] = rows.map((r) => ({
    id: r.id, day_date: r.day_date, title: r.title,
    blocks: parseBody(r.body),
    photoCount: photos.get(r.id) ?? 0,
    seedPromptCount: (prompts[r.id] ?? []).length,
  }));
  const today = progressRomeDate(new Date());
  const prog = journalProgress(inputs, today);
  const streak = await metaDoc<Streak>(c.env, 'streak');
  return c.json({ ...prog, streak: streakLine(streak, today) });
});

export { journalHeaders };
