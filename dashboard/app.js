// Justice League Factory — Log Viewer Dashboard
// Polls /api/events for all hook events, displays chronologically.
// SubagentStop rows are clickable to view full transcripts.

const POLL_INTERVAL = 2000;
const logEntries = document.getElementById('log-entries');
const statusEl = document.getElementById('status');
const overlay = document.getElementById('transcript-overlay');
const transcriptTitle = document.getElementById('transcript-title');
const transcriptMeta = document.getElementById('transcript-meta');
const transcriptContent = document.getElementById('transcript-content');

let lastEventId = 0;
let agentStates = {};

const AGENT_DISPLAY = {
  'batman': 'Batman',
  'martian-manhunter': 'Martian Manhunter',
  'cyborg': 'Cyborg',
  'wonder-woman': 'Wonder Woman',
  'flash': 'The Flash',
  'green-lantern': 'Green Lantern',
  'lois-lane': 'Lois Lane',
  'oracle': 'Oracle',
  'Explore': 'Explore (scout)'
};

// Format event data into a human-readable detail string
function formatEventDetail(event) {
  let data;
  try { data = JSON.parse(event.data); } catch { return ''; }

  const type = event.event_type;

  if (type === 'SubagentStart') {
    return 'Agent dispatched';
  }
  if (type === 'SubagentStop') {
    const msg = data.last_assistant_message || '';
    const preview = msg.length > 200 ? msg.substring(0, 200) + '...' : msg;
    return preview;
  }
  if (type === 'PreToolUse') {
    const tool = data.tool_name || '?';
    const input = data.tool_input || {};
    if (tool === 'Read' && input.file_path) return 'Read ' + input.file_path;
    if (tool === 'Write' && input.file_path) return 'Write ' + input.file_path;
    if (tool === 'Edit' && input.file_path) return 'Edit ' + input.file_path;
    if (tool === 'Bash' && input.command) return 'Bash: ' + input.command.substring(0, 100);
    if (tool === 'Glob' && input.pattern) return 'Glob: ' + input.pattern;
    if (tool === 'Grep' && input.pattern) return 'Grep: ' + input.pattern;
    if (tool === 'Agent') return 'Dispatch: ' + (input.agent_type || input.name || '?');
    return tool;
  }
  if (type === 'PostToolUse') {
    const tool = data.tool_name || '?';
    return tool + ' completed';
  }
  if (type === 'Stop') {
    return 'Session ended';
  }
  return type;
}

