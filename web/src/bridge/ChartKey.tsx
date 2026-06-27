/**
 * Chart key · the design system (README §7) — the colophon: palette swatches, the four type voices
 * in role (the brief's "hand‑annotated chart vs machine telemetry" tension made explicit), and the
 * one‑idea rationale.
 */
const SWATCHES: [string, string][] = [
  ['Void', '#04060A'],
  ['Schist', '#7C8A93'],
  ['Snow', '#E9F0F2'],
  ['Emerald', '#1FA37E'],
  ['Turquoise', '#37C9C2'],
  ['Ember', '#F2B45E'],
  ['Live', '#74E0E6'],
];

export function ChartKey(): JSX.Element {
  return (
    <div className="card chartkey">
      <p className="card-eyebrow">Chart key · the design system</p>
      <div className="ck-swatches">
        {SWATCHES.map(([n, c]) => (
          <div className="ck-sw" key={n}>
            <span style={{ background: c }} />
            <em>{n}</em>
          </div>
        ))}
      </div>
      <div className="ck-voices">
        <p className="ck-voice"><span className="v-display">Fraunces</span> — the display, the <i>il varo</i> line</p>
        <p className="ck-voice"><span className="v-hand">Instrument Serif</span> — the hand, the navigator's notes</p>
        <p className="ck-voice"><span className="v-mono">IBM Plex Mono</span> — the telemetry, a ship's readout</p>
        <p className="ck-voice"><span className="v-body">Outfit</span> — the quiet body</p>
      </div>
      <p className="ck-rationale">
        One idea governs every choice: the site is the bridge of the vessel being launched, and one
        scalar — scroll progress — is time of day and emotional temperature. The page opens cold,
        misted, near‑monochrome and lifts to luminous alpine daylight; a single warm ember rides the
        route and berths at Llao Llao. Warmth is rationed — overuse the ember and the device dies.
      </p>
    </div>
  );
}
