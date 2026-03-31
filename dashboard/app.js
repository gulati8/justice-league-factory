// Justice League Factory — Dashboard
// Polls a log file or can be driven manually via window.simulate for demos

const LOG_POLL_INTERVAL = 2000;

const logContainer = document.getElementById('log-container');
const statusEl = document.getElementById('status');
const artifactsList = document.getElementById('artifacts-list');

let lastLogLine = 0;
let knownArtifacts = new Set();

// Poll the factory log file for new entries
async function pollLog() {
  try {
    const res = await fetch('/api/log?after=' + lastLogLine);
    if (!res.ok) return;
    const entries = await res.json();

    for (const entry of entries) {
      addLogEntry(entry.agent || 'system', entry.message);
      if (entry.agent) updateAgentStatus(entry.agent, entry.status || 'active');
      if (entry.artifact) addArtifact(entry.artifact, entry.agent);
      lastLogLine = entry.line || lastLogLine + 1;
    }
  } catch {
    // Server not running — fall back to demo/simulate mode
  }
}

function addLogEntry(agent, message) {
  const el = document.createElement('div');
  el.className = `log-entry ${agent}`;
  const time = new Date().toLocaleTimeString();
  el.textContent = `[${time}] [${agent}] ${message}`;
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

  const el = document.createElement('div');
  el.className = 'artifact-item';
  el.innerHTML = `<div class="artifact-name">${name}</div><div class="artifact-agent">by ${agent}</div>`;
  artifactsList.appendChild(el);
}

// Demo mode: manually drive the dashboard with simulated events
// Use from browser console: simulate.activate('batman'), simulate.log('cyborg', 'Implementing task-001...'), etc.
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
    this.log('martian-manhunter', 'Decomposing into 3 tasks across 2 parallel groups...');
    await sleep(1500);
    this.artifact('plan.json', 'martian-manhunter');
    this.artifact('architecture.md', 'martian-manhunter');
    this.complete('martian-manhunter');
    this.log('batman', 'Plan received. Dispatching Cyborg for implementation...');
    await sleep(1000);

    this.activate('cyborg');
    this.log('cyborg', 'Reading plan and architecture. Implementing task-001...');
    await sleep(2500);
    this.log('cyborg', 'Task-001 complete. Implementing task-002...');
    await sleep(2000);
    this.artifact('briefings/cyborg-task-001.json', 'cyborg');
    this.artifact('briefings/cyborg-task-002.json', 'cyborg');
    this.complete('cyborg');
    this.log('batman', 'Implementation complete. Dispatching Wonder Woman for review...');
    await sleep(1000);

    this.activate('wonder-woman');
    this.log('wonder-woman', 'Evaluating code against plan and architecture...');
    await sleep(2000);
    this.log('wonder-woman', 'Found 1 warning, 0 critical issues. Verdict: PASS');
    this.artifact('review.json', 'wonder-woman');
    this.complete('wonder-woman');
    this.log('batman', 'Review passed. Dispatching Flash for testing...');
    await sleep(1000);

    this.activate('flash');
    this.log('flash', 'Writing tests for 4 acceptance criteria...');
    await sleep(2000);
    this.log('flash', 'Running test suite: 8 tests, 8 passed, 0 failed. Verdict: PASS');
    this.artifact('test-results.json', 'flash');
    this.complete('flash');
    this.log('batman', 'Tests passed. Dispatching Green Lantern and Lois Lane...');
    await sleep(1000);

    this.activate('green-lantern');
    this.activate('lois-lane');
    this.log('green-lantern', 'Scanning for OWASP Top 10 and STRIDE vulnerabilities...');
    this.log('lois-lane', 'Reading code and architecture for documentation...');
    await sleep(2500);
    this.log('green-lantern', '1 medium finding (input validation). Verdict: PASS');
    this.artifact('security-review.json', 'green-lantern');
    this.complete('green-lantern');
    await sleep(1000);
    this.log('lois-lane', 'API documentation and README updates written.');
    this.complete('lois-lane');
    await sleep(500);

    this.log('batman', 'All agents complete. Logging eval results...');
    this.artifact('eval-log.jsonl (appended)', 'batman');
    this.complete('batman');
    this.done();
    this.log('system', 'Factory run complete. All agents passed.');
  }
};

// Start polling (no-op if server isn't running)
setInterval(pollLog, LOG_POLL_INTERVAL);