// Render a single event as a log row
function renderEvent(event) {
  const row = document.createElement('div');
  row.className = 'log-row';

  const ts = event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '--:--:--';
  const type = event.event_type || 'unknown';
  const agent = event.agent_type || '--';
  const displayAgent = AGENT_DISPLAY[agent] || agent;
  const detail = formatEventDetail(event);

  let extraHtml = '';

  // For SubagentStop, add transcript link
  if (type === 'SubagentStop') {
    row.classList.add('clickable');
    row.dataset.agentType = agent;
    extraHtml = '<span class="transcript-link">[view transcript]</span>';
  }

  row.innerHTML =
    '<span class="log-ts">' + ts + '</span>' +
    '<span class="log-type ' + type + '">' + type + '</span>' +
    '<span class="log-agent ' + agent + '">' + displayAgent + '</span>' +
    '<span class="log-detail">' + escapeHtml(detail) + extraHtml + '</span>';

  // Click handler for transcript
  if (type === 'SubagentStop') {
    row.addEventListener('click', function() { openTranscript(event); });
  }

  return row;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Update agent chip status
function updateAgentChip(agent, state) {
  const chip = document.querySelector('[data-agent="' + agent + '"]');
  if (!chip) return;
  chip.classList.remove('active', 'done', 'error');
  if (state === 'active') chip.classList.add('active');
  else if (state === 'done') chip.classList.add('done');
  else if (state === 'error') chip.classList.add('error');

  const statusSpan = chip.querySelector('.chip-status');
  if (statusSpan) statusSpan.textContent = state;
  agentStates[agent] = state;
}

// Process events and update agent states
function processEvent(event) {
  const type = event.event_type;
  const agent = event.agent_type;
  if (!agent) return;

  if (type === 'SubagentStart') {
    updateAgentChip(agent, 'active');
  } else if (type === 'SubagentStop') {
    let verdict = null;
    try {
      const data = JSON.parse(event.data);
      verdict = data.verdict;
    } catch {}
    updateAgentChip(agent, verdict === 'fail' ? 'error' : 'done');
  }
}

// Open transcript overlay
async function openTranscript(event) {
  const agent = event.agent_type || 'unknown';
  const displayAgent = AGENT_DISPLAY[agent] || agent;
  transcriptTitle.textContent = displayAgent + ' — Transcript';

  try {
    const res = await fetch('/api/agents');
    if (!res.ok) return;
    const runs = await res.json();

    let data;
    try { data = JSON.parse(event.data); } catch { return; }

    // Match by session_id and agent
    const match = runs.find(function(r) {
      return r.run_id === data.session_id && r.agent === agent;
    });

    if (!match) {
      transcriptMeta.textContent = 'No transcript found';
      transcriptContent.textContent = data.last_assistant_message || 'No content';
      overlay.classList.remove('hidden');
      return;
    }

    // Fetch full transcript
    const tRes = await fetch('/api/transcript/' + match.id);
    if (!tRes.ok) {
      transcriptContent.textContent = data.last_assistant_message || 'Transcript not available';
      overlay.classList.remove('hidden');
      return;
    }

    const transcript = await tRes.json();
    const tokens = 'In: ' + (match.input_tokens || 0).toLocaleString() + ' | Out: ' + (match.output_tokens || 0).toLocaleString();
    const model = transcript.model || match.model || 'unknown';
    transcriptMeta.innerHTML = '<span>Model: ' + model + '</span><span>' + tokens + '</span>';

    // Render transcript — parse JSONL into readable format
    if (transcript.full_transcript) {
      transcriptContent.textContent = formatTranscript(transcript.full_transcript);
    } else {
      transcriptContent.textContent =
        '--- PROMPT ---\n' + (transcript.prompt_text || '(not captured)') +
        '\n\n--- RESPONSE ---\n' + (transcript.response_text || '(not captured)');
    }
  } catch (err) {
    transcriptContent.textContent = 'Error loading transcript: ' + err.message;
  }

  overlay.classList.remove('hidden');
}

// Format JSONL transcript into readable text
function formatTranscript(jsonl) {
  const lines = jsonl.trim().split('\n');
  let output = '';
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      const role = entry.role || entry.type || '?';
      let content = '';

      if (entry.content) {
        if (typeof entry.content === 'string') {
          content = entry.content;
        } else if (Array.isArray(entry.content)) {
          content = entry.content
            .map(function(c) { return c.text || c.tool_use_id || JSON.stringify(c); })
            .join('\n');
        }
      } else if (entry.message) {
        content = JSON.stringify(entry.message, null, 2);
      }

      if (content) {
        output += '--- ' + role.toUpperCase() + ' ---\n' + content + '\n\n';
      }
    } catch (e) {
      output += line + '\n';
    }
  }
  return output || jsonl;
}

// Close transcript overlay
document.getElementById('transcript-close').addEventListener('click', function() {
  overlay.classList.add('hidden');
});
document.getElementById('transcript-overlay').addEventListener('click', function(e) {
  if (e.target === overlay) overlay.classList.add('hidden');
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') overlay.classList.add('hidden');
});

// Poll for new events
async function poll() {
  try {
    const res = await fetch('/api/events?since=' + lastEventId);
    if (!res.ok) return;

    const events = await res.json();
    if (events.length === 0) return;

    // Update status to running if we're getting events
    if (statusEl.textContent === 'IDLE') {
      statusEl.className = 'status running';
      statusEl.textContent = 'RUNNING';
    }

    const viewer = document.getElementById('log-viewer');
    const isScrolledToBottom = viewer.scrollHeight - viewer.scrollTop - viewer.clientHeight < 50;

    for (const event of events) {
      processEvent(event);
      logEntries.appendChild(renderEvent(event));
      if (event.id > lastEventId) lastEventId = event.id;

      // If we see a Stop event, mark as complete
      if (event.event_type === 'Stop') {
        const hasErrors = Object.values(agentStates).some(function(s) { return s === 'error'; });
        statusEl.className = hasErrors ? 'status failed' : 'status complete';
        statusEl.textContent = hasErrors ? 'FAILED' : 'COMPLETE';
      }
    }

    // Auto-scroll if user was already at bottom
    if (isScrolledToBottom) {
      viewer.scrollTop = viewer.scrollHeight;
    }
  } catch (e) {
    // API not available yet
  }
}

