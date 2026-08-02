/**
 * Festivals & events near a board node during the fortnight — pure prompt/shape logic for a
 * Claude structured-output call (the route wires fetch + KV). Honest by design: only well-known
 * recurring events from model knowledge, flagged that dates must be verified before booking.
 */
export const EVENTS_TTL_SECONDS = 604800; // 7 days — this knowledge barely moves
export const eventsKvKey = (node: string): string => `north-events:v1:${node}`;

export interface AreaEvent {
  name: string;
  where: string;
  whenText: string; // human, approximate — e.g. "late Aug, usually the last weekend"
  kind: 'festival' | 'music' | 'food' | 'culture' | 'sport';
  note: string;
}

export const EVENTS_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['events'],
  properties: {
    events: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'where', 'whenText', 'kind', 'note'],
        properties: {
          name: { type: 'string' },
          where: { type: 'string' },
          whenText: { type: 'string' },
          kind: { type: 'string', enum: ['festival', 'music', 'food', 'culture', 'sport'] },
          note: { type: 'string' },
        },
      },
    },
  },
};

export function buildEventsPrompt(name: string, country: string): { system: string; user: string } {
  return {
    system:
      'You list well-known recurring festivals and events for travellers. Only include events you are confident recur annually and would plausibly fall in the window given. Never invent small events. whenText is approximate and honest (e.g. "mid-August", "last weekend of August, verify"). note is one short sentence on why a couple in their mid-40s would care (or a heads-up, e.g. crowds/prices). At most 6 events; fewer is fine; an empty list is a valid answer.',
    user:
      `Area: ${name}, ${country} (and within ~1 hour of it). Window: 14 August – 2 September 2026. ` +
      'List recurring festivals/events likely inside or touching that window.',
  };
}

/** clamp + strip anything malformed; cap at 6 */
export function sanitizeEvents(raw: unknown): AreaEvent[] {
  if (!raw || typeof raw !== 'object') return [];
  const list = (raw as { events?: unknown }).events;
  if (!Array.isArray(list)) return [];
  const kinds = new Set(['festival', 'music', 'food', 'culture', 'sport']);
  const out: AreaEvent[] = [];
  for (const e of list) {
    if (!e || typeof e !== 'object') continue;
    const v = e as Record<string, unknown>;
    if (typeof v.name !== 'string' || !v.name.trim()) continue;
    out.push({
      name: String(v.name).slice(0, 120),
      where: String(v.where ?? '').slice(0, 120),
      whenText: String(v.whenText ?? '').slice(0, 120),
      kind: kinds.has(String(v.kind)) ? (String(v.kind) as AreaEvent['kind']) : 'culture',
      note: String(v.note ?? '').slice(0, 240),
    });
    if (out.length >= 6) break;
  }
  return out;
}
