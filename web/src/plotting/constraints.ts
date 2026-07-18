import type { Scenario } from './cfg';
import type { ComputeResult } from './compute';

/**
 * Constraint rules as data — flags surfaced on conflict, and the open questions per arc. Ported
 * from flagsFor()/questionsFor() in plotting-table.html. Encoded as rules over the scenario rather
 * than inline conditionals scattered through the view. The split branch is clean (boys confirmed to
 * travel home unaccompanied) — no chaperone gate.
 */
export interface Flag {
  level: 'ok' | 'note' | 'warn';
  text: string;
}

export function flagsFor(s: Scenario, c: ComputeResult): Flag[] {
  const f: Flag[] = [];
  if (s.cross === 'lakes')
    f.push({ level: 'note', text: '8am crossing start, Peulla overnight, and skis exceed the 158 cm limit — bring boots, rent skis at Catedral.' });
  if (s.cross === 'road')
    f.push({ level: 'note', text: 'Paso Samoré can shut in an August storm — hold a buffer day and a fly-through fallback.' });
  if (s.cross === 'fly')
    f.push({ level: 'warn', text: 'You skip the journey you called the point. It’s the cheapest, most ski days — and not the launch.' });
  if (s.iguazu && s.cross !== 'fly')
    f.push({ level: 'warn', text: 'Iguazú prepended to a slow crossing is ~1,500 km north then all the way back south — heavy flying, and it pushes the whole arc later.' });
  if (s.iguazu && s.cross === 'fly')
    f.push({ level: 'note', text: 'Two wonders, minimal voyage: falls then a direct hop to ski. A different trip from the launch, but it works on days.' });
  if (s.split) {
    f.push({ level: 'ok', text: 'Boys home from the 27th, travelling together unaccompanied — confirmed (Bryce 17 the responsible sibling). No chaperone needed.' });
    if (c.sharedToSplit !== null && c.sharedToSplit < 2)
      f.push({ level: 'warn', text: `This arc lands the boys at Llao Llao with only ~${c.sharedToSplit} night(s) before the 27th — they’d barely ski. Drop Iguazú, shorten the crossing, or move the split date.` });
  }
  f.push({ level: 'ok', text: 'Late August sits after the Argentine winter break (Buenos Aires holidays end early August) — quiet slopes on a deep-season base, whatever you choose.' });
  return f;
}

export function questionsFor(s: Scenario): string[] {
  const q = ['QF28 runs Tue/Thu/Fri/Sun at 13:10 — boys Thu 27 Aug, the two of us Sun 30 Aug.'];
  if (s.cross === 'lakes') q.push('Book the Cruce Andino plus the Peulla & Puerto Blest family rooms (quote-only).');
  if (s.cross === 'road') q.push('Engage a private cross-border operator (TCP permit) with an SUV/van for five plus gear.');
  if (s.cross === 'fly') q.push('Confirm the ~3pm SCL→BRC via Aeroparque (check for a seasonal late-August direct); self-transfer buffer.');
  if (s.iguazu) q.push('Argentine or Brazilian side, and the Buenos Aires routing — does it fit without gutting ski days?');
  if (s.split) {
    q.push('Boys’ return: BRC→Santiago via Aeroparque on the 27th (no nonstop), overnight, then QF28 home — confirmed solo-capable.');
    if (s.secondAct === 'mendoza') q.push('Wine lodge — Cavas Wine Lodge or The Vines in the Uco Valley.');
    if (s.secondAct === 'iguazu') q.push('Couples Iguazú adds a long northern leg at the end — worth the flying for two?');
  }
  return q;
}
