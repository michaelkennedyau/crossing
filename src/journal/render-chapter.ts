import type { Env } from '../env';
import type { Tier } from './auth';
import { parseBody, type Block } from './blocks';
import { fmtAmount, fmtDay } from './map-geo';
import { renderChapterMap } from './render-map';
import { chipRow, esc, journalShell } from './render-home';

/**
 * /journal/ch/:slug — the chapter page. Blocks render in the paper register; photos go
 * full-bleed with CSS-only LQIP (zero reader JS); prompts are visible invitations for the
 * family and absent for the public; the closer is right-aligned and never explained.
 * Author marks are margin hairlines — no names, no legend; the tint is the whole tell.
 */

interface AssetRow { id: string; w: number; h: number; lqip: string; caption: string; fmt: string }

interface ChapterRow {
  id: string; day_date: string; title: string; voice: string; body: string;
  threads: string; closer: string; public: number; sort: number;
}

function figure(a: AssetRow, eager: boolean, missingNote?: string): string {
  if (!a) {
    return missingNote
      ? `<div class="ph-miss">${esc(missingNote)}</div>`
      : '';
  }
  const dims = a.w > 0 && a.h > 0 ? ` width="${a.w}" height="${a.h}"` : '';
  // strict whole-string validation — no attribute breakout; esc() as defence-in-depth
  const lqipOk = a.lqip && /^data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/=]+$/.test(a.lqip);
  const bg = lqipOk ? ` style="background:url('${esc(a.lqip)}') center/cover"` : '';
  return `<figure class="shot"><img src="/journal/img/${esc(a.id)}/1280"
 srcset="/journal/img/${esc(a.id)}/1280 1280w, /journal/img/${esc(a.id)}/1920 1920w"
 sizes="100vw"${dims} loading="${eager ? 'eager' : 'lazy'}"${eager ? ' fetchpriority="high"' : ''} decoding="async" alt="${esc(a.caption)}"${bg}>${
    a.caption ? `<figcaption>${esc(a.caption)}</figcaption>` : ''}</figure>`;
}

function renderBlock(b: Block, ctx: { tier: Tier; slug: string; assets: AssetRow[]; used: Set<number>; firstImg: { done: boolean } }): string {
  const mark = ctx.tier !== 'public' && (b.by === 'm' || b.by === 'c') ? ` data-by="${b.by}"` : '';
  switch (b.t) {
    case 'p': return `<p class="prose"${mark}>${esc(b.text)}</p>`;
    case 'q': return `<p class="quiet"${mark}>${esc(b.text)}</p>`;
    case 'mono': return `<p class="aside"${mark}>${esc(b.text)}</p>`;
    case 'img': {
      const idx = b.n - 1;
      const a = ctx.assets[idx];
      if (a) ctx.used.add(idx);
      const eager = !ctx.firstImg.done && !!a;
      if (eager) ctx.firstImg.done = true;
      return figure(a, eager, ctx.tier === 'admin' ? `photo ${b.n} — nothing uploaded yet` : undefined);
    }
    case 'drop': return `<aside class="drop"${mark}>${esc(b.text)}</aside>`;
    case 'ledger': return `<div class="ledger"${mark}><span class="amt">${esc(fmtAmount(b.amount))}</span><span class="lt">${esc(b.text)}</span></div>`;
    case 'doctrine': return `<div class="doct"${mark}><span class="d-eye">the doctrine</span><p>${esc(b.text)}</p></div>`;
    case 'map': return renderChapterMap(ctx.slug, b.focus);
    case 'prompt': return ctx.tier === 'public' ? '' : `<p class="prompt"${mark}>${esc(b.q)}</p>`;
    case 'card': {
      const unwritten = !b.lines.length && !b.rule;
      return `<div class="card"${mark}><span class="c-eye">claire</span><span class="c-star"><span class="star">★</span> ${esc(b.star)}</span>${
        unwritten && ctx.tier !== 'public'
          ? `<span class="cl c-un">card unwritten</span>`
          : b.lines.map((l) => `<span class="cl">${esc(l)}</span>`).join('')
      }${b.rule ? `<span class="c-rule">one rule: ${esc(b.rule)}</span>` : ''}</div>`;
    }
  }
}

