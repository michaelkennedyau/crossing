// Crossing Steward — one-shot provisioning for the Anthropic Managed Agent that keeps
// crossing.varo.au current: a claude-fable-5 (max effort) agent on a 6-hourly scheduled
// deployment, repo mounted from GitHub, deploying straight to Cloudflare via a vaulted
// CLOUDFLARE_API_TOKEN that never enters the sandbox (substituted at egress).
//
//   node scripts/steward-setup.mjs           provision everything (idempotent — reuses ids.json)
//   node scripts/steward-setup.mjs run       trigger a manual run right now (works while paused)
//   node scripts/steward-setup.mjs status    latest deployment runs + session ids
//   node scripts/steward-setup.mjs pause     stop the schedule (reversible)
//   node scripts/steward-setup.mjs unpause   resume the schedule
//
// Secrets are read the clipboard way (the same pattern as `wrangler secret put`):
//   ANTHROPIC_API_KEY  — env var, or copied to clipboard when prompted
//   CLOUDFLARE_API_TOKEN — copied to clipboard when prompted (Workers Scripts:Edit,
//                          Account Settings:Read — dash.cloudflare.com/profile/api-tokens)
//   GitHub repo token  — taken from `gh auth token` automatically
// Nothing secret is written to disk; only resource IDs land in scripts/steward/ids.json.
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IDS_PATH = path.join(HERE, 'steward', 'ids.json');
const API = 'https://api.anthropic.com/v1';
const BETA = 'managed-agents-2026-04-01';
const REPO_URL = 'https://github.com/michaelkennedyau/crossing';
const CF_ACCOUNT_ID = 'cc2488003b31bb89e9eb2f6c3d5d8ce5';
const CRON = '0 */6 * * *'; // every 6 hours; tighten to '0 */3 * * *' if you want it hotter
const TZ = 'Australia/Brisbane';

const SYSTEM = `You are the Crossing Steward. You maintain crossing.varo.au — a private family site for Michael and Claire Kennedy's flexible fortnight in Europe: land LHR Fri 14 Aug 2026 on QF1, depart LHR Wed 2 Sep on QF2, 19 open nights decided on the fly by weather. The repo is a Cloudflare Worker (Hono SSR + Vite islands) mounted at /workspace/crossing.

Each session is one maintenance pass:

1. Ground yourself in live reality first. Fetch https://crossing.varo.au/api/north/weather, /api/north/outlook and /api/north/pins. Note today's date against the 14 Aug – 2 Sep window (before, during, after) — the site's tense must match.

2. Re-write the editorial layer only where live conditions genuinely contradict the current copy: the /north page copy in src/north-shell.ts, and the per-destination "why" lines in web/src/north/board/knowledge.ts. Heat domes, storms, the aurora window opening, ferries cancelled by meltemi, crowd inflections, nights remaining — these justify a rewrite. Taste does not. Keep the voice: direct, dry, budget-minded-but-Platinum, no exclamation marks, no filler, plain geographic names. Small diffs beat big ones. NEVER touch the Chile/andes pages, flight facts, booking references, prices, the planner spine maths, or anything under sql/.

3. Quality gates before any deploy: npm ci, npm test, npm run build must all pass. If a gate fails on your own change, fix it or revert it — never deploy red, never leave the working tree dirty.

4. Deploy with: CLOUDFLARE_ACCOUNT_ID=${CF_ACCOUNT_ID} npx wrangler deploy
   (CLOUDFLARE_API_TOKEN is already in your environment.) Then verify https://crossing.varo.au/north returns HTTP 200 and contains your changed copy.

5. Commit and push to main. Message starts "steward:" and says what changed and the live condition that justified it.

A no-op pass is a success: if nothing contradicts the live data, change nothing, deploy nothing, and end the session saying exactly that. Design constitution: semantic CSS tokens only, no Inter/Roboto/Arial/Poppins, preserve the day/night theme and reduced-motion support.`;

const KICKOFF = 'Run your maintenance pass now.';

async function clipboardSecret(label, hint) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await rl.question(`Copy your ${label} to the clipboard${hint ? ` (${hint})` : ''}, then press Enter... `);
  rl.close();
  const v = execFileSync('pbpaste', [], { encoding: 'utf8' }).trim();
  if (!v) throw new Error(`clipboard was empty — ${label} not captured`);
  return v;
}