// Load existing events on startup
async function loadHistory() {
  try {
    const res = await fetch('/api/events?since=0&limit=1000');
    if (!res.ok) return;

    const events = await res.json();
    if (events.length === 0) return;

    statusEl.className = 'status complete';
    statusEl.textContent = 'HISTORY';

    for (const event of events) {
      processEvent(event);
      logEntries.appendChild(renderEvent(event));
      if (event.id > lastEventId) lastEventId = event.id;
    }

    document.getElementById('log-viewer').scrollTop =
      document.getElementById('log-viewer').scrollHeight;
  } catch (e) {
    // No data yet
  }
}

// Demo mode: scripted simulation (no API needed)
window.simulate = {
  _addRow: function(type, agent, detail) {
    const row = document.createElement('div');
    row.className = 'log-row';
    const ts = new Date().toLocaleTimeString();
    const displayAgent = AGENT_DISPLAY[agent] || agent || '--';
    row.innerHTML =
      '<span class="log-ts">' + ts + '</span>' +
      '<span class="log-type ' + type + '">' + type + '</span>' +
      '<span class="log-agent ' + (agent || '') + '">' + displayAgent + '</span>' +
      '<span class="log-detail">' + escapeHtml(detail) + '</span>';
    logEntries.appendChild(row);
    document.getElementById('log-viewer').scrollTop =
      document.getElementById('log-viewer').scrollHeight;
  },

  start: function(agent) { updateAgentChip(agent, 'active'); this._addRow('SubagentStart', agent, 'Agent dispatched'); },
  stop: function(agent, detail) { updateAgentChip(agent, 'done'); this._addRow('SubagentStop', agent, detail || 'Complete'); },
  fail: function(agent, detail) { updateAgentChip(agent, 'error'); this._addRow('SubagentStop', agent, detail || 'Failed'); },
  tool: function(agent, detail) { this._addRow('PostToolUse', agent, detail); },
  running: function() { statusEl.className = 'status running'; statusEl.textContent = 'RUNNING'; },
  done: function() { statusEl.className = 'status complete'; statusEl.textContent = 'COMPLETE'; },

  demo: async function() {
    const sleep = function(ms) { return new Promise(function(r) { setTimeout(r, ms); }); };

    this.running();
    this.start('batman');
    this._addRow('PostToolUse', 'batman', 'Read feature-request.md');
    await sleep(1500);

    this.start('martian-manhunter');
    this.tool('martian-manhunter', 'Read: scanning 12 source files...');
    await sleep(2000);
    this.tool('martian-manhunter', 'Write artifacts/plan.json');
    this.tool('martian-manhunter', 'Write artifacts/architecture.md');
    this.stop('martian-manhunter', 'Plan complete — 5 tasks across 2 parallel groups');
    await sleep(1000);

    this.start('cyborg');
    this.tool('cyborg', 'Read artifacts/plan.json');
    this.tool('cyborg', 'Edit src/components/PetAvatar.tsx');
    await sleep(2500);
    this.tool('cyborg', 'Bash: npm run build — success');
    this.tool('cyborg', 'Write artifacts/briefings/cyborg-task-001.json');
    this.stop('cyborg', 'All tasks implemented. 5 files created, 3 modified.');
    await sleep(1000);

    this.start('wonder-woman');
    this.start('flash');
    this.start('green-lantern');
    this.start('lois-lane');
    await sleep(1000);
    this.tool('wonder-woman', 'Grep: scanning for code quality issues...');
    this.tool('flash', 'Write tests/PetAvatar.test.tsx');
    this.tool('green-lantern', 'Grep: scanning for OWASP patterns...');
    this.tool('lois-lane', 'Read artifacts/architecture.md');
    await sleep(2000);
    this.stop('wonder-woman', '3 issues found (0 critical). Verdict: PASS');
    await sleep(500);
    this.stop('flash', '44 tests, 44 passed. Verdict: PASS');
    await sleep(500);
    this.stop('green-lantern', 'No critical findings. Verdict: PASS');
    await sleep(300);
    this.stop('lois-lane', 'Documentation written for new component');
    await sleep(500);

    this.stop('batman', 'All agents complete. Mission successful.');
    this.done();
  }
};

// Initialize
loadHistory();
setInterval(poll, POLL_INTERVAL);
