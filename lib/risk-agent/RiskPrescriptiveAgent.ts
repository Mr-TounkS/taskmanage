/**
 * Agent Prescriptif LLM — Service de domaine pour la génération de contre-mesures.
 *
 * Pattern d'intégration (section mémoire 3.3) :
 *   [SGR Engine] → SGR > seuil → [RiskPrescriptiveAgent] → JSON structuré → UI
 *
 * L'agent exploite :
 *   - Le vecteur de métriques SGR complet (dont P_delai Monte-Carlo)
 *   - Le mode "structured outputs" de l'API Anthropic pour garantir un JSON valide
 *   - Le prompt caching pour minimiser la latence et les coûts (TTL 5 min)
 *
 * Respecte la Clean Architecture : aucune dépendance vers Prisma, Next.js ou React.
 */

import Anthropic from '@anthropic-ai/sdk';
import { LLMRiskPayload, LLMRiskAnalysisResponse } from './types';
import { SGRResult } from '../risk-algorithm/types';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Seuil SGR au-dessus duquel l'agent est invoqué */
export const SEUIL_PRESCRIPTION = 40;

/** Modèle utilisé — Sonnet 4.6 : meilleur ratio qualité/coût pour l'analyse de risques */
const MODEL = 'claude-sonnet-4-6';

// ---------------------------------------------------------------------------
// System prompt (mis en cache côté API — TTL 5 min)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Tu es l'agent cognitif principal d'un Système d'Aide à la Décision (SAD) pour l'ingénierie logicielle agile de pointe.

Ton rôle est d'analyser un vecteur d'anomalies techniques (SGR, probabilité stochastique Monte-Carlo, métriques Kanban et dette technique) afin de diagnostiquer la cause racine des risques projet et de prescrire des contre-mesures chirurgicales.

Consignes strictes d'analyse :
1. Si monteCarloDelayProbability est fourni, corrèle-le avec les autres indicateurs (ex: P_delai élevé + Throughput faible + Age élevé = risque de retard sprint confirmé empiriquement).
2. Ne paraphrase pas les chiffres. Apporte une interprétation métier et d'architecture logicielle.
3. Formule des recommandations actionnables, concrètes et assignables à des rôles précis (Scrum Master, Lead Developer, QA Engineer, Tech Lead, Product Owner).
4. confidenceScore doit refléter la richesse des données : augmente si Monte-Carlo est disponible, diminue si les métriques sont à 0 (données insuffisantes).
5. Génère entre 2 et 4 actions prescriptives, ordonnées par priorité décroissante (HIGH en premier).

