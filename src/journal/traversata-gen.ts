import type { Env } from '../env';
import { MODEL, completeJson } from '../lib/anthropic';
import { parseBody } from './blocks';
import { chapterStats } from './progress';

/**
 * The traversata regeneration engine. The journal corpus is the source; the five rooms
 * are retellings of it. A cron watches the corpus and rewrites the rooms with the real
 * API — but only once the content has MOVED enough (his words: "burn real api when a
 * content threshold has changed"). The dispatch desk carries a manual re-generate for
 * when the two of them know the corpus has changed enough themselves.
 *
 * Format law (his spec): every edition is themed — drama, funny, wow/cool-history —
 * as `## ` acts; the Daví room is written in funny Italian (traversata-style: warm,
 * correct, Sicilian strikes). Register: conditions remain superb; as arranged.
 */

export interface CorpusFp { words: number; edited: number; told: number }
export interface GenMeta { fp: CorpusFp; at: string; model: string }
export interface Drift { delta: CorpusFp; due: boolean; at: string | null }

// the content threshold: any of these moves and the rooms are stale enough to rewrite
export const THRESHOLD: CorpusFp = { words: 250, edited: 10, told: 2 };

export function fpDelta(prev: CorpusFp | null, cur: CorpusFp): { delta: CorpusFp; due: boolean } {
  const delta = {
    words: Math.max(0, cur.words - (prev?.words ?? 0)),
    edited: Math.max(0, cur.edited - (prev?.edited ?? 0)),
    told: Math.max(0, cur.told - (prev?.told ?? 0)),
  };
  const due = delta.words >= THRESHOLD.words || delta.edited >= THRESHOLD.edited || delta.told >= THRESHOLD.told;
  return { delta, due };
}

interface ChapterRow { id: string; day_date: string; title: string; voice: string; closer: string; body: string }

/** one walk of the corpus: the fingerprint AND the digest the generators read */
export async function corpusRead(env: Env): Promise<{ fp: CorpusFp; digest: string }> {
  const rows = await env.DB.prepare(
    'SELECT id, day_date, title, voice, closer, body FROM journal_chapters WHERE enabled=1 ORDER BY sort, day_date, id',
  ).all<ChapterRow>().then((r) => r.results ?? []).catch(() => [] as ChapterRow[]);
  const prompts = await env.DB.prepare("SELECT json FROM journal_meta WHERE id='prompts'").first<{ json: string }>()
    .then((r) => (r ? JSON.parse(r.json) as Record<string, string[]> : {})).catch(() => ({} as Record<string, string[]>));
  const photos = await env.DB.prepare(
    'SELECT chapter_id, COUNT(*) AS n FROM journal_assets WHERE enabled=1 GROUP BY chapter_id',
  ).all<{ chapter_id: string; n: number }>().then((r) => new Map((r.results ?? []).map((x) => [x.chapter_id, x.n])))
    .catch(() => new Map<string, number>());

  let words = 0, edited = 0, told = 0;
  const parts: string[] = [];
  for (const r of rows) {
    const blocks = parseBody(r.body);
    const lines: string[] = [];
    for (const b of blocks) {
      const mark = b.by === 'm' ? ' [his edit]' : b.by === 'c' ? ' [her edit]' : '';
      if (b.by === 'm' || b.by === 'c') edited++;
      switch (b.t) {
        case 'p': case 'q': case 'mono': case 'drop':
          words += b.text.split(/\s+/).filter(Boolean).length;
          lines.push(b.text + mark); break;
        case 'ledger': lines.push(`ledger: ${b.amount} — ${b.text}${mark}`); words += b.text.split(/\s+/).length; break;
        case 'doctrine': lines.push(`doctrine: ${b.text}${mark}`); words += b.text.split(/\s+/).length; break;
        case 'card': lines.push(`claire's card: ★ ${b.star}${b.lines.length ? ' · ' + b.lines.join(' · ') : ''}${b.rule ? ' · one rule: ' + b.rule : ''}`); break;
        case 'prompt': lines.push(`open question (unanswered — never invent its answer): ${b.q}`); break;
        default: break;
      }
    }
    const st = chapterStats(blocks, photos.get(r.id) ?? 0, (prompts[r.id] ?? []).length);
    if (st.told) told++;
    parts.push(`### ${r.day_date || 'undated'} — ${r.title}${r.voice ? `\nvoice: ${r.voice}` : ''}\n${lines.join('\n')}${r.closer ? `\ncloser: ${r.closer}` : ''}`);
  }
  return { fp: { words, edited, told }, digest: parts.join('\n\n').slice(0, 60_000) };
}

