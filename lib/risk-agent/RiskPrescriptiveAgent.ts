/**
 * Agent Prescriptif LLM — AI Risk Command Center.
 *
 * Architecture hybride (section mémoire 3.3) :
 *   Les métriques brutes (root causes, trend, Monte-Carlo) sont calculées
 *   de façon déterministe AVANT d'être envoyées au LLM. Le LLM produit
 *   uniquement ce qu'il sait faire : synthèse exécutive, catégorisation,
 *   recommandations actionnables. Zéro hallucination de chiffres.
 *
 * Prompt caching sur le system prompt (TTL 5 min) pour réduire la latence.
 */

import Anthropic from '@anthropic-ai/sdk';
import { LLMRiskPayload, LLMRiskAnalysisResponse, RootCauseItem, SGRTrend } from './types';
import { SGRResult } from '../risk-algorithm/types';

export const SEUIL_PRESCRIPTION = 40;
const MODEL = 'claude-sonnet-4-6';

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Tu es le moteur cognitif d'un AI Risk Command Center pour l'ingénierie logicielle Agile.

Tu reçois un vecteur de métriques DÉJÀ CALCULÉES (SGR, root causes, trend, Monte-Carlo).
Ton rôle n'est PAS de recalculer les chiffres — ils sont fournis et fiables.
Ton rôle EST de :
1. Synthétiser en 2-3 phrases l'état réel du projet (executiveSummary). Style directeur technique, pas académique.
2. Catégoriser le risque en 4 domaines (delivery/technical/team/process) en scores 0-100.
3. Produire 3 actions prescriptives CONCRÈTES et ASSIGNABLES. Format : verbe d'action + objet précis. Pas de généralités.
4. Évaluer le forecast : le risque augmente-t-il ? Pourquoi ?
5. Lister les raisons qui réduisent ta confiance (données manquantes, historique insuffisant).