export function renderMissing(): string {
  return journalShell('The Crossing', `
  <header><p class="over">il varo · the journal</p><h1>Nothing lives at this address.</h1>
  <p class="lead"><a href="/journal">back to the spine</a></p></header>`);
}

/** null ⇒ caller decides gate (public) or 404 (family) */
export async function renderChapterPage(env: Env, tier: Tier, slug: string): Promise<string | null> {
  const row = await env.DB.prepare(
    'SELECT id, day_date, title, voice, body, threads, closer, public, sort FROM journal_chapters WHERE id=? AND enabled=1',
  ).bind(slug).first<ChapterRow>().catch(() => null);
  if (!row) return null;
  if (tier === 'public' && row.public !== 1) return null;

  const assets = await env.DB.prepare(
    'SELECT id, w, h, lqip, caption, fmt, sort FROM journal_assets WHERE chapter_id=? AND enabled=1 ORDER BY sort, taken_at, id',
  ).bind(slug).all<AssetRow>().then((r) => r.results ?? []).catch(() => [] as AssetRow[]);

  const spineWhere = tier === 'public' ? 'WHERE enabled=1 AND public=1' : 'WHERE enabled=1';
  const spine = await env.DB.prepare(
    `SELECT id, title FROM journal_chapters ${spineWhere} ORDER BY sort, day_date, id`,
  ).all<{ id: string; title: string }>().then((r) => r.results ?? []).catch(() => [] as { id: string; title: string }[]);

  const i = spine.findIndex((s) => s.id === slug);
  const prev = i > 0 ? spine[i - 1] : null;
  const next = i >= 0 && i < spine.length - 1 ? spine[i + 1] : null;

  const blocks = parseBody(row.body);
  // mobile-first layout law: the voice opens the page — a map that leads the doc floats
  // to just after the first prose block (data untouched; this is a layout decision)
  const firstP = blocks.findIndex((b) => b.t === 'p');
  const mapIdx = blocks.findIndex((b) => b.t === 'map');
  const ordered = [...blocks];
  if (mapIdx >= 0 && firstP > mapIdx) {
    const [mapBlock] = ordered.splice(mapIdx, 1);
    const at = ordered.findIndex((b) => b.t === 'p');
    ordered.splice(at + 1, 0, mapBlock);
  }
  const ctx = { tier, slug, assets, used: new Set<number>(), firstImg: { done: false } };
  const bodyHtml = ordered.map((b) => renderBlock(b, ctx)).join('\n');

  const unplaced = assets
    .map((a, idx) => ({ a, idx }))
    .filter(({ idx }) => !ctx.used.has(idx))
    .map(({ a }, j) => figure(a, !ctx.firstImg.done && j === 0));
  const strip = unplaced.length ? `<hr class="strip-rule">${unplaced.join('\n')}` : '';

  return journalShell(row.title, `
  <header>
    <p class="over">${esc(row.day_date ? fmtDay(row.day_date) : 'il varo')} · the journal</p>
    <h1>${esc(row.title)}</h1>
    ${row.voice ? `<p class="sub">${esc(row.voice)}</p>` : ''}
    ${chipRow(row.threads)}
  </header>
  <article class="chbody">
${bodyHtml}
${strip}
  </article>
  ${row.closer ? `<p class="closer">${esc(row.closer)}</p>` : ''}
  <nav class="pn">${prev ? `<a href="/journal/ch/${esc(prev.id)}">‹ ${esc(prev.title)}</a>` : '<span></span>'}${
    next ? `<a href="/journal/ch/${esc(next.id)}">${esc(next.title)} ›</a>` : '<span></span>'}</nav>
  <footer>back to <a href="/journal">the spine</a></footer>`);
}
