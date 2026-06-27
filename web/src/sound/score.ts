import { register } from '../engine/registry';

/**
 * The score — an opt-in Web Audio drone bed keyed to scroll progress. Silent by default; the
 * AudioContext is created lazily on the first user gesture (the Sound toggle). The bed gains body as
 * the voyage descends and ducks hard through the Lago Frías engine-cut band — sudden absence is the
 * payoff. Never autoplays.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let filter: BiquadFilterNode | null = null;
let on = false;

const FREQS = [55, 82.41, 110, 220]; // a low, open chord

function ensure(): void {
  if (ctx) return;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = 0;
  filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 240;
  filter.connect(master);
  master.connect(ctx.destination);
  FREQS.forEach((f, i) => {
    const o = ctx!.createOscillator();
    o.type = 'sine';
    o.frequency.value = f * (1 + (i - 1.5) * 0.004); // gentle, deterministic detune
    const g = ctx!.createGain();
    g.gain.value = 0.22;
    o.connect(g);
    g.connect(filter!);
    o.start();
  });
  // ride the bed on scroll progress; duck through the engine-cut band (quiet → 1)
  register((c) => {
    if (!ctx || !master || !filter) return;
    const target = on ? (0.04 + 0.12 * c.progress) * (1 - 0.85 * c.quiet) : 0;
    master.gain.setTargetAtTime(target, ctx.currentTime, 0.3);
    filter.frequency.setTargetAtTime(220 + 1500 * c.progress, ctx.currentTime, 0.4);
  });
}

export function initSound(): void {
  const btn = document.querySelector<HTMLButtonElement>('[data-toggle-sound]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    ensure();
    on = !on;
    void ctx?.resume();
    btn.textContent = on ? 'Sound · on' : 'Sound';
    btn.setAttribute('aria-pressed', String(on));
  });
}
