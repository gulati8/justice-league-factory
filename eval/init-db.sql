-- Justice League Factory — Telemetry Schema
-- Stores all hook events, structured agent run data, and full transcripts.

-- Raw hook events (every event type lands here)
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  event_type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  agent_type TEXT,
  agent_id TEXT,
  data TEXT  -- full JSON payload from the hook
);

-- Structured agent run data (populated from SubagentStop events)
CREATE TABLE IF NOT EXISTS agent_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT,
  agent TEXT NOT NULL,
  model TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cache_read_tokens INTEGER DEFAULT 0,
  cache_creation_tokens INTEGER DEFAULT 0,
  verdict TEXT,
  retry_count INTEGER DEFAULT 0,
  artifacts_produced TEXT,
  phase TEXT,
  gate_status TEXT,
  artifacts_consumed TEXT,
  cost_usd REAL DEFAULT 0.0,
  FOREIGN KEY (run_id) REFERENCES factory_runs(run_id)
);

-- Full transcripts stored as content, not file path references.
-- Oracle queries these directly. Dashboard displays them.
CREATE TABLE IF NOT EXISTS agent_transcripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_run_id INTEGER,
  prompt_text TEXT,
  response_text TEXT,
  full_transcript TEXT,
  model TEXT,
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  total_cache_read_tokens INTEGER DEFAULT 0,
  total_cache_creation_tokens INTEGER DEFAULT 0,
  FOREIGN KEY (agent_run_id) REFERENCES agent_runs(id)
);

-- Factory runs for cross-run analysis by Oracle
CREATE TABLE IF NOT EXISTS factory_runs (
  run_id TEXT PRIMARY KEY,
  feature TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  overall_verdict TEXT,
  total_duration_ms INTEGER,
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  total_cost_usd REAL DEFAULT 0.0,
  gate_config TEXT
);

-- Gate events for autonomy tracking
CREATE TABLE IF NOT EXISTS gate_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT,
  gate_name TEXT NOT NULL,
  action TEXT NOT NULL,
  comment TEXT,
  wait_duration_ms INTEGER,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES factory_runs(run_id)
);

-- Indexes for Oracle's queries and dashboard polling
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON agent_runs(agent);
CREATE INDEX IF NOT EXISTS idx_agent_runs_verdict ON agent_runs(verdict);
CREATE INDEX IF NOT EXISTS idx_agent_runs_run_id ON agent_runs(run_id);

-- Migrations for existing databases (idempotent — errors ignored by sqlite3 CLI)
ALTER TABLE agent_runs ADD COLUMN phase TEXT;
ALTER TABLE agent_runs ADD COLUMN gate_status TEXT;
ALTER TABLE agent_runs ADD COLUMN artifacts_consumed TEXT;
ALTER TABLE agent_runs ADD COLUMN cost_usd REAL DEFAULT 0.0;
ALTER TABLE factory_runs ADD COLUMN total_cost_usd REAL DEFAULT 0.0;
ALTER TABLE factory_runs ADD COLUMN gate_config TEXT;

-- New indexes
CREATE INDEX IF NOT EXISTS idx_agent_runs_phase ON agent_runs(phase);
CREATE INDEX IF NOT EXISTS idx_gate_events_run_id ON gate_events(run_id);
CREATE INDEX IF NOT EXISTS idx_gate_events_gate ON gate_events(gate_name);
