/**
 * /journal/admin — the intake bench. Deliberately spartan: system fonts, no Google Fonts
 * fetch, one dependency-free island (~10KB) — this page's natural habitat is ship wifi.
 */
export function renderAdminShell(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>journal · intake</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#FBFCFD;color:#14212C;font-family:system-ui,-apple-system,sans-serif;line-height:1.5;}
.page{max-width:560px;margin:0 auto;padding:24px 16px 80px;}
h1{font-size:20px;font-weight:600;}
.hint{color:#526579;font-size:13px;margin-top:4px;}
</style>
</head>
<body>
<main class="page">
  <h1>journal · intake</h1>
  <p class="hint">photos land as variants now, originals later. captions in your voice, not alt-text prose.</p>
  <div id="admin-root"></div>
</main>
<script type="module" src="/assets/journal-admin.js"></script>
</body>
</html>`;
}
