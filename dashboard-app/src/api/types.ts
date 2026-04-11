export interface FactoryRun {
  run_id: string;
  feature: string | null;
  started_at: string;
  completed_at: string | null;
  overall_verdict: string | null;
  total_duration_ms: number | null;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  gate_config: string | null;
  agent_count?: number;
}

export interface AgentRun {
  id: number;
  run_id: string | null;
  agent: string;
  model: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  verdict: string | null;
  retry_count: number;
  artifacts_produced: string | null;
  phase: string | null;
  cost_usd: number;
}

export interface GateEvent {
  id: number;
  run_id: string | null;
  gate_name: string;
  action: string;
  comment: string | null;
  wait_duration_ms: number | null;
  timestamp: string;
}

export interface RunDetail extends FactoryRun {
  agents: AgentRun[];
  gates: GateEvent[];
}

export interface RunStats {
  total_runs: number;
  passed: number;
  failed: number;
  in_progress: number;
  total_cost_usd: number;
}

export interface Transcript {
  id: number;
  agent_run_id: number;
  prompt_text: string | null;
  response_text: string | null;
  full_transcript: string | null;
  model: string | null;
  total_input_tokens: number;
  total_output_tokens: number;
}

export interface SuccessRatePoint {
  date: string;
  total: number;
  passed: number;
  success_rate: number;
}

export interface CostTrendPoint {
  date: string;
  run_count: number;
  avg_cost_usd: number;
  total_cost_usd: number;
}

export interface AgentFailureRate {
  agent: string;
  total_runs: number;
  failures: number;
  failure_rate: number;
}

export interface LogEvent {
  id: number;
  session_id: string | null;
  event_type: string;
  timestamp: string;
  agent_type: string | null;
  agent_id: string | null;
  data: string;
}
