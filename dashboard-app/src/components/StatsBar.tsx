import type { RunStats } from "../api/types";

function StatCard({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div style={{
      flex: 1,
      background: `color-mix(in srgb, ${color} 10%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
      borderRadius: "var(--radius-md)",
      padding: "12px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: "28px", fontWeight: "bold", color }}>{value}</div>
      <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{label}</div>
    </div>
  );
}

export function StatsBar({ stats }: { stats: RunStats | null }) {
  if (!stats) return null;
  return (
    <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
      <StatCard value={stats.total_runs} label="Total Runs" color="var(--status-pass)" />
      <StatCard value={stats.passed} label="Shipped" color="var(--status-pass)" />
      <StatCard value={stats.failed} label="Failed" color="var(--status-fail)" />
      <StatCard value={stats.in_progress} label="In Progress" color="var(--status-warning)" />
      <StatCard value={`$${stats.total_cost_usd.toFixed(2)}`} label="Total Cost" color="var(--status-info)" />
    </div>
  );
}