async function genMeta(env: Env): Promise<GenMeta | null> {
  const row = await env.DB.prepare("SELECT json FROM journal_meta WHERE id='traversata_gen'")
    .first<{ json: string }>().catch(() => null);
  if (!row) return null;
  try { return JSON.parse(row.json) as GenMeta; } catch { return null; }
}

export async function corpusDrift(env: Env): Promise<Drift> {
  const [{ fp }, meta] = await Promise.all([corpusRead(env), genMeta(env)]);
  const { delta, due } = fpDelta(meta?.fp ?? null, fp);
  return { delta, due, at: meta?.at ?? null };
}

// ── the briefs ──

const REGISTER = `REGISTER (non-negotiable):
- Deadpan optimism. The house phrase is "Conditions remain superb." — filed flat, daily, without smiling, and it is also simply true. The sign-off register is "As arranged." — everything went to plan, including the parts that were never planned. NEVER use "grim", "hardship", or mock-misery; the joke points upward now.
- Understatement scales inversely with magnitude: the biggest things are written smallest.
- The teller loses every exchange; credit is tossed, never presented. Michael is beaten by pepper grinders, timetables and honest taxi drivers; Claire is beaten by nothing.
- Never invent facts. Everything comes from the corpus digest. Lines marked [his edit]/[her edit] are LIVED words — prefer them, quote their substance faithfully. Open questions are gaps: write around them, never answer them.
- One ✻ line per document may be a stage direction to the reader (a pause, a fetch, a line that is theirs to deliver).`;

const FORMAT = `FORMAT (exact):
- "summary": the short road — one breath, comma-chained, under 170 words, ending with the house phrase.
- "long": the long road as THEMED ACTS, each opening with a "## " header line, in this order:
  "## IL DRAMMA" (or the audience's language) — the near-misses played as small opera: the minute at Gare du Nord, the last berth found with two days to spare, the missed 17:56.
  "## LA COMMEDIA" — the funny: the pepper grinder given a serious minute, Marina negotiated from fifty to forty-five and forgetting it by lunch, the Etna driver talking himself out of his own premium.
  "## THE WOW" (cool history, titled to suit the audience) — Caravaggio's only signed canvas, signed in the blood; la ficelle hauling Lyon uphill since 1862; Stromboli doing its own fireworks off the rail; the Knights' city.
  "## THE ROAD HOME" — the return and what it points at.
  Inside acts use **bold** leads and short paragraphs. Keep the audience's own furniture (the kids' ratings table, the mates' ledger, the elders' programme sense).
- "glossary": 4–6 house terms with one-line definitions; must include the house phrase and "As arranged."
- "programme": a short LE DUMONT D'URVILLE — PROGRAMME DU JOUR parody pointed at this audience's next real occasion.`;

export interface ModeBrief { audience: string; language: string; theme: string }

export const BRIEFS: Record<string, ModeBrief> = {
  davi: {
    audience: `The Daví family of Palermo — Aurora's parents. Aurora is the introduction; her forwarding the document is part of the gift. Status inversion: the visitors are the ones out of their depth, delighted about it. The lunch on 1 September was the destination the whole trip pointed at. Close with cu nesci arrinesci (Sicilian, not Italian) and what its quiet second half points at.`,
    language: `WRITE THE ENTIRE DOCUMENT IN ITALIAN — warm, funny, living Italian with precise Sicilian strikes (cu nesci arrinesci; Palermo's own furniture). The comedy of two australiani being corrected by professionals from Londra to La Valletta. The house phrase becomes "Le condizioni restano superbe." and the sign-off "Come da programma." Glossary terms in Italian with one-line Italian definitions. Act headers in Italian (## IL DRAMMA, ## LA COMMEDIA, ## LA MERAVIGLIA, ## LA STRADA DI CASA).`,
    theme: 'a gift that arrives before the guests do — pre-assembled friendship',
  },
  kids: {
    audience: `Nicholas, Sarah, Emily, Bryce, Lachlan and Fraser — read aloud before Saturday's arrivals belt, in age order or by whoever seizes it first. Keep each child's named beat (Fraser's verified table and 1862; Bryce's checker; Nicholas's three seconds after the tackle; Sarah's granita 9.1; Emily's Caravaggio moment; Lachlan's conclusions drawn silently). The ratings table is contractual.`,
    language: 'English. Dad voice: the record straightened before their mother\'s accurate version lands.',
    theme: 'the debrief before the belt',
  },
  elders: {
    audience: `Mum — who holds that a thank-you doesn't count unless it's written down — and the siblings, copied in on principle. Gratitude wearing a full accounting. The Sunday roast is the destination's destination.`,
    language: 'English, the letter register — longer breaths, nothing rushed.',
    theme: 'the written thank-you, with receipts',
  },
  friends: {
    audience: `The group chat, kept deliberately under-informed for three weeks and now owed a full disclosure document. Market-wrap furniture: positions, receipts, the ledger read aloud, the pub as clearing house, first round sorts the chair.`,
    language: 'English, interim-market-wrap deadpan.',
    theme: 'the settlement at the pub',
  },
  us: {
    audience: `Claire and Michael only — the one room with no audience, not for forwarding. The accounting the other rooms don't get: the berth is hers, entered formally; the text at Changi; the weather vane standing still off Stromboli. EXACTLY ONE plain unguarded line in the whole document, placed near the end, small.`,
    language: 'English, intimate deadpan; warmth encoded, never stated — except the one line.',
    theme: 'the private ledger',
  },
};

