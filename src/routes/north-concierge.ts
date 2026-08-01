import { Hono } from 'hono';
import type { Env } from '../env';
import { streamConcierge } from '../lib/anthropic';
import { OUTLOOK_KV_KEY, type Outlook } from '../lib/north-outlook';
import type { NorthWxNode } from '../lib/north-weather';

const SYSTEM = `You are the trip concierge for "il varo — The North": Michael and Claire's nineteen open nights in Europe, August 2026 — the deliberately undecided half of the year's travel. The fixed spine, as ticketed: QF out of Brisbane Sat 8 Aug via Sydney and Saigon (Connect 2026 at the Sheraton Saigon, Mon 10 – Wed 12, gala Wednesday night), QF1 landing London Heathrow Friday 14 August 06:35, QF2 home from London Wednesday 2 September — nineteen nights between, just the two of them; the three boys hold Brisbane. Everything between the two Londons is open: sixteen rival arcs across Europe, each a chain of stays. The cool half: Norway (Union Øye, Geiranger, Lofoten's Holmen, Tromsø and the aurora watch from ~20 Aug), Scotland (the Fife Arms in Braemar, Skye, Edinburgh and the Fringe), the Dolomites with Venice, Slovenia (Bled, the Soča and Hiša Franko). The warm half: Croatia (a private gulet out of Split, or the Yacht Week flotilla from Sat 22 Aug), Sicily (Taormina, the Aeolians, Noto), Greece (Milos and Sifnos), Sardinia (Costa Smeralda, Barbagia, Chia), Madeira (Reid's Palace, the levadas), Portugal (Lisbon, Comporta, the Douro). Four combos split the fortnight across the crowd curve — the governing idea: Europe's beaches are rammed until Ferragosto weekend, then empty from Saturday 22 August as the continent goes back to work, so the smart shapes go cool first, warm on the exhale.

Answer questions about the fortnight — the arcs, the weather, the crowd curve, the trade-offs — concisely and warmly. Australian spelling, metric, no emoji. Be concrete; end on statements, not offers. If you don't know a specific real-world booking detail, say so plainly rather than inventing it.`;

/**
 * The North's concierge — same streaming relay as the Andes one, but enriched per-request
 * with whatever the KV cache already holds (the board's weather + the current outlook).
 * Reading the cache costs nothing and never triggers an upstream call; a cold cache just
 * means the concierge answers without live context.
 */
export const northConciergeRouter = new Hono<{ Bindings: Env }>();

northConciergeRouter.post('/', async (c) => {
  if (!c.env.ANTHROPIC_API_KEY) {
    return c.json({ error: 'The concierge is offline — no API key configured.' }, 503);
  }
  const body = (await c.req.json().catch(() => null)) as { q?: string } | null;
  const q = body?.q?.trim();
  if (!q) return c.json({ error: 'empty question' }, 400);
  if (q.length > 1000) return c.json({ error: 'question too long' }, 400);

  const [wx, outlook] = await Promise.all([
    c.env.KV.get('north-wx', 'json').catch(() => null) as Promise<NorthWxNode[] | null>,
    c.env.KV.get(OUTLOOK_KV_KEY, 'json').catch(() => null) as Promise<{ outlook: Outlook; generatedAt: string } | null>,
  ]);

  let system = SYSTEM;
  if (wx?.length) {
    const sky = wx.map((n) => ({ place: n.name, now: n.temp, days: n.days }));
    system += `\n\nCurrent sky (live Open-Meteo, current temp + 6-day tmax/rain-mm per place): ${JSON.stringify(sky)}`;
  }
  if (outlook?.outlook) {
    system += `\n\nCurrent outlook (your own cached read of the board, as of ${outlook.generatedAt}): ${JSON.stringify(outlook.outlook)}`;
  }
  return streamConcierge(c.env.ANTHROPIC_API_KEY, q, system);
});
