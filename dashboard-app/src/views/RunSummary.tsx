import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { FactoryRun, RunStats } from "../api/types";
import { StatsBar } from "../components/StatsBar";
import { RunCard } from "../components/RunCard";

export function RunSummary() {
  const [runs, setRuns] = useState<FactoryRun[]>([]);
  const [stats, setStats] = useState<RunStats | null>(null);

  useEffect(() => {
    api.runs.list().then(setRuns).catch(console.error);
    api.runs.stats().then(setStats).catch(console.error);
  }, []);

  return (
    <div style={{ padding: "24px" }}>
      <StatsBar stats={stats} />
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {runs.map((run) => (
          <RunCard key={run.run_id} run={run} />
        ))}
        {runs.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
            No factory runs yet. Dispatch Batman to get started.
          </div>
        )}
      </div>
    </div>
  );
}
