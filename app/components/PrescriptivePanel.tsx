"use client"

/**
 * PrescriptivePanel — Affiche les contre-mesures générées par l'agent LLM.
 *
 * Présente :
 *   - Le niveau de risque global et le score de confiance
 *   - L'analyse de la cause racine (corrélation des métriques)
 *   - L'évaluation d'impact (technique + opérationnel)
 *   - Les actions prescriptives ordonnées par priorité
 *
 * Section mémoire : 3.4 — Interface du SAD prescriptif
 */

import { useState, useRef } from "react";
import { Brain, AlertTriangle, ChevronDown, ChevronUp, Loader2, Zap } from "lucide-react";
import { generateRiskPrescription, PrescriptionError } from "@/app/actions";
import { LLMRiskAnalysisResponse, ActionPriority } from "@/lib/risk-agent/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PrescriptivePanelProps {
  projectId: string;
  /** Masque le bouton si SGR < seuil (déterminé par le parent) */
  sgrScore: number;
}

// ---------------------------------------------------------------------------
// Helpers d'affichage
// ---------------------------------------------------------------------------

function couleurPriorité(p: ActionPriority): string {
  switch (p) {
    case 'HIGH':   return 'badge-error';
    case 'MEDIUM': return 'badge-warning';
    case 'LOW':    return 'badge-success';
  }
}

function couleurRiskLevel(level: LLMRiskAnalysisResponse['riskLevel']): string {
  switch (level) {
    case 'LOW':      return 'text-success';
    case 'MEDIUM':   return 'text-warning';
    case 'HIGH':     return 'text-error';
    case 'CRITICAL': return 'text-error font-bold';
  }
}

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export default function PrescriptivePanel({ projectId, sgrScore }: PrescriptivePanelProps) {
  const [analyse, setAnalyse]         = useState<LLMRiskAnalysisResponse | null>(null);
  const [loading, setLoading]         = useState(false);
  const [erreur, setErreur]           = useState<string | null>(null);
  const [expanded, setExpanded]       = useState(true);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cooldown 3 min entre deux appels LLM pour éviter les coûts accidentels
  const COOLDOWN_SECONDS = 180;

  const startCooldown = () => {
    setCooldownLeft(COOLDOWN_SECONDS);
    const timer = setInterval(() => {
      setCooldownLeft(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    cooldownTimer.current = timer;
  };

  const lancer = async () => {
    if (loading || cooldownLeft > 0) return;
    setLoading(true);
    setErreur(null);
    setAnalyse(null);
    try {
      const result = await generateRiskPrescription(projectId);
      // Résultat valide
      if ('riskLevel' in result) {
        setAnalyse(result as LLMRiskAnalysisResponse);
        setExpanded(true);
        return;
      }
      // Erreur typée
      const err = result as PrescriptionError;
      if (err.type === 'NO_API_KEY') {
        setErreur("ANTHROPIC_API_KEY not configured on server.");
      } else if (err.type === 'BELOW_THRESHOLD') {
        setErreur(`SGR ${err.sgr}/100 is below threshold (${err.threshold}). No action needed.`);
      } else {
        setErreur(`Analysis error: ${err.message}`);
      }
    } catch {
      setErreur("Analysis failed. Check server logs.");
    } finally {
      setLoading(false);
      startCooldown(); // démarre le cooldown après chaque appel (succès ou erreur)
    }
  };

  // Si SGR < 40 et aucune analyse existante, on affiche un état discret
  const seuil = 40;

  return (
    <div className="border-t border-base-300 mt-4 pt-4">
      {/* En-tête avec bouton d'activation */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">AI Prescriptive Analysis</span>
          {analyse && analyse.confidenceScore != null && (
            <span className="text-xs text-base-content/40">
              · confidence {Math.round(analyse.confidenceScore * 100)}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {analyse && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="btn btn-ghost btn-xs"
              title={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          <button
            onClick={lancer}
            disabled={loading || cooldownLeft > 0}
            className={`btn btn-xs ${sgrScore >= seuil && cooldownLeft === 0 ? 'btn-primary' : 'btn-ghost'}`}
            title={
              cooldownLeft > 0
                ? `Available in ${cooldownLeft}s`
                : sgrScore < seuil ? `SGR < ${seuil} — low risk` : 'Run AI analysis'
            }
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Zap className="w-3 h-3" />
            )}
            {loading ? 'Analyzing…' : cooldownLeft > 0 ? `${cooldownLeft}s` : 'Analyze'}
          </button>
        </div>
      </div>

      {/* Erreur */}
      {erreur && (
        <div className="flex items-center gap-1.5 text-xs text-base-content/50 mb-2">
          <AlertTriangle className="w-3 h-3" />
          {erreur}
        </div>
      )}

      {/* Résultat */}
      {analyse && expanded && (
        <div className="space-y-3">
          {/* Niveau de risque */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-base-content/60">Risk level:</span>
            <span className={`text-xs font-semibold ${couleurRiskLevel(analyse.riskLevel ?? 'LOW')}`}>
              {analyse.riskLevel ?? '—'}
            </span>
          </div>

          {/* Cause racine */}
          {analyse.rootCauseAnalysis && (
            <div className="bg-base-200 rounded-lg p-3">
              <p className="text-xs font-medium mb-1 text-base-content/70">Root Cause Analysis</p>
              <p className="text-xs text-base-content/80 leading-relaxed">
                {analyse.rootCauseAnalysis}
              </p>
            </div>
          )}

          {/* Impact */}
          {analyse.impactAssessment && (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-base-200 rounded-lg p-2">
                <p className="text-xs font-medium mb-1 text-base-content/60">Technical Impact</p>
                <p className="text-xs text-base-content/70 leading-relaxed">
                  {analyse.impactAssessment.technicalImpact ?? '—'}
                </p>
              </div>
              <div className="bg-base-200 rounded-lg p-2">
                <p className="text-xs font-medium mb-1 text-base-content/60">Operational Impact</p>
                <p className="text-xs text-base-content/70 leading-relaxed">
                  {analyse.impactAssessment.operationalImpact ?? '—'}
                </p>
              </div>
            </div>
          )}

          {/* Actions prescriptives */}
          {Array.isArray(analyse.prescriptiveActions) && analyse.prescriptiveActions.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2 text-base-content/70">Prescriptive Actions</p>
              <div className="space-y-2">
                {analyse.prescriptiveActions.map((action, idx) => (
                  <div
                    key={action.id ?? idx}
                    className="flex items-start gap-2 p-2 bg-base-200 rounded-lg"
                  >
                    <span className={`badge badge-xs mt-0.5 shrink-0 ${couleurPriorité(action.priority ?? 'LOW')}`}>
                      {action.priority ?? 'LOW'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-base-content/90 leading-snug">
                        {action.actionItem}
                      </p>
                      <p className="text-xs text-base-content/40 mt-0.5">
                        {action.responsibleRole} · {action.targetIndicator}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
