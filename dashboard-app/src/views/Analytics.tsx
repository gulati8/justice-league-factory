import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { SuccessRatePoint, CostTrendPoint, AgentFailureRate } from "../api/types";
import { Chart } from "../components/Chart";

export function Analytics() {
  const [successRate, setSuccessRate] = useState<SuccessRatePoint[]>([]);
  const [costTrend, setCostTrend] = useState<CostTrendPoint[]>([]);
  const [failureRates, setFailureRates] = useState<AgentFailureRate[]>([]);

  useEffect(() => {
    api.analytics.successRate().then(setSuccessRate).catch(console.error);
    api.analytics.costTrend().then(setCostTrend).catch(console.error);
    api.analytics.agentFailureRates().then(setFailureRates).catch(console.error);
  }, []);

  return (
    <div style={{ padding: "24px" }}>
      <h2 style={{ fontSize: "1.125rem", color: "var(--text-accent)", marginBottom: "16px", letterSpacing: "1px" }}>
        ANALYTICS
      </h2>
      <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
        <div style={{ flex: 1 }}>
          <Chart data={successRate} dataKey="success_rate" xKey="date" color="var(--status-pass)" title="First-Pass Success Rate (%)" yLabel="%" />
        </div>
        <div style={{ flex: 1 }}>
          <Chart data={costTrend} dataKey="avg_cost_usd" xKey="date" color="var(--status-info)" title="Average Cost per Feature ($)" yLabel="$" />
        </div>
      </div>
      <div style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid #334155", borderRadius: "var(--radius-md)", padding: "16px" }}>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px" }}>Agent Failure Rate</div>
        {failureRates.map((item) => (
          <div key={item.agent} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-secondary)", width: 120 }}>{item.agent}</span>
            <div style={{ flex: 1, background: "var(--bg-primary)", borderRadius: "var(--radius-sm)", height: 8 }}>
              <div style={{
                width: `${Math.min(item.failure_rate, 100)}%`,
                background: item.failure_rate > 15 ? "var(--status-fail)" : item.failure_rate > 5 ? "var(--status-warning)" : "var(--status-pass)",
                height: "100%", borderRadius: "var(--radius-sm)",
              }} />
            </div>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", width: 40 }}>{item.failure_rate}%</span>
          </div>
        ))}
        {failureRates.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>No data yet</div>}
      </div>
    </div>
  );
}
