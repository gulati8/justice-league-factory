import type { AgentRun } from "../api/types";

const agentColors: Record<string, string> = {
  batman: "var(--agent-batman)",
  brainiac: "var(--agent-brainiac)",
  "martian-manhunter": "var(--agent-martian-manhunter)",
  cyborg: "var(--agent-cyborg)",
  "wonder-woman": "var(--agent-wonder-woman)",
  flash: "var(--agent-flash)",
  "green-lantern": "var(--agent-green-lantern)",
  "lois-lane": "var(--agent-lois-lane)",
  oracle: "var(--agent-oracle)",
};

const agentEmoji: Record<string, string> = {
  batman: "\ud83e\uddb7",
  brainiac: "\ud83e\udde0",
  "martian-manhunter": "\ud83d\udc7d",
  cyborg: "\ud83e\udd16",
  "wonder-woman": "\ud83d\udc78",
  flash: "\u26a1",
  "green-lantern": "\ud83d\udc9a",
  "lois-lane": "\ud83d\udcf0",
  oracle: "\ud83d\udd2e",
};

function formatPhase(phase: string | null): string {
  if (!phase) return "";
  return phase.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TraceNode({ agent, onClick }: { agent: AgentRun; onClick?: () => void }) {
  const color = agentColors[agent.agent] ?? "var(--text-secondary)";
  const emoji = agentEmoji[agent.agent] ?? "\u2753";
  const isDevils = agent.phase === "devils_advocate";
  const duration = agent.duration_ms ? `${Math.round(agent.duration_ms / 60000)}m` : "--";

  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 14px",
        background: isDevils
          ? "color-mix(in srgb, var(--status-warning) 5%, transparent)"
          : "rgba(30, 41, 59, 0.5)",
        border: `1px solid ${isDevils
          ? "color-mix(in srgb, var(--status-warning) 20%, transparent)" : "#334155"}`,
        borderRadius: "var(--radius-md)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>
          {emoji}{" "}
          <strong style={{ color }}>
            {agent.agent.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </strong>
          {agent.phase ? ` \u2014 ${formatPhase(agent.phase)}` : ""}
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          {duration} &middot; ${agent.cost_usd?.toFixed(2) ?? "--"} &middot;{" "}
          {((agent.input_tokens + agent.output_tokens) / 1000).toFixed(0)}k tokens
        </div>
      </div>
      {agent.verdict && (
        <div style={{
          fontSize: "11px", marginTop: "4px",
          color: agent.verdict === "pass" ? "var(--status-pass)" : "var(--status-fail)",
        }}>
          {agent.verdict.toUpperCase()}
        </div>
      )}
    </div>
  );
}
