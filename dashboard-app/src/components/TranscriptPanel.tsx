import type { Transcript } from "../api/types";

function formatTranscript(jsonl: string): string {
  const lines = jsonl.trim().split("\n");
  let output = "";
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      const role = entry.role ?? entry.type ?? "?";
      let content = "";
      if (entry.content) {
        if (typeof entry.content === "string") content = entry.content;
        else if (Array.isArray(entry.content))
          content = entry.content.map((c: Record<string, unknown>) => (c.text as string) ?? (c.tool_use_id as string) ?? JSON.stringify(c)).join("\n");
      } else if (entry.message) content = JSON.stringify(entry.message, null, 2);
      if (content) output += `--- ${(role as string).toUpperCase()} ---\n${content}\n\n`;
    } catch { output += line + "\n"; }
  }
  return output || jsonl;
}

export function TranscriptPanel({ transcript, agentName }: { transcript: Transcript; agentName: string }) {
  const tokens = `In: ${(transcript.total_input_tokens ?? 0).toLocaleString()} | Out: ${(transcript.total_output_tokens ?? 0).toLocaleString()}`;

  return (
    <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-accent)", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 1.25rem", borderBottom: "1px solid var(--border-primary)" }}>
        <h3 style={{ fontSize: "1.125rem", color: "var(--text-accent)", letterSpacing: "1px" }}>{agentName} &mdash; Transcript</h3>
      </div>
      <div style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem", color: "var(--text-muted)", borderBottom: "1px solid #12122a", display: "flex", gap: "20px" }}>
        <span>Model: {transcript.model ?? "unknown"}</span>
        <span>{tokens}</span>
      </div>
      <pre style={{ flex: 1, overflow: "auto", padding: "1rem 1.25rem", fontSize: "0.875rem", lineHeight: 1.6, color: "var(--text-secondary)", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
        {transcript.full_transcript
          ? formatTranscript(transcript.full_transcript)
          : `--- PROMPT ---\n${transcript.prompt_text ?? "(not captured)"}\n\n--- RESPONSE ---\n${transcript.response_text ?? "(not captured)"}`}
      </pre>
    </div>
  );
}
