import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function Chart({ data, dataKey, xKey, color, title, yLabel }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  dataKey: string;
  xKey: string;
  color: string;
  title: string;
  yLabel?: string;
}) {
  return (
    <div style={{
      background: "rgba(30, 41, 59, 0.5)", border: "1px solid #334155",
      borderRadius: "var(--radius-md)", padding: "16px",
    }}>
      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px" }}>{title}</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey={xKey} tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} />
          <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false}
            label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 10 } : undefined} />
          <Tooltip contentStyle={{
            background: "#0d0d20", border: "1px solid #2e1065", borderRadius: 4,
            color: "#e2e8f0", fontFamily: "var(--font-mono)", fontSize: 12,
          }} />
          <Bar dataKey={dataKey} fill={color} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
