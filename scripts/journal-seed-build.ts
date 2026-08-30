/**
 * Compiles seed/journal/<slug>.md (front-matter + line grammar) into sql/journal_seed.sql.
 * Every statement is INSERT OR IGNORE — re-runs are free, existing (possibly edited) rows
 * are never touched. Also emits the prompts meta row (mined from ::prompt blocks), the
 * site meta v1, and the intel v1 doc (handover fiction flagged aspirational, never lived).
 *
 * Run: node --experimental-strip-types scripts/journal-seed-build.ts
 * Apply: npm run db:seed:journal
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseGrammar } from '../src/journal/blocks.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.resolve(HERE, '..', 'seed/journal');
const OUT = path.resolve(HERE, '..', 'sql/journal_seed.sql');

const q = (s: string): string => `'${s.replace(/'/g, "''")}'`;

interface Front { slug: string; day_date: string; title: string; voice: string; closer: string; threads: string[]; sort: number }

function parseFront(src: string): { front: Front; body: string } {
  const m = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('no front matter');
  const kv: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) kv[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return {
    front: {
      slug: kv.slug, day_date: kv.day_date ?? '', title: kv.title ?? kv.slug,
      voice: kv.voice ?? '', closer: kv.closer ?? '',
      threads: (kv.threads ?? '').split(',').map((t) => t.trim()).filter(Boolean),
      sort: Number(kv.sort ?? 0),
    },
    body: m[2],
  };
}

const files = readdirSync(SEED_DIR).filter((f) => f.endsWith('.md')).sort();
const stmts: string[] = [];
const promptsBySlug: Record<string, string[]> = {};
let totalWords = 0;

for (const f of files) {
  const { front, body } = parseFront(readFileSync(path.join(SEED_DIR, f), 'utf8'));
  if (!front.slug) throw new Error(`${f}: no slug`);
  const blocks = parseGrammar(body, 'seed');
  if (!blocks.length) throw new Error(`${f}: empty body`);
  promptsBySlug[front.slug] = blocks.flatMap((b) => (b.t === 'prompt' ? [b.q] : []));
  totalWords += body.split(/\s+/).length;
  stmts.push(
    `INSERT OR IGNORE INTO journal_chapters (id, day_date, title, voice, body, threads, closer, public, sort) VALUES (` +
      [q(front.slug), q(front.day_date), q(front.title), q(front.voice), q(JSON.stringify(blocks)),
       q(JSON.stringify(front.threads)), q(front.closer), '0', String(front.sort)].join(', ') + ');',
  );
}

const META_V1 = {
  title: 'The Crossing',
  sub: 'conditions remain superb',
  hero: 'Twenty-one days, four countries, one attempted robbery, one unplanned city, the last berth on a small French ship, and a table in Palermo that could not be booked, only offered.',
  indexable: false,
  threads: {
    doctrine: 'the plan is a doctrine, not an itinerary',
    screens: 'how to read a room, a queue, a lanyard',
    'trade-channel': "the best assets can't be booked, only introduced",
    water: 'arrival by water, swims with stories in them',
    drops: 'one image, one question, filed by site',
    ledger: 'every price and what it actually bought',
    conditions: 'the family register. conditions remain superb.',
  },
  cast: [
    'Michael & Claire — the leads',
    'Le Dumont d’Urville — 92 staterooms, one of them ours',
    'the three gentlemen of Gare du Nord — brief appearance, poor reviews',
    'Aurora — Palermo. The table on the first of September was hers.',
  ],
};

const INTEL_V1 = {
  doctrine: [
    { n: 1, rule: 'The hard deadline is a cliff. Plan to last-boat-minus-one; the final boat is the reserve. Avoid ruin, then optimise.', provenance: ['ch01-gare-du-nord'], status: 'lived' },
    { n: 2, rule: 'Spend scarce hours on non-substitutable assets.', provenance: [], status: 'aspirational — written before the trip caught up' },
    { n: 3, rule: 'Highest-variance leg first, where the buffer is.', provenance: [], status: 'aspirational — written before the trip caught up' },
    { n: 4, rule: 'Capacity-capped early; elastic items last — they double as shock absorbers.', provenance: [], status: 'aspirational — written before the trip caught up' },
    { n: 5, rule: 'Pre-commit the switch criterion at the fork. Judge on behaviour, never timetables. One decision, no sunk-cost drift.', provenance: ['ch01-gare-du-nord'], status: 'lived — the lanyard read as behaviour, not costume' },
  ],
  corollaries: [
    { text: 'best-version: never consume the degraded version of a peak experience — defer and rebook.', provenance: ['ch03-fourteen-degrees'], status: 'lived — Mont Blanc, 17 Aug, "I won\'t watch cams"' },
    { text: 'the pré-plainte-online protocol: file the same evening, attach everything, close the loop.', provenance: ['ch01-gare-du-nord'], status: 'lived' },
    { text: 'timetables are narrative, queues are behaviour · price agreed before boarding · said twice, echoed back, screenshot', provenance: [], status: 'aspirational — written before the trip caught up' },
  ],
  contacts: [
    { name: 'Virtu Ferries', ref: '10729224 / ETYWX', what: 'Valletta→Pozzallo 31 Aug 07:30', status: 'booked' },
    { name: '1926 La Galerie', ref: '73521701309804', what: 'Valletta premium suite', status: 'booked' },
    { name: 'TGV Lyon→Nice', ref: 'TKD3G6 / BL4P7Q / HPW6G9', what: 'the 11:40, 18 Aug', status: 'booked' },
    { name: 'Pozzallo drivers', ref: 'quotes €280–380', what: 'the 230km to Palermo', status: 'open' },
  ],
  protocols: [
    { name: 'recap-echo-screenshot', steps: ['price said twice', 'echoed back', 'screenshot'], status: 'aspirational — written before the trip caught up' },
  ],
};

const sql = `-- GENERATED by scripts/journal-seed-build.ts — do not hand-edit.
-- ${files.length} chapters, ~${totalWords} words of seed. INSERT OR IGNORE everywhere:
-- re-runs are free and existing (edited) rows are never clobbered.
${stmts.join('\n')}
INSERT OR IGNORE INTO journal_meta (id, json) VALUES ('prompts', ${q(JSON.stringify(promptsBySlug))});
INSERT OR IGNORE INTO journal_meta (id, json) VALUES ('v1', ${q(JSON.stringify(META_V1))});
INSERT OR IGNORE INTO journal_intel (id, json) VALUES ('v1', ${q(JSON.stringify(INTEL_V1))});
`;

writeFileSync(OUT, sql);
console.log(`wrote ${OUT}: ${files.length} chapters, ${(sql.length / 1024).toFixed(0)}KB, prompts for ${Object.keys(promptsBySlug).length} slugs`);
