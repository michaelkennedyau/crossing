import { useState } from 'react';

/**
 * The concierge — streamed trip Q&A. Reads the SSE relay from POST /api/concierge token-by-token.
 * Degrades to a quiet "offline" line when no API key is configured (503).
 */
export function Concierge(): JSX.Element {
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function ask(): Promise<void> {
    const question = q.trim();
    if (!question || busy) return;
    setBusy(true);
    setAnswer('');
    setErr('');
    try {
      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ q: question }),
      });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(j.error ?? 'the concierge is offline');
        setBusy(false);
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const p = line.slice(5).trim();
          if (!p) continue;
          try {
            const e = JSON.parse(p) as { text?: string };
            if (e.text) setAnswer((a) => a + e.text);
          } catch {
            /* keepalive */
          }
        }
      }
    } catch {
      setErr('the concierge could not be reached');
    }
    setBusy(false);
  }

  return (
    <div className="card">
      <p className="card-eyebrow">The concierge · ask the voyage</p>
      <div className="concierge-in">
        <input
          type="text"
          value={q}
          placeholder="When does the Cruce Andino sail? What if Samoré shuts?"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void ask(); }}
        />
        <button type="button" onClick={() => void ask()} disabled={busy}>{busy ? '…' : 'Ask'}</button>
      </div>
      {err && <p className="concierge-err">{err}</p>}
      {answer && <p className="concierge-ans">{answer}</p>}
    </div>
  );
}
