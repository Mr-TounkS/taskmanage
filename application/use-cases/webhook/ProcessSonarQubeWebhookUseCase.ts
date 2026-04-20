/**
 * Use-case : Traitement des événements webhook SonarCloud/SonarQube
 *
 * Reçoit le résultat d'une analyse de qualité, vérifie la signature HMAC-SHA256,
 * transforme les issues en SGRTechDebt et déclenche un recalcul SGR.
 *
 * Section mémoire : 3.3 — Intégration SonarQube
 * Section mémoire : 2.3 — Algorithme SGR (dimension R_Quality)
 */

import { IExternalIntegrationRepository } from '../../../domain/repositories/IExternalIntegrationRepository';
import { ITaskRepository } from '../../../domain/repositories/ITaskRepository';
import { IColumnWIPConfigRepository } from '../../../domain/repositories/IColumnWIPConfigRepository';
import { ISGRHistoryRepository } from '../../../domain/repositories/ISGRHistoryRepository';
import { CalculateSGRUseCase } from '../sgr/CalculateSGRUseCase';
import { SGRTechDebt } from '../../../lib/risk-algorithm/types';

// Payload minimal attendu de SonarCloud
interface SonarQubePayload {
  status?: string; // "SUCCESS" | "FAILED" | "CANCELLED"
  analysedAt?: string;
  project?: { key: string; name: string };
  qualityGate?: {
    status: string; // "OK" | "ERROR" | "WARN"
    conditions?: SonarQubeCondition[];
  };
  properties?: Record<string, string>;
}

interface SonarQubeCondition {
  metric: string;
  operator: string;
  value: string;
  status: string; // "OK" | "ERROR"
  errorThreshold?: string;
}

export interface ProcessSonarQubeWebhookInput {
  projectId: string;
  payload: SonarQubePayload;
  /** Signature fournie dans l'en-tête X-Sonar-Webhook-HMAC-SHA256 */
  signature: string;
  rawBody: Buffer;
}

export class ProcessSonarQubeWebhookUseCase {
  constructor(
    private readonly integrationRepository: IExternalIntegrationRepository,
    private readonly taskRepository: ITaskRepository,
    private readonly columnWIPConfigRepository: IColumnWIPConfigRepository,
    private readonly sgrHistoryRepository: ISGRHistoryRepository,
  ) {}

  async execute(input: ProcessSonarQubeWebhookInput): Promise<void> {
    const { projectId, payload, signature, rawBody } = input;

    // 1. Vérifier que l'intégration SonarQube est configurée pour ce projet
    const integration = await this.integrationRepository.findByProjectAndType(projectId, 'sonarqube');
    if (!integration) {
      throw new Error(`No SonarQube integration configured for project ${projectId}`);
    }

    // 2. Vérifier la signature HMAC-SHA256
    const isValid = await verifySonarSignature(rawBody, integration.webhookSecret, signature);
    if (!isValid) {
      throw new Error('Invalid SonarQube webhook signature');
    }

    // 3. Ignorer les analyses annulées
    if (payload.status === 'CANCELLED') return;

    // 4. Extraire les métriques de qualité depuis le payload
    const techDebt = extractTechDebt(payload);

    // 5. Recalculer le SGR avec les nouvelles données de qualité
    const sgrUseCase = new CalculateSGRUseCase(
      this.taskRepository,
      this.columnWIPConfigRepository,
      this.sgrHistoryRepository,
    );

    await sgrUseCase.execute({ projectId, techDebt });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Vérifie la signature HMAC-SHA256 de SonarCloud.
 * Format attendu dans X-Sonar-Webhook-HMAC-SHA256 : hex brut (sans préfixe).
 */
async function verifySonarSignature(
  body: Buffer,
  secret: string,
  signatureHeader: string,
): Promise<boolean> {
  const { createHmac, timingSafeEqual } = await import('crypto');
  const expected = createHmac('sha256', secret).update(body).digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signatureHeader, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Transforme les conditions SonarCloud en SGRTechDebt.
 *
 * Mapping des métriques SonarCloud → indicateurs SGR :
 * - bugs (BLOCKER severity)        → bugsBloquants
 * - sqale_index (minutes)          → detteTechniqueDays
 * - code_smells                    → codeSmells
 */
function extractTechDebt(payload: SonarQubePayload): SGRTechDebt {
  const conditions = payload.qualityGate?.conditions ?? [];

  let bugsBloquants = 0;
  let detteTechniqueDays = 0;
  let codeSmells = 0;

  for (const condition of conditions) {
    const val = parseFloat(condition.value);
    if (isNaN(val)) continue;

    switch (condition.metric) {
      case 'bugs':
      case 'blocker_violations':
        bugsBloquants += val;
        break;
      case 'sqale_index': // minutes de dette technique
        detteTechniqueDays = val / (8 * 60); // converti en jours-homme (8h/jour)
        break;
      case 'code_smells':
        codeSmells = val;
        break;
    }
  }

  return { bugsBloquants, detteTechniqueDays, codeSmells };
}
