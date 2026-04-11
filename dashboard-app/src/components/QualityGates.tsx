import type { AgentRun } from "../api/types";
import { TraceNode } from "./TraceNode";

export function QualityGates({ agents, onClickAgent }: { agents: AgentRun[]; onClickAgent?: (agent: AgentRun) => void }) {
  return (
    <div style={{ display: "flex", gap: "8px" }}>
      {agents.map((agent) => (
        <div key={agent.id} style={{ flex: 1 }}>
          <TraceNode agent={agent} onClick={onClickAgent ? () => onClickAgent(agent) : undefined} />
        </div>
      ))}
    </div>
  );
}
