/**
 * The journal intake island — dependency-free by design (ship wifi): photo picker →
 * EXIF DateTimeOriginal → canvas resize to 1280/1920 (WebP, JPEG fallback) + 28px LQIP →
 * init POST → sequential per-variant PUTs with retry. Originals deferred by default at
 * sea (has_orig tracks the debt). Cookies carry auth; same-origin fetches only.
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
    if (v.getUint16(0) !== 0xffd8) return ''; // not JPEG
    let off = 2;
    while (off + 4 < v.byteLength) {
      const marker = v.getUint16(off);
      const size = v.getUint16(off + 2);
      if (marker === 0xffe1) { // APP1
        const tiff = off + 10; // past 'Exif\0\0'
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
            // "2026:08:23 10:41:02" → ISO-ish local instant
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

// ── resize: bitmap → canvas at width w, WebP with JPEG fallback ──
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
      if (res.status === 401 || res.status === 403) throw new Error('not admin here — reopen your /a/ link');
    } catch (e) {
      if (i === tries) throw e instanceof Error ? e : new Error('upload failed');
    }
    await new Promise((r) => setTimeout(r, 1200 * i));
  }
  throw new Error('upload failed');
}

// ── UI ──
root.innerHTML = `
<style>
.bench{margin-top:16px}
.drop{border:2px dashed #C6CFD8;border-radius:10px;padding:22px;text-align:center;color:#526579;font-size:14px}
.drop input{display:none}
.row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #E4E9EE;font-size:13px}
.row .st{margin-left:auto;font-variant-numeric:tabular-nums;color:#526579;white-space:nowrap}
.row.failed .st{color:#B3261E}
.row.done .st{color:#0E7C6B}
.opt{display:flex;align-items:center;gap:8px;margin:14px 0;font-size:13px;color:#43586C}
button.retry{border:1px solid #C6CFD8;background:#fff;border-radius:6px;padding:2px 8px;font-size:12px}
.assets{margin-top:28px}
.assets h2{font-size:15px;margin-bottom:6px}
.card{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #E4E9EE;align-items:flex-start}
.card img{width:64px;height:48px;object-fit:cover;border-radius:6px;background:#E4E9EE}
.card .meta{flex:1;font-size:12px;color:#526579}
.card textarea{width:100%;font-size:13px;font-family:inherit;border:1px solid #E4E9EE;border-radius:6px;padding:4px 6px;margin-top:4px;resize:vertical;min-height:34px}
.card select{font-size:12px;margin-top:4px;max-width:100%}
</style>
<div class="bench">
  <label class="drop">tap to add photos — iphone or exported Z9 jpegs
    <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple>
  </label>
  <label class="opt"><input type="checkbox" id="deferOrig" checked> originals later (variants only — kind to ship wifi)</label>
  <div id="queue"></div>
  <section class="assets"><h2>on the bench</h2><div id="assets">loading…</div></section>
</div>`;

const input = root.querySelector<HTMLInputElement>('input[type=file]')!;
const queueEl = root.querySelector<HTMLDivElement>('#queue')!;
const assetsEl = root.querySelector<HTMLDivElement>('#assets')!;
const deferOrig = root.querySelector<HTMLInputElement>('#deferOrig')!;

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
    // undecodable (raw HEIC edge) — original-only, flag for post-trip derivation
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

// ── the bench: recent assets, caption + chapter editing ──
interface AssetRow { id: string; chapter_id: string; lqip: string; caption: string; taken_at: string; has_orig: number }
interface ChapterRow { id: string; title: string }

async function loadAssets(): Promise<void> {
  try {
    const [a, ch] = await Promise.all([
      fetch('/api/journal/assets').then((r) => r.json() as Promise<{ assets: AssetRow[] }>),
      fetch('/api/journal/chapters').then((r) => r.json() as Promise<{ chapters: ChapterRow[] }>),
    ]);
    const opts = (sel: string) =>
      `<option value="">inbox</option>` +
      ch.chapters.map((c) => `<option value="${esc(c.id)}"${c.id === sel ? ' selected' : ''}>${esc(c.id)}</option>`).join('');
    assetsEl.innerHTML = a.assets.length
      ? a.assets.slice(-40).reverse().map((r) => `
        <div class="card" data-id="${esc(r.id)}">
          <img src="${esc(r.lqip || `/journal/img/${r.id}/1280`)}" alt="">
          <div class="meta">
            ${esc(r.taken_at) || 'undated'} ${r.has_orig ? '· orig ✓' : '· orig deferred'}
            <textarea placeholder="caption, your voice">${esc(r.caption)}</textarea>
            <select>${opts(r.chapter_id)}</select>
          </div>
        </div>`).join('')
      : 'nothing yet';
    assetsEl.querySelectorAll<HTMLDivElement>('.card').forEach((card) => {
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
  } catch { assetsEl.textContent = 'bench offline — check the /a/ link'; }
}
void loadAssets();
