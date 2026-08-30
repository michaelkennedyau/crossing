/**
 * The journal's block grammar — one bidirectional parser (parse + serialize) shared by the
 * Worker's chapter PUT, the renderers, and the seed builder. Line grammar, blank-line
 * separated; `::` opens a directive; two-space-indented lines belong to it.
 *
 *   plain text                  → p
 *   > quoted line               → q      (memory-prompt seeds render as these)
 *   $ deadpan aside             → mono
 *   ::img 3                     → img    (1-based into the chapter's assets)
 *   ::drop text…                → drop   (the story bank, one image one question)
 *   ::ledger 45 EUR — text      → ledger (mono footnote, amount + what it bought)
 *   ::doctrine text…            → doctrine (the rule, quoted, never glossed)
 *   ::map [focus]               → map    (route sketch; focus = port id or 'a--b' leg)
 *   ::prompt question?          → prompt (an unanswered invitation; omitted from public)
 *   ::card                      → card   (Claire's day-card: ⭐ line + lines + one rule)
 *     ⭐ star text
 *     a line
 *     one rule: …
 *
 * Every block carries by: 'seed' | 'm' | 'c' — authorship lives in the JSON, not the schema.
 */

export type Author = 'seed' | 'm' | 'c';

export type Block =
  | { t: 'p'; text: string; by: Author }
  | { t: 'q'; text: string; by: Author }
  | { t: 'mono'; text: string; by: Author }
  | { t: 'img'; n: number; by: Author }
  | { t: 'drop'; text: string; by: Author }
  | { t: 'ledger'; amount: string; text: string; by: Author }
  | { t: 'doctrine'; text: string; by: Author }
  | { t: 'map'; focus?: string; by: Author }
  | { t: 'prompt'; q: string; by: Author }
  | { t: 'card'; star: string; lines: string[]; rule?: string; by: Author };

const CARD_MAX_LINES = 16;

/** parse the line grammar into blocks; everything stamped `by` (default 'seed') */
export function parseGrammar(text: string, by: Author = 'seed'): Block[] {
  const out: Block[] = [];
  const segments = text.replace(/\r\n/g, '\n').split(/\n\s*\n/);
  for (const seg of segments) {
    const s = seg.replace(/\s+$/, '');
    if (!s.trim()) continue;
    const lines = s.split('\n');
    const head = lines[0].trim();

    if (head.startsWith('::')) {
      const m = head.match(/^::([a-z]+)\s*(.*)$/);
      if (!m) continue;
      const [, name, arg] = m;
      const rest = lines.slice(1).map((l) => l.replace(/^\s{1,}/, '')).filter((l) => l.trim());
      switch (name) {
        case 'img': {
          const n = parseInt(arg, 10);
          if (Number.isFinite(n) && n >= 1 && n <= 200) out.push({ t: 'img', n, by });
          break;
        }
        case 'drop': {
          const t = [arg, ...rest].filter(Boolean).join(' ').trim();
          if (t) out.push({ t: 'drop', text: t, by });
          break;
        }
        case 'ledger': {
          const body = [arg, ...rest].filter(Boolean).join(' ').trim();
          const em = body.match(/^(.{1,24}?)\s+[—-]\s+(.*)$/);
          if (em) out.push({ t: 'ledger', amount: em[1].trim(), text: em[2].trim(), by });
          else if (body) out.push({ t: 'ledger', amount: '', text: body, by });
          break;
        }
        case 'doctrine': {
          const t = [arg, ...rest].filter(Boolean).join(' ').trim();
          if (t) out.push({ t: 'doctrine', text: t, by });
          break;
        }
        case 'map':
          out.push(arg.trim() ? { t: 'map', focus: arg.trim().slice(0, 64), by } : { t: 'map', by });
          break;
        case 'prompt': {
          const q = [arg, ...rest].filter(Boolean).join(' ').trim();
          if (q) out.push({ t: 'prompt', q, by });
          break;
        }
        case 'card': {
          const all = rest.slice(0, CARD_MAX_LINES);
          const starLine = all.find((l) => l.startsWith('⭐')) ?? '';
          const ruleLine = all.find((l) => /^one rule:/i.test(l));
          const bodyLines = all.filter((l) => l !== starLine && l !== ruleLine);
          out.push({
            t: 'card',
            star: starLine.replace(/^⭐\s*/, ''),
            lines: bodyLines,
            ...(ruleLine ? { rule: ruleLine.replace(/^one rule:\s*/i, '') } : {}),
            by,
          });
          break;
        }
        default: break; // unknown directive: dropped, forward-compat
      }
      continue;
    }

    if (lines.every((l) => l.startsWith('> ') || !l.trim())) {
      const t = lines.map((l) => l.replace(/^> /, '')).join(' ').trim();
      if (t) out.push({ t: 'q', text: t, by });
      continue;
    }
    if (lines.every((l) => l.startsWith('$ ') || !l.trim())) {
      const t = lines.map((l) => l.replace(/^\$ /, '')).join(' ').trim();
      if (t) out.push({ t: 'mono', text: t, by });
      continue;
    }
    const t = lines.join(' ').replace(/\s+/g, ' ').trim();
    if (t) out.push({ t: 'p', text: t, by });
  }
  return out;
}

/** one block back to its grammar text (the editor's textarea content) */
export function serializeBlock(b: Block): string {
  switch (b.t) {
    case 'p': return b.text;
    case 'q': return `> ${b.text}`;
    case 'mono': return `$ ${b.text}`;
    case 'img': return `::img ${b.n}`;
    case 'drop': return `::drop ${b.text}`;
    case 'ledger': return b.amount ? `::ledger ${b.amount} — ${b.text}` : `::ledger ${b.text}`;
    case 'doctrine': return `::doctrine ${b.text}`;
    case 'map': return b.focus ? `::map ${b.focus}` : '::map';
    case 'prompt': return `::prompt ${b.q}`;
    case 'card':
      return ['::card', `  ⭐ ${b.star}`, ...b.lines.map((l) => `  ${l}`), ...(b.rule ? [`  one rule: ${b.rule}`] : [])].join('\n');
  }
}

/** the identity key used by the attribution diff: type + normalised content, author-blind */
export function blockKey(b: Block): string {
  const { by: _by, ...rest } = b as Block & { by: Author };
  const norm = JSON.stringify(rest, Object.keys(rest).sort())
    .replace(/\\n/g, ' ').replace(/\s+/g, ' ');
  return norm;
}

/** validate a stored/deserialized unknown into blocks (drops anything malformed) */
export function isBlockLike(x: unknown): x is Block {
  if (!x || typeof x !== 'object') return false;
  const b = x as Record<string, unknown>;
  if (b.by !== 'seed' && b.by !== 'm' && b.by !== 'c') return false;
  switch (b.t) {
    case 'p': case 'q': case 'mono': case 'drop': case 'doctrine': return typeof b.text === 'string';
    case 'img': return typeof b.n === 'number' && Number.isFinite(b.n);
    case 'ledger': return typeof b.amount === 'string' && typeof b.text === 'string';
    case 'map': return b.focus === undefined || typeof b.focus === 'string';
    case 'prompt': return typeof b.q === 'string';
    case 'card': return typeof b.star === 'string' && Array.isArray(b.lines) && (b.lines as unknown[]).every((l) => typeof l === 'string');
    default: return false;
  }
}

export function parseBody(json: string): Block[] {
  try {
    const arr = JSON.parse(json) as unknown;
    return Array.isArray(arr) ? arr.filter(isBlockLike) : [];
  } catch {
    return [];
  }
}
