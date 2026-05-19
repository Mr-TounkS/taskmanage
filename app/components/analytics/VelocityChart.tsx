"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface VelocityChartProps {
  data: { week: string; count: number }[]
}

/** Area chart — vélocité : nombre de tâches terminées par semaine (12 semaines) */
export default function VelocityChart({ data }: VelocityChartProps) {
  const hasData = data.some(d => d.count > 0);

  return (
    <div>
      {!hasData && (
        <p className="text-xs text-base-content/40 text-center mb-2">
          No completed tasks in the last 12 weeks
        </p>
      )}
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="velocity-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#8936FF" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#8936FF" stopOpacity={0}   />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 9, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            interval={1}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(value: unknown) => [`${value} tasks completed`]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#8936FF"
            strokeWidth={2}
            fill="url(#velocity-gradient)"
            dot={{ r: 3, fill: "#8936FF", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