IMPORTANT : Réponds UNIQUEMENT avec le JSON valide, aucun texte explicatif en dehors.`;

// ---------------------------------------------------------------------------
// Schéma JSON pour les structured outputs Anthropic
// ---------------------------------------------------------------------------

const OUTPUT_SCHEMA = {
  type: 'object' as const,
  properties: {
    riskLevel: {
      type: 'string',
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      description: 'Niveau de risque global synthétisé',
    },
    rootCauseAnalysis: {
      type: 'string',
      description: 'Analyse de la cause racine — corrélation scientifique des métriques (2-3 phrases)',
    },
    impactAssessment: {
      type: 'object',
      properties: {
        technicalImpact: { type: 'string', description: 'Impact sur la qualité et la dette technique' },
        operationalImpact: { type: 'string', description: 'Impact sur les délais et la livraison' },
      },
      required: ['technicalImpact', 'operationalImpact'],
    },
    prescriptiveActions: {
      type: 'array',
      minItems: 2,
      maxItems: 4,
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Identifiant unique de l action (ex: ACT-001)' },
          priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
          actionItem: { type: 'string', description: 'Action concrète et immédiatement exécutable' },
          responsibleRole: {
            type: 'string',
            enum: ['Scrum Master', 'Lead Developer', 'QA Engineer', 'Tech Lead', 'Product Owner'],
          },
          targetIndicator: {
            type: 'string',
            enum: ['WIP', 'CycleTime', 'TaskAge', 'Throughput', 'TechDebt', 'MonteCarlo', 'Global'],
          },
        },
        required: ['id', 'priority', 'actionItem', 'responsibleRole', 'targetIndicator'],
      },
    },
    confidenceScore: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Confiance dans l analyse (0 = données insuffisantes, 1 = métriques complètes)',
    },
  },
  required: ['riskLevel', 'rootCauseAnalysis', 'impactAssessment', 'prescriptiveActions', 'confidenceScore'],
};

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

/**
 * Construit le payload LLM à partir du résultat SGR et du contexte projet.
 * Centralise la transformation pour éviter la duplication dans actions.ts.
 */
export function buildPayload(sgrResult: SGRResult, activeWIP: number): LLMRiskPayload {
  const mc = sgrResult.indicateurs.monteCarlo ?? null;
  return {
    sgrScore: sgrResult.sgr,
    niveau: sgrResult.niveau,
    metricsSnapshot: {
      monteCarloDelayProbability: mc?.probabilityOfDelay ?? null,
      medianDaysToComplete: mc?.medianDaysToComplete ?? null,
      wipScore: sgrResult.indicateurs.wip.score,
      cycleTimeScore: sgrResult.indicateurs.cycleTime.score,
      ageScore: sgrResult.indicateurs.age.score,
      throughputScore: sgrResult.indicateurs.throughput.score,
      techDebtScore: sgrResult.indicateurs.tech.score,
    },
    projectContext: {
      activeWIP,
      activeAlerts: sgrResult.alertes.length,
      alertMessages: sgrResult.alertes,
    },
  };
}

// ---------------------------------------------------------------------------
// Agent principal
// ---------------------------------------------------------------------------

export class RiskPrescriptiveAgent {
  private readonly client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Génère une analyse prescriptive structurée pour un résultat SGR donné.
   *
   * Utilise le prompt caching sur le system prompt (bloc "ephemeral") pour
   * réduire la latence des appels successifs (TTL 5 min côté API Anthropic).
   *
   * @param payload - Vecteur de métriques SGR complet
   * @returns Analyse JSON structurée avec causes racines et actions prescriptives
   * @throws Error si l'API est indisponible ou la réponse n'est pas parseable
   */
  async analyze(payload: LLMRiskPayload): Promise<LLMRiskAnalysisResponse> {
    const userMessage = `Analyse ce vecteur de métriques SGR et génère les contre-mesures prescriptives :

\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\`

Rappel du contexte : SGR = ${payload.sgrScore}/100 (niveau : ${payload.niveau.toUpperCase()}).
${payload.metricsSnapshot.monteCarloDelayProbability !== null
  ? `Probabilité Monte-Carlo de retard sprint : ${Math.round(payload.metricsSnapshot.monteCarloDelayProbability * 100)}%.`
  : 'Monte-Carlo non activé (contexte sprint absent).'}`;

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          // Prompt caching : le system prompt est mis en cache pour 5 minutes
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [
        {
          name: 'generate_risk_analysis',
          description: 'Génère une analyse de risque structurée avec causes racines et actions prescriptives',
          input_schema: OUTPUT_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'generate_risk_analysis' },
      messages: [{ role: 'user', content: userMessage }],
    });

    // Extraction du résultat depuis l'appel d'outil forcé
    const toolUse = response.content.find((b) => b.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('RiskPrescriptiveAgent: pas de tool_use dans la réponse');
    }

    const parsed = toolUse.input as LLMRiskAnalysisResponse;

    // Garde défensive : normalise les champs manquants pour éviter les crash React
    return {
      riskLevel: parsed.riskLevel ?? 'MEDIUM',
      rootCauseAnalysis: parsed.rootCauseAnalysis ?? '',
      impactAssessment: {
        technicalImpact: parsed.impactAssessment?.technicalImpact ?? '',
        operationalImpact: parsed.impactAssessment?.operationalImpact ?? '',
      },
      prescriptiveActions: Array.isArray(parsed.prescriptiveActions)
        ? parsed.prescriptiveActions
        : [],
      confidenceScore: parsed.confidenceScore ?? 0.5,
    };
  }
}
