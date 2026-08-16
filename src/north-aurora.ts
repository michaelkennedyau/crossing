/**
 * /north/aurora — una pagina per Aurora, in italiano, da mostrare ai suoi genitori.
 * Static by design: no doc, no weather, no decisions — just the Palermo days,
 * the lunch invitation, and a courteous word to her parents. Same cloth as /north/plan.
 * Register: warm-professional (the Fraser briefing's "Cara Aurora" voice) — tu for
 * Aurora, voi for her parents, one warm factual line about Fraser, never more.
 */

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{--paper:#FBFCFD;--ink:#14212C;--ink-dim:#43586C;--schist:#526579;--live:#0E7C6B;--line:rgba(70,88,106,.18);
--font-display:'Fraunces',Georgia,serif;--font-mono:'IBM Plex Mono',ui-monospace,monospace;
--font-hand:'Instrument Serif',Georgia,serif;--font-body:'Outfit',system-ui,-apple-system,sans-serif;}
body{background:var(--paper);color:var(--ink);font-family:var(--font-body);line-height:1.7;-webkit-font-smoothing:antialiased;}
.page{max-width:560px;margin:0 auto;padding:48px 22px 80px;}
.over{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.24em;text-transform:uppercase;color:var(--live);}
h1{font-family:var(--font-display);font-weight:360;font-size:clamp(30px,8vw,42px);line-height:1.1;margin:14px 0 0;text-wrap:balance;}
.dates{font-family:var(--font-hand);font-style:italic;font-size:17px;color:var(--ink-dim);margin-top:10px;}
p.lead{font-size:16.5px;color:var(--ink-dim);margin-top:22px;text-wrap:pretty;}
.story p{font-size:15.5px;color:var(--ink);margin-top:18px;text-wrap:pretty;}
.story p.ai-genitori{border-left:2px solid var(--live);padding-left:14px;color:var(--ink-dim);}
.facts{margin-top:36px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:16px 0;}
.facts div{display:flex;gap:14px;font-size:13.5px;line-height:2;}
.facts .k{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--schist);flex:0 0 118px;padding-top:4px;}
.facts b{font-weight:600;}
.sign{font-family:var(--font-hand);font-style:italic;font-size:19px;margin-top:40px;}
footer{margin-top:56px;font-family:var(--font-mono);font-size:10px;letter-spacing:.1em;color:var(--schist);line-height:2;}
@media print{body{background:#fff}.page{padding:0;max-width:none}}
`;

export function renderAurora(): string {
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Per Aurora · il varo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..700&family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500&family=Instrument+Serif:ital@0;1&family=Outfit:wght@300..600&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<main class="page">
  <header>
    <p class="over">il varo · per Aurora</p>
    <h1>Ci vediamo a Palermo.</h1>
    <p class="dates">30 agosto – 2 settembre 2026 · tre notti</p>
    <p class="lead">Cara Aurora — questa pagina è per te, e per i tuoi genitori, se vorrai mostrargliela.</p>
  </header>
  <section class="story">
    <p>Siamo Michael e Claire, la famiglia di Fraser. A fine agosto attraversiamo il Mediterraneo — dieci notti di nave, da Nizza fino a Malta — e domenica 30 arriviamo a Palermo: tre notti a Villa Igiea, prima del lungo volo verso casa.</p>
    <p>Lunedì 31 vorremmo invitarti a pranzo. Il tavolo lo scegli tu: è la tua città, e non ci sogneremmo mai di suggerire noi il posto a una palermitana.</p>
    <p class="ai-genitori">E a voi, genitori di Aurora: se vorrete unirvi, sarà un piacere avervi a tavola. Vostra figlia lavora con nostro figlio Fraser — le sue otto settimane in Australia quest'anno hanno contato davvero, e ci fa piacere poterlo dire di persona, a Palermo.</p>
    <p>Oltre il pranzo, nessun programma: i mercati, Monreale, il mare se chiama. Ci muoviamo con calma — le ferie servono a questo.</p>
  </section>
  <div class="facts">
    <div><span class="k">dove dormiamo</span><span><b>Villa Igiea</b> — Salita Belmonte 43</span></div>
    <div><span class="k">il pranzo</span><span><b>lunedì 31 agosto</b> — dove dici tu</span></div>
    <div><span class="k">ripartiamo</span><span><b>mercoledì 2 settembre</b>, di mattina</span></div>
  </div>
  <p class="sign">A presto — Michael e Claire</p>
  <footer>palermo · agosto 2026</footer>
</main>
</body>
</html>`;
}
