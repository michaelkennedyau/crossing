import { Hono } from 'hono';
import type { Env } from '../env';

export const countdownRouter = new Hono<{ Bindings: Env }>();

// The ship's clock, server-authoritative. The client also runs a local countdown from <body
// data-depart>; this endpoint lets it correct drift.
countdownRouter.get('/', (c) => {
  const target = Date.parse(c.env.DEPART_ISO);
  const now = Date.now();
  return c.json({ depart: c.env.DEPART_ISO, target, now, remaining: Math.max(0, target - now) });
});
