import { Hono } from 'hono';
import type { Env } from '../env';
import { streamConcierge } from '../lib/anthropic';

const SYSTEM = `You are the trip concierge for "il varo — The Crossing": a family's winter crossing of the Andes by water, August 2026 — two weeks. Five travellers — two adults (Michael and Claire) and three sons, Bryce (17), Lachlan (14) and Fraser (8). They fly QF527 Brisbane→Sydney (Sat 15 Aug, 12:15) and overnight in Sydney, then QF27 Sydney→Santiago (departs SYD 12:20, lands SCL 10:50, Sun 16 Aug), and cross the Andes from Puerto Varas to Bariloche via the Cruce Andino lake crossing (Lago Todos los Santos · Paso Pérez Rosales 976 m · Lago Frías · Nahuel Huapi), then ski at Cerro Catedral, staying at Llao Llao. The plan is "The Launch" — all five, together the whole way, no split: Puerto Varas 23–26 Aug, the Cruce Andino with a Peulla night 26–28, Puerto Blest 28–29, then Llao Llao 29 Aug – 5 Sep with about six ski days at Catedral. Home together: BRC→Santiago via Aeroparque Sat 5 Sep, overnight, QF28 Sun 6 Sep (dep SCL 13:10, lands Sydney Mon 7 Sep 17:40, Brisbane that night). The week after they land, Emily — the family's au pair — is sworn in and marches into the army on Mon 14 Sep, with the whole family attending. QF27/QF28 operate Tue, Thu, Fri and Sun this season.

Answer questions about the trip — logistics, the crossing, skiing, weather, the options — concisely and warmly. Australian spelling, metric, no emoji. Be concrete; end on statements, not offers. If you don't know a specific real-world booking detail, say so plainly rather than inventing it.`;

export const conciergeRouter = new Hono<{ Bindings: Env }>();

conciergeRouter.post('/', async (c) => {
  if (!c.env.ANTHROPIC_API_KEY) {
    return c.json({ error: 'The concierge is offline — no API key configured.' }, 503);
  }
  const body = (await c.req.json().catch(() => null)) as { q?: string } | null;
  const q = body?.q?.trim();
  if (!q) return c.json({ error: 'empty question' }, 400);
  if (q.length > 1000) return c.json({ error: 'question too long' }, 400);
  return streamConcierge(c.env.ANTHROPIC_API_KEY, q, SYSTEM);
});
