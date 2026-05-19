/**
 * Service de domaine : Routage des Notifications par Niveau de Risque.
 *
 * Implémente la logique de "Prescriptive Analytics" (section mémoire 3.3) :
 * au lieu d'alerter systématiquement, le système adapte le canal et le ton
 * selon l'intensité du risque pour éviter la "fatigue des alertes" (Alert Fatigue).
 *
 * Table de routage (Gemini/SAD pattern) :
 *   SGR < 40  → SILENT    : monitoring passif, aucune interruption
 *   40–60     → INSIGHT   : notification douce, ton consultatif
 *   > 60      → URGENT    : push interruptif, action immédiate requise
 *
 * Respecte la Clean Architecture : aucune dépendance vers Prisma, Next.js ou React.
 * Section mémoire : 3.3 — Agent prescriptif et routage des alertes
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType = 'SILENT' | 'INSIGHT' | 'URGENT';

export interface NotificationDecision {
  type: NotificationType;
  /** Titre court affiché dans la notification */
  title: string;
  /** Corps du message structuré (Constat + Diagnostic + Action) */
  body: string;
  /** Ton utilisé pour calibrer le prompt LLM si besoin */
  tone: 'informational' | 'advisory' | 'critical';
  /** Indique si une notification push doit être envoyée */
  shouldPush: boolean;
}

export interface NotificationDecisionInput {
  sgrScore: number;
  niveau: 'low' | 'moderate' | 'high' | 'critical';
  /** Alertes actives issues du calcul SGR */
  alertes: string[];
  /** Probabilité de retard Monte-Carlo ∈ [0, 1] — null si non disponible */
  monteCarloDelayProbability?: number | null;
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const SEUIL_SILENT = 40;
const SEUIL_URGENT = 60;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class NotificationDecisionService {
  /**
   * Décide du type de notification à émettre pour un résultat SGR donné.
   *
   * La décision est déterministe et testable — aucun appel externe.
   * Le routage se base sur le score SGR et est enrichi par Monte-Carlo
   * si disponible (un P_delai élevé peut escalader un INSIGHT en URGENT).
   */
  static decide(input: NotificationDecisionInput): NotificationDecision {
    const { sgrScore, niveau, alertes, monteCarloDelayProbability } = input;

    // Escalade Monte-Carlo : si P_delai > 80% et SGR modéré, on passe en URGENT
    const mcEscalade =
      monteCarloDelayProbability !== null &&
      monteCarloDelayProbability !== undefined &&
      monteCarloDelayProbability > 0.80 &&
      sgrScore >= SEUIL_SILENT;

    const scoreEffectif = mcEscalade ? SEUIL_URGENT + 1 : sgrScore;

    // --- SILENT ---
    if (scoreEffectif < SEUIL_SILENT) {
      return {
        type: 'SILENT',
        title: 'Risk Monitor',
        body: `SGR ${sgrScore}/100 — Low risk. No action needed.`,
        tone: 'informational',
        shouldPush: false,
      };
    }

    // --- URGENT ---
    if (scoreEffectif > SEUIL_URGENT) {
      const mcInfo = monteCarloDelayProbability !== null && monteCarloDelayProbability !== undefined
        ? ` Monte-Carlo sprint delay probability: ${Math.round(monteCarloDelayProbability * 100)}%.`
        : '';
      const alertesInfo = alertes.length > 0 ? ` Active alerts: ${alertes.join('; ')}.` : '';
      return {
        type: 'URGENT',
        title: `🚨 Risk Alert — SGR ${sgrScore}/100`,
        body: `Critical risk level (${niveau.toUpperCase()}).${mcInfo}${alertesInfo} Immediate Scrum Master action required.`,
        tone: 'critical',
        shouldPush: true,
      };
    }

    // --- INSIGHT (40–60) ---
    const mcInsight = monteCarloDelayProbability !== null && monteCarloDelayProbability !== undefined
      ? ` Stochastic sprint delay probability: ${Math.round(monteCarloDelayProbability * 100)}%.`
      : '';
    const mainAlert = alertes[0] ? ` Diagnosis: ${alertes[0]}.` : '';
    return {
      type: 'INSIGHT',
      title: `⚡ Risk Insight — SGR ${sgrScore}/100`,
      body: `Moderate risk detected (${niveau.toUpperCase()}).${mainAlert}${mcInsight} Proactive correction suggested before end of sprint.`,
      tone: 'advisory',
      shouldPush: false,
    };
  }

  /**
   * Retourne le libellé UI du niveau de risque avec emoji et couleur DaisyUI.
   * Utilisé par le badge contextuel du SGRWidget.
   */
  static badge(type: NotificationType): {
    label: string;
    cssClass: string;
    description: string;
  } {
    switch (type) {
      case 'SILENT':
        return {
          label: 'Monitoring',
          cssClass: 'badge-success',
          description: 'Low risk — passive monitoring only',
        };
      case 'INSIGHT':
        return {
          label: '⚡ Insight',
          cssClass: 'badge-warning',
          description: 'Moderate risk — proactive action suggested',
        };
      case 'URGENT':
        return {
          label: '🚨 Alert',
          cssClass: 'badge-error',
          description: 'High risk — immediate action required',
        };
    }
  }
}