const GEN_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['summary', 'long', 'glossary', 'programme'],
  properties: {
    summary: { type: 'string' },
    long: { type: 'string' },
    dedication: { type: 'string' },
    glossary: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['term', 'def'], properties: { term: { type: 'string' }, def: { type: 'string' } } } },
    programme: { type: 'string' },
  },
} as const;

interface GenOut { summary: string; long: string; dedication?: string; glossary: { term: string; def: string }[]; programme: string }

export async function generateMode(apiKey: string, key: string, digest: string): Promise<GenOut> {
  const brief = BRIEFS[key];
  if (!brief) throw new Error(`no brief for mode ${key}`);
  const system = `You are writing one edition of LA TRAVERSATA — a family gift document retelling a 21-day London→Sicily crossing (Aug–Sep 2026) for ONE audience. It must feel hand-written by Michael (and Claire), never generated.

AUDIENCE: ${brief.audience}
LANGUAGE & VOICE: ${brief.language}
THEME: ${brief.theme}

${REGISTER}

${FORMAT}`;
  const user = `THE CORPUS (the lived journal — the only source of fact):\n\n${digest}\n\nWrite this audience's edition now.`;
  return completeJson<GenOut>(apiKey, { system, user, schema: GEN_SCHEMA as unknown as Record<string, unknown>, maxTokens: 16_000 });
}

export interface RegenResult { ran: boolean; due: boolean; delta: CorpusFp; ok: string[]; failed: string[] }

export async function regenerateTraversata(env: Env, opts: { force?: boolean } = {}): Promise<RegenResult> {
  const apiKey = env.ANTHROPIC_API_KEY;
  const { fp, digest } = await corpusRead(env);
  const prev = await genMeta(env);
  const { delta, due } = fpDelta(prev?.fp ?? null, fp);
  if (!apiKey || (!due && !opts.force)) return { ran: false, due, delta, ok: [], failed: [] };

  const rows = await env.DB.prepare('SELECT key, json FROM traversata_modes WHERE enabled=1 ORDER BY rowid')
    .all<{ key: string; json: string }>().then((r) => r.results ?? []).catch(() => []);
  const ok: string[] = [];
  const failed: string[] = [];
  const prevDocs: Record<string, string> = {};

  for (const row of rows) {
    if (!BRIEFS[row.key]) continue;
    try {
      const out = await generateMode(apiKey, row.key, digest);
      let existing: Record<string, unknown> = {};
      try { existing = JSON.parse(row.json) as Record<string, unknown>; } catch { /* rebuilt from scratch */ }
      prevDocs[row.key] = row.json;
      const next = {
        ...existing,
        summary: out.summary, long: out.long, glossary: out.glossary.slice(0, 8), programme: out.programme,
        ...(out.dedication ? { dedication: out.dedication } : {}),
      };
      await env.DB.prepare("UPDATE traversata_modes SET json=?, updated_at=datetime('now') WHERE key=?")
        .bind(JSON.stringify(next), row.key).run();
      ok.push(row.key);
    } catch (err) {
      console.error('traversata gen failed', row.key, err instanceof Error ? err.message : String(err));
      failed.push(row.key);
    }
  }

  if (ok.length) {
    // one-slot backup of what the rooms said before this telling
    await env.DB.prepare(
      "INSERT INTO journal_meta (id, json, updated_at) VALUES ('traversata_prev', ?, datetime('now')) ON CONFLICT(id) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at",
    ).bind(JSON.stringify(prevDocs)).run().catch(() => {});
    const meta: GenMeta = { fp, at: new Date().toISOString(), model: MODEL };
    await env.DB.prepare(
      "INSERT INTO journal_meta (id, json, updated_at) VALUES ('traversata_gen', ?, datetime('now')) ON CONFLICT(id) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at",
    ).bind(JSON.stringify(meta)).run().catch(() => {});
  }
  return { ran: true, due, delta, ok, failed };
}
