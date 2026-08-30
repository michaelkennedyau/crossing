import type { Env } from '../env';
import type { Tier } from './auth';

/**
 * /journal/img/:id/:variant — the Worker's first R2 read path. Authorization follows the
 * photo's chapter: public chapter ⇒ anyone (immutable, edge-cacheable — uuid keys never
 * mutate); private ⇒ reader cookie required, and the response stays out of shared caches.
 */

const VARIANTS = new Set(['1280', '1920', 'orig']);

export async function serveJournalImage(env: Env, tier: Tier, id: string, variant: string): Promise<Response> {
  if (!/^[0-9a-f-]{36}$/.test(id) || !VARIANTS.has(variant)) return new Response('not found', { status: 404 });

  const row = await env.DB.prepare(
    `SELECT a.fmt, a.chapter_id, COALESCE(ch.public, 0) AS pub
       FROM journal_assets a LEFT JOIN journal_chapters ch ON ch.id = a.chapter_id
      WHERE a.id=? AND a.enabled=1`,
  ).bind(id).first<{ fmt: string; chapter_id: string; pub: number }>().catch(() => null);
  if (!row) return new Response('not found', { status: 404 });

  const isPublic = row.pub === 1;
  if (!isPublic && tier === 'public') return new Response('family only', { status: 401 });
  if (variant === 'orig' && tier !== 'admin') return new Response('family only', { status: 401 });

  const ext = variant === 'orig' ? null : row.fmt === 'jpeg' ? 'jpg' : 'webp';
  const keys = ext
    ? [`journal/${id}/${variant}.${ext}`]
    : [`journal/${id}/orig.jpg`, `journal/${id}/orig.png`, `journal/${id}/orig.heic`];

  for (const key of keys) {
    const obj = await env.R2_IMAGES.get(key);
    if (!obj) continue;
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('etag', obj.httpEtag);
    headers.set(
      'cache-control',
      isPublic && variant !== 'orig' ? 'public, max-age=31536000, immutable' : 'private, max-age=3600',
    );
    return new Response(obj.body, { headers });
  }
  return new Response('not found', { status: 404 });
}
