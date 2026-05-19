"use client"

/**
 * PrescriptivePanel — AI Risk Command Center.
 *
 * 6 blocs structurés (section mémoire 3.4) :
 *   1. Executive Summary
 *   2. Root Cause Tree (calculé depuis SGRResult — données réelles)
 *   3. Risk Categories (Delivery / Technical / Team / Process)
 *   4. Recommended Actions (numérotées, assignées)
 *   5. Predictive Forecast
 *   6. Confidence & missing data
 */

import { useState, useRef } from "react";
import { Brain, AlertTriangle, Loader2, Zap, TrendingUp, TrendingDown, Minus,
         ChevronDown, ChevronUp, Target, BarChart3, Lightbulb, ShieldAlert } from "lucide-react";
import { generateRiskPrescription, PrescriptionError } from "@/app/actions";
import { LLMRiskAnalysisResponse, ActionPriority, RiskLevel } from "@/lib/risk-agent/types";
import { computeRootCauses, computeTrend } from "@/lib/risk-agent/riskUtils";
import { SGRResult } from "@/lib/risk-algorithm/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PrescriptivePanelProps {
  projectId: string;
  sgrScore: number;
  sgrResult?: SGRResult;
  sgrHistory?: { sgr: number; calculatedAt: string }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function riskColor(level: RiskLevel | undefined): string {
  switch (level) {
    case 'LOW':      return 'text-success';
    case 'MEDIUM':   return 'text-warning';
    case 'HIGH':     return 'text-error';
    case 'CRITICAL': return 'text-error font-bold animate-pulse';
    default:         return 'text-base-content';
  }
}

function riskBg(level: RiskLevel | undefined): string {
  switch (level) {
    case 'LOW':      return 'border-success/30 bg-success/5';
    case 'MEDIUM':   return 'border-warning/30 bg-warning/5';
    case 'HIGH':     return 'border-error/30 bg-error/5';
    case 'CRITICAL': return 'border-error/50 bg-error/10';
    default:         return 'border-base-300 bg-base-100';
  }
}

function priorityBadge(p: ActionPriority): string {
  switch (p) {
    case 'HIGH':   return 'badge-error';
    case 'MEDIUM': return 'badge-warning';
    case 'LOW':    return 'badge-success';
  }
}

function categoryColor(score: number): string {
  if (score >= 70) return 'text-error';
  if (score >= 40) return 'text-warning';
  return 'text-success';
}

function categoryBar(score: number): string {
  if (score >= 70) return 'progress-error';
  if (score >= 40) return 'progress-warning';
  return 'progress-success';
}

// ---------------------------------------------------------------------------
// Sous-composants
// ---------------------------------------------------------------------------

