import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { RunDetail } from "../api/types";
import { TraceTimeline } from "../components/TraceTimeline";

export function RunTrace() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<RunDetail | null>(null);

  useEffect(() => {
    if (runId) {
      api.runs.get(runId).then(setRun).catch(console.error);
    }
  }, [runId]);

  if (!run) {
    return <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>;
  }

  const duration = run.total_duration_ms ? `${Math.round(run.total_duration_ms / 60000)}m` : "--";
  const gateConfig = run.gate_config ? JSON.parse(run.gate_config) : null;

  return (
    <div style={{ padding: "24px" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid #334155",
      }}>
        <div>
          <div style={{ fontSize: "16px", color: "var(--text-primary)", fontWeight: 500 }}>
            {run.feature ?? run.run_id}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {run.run_id} &middot; duration {duration} &middot; cost ${run.total_cost_usd?.toFixed(2)}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <span style={{
            fontSize: "11px", padding: "4px 10px", borderRadius: "var(--radius-sm)",
            background: run.overall_verdict === "pass"
              ? "color-mix(in srgb, var(--status-pass) 15%, transparent)"
              : "color-mix(in srgb, var(--status-fail) 15%, transparent)",
            color: run.overall_verdict === "pass" ? "var(--status-pass)" : "var(--status-fail)",
          }}>
            {run.overall_verdict?.toUpperCase() ?? "IN PROGRESS"}
          </span>
          {gateConfig && (
            <span style={{
              fontSize: "11px", padding: "4px 10px", borderRadius: "var(--radius-sm)",
              background: "color-mix(in srgb, var(--status-info) 15%, transparent)",
              color: "var(--status-info)",
            }}>
              gates: spec={gateConfig.spec} plan={gateConfig.plan} ship={gateConfig.ship}
            </span>
          )}
        </div>
      </div>
      <TraceTimeline
        agents={run.agents}
        gates={run.gates}
        onClickAgent={(agent) => navigate(`/transcript/${agent.id}`)}
      />
    </div>
  );
}
