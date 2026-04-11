import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Transcript } from "../api/types";
import { TranscriptPanel } from "../components/TranscriptPanel";

export function TranscriptView() {
  const { agentRunId } = useParams<{ agentRunId: string }>();
  const navigate = useNavigate();
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (agentRunId) {
      api.agents.transcript(parseInt(agentRunId)).then(setTranscript).catch(() => setError("Transcript not found"));
    }
  }, [agentRunId]);

  return (
    <div style={{ padding: "24px", height: "calc(100vh - 60px)" }}>
      <button onClick={() => navigate(-1)} style={{
        background: "var(--bg-card)", border: "1px solid var(--border-accent)", borderRadius: "var(--radius-sm)",
        color: "var(--text-accent)", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", padding: "0.25rem 0.75rem", cursor: "pointer", marginBottom: "16px",
      }}>
        Back
      </button>
      {error ? (
        <div style={{ color: "var(--status-fail)", textAlign: "center", padding: "48px" }}>{error}</div>
      ) : transcript ? (
        <TranscriptPanel transcript={transcript} agentName={`Agent Run #${agentRunId}`} />
      ) : (
        <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "48px" }}>Loading...</div>
      )}
    </div>
  );
}
