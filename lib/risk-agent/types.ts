/**
 * Contrat d'interface de l'Agent Prescriptif LLM.
 *
 * Le payload d'entrée capture le vecteur de métriques complet du projet.
 * La réponse JSON structurée est garantie par le mode structured outputs
 * de l'API Anthropic — pas de parsing fragile de texte libre.
 *
 * Section mémoire : 3.3 — Agent prescriptif génératif
 */

// ---------------------------------------------------------------------------
// Entrée de l'agent
// ---------------------------------------------------------------------------

export interface LLMRiskPayload {
  sgrScore: number;
  niveau: 'low' | 'moderate' | 'high' | 'critical';
  metricsSnapshot: {
    /** P_delai ∈ [0, 1] issu de Monte-Carlo — null si SprintContext absent */
    monteCarloDelayProbability: number | null;
    /** Médiane en jours — null si Monte-Carlo non activé */
    medianDaysToComplete: number | null;
    /** Score WIP normalisé [0, 100] */
    wipScore: number;
    /** Score Cycle Time normalisé [0, 100] */
    cycleTimeScore: number;
    /** Score âge des tâches [0, 100] */
    ageScore: number;
    /** Score débit [0, 100] */
    throughputScore: number;
    /** Score dette technique [0, 100] */
    techDebtScore: number;
  };
  projectContext: {
    /** Nombre de tâches en cours */
    activeWIP: number;
    /** Nombre d'alertes actives */
    activeAlerts: number;
    /** Alertes textuelles actives */
    alertMessages: string[];
  };
}

// ---------------------------------------------------------------------------
// Sortie de l'agent
// ---------------------------------------------------------------------------

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ActionPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type ResponsibleRole = 'Scrum Master' | 'Lead Developer' | 'QA Engineer' | 'Tech Lead' | 'Product Owner';

export interface PrescriptiveAction {
  id: string;
  priority: ActionPriority;
  /** Action concrète assignable immédiatement */
  actionItem: string;
  /** Rôle Scrum responsable de l'exécution */
  responsibleRole: ResponsibleRole;
  /** Indicateur SGR ciblé par cette action */
  targetIndicator: 'WIP' | 'CycleTime' | 'TaskAge' | 'Throughput' | 'TechDebt' | 'MonteCarlo' | 'Global';
}

export interface LLMRiskAnalysisResponse {
  riskLevel: RiskLevel;
  /** Explication scientifique de la corrélation des métriques */
  rootCauseAnalysis: string;
  impactAssessment: {
    technicalImpact: string;
    operationalImpact: string;
  };
  /** Actions prescriptives ordonnées par priorité décroissante */
  prescriptiveActions: PrescriptiveAction[];
  /** Confiance de l'analyse (0–1) basée sur la richesse des métriques disponibles */
  confidenceScore: number;
}
