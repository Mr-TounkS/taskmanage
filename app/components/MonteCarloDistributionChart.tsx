"use client"

/**
 * MonteCarloDistributionChart — Distribution des durées simulées par Monte-Carlo.
 *
 * Lecture en une phrase pour le jury :
 *   "La courbe montre la distribution de probabilité des durées d'achèvement
 *    du sprint sur 10 000 simulations. La ligne verte = date estimée médiane.
 *    La ligne rouge = deadline réelle. Tout ce qui est à droite du rouge = retard."
 *
 * Si la ligne rouge est à droite du pic → la majorité des simulations finissent
 * avant la deadline → risque faible.
 * Si la ligne rouge est à gauche du pic → risque critique.
 *
 * Section mémoire : 3.2 — Visualisation du moteur stochastique de Monte-Carlo
 */

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts';
import { HistogramBucket } from '@/lib/risk-algorithm/MonteCarloSimulator';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MonteCarloDistributionChartProps {
  histogram: HistogramBucket[];
  medianDays: number;
  remainingDays: number;
  probabilityOfDelay: number;
}

// ---------------------------------------------------------------------------
// Tooltip personnalisé
// ---------------------------------------------------------------------------

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: HistogramBucket }[] }) {
  if (!active || !payload?.length) return null;
  const b = payload[0].payload;
  return (
    <div className="bg-base-100 border border-base-300 rounded px-2 py-1 text-xs shadow">
      <p className="font-medium">{b.day} days</p>
      <p className="text-base-content/60">{b.frequency}% of simulations</p>
      {b.isDelay && <p className="text-error">⚠ Beyond deadline</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export default function MonteCarloDistributionChart({
  histogram,
  medianDays,
  remainingDays,
  probabilityOfDelay,
}: MonteCarloDistributionChartProps) {
  if (!histogram || histogram.length === 0) {
    return (
      <div className="text-xs text-base-content/40 text-center py-4">
        Insufficient data for distribution chart.
      </div>
    );
  }

  const onTimePct = Math.round((1 - probabilityOfDelay) * 100);
  const delayPct  = Math.round(probabilityOfDelay * 100);

  return (
    <div className="space-y-2">
      {/* Titre + légende */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-base-content/70 uppercase tracking-wide">
          Sprint completion distribution
        </p>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-green-500 rounded" />
            Median ({medianDays}d)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-red-500 rounded" />
            Deadline ({remainingDays}d)
          </span>
        </div>
      </div>

      {/* Graphique */}
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={histogram} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barCategoryGap="4%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 9, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            label={{ value: 'Days', position: 'insideBottomRight', offset: -4, fontSize: 9, fill: '#9ca3af' }}
          />
          <YAxis
            tick={{ fontSize: 9, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            unit="%"
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Ligne verte : médiane (date estimée) */}
          <ReferenceLine
            x={medianDays}
            stroke="#22c55e"
            strokeWidth={2}
            strokeDasharray="4 2"
            label={{ value: '📅', position: 'top', fontSize: 10 }}
          />

          {/* Ligne rouge : deadline sprint */}
          <ReferenceLine
            x={remainingDays}
            stroke="#ef4444"
            strokeWidth={2}
            label={{ value: '🚩', position: 'top', fontSize: 10 }}
          />

          <Bar dataKey="frequency" radius={[2, 2, 0, 0]}>
            {histogram.map((bucket, idx) => (
              <Cell
                key={idx}
                fill={bucket.isDelay ? '#fca5a5' : '#93c5fd'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Résumé lisible */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="flex items-center gap-1 text-blue-500 font-medium">
          <span className="w-2 h-2 rounded-sm bg-blue-300 inline-block" />
          On time: {onTimePct}%
        </span>
        <span className="text-base-content/40 text-center italic text-xs">
          Monte-Carlo · 10 000 simulations
        </span>
        <span className="flex items-center gap-1 text-red-400 font-medium">
          <span className="w-2 h-2 rounded-sm bg-red-300 inline-block" />
          Delay risk: {delayPct}%
        </span>
      </div>
    </div>
  );
}
