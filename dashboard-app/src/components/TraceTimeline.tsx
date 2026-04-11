import type { AgentRun, GateEvent } from "../api/types";
import { TraceNode } from "./TraceNode";
import { GateNode } from "./GateNode";
import { QualityGates } from "./QualityGates";

type TimelineItem =
  | { type: "agent"; data: AgentRun }
  | { type: "gate"; data: GateEvent }
  | { type: "quality_gates"; data: AgentRun[] };

export function TraceTimeline({ agents, gates, onClickAgent }: {
  agents: AgentRun[];
  gates: GateEvent[];
  onClickAgent: (agent: AgentRun) => void;
}) {
  const qualityGateAgents = ["wonder-woman", "flash", "green-lantern"];
  const qualityGroup = agents.filter((a) =>
    qualityGateAgents.includes(a.agent) && a.phase === "quality_gate"
  );
  const regularAgents = agents.filter(
    (a) => !(qualityGateAgents.includes(a.agent) && a.phase === "quality_gate")
  );

  const items: TimelineItem[] = [];
  const phaseToGate: Record<string, string> = {
    research: "spec",
    plan_v1: "plan",
    devils_advocate: "plan",
  };

  for (const agent of regularAgents) {
    items.push({ type: "agent", data: agent });
    const gateName = phaseToGate[agent.phase ?? ""];
    if (gateName) {
      const gate = gates.find((g) => g.gate_name === gateName);
      if (gate) items.push({ type: "gate", data: gate });
    }
  }

  if (qualityGroup.length > 0) {
    items.push({ type: "quality_gates", data: qualityGroup });
  }

  return (
    <div style={{ position: "relative", paddingLeft: "24px" }}>
      <div style={{ position: "absolute", left: 7, top: 4, bottom: 4, width: 2, background: "#334155" }} />
      {items.map((item, i) => (
        <div key={i} style={{ position: "relative", marginBottom: "16px" }}>
          <div style={{
            position: "absolute", left: -20, top: 4, width: 12, height: 12,
            borderRadius: "50%",
            background: item.type === "gate" ? "var(--status-info)" : "var(--status-pass)",
            border: "2px solid var(--bg-primary)",
          }} />
          {item.type === "agent" && (
            <TraceNode agent={item.data} onClick={() => onClickAgent(item.data)} />
          )}
          {item.type === "gate" && <GateNode gate={item.data} />}
          {item.type === "quality_gates" && (
            <QualityGates agents={item.data} onClickAgent={onClickAgent} />
          )}
        </div>
      ))}
    </div>
  );
}
