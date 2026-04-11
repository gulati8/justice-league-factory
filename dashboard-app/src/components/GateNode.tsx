import type { GateEvent } from "../api/types";

export function GateNode({ gate }: { gate: GateEvent }) {
  const waitMins = gate.wait_duration_ms ? Math.round(gate.wait_duration_ms / 60000) : null;

  return (
    <div style={{
      padding: "10px 14px",
      background: "color-mix(in srgb, var(--status-info) 8%, transparent)",
      border: "1px solid color-mix(in srgb, var(--status-info) 30%, transparent)",
      borderRadius: "var(--radius-md)",
    }}>
      <div style={{ fontSize: "13px", color: "var(--status-info)" }}>
        {"\ud83e\uddd1"} <strong>{gate.gate_name.toUpperCase()} Gate &mdash; {gate.action}</strong>
      </div>
      {gate.comment && (
        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
          Comment: &ldquo;{gate.comment}&rdquo;
          {waitMins !== null && ` \u00b7 wait: ${waitMins}m`}
        </div>
      )}
    </div>
  );
}