RÈGLES STRICTES :
- executiveSummary : 2 phrases max, orientées décision, pas de chiffres déjà visibles dans l'UI
- actions : commencer par un verbe ("Geler", "Réduire", "Merger", "Planifier"), désigner un rôle précis
- confidenceReasons : uniquement si des données sont absentes ou insuffisantes
- Ne jamais répéter les chiffres du payload dans le texte (ils sont déjà affichés)
- Répondre UNIQUEMENT en JSON valide selon le schéma fourni`;

// ---------------------------------------------------------------------------
// Schema tool
// ---------------------------------------------------------------------------

const OUTPUT_SCHEMA = {
  type: 'object' as const,
  properties: {
    riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    executiveSummary: { type: 'string', description: '2 phrases max, orientées décision' },
    riskCategories: {
      type: 'object',
      properties: {
        delivery: { type: 'number', minimum: 0, maximum: 100 },
        technical: { type: 'number', minimum: 0, maximum: 100 },
        team: { type: 'number', minimum: 0, maximum: 100 },
        process: { type: 'number', minimum: 0, maximum: 100 },
      },
      required: ['delivery', 'technical', 'team', 'process'],
    },
    prescriptiveActions: {
      type: 'array',
      minItems: 2,
      maxItems: 4,
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
          actionItem: { type: 'string', description: 'Commence par un verbe d\'action précis' },
          responsibleRole: { type: 'string', enum: ['Scrum Master', 'Lead Developer', 'QA Engineer', 'Tech Lead', 'Product Owner'] },
          targetIndicator: { type: 'string', enum: ['WIP', 'CycleTime', 'TaskAge', 'Throughput', 'TechDebt', 'MonteCarlo', 'Global'] },
        },
        required: ['id', 'priority', 'actionItem', 'responsibleRole', 'targetIndicator'],
      },
    },
    predictiveForecast: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: '1 phrase de forecast basée sur la tendance' },
        riskIncreasing: { type: 'boolean' },
      },
      required: ['summary', 'riskIncreasing'],
    },
    confidenceReasons: {
      type: 'array',
      items: { type: 'string' },
      description: 'Raisons de confiance réduite — vide si toutes les données sont disponibles',
    },
    confidenceScore: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: ['riskLevel', 'executiveSummary', 'riskCategories', 'prescriptiveActions', 'predictiveForecast', 'confidenceReasons', 'confidenceScore'],
};

// ---------------------------------------------------------------------------
// Calcul déterministe des root causes depuis SGRResult
// ---------------------------------------------------------------------------

export function computeRootCauses(sgrResult: SGRResult): RootCauseItem[] {
  const ind = sgrResult.indicateurs;
  const items: RootCauseItem[] = [
    { indicator: 'WIP', label: 'WIP Saturation', score: ind.wip.score, contribution: Math.round(ind.wip.contribution * 0.5), direction: ind.wip.score > 30 ? 'RISK' : 'SAFE' },
    { indicator: 'CycleTime', label: 'Cycle Time', score: ind.cycleTime.score, contribution: Math.round(ind.cycleTime.contribution * 0.5), direction: ind.cycleTime.score > 30 ? 'RISK' : 'SAFE' },
    { indicator: 'TaskAge', label: 'Task Age', score: ind.age.score, contribution: Math.round(ind.age.contribution * 0.5), direction: ind.age.score > 30 ? 'RISK' : 'SAFE' },
    { indicator: 'Throughput', label: 'Throughput', score: ind.throughput.score, contribution: Math.round(ind.throughput.contribution * 0.5), direction: ind.throughput.score > 30 ? 'RISK' : 'SAFE' },
    { indicator: 'TechDebt', label: 'Technical Debt', score: ind.tech.score, contribution: Math.round(ind.tech.contribution * 0.2), direction: ind.tech.score > 30 ? 'RISK' : 'SAFE' },
  ];
  if (ind.monteCarlo) {
    items.push({
      indicator: 'MonteCarlo',
      label: 'Delay Probability',
      score: ind.monteCarlo.score,
      contribution: Math.round(ind.monteCarlo.contribution * 0.5),
      direction: ind.monteCarlo.probabilityOfDelay > 0.3 ? 'RISK' : 'SAFE',
    });
  }
  return items.sort((a, b) => b.contribution - a.contribution);
}

// ---------------------------------------------------------------------------
// Calcul déterministe de la tendance SGR
// ---------------------------------------------------------------------------

export function computeTrend(
  currentSgr: number,
  history: { sgr: number; calculatedAt: Date }[]
): SGRTrend {
  if (history.length < 2) {
    return { direction: 'STABLE', delta: 0, period: '—', previousSgr: currentSgr, currentSgr };
  }
  const now = new Date();
  const h48 = new Date(now.getTime() - 48 * 3600_000);
  const recent = history.filter(h => new Date(h.calculatedAt) >= h48);
  const previousSgr = recent.length > 0 ? recent[0].sgr : history[history.length - 2].sgr;
  const delta = Math.round((currentSgr - previousSgr) * 10) / 10;
  return {
    direction: Math.abs(delta) < 2 ? 'STABLE' : delta > 0 ? 'UP' : 'DOWN',
    delta,
    period: recent.length > 0 ? '48h' : `${history.length} mesures`,
    previousSgr,
    currentSgr,
  };
}

// ---------------------------------------------------------------------------
// buildPayload
// ---------------------------------------------------------------------------

export function buildPayload(
  sgrResult: SGRResult,
  activeWIP: number,
  history: { sgr: number; calculatedAt: Date }[]
): LLMRiskPayload {
  const mc = sgrResult.indicateurs.monteCarlo ?? null;
  return {
    sgrScore: sgrResult.sgr,
    niveau: sgrResult.niveau,
    rootCauses: computeRootCauses(sgrResult),
    trend: computeTrend(sgrResult.sgr, history),
    metricsSnapshot: {
      monteCarloDelayProbability: mc?.probabilityOfDelay ?? null,
      medianDaysToComplete: mc?.medianDaysToComplete ?? null,
      p85DaysToComplete: mc?.p85DaysToComplete ?? null,
      activeWIP,
      remainingWorkItems: mc ? (sgrResult.indicateurs.monteCarlo as { remainingDays?: number })?.remainingDays ?? 0 : 0,
    },
    projectContext: {
      activeAlerts: sgrResult.alertes.length,
      alertMessages: sgrResult.alertes,
    },
  };
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export class RiskPrescriptiveAgent {
  private readonly client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY });
  }

  async analyze(payload: LLMRiskPayload): Promise<LLMRiskAnalysisResponse> {
    const mcLine = payload.metricsSnapshot.monteCarloDelayProbability !== null
      ? `Monte-Carlo delay probability: ${Math.round((payload.metricsSnapshot.monteCarloDelayProbability ?? 0) * 100)}% (median ${payload.metricsSnapshot.medianDaysToComplete}d, P85 ${payload.metricsSnapshot.p85DaysToComplete}d).`
      : 'Monte-Carlo: not available.';

    const rootCauseLine = payload.rootCauses
      .map(rc => `${rc.label}: ${rc.score}/100 (${rc.direction}, +${rc.contribution}pts SGR)`)
      .join(' | ');

    const trendLine = `SGR trend: ${payload.trend.direction} ${payload.trend.delta > 0 ? '+' : ''}${payload.trend.delta} pts over ${payload.trend.period} (${payload.trend.previousSgr} → ${payload.trend.currentSgr}).`;

    const userMessage = `SGR=${payload.sgrScore}/100 (${payload.niveau.toUpperCase()}).
${trendLine}
Root causes: ${rootCauseLine}
${mcLine}
Active WIP: ${payload.metricsSnapshot.activeWIP}.
Alerts: ${payload.projectContext.alertMessages.join('; ') || 'none'}.

Génère l'analyse prescriptive selon le schéma fourni.`;

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 900,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      tools: [{
        name: 'risk_command_center',
        description: 'Génère l\'analyse structurée du Risk Command Center',
        input_schema: OUTPUT_SCHEMA,
      }],
      tool_choice: { type: 'tool', name: 'risk_command_center' },
      messages: [{ role: 'user', content: userMessage }],
    });

    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('RiskPrescriptiveAgent: pas de tool_use dans la réponse');
    }

    const p = toolUse.input as LLMRiskAnalysisResponse;
    return {
      riskLevel: p.riskLevel ?? 'MEDIUM',
      executiveSummary: p.executiveSummary ?? '',
      riskCategories: p.riskCategories ?? { delivery: 0, technical: 0, team: 0, process: 0 },
      prescriptiveActions: Array.isArray(p.prescriptiveActions) ? p.prescriptiveActions : [],
      predictiveForecast: p.predictiveForecast ?? { summary: '', riskIncreasing: false },
      confidenceReasons: Array.isArray(p.confidenceReasons) ? p.confidenceReasons : [],
      confidenceScore: p.confidenceScore ?? 0.5,
    };
  }
}
