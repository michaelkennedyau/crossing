// Publish the crossing itinerary into whatson — the family's experiences engine living in
// the SAME D1 (varo-family-brain). Each itinerary stop becomes a curated_experiences row
// (guide 'crossing', whatson's first international guide) and each researched event becomes
// a discovered_events row with a real city, so varo.au/whatson and the taste engine see the
// trip, and crossing's own events feed reads them back. Idempotent: INSERT OR REPLACE on
// crossing-* ids. Run after the itinerary document changes:
//   node scripts/whatson-publish.mjs
import { execFileSync } from 'node:child_process';
import { writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const SITE = 'https://crossing.varo.au';
const STOP_CITY = {
  'london-in': 'London', 'london-out': 'London', bled: 'Lake Bled', soca: 'Soča Valley', croatia: 'Hvar',
};

const esc = (s) => String(s ?? '').replace(/'/g, "''");
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

const res = await fetch(`${SITE}/api/north/itinerary`);
const { itinerary } = await res.json();
if (!itinerary?.stops?.length) {
  console.error('no itinerary published — nothing to tap');
  process.exit(1);
}

const stmts = [];
for (const s of itinerary.stops) {
  const city = STOP_CITY[s.key] ?? s.name;
  const highlights = JSON.stringify({ eat: s.eat, do: s.do, days: s.days.map((d) => `${d.date}: ${d.title}`) });
  const theCase = `${s.hotel?.why ?? ''}${s.watchouts?.length ? ` △ ${s.watchouts[0]}` : ''}`;
  stmts.push(
    `INSERT OR REPLACE INTO curated_experiences (id, slug, guide, category, name, tagline, location, duration, budget, book_ahead, highlights, the_case, source) VALUES (` +
      `'crossing-${esc(s.key)}', 'crossing-${esc(s.key)}', 'crossing', 'travel', '${esc(s.name)}', ` +
      `'${esc(s.days[0]?.title ?? s.dates)}', '${esc(`${city} · ${s.dates}`)}', '${esc(`${s.nights} nights`)}', ` +
      `'', '${esc(s.watchouts?.[0] ?? '')}', '${esc(highlights)}', '${esc(theCase)}', 'crossing');`,
  );
  for (const ev of s.events ?? []) {
    const title = ev.split(/ — |, confirmed| \(/)[0].trim().slice(0, 120);
    stmts.push(
      `INSERT OR REPLACE INTO discovered_events (id, title, venue, event_date, source, description, city, status, expires_at) VALUES (` +
        `'crossing-ev-${esc(slugify(`${s.key}-${title}`))}', '${esc(title)}', '${esc(s.name)}', NULL, 'manual', ` +
        `'${esc(ev)}', '${esc(city)}', 'new', '2026-09-03');`,
    );
  }
}

const tmp = path.join(os.tmpdir(), `whatson-publish-${process.pid}.sql`);
await writeFile(tmp, stmts.join('\n') + '\n');
try {
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'varo-family-brain', '--remote', `--file=${tmp}`], {
    cwd: path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'),
    stdio: 'inherit',
  });
} finally {
  await rm(tmp, { force: true });
}
console.log(`published ${itinerary.stops.length} experiences + ${stmts.length - itinerary.stops.length} events to whatson`);