function TrendBadge({ direction, delta }: { direction: string; delta: number }) {
  if (direction === 'UP') return (
    <span className="flex items-center gap-0.5 text-xs text-error font-semibold">
      <TrendingUp className="w-3 h-3" /> +{delta} pts
    </span>
  );
  if (direction === 'DOWN') return (
    <span className="flex items-center gap-0.5 text-xs text-success font-semibold">
      <TrendingDown className="w-3 h-3" /> {delta} pts
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-xs text-base-content/50">
      <Minus className="w-3 h-3" /> stable
    </span>
  );
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function PrescriptivePanel({
  projectId, sgrScore, sgrResult, sgrHistory,
}: PrescriptivePanelProps) {
  const [analyse, setAnalyse]           = useState<LLMRiskAnalysisResponse | null>(null);
  const [loading, setLoading]           = useState(false);
  const [erreur, setErreur]             = useState<string | null>(null);
  const [expanded, setExpanded]         = useState(true);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const cooldownTimer                   = useRef<ReturnType<typeof setInterval> | null>(null);

  const SEUIL = 40;
  const COOLDOWN = 180;

  const startCooldown = () => {
    setCooldownLeft(COOLDOWN);
    const t = setInterval(() => setCooldownLeft(p => { if (p <= 1) { clearInterval(t); return 0; } return p - 1; }), 1000);
    cooldownTimer.current = t;
  };

  const lancer = async () => {
    if (loading || cooldownLeft > 0) return;
    setLoading(true); setErreur(null); setAnalyse(null);
    try {
      const result = await generateRiskPrescription(projectId);
      if ('riskLevel' in result) {
        setAnalyse(result as LLMRiskAnalysisResponse);
        setExpanded(true);
      } else {
        const err = result as PrescriptionError;
        if (err.type === 'NO_API_KEY') setErreur('ANTHROPIC_API_KEY not configured.');
        else if (err.type === 'BELOW_THRESHOLD') setErreur(`SGR ${err.sgr}/100 below threshold (${err.threshold}).`);
        else setErreur(`Error: ${err.message}`);
      }
    } catch { setErreur('Analysis failed. Check server logs.'); }
    finally { setLoading(false); startCooldown(); }
  };

  // Root causes calculées localement depuis SGRResult (données réelles, non hallucinées)
  const rootCauses = sgrResult ? computeRootCauses(sgrResult) : [];
  const trend = sgrResult && sgrHistory
    ? computeTrend(sgrScore, sgrHistory.map(h => ({ sgr: h.sgr, calculatedAt: new Date(h.calculatedAt) })))
    : null;

  return (
    <div className="border-t border-base-300 mt-4 pt-4">

      {/* En-tête */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wide">AI Risk Command Center</span>
          {analyse && (
            <span className="text-xs text-base-content/40">· {Math.round(analyse.confidenceScore * 100)}% confidence</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {analyse && (
            <button onClick={() => setExpanded(!expanded)} className="btn btn-ghost btn-xs">
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          <button
            onClick={lancer}
            disabled={loading || cooldownLeft > 0}
            className={`btn btn-xs ${sgrScore >= SEUIL && cooldownLeft === 0 ? 'btn-primary' : 'btn-ghost'}`}
            title={cooldownLeft > 0 ? `Available in ${cooldownLeft}s` : 'Run AI analysis'}
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            {loading ? 'Analyzing…' : cooldownLeft > 0 ? `${cooldownLeft}s` : 'Analyze'}
          </button>
        </div>
      </div>

      {erreur && (
        <div className="flex items-center gap-1.5 text-xs text-base-content/50 mb-2">
          <AlertTriangle className="w-3 h-3" />{erreur}
        </div>
      )}

      {/* Root Cause Tree — affiché dès que SGRResult est disponible, sans cliquer */}
      {rootCauses.length > 0 && (
        <div className="mb-3 bg-base-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-base-content/70 flex items-center gap-1">
              <BarChart3 className="w-3 h-3" /> SGR {sgrScore} — Root Cause Breakdown
            </p>
            {trend && <TrendBadge direction={trend.direction} delta={trend.delta} />}
          </div>
          <div className="space-y-1.5">
            {rootCauses.map(rc => (
              <div key={rc.indicator} className="flex items-center gap-2">
                <span className={`text-xs w-24 shrink-0 ${rc.direction === 'RISK' ? 'text-error/80' : 'text-success/80'}`}>
                  {rc.label}
                </span>
                <progress
                  className={`progress flex-1 h-1.5 ${rc.direction === 'RISK' ? 'progress-error' : 'progress-success'}`}
                  value={rc.score} max={100}
                />
                <span className={`text-xs tabular-nums w-10 text-right font-medium ${rc.direction === 'RISK' ? 'text-error' : 'text-success'}`}>
                  {rc.direction === 'RISK' ? '+' : ''}{rc.contribution}
                </span>
              </div>
            ))}
          </div>
          {trend && (
            <p className="text-xs text-base-content/40 mt-2 text-right">
              {trend.previousSgr} → {trend.currentSgr} over {trend.period}
            </p>
          )}
        </div>
      )}

      {/* Résultat LLM */}
      {analyse && expanded && (
        <div className={`space-y-3 border rounded-xl p-3 ${riskBg(analyse.riskLevel)}`}>

          {/* 1 — Executive Summary */}
          <div>
            <p className="text-xs font-semibold text-base-content/60 mb-1 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              <span className={riskColor(analyse.riskLevel)}>{analyse.riskLevel}</span>
              &nbsp;— Executive Summary
            </p>
            <p className="text-xs text-base-content/90 leading-relaxed">
              {analyse.executiveSummary}
            </p>
          </div>

          {/* 2 — Risk Categories */}
          {analyse.riskCategories && (
            <div>
              <p className="text-xs font-semibold text-base-content/60 mb-1.5 flex items-center gap-1">
                <Target className="w-3 h-3" /> Risk Categories
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {(Object.entries(analyse.riskCategories) as [string, number][]).map(([cat, score]) => (
                  <div key={cat} className="flex items-center gap-1.5">
                    <span className="text-xs text-base-content/60 w-16 capitalize">{cat}</span>
                    <progress className={`progress flex-1 h-1.5 ${categoryBar(score)}`} value={score} max={100} />
                    <span className={`text-xs tabular-nums w-7 text-right font-medium ${categoryColor(score)}`}>{score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3 — Recommended Actions */}
          {Array.isArray(analyse.prescriptiveActions) && analyse.prescriptiveActions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-base-content/60 mb-1.5 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" /> Recommended Actions
              </p>
              <div className="space-y-1.5">
                {analyse.prescriptiveActions.map((action, idx) => (
                  <div key={action.id ?? idx} className="flex items-start gap-2">
                    <span className="text-xs text-base-content/40 w-4 shrink-0 tabular-nums">{idx + 1}.</span>
                    <span className={`badge badge-xs mt-0.5 shrink-0 ${priorityBadge(action.priority)}`}>
                      {action.priority}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-base-content/90 leading-snug font-medium">
                        {action.actionItem}
                      </p>
                      <p className="text-xs text-base-content/40">
                        {action.responsibleRole}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4 — Predictive Forecast */}
          {analyse.predictiveForecast?.summary && (
            <div className="bg-base-300/40 rounded-lg px-3 py-2 flex items-start gap-2">
              {analyse.predictiveForecast.riskIncreasing
                ? <TrendingUp className="w-3.5 h-3.5 text-error mt-0.5 shrink-0" />
                : <TrendingDown className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />}
              <p className="text-xs text-base-content/80 leading-snug">
                {analyse.predictiveForecast.summary}
              </p>
            </div>
          )}

          {/* 5 — Confidence */}
          {Array.isArray(analyse.confidenceReasons) && analyse.confidenceReasons.length > 0 && (
            <div className="border-t border-base-300 pt-2">
              <p className="text-xs text-base-content/40 mb-1">
                Confidence reduced ({Math.round(analyse.confidenceScore * 100)}%):
              </p>
              {analyse.confidenceReasons.map((r, i) => (
                <p key={i} className="text-xs text-base-content/40 flex items-center gap-1">
                  <span>·</span> {r}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
