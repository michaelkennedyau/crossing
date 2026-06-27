/// <reference types="@cloudflare/workers-types" />
import { app } from './app';
import type { Env } from './env';

/**
 * Worker entry (mirrors travel/app/src/worker/index.ts). The Worker owns the SSR shell ("/") and
 * the API ("/api/*", "/health"); every other path is a built client asset served by env.ASSETS.
 * No index.html is emitted by the Vite build, so "/" is never shadowed by a static asset.
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/health' || url.pathname.startsWith('/api/')) {
      return app.fetch(request, env, ctx);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
