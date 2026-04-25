"use client"

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface SGRLevelDistributionProps {
  data: { niveau: string; count: number }[]
}

const COLORS: Record<string, string> = {
  "faible":   "#22c55e",
  "modéré":   "#f59e0b",
  "élevé":    "#f97316",
  "critique": "#ef4444",
};

const LABELS: Record<string, string> = {
  "faible":   "Low",
  "modéré":   "Moderate",
  "élevé":    "High",
  "critique": "Critical",
};

/** Donut — temps passé dans chaque niveau de risque SGR */
export default function SGRLevelDistribution({ data }: SGRLevelDistributionProps) {
  const total = data.reduce((s, d) => s + d.count, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[220px] text-xs text-base-content/40 text-center px-4">
        No SGR history yet — calculate SGR to populate this chart
      </div>
    );
  }

  const chartData = data
    .filter(d => d.count > 0)
    .map(d => ({ ...d, label: LABELS[d.niveau] ?? d.niveau }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
        >
          {chartData.map((entry) => (
            <Cell key={entry.niveau} fill={COLORS[entry.niveau] ?? "#8936FF"} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: unknown, name: unknown) => [`${value} calculations`, name as string]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
