import type { Env } from '../../src/env';

/**
 * The journal test harness. Duck-typed like the house stubEnv, extended with: rows routed
 * by table-name regex (several journal queries per render), a Map-backed R2 stub, and the
 * two journal secrets present by default. KV defaults to junk for weather keys (a miss
 * would fire a real fetch from inside a test — house rule).
 */

export interface R2Stored { body: unknown; opts?: Record<string, unknown> }

export function journalEnv(opts: {
  chapters?: unknown[];
  assets?: unknown[];
  meta?: unknown;      // parsed meta json (stored stringified)
  intel?: unknown;
  readKey?: string | null;   // null = unset (fail-closed testing)
  adminKey?: string | null;
  kv?: Record<string, unknown>;
} = {}): { env: Env; r2: Map<string, R2Stored>; sql: string[] } {
  const r2 = new Map<string, R2Stored>();
  const sql: string[] = [];
  const rowsFor = (q: string): unknown[] => {
    if (/FROM journal_assets/i.test(q) || /INSERT INTO journal_assets|UPDATE journal_assets/i.test(q)) return opts.assets ?? [];
    if (/journal_chapters/.test(q)) {
      const all = (opts.chapters ?? []) as { public?: number; enabled?: number }[];
      const pubOnly = /public=1/.test(q);
      return all.filter((r) => (r.enabled ?? 1) === 1 && (!pubOnly || r.public === 1));
    }
    return [];
  };
  const docFor = (q: string): { json: string } | null => {
    if (/journal_meta/.test(q)) return opts.meta ? { json: JSON.stringify(opts.meta) } : null;
    if (/journal_intel/.test(q)) return opts.intel ? { json: JSON.stringify(opts.intel) } : null;
    return null;
  };
  const stmt = (q: string) => ({
    bind: (..._args: unknown[]) => stmt(q),
    first: async () => { sql.push(q); return docFor(q) ?? rowsFor(q)[0] ?? null; },
    all: async () => { sql.push(q); return { results: rowsFor(q) }; },
    run: async () => { sql.push(q); return {}; },
  });
  const env = {
    JOURNAL_READ_KEY: opts.readKey === null ? undefined : (opts.readKey ?? 'read-secret-token'),
    JOURNAL_ADMIN_KEY: opts.adminKey === null ? undefined : (opts.adminKey ?? 'admin-secret-token'),
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
    DB: { prepare: stmt, batch: async (stmts: { all: () => Promise<unknown> }[]) => Promise.all(stmts.map((s) => s.all())) },
    R2_IMAGES: {
      get: async (key: string) => {
        const hit = r2.get(key);
        if (!hit) return null;
        return {
          body: hit.body,
          httpEtag: 'test-etag',
          writeHttpMetadata: () => {},
        };
      },
      put: async (key: string, body: unknown, o?: Record<string, unknown>) => { r2.set(key, { body, opts: o }); },
    },
  } as unknown as Env;
  return { env, r2, sql };
}
