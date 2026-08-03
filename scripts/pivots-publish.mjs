// Publish the fleet's pivot plans into whatson's curated_experiences — one row per
// destination (id crossing-pivot-<node>, guide 'crossing', category 'pivot', the full
// pivot JSON in highlights so /api/north/pivots can serve it verbatim).
//   node scripts/pivots-publish.mjs <path-to-pivots-json>
// where the file is {pivots:[{node,name,tagline,whyNow,getIn,bail,days,hotels,eat,do,events,watchouts}]}
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const src = process.argv[2];
if (!src) { console.error('usage: pivots-publish.mjs <pivots.json>'); process.exit(1); }
const { pivots } = JSON.parse(await readFile(src, 'utf8'));
if (!Array.isArray(pivots) || !pivots.length) { console.error('no pivots in file'); process.exit(1); }

const esc = (s) => String(s ?? '').replace(/'/g, "''");
const stmts = pivots.map((p) =>
  `INSERT OR REPLACE INTO curated_experiences (id, slug, guide, category, name, tagline, location, duration, budget, book_ahead, highlights, the_case, source) VALUES (` +
    `'crossing-pivot-${esc(p.node)}', 'crossing-pivot-${esc(p.node)}', 'crossing', 'pivot', '${esc(p.name)}', ` +
    `'${esc(p.tagline)}', '${esc(p.name)}', '${esc(`${p.days.length} days`)}', '', '${esc(p.watchouts?.[0] ?? '')}', ` +
    `'${esc(JSON.stringify(p))}', '${esc(p.whyNow)}', 'crossing');`,
);

const tmp = path.join(os.tmpdir(), `pivots-publish-${process.pid}.sql`);
await writeFile(tmp, stmts.join('\n') + '\n');
try {
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'varo-family-brain', '--remote', `--file=${tmp}`], {
    cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
    stdio: 'inherit',
  });
} finally {
  await rm(tmp, { force: true });
}
console.log(`published ${pivots.length} pivot plans to whatson`);
