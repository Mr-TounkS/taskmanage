"use client"

/**
 * BurndownChart — Burndown Chart Prédictif avec projection Monte-Carlo.
 *
 * Trois courbes (section mémoire 3.2) :
 *   — Idéale (gris pointillé) : rythme de livraison théorique requis
 *   — Réelle (bleu) : avancement effectif de l'équipe
 *   — Zone de projection (violet semi-transparent) : fourchette Monte-Carlo
 *     entre médiane (optimiste) et P85 (pessimiste)
 *
 * Lecture en une phrase pour le jury :
 *   "Quand la courbe réelle est au-dessus de la ligne idéale, l'équipe est
 *    en retard. La zone violette montre quand le sprint se terminera selon
 *    10 000 simulations — c'est la visualisation directe du calcul de risque."
 */

import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
import { BurndownPoint } from '@/lib/risk-algorithm/burndown';

interface BurndownChartProps {
  data: BurndownPoint[];
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-base-100 border border-base-300 rounded px-2 py-1.5 text-xs shadow space-y-0.5">
      <p className="font-semibold text-base-content/70 mb-1">{label}</p>
      {payload.map((p, i) => p.value != null && (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <span className="font-medium">{Math.round(p.value)} tasks</span>
        </p>
      ))}
    </div>
  );
}

export default function BurndownChart({ data }: BurndownChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-xs text-base-content/40 text-center py-6">
        Insufficient task history to render burndown.
      </div>
    );
  }

  const todayIndex = data.findIndex(p => p.isToday);
  const todayLabel = todayIndex >= 0 ? data[todayIndex].label : undefined;

  // Valeur max pour l'axe Y
  const maxY = Math.max(...data.map(p => Math.max(p.ideal ?? 0, p.actual ?? 0, p.projHigh ?? 0)));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-base-content/70 uppercase tracking-wide">
          Predictive Burndown
        </p>
        <div className="flex items-center gap-3 text-xs text-base-content/50">
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 border-t-2 border-dashed border-gray-400" />
            Ideal
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 border-t-2 border-blue-500" />
            Actual
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-2 bg-purple-300 opacity-60 rounded-sm" />
            MC Projection
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={data} margin={{ top: 4, right: 16, left: -28, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, maxY + 1]}
            tick={{ fontSize: 9, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            label={{ value: 'Tasks', angle: -90, position: 'insideLeft', fontSize: 9, fill: '#9ca3af', dx: 28 }}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Zone de projection Monte-Carlo */}
          <Area
            type="monotone"
            dataKey="projHigh"
            fill="#a855f7"
            stroke="none"
            fillOpacity={0.15}
            name="P85 (pessimistic)"
            connectNulls={false}
          />
          <Area
            type="monotone"
            dataKey="projLow"
            fill="#a855f7"
            stroke="#a855f7"
            strokeWidth={1}
            strokeDasharray="3 2"
            fillOpacity={0}
            name="Median (optimistic)"
            connectNulls={false}
          />

          {/* Ligne idéale */}
          <Line
            type="linear"
            dataKey="ideal"
            stroke="#9ca3af"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            name="Ideal"
            connectNulls
          />

          {/* Courbe réelle */}
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={false}
            name="Actual"
            connectNulls={false}
            activeDot={{ r: 3 }}
          />

          {/* Ligne verticale "Today" */}
          {todayLabel && (
            <ReferenceLine
              x={todayLabel}
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              label={{ value: '▼ Now', position: 'top', fontSize: 8, fill: '#f59e0b' }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      <p className="text-xs text-base-content/35 italic text-center">
        Projection zone = Monte-Carlo 10 000 simulations (median → P85)
      </p>
    </div>
  );
}
