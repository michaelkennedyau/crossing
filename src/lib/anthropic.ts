/** One place to change the model. claude-opus-5 is the current default ($5/$25 per MTok). */
export const MODEL = 'claude-opus-5';

/**
 * Non-streaming structured-output call — one JSON blob in, schema-guaranteed JSON out.
 * output_config.format constrains the first text block to valid JSON matching the schema
 * (numeric min/max are unsupported there — clamp in the caller). Thinking is on by default
 * on claude-opus-5 and max_tokens caps thinking + text together, hence the headroom.
 */
export async function completeJson<T>(
  apiKey: string,
  opts: {
    system: string;
    user: string;
    schema: Record<string, unknown>;
    model?: string;
    maxTokens?: number;
  },
): Promise<T> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: opts.model ?? MODEL,
      max_tokens: opts.maxTokens ?? 4000,
      system: opts.system,
      messages: [{ role: 'user', content: opts.user }],
      output_config: { format: { type: 'json_schema', schema: opts.schema } },
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const msg = (await res.json()) as {
    stop_reason?: string;
    content?: { type: string; text?: string }[];
  };
  if (msg.stop_reason === 'refusal') throw new Error('anthropic refusal');
  if (msg.stop_reason === 'max_tokens') throw new Error('anthropic max_tokens — JSON truncated, raise maxTokens');
  const text = msg.content?.find((b) => b.type === 'text')?.text;
  if (!text) throw new Error('anthropic empty response');
  return JSON.parse(text) as T;
}

/**
 * Web-search brief — Claude with the server-side search tool, free text out. Kept separate
 * from completeJson so structured outputs never collide with search citation blocks: the
 * pass watch runs search → brief → completeJson(structure the brief).
 */
export async function searchBrief(
  apiKey: string,
  opts: { system: string; user: string; maxUses?: number; model?: string; maxTokens?: number },
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: opts.model ?? MODEL,
      max_tokens: opts.maxTokens ?? 6000,
      system: opts.system,
      messages: [{ role: 'user', content: opts.user }],
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: opts.maxUses ?? 5 }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic search ${res.status}`);
  const msg = (await res.json()) as { stop_reason?: string; content?: { type: string; text?: string }[] };
  if (msg.stop_reason === 'refusal') throw new Error('anthropic refusal');
  const text = (msg.content ?? [])
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text)
    .join('\n');
  if (!text.trim()) throw new Error('anthropic empty search brief');
  return text;
}

/**
 * Stream from the Anthropic Messages API and relay it to the client as simple SSE text events.
 * Mirrors brain/src/lib/curator-ai.ts (raw fetch, anthropic-version 2023-06-01) but streamed — the
 * concierge is the one place we want token-by-token output, which brain doesn't do.
 */
export async function streamConcierge(
  apiKey: string,
  userMessage: string,
  system: string,
  model: string = MODEL,
): Promise<Response> {
  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system,
      stream: true,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(`event: error\ndata: ${JSON.stringify({ error: `upstream ${upstream.status}` })}\n\n`, {
      headers: { 'content-type': 'text/event-stream' },
    });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();

  // Pump Anthropic's SSE → forward only text deltas as {text}. Runs for the life of the response.
  (async () => {
    const reader = upstream.body!.getReader();
    const dec = new TextDecoder();
    let buf = '';
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const evt = JSON.parse(payload) as {
              type?: string;
              delta?: { type?: string; text?: string };
            };
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
              await writer.write(enc.encode(`data: ${JSON.stringify({ text: evt.delta.text })}\n\n`));
            }
          } catch {
            /* skip non-JSON keepalives */
          }
        }
      }
      await writer.write(enc.encode('event: done\ndata: {}\n\n'));
    } catch {
      await writer.write(enc.encode('event: error\ndata: {}\n\n'));
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    },
  });
}
