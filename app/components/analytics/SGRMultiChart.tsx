"use client"

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Legend, ResponsiveContainer,
} from "recharts";

interface SGRMultiChartProps {
  data: { projectId: string; projectName: string; history: { sgr: number; niveau: string; createdAt: string }[] }[]
}

// Palette de couleurs pour jusqu'à 8 projets
const PALETTE = ["#8936FF", "#3b82f6", "#f59e0b", "#22c55e", "#ef4444", "#ec4899", "#14b8a6", "#f97316"];

/** Courbes SGR multi-projets — une ligne par projet sur le même axe temporel */
export default function SGRMultiChart({ data }: SGRMultiChartProps) {
  // Projets ayant au moins 1 point d'historique
  const activeProjects = data.filter(p => p.history.length > 0);

  if (activeProjects.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-xs text-base-content/40 text-center px-4">
        Calculate SGR on your projects to see risk evolution
      </div>
    );
  }

  // Fusion de tous les points sur un axe temporel commun (index relatif par projet)
  const maxPoints = Math.max(...activeProjects.map(p => p.history.length));
  const chartData = Array.from({ length: maxPoints }, (_, i) => {
    const point: Record<string, number | string> = { index: `#${i + 1}` };
    for (const project of activeProjects) {
      // Alignement par index (du plus ancien au plus récent)
      const reversed = [...project.history].reverse();
      if (reversed[i]) {
        point[project.projectName] = reversed[i].sgr;
      }
    }
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis dataKey="index" tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} ticks={[0, 30, 60, 80, 100]} />
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
        <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="4 3" strokeWidth={1} />
        <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1} />
        <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1} />
        {activeProjects.map((project, i) => (
          <Line
            key={project.projectId}
            type="monotone"
            dataKey={project.projectName}
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
