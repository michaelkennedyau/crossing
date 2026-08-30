import { journalShell } from './render-home';

/**
 * /journal/guide — the run-sheet for the two of them: what's missing, the
 * in-bocca-al-lupo choreography, the game rhythm, and the day-by-day to the
 * Brisbane belt. Static by design; the game tab carries the live numbers.
 */

const HIS = '<i class="own om"></i>';
const HERS = '<i class="own oc"></i>';
const BOTH = '<i class="own om"></i><i class="own oc"></i>';

export function renderGuide(): string {
  return journalShell('The Run-Sheet', `
<style>
.own{width:7px;height:7px;border-radius:50%;display:inline-block;margin-right:4px;vertical-align:1px}
.om{background:var(--tint-m)}.oc{background:var(--tint-c)}
.chk{border:1px solid var(--line);border-radius:10px;padding:4px 16px;margin:22px 0}
.chk div{padding:9px 0;border-bottom:1px solid var(--line);font-size:14.5px}
.chk div:last-child{border-bottom:0}
.chk b{font-weight:600}
.day{margin-top:26px}
.day .dh{font-family:var(--font-display);font-variant-caps:all-small-caps;font-size:15px;letter-spacing:.14em;color:var(--marine)}
.day p{font-size:15px;margin-top:4px;color:var(--ink)}
.rit{border-left:2px solid var(--gold);padding-left:14px;margin:24px 0;font-size:15px}
.rit .it{font-family:var(--font-hand);font-style:italic}
.copy{background:#fff;border:1px dashed var(--line);border-radius:8px;padding:12px 14px;font-size:14px;margin:10px 0;font-style:italic;font-family:var(--font-hand)}
</style>
  <header>
    <p class="over">il varo · the run-sheet</p>
    <h1>What we do now.</h1>
    <p class="sub">five days, two authors, one table</p>
    <div class="dbl" aria-hidden="true"></div>
  </header>
  <section class="plate">
  <h2 style="font-family:var(--font-display);font-weight:400;font-size:22px;margin-top:0">Still missing</h2>
  <div class="chk">
    <div>${BOTH} <b>Sign in once with Google</b> — journal.varo.au, your varo.au accounts. If Google mutters about an unverified app: Advanced → continue. After this, no more key links, ever.</div>
    <div>${HIS} <b>Tonight:</b> confirm the Pozzallo driver for the 09:15 arrival · book the 06:25 cab to Pinto Wharf · <b>buy BA619 for Thursday</b> — it still says "to be booked" on the plan.</div>
    <div>${HIS} <b>The pub programme needs its name</b> — one mate's name for the friends mode. Tell Claude; it's a one-line fix.</div>
    <div>${HIS} <b>The F bid</b> — ch20 is literally asking. Answer it in the chapter when Qantas answers you.</div>
    <div>${BOTH} <b>The public face</b> — which chapters, if any, go public at crossing.varo.au/journal. No deadline; nothing is public today.</div>
    <div><b>Claude's side, no action needed:</b> the test photo dies, and on Thursday when you land, say <b>"landed"</b> — the weather site freezes itself into the permanent record.</div>
  </div>

  <h2 style="font-family:var(--font-display);font-weight:400;font-size:22px;margin-top:34px">The in bocca al lupo play</h2>
  <div class="rit">
    <p>The gift never travels direct — it goes <b>through Aurora</b>, and her forwarding it is part of the gift. Monday evening, once she's off the train and past the exam, send her the Daví mode with one line:</p>
    <p class="copy">Aurora — com'è andato l'esame? Questa è per i tuoi, se vorrai passargliela stasera. C'è una riga che è tua da leggere ad alta voce. A domani — in bocca al lupo l'abbiamo già speso per te, ora tocca a noi.</p>
    <p>She reads first — there's a ✻ line inside that belongs to her. She forwards to her parents that evening, and it lands the night before the table, which is the whole doctrine.</p>
    <p>${HERS} <span class="it">Claire — the ritual: when anyone wishes you</span> in bocca al lupo <span class="it">(into the wolf's mouth), the only correct reply is</span> <b>crepi il lupo</b> <span class="it">— may the wolf die. Deadpan. You will get the chance on Tuesday.</span></p>
    <p>Tuesday at the table: arrive hungry, argue about nothing, and the answer to every question is <span class="it">faccia lei</span>.</p>
  </div>

  <h2 style="font-family:var(--font-display);font-weight:400;font-size:22px;margin-top:34px">The game, honestly</h2>
  <div class="day"><p><b>One chapter per evening and the journal is told by landing.</b> Open tonight's chapter, answer its two or three questions while they're still warm, hit save — the streak starts, the knot fills, the scoreboard moves. ${HERS} The ⭐ cards are Claire's alone: one star, one rule, sixty seconds. ${BOTH} Photos go straight from the camera roll to the bench as they happen — you're on land now, so untick "originals later". The his-and-hers columns will settle themselves; a lead of any size is not a personality.</p></div>

  <h2 style="font-family:var(--font-display);font-weight:400;font-size:22px;margin-top:34px">Day by day</h2>
  <div class="day"><p class="dh">Tonight · Sunday 30 · Valletta</p><p>${BOTH} Sign in. Open <b>Slow Malta</b> — did anyone jump at St Peter's Pool? The chapter is asking. ${HIS} Driver, cab, BA619.</p></div>
  <div class="day"><p class="dh">Monday 31 · the crossing</p><p>06:25 cab, 07:30 catamaran, Sicily by 09:15. ${BOTH} The drive to Palermo is two-plus hours — <b>The Crossing</b>'s questions were built for the back seat. ${HIS} Evening: the Aurora send, exactly as above.</p></div>
  <div class="day"><p class="dh">Tuesday 1 · the table</p><p>Nothing scheduled but lunch, which is the point. ${BOTH} Afterwards, while it's fresh: <b>Lunch at One</b> wants to know which dish the table went quiet for. Write it the same day or lose it.</p></div>
  <div class="day"><p class="dh">Wednesday 2 · gold in the morning</p><p>Monreale at nine, Ballarò, the pool. ${BOTH} The chapter in the evening; pack nothing until after dinner — the flight is at noon, not dawn.</p></div>
  <div class="day"><p class="dh">Thursday 3 · the long way home</p><p>BA619 at 12:05, the lounge from mid-afternoon, QF2 at 20:50. ${BOTH} Five lounge hours is the best writing window of the whole trip — <b>The Long Way Home</b> plus any chapter still thin. Say <b>"landed"</b> when you're down; the freeze runs itself.</p></div>
  <div class="day"><p class="dh">Saturday 5 · the belt</p><p>${HIS} The kids' mode goes to the six of them before the belt — the pepper-grinder re-enactment is contractual. ${BOTH} Mum's mode and the mates' mode ship when you're ready; each already knows its room.</p></div>
  <div class="day"><p class="dh">After</p><p>${HIS} Z9 selects from the laptop through the same bench. ${BOTH} Decide the public face, or don't — private is a complete answer. The journal stays; the game retires undefeated.</p></div>

  </section>
  <footer>the guide is done when it's no longer needed · <a href="/journal">the spine</a></footer>`);
}
