"use client"

import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface ThroughputChartProps {
  data:  { week: string; count: number }[]
  stats: { avgPerWeek: number; changePercent: number }
}

/** Régression linéaire (moindres carrés) pour la ligne de tendance */
function computeTrend(counts: number[]): number[] {
  const n      = counts.length;
  if (n === 0) return [];
  const sumX   = (n * (n - 1)) / 2;
  const sumY   = counts.reduce((a, b) => a + b, 0);
  const sumXY  = counts.reduce((acc, y, i) => acc + i * y, 0);
  const sumXX  = counts.reduce((acc, _, i) => acc + i * i, 0);
  const denom  = n * sumXX - sumX * sumX;
  if (denom === 0) return counts.map(() => sumY / n);
  const slope     = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return counts.map((_, i) => Math.max(0, parseFloat((slope * i + intercept).toFixed(2))));
}

/** Area chart — débit hebdomadaire avec ligne de tendance (régression linéaire) */
export default function ThroughputChart({ data, stats }: ThroughputChartProps) {
  const trendValues = computeTrend(data.map(d => d.count));
  const chartData   = data.map((d, i) => ({ week: d.week, count: d.count, trend: trendValues[i] }));
  const hasData     = data.some(d => d.count > 0);
  const isPositive  = stats.changePercent >= 0;

  return (
    <div className="space-y-1">
      {/* En-tête */}
      <div>
        <p className="text-2xl font-bold">{stats.avgPerWeek} <span className="text-sm font-normal text-base-content/60">items completed / week</span></p>
        <p className={`text-sm font-semibold ${isPositive ? "text-success" : "text-error"}`}>
          {isPositive ? "+" : ""}{stats.changePercent} %
        </p>
      </div>

      {!hasData && (
        <p className="text-xs text-base-content/40 text-center py-4">
          No completed tasks in the last 12 weeks
        </p>
      )}

      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="throughput-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval={1} />
          <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
          <Area
            type="monotone"
            dataKey="count"
            name="Completed items"
            stroke="#38bdf8"
            strokeWidth={2}
            fill="url(#throughput-gradient)"
            dot={{ r: 3, fill: "#38bdf8", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="trend"
            name="Trend"
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            activeDot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
