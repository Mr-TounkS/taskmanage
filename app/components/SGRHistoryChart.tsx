"use client";

/**
 * SGRHistoryChart — Graphique d'évolution temporelle du Score Global de Risque
 *
 * Affiche une courbe avec zone colorée montrant l'évolution du SGR dans le temps.
 * Trois lignes de référence indiquent les seuils de risque (30 / 60 / 80).
 *
 * Section mémoire : 3.4 — Module actif de gestion des risques
 * Section mémoire : 4.2 — Étude de cas sur son propre développement
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PointHistorique {
  id: string;
  sgr: number;
  niveau: string;
  createdAt: string;
}

interface SGRHistoryChartProps {
  historique: PointHistorique[];
}

// Payload du tooltip Recharts typé explicitement pour éviter `any`
interface TooltipPayloadItem {
  value: number;
  payload: { niveau: string };
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Formate une date ISO en "MM/DD" pour l'axe X */
function formatDateAxe(dateIso: string): string {
  const d = new Date(dateIso);
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit" });
}

/** Formate une date ISO complète pour le tooltip */
function formatDateTooltip(dateIso: string): string {
  const d = new Date(dateIso);
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Tooltip personnalisé
// ---------------------------------------------------------------------------

function TooltipSGR({ active, payload, label }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const score = payload[0].value;
  const niveau = payload[0].payload.niveau;

  // Couleur du niveau pour le badge
  const couleur =
    niveau === "low" ? "text-success" :
    niveau === "moderate" ? "text-warning" :
    "text-error";

  return (
    <div className="bg-base-100 border border-base-300 rounded-lg p-3 text-xs shadow-lg">
      <p className="font-semibold text-base-content/70 mb-1">{label}</p>
      <p className="text-base-content">
        Score : <span className="font-bold text-primary">{score}</span>
        <span className="text-base-content/50">/100</span>
      </p>
      <p className={`capitalize font-medium ${couleur}`}>{niveau}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function SGRHistoryChart({ historique }: SGRHistoryChartProps) {
  // Moins de 2 points : pas de courbe significative
  if (historique.length < 2) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-base-content/40 text-center px-4">
        Recalculate SGR several times to visualize risk evolution over time.
      </div>
    );
  }

  // Transformation des données pour Recharts
  const donnees = historique.map((point) => ({
    date: formatDateAxe(point.createdAt),
    dateFull: formatDateTooltip(point.createdAt),
    score: Math.round(point.sgr),
    niveau: point.niveau,
  }));

  return (
    <div className="mt-4">
      <p className="text-xs text-base-content/50 mb-2 font-medium">
        Risk Evolution ({historique.length} measurements)
      </p>

      <ResponsiveContainer width="100%" height={150}>
        <AreaChart
          data={donnees}
          margin={{ top: 8, right: 8, left: -28, bottom: 0 }}
        >
          {/* Dégradé violet → transparent sous la courbe */}
          <defs>
            <linearGradient id="degrade-sgr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#8936FF" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#8936FF" stopOpacity={0}    />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />

          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
          />

          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            ticks={[0, 30, 60, 80, 100]}
          />

          <Tooltip content={<TooltipSGR />} />

          {/* Seuil faible → modéré */}
          <ReferenceLine
            y={30}
            stroke="#22c55e"
            strokeDasharray="4 3"
            strokeWidth={1}
          />

          {/* Seuil modéré → élevé */}
          <ReferenceLine
            y={60}
            stroke="#eab308"
            strokeDasharray="4 3"
            strokeWidth={1}
          />

          {/* Seuil élevé → critique */}
          <ReferenceLine
            y={80}
            stroke="#ef4444"
            strokeDasharray="4 3"
            strokeWidth={1}
          />

          {/* Courbe principale */}
          <Area
            type="monotone"
            dataKey="score"
            stroke="#8936FF"
            strokeWidth={2}
            fill="url(#degrade-sgr)"
            dot={{ r: 3, fill: "#8936FF", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#8936FF" }}
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex gap-3 mt-2 justify-center">
        <span className="flex items-center gap-1 text-[10px] text-success">
          <span className="inline-block w-4 h-px bg-success"></span> Low &lt;30
        </span>
        <span className="flex items-center gap-1 text-[10px] text-warning">
          <span className="inline-block w-4 h-px bg-warning"></span> Moderate &lt;60
        </span>
        <span className="flex items-center gap-1 text-[10px] text-error">
          <span className="inline-block w-4 h-px bg-error"></span> Critical &gt;80
        </span>
      </div>
    </div>
  );
}
