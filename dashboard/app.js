// Justice League Factory — Dashboard
// Polls SQLite telemetry via API, or falls back to simulated demo mode

const POLL_INTERVAL = 2000;

const logContainer = document.getElementById('log-container');
const statusEl = document.getElementById('status');
const artifactsList = document.getElementById('artifacts-list');

let lastSeenId = 0;
let knownArtifacts = new Set();
let apiAvailable = false;

// Agent name mapping (DB names → display names)
const AGENT_DISPLAY = {
  'batman': 'Batman',
  'martian-manhunter': 'Martian Manhunter',
  'cyborg': 'Cyborg',
  'wonder-woman': 'Wonder Woman',
  'flash': 'The Flash',
  'green-lantern': 'Green Lantern',
  'lois-lane': 'Lois Lane',
  'oracle': 'Oracle'
};

// Artifact mapping per agent
const AGENT_ARTIFACTS = {
  'martian-manhunter': ['plan.json', 'architecture.md'],
  'wonder-woman': ['review.json'],
  'flash': ['test-results.json'],
  'green-lantern': ['security-review.json'],
  'oracle': ['improvements.json']
};

// Poll the SQLite-backed API for agent run data
async function pollAPI() {
  try {
    const res = await fetch('/api/latest');
    if (!res.ok) return;
    apiAvailable = true;

    const runs = await res.json();
    if (runs.length === 0) return;

    // Process new entries
    for (const run of runs) {
      if (run.id <= lastSeenId) continue;
      lastSeenId = run.id;

      const agent = run.agent || 'unknown';
      const duration = run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : '';
      const tokens = run.output_tokens ? `${run.output_tokens.toLocaleString()} tokens` : '';

      // Determine status from verdict or presence
      let status = 'done';
      if (run.verdict === 'fail') status = 'error';

      updateAgentStatus(agent, status);

      // Build log message
      let msg = `Complete`;
      if (run.verdict) msg += ` — verdict: ${run.verdict.toUpperCase()}`;
      if (duration) msg += ` (${duration})`;
      if (tokens) msg += ` [${tokens}]`;
      addLogEntry(agent, msg);

      // Add known artifacts for this agent
      if (AGENT_ARTIFACTS[agent]) {
        for (const artifact of AGENT_ARTIFACTS[agent]) {
          addArtifact(artifact, agent);
        }
      }
      // Cyborg briefings
      if (agent === 'cyborg' && run.artifacts_produced) {
        try {
          const artifacts = JSON.parse(run.artifacts_produced);
          for (const a of artifacts) addArtifact(a, 'cyborg');
        } catch {}
      }
    }

    // Update global status
    const doneCards = document.querySelectorAll('.agent-card.done, .agent-card.error');
    if (doneCards.length > 0) {
      const hasErrors = document.querySelectorAll('.agent-card.error').length > 0;
      if (doneCards.length >= 7) { // All non-Oracle agents done
        statusEl.className = hasErrors ? 'status failed' : 'status complete';
        statusEl.textContent = hasErrors ? 'FAILED' : 'COMPLETE';
      } else {
        statusEl.className = 'status running';
        statusEl.textContent = 'RUNNING';
      }
    }
  } catch {
    // API not available — simulate mode still works
  }
}

function addLogEntry(agent, message) {
  const el = document.createElement('div');
  el.className = `log-entry ${agent}`;
  const time = new Date().toLocaleTimeString();
  const displayName = AGENT_DISPLAY[agent] || agent;
  el.textContent = `[${time}] [${displayName}] ${message}`;
  logContainer.appendChild(el);
  logContainer.scrollTop = logContainer.scrollHeight;
}

function updateAgentStatus(agentName, status) {
  const card = document.querySelector(`[data-agent="${agentName}"]`);
  if (!card) return;

  card.classList.remove('active', 'done', 'error');
  if (status === 'active' || status === 'running') card.classList.add('active');
  else if (status === 'done' || status === 'success') card.classList.add('done');
  else if (status === 'error' || status === 'failed') card.classList.add('error');

  const statusText = card.querySelector('.agent-status');
  if (statusText) statusText.textContent = status;

  // Update global status
  const activeCards = document.querySelectorAll('.agent-card.active');
  if (activeCards.length > 0) {
    statusEl.className = 'status running';
    statusEl.textContent = 'RUNNING';
  }
}

function addArtifact(name, agent) {
  if (knownArtifacts.has(name)) return;
  knownArtifacts.add(name);

  const empty = artifactsList.querySelector('.artifact-empty');
  if (empty) empty.remove();

  const displayName = AGENT_DISPLAY[agent] || agent;
  const el = document.createElement('div');
  el.className = 'artifact-item';
  el.innerHTML = `<div class="artifact-name">${name}</div><div class="artifact-agent">by ${displayName}</div>`;
  artifactsList.appendChild(el);
}

