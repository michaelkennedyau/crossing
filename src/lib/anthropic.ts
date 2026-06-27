/**
 * Stream from the Anthropic Messages API and relay it to the client as simple SSE text events.
 * Mirrors brain/src/lib/curator-ai.ts (raw fetch, anthropic-version 2023-06-01) but streamed — the
 * concierge is the one place we want token-by-token output, which brain doesn't do.
 */
export async function streamConcierge(
  apiKey: string,
  userMessage: string,
  system: string,
): Promise<Response> {
  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
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
