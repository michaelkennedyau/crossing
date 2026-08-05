/**
 * The pass watch — pure prompt/shape logic for the live Andes access check ("I want to
 * know live if things have changed"). The cron runs search → brief → structure every
 * three hours; this file owns the prompts, the schema, the sanitiser and the change
 * detector. The whole south pivot hinges on these three roads.
 */
export const PASSES_KV_KEY = 'south-passes:v1';
export const PASS_IDS = ['libertadores', 'samore', 'portilloRoad'] as const;
export type PassId = (typeof PASS_IDS)[number];
export type PassStatus = 'open' | 'closed' | 'restricted' | 'unknown';

export interface PassState {
  status: PassStatus;
  detail: string;
  source: string;
  /** status flipped between two KNOWN readings — the real signal */
  changed?: boolean;
  /** an unknown reading was carried forward from the last known status */
  aged?: boolean;
  /** ISO date the carried status was last actually confirmed */
  lastConfirmed?: string;
  /** an aged/unknown pass came back with a fresh known reading (same status) */
  confirmed?: boolean;
}
export interface PassesPayload {
  passes: Record<PassId, PassState>;
  asOf: string;
}

export const PASSES_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['passes'],
  properties: {
    passes: {
      type: 'object',
      additionalProperties: false,
      required: [...PASS_IDS],
      properties: Object.fromEntries(
        PASS_IDS.map((id) => [
          id,
          {
            type: 'object',
            additionalProperties: false,
            required: ['status', 'detail', 'source'],
            properties: {
              status: { type: 'string', enum: ['open', 'closed', 'restricted', 'unknown'] },
              detail: { type: 'string' },
              source: { type: 'string' },
            },
          },
        ]),
      ),
    },
  },
};

export function buildSearchPrompt(nowIso: string): { system: string; user: string } {
  return {
    system:
      'You are a border-pass status checker for the central and southern Chilean Andes. Search the live web — ' +
      'Spanish-language sources first and authoritative ones by name: pasosfronterizos.gob.cl (Unidad de Pasos ' +
      'Fronterizos), Vialidad MOP, Delegación Presidencial de Valparaíso, La Tercera, BioBioChile, noticiasnqn, ' +
      'losandes.com.ar, official X accounts. Report what the freshest dated source actually says. If nothing is ' +
      'fresher than 48 hours, report the LAST KNOWN status with its date rather than declaring it unknown — ' +
      'reserve unknown for genuinely contradictory or absent information. Never guess beyond sources.',
    user:
      `It is ${nowIso}. Check the CURRENT status of exactly three roads and report a short factual brief on each:\n` +
      '1. Paso Los Libertadores / Cristo Redentor (CH-60, Santiago–Mendoza) — open, closed, or restricted? Since when? Any reopening plan?\n' +
      '2. The Ski Portillo access road (CH-60 to Portillo, Chilean side) — can guests drive in, or is access still helicopter-only?\n' +
      '3. Paso Cardenal Samoré (Osorno–Bariloche corridor) — open? Operating hours? Chains?\n' +
      'For each: status word, one-line detail with the date of the information, and the best source name.',
  };
}

export function buildStructurePrompt(brief: string): { system: string; user: string } {
  return {
    system:
      'You convert a road-status brief into strict JSON. status must be one of open/closed/restricted/unknown — ' +
      '"restricted" means passable with conditions (hours, chains, convoy). If the brief is unclear or stale for a ' +
      'road, use "unknown" and say why in detail. detail is one sentence including the information date. ' +
      'source is the outlet name only.',
    user: `The brief:\n\n${brief}\n\nReturn the three passes as JSON.`,
  };
}

const STATUSES = new Set<PassStatus>(['open', 'closed', 'restricted', 'unknown']);

export function sanitizePasses(raw: unknown, asOf: string): PassesPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const passes = (raw as { passes?: unknown }).passes;
  if (!passes || typeof passes !== 'object') return null;
  const out = {} as Record<PassId, PassState>;
  for (const id of PASS_IDS) {
    const p = (passes as Record<string, unknown>)[id];
    if (!p || typeof p !== 'object') return null;
    const v = p as Record<string, unknown>;
    out[id] = {
      status: STATUSES.has(v.status as PassStatus) ? (v.status as PassStatus) : 'unknown',
      detail: String(v.detail ?? '').slice(0, 300),
      source: String(v.source ?? '').slice(0, 80),
    };
  }
  return { passes: out, asOf };
}

/**
 * Reconcile a fresh read against the last one. Three honest rules:
 * 1. unknown never destroys information — the last KNOWN status carries forward, marked
 *    aged with the date it was last actually confirmed;
 * 2. CHANGED means the world changed — only a flip between two known readings earns it;
 * 3. an aged pass that comes back with the same fresh status is marked confirmed, not changed.
 */
export function diffPasses(prev: PassesPayload | null, next: PassesPayload): PassesPayload {
  for (const id of PASS_IDS) {
    const n = next.passes[id];
    const p = prev?.passes[id];
    const prevKnown = p && p.status !== 'unknown';
    if (n.status === 'unknown' && prevKnown) {
      n.status = p.status;
      n.aged = true;
      n.lastConfirmed = p.aged ? p.lastConfirmed : (p.lastConfirmed ?? prev?.asOf);
      continue;
    }
    if (n.status !== 'unknown') {
      n.lastConfirmed = next.asOf;
      if (prevKnown) {
        if (p.aged && p.status === n.status) n.confirmed = true;
        else if (p.status !== n.status) n.changed = true;
      }
    }
  }
  return next;
}