// Load historical data on startup
async function loadHistory() {
  try {
    const res = await fetch('/api/agents');
    if (!res.ok) return;
    apiAvailable = true;

    const runs = await res.json();
    if (runs.length === 0) return;

    statusEl.className = 'status complete';
    statusEl.textContent = 'COMPLETE';

    for (const run of runs) {
      const agent = run.agent || 'unknown';
      let status = 'done';
      if (run.verdict === 'fail') status = 'error';
      updateAgentStatus(agent, status);

      const duration = run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : '';
      const tokens = run.output_tokens ? `${run.output_tokens.toLocaleString()} tokens` : '';
      let msg = `Complete`;
      if (run.verdict) msg += ` — verdict: ${run.verdict.toUpperCase()}`;
      if (duration) msg += ` (${duration})`;
      if (tokens) msg += ` [${tokens}]`;
      addLogEntry(agent, msg);

      if (AGENT_ARTIFACTS[agent]) {
        for (const artifact of AGENT_ARTIFACTS[agent]) {
          addArtifact(artifact, agent);
        }
      }

      if (run.id > lastSeenId) lastSeenId = run.id;
    }
  } catch {
    // No API — waiting for simulate or live run
  }
}

// Demo mode: manually drive the dashboard with simulated events
window.simulate = {
  activate(agent) { updateAgentStatus(agent, 'active'); addLogEntry(agent, 'Starting...'); },
  complete(agent) { updateAgentStatus(agent, 'done'); addLogEntry(agent, 'Complete.'); },
  fail(agent, msg) { updateAgentStatus(agent, 'error'); addLogEntry(agent, `Failed: ${msg}`); },
  log(agent, msg) { addLogEntry(agent, msg); },
  artifact(name, agent) { addArtifact(name, agent); },
  running() { statusEl.className = 'status running'; statusEl.textContent = 'RUNNING'; },
  done() { statusEl.className = 'status complete'; statusEl.textContent = 'COMPLETE'; },

  // Run a pre-scripted demo sequence
  async demo() {
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    this.running();
    this.activate('batman');
    this.log('batman', 'Mission received. Dispatching Martian Manhunter for planning...');
    await sleep(1500);

    this.activate('martian-manhunter');
    this.log('martian-manhunter', 'Reading feature request and exploring codebase...');
    await sleep(2000);
    this.log('martian-manhunter', 'Decomposing into 5 tasks across 2 parallel groups...');
    await sleep(1500);
    this.artifact('plan.json', 'martian-manhunter');
    this.artifact('architecture.md', 'martian-manhunter');
    this.complete('martian-manhunter');
    this.log('batman', 'Plan received. Dispatching Cyborg x3 for parallel group 1...');
    await sleep(1000);

    this.activate('cyborg');
    this.log('cyborg', 'Parallel group 1: task-001, task-003, task-005 dispatched simultaneously...');
    await sleep(2500);
    this.log('cyborg', 'Group 1 complete. Dispatching group 2: task-002, task-004...');
    await sleep(2000);
    this.artifact('briefings/cyborg-task-001.json', 'cyborg');
    this.artifact('briefings/cyborg-task-003.json', 'cyborg');
    this.artifact('briefings/cyborg-task-005.json', 'cyborg');
    this.artifact('briefings/cyborg-task-002.json', 'cyborg');
    this.artifact('briefings/cyborg-task-004.json', 'cyborg');
    this.complete('cyborg');
    this.log('batman', 'Implementation complete. Dispatching quality gates in parallel...');
    await sleep(1000);

    this.activate('wonder-woman');
    this.activate('flash');
    this.activate('green-lantern');
    this.activate('lois-lane');
    this.log('wonder-woman', 'The Lasso of Truth compels me to examine this code...');
    this.log('flash', 'Scanning 18 acceptance criteria... writing tests...');
    this.log('green-lantern', 'Constructing perimeter scan around 6 modified files...');
    this.log('lois-lane', 'Reading code and architecture for documentation...');
    await sleep(2500);
    this.log('wonder-woman', '3 issues found (0 critical). Verdict: PASS');
    this.artifact('review.json', 'wonder-woman');
    this.complete('wonder-woman');
    await sleep(500);
    this.log('flash', '44 tests, 44 passed, 0 failed. Zero coverage gaps. Verdict: PASS');
    this.artifact('test-results.json', 'flash');
    this.complete('flash');
    await sleep(800);
    this.log('green-lantern', 'No critical or high findings. Threat model clear. Verdict: PASS');
    this.artifact('security-review.json', 'green-lantern');
    this.complete('green-lantern');
    await sleep(500);
    this.log('lois-lane', 'Feature documentation written. API endpoint documented.');
    this.complete('lois-lane');
    await sleep(500);

    this.log('batman', 'All agents complete. Mission successful.');
    this.complete('batman');
    this.done();
    this.log('system', 'Factory run complete. All agents passed.');
  }
};

// Initialize
loadHistory();
setInterval(pollAPI, POLL_INTERVAL);
