"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface CompletionRateChartProps {
  data: { projectName: string; total: number; done: number; rate: number }[]
}

/** Barres horizontales — taux de complétion par projet */
export default function CompletionRateChart({ data }: CompletionRateChartProps) {
  if (data.length === 0 || data.every(d => d.total === 0)) {
    return (
      <div className="flex items-center justify-center h-[200px] text-xs text-base-content/40">
        No projects yet
      </div>
    );
  }

  // Tronque les noms longs pour l'axe Y
  const chartData = data.map(d => ({
    ...d,
    name: d.projectName.length > 14 ? d.projectName.slice(0, 14) + "…" : d.projectName,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 45)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          width={90}
        />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: unknown, _: unknown, props: any) =>
            [`${value}% (${props.payload.done}/${props.payload.total} tasks)`, "Completion"]
          }
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Bar dataKey="rate" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 10, formatter: (v: unknown) => `${v}%` }}>
          {chartData.map((entry) => (
            <Cell
              key={entry.projectName}
              fill={entry.rate >= 75 ? "#22c55e" : entry.rate >= 40 ? "#f59e0b" : "#ef4444"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
