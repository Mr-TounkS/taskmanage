/**
 * Contrat d'interface de l'Agent Prescriptif LLM — AI Risk Command Center.
 *
 * Architecture hybride (section mémoire 3.3) :
 *   - Données déterministes (root causes, trend, forecast) : calculées depuis SGRResult
 *   - Données génératives (summary, recommandations, catégories) : produites par le LLM
 *
 * Cette séparation garantit que le LLM interprète des faits réels plutôt que
 * des données hallucinées — critère de crédibilité scientifique pour le jury.
 */

// ---------------------------------------------------------------------------
// Payload d'entrée
// ---------------------------------------------------------------------------

export interface RootCauseItem {
  indicator: 'WIP' | 'CycleTime' | 'TaskAge' | 'Throughput' | 'TechDebt' | 'MonteCarlo';
  label: string;
  score: number;        // Score brut [0-100]
  contribution: number; // Points de SGR imputables à cet indicateur (peut être négatif = positif)
  direction: 'RISK' | 'SAFE';
}

export interface SGRTrend {
  direction: 'UP' | 'DOWN' | 'STABLE';
  delta: number;        // Variation absolue du SGR sur la période
  period: string;       // "48h", "7d", etc.
  previousSgr: number;
  currentSgr: number;
}

export interface LLMRiskPayload {
  sgrScore: number;
  niveau: 'low' | 'moderate' | 'high' | 'critical';
  // Root causes calculées depuis SGRResult (données réelles, non hallucinées)
  rootCauses: RootCauseItem[];
  // Tendance calculée depuis l'historique DB
  trend: SGRTrend;
  metricsSnapshot: {
    monteCarloDelayProbability: number | null;
    medianDaysToComplete: number | null;
    p85DaysToComplete: number | null;
    activeWIP: number;
    remainingWorkItems: number;
  };
  projectContext: {
    activeAlerts: number;
    alertMessages: string[];
  };
}

// ---------------------------------------------------------------------------
// Réponse de l'agent
// ---------------------------------------------------------------------------

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ActionPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type ResponsibleRole = 'Scrum Master' | 'Lead Developer' | 'QA Engineer' | 'Tech Lead' | 'Product Owner';

export interface PrescriptiveAction {
  id: string;
  priority: ActionPriority;
  actionItem: string;
  responsibleRole: ResponsibleRole;
  targetIndicator: 'WIP' | 'CycleTime' | 'TaskAge' | 'Throughput' | 'TechDebt' | 'MonteCarlo' | 'Global';
}

export interface RiskCategories {
  delivery: number;   // 0-100
  technical: number;
  team: number;
  process: number;
}

export interface LLMRiskAnalysisResponse {
  riskLevel: RiskLevel;
  /** 2-3 phrases max — synthèse exécutive orientée décision */
  executiveSummary: string;
  /** Catégorisation du risque par domaine */
  riskCategories: RiskCategories;
  /** Actions prescriptives concrètes et immédiatement assignables */
  prescriptiveActions: PrescriptiveAction[];
  /** Prévision probabiliste basée sur Monte-Carlo */
  predictiveForecast: {
    summary: string;
    riskIncreasing: boolean;
  };
  /** Raisons expliquant pourquoi la confiance est réduite */
  confidenceReasons: string[];
  confidenceScore: number;
}
