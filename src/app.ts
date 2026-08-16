import { Hono } from 'hono';
import type { Env } from './env';
import { renderThreshold } from './threshold';
import { renderAndes } from './shell';
import { renderNorth } from './north-shell';
import { renderPlan } from './north-plan';
import { renderWeatherGuide } from './north-weather-page';
import { renderAurora } from './north-aurora';
import { ensoRouter } from './routes/enso';
import { weatherRouter } from './routes/weather';
import { countdownRouter } from './routes/countdown';
import { cfgRouter } from './routes/cfg';
import { todosRouter } from './routes/todos';
import { conciergeRouter } from './routes/concierge';
import { northCfgRouter } from './routes/north-cfg';
import { northArcsRouter } from './routes/north-arcs';
import { northTodosRouter } from './routes/north-todos';
import { northCountdownRouter } from './routes/north-countdown';
import { northWeatherRouter } from './routes/north-weather';
import { northOutlookRouter } from './routes/north-outlook';
import { northConciergeRouter } from './routes/north-concierge';
import { northPinsRouter } from './routes/north-pins';
import { northEventsRouter } from './routes/north-events';
import { northItineraryRouter } from './routes/north-itinerary';
import { northPivotsRouter } from './routes/north-pivots';
import { southPassesRouter } from './routes/south-passes';
import { southIntelRouter } from './routes/south-intel';

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
app.route('/api/north/arcs', northArcsRouter);
app.route('/api/north/todos', northTodosRouter);
app.route('/api/north/countdown', northCountdownRouter);
app.route('/api/north/weather', northWeatherRouter);
app.route('/api/north/outlook', northOutlookRouter);
app.route('/api/north/concierge', northConciergeRouter);
app.route('/api/north/pins', northPinsRouter);
app.route('/api/north/events', northEventsRouter);
app.route('/api/north/itinerary', northItineraryRouter);
app.route('/api/north/pivots', northPivotsRouter);
app.route('/api/south/passes', southPassesRouter);
app.route('/api/south/intel', southIntelRouter);

// SSR shells. The Threshold is the door; both voyages are complete before any JS runs.
app.get('/', async (c) => c.html(await renderThreshold(c.env)));
app.get('/andes', (c) => c.html(renderAndes(c.env)));
app.get('/north', (c) => c.html(renderNorth(c.env)));
app.get('/north/plan', async (c) => c.html(await renderPlan(c.env)));
app.get('/north/weather', async (c) => c.html(await renderWeatherGuide(c.env)));
app.get('/north/aurora', (c) => c.html(renderAurora()));

export default app;
