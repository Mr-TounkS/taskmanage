
"use client"

/**
 * SGRWidget — Composant d'affichage du Score Global de Risque
 *
 * Affiche le score SGR, le niveau de risque, le détail des 5 indicateurs
 * et les alertes actives pour un projet donné.
 *
 * Section mémoire : 3.4 — Module actif de gestion des risques
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, TrendingDown, Clock, Activity, Code2, RefreshCw } from "lucide-react";
import { getProjectSGR, getSGRHistory } from "@/app/actions";
import { SGRResult } from "@/lib/risk-algorithm/types";
import { NotificationDecision } from "@/domain/services/NotificationDecisionService";

const MonteCarloDistributionChart = dynamic(() => import("./MonteCarloDistributionChart"), {
  ssr: false,
  loading: () => <div className="h-28 w-full bg-base-200 animate-pulse rounded-lg" />,
});

// PrescriptivePanel chargé en différé — appel serveur Anthropic API uniquement à la demande
const PrescriptivePanel = dynamic(() => import("./PrescriptivePanel"), { ssr: false });

// Recharts (~300 Ko) chargé en différé — réduit le TBT sur le chargement initial
// Corrige : "Reduce JavaScript execution time" — Lighthouse Performance
const SGRHistoryChart = dynamic(() => import("./SGRHistoryChart"), {
  ssr: false,
  loading: () => (
    <div className="h-24 w-full bg-base-200 animate-pulse rounded-lg mt-4" />
  ),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SGRWidgetProps {
  projectId: string;
  /** Incrémenter cette valeur depuis le parent pour forcer un recalcul */
  refreshKey?: number;
}

// ---------------------------------------------------------------------------
// Helpers d'affichage
// ---------------------------------------------------------------------------

/** Couleur DaisyUI selon le niveau de risque */
function couleurNiveau(niveau: SGRResult["niveau"]): string {
  switch (niveau) {
    case "low": return "badge-success";
    case "moderate": return "badge-warning";
    case "high": return "badge-error";
    case "critical": return "badge-error";
    default: return "badge-neutral";
  }
}

/** Couleur de la barre de progression selon le score */
function couleurBarre(score: number): string {
  if (score <= 30) return "progress-success";
  if (score <= 60) return "progress-warning";
  return "progress-error";
}

/** Libellé lisible pour chaque indicateur (5 seulement, sans github) */
const LABELS_INDICATEURS: Record<string, { label: string; icon: React.ReactNode }> = {
  wip: { label: "WIP Limit", icon: <AlertTriangle className="w-3 h-3" /> },
  cycleTime: { label: "Cycle Time", icon: <Clock className="w-3 h-3" /> },
  age: { label: "Task Age", icon: <Activity className="w-3 h-3" /> },
  throughput: { label: "Throughput", icon: <TrendingDown className="w-3 h-3" /> },
  tech: { label: "Tech Debt", icon: <Code2 className="w-3 h-3" /> },
  monteCarlo: { label: "Monte-Carlo", icon: <Activity className="w-3 h-3 text-primary" /> },
};

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

// Type d'un point d'historique retourné par getSGRHistory
type PointHistorique = Awaited<ReturnType<typeof getSGRHistory>>[number];

