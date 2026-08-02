// R2 archive for image ORIGINALS — the durable home .img-src never had (gitignored sources
// were lost forever in "the machine loss"; the Chile set survives only as committed outputs).
// Three subcommands, all driven through the root wrangler install:
//
//   node scripts/img-r2.mjs push    upload every .img-src file to crossing-images/originals/<name>
//   node scripts/img-r2.mjs pull    fetch every indexed original back into .img-src
//   node scripts/img-r2.mjs check   audit: manifest slugs with no original in R2 (and not marked lost)
//
// The bucket has no list call worth scripting against, so an originals-index.json object in the
// bucket is the ledger: { originals: { [filename]: { pushedAt } }, lost: [slug, ...] }. push
// maintains it; pull and check read it. Slugs in `lost` (the Chile set) are acknowledged-gone and
// keep the check quiet after first triage.
import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..'); // wrangler + wrangler.jsonc live here
const SRC = path.resolve(HERE, '..', '.img-src');
const MANIFEST = path.resolve(HERE, '..', 'public/img/manifest.json');
const BUCKET = 'crossing-images';
const INDEX_KEY = 'originals-index.json';

function wrangler(args, opts = {}) {
  const r = spawnSync('npx', ['wrangler', ...args], {
    cwd: REPO_ROOT,
    stdio: opts.quiet ? 'pipe' : 'inherit',
    encoding: 'utf8',
  });
  return r.status === 0;
}

async function fetchIndex() {
  const tmp = path.join(os.tmpdir(), `crossing-originals-index-${Date.now()}.json`);
  const ok = wrangler(['r2', 'object', 'get', `${BUCKET}/${INDEX_KEY}`, `--file=${tmp}`, '--remote'], { quiet: true });
  if (!ok) return { originals: {}, lost: [] };
  try {
    const idx = JSON.parse(await readFile(tmp, 'utf8'));
    return { originals: idx.originals ?? {}, lost: idx.lost ?? [] };
  } catch {
    return { originals: {}, lost: [] };
  } finally {
    await rm(tmp, { force: true });
  }
}

async function putIndex(index) {
  const tmp = path.join(os.tmpdir(), `crossing-originals-index-${Date.now()}.json`);
  await writeFile(tmp, JSON.stringify(index, null, 2));
  const ok = wrangler(['r2', 'object', 'put', `${BUCKET}/${INDEX_KEY}`, `--file=${tmp}`, '--remote'], { quiet: true });
  await rm(tmp, { force: true });
  if (!ok) console.error('warning: could not write originals-index.json');
}

async function push() {
  let files = [];
  try {
    files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png)$/i.test(f));
  } catch {
    console.error(`nothing to push — ${SRC} does not exist`);
    process.exit(1);
  }
  if (!files.length) {
    console.log('nothing to push — .img-src is empty');
    return;
  }
  const index = await fetchIndex();
  let pushed = 0;
  for (const f of files) {
    const ok = wrangler(['r2', 'object', 'put', `${BUCKET}/originals/${f}`, `--file=${path.join(SRC, f)}`, '--remote'], { quiet: true });
    if (ok) {
      index.originals[f] = { pushedAt: new Date().toISOString() };
      pushed += 1;
      console.log('pushed', f);
    } else {
      console.error('FAILED', f);
    }
  }
  await putIndex(index);
  console.log(`${pushed}/${files.length} originals in R2 (${Object.keys(index.originals).length} total indexed)`);
  if (pushed !== files.length) process.exit(1);
}

async function pull() {
  const index = await fetchIndex();
  const names = Object.keys(index.originals);
  if (!names.length) {
    console.log('index is empty — nothing to pull');
    return;
  }
  await mkdir(SRC, { recursive: true });
  let got = 0;
  for (const f of names) {
    const ok = wrangler(['r2', 'object', 'get', `${BUCKET}/originals/${f}`, `--file=${path.join(SRC, f)}`, '--remote'], { quiet: true });
    if (ok) { got += 1; console.log('pulled', f); }
    else console.error('FAILED', f);
  }
  console.log(`${got}/${names.length} originals pulled into ${SRC}`);
  if (got !== names.length) process.exit(1);
}

async function check() {
  let manifest = {};
  try {
    manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
  } catch {
    console.error(`no manifest at ${MANIFEST}`);
    process.exit(1);
  }
  const index = await fetchIndex();
  const originalSlugs = new Set(Object.keys(index.originals).map((f) => f.replace(/\.[^.]+$/, '')));
  const lost = new Set(index.lost);
  const orphans = Object.keys(manifest).filter((slug) => !originalSlugs.has(slug) && !lost.has(slug));
  if (!orphans.length) {
    console.log(`coherent: every manifest slug has an original in R2 or is marked lost (${lost.size} lost)`);
    return;
  }
  console.log(`${orphans.length} manifest slug(s) have NO original in R2:`);
  for (const s of orphans) console.log('  △', s);
  console.log('\nEither push the source (img:push) or acknowledge as lost:');
  console.log(`  add to "lost" in ${INDEX_KEY} — e.g. node scripts/img-r2.mjs mark-lost ${orphans[0]}`);
  process.exit(1);
}

async function markLost(slugs) {
  if (!slugs.length) {
    console.error('usage: img-r2.mjs mark-lost <slug> [...]');
    process.exit(1);
  }
  const index = await fetchIndex();
  index.lost = [...new Set([...index.lost, ...slugs])];
  await putIndex(index);
  console.log('marked lost:', slugs.join(', '));
}

const cmd = process.argv[2];
if (cmd === 'push') await push();
else if (cmd === 'pull') await pull();
else if (cmd === 'check') await check();
else if (cmd === 'mark-lost') await markLost(process.argv.slice(3));
else {
  console.error('usage: node scripts/img-r2.mjs <push|pull|check|mark-lost>');
  process.exit(1);
}
