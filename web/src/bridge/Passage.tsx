/**
 * The passage — the whole journey, gate to gate. The Voyage's bathymetric chart is the in-region
 * crossing; this is the intercontinental arc + the departure timeline (Brisbane → Sydney → Santiago
 * → the crossing → home). The launch (QF27) carries the ember.
 */
const TL: [string, string, boolean][] = [
  ['Sat 4 Jul', 'QF527 · Brisbane → Sydney · 12:15', false],
  ['Sat 4 Jul', 'Sydney · overnight', false],
  ['Sun 5 Jul', 'QF27 · Sydney → Santiago · 10:20 · the launch', true],
  ['5–11 Jul', 'the crossing · Puerto Varas → Catedral', false],
  ['~15 Jul', 'QF28 · Buenos Aires → Sydney · home', false],
];

export function Passage(): JSX.Element {
  return (
    <div className="card passage">
      <p className="card-eyebrow">The passage · gate to gate</p>
      <svg viewBox="0 0 220 96" className="passage-map" role="img" aria-label="The journey from Brisbane to Cerro Catedral">
        <path d="M18,72 L40,76 C74,40 116,26 150,44 C166,53 182,42 200,78" fill="none"
          stroke="rgba(124,138,147,.4)" strokeWidth="1.2" strokeDasharray="3 3.5" strokeLinecap="round" />
        <text className="mm-icon" x="92" y="30">✈</text>
        <text className="mm-icon" x="176" y="54">⛵</text>
        <g className="mm-stop"><circle cx="18" cy="72" r="2.6" /><text x="18" y="86">Brisbane</text></g>
        <g className="mm-stop"><circle cx="40" cy="76" r="2.6" /><text x="48" y="90">Sydney</text></g>
        <g className="mm-stop mm-pass"><circle cx="150" cy="44" r="3" /><text x="150" y="34">Santiago</text></g>
        <g className="mm-stop"><circle cx="200" cy="78" r="2.6" /><text x="196" y="92">Catedral</text></g>
      </svg>
      <ol className="passage-tl">
        {TL.map(([d, l, launch], i) => (
          <li key={i} className={launch ? 'pl-launch' : ''}>
            <span className="pl-dot" />
            <span className="pl-date">{d}</span>
            <span className="pl-leg">{l}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
