import { Hono } from 'hono';
import type { Env } from '../env';
import { journalHeaders } from './auth';
import { renderTraversataCover, renderTraversataMiss, renderTraversataMode, type TraversataDoc } from './render-traversata';

/**
 * traversata.varo.au — the gift's own address. /<token> renders exactly one audience's
 * room; the link IS the access (recipients aren't family, so no Google gate and no key
 * cookies). Two token kinds resolve here: GUEST links (minted per send from the dispatch
 * desk — softly counted, individually cancellable) and the room's master token (untracked
 * preview). Every miss is byte-identical, and nothing is ever listed at the root.
 */

export const TRAVERSATA_HOST = 'traversata.varo.au';
export const traversataApp = new Hono<{ Bindings: Env }>();

const TOKEN_RE = /^[a-f0-9]{16,64}$/;

traversataApp.get('/', (c) => c.html(renderTraversataCover(), 200, journalHeaders(true)));

traversataApp.get('/:token', async (c) => {
  const token = c.req.param('token');
  if (TOKEN_RE.test(token)) {
    // guest links first — the soft count is a timestamp and a tally, nothing about the viewer
    const grant = await c.env.DB.prepare(
      'SELECT m.json FROM traversata_grants g JOIN traversata_modes m ON m.key=g.mode_key WHERE g.token=? AND g.enabled=1 AND m.enabled=1',
    ).bind(token).first<{ json: string }>().catch(() => null);
    const row = grant ?? await c.env.DB.prepare('SELECT json FROM traversata_modes WHERE token=? AND enabled=1')
      .bind(token).first<{ json: string }>().catch(() => null);
    if (row) {
      if (grant) {
        await c.env.DB.prepare(
          "UPDATE traversata_grants SET opened_count=opened_count+1, last_opened=datetime('now'), first_opened=CASE WHEN first_opened='' THEN datetime('now') ELSE first_opened END WHERE token=?",
        ).bind(token).run().catch(() => {});
      }
      try {
        return c.html(renderTraversataMode(JSON.parse(row.json) as TraversataDoc), 200, journalHeaders(true));
      } catch { /* malformed doc falls through to the uniform miss */ }
    }
  }
  return c.html(renderTraversataMiss(), 404, journalHeaders(true));
});
