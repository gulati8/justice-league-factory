CREATE TABLE IF NOT EXISTS factory_runs (
  run_id TEXT PRIMARY KEY,
  feature TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  overall_verdict TEXT,
  total_duration_ms INTEGER,
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0
);

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
  verdict TEXT,
  retry_count INTEGER DEFAULT 0,
  artifacts_produced TEXT,
  FOREIGN KEY (run_id) REFERENCES factory_runs(run_id)
);

CREATE TABLE IF NOT EXISTS agent_transcripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_run_id INTEGER,
  prompt_text TEXT,
  response_text TEXT,
  FOREIGN KEY (agent_run_id) REFERENCES agent_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON agent_runs(agent);
CREATE INDEX IF NOT EXISTS idx_agent_runs_verdict ON agent_runs(verdict);
CREATE INDEX IF NOT EXISTS idx_agent_runs_run_id ON agent_runs(run_id);
