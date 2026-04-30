"use client"

import {
  ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
  Legend, ResponsiveContainer,
} from "recharts";

interface CycleTimeChartProps {
  points:    { date: string; cycleTimeDays: number }[]
  sleDays:   number
  sle85Change: number
}

/** Formats a timestamp as "Jun 5", "Mar 10", etc. */
function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Scatter plot — Cycle Time par tâche avec ligne du SLE au 85e centile */
export default function CycleTimeChart({ points, sleDays, sle85Change }: CycleTimeChartProps) {
  const isPositive = sle85Change >= 0;
  const hasData    = points.length > 0;

  // Recharts ScatterChart nécessite des valeurs numériques en X
  const chartData = points.map(p => ({
    x: new Date(p.date).getTime(),
    y: p.cycleTimeDays,
  }));

  // Bornes de l'axe X
  const xMin = hasData ? Math.min(...chartData.map(d => d.x)) : Date.now() - 30 * 86_400_000;
  const xMax = hasData ? Math.max(...chartData.map(d => d.x)) : Date.now();
  // Padding de 12h pour ne pas coller les points aux bords
  const xPad = 12 * 3_600_000;

  return (
    <div className="space-y-1">
      {/* En-tête */}
      <div>
        <p className="text-2xl font-bold">
          {sleDays} d{" "}
          <span className="text-sm font-normal text-base-content/60">
            85% of items are done in {sleDays} days or less
          </span>
        </p>
        <p className={`text-sm font-semibold ${isPositive ? "text-error" : "text-success"}`}>
          {/* Pour le SLE, une hausse est négative (le service se dégrade) */}
          {isPositive ? "+" : ""}{sle85Change} %
        </p>
      </div>

      {!hasData && (
        <p className="text-xs text-base-content/40 text-center py-4">
          No completed tasks with cycle time data
        </p>
      )}

      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart margin={{ top: 8, right: 32, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="x"
            type="number"
            domain={[xMin - xPad, xMax + xPad]}
            scale="time"
            tick={{ fontSize: 9, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(ts: number) => formatDate(new Date(ts).toISOString())}
            tickCount={6}
          />
          <YAxis
            dataKey="y"
            type="number"
            tick={{ fontSize: 9, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}d`}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
            content={({ payload }) => {
              if (!payload?.length) return null;
              const { x, y } = payload[0].payload as { x: number; y: number };
              return (
                <div className="bg-base-100 border border-base-300 rounded-lg p-2 text-xs shadow">
                  <p className="font-semibold">{formatDate(new Date(x).toISOString())}</p>
                  <p className="text-base-content/70">{y} day(s) cycle time</p>
                </div>
              );
            }}
          />
          {/* Légende manuelle — Legend Recharts ne supporte pas payload en externe */}
          <Legend
            iconSize={10}
            wrapperStyle={{ fontSize: 10 }}
            content={() => (
              <div className="flex gap-4 justify-center text-xs mt-1">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-sky-400" />
                  Cycle time
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-5 border-t-2 border-dashed border-violet-500" />
                  85th percentile
                </span>
              </div>
            )}
          />
          {/* Ligne SLE au 85e centile */}
          <ReferenceLine
            y={sleDays}
            stroke="#8b5cf6"
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{ value: "85e", position: "right", fill: "#8b5cf6", fontSize: 10 }}
          />
          <Scatter
            name="Cycle time"
            data={chartData}
            fill="#38bdf8"
            opacity={0.75}
            r={4}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
