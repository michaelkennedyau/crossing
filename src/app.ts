import { Hono } from 'hono';
import type { Env } from './env';
import { renderShell } from './shell';
import { ensoRouter } from './routes/enso';
import { weatherRouter } from './routes/weather';
import { countdownRouter } from './routes/countdown';
import { cfgRouter } from './routes/cfg';
import { todosRouter } from './routes/todos';
import { conciergeRouter } from './routes/concierge';

export const app = new Hono<{ Bindings: Env }>();

app.get('/health', (c) =>
  c.json({ ok: true, service: 'crossing', depart: c.env.DEPART_ISO, ts: Date.now() }),
);

// Live-data + persistence + concierge API. KV-cached; never blocks paint.
app.route('/api/enso', ensoRouter);
app.route('/api/weather', weatherRouter);
app.route('/api/countdown', countdownRouter);
app.route('/api/cfg', cfgRouter);
app.route('/api/todos', todosRouter);
app.route('/api/concierge', conciergeRouter);

// SSR shell — the Voyage cinema skeleton. Beautiful and complete before any JS runs.
app.get('/', (c) => c.html(renderShell(c.env)));

export default app;