export default function SGRWidget({ projectId, refreshKey }: SGRWidgetProps) {
  const [result, setResult] = useState<(SGRResult & { notificationDecision?: NotificationDecision }) | null>(null);
  const [historique, setHistorique] = useState<PointHistorique[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const chargerSGR = async () => {
    setLoading(true);
    setErreur(null);
    try {
      // Calcul du SGR courant + récupération de l'historique en parallèle
      const [data, hist] = await Promise.all([
        getProjectSGR(projectId),
        getSGRHistory(projectId),
      ]);
      setResult(data);
      setHistorique(hist);
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "Impossible de calculer le SGR.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) chargerSGR();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, refreshKey]);

  // --- État de chargement ---
  if (loading) {
    return (
      <div className="p-5 border border-base-300 rounded-xl mb-6 flex items-center gap-2 text-sm text-base-content/60">
        <span className="loading loading-spinner loading-xs"></span>
        Calcul du SGR…
      </div>
    );
  }

  // --- État d'erreur ---
  if (erreur || !result) {
    return (
      <div className="p-5 border border-base-300 rounded-xl mb-6 text-sm text-error">
        {erreur ?? "Données SGR indisponibles."}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Rendu principal
  // ---------------------------------------------------------------------------
  return (
    <div className="p-5 border border-base-300 rounded-xl mb-6">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Global Risk Score</h3>
        <button
          onClick={chargerSGR}
          className="btn btn-ghost btn-xs"
          title="Recalculer le SGR"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Score principal + badge de décision */}
      <div className="flex items-center gap-3 mb-3">
        <div className="text-4xl font-bold tabular-nums">
          {result.sgr}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-base-content/50">/ 100</span>
          <span className={`badge badge-sm ${couleurNiveau(result.niveau)}`}>
            {result.niveau.toUpperCase()}
          </span>
        </div>
        {result.notificationDecision && result.notificationDecision.type !== 'SILENT' && (
          <div className="ml-auto flex flex-col items-end gap-1">
            <span className={`badge badge-sm ${result.notificationDecision.type === 'INSIGHT' ? 'badge-warning' : 'badge-error'}`}>
              {result.notificationDecision.type === 'INSIGHT' ? '⚡ Insight' : '🚨 Alert'}
            </span>
            <span className="text-xs text-base-content/40 text-right max-w-32 leading-tight">
              {result.notificationDecision.type === 'INSIGHT' ? 'Proactive action suggested' : 'Immediate action required'}
            </span>
          </div>
        )}
      </div>

      {/* Barre de progression globale */}
      <progress
        className={`progress w-full mb-4 ${couleurBarre(result.sgr)}`}
        value={result.sgr}
        max={100}
      />

      {/* Indicateurs détaillés */}
      <div className="space-y-2 mb-4">
        {(["wip", "cycleTime", "age", "throughput", "tech"] as const).map((cle) => {
          const indicateur = result.indicateurs[cle];
          const meta = LABELS_INDICATEURS[cle];
          return (
            <div key={cle} className="flex items-center gap-2">
              <span className="text-base-content/60">{meta?.icon}</span>
              <span className="text-xs text-base-content/70 w-20 shrink-0">
                {meta?.label}
              </span>
              <progress
                className={`progress flex-1 h-1.5 ${couleurBarre(indicateur.score)}`}
                value={indicateur.score}
                max={100}
              />
              <span className="text-xs tabular-nums w-8 text-right">
                {Math.round(indicateur.score)}
              </span>
            </div>
          );
        })}

      </div>

      {/* Distribution Monte-Carlo — affichée uniquement si SprintContext disponible */}
      {result.indicateurs.monteCarlo && result.indicateurs.monteCarlo.histogram.length > 0 && (
        <div className="border border-primary/20 rounded-xl p-3 mb-4 bg-primary/5">
          <MonteCarloDistributionChart
            histogram={result.indicateurs.monteCarlo.histogram}
            medianDays={result.indicateurs.monteCarlo.medianDaysToComplete}
            remainingDays={result.indicateurs.monteCarlo.remainingDays}
            probabilityOfDelay={result.indicateurs.monteCarlo.probabilityOfDelay}
          />
        </div>
      )}

      {/* Alertes actives */}
      {result.alertes.length > 0 && (
        <div className="space-y-1">
          {result.alertes.map((alerte, i) => (
            <div
              key={i}
              className="flex items-start gap-1.5 text-xs text-warning"
            >
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{alerte}</span>
            </div>
          ))}
        </div>
      )}

      {/* No alerts */}
      {result.alertes.length === 0 && (
        <p className="text-xs text-success">No active alerts.</p>
      )}

      {/* Graphique d'évolution temporelle du SGR */}
      <div className="border-t border-base-300 mt-4 pt-2">
        <SGRHistoryChart historique={historique} />
      </div>

      {/* Agent prescriptif LLM — activé à la demande */}
      <PrescriptivePanel
        projectId={projectId}
        sgrScore={result.sgr}
        sgrResult={result}
        sgrHistory={historique.map(h => ({ sgr: h.sgr, calculatedAt: h.createdAt }))}
      />
    </div>
  );
}
