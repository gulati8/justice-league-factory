import { useNavigate } from "react-router-dom";
import type { FactoryRun } from "../api/types";

const statusColors: Record<string, string> = {
  pass: "var(--status-pass)",
  fail: "var(--status-fail)",
};

export function RunCard({ run }: { run: FactoryRun }) {
  const navigate = useNavigate();
  const color = statusColors[run.overall_verdict ?? ""] ?? "var(--status-warning)";
  const duration = run.total_duration_ms ? `${Math.round(run.total_duration_ms / 60000)}m` : "--";

  return (
    <div
      onClick={() => navigate(`/runs/${run.run_id}`)}
      style={{
        display: "flex", alignItems: "center", gap: "12px", padding: "12px",
        background: run.overall_verdict === "fail"
          ? "color-mix(in srgb, var(--status-fail) 5%, transparent)"
          : "rgba(30, 41, 59, 0.5)",
        border: `1px solid ${run.overall_verdict === "fail"
          ? "color-mix(in srgb, var(--status-fail) 20%, transparent)" : "#334155"}`,
        borderRadius: "var(--radius-md)", cursor: "pointer",
      }}
    >
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 500 }}>
          {run.feature ?? run.run_id}
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
          {run.overall_verdict === "pass" ? "Shipped" : run.overall_verdict === "fail" ? "Failed" : "In progress"}
          {run.agent_count ? ` \u00b7 ${run.agent_count} agents` : ""}
        </div>
      </div>
      <div style={{ fontSize: "12px", color: "var(--text-muted)", flexShrink: 0, width: 60, textAlign: "right" }}>
        ${run.total_cost_usd?.toFixed(2) ?? "--"}
      </div>
      <div style={{ fontSize: "12px", color: "var(--text-muted)", flexShrink: 0, width: 50, textAlign: "right" }}>
        {duration}
      </div>
    </div>
  );
}
