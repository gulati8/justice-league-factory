import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";
import type { LogEvent } from "../api/types";

const agentColors: Record<string, string> = {
  batman: "var(--agent-batman)", "martian-manhunter": "var(--agent-martian-manhunter)",
  cyborg: "var(--agent-cyborg)", "wonder-woman": "var(--agent-wonder-woman)",
  flash: "var(--agent-flash)", "green-lantern": "var(--agent-green-lantern)",
  "lois-lane": "var(--agent-lois-lane)", oracle: "var(--agent-oracle)",
};

function formatDetail(event: LogEvent): string {
  try {
    const data = JSON.parse(event.data);
    if (event.event_type === "SubagentStart") return "Agent dispatched";
    if (event.event_type === "SubagentStop") {
      const msg = data.last_assistant_message ?? "";
      return msg.length > 200 ? msg.substring(0, 200) + "..." : msg;
    }
    if (event.event_type === "PreToolUse") {
      const tool = data.tool_name ?? "?";
      const input = data.tool_input ?? {};
      if (tool === "Read" && input.file_path) return `Read ${input.file_path}`;
      if (tool === "Write" && input.file_path) return `Write ${input.file_path}`;
      if (tool === "Bash" && input.command) return `Bash: ${input.command.substring(0, 100)}`;
      return tool;
    }
    if (event.event_type === "PostToolUse") return `${data.tool_name ?? "?"} completed`;
    if (event.event_type === "Stop") return "Session ended";
    return event.event_type;
  } catch { return ""; }
}

export function LogView() {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  const loadPage = useCallback(async (p: number) => {
    const [evts, count] = await Promise.all([
      api.events.list({ limit: pageSize, offset: (p - 1) * pageSize }),
      api.events.count(),
    ]);
    setEvents(evts);
    setTotal(count.count);
    setPage(p);
  }, []);

  useEffect(() => { loadPage(1); }, [loadPage]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 1.5rem",
        borderBottom: "1px solid var(--border-primary)", background: "var(--bg-secondary)",
      }}>
        <button onClick={() => loadPage(Math.max(1, page - 1))} disabled={page <= 1}
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-accent)", borderRadius: "var(--radius-sm)", color: "var(--text-accent)", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", padding: "0.25rem 0.75rem", cursor: page <= 1 ? "default" : "pointer", opacity: page <= 1 ? 0.35 : 1 }}>
          Newer
        </button>
        <span style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>Page {page} of {totalPages}</span>
        <button onClick={() => loadPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-accent)", borderRadius: "var(--radius-sm)", color: "var(--text-accent)", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", padding: "0.25rem 0.75rem", cursor: page >= totalPages ? "default" : "pointer", opacity: page >= totalPages ? 0.35 : 1 }}>
          Older
        </button>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {events.map((event) => (
          <div key={event.id} style={{
            display: "grid", gridTemplateColumns: "100px 140px 200px 1fr",
            gap: "12px", padding: "0.4375rem 1.5rem", fontSize: "0.875rem", lineHeight: 1.6, borderBottom: "1px solid #12122a",
          }}>
            <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
            <span style={{
              fontSize: "0.8125rem", letterSpacing: "1px", textTransform: "uppercase",
              color: event.event_type === "SubagentStart" ? "#818cf8" : event.event_type === "SubagentStop" ? "var(--text-accent)" : event.event_type === "Stop" ? "#f472b6" : "var(--text-muted)",
            }}>
              {event.event_type}
            </span>
            <span style={{ fontWeight: 700, fontSize: "0.875rem", color: agentColors[event.agent_type ?? ""] ?? "var(--text-muted)" }}>
              {event.agent_type ?? "--"}
            </span>
            <span style={{ color: "var(--text-secondary)", wordBreak: "break-word" }}>
              {formatDetail(event)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
