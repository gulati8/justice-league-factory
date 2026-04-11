import type {
  FactoryRun,
  RunDetail,
  RunStats,
  AgentRun,
  Transcript,
  SuccessRatePoint,
  CostTrendPoint,
  AgentFailureRate,
  LogEvent,
} from "./types";

const BASE = "";

async function get<T>(url: string): Promise<T> {
  const res = await fetch(`${BASE}${url}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  runs: {
    list: () => get<FactoryRun[]>("/api/runs"),
    get: (runId: string) => get<RunDetail>(`/api/runs/${runId}`),
    stats: () => get<RunStats>("/api/runs/stats"),
  },
  agents: {
    listByRun: (runId: string) => get<AgentRun[]>(`/api/agents?run_id=${runId}`),
    transcript: (agentRunId: number) =>
      get<Transcript>(`/api/agents/${agentRunId}/transcript`),
  },
  events: {
    list: (params: {
      since?: number;
      limit?: number;
      offset?: number;
      from?: string;
      to?: string;
      agent?: string[];
    }) => {
      const q = new URLSearchParams();
      if (params.since) q.set("since", String(params.since));
      if (params.limit) q.set("limit", String(params.limit));
      if (params.offset) q.set("offset", String(params.offset));
      if (params.from) q.set("from", params.from);
      if (params.to) q.set("to", params.to);
      params.agent?.forEach((a) => q.append("agent", a));
      return get<LogEvent[]>(`/api/events?${q}`);
    },
    count: (params?: { from?: string; to?: string; agent?: string[] }) => {
      const q = new URLSearchParams();
      if (params?.from) q.set("from", params.from);
      if (params?.to) q.set("to", params.to);
      params?.agent?.forEach((a) => q.append("agent", a));
      const qs = q.toString();
      return get<{ count: number }>(`/api/events/count${qs ? "?" + qs : ""}`);
    },
  },
  analytics: {
    successRate: (days = 30) =>
      get<SuccessRatePoint[]>(`/api/analytics/success-rate?days=${days}`),
    costTrend: (days = 30) =>
      get<CostTrendPoint[]>(`/api/analytics/cost-trend?days=${days}`),
    agentFailureRates: (days = 30) =>
      get<AgentFailureRate[]>(`/api/analytics/agent-failure-rates?days=${days}`),
  },
};
