"use client"

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface TaskStatusChartProps {
  data: { status: string; count: number }[]
}

const COLORS: Record<string, string> = {
  "To Do":       "#94a3b8",
  "In Progress": "#f59e0b",
  "Done":        "#22c55e",
};

/** Donut — répartition des tâches par statut */
export default function TaskStatusChart({ data }: TaskStatusChartProps) {
  const total = data.reduce((s, d) => s + d.count, 0);

  if (total === 0) {
    return <EmptyChart message="No tasks yet" />;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="status"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
        >
          {data.map((entry) => (
            <Cell key={entry.status} fill={COLORS[entry.status] ?? "#8936FF"} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: unknown, name: unknown) => [`${value} tasks`, name as string]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[220px] text-xs text-base-content/40">
      {message}
    </div>
  );
}
