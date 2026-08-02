/**
 * The live curve — the /north page's real, moving visualisation. Where the hand-drawn crowd
 * curve argues the theory, this draws the actual sky: six days of max temperature from TODAY
 * forward for a cool→warm spread of board nodes, rain days as drops, and Claude's current
 * headline riding above it. It re-anchors itself every day the page is opened — the whole
 * chart slides forward with the calendar. Lines draw in on load; the today-marker breathes.
 * Fails silent: no data, no chart, the static curve still carries the argument.
 */
interface WxDay { tmax: number; rain: number }
interface WxNode { id: string; name: string; days: WxDay[] }

const PICK: { id: string; cls: string }[] = [
  { id: 'lofoten', cls: 'lc-0' },
  { id: 'bled', cls: 'lc-1' },
  { id: 'hvar', cls: 'lc-2' },
  { id: 'taormina', cls: 'lc-3' },
  { id: 'funchal', cls: 'lc-4' },
];

const STYLE = `
.curve--live svg text{font:9px/1 "JetBrains Mono",monospace;fill:var(--snow-dim);letter-spacing:.08em}
.curve--live .lc-name{font-size:8.5px}
.curve--live .lc-0{stroke:#7fd8f2;color:#7fd8f2}.curve--live .lc-1{stroke:#8be8c0;color:#8be8c0}
.curve--live .lc-2{stroke:#e8d18b;color:#e8d18b}.curve--live .lc-3{stroke:#e8a98b;color:#e8a98b}
.curve--live .lc-4{stroke:#d18be8;color:#d18be8}
.curve--live .lc-line{fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:640;stroke-dashoffset:640;animation:lc-draw 1.6s ease forwards}
.curve--live .lc-rain{fill:rgba(139,196,232,.8)}
.curve--live .lc-today{animation:lc-breathe 3s ease-in-out infinite;transform-origin:center;transform-box:fill-box}
.curve--live .lc-head{fill:var(--live);font-size:10px}
@keyframes lc-draw{to{stroke-dashoffset:0}}
@keyframes lc-breathe{0%,100%{opacity:.5}50%{opacity:1}}
@media (prefers-reduced-motion: reduce){.curve--live .lc-line{animation:none;stroke-dashoffset:0}.curve--live .lc-today{animation:none;opacity:1}}
`;

/** escape text fields before they enter the SVG string — everything else interpolated is numeric */
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function initLiveCurve(): void {
  const host = document.getElementById('live-curve');
  if (!host) return;
  void render(host);
}

async function render(host: HTMLElement): Promise<void> {
  try {
    const [wx, ol] = await Promise.all([
      fetch('/api/north/weather').then((r) => r.json() as Promise<{ nodes?: WxNode[] }>),
      fetch('/api/north/outlook')
        .then((r) => r.json() as Promise<{ outlook?: { headline?: string } | null }>)
        .catch(() => ({ outlook: null })),
    ]);
    const nodes = wx.nodes ?? [];
    const picked = PICK.map((p) => ({ ...p, n: nodes.find((n) => n.id === p.id) })).filter(
      (p): p is typeof p & { n: WxNode } => !!p.n && p.n.days.length >= 2,
    );
    if (!picked.length) return;

    const W = 560;
    const H = 240;
    const L = 40;
    const T = 30;
    const B = 208;
    const Rt = 540;
    const daysN = Math.min(6, ...picked.map((p) => p.n.days.length));
    const all = picked.flatMap((p) => p.n.days.slice(0, daysN).map((d) => d.tmax));
    const lo = Math.floor(Math.min(...all) / 5) * 5;
    const hi = Math.ceil(Math.max(...all) / 5) * 5;
    const x = (i: number): number => L + (i * (Rt - L)) / (daysN - 1);
    const y = (t: number): number => T + (1 - (t - lo) / Math.max(1, hi - lo)) * (B - T - 14);

    const dayLabels = Array.from({ length: daysN }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return i === 0 ? 'TODAY' : d.toLocaleDateString('en-AU', { weekday: 'short' }).toUpperCase();
    });

    const lines = picked
      .map((p) => {
        const ds = p.n.days.slice(0, daysN);
        const pts = ds.map((d, i) => `${x(i).toFixed(1)},${y(d.tmax).toFixed(1)}`).join(' ');
        const rain = ds
          .map((d, i) => (d.rain >= 2 ? `<circle class="lc-rain" cx="${x(i).toFixed(1)}" cy="${(B - 5).toFixed(1)}" r="1.8"/>` : ''))
          .join('');
        const last = ds[daysN - 1];
        return (
          `<polyline class="lc-line ${p.cls}" points="${pts}"/>` +
          rain +
          `<text class="lc-name ${p.cls}" x="${(Rt + 4).toFixed(1)}" y="${(y(last.tmax) + 3).toFixed(1)}" style="fill:currentColor">${esc(p.n.name.toUpperCase())} ${Math.round(last.tmax)}°</text>`
        );
      })
      .join('');

    const head = ol.outlook?.headline ? String(ol.outlook.headline).slice(0, 78) : '';
    const svg = `<svg viewBox="0 0 ${W + 90} ${H}" role="img" aria-label="Six-day maximum temperatures from today for five board destinations">
      <rect x="${L}" y="26" width="${Rt - L}" height="${B - 26}" fill="rgba(237,243,248,.03)"/>
      ${head ? `<text class="lc-head" x="${L}" y="16">${esc(head)}</text>` : ''}
      <line x1="${L}" y1="${B}" x2="${Rt}" y2="${B}" stroke="rgba(174,189,203,.35)" stroke-width="1"/>
      <text x="${L - 4}" y="${y(hi) + 3}" text-anchor="end">${hi}°</text>
      <text x="${L - 4}" y="${y(lo) + 3}" text-anchor="end">${lo}°</text>
      <line class="lc-today" x1="${L}" y1="${T}" x2="${L}" y2="${B}" stroke="var(--ember)" stroke-width="1.2" stroke-dasharray="2 3"/>
      ${lines}
      ${dayLabels.map((lab, i) => `<text x="${x(i).toFixed(1)}" y="226" text-anchor="${i === 0 ? 'start' : 'middle'}"${i === 0 ? ' class="c-ember"' : ''}>${lab}</text>`).join('')}
    </svg>`;

    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);
    host.insertAdjacentHTML('afterbegin', svg);
  } catch {
    /* the static curve still stands */
  }
}
