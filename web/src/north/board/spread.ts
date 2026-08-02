/**
 * The spread's geometry — pure and tested. Nineteen nights as one dated rail: itinerary
 * stops join to absolute dates by cumulative offset from the trip epoch (the same
 * new Date(2026, 7, 14) as cfg.dateAt — the QF1 landing), forecast columns join by
 * days-from-today, and discussion pins attach to days by their date-prefixed titles
 * (the convention the itinerary card already writes: "Fri 14 Aug — …").
 */
export interface SpreadStopIn {
  key: string; name: string; node: string; nights: number;
  days: { date: string; title: string; plan: string }[];
}
export interface SpreadDay {
  offset: number; label: string; short: string;
  stopKey: string; stopName: string; node: string;
  title: string; plan: string; first: boolean;
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function tripDate(off: number): Date {
  const d = new Date(2026, 7, 14);
  d.setDate(d.getDate() + off);
  return d;
}

export function dayLabel(off: number): string {
  const d = tripDate(off);
  return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
}

/** cumulative-offset join — driven by the day arrays themselves, so a malformed
 * document still renders every day it has, dated correctly from the epoch */
export function buildSpread(stops: SpreadStopIn[]): SpreadDay[] {
  const out: SpreadDay[] = [];
  let off = 0;
  for (const s of stops) {
    for (let j = 0; j < s.days.length; j++, off++) {
      out.push({
        offset: off,
        label: dayLabel(off),
        short: String(tripDate(off).getDate()),
        stopKey: s.key,
        stopName: s.name,
        node: s.node,
        title: s.days[j].title,
        plan: s.days[j].plan,
        first: j === 0,
      });
    }
  }
  return out;
}

/** which forecast column (0..5) covers this trip day today — null outside the horizon */
export function forecastIndex(today: Date, off: number): number | null {
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d = Math.round((tripDate(off).getTime() - t0.getTime()) / 86_400_000);
  return d >= 0 && d <= 5 ? d : null;
}

/** does a pin's title carry this day's date prefix — weekday optional, month word-bounded */
export function pinMatchesDay(pinTitle: string, off: number): boolean {
  const m = /^(?:mon|tue|wed|thu|fri|sat|sun)?\s*(\d{1,2} [a-z]{3})\b/i.exec(pinTitle.trim());
  if (!m) return false;
  const d = tripDate(off);
  return m[1].toLowerCase() === `${d.getDate()} ${MON[d.getMonth()].toLowerCase()}`;
}

/** a note's pin title: the day's date plus the first breath of the note */
export function noteTitle(off: number, text: string): string {
  return `${dayLabel(off)} — ${text.trim().slice(0, 60)}`;
}
