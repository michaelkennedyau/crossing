-- The south verdict — the honest state of the mountain and the call it implies, editable
-- without a deploy. Re-apply after edits: npm run db:seed:south-intel
CREATE TABLE IF NOT EXISTS south_intel (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR REPLACE INTO south_intel (id, json, updated_at) VALUES ('v1', '{
  "verdict": "The south is dead for this window. Europe holds the tickets, the weather logic and Claire — the cruise path is the better outcome. The south keeps the watch, not the itinerary.",
  "sections": [
    {
      "title": "Why it is dead right now",
      "lines": [
        "Los Libertadores closed since 13 July — day 22, 6.6 m at the complex, second-longest closure ever; freight bodies project ~80 closed days this winter",
        "Portillo is open but helicopter-only — the resort says the road is clear, the government has not signed it off; a joint Chile–Argentina evaluation gates reopening",
        "Mid-August is mid-winter, not spring: short days, storm cycles, Catedral rescued-not-transformed (60–70 cm, 30 of 58 runs open)",
        "The calendar fights the window: Portillo runs Sat–Sat and low season only starts 29 Aug — landing Sun 16 buys peak pricing or dead days",
        "~30 hours of eastbound flying after Asia, against ~8 from Singapore to Europe on tickets already held",
        "Spending the Andes now burns the 2027 family crossing — the lakes, the boys, all five — on a two-person weather pivot"
      ]
    },
    {
      "title": "The one thing that would revive it",
      "lines": [
        "The 12 August rule: CH-60 open AND QF27 Sun 16 Aug seats AND a Portillo week held — all three by 12 Aug, or the south stays down",
        "The plough window is real: after the 6 Aug front the models show 7–11 Aug dry, cold and calm — crews are at Guardia Vieja and Las Cuevas; the tunnel approach and a joint sign-off remain",
        "If it opens and you go: snow only — Portillo all-inclusive suits Claire (pool and spa over Laguna del Inca, no driving, no decisions); the lakes stay sacred for 2027"
      ]
    },
    {
      "title": "Why Europe is the better outcome",
      "lines": [
        "The tickets already work: LHR 14 Aug in, QF2 out 2 Sep — zero refund friction, zero rebooking risk eleven days out",
        "A small-ship cruise solves the three hard problems at once: Claire-fit (one unpack, no decisions), 38° heat (the sea is the air conditioning), and dinner logistics",
        "Two Ponant departures sit exactly in the window — Italy/Malta dep 19 Aug and Dalmatia dep 20 Aug — under review against the private-charter arithmetic (gulet €17–25k/wk vs shore base)",
        "The whole northern machine — the board, the outlook, the pivots — keeps arguing with live weather; the south page only needs to watch the pass"
      ]
    }
  ]
}', datetime('now'));
