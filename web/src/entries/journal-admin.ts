/**
 * The journal intake + editing island — dependency-free by design (ship wifi). Hash-routed
 * panes: #bench (photo intake), #chapters (list), #ch/<slug> (block editor), #game.
 * Photos: EXIF DateTimeOriginal → canvas resize 1280/1920 (WebP, JPEG fallback) + 28px
 * LQIP → sequential per-variant PUTs with retry; originals deferred by default at sea.
 * Editing: one textarea per block in the line grammar; save concatenates and PUTs {text} —
 * the SERVER owns attribution (inherit-or-stamp diff), the client never sends `by`.
 */

type QState = 'queued' | 'reading' | 'uploading' | 'done' | 'failed';
interface QItem { file: File; label: string; state: QState; detail: string; assetId?: string }

const root = document.getElementById('admin-root');
if (!root) throw new Error('no root');

const esc = (x: unknown): string =>
  String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ── EXIF DateTimeOriginal (tag 0x9003) — a minimal APP1/TIFF walk, no library ──
function exifDate(buf: ArrayBuffer): string {
  try {
    const v = new DataView(buf);
    if (v.getUint16(0) !== 0xffd8) return '';
    let off = 2;
    while (off + 4 < v.byteLength) {
      const marker = v.getUint16(off);
      const size = v.getUint16(off + 2);
      if (marker === 0xffe1) {
        const tiff = off + 10;
        const little = v.getUint16(tiff) === 0x4949;
        const g16 = (o: number) => v.getUint16(o, little);
        const g32 = (o: number) => v.getUint32(o, little);
        const ifd0 = tiff + g32(tiff + 4);
        let exifIfd = 0;
        for (let i = 0, n = g16(ifd0); i < n; i++) {
          const e = ifd0 + 2 + i * 12;
          if (g16(e) === 0x8769) exifIfd = tiff + g32(e + 8);
        }
        if (!exifIfd) return '';
        for (let i = 0, n = g16(exifIfd); i < n; i++) {
          const e = exifIfd + 2 + i * 12;
          if (g16(e) === 0x9003) {
            const start = tiff + g32(e + 8);
            let s = '';
            for (let j = 0; j < 19; j++) s += String.fromCharCode(v.getUint8(start + j));
            const m = s.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}:\d{2}:\d{2})$/);
            return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}` : '';
          }
        }
        return '';
      }
      if ((marker & 0xff00) !== 0xff00) return '';
      off += 2 + size;
    }
  } catch { /* fall through */ }
  return '';
}

async function variantBlob(bmp: ImageBitmap, w: number): Promise<{ blob: Blob; fmt: 'webp' | 'jpeg' }> {
  const scale = Math.min(1, w / bmp.width);
  const cw = Math.round(bmp.width * scale);
  const ch = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  ctx.drawImage(bmp, 0, 0, cw, ch);
  const webp = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', 0.78));
  if (webp && webp.type === 'image/webp') return { blob: webp, fmt: 'webp' };
  const jpeg = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.82));
  if (!jpeg) throw new Error('encode failed');
  return { blob: jpeg, fmt: 'jpeg' };
}

function lqipOf(bmp: ImageBitmap): string {
  const w = 28;
  const h = Math.max(1, Math.round((bmp.height / bmp.width) * w));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d')?.drawImage(bmp, 0, 0, w, h);
  try { return canvas.toDataURL('image/webp', 0.4); } catch { return canvas.toDataURL('image/jpeg', 0.4); }
}

async function putWithRetry(url: string, blob: Blob, tries = 3): Promise<void> {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { method: 'PUT', body: blob, headers: { 'content-type': blob.type } });
      if (res.ok) return;
      if (res.status === 401 || res.status === 403) throw new Error('not a writer here — reopen your key link');
    } catch (e) {
      if (i === tries) throw e instanceof Error ? e : new Error('upload failed');
    }
    await new Promise((r) => setTimeout(r, 1200 * i));
  }
  throw new Error('upload failed');
}

// mini serializer — mirror of src/journal/blocks.ts serializeBlock (web must not import src/)
interface AnyBlock { t: string; by?: string; text?: string; n?: number; amount?: string; focus?: string; q?: string; star?: string; lines?: string[]; rule?: string }
function toGrammar(b: AnyBlock): string {
  switch (b.t) {
    case 'p': return b.text ?? '';
    case 'q': return `> ${b.text ?? ''}`;
    case 'mono': return `$ ${b.text ?? ''}`;
    case 'img': return `::img ${b.n ?? 1}`;
    case 'drop': return `::drop ${b.text ?? ''}`;
    case 'ledger': return b.amount ? `::ledger ${b.amount} — ${b.text ?? ''}` : `::ledger ${b.text ?? ''}`;
    case 'doctrine': return `::doctrine ${b.text ?? ''}`;
    case 'map': return b.focus ? `::map ${b.focus}` : '::map';
    case 'prompt': return `::prompt ${b.q ?? ''}`;
    case 'card':
      return ['::card', `  ⭐ ${b.star ?? ''}`, ...(b.lines ?? []).map((l) => `  ${l}`), ...(b.rule ? [`  one rule: ${b.rule}`] : [])].join('\n');
    default: return '';
  }
}

// ── shell ──
root.innerHTML = `
<style>
.tabs{display:flex;gap:16px;margin:14px 0 4px;font-size:13px}
.tabs a{color:#526579;text-decoration:none;padding-bottom:2px}
.tabs a.on{color:#0E7C6B;border-bottom:1px solid #0E7C6B}
.pane{margin-top:14px}
.drop{border:2px dashed #C6CFD8;border-radius:10px;padding:22px;text-align:center;color:#526579;font-size:14px}
.drop input{display:none}
.row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #E4E9EE;font-size:13px}
.row .st{margin-left:auto;font-variant-numeric:tabular-nums;color:#526579;white-space:nowrap}
.row.failed .st{color:#B3261E}
.row.done .st{color:#0E7C6B}
.opt{display:flex;align-items:center;gap:8px;margin:14px 0;font-size:13px;color:#43586C}
button{border:1px solid #C6CFD8;background:#fff;border-radius:6px;padding:4px 10px;font-size:13px;color:#14212C}
button.primary{background:#0E7C6B;border-color:#0E7C6B;color:#fff;padding:8px 16px}
.assets{margin-top:28px}
.assets h2,.pane h2{font-size:15px;margin-bottom:6px}
.acard{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #E4E9EE;align-items:flex-start}
.acard img{width:64px;height:48px;object-fit:cover;border-radius:6px;background:#E4E9EE}
.acard .meta{flex:1;font-size:12px;color:#526579}
.acard textarea,.blk textarea{width:100%;font-size:14px;font-family:inherit;border:1px solid #E4E9EE;border-radius:6px;padding:6px 8px;margin-top:4px;resize:none;overflow:hidden}
.acard select{font-size:12px;margin-top:4px;max-width:100%}
.chrow{display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #E4E9EE;text-decoration:none;color:inherit;font-size:14px}
.chrow .d{font-size:11px;color:#526579;min-width:74px}
.chrow .pct{margin-left:auto;font-variant-numeric:tabular-nums;font-size:12px;color:#526579}
.chrow .pct.told{color:#0E7C6B}
.ring{width:20px;height:20px;flex:0 0 20px;transform:rotate(-90deg)}
.ring circle{fill:none;stroke-width:2.5}
.ring .bg{stroke:#E4E9EE}
.ring .fg{stroke:#526579;stroke-dasharray:1}
.ring.told .fg{stroke:#0E7C6B}
.ed input[type=text]{width:100%;font-size:14px;border:1px solid #E4E9EE;border-radius:6px;padding:6px 8px;margin:3px 0}
.ed .thr{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.ed .thr button{font-size:11px;padding:2px 8px;border-radius:12px}
.ed .thr button.on{border-color:#0E7C6B;color:#0E7C6B}
.ed .pr{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.ed .pr button{font-size:11px;font-style:italic;color:#43586C;border-style:dashed}
.ed .pr button.spent{opacity:.4}
.blk{border-left:2px solid #E4E9EE;padding-left:10px;margin:10px 0}
.blk.by-m{border-left-color:#4A6B8A}
.blk.by-c{border-left-color:#A05E6E}
.savebar{position:sticky;bottom:0;background:#FBFCFDf0;padding:12px 0;display:flex;gap:12px;align-items:center;margin-top:12px}
.savemsg{font-size:12px;color:#526579}
.crossed{font-family:ui-monospace,monospace;font-size:12px;color:#0E7C6B;opacity:0;transition:opacity 1.2s}
.crossed.in{opacity:1}
.game .arcwrap{display:grid;place-items:center;margin:18px 0}
.game .arclabel{font-size:13px;color:#526579;text-align:center}
.game .cols{display:flex;gap:24px;justify-content:center;margin:14px 0;font-variant-numeric:tabular-nums}
.game .cols .who{text-align:center;font-size:12px;color:#526579}
.game .cols .n{font-size:22px;color:#14212C}
.game .bar{height:4px;border-radius:2px;margin-top:4px}
.game .cap{font-size:11px;color:#8A97A5;text-align:center;font-style:italic}
.game ul{list-style:none;margin:8px 0}
.game li a{color:#0E7C6B;text-decoration:none}
.tonight{border:1px solid #E4E9EE;border-radius:10px;padding:12px;margin-top:14px;font-size:13px}
.tonight .q{font-style:italic;color:#43586C;margin-top:4px}
</style>
<nav class="tabs"><a href="#bench" data-tab="bench">bench</a><a href="#chapters" data-tab="chapters">chapters</a><a href="#game" data-tab="game">the game</a></nav>
<div class="pane" id="pane-bench">
  <label class="drop">tap to add photos — iphone or exported Z9 jpegs
    <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple>
  </label>
  <label class="opt"><input type="checkbox" id="deferOrig" checked> originals later (variants only — kind to ship wifi)</label>
  <div id="queue"></div>
  <section class="assets"><h2>on the bench</h2><div id="assets">loading…</div></section>
</div>
<div class="pane" id="pane-chapters" hidden>loading…</div>
<div class="pane" id="pane-ed" hidden></div>
<div class="pane game" id="pane-game" hidden>loading…</div>`;

const $ = <T extends HTMLElement>(sel: string): T => root.querySelector(sel) as T;
const input = $('input[type=file]') as unknown as HTMLInputElement;
const queueEl = $('#queue');
const assetsEl = $('#assets');
const deferOrig = $('#deferOrig') as unknown as HTMLInputElement;

// ── hash routing ──
function routeTo(): void {
  const h = location.hash || '#bench';
  const tab = h.startsWith('#ch/') ? 'ed' : h.slice(1) || 'bench';
  for (const pane of ['bench', 'chapters', 'ed', 'game']) {
    ($(`#pane-${pane}`) as HTMLElement).hidden = pane !== tab;
  }
  root!.querySelectorAll<HTMLAnchorElement>('.tabs a').forEach((a) => {
    a.classList.toggle('on', a.dataset.tab === (tab === 'ed' ? 'chapters' : tab));
  });
  if (tab === 'chapters') void loadChapters();
  if (tab === 'game') void loadGame();
  if (tab === 'ed') void loadEditor(h.slice(4));
}
window.addEventListener('hashchange', routeTo);

// ── bench (intake) ──
const queue: QItem[] = [];
let running = false;

function paintQueue(): void {
  queueEl.innerHTML = queue.map((q, i) => `
    <div class="row ${q.state}">
      <span>${esc(q.label)}</span>
      <span class="st">${esc(q.detail)}</span>
      ${q.state === 'failed' ? `<button class="retry" data-i="${i}">retry</button>` : ''}
    </div>`).join('');
  queueEl.querySelectorAll<HTMLButtonElement>('button.retry').forEach((b) =>
    b.addEventListener('click', () => { const q = queue[Number(b.dataset.i)]; q.state = 'queued'; q.detail = 'queued'; void pump(); }),
  );
}

async function processOne(q: QItem): Promise<void> {
  q.state = 'reading'; q.detail = 'reading…'; paintQueue();
  const head = await q.file.slice(0, 256 * 1024).arrayBuffer();
  const takenAt = exifDate(head) || new Date(q.file.lastModified).toISOString().slice(0, 19);

  let bmp: ImageBitmap | null = null;
  try { bmp = await createImageBitmap(q.file, { imageOrientation: 'from-image' } as ImageBitmapOptions); }
  catch { bmp = null; }

  if (!bmp) {
    const init = await fetch('/api/journal/assets', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fmt: 'jpeg', w: 0, h: 0, lqip: '', taken_at: takenAt }),
    }).then((r) => r.json() as Promise<{ id: string }>);
    q.assetId = init.id;
    q.state = 'uploading'; q.detail = 'orig (no preview)…'; paintQueue();
    await putWithRetry(`/api/journal/assets/${init.id}/blob/orig`, q.file);
    q.state = 'done'; q.detail = 'orig only ✓'; paintQueue();
    return;
  }

  const [v1280, v1920] = [await variantBlob(bmp, 1280), await variantBlob(bmp, 1920)];
  const lqip = lqipOf(bmp);
  const init = await fetch('/api/journal/assets', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fmt: v1280.fmt, w: bmp.width, h: bmp.height, lqip, taken_at: takenAt }),
  }).then((r) => r.json() as Promise<{ id: string; chapter_id: string }>);
  q.assetId = init.id;

  q.state = 'uploading'; q.detail = '1280…'; paintQueue();
  await putWithRetry(`/api/journal/assets/${init.id}/blob/1280`, v1280.blob);
  q.detail = '1920…'; paintQueue();
  await putWithRetry(`/api/journal/assets/${init.id}/blob/1920`, v1920.blob);
  if (!deferOrig.checked) {
    q.detail = 'original…'; paintQueue();
    await putWithRetry(`/api/journal/assets/${init.id}/blob/orig`, q.file);
  }
  bmp.close();
  q.state = 'done';
  q.detail = `✓${init.chapter_id ? ` → ${init.chapter_id}` : ' → inbox'}${deferOrig.checked ? ' · orig deferred' : ''}`;
  paintQueue();
}

async function pump(): Promise<void> {
  if (running) return;
  running = true;
  for (const q of queue) {
    if (q.state !== 'queued') continue;
    try { await processOne(q); }
    catch (e) { q.state = 'failed'; q.detail = e instanceof Error ? e.message : 'failed'; paintQueue(); }
  }
  running = false;
  void loadAssets();
}

input.addEventListener('change', () => {
  for (const f of input.files ?? []) queue.push({ file: f, label: f.name, state: 'queued', detail: 'queued' });
  input.value = '';
  paintQueue();
  void pump();
});

interface AssetRow { id: string; chapter_id: string; lqip: string; caption: string; taken_at: string; has_orig: number }
interface ChapterListRow { id: string; day_date: string; title: string }

async function loadAssets(): Promise<void> {
  try {
    const [a, ch] = await Promise.all([
      fetch('/api/journal/assets').then((r) => r.json() as Promise<{ assets: AssetRow[] }>),
      fetch('/api/journal/chapters').then((r) => r.json() as Promise<{ chapters: ChapterListRow[] }>),
    ]);
    const opts = (sel: string) =>
      `<option value="">inbox</option>` +
      ch.chapters.map((c) => `<option value="${esc(c.id)}"${c.id === sel ? ' selected' : ''}>${esc(c.id)}</option>`).join('');
    assetsEl.innerHTML = a.assets.length
      ? a.assets.slice(-40).reverse().map((r) => `
        <div class="acard" data-id="${esc(r.id)}">
          <img src="${esc(r.lqip || `/journal/img/${r.id}/1280`)}" alt="">
          <div class="meta">
            ${esc(r.taken_at) || 'undated'} ${r.has_orig ? '· orig ✓' : '· orig deferred'}
            <textarea placeholder="caption, your voice">${esc(r.caption)}</textarea>
            <select>${opts(r.chapter_id)}</select>
          </div>
        </div>`).join('')
      : 'nothing yet';
    assetsEl.querySelectorAll<HTMLDivElement>('.acard').forEach((card) => {
      const id = card.dataset.id!;
      const ta = card.querySelector('textarea')!;
      const sel = card.querySelector('select')!;
      ta.addEventListener('change', () => void fetch(`/api/journal/assets/${id}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ caption: ta.value }),
      }));
      sel.addEventListener('change', () => void fetch(`/api/journal/assets/${id}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chapter_id: sel.value }),
      }));
    });
  } catch { assetsEl.textContent = 'bench offline — check your key link'; }
}

// ── chapters list ──
interface ProgressPayload {
  pctTold: number;
  chapters: Record<string, { score: number; told: boolean; words: { m: number; c: number }; promptsOpen: number }>;
  totals: { m: number; c: number };
  thin: { id: string; title: string; score: number }[];
  tonight: { id: string; title: string; score: number } | null;
  streak: string;
}

async function loadChapters(): Promise<void> {
  const pane = $('#pane-chapters');
  try {
    const [ch, prog] = await Promise.all([
      fetch('/api/journal/chapters').then((r) => r.json() as Promise<{ chapters: ChapterListRow[] }>),
      fetch('/api/journal/progress').then((r) => r.json() as Promise<ProgressPayload>),
    ]);
    pane.innerHTML = `<h2>chapters</h2>` + (ch.chapters.length ? ch.chapters.map((c) => {
      const st = prog.chapters[c.id];
      const score = st?.score ?? 0;
      const told = st?.told ?? false;
      const dots = `${(st?.words.m ?? 0) > 0 ? '●' : ''}${(st?.words.c ?? 0) > 0 ? '○' : ''}`;
      return `<a class="chrow" href="#ch/${esc(c.id)}">
        <svg class="ring${told ? ' told' : ''}" viewBox="0 0 20 20"><circle class="bg" cx="10" cy="10" r="8"></circle>
        <circle class="fg" cx="10" cy="10" r="8" pathLength="1" style="stroke-dashoffset:${(1 - score / 100).toFixed(2)}"></circle></svg>
        <span class="d">${esc(c.day_date || '—')}</span><span>${esc(c.title)}</span><span>${dots}</span>
        <span class="pct${told ? ' told' : ''}">${told ? 'told' : score}</span>
      </a>`;
    }).join('') : 'no chapters yet — the corpus lands soon');
  } catch { pane.textContent = 'offline'; }
}

// ── the editor ──
let dirty = false;
let currentSlug = '';

function autosize(ta: HTMLTextAreaElement): void {
  ta.style.height = 'auto';
  ta.style.height = `${ta.scrollHeight + 2}px`;
}

function addBlockTextarea(container: HTMLElement, grammar: string, by: string, focus = false): void {
  const div = document.createElement('div');
  div.className = `blk by-${by}`;
  const ta = document.createElement('textarea');
  ta.value = grammar;
  ta.rows = 1;
  div.appendChild(ta);
  container.appendChild(div);
  autosize(ta);
  ta.addEventListener('input', () => { dirty = true; autosize(ta); });
  if (focus) ta.focus();
}

async function loadEditor(slug: string): Promise<void> {
  currentSlug = slug;
  const pane = $('#pane-ed');
  pane.innerHTML = 'loading…';
  try {
    const data = await fetch(`/api/journal/chapters/${slug}`).then((r) => {
      if (!r.ok) throw new Error('nope');
      return r.json() as Promise<{ chapter: { id: string; title: string; voice: string; closer: string; threads: string; public: number; day_date: string }; blocks: AnyBlock[]; prompts: string[]; score: number }>;
    });
    const threads: string[] = JSON.parse(data.chapter.threads || '[]');
    const ALL_THREADS = ['doctrine', 'screens', 'trade-channel', 'water', 'drops', 'ledger', 'hardship'];
    const blockTexts = new Set(data.blocks.map((b) => (b.t === 'prompt' ? b.q : b.text) ?? ''));
    pane.innerHTML = `<div class="ed">
      <a href="#chapters" style="font-size:12px;color:#526579">‹ chapters</a>
      <h2 style="margin-top:8px">${esc(data.chapter.title)} <span style="color:#526579;font-weight:400;font-size:12px">${esc(data.chapter.day_date)}</span></h2>
      <input type="text" id="e-title" value="${esc(data.chapter.title)}" placeholder="title">
      <input type="text" id="e-voice" value="${esc(data.chapter.voice)}" placeholder="voice line (italic)">
      <input type="text" id="e-closer" value="${esc(data.chapter.closer)}" placeholder="closer — deadpan, unexplained">
      <div class="thr">${ALL_THREADS.map((t) => `<button data-t="${t}"${threads.includes(t) ? ' class="on"' : ''}>${t}</button>`).join('')}</div>
      <label class="opt"><input type="checkbox" id="e-pub"${data.chapter.public ? ' checked' : ''}> public</label>
      ${data.prompts.length ? `<div class="pr">${data.prompts.map((p) => `<button data-q="${esc(p)}"${blockTexts.has(p) ? ' class="spent"' : ''}>${esc(p)}</button>`).join('')}</div>` : ''}
      <div id="e-blocks"></div>
      <button id="e-add">+ a paragraph</button>
      <div class="savebar"><button class="primary" id="e-save">save</button><span class="savemsg" id="e-msg"></span><span class="crossed" id="e-crossed">told. the hardship continues.</span></div>
    </div>`;
    const blocksEl = $('#e-blocks');
    for (const b of data.blocks) addBlockTextarea(blocksEl, toGrammar(b), b.by ?? 'seed');

    pane.querySelectorAll<HTMLButtonElement>('.thr button').forEach((b) =>
      b.addEventListener('click', () => { b.classList.toggle('on'); dirty = true; }));
    pane.querySelectorAll<HTMLButtonElement>('.pr button').forEach((b) =>
      b.addEventListener('click', () => {
        addBlockTextarea(blocksEl, `> ${b.dataset.q}`, 'seed');
        addBlockTextarea(blocksEl, '', 'seed', true);
        b.classList.add('spent');
        dirty = true;
      }));
    $('#e-add').addEventListener('click', () => addBlockTextarea(blocksEl, '', 'seed', true));
    $('#e-save').addEventListener('click', () => void save(slug));
  } catch { pane.innerHTML = 'couldn’t load — <a href="#chapters">back</a>'; }
}

function gatherPayload(): Record<string, unknown> {
  const text = [...root!.querySelectorAll<HTMLTextAreaElement>('#e-blocks textarea')]
    .map((ta) => ta.value.replace(/\n{2,}/g, '\n'))
    .filter((t) => t.trim())
    .join('\n\n');
  const threads = [...root!.querySelectorAll<HTMLButtonElement>('.thr button.on')].map((b) => b.dataset.t);
  return {
    title: ($('#e-title') as unknown as HTMLInputElement).value,
    voice: ($('#e-voice') as unknown as HTMLInputElement).value,
    closer: ($('#e-closer') as unknown as HTMLInputElement).value,
    public: ($('#e-pub') as unknown as HTMLInputElement).checked ? 1 : 0,
    threads, text,
  };
}

async function save(slug: string): Promise<void> {
  const msg = $('#e-msg');
  msg.textContent = 'saving…';
  try {
    const res = await fetch(`/api/journal/chapters/${slug}`, {
      method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(gatherPayload()),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const out = (await res.json()) as { score: number; told: boolean; crossed: boolean; streak: string; blocks: AnyBlock[] };
    dirty = false;
    msg.textContent = `saved · ${out.told ? 'told' : out.score} · ${out.streak}`;
    if (out.crossed) { const c = $('#e-crossed'); c.classList.add('in'); setTimeout(() => c.classList.remove('in'), 6000); }
    // repaint blocks with fresh authorship tints
    const blocksEl = $('#e-blocks');
    blocksEl.innerHTML = '';
    for (const b of out.blocks) addBlockTextarea(blocksEl, toGrammar(b), b.by ?? 'seed');
  } catch {
    msg.textContent = 'couldn’t save — kept your words';
    const retry = document.createElement('button');
    retry.textContent = 'retry';
    retry.addEventListener('click', () => { retry.remove(); void save(slug); });
    msg.after(retry);
  }
}

window.addEventListener('pagehide', () => {
  if (dirty && currentSlug) {
    try { void fetch(`/api/journal/chapters/${currentSlug}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(gatherPayload()), keepalive: true }); } catch { /* best effort */ }
  }
});

// ── the game ──
async function loadGame(): Promise<void> {
  const pane = $('#pane-game');
  try {
    const p = await fetch('/api/journal/progress').then((r) => r.json() as Promise<ProgressPayload>);
    const total = p.totals.m + p.totals.c || 1;
    const lead = Math.abs(p.totals.m - p.totals.c);
    pane.innerHTML = `
      <div class="arcwrap"><svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r="56" fill="none" stroke="#E4E9EE" stroke-width="6"></circle>
        <circle cx="65" cy="65" r="56" fill="none" stroke="#0E7C6B" stroke-width="6" pathLength="1"
          stroke-dasharray="1" stroke-dashoffset="${(1 - p.pctTold / 100).toFixed(2)}"
          transform="rotate(-90 65 65)" style="transition:stroke-dashoffset 1.8s cubic-bezier(.4,0,.2,1)"></circle>
        <text x="65" y="70" text-anchor="middle" style="font:600 20px ui-monospace,monospace;fill:#14212C">${p.pctTold}%</text>
      </svg><div class="arclabel">told</div></div>
      <div class="cols">
        <div class="who"><div class="n">${p.totals.m.toLocaleString()}</div>his<div class="bar" style="background:#4A6B8A;width:${Math.max(8, (p.totals.m / total) * 120)}px"></div></div>
        <div class="who"><div class="n">${p.totals.c.toLocaleString()}</div>hers<div class="bar" style="background:#A05E6E;width:${Math.max(8, (p.totals.c / total) * 120)}px"></div></div>
      </div>
      <p class="cap">a lead of ${lead.toLocaleString()} words is not a personality</p>
      <p style="text-align:center;font-size:13px;color:#43586C;margin-top:10px">${esc(p.streak)}</p>
      ${p.thin.length ? `<h2 style="margin-top:20px">still thin</h2><ul>${p.thin.map((t) => `<li><a href="#ch/${esc(t.id)}">${esc(t.title)}</a> · ${t.score}</li>`).join('')}</ul>` : '<p style="font-size:13px;color:#526579;margin-top:16px">nothing thin. suspicious.</p>'}
      ${p.tonight ? `<div class="tonight"><b>tonight's chapter</b> — <a href="#ch/${esc(p.tonight.id)}" style="color:#0E7C6B">${esc(p.tonight.title)}</a> (${p.tonight.score})</div>` : ''}`;
  } catch { pane.textContent = 'offline'; }
}

void loadAssets();
routeTo();
