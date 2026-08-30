import { blockKey, type Author, type Block } from './blocks';

/**
 * The game brain — pure, injectable-today, zero bindings. Scoring measures PERSONALISATION
 * of a fully pre-written corpus: edited seed blocks migrate their words to the editor, so
 * no baseline snapshot is needed anywhere. It's a game, not an audit.
 */

export const TOLD = 70;
export const EDIT_TARGET = 0.6;   // personalise 60% of blocks for full editing marks
export const WORD_TARGET = 150;   // words of your-own-ink per chapter

export function romeDate(iso: string | Date): string {
  const t = iso instanceof Date ? iso.getTime() : Date.parse(iso);
  if (Number.isNaN(t)) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(t));
}

/** previous calendar day of an ISO date — UTC-noon arithmetic, no tz landmines */
export function prevDay(isoDay: string): string {
  const t = Date.parse(`${isoDay}T12:00:00Z`);
  if (Number.isNaN(t)) return '';
  return new Date(t - 86_400_000).toISOString().slice(0, 10);
}

export const wordCount = (s: string): number => (s.match(/\S+/g) ?? []).length;

/** words a block carries for the scoreboard (text-bearing fields only) */
function blockWords(b: Block): number {
  switch (b.t) {
    case 'p': case 'q': case 'mono': case 'drop': case 'doctrine': return wordCount(b.text);
    case 'ledger': return wordCount(b.text);
    case 'prompt': return wordCount(b.q);
    case 'card': return wordCount([b.star, ...b.lines, b.rule ?? ''].join(' '));
    case 'img': case 'map': return 0;
  }
}

export interface ChapterStats {
  score: number; told: boolean; lived: boolean;
  editedFraction: number; authoredWords: number; words: { m: number; c: number };
  promptsOpen: number; promptsAnswered: number; photoBand: number;
}

/**
 * seedPromptCount comes from the meta prompts row (questions seeded for this chapter);
 * answered = seed prompts removed + tap-inserted q blocks followed by a non-seed answer.
 */
export function chapterStats(blocks: Block[], photoCount: number, seedPromptCount = 0): ChapterStats {
  const total = blocks.length;
  const edited = blocks.filter((b) => b.by !== 'seed').length;
  const editedFraction = total ? edited / total : 0;

  const words = { m: 0, c: 0 };
  for (const b of blocks) {
    if (b.by === 'm') words.m += blockWords(b);
    else if (b.by === 'c') words.c += blockWords(b);
  }
  const authoredWords = words.m + words.c;

  const promptsOpen = blocks.filter((b) => b.t === 'prompt').length;
  let qAnswered = 0;
  for (let i = 0; i < blocks.length - 1; i++) {
    const a = blocks[i], nxt = blocks[i + 1];
    if (a.t === 'q' && a.by !== 'seed' && nxt.t === 'p' && nxt.by !== 'seed' && nxt.text.trim()) qAnswered++;
  }
  const promptsAnswered = Math.max(0, seedPromptCount - promptsOpen) + qAnswered;

  const photoBand = photoCount >= 3 ? 15 : photoCount >= 1 ? 10 : 0;

  const score = Math.round(
    45 * Math.min(1, editedFraction / EDIT_TARGET) +
    25 * Math.min(1, authoredWords / WORD_TARGET) +
    photoBand +
    15 * Math.min(1, promptsAnswered / 2),
  );
  const told = score >= TOLD;
  return { score, told, lived: told && promptsOpen === 0, editedFraction, authoredWords, words, promptsOpen, promptsAnswered, photoBand };
}

export interface ChapterInput {
  id: string; day_date: string; title: string;
  blocks: Block[]; photoCount: number; seedPromptCount: number;
}

export interface JournalProgress {
  pctTold: number;
  chapters: Record<string, ChapterStats>;
  totals: { m: number; c: number; chaptersTouched: { m: number; c: number } };
  thin: { id: string; title: string; score: number }[];
  tonight: { id: string; title: string; score: number } | null;
  promptsOpen: number;
}

export function journalProgress(chapters: ChapterInput[], today: string): JournalProgress {
  const perChapter: Record<string, ChapterStats> = {};
  const totals = { m: 0, c: 0, chaptersTouched: { m: 0, c: 0 } };
  let scoreSum = 0, dayCount = 0, promptsOpen = 0;

  for (const ch of chapters) {
    const st = chapterStats(ch.blocks, ch.photoCount, ch.seedPromptCount);
    perChapter[ch.id] = st;
    totals.m += st.words.m; totals.c += st.words.c;
    if (st.words.m > 0) totals.chaptersTouched.m++;
    if (st.words.c > 0) totals.chaptersTouched.c++;
    promptsOpen += st.promptsOpen;
    if (ch.day_date) { scoreSum += st.score; dayCount++; }
  }

  const livedSoFar = chapters.filter((c) => c.day_date && c.day_date <= today);
  const below = livedSoFar
    .map((c) => ({ id: c.id, title: c.title, score: perChapter[c.id].score }))
    .filter((x) => x.score < TOLD)
    .sort((a, b) => a.score - b.score || a.id.localeCompare(b.id));

  return {
    pctTold: dayCount ? Math.round(scoreSum / dayCount) : 0,
    chapters: perChapter,
    totals,
    thin: below.slice(0, 3),
    tonight: below[0] ?? null,
    promptsOpen,
  };
}

/**
 * The attribution diff: incoming blocks (author-blind) against stored. Identical content
 * (author-blind key) inherits the stored block's `by` — greedy, in order, each stored block
 * consumed at most once. Changed or new content is stamped with the authenticated author.
 */
export function diffBlocks(stored: Block[], incoming: Block[], author: Exclude<Author, 'seed'>): Block[] {
  const pool = stored.map((b) => ({ key: blockKey(b), by: b.by, used: false }));
  return incoming.map((b) => {
    const key = blockKey(b);
    const hit = pool.find((p) => !p.used && p.key === key);
    if (hit) { hit.used = true; return { ...b, by: hit.by }; }
    return { ...b, by: author };
  });
}

export interface Streak { lastDay: string; length: number; best: number }

export function bumpStreak(s: Streak | null, today: string): Streak {
  const cur = s ?? { lastDay: '', length: 0, best: 0 };
  if (cur.lastDay === today) return cur;
  const length = cur.lastDay === prevDay(today) ? cur.length + 1 : 1;
  return { lastDay: today, length, best: Math.max(cur.best, length) };
}

/** display line for the streak — the number just tells the truth */
export function streakLine(s: Streak | null, today: string): string {
  if (!s || !s.lastDay) return 'no streak yet';
  const alive = s.lastDay === today || s.lastDay === prevDay(today);
  return alive ? `day ${s.length} · best ${s.best}` : `the streak stands at nought · best ${s.best}`;
}
