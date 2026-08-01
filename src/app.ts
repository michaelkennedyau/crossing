import { Hono } from 'hono';
import type { Env } from './env';
import { renderThreshold } from './threshold';
import { renderAndes } from './shell';
import { renderNorth } from './north-shell';
import { ensoRouter } from './routes/enso';
import { weatherRouter } from './routes/weather';
import { countdownRouter } from './routes/countdown';
import { cfgRouter } from './routes/cfg';
import { todosRouter } from './routes/todos';
import { conciergeRouter } from './routes/concierge';
import { northCfgRouter } from './routes/north-cfg';
import { northTodosRouter } from './routes/north-todos';
import { northCountdownRouter } from './routes/north-countdown';
import { northWeatherRouter } from './routes/north-weather';

export const app = new Hono<{ Bindings: Env }>();

app.get('/health', (c) =>
  c.json({ ok: true, service: 'crossing', depart: c.env.DEPART_ISO, north: c.env.NORTH_DEPART_ISO, ts: Date.now() }),
);

// Live-data + persistence + concierge API for the Andes voyage. KV-cached; never blocks paint.
app.route('/api/enso', ensoRouter);
app.route('/api/weather', weatherRouter);
app.route('/api/countdown', countdownRouter);
app.route('/api/cfg', cfgRouter);
app.route('/api/todos', todosRouter);
app.route('/api/concierge', conciergeRouter);

// The North's persistence + the board's live weather feed.
app.route('/api/north/cfg', northCfgRouter);
app.route('/api/north/todos', northTodosRouter);
app.route('/api/north/countdown', northCountdownRouter);
app.route('/api/north/weather', northWeatherRouter);

// SSR shells. The Threshold is the door; both voyages are complete before any JS runs.
app.get('/', (c) => c.html(renderThreshold()));
app.get('/andes', (c) => c.html(renderAndes(c.env)));
app.get('/north', (c) => c.html(renderNorth(c.env)));

export default app;
