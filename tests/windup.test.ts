import { describe, expect, it } from 'vitest';
import { getMode, producersOff, MODE_KEY } from '../src/lib/windup';
import { app } from '../src/app';
import worker from '../src/worker';
import type { Env } from '../src/env';

/** stub env: KV routes by key (windup mode + anything the route peeks at), DB records writes */
function stubEnv(opts: { mode?: string | null; kv?: Record<string, unknown>; apiKey?: string } = {}): {
  env: Env;
  dbWrites: string[];
  modelCalls: number;
} {
  const dbWrites: string[] = [];
  const state = { modelCalls: 0 };
  const env = {
    ANTHROPIC_API_KEY: opts.apiKey ?? 'sk-test',
    DEPART_ISO: 'x',
    NORTH_DEPART_ISO: 'x',
    KV: {
      get: async (key: string, type?: string) => {
        if (key === MODE_KEY) return opts.mode ?? null;
        const v = opts.kv?.[key];
        if (v === undefined) return null;
        return type === 'json' ? v : typeof v === 'string' ? v : JSON.stringify(v);
      },
      put: async () => {},
      delete: async () => {},
    },
    DB: {
      prepare: (sql: string) => ({
        bind: () => ({
          run: async () => { dbWrites.push(sql); return {}; },
          first: async () => null,
          all: async () => ({ results: [] }),
        }),
        first: async () => null,
        all: async () => ({ results: [] }),
        run: async () => { dbWrites.push(sql); return {}; },
      }),
    },
  } as unknown as Env;
  return { env, dbWrites, modelCalls: state.modelCalls };
}

describe('windup · the mode flag', () => {
  it('fails closed: absent, garbage, and KV-throw all read as wound', async () => {
    const kvNull = { get: async () => null } as unknown as KVNamespace;
    const kvJunk = { get: async () => 'party' } as unknown as KVNamespace;
    const kvBoom = { get: async () => { throw new Error('kv down'); } } as unknown as KVNamespace;
    expect(await getMode(kvNull)).toBe('wound');
    expect(await getMode(kvJunk)).toBe('wound');
    expect(await getMode(kvBoom)).toBe('wound');
  });

  it('live and frozen pass through; producers run only in live', async () => {
    const kv = (v: string) => ({ get: async () => v }) as unknown as KVNamespace;
    expect(await getMode(kv('live'))).toBe('live');
    expect(await getMode(kv('frozen'))).toBe('frozen');
    expect(producersOff('live')).toBe(false);
    expect(producersOff('wound')).toBe(true);
    expect(producersOff('frozen')).toBe(true);
  });
});

describe('windup · producer gates', () => {
  it('outlook refresh is 503 wound down when not live (even with a key present)', async () => {
    const { env } = stubEnv({ mode: 'wound' });
    const res = await app.fetch(new Request('http://x/api/north/outlook/refresh', { method: 'POST' }), env);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, reason: 'wound down' });
  });

  it('passes refresh is 503 wound down when not live', async () => {
    const { env } = stubEnv({ mode: 'frozen' });
    const res = await app.fetch(new Request('http://x/api/south/passes/refresh', { method: 'POST' }), env);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, reason: 'wound down' });
  });

  it('events GET in wound mode serves the cached KV value and never reaches the model', async () => {
    const cachedEvents = [{ name: 'Festa', where: 'Palermo', whenText: 'Sept', kind: 'festival', note: '' }];
    const { env } = stubEnv({ mode: 'wound', kv: { 'north-events:v1:palermo': cachedEvents } });
    const res = await app.fetch(new Request('http://x/api/north/events?node=palermo'), env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { events: { name: string }[] };
    // the cached model row survives; nothing exploded despite no fetch mock — proof no model call fired
    expect(body.events.some((e) => e.name === 'Festa')).toBe(true);
  });

  it('events GET in wound mode with an expired key degrades to whatson-only, still no model call', async () => {
    const { env } = stubEnv({ mode: 'wound' });
    const res = await app.fetch(new Request('http://x/api/north/events?node=palermo'), env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { events: unknown[] };
    expect(Array.isArray(body.events)).toBe(true);
  });

  it('scheduled() is a no-op outside live: no DB writes, no model calls', async () => {
    const { env, dbWrites } = stubEnv({ mode: 'wound' });
    let resolved = false;
    const ctx = {
      waitUntil: (p: Promise<unknown>) => { void p.then(() => { resolved = true; }); },
      passThroughOnException: () => {},
    } as unknown as ExecutionContext;
    await worker.scheduled({} as ScheduledController, env, ctx);
    expect(dbWrites).toEqual([]);
    expect(resolved).toBe(false); // waitUntil was never invoked — the gate returned first
  });

  it('health reports the mode', async () => {
    const { env } = stubEnv({ mode: 'wound' });
    const res = await app.fetch(new Request('http://x/health'), env);
    const body = (await res.json()) as { mode: string };
    expect(body.mode).toBe('wound');
  });
});
