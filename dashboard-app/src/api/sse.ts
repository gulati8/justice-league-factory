import type { LogEvent, AgentRun } from "./types";

type EventHandler = {
  onEvent?: (event: LogEvent) => void;
  onAgentRun?: (run: AgentRun) => void;
};

export function connectSSE(handlers: EventHandler): () => void {
  const source = new EventSource("/api/stream");

  source.addEventListener("event", (e) => {
    const data = JSON.parse(e.data) as LogEvent;
    handlers.onEvent?.(data);
  });

  source.addEventListener("agent_run", (e) => {
    const data = JSON.parse(e.data) as AgentRun;
    handlers.onAgentRun?.(data);
  });

  source.onerror = () => {};

  return () => source.close();
}
