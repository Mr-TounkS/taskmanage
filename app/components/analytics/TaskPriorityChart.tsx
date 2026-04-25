"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface TaskPriorityChartProps {
  data: { priority: string; count: number }[]
}

const COLORS: Record<string, string> = {
  LOW:    "#22c55e",
  MEDIUM: "#f59e0b",
  HIGH:   "#ef4444",
};

/** Bar chart — répartition des tâches par priorité */
export default function TaskPriorityChart({ data }: TaskPriorityChartProps) {
  const total = data.reduce((s, d) => s + d.count, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[220px] text-xs text-base-content/40">
        No tasks yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey="priority"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          formatter={(value: unknown) => [`${value} tasks`]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.priority} fill={COLORS[entry.priority] ?? "#8936FF"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
