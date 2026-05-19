"use client"

/**
 * Actual Work Burndown Chart — basé sur les dates réelles des tâches.
 *
 * Trois états possibles (section mémoire 3.2) :
 *   1. Graphique complet (work en cours)
 *   2. "No work started yet" (aucune tâche démarrée)
 *   3. "Project completed" (toutes tâches terminées)
 *
 * Sprint start = première tâche démarrée (date observable en base).
 * Ligne idéale  = rythme requis pour finir à la médiane Monte-Carlo.
 * Zone violette = fourchette [médiane → P85] depuis aujourd'hui.
 */

import {
  ComposedChart, Line, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { BurndownStatus, BurndownPoint } from '@/lib/risk-algorithm/burndown';
import { CheckCircle, Clock } from 'lucide-react';

interface BurndownChartProps {
  data: BurndownStatus;
  sprintStartLabel?: string;
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
          {p.name}: <span className="font-medium">{Math.round(p.value)} tasks remaining</span>
        </p>
      ))}
    </div>
  );
}

function ChartContent({ points, sprintStartLabel }: { points: BurndownPoint[]; sprintStartLabel?: string }) {
  const todayPoint = points.find(p => p.isToday);
  const maxY = Math.max(...points.map(p =>
    Math.max(p.ideal ?? 0, p.actual ?? 0, p.projHigh ?? 0)
  ));

  return (
    <div className="space-y-1">
      {/* Légende */}
      <div className="flex items-center justify-between flex-wrap gap-1">
        <p className="text-xs font-semibold text-base-content/70 uppercase tracking-wide">
          Predictive Burndown
        </p>
        <div className="flex items-center gap-3 text-xs text-base-content/50">
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 border-t-2 border-dashed border-gray-400" />
            Ideal pace
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 border-t-2 border-blue-500" />
            Actual
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-2.5 bg-purple-400 opacity-50 rounded-sm" />
            MC forecast
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={points} margin={{ top: 8, right: 16, left: -28, bottom: 0 }}>
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
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Zone projection MC (P85 — pessimiste) */}
          <Area
            type="monotone"
            dataKey="projHigh"
            fill="#a855f7"
            stroke="none"
            fillOpacity={0.18}
            name="P85 forecast"
            connectNulls={false}
          />
          {/* Borne basse projection MC (médiane — optimiste) */}
          <Area
            type="monotone"
            dataKey="projLow"
            fill="#a855f7"
            stroke="#a855f7"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            fillOpacity={0}
            name="Median forecast"
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
            name="Ideal pace"
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
            activeDot={{ r: 3, fill: '#3b82f6' }}
          />

          {/* Ligne verticale Today */}
          {todayPoint && (
            <ReferenceLine
              x={todayPoint.label}
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              label={{ value: 'Today', position: 'top', fontSize: 8, fill: '#f59e0b' }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Métadonnées honnêtes */}
      <div className="flex items-center justify-between text-xs text-base-content/35 px-1">
        {sprintStartLabel && (
          <span>Work started: <span className="font-medium">{sprintStartLabel}</span></span>
        )}
        <span className="italic">MC projection = 5 000 simulations (median → P85)</span>
      </div>
    </div>
  );
}

export default function BurndownChart({ data }: BurndownChartProps) {
  if (data.type === 'no_work_started') {
    return (
      <div className="flex items-center gap-2 text-xs text-base-content/40 py-4 justify-center">
        <Clock className="w-4 h-4" />
        No work started yet — burndown will appear once tasks are in progress.
      </div>
    );
  }

  if (data.type === 'completed') {
    const completedLabel = data.completedAt.toLocaleDateString('en-US', {
      month: 'short', day: '2-digit', year: 'numeric',
    });
    return (
      <div className="flex items-center gap-2 text-xs text-success py-4 justify-center">
        <CheckCircle className="w-4 h-4" />
        All work completed on <span className="font-semibold ml-1">{completedLabel}</span>
      </div>
    );
  }

  // Cas normal : graphique complet
  const sprintStartLabel = data.sprintStartDate.toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric',
  });

  return <ChartContent points={data.points} sprintStartLabel={sprintStartLabel} />;
}