async function api(key, method, route, body) {
  const res = await fetch(`${API}${route}`, {
    method,
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-beta': BETA, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${route} → ${res.status}: ${JSON.stringify(json.error ?? json).slice(0, 300)}`);
  return json;
}

async function loadIds() {
  try { return JSON.parse(await readFile(IDS_PATH, 'utf8')); } catch { return {}; }
}
async function saveIds(ids) {
  await mkdir(path.dirname(IDS_PATH), { recursive: true });
  await writeFile(IDS_PATH, JSON.stringify(ids, null, 2) + '\n');
}

async function getKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const k = await clipboardSecret('Anthropic API key', 'console → API keys');
  if (!k.startsWith('sk-ant')) throw new Error('clipboard does not look like an Anthropic key');
  return k;
}

async function provision() {
  const key = await getKey();
  const ids = await loadIds();

  if (!ids.environment_id) {
    try {
      const env = await api(key, 'POST', '/environments', {
        name: 'crossing-steward-env',
        config: { type: 'cloud', networking: { type: 'unrestricted' } },
      });
      ids.environment_id = env.id;
    } catch (e) {
      if (!String(e).includes('409')) throw e;
      const list = await api(key, 'GET', '/environments');
      ids.environment_id = list.data.find((x) => x.name === 'crossing-steward-env')?.id;
    }
    await saveIds(ids);
    console.log('environment:', ids.environment_id);
  }

  if (!ids.vault_id) {
    const vault = await api(key, 'POST', '/vaults', { name: 'crossing-steward-vault' });
    ids.vault_id = vault.id;
    await saveIds(ids);
    console.log('vault:', ids.vault_id);
  }

  if (!ids.cf_credential_id) {
    const cfToken = await clipboardSecret('Cloudflare API token', 'Workers Scripts:Edit + Account Settings:Read');
    const cred = await api(key, 'POST', `/vaults/${ids.vault_id}/credentials`, {
      display_name: 'Cloudflare deploy token for crossing',
      auth: {
        type: 'environment_variable',
        secret_name: 'CLOUDFLARE_API_TOKEN',
        secret_value: cfToken,
        networking: { type: 'limited', allowed_hosts: ['api.cloudflare.com', '*.cloudflare.com'] },
      },
    });
    ids.cf_credential_id = cred.id;
    await saveIds(ids);
    console.log('cloudflare credential:', ids.cf_credential_id);
  }

  if (!ids.agent_id) {
    const agent = await api(key, 'POST', '/agents', {
      name: 'Crossing Steward',
      description: 'Keeps crossing.varo.au editorially honest against live weather; tests, deploys, pushes.',
      model: { id: 'claude-fable-5', effort: 'max' },
      system: SYSTEM,
      tools: [{ type: 'agent_toolset_20260401' }],
    });
    ids.agent_id = agent.id;
    ids.agent_version = agent.version;
    await saveIds(ids);
    console.log('agent:', ids.agent_id, 'v' + ids.agent_version);
  }

  if (!ids.deployment_id) {
    const ghToken = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
    const dep = await api(key, 'POST', '/deployments', {
      name: 'crossing steward — 6-hourly pass',
      agent: ids.agent_id,
      environment_id: ids.environment_id,
      vault_ids: [ids.vault_id],
      resources: [{
        type: 'github_repository',
        url: REPO_URL,
        authorization_token: ghToken,
        mount_path: '/workspace/crossing',
        checkout: { type: 'branch', name: 'main' },
      }],
      initial_events: [{ type: 'user.message', content: [{ type: 'text', text: KICKOFF }] }],
      schedule: { type: 'cron', expression: CRON, timezone: TZ },
    });
    ids.deployment_id = dep.id;
    await saveIds(ids);
    console.log('deployment:', ids.deployment_id);
    console.log('next runs:', (dep.schedule?.upcoming_runs_at ?? []).slice(0, 3).join(', '));
  }

  console.log('\nSteward provisioned. Manual test run: node scripts/steward-setup.mjs run');
}

async function manualRun() {
  const key = await getKey();
  const ids = await loadIds();
  if (!ids.deployment_id) throw new Error('no deployment — provision first');
  const run = await api(key, 'POST', `/deployments/${ids.deployment_id}/run`);
  console.log('manual run fired:', run.id ?? JSON.stringify(run).slice(0, 200));
}

async function status() {
  const key = await getKey();
  const ids = await loadIds();
  if (!ids.deployment_id) throw new Error('no deployment — provision first');
  const runs = await api(key, 'GET', `/deployment_runs?deployment_id=${ids.deployment_id}&limit=10`);
  for (const r of runs.data ?? []) {
    console.log(r.created_at, r.session_id ?? `ERROR ${r.error?.type}: ${r.error?.message}`);
  }
  if (!(runs.data ?? []).length) console.log('no runs yet');
}

async function lifecycle(action) {
  const key = await getKey();
  const ids = await loadIds();
  await api(key, 'POST', `/deployments/${ids.deployment_id}/${action}`);
  console.log(action + 'd');
}

const cmd = process.argv[2];
try {
  if (!cmd) await provision();
  else if (cmd === 'run') await manualRun();
  else if (cmd === 'status') await status();
  else if (cmd === 'pause' || cmd === 'unpause') await lifecycle(cmd);
  else { console.error('usage: steward-setup.mjs [run|status|pause|unpause]'); process.exit(1); }
} catch (e) {
  console.error(String(e.message ?? e));
  process.exit(1);
}
