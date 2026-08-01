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
    try {
      const url = new URL(request.url);
      const ssr = url.pathname === '/' || url.pathname === '/andes' || url.pathname === '/north';
      if (ssr || url.pathname === '/health' || url.pathname.startsWith('/api/')) {
        return await app.fetch(request, env, ctx);
      }
      return await env.ASSETS.fetch(request);
    } catch (err) {
      // Never surface a bare 1101 — log the stack to observability and answer gracefully.
      console.error('worker exception', request.url, err instanceof Error ? err.stack : String(err));
      return new Response(
        '<!DOCTYPE html><meta charset="utf-8"><title>il varo</title>' +
          '<body style="background:#04060A;color:#A9B8BE;font-family:ui-monospace,monospace;display:grid;place-items:center;height:100vh;margin:0">' +
          '<p>heavy weather — the bridge will be back shortly.</p></body>',
        { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } },
      );
    }
  },
} satisfies ExportedHandler<Env>;
