import type { Env } from '../../src/env';

/**
 * The journal test harness. Duck-typed like the house stubEnv, extended with: a MUTABLE
 * chapters store with write-back (save→read round-trips), captured bind args, meta-doc
 * write-back (streak round-trips), a Map-backed R2 stub, and the journal secrets present
 * by default. KV defaults to junk for weather keys (a miss would fire a real fetch).
 */

export interface R2Stored { body: unknown; opts?: Record<string, unknown> }
export interface SqlCall { q: string; args: unknown[] }

interface ChapterRow {
  id: string; day_date: string; title: string; voice: string; body: string;
  threads: string; closer: string; public: number; sort: number; enabled: number;
  [k: string]: unknown;
}

const CH_DEFAULTS: Omit<ChapterRow, 'id' | 'title'> = {
  day_date: '', voice: '', body: '[]', threads: '[]', closer: '', public: 0, sort: 0, enabled: 1,
};

export function journalEnv(opts: {
  chapters?: Partial<ChapterRow>[];
  assets?: unknown[];
  meta?: unknown;                       // journal_meta id='v1'
  metaDocs?: Record<string, unknown>;   // other journal_meta rows (prompts, streak, …)
  intel?: unknown;
  readKey?: string | null;
  adminKey?: string | null;
  claireKey?: string | null;            // defaults present
  kv?: Record<string, unknown>;
} = {}): { env: Env; r2: Map<string, R2Stored>; sql: SqlCall[]; chapters: Map<string, ChapterRow>; metaDocs: Map<string, string> } {
  const r2 = new Map<string, R2Stored>();
  const sql: SqlCall[] = [];
  const chapters = new Map<string, ChapterRow>(
    (opts.chapters ?? []).map((c) => [c.id as string, { ...CH_DEFAULTS, title: '', ...c } as ChapterRow]),
  );
  const metaDocs = new Map<string, string>();
  if (opts.meta !== undefined) metaDocs.set('v1', JSON.stringify(opts.meta));
  for (const [k, v] of Object.entries(opts.metaDocs ?? {})) metaDocs.set(k, JSON.stringify(v));

  const chapterRows = (q: string, args: unknown[]): ChapterRow[] => {
    let rows = [...chapters.values()].filter((r) => r.enabled === 1);
    if (/public=1/.test(q)) rows = rows.filter((r) => r.public === 1);
    if (/WHERE id=\?/.test(q)) rows = rows.filter((r) => r.id === args[0]);
    return rows.map((r) => ({ ...r })); // copies — D1 rows don't alias live state
  };

  const apply = (q: string, args: unknown[]): void => {
    if (/UPDATE journal_chapters SET/.test(q)) {
      const id = args[args.length - 1] as string;
      const row = chapters.get(id);
      if (!row) return;
      const cols = [...q.matchAll(/(\w+)=\?/g)].map((m) => m[1]);
      cols.forEach((col, i) => { (row as Record<string, unknown>)[col] = args[i]; });
      return;
    }
    if (/INSERT INTO journal_chapters/.test(q)) {
      const cols = (q.match(/\(([^)]+)\)/)?.[1] ?? '').split(',').map((s) => s.trim());
      const row = { ...CH_DEFAULTS, title: '' } as ChapterRow;
      cols.forEach((col, i) => { (row as Record<string, unknown>)[col] = args[i]; });
      chapters.set(row.id, row);
      return;
    }
    if (/INSERT INTO journal_meta/.test(q)) {
      const idm = q.match(/VALUES \('(\w+)'/);
      if (idm) metaDocs.set(idm[1], args[0] as string);
      return;
    }
  };

  const results = (q: string, args: unknown[]): unknown[] => {
    if (/FROM journal_assets/i.test(q)) {
      const all = (opts.assets ?? []) as Record<string, unknown>[];
      if (/GROUP BY chapter_id/.test(q)) {
        const counts = new Map<string, number>();
        for (const a of all) counts.set(String(a.chapter_id ?? ''), (counts.get(String(a.chapter_id ?? '')) ?? 0) + 1);
        return [...counts].map(([chapter_id, n]) => ({ chapter_id, n }));
      }
      if (/WHERE (a\.)?id=\?/.test(q)) return all.filter((a) => a.id === args[0]);
      if (/WHERE chapter_id=\?/.test(q)) return all.filter((a) => a.chapter_id === args[0]);
      return all;
    }
    if (/journal_chapters/.test(q)) return chapterRows(q, args);
    if (/journal_meta/.test(q)) {
      const id = args[0] as string;
      const j = metaDocs.get(id);
      return j !== undefined ? [{ json: j }] : [];
    }
    if (/journal_intel/.test(q)) return opts.intel ? [{ json: JSON.stringify(opts.intel) }] : [];
    return [];
  };

  const stmt = (q: string, bound: unknown[] = []) => ({
    bind: (...args: unknown[]) => stmt(q, args),
    first: async () => { sql.push({ q, args: bound }); return results(q, bound)[0] ?? null; },
    all: async () => { sql.push({ q, args: bound }); return { results: results(q, bound) }; },
    run: async () => { sql.push({ q, args: bound }); apply(q, bound); return {}; },
  });

  const env = {
    JOURNAL_READ_KEY: opts.readKey === null ? undefined : (opts.readKey ?? 'read-secret-token'),
    JOURNAL_ADMIN_KEY: opts.adminKey === null ? undefined : (opts.adminKey ?? 'admin-secret-token'),
    JOURNAL_CLAIRE_KEY: opts.claireKey === null ? undefined : (opts.claireKey ?? 'claire-secret-token'),
    ANTHROPIC_API_KEY: 'sk-test',
    DEPART_ISO: 'x',
    NORTH_DEPART_ISO: 'x',
    KV: {
      get: async (key: string, type?: string) => {
        const v = opts.kv?.[key];
        if (v === undefined) return key.startsWith('north-wx') ? { offline: true } : null;
        return type === 'json' ? v : typeof v === 'string' ? v : JSON.stringify(v);
      },
      put: async () => {},
      delete: async () => {},
    },
    DB: { prepare: (q: string) => stmt(q), batch: async (stmts: { all: () => Promise<unknown> }[]) => Promise.all(stmts.map((s) => s.all())) },
    R2_IMAGES: {
      get: async (key: string) => {
        const hit = r2.get(key);
        if (!hit) return null;
        return { body: hit.body, httpEtag: 'test-etag', writeHttpMetadata: () => {} };
      },
      put: async (key: string, body: unknown, o?: Record<string, unknown>) => { r2.set(key, { body, opts: o }); },
    },
  } as unknown as Env;
  return { env, r2, sql, chapters, metaDocs };
}
