/**
 * Use-case : Traitement des événements webhook GitHub
 *
 * Ce use-case reçoit un payload GitHub (PR events), vérifie la signature HMAC-SHA256,
 * transforme les données en SGRGitHubActivity et déclenche un recalcul SGR.
 *
 * Section mémoire : 3.3 — Intégration GitHub
 * Section mémoire : 2.3 — Algorithme SGR (dimension R_Dev)
 */

import { IExternalIntegrationRepository } from '../../../domain/repositories/IExternalIntegrationRepository';
import { ITaskRepository } from '../../../domain/repositories/ITaskRepository';
import { IColumnWIPConfigRepository } from '../../../domain/repositories/IColumnWIPConfigRepository';
import { ISGRHistoryRepository } from '../../../domain/repositories/ISGRHistoryRepository';
import { CalculateSGRUseCase } from '../sgr/CalculateSGRUseCase';
import { SGRGitHubActivity } from '../../../lib/risk-algorithm/types';

// Payload minimal attendu de GitHub pour les PR events
interface GitHubPRPayload {
  action: string;
  repository?: { full_name: string };
  pull_request?: {
    state: string;
    created_at: string;
    merged_at: string | null;
    draft: boolean;
  };
  // GitHub envoie 'installation' pour les GitHub Apps
  installation?: { id: number };
}

export interface ProcessGitHubWebhookInput {
  projectId: string;
  payload: GitHubPRPayload;
  /** Signature fournie dans l'en-tête X-Hub-Signature-256 */
  signature: string;
  /** Body brut (Buffer) pour la vérification HMAC */
  rawBody: Buffer;
}

export class ProcessGitHubWebhookUseCase {
  constructor(
    private readonly integrationRepository: IExternalIntegrationRepository,
    private readonly taskRepository: ITaskRepository,
    private readonly columnWIPConfigRepository: IColumnWIPConfigRepository,
    private readonly sgrHistoryRepository: ISGRHistoryRepository,
  ) {}

  async execute(input: ProcessGitHubWebhookInput): Promise<void> {
    const { projectId, payload, signature, rawBody } = input;

    // 1. Récupérer la configuration d'intégration GitHub pour ce projet
    const integration = await this.integrationRepository.findByProjectAndType(projectId, 'github');
    if (!integration) {
      throw new Error(`No GitHub integration configured for project ${projectId}`);
    }

    // 2. Vérifier la signature HMAC-SHA256
    const isValid = await verifyGitHubSignature(rawBody, integration.webhookSecret, signature);
    if (!isValid) {
      throw new Error('Invalid GitHub webhook signature');
    }

    // 3. Ignorer les événements non pertinents pour le SGR
    if (payload.action !== 'opened' && payload.action !== 'closed' &&
        payload.action !== 'reopened' && payload.action !== 'synchronize') {
      return;
    }

    // 4. Calculer les métriques GitHub Activity depuis l'historique SGR existant
    // On reconstitue une activité approximative (nombre de PRs ouverts, délai moyen)
    // depuis le payload courant et l'historique stocké
    const githubActivity = extractGitHubActivity(payload);

    // 5. Déclencher un recalcul SGR avec les nouvelles données GitHub
    const sgrUseCase = new CalculateSGRUseCase(
      this.taskRepository,
      this.columnWIPConfigRepository,
      this.sgrHistoryRepository,
    );

    await sgrUseCase.execute({ projectId, githubActivity });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Vérifie la signature X-Hub-Signature-256 de GitHub.
 * Format attendu : "sha256=<hex_digest>"
 */
async function verifyGitHubSignature(
  body: Buffer,
  secret: string,
  signatureHeader: string,
): Promise<boolean> {
  if (!signatureHeader.startsWith('sha256=')) return false;

  const { createHmac, timingSafeEqual } = await import('crypto');
  const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signatureHeader, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Transforme un payload GitHub PR en SGRGitHubActivity.
 * Approximation : on ne dispose que d'un événement à la fois depuis le webhook.
 * Les métriques agrégées (prOpen, prDelayDays) sont calculées à partir des données disponibles.
 */
function extractGitHubActivity(payload: GitHubPRPayload): SGRGitHubActivity {
  const pr = payload.pull_request;
  if (!pr) return { prOpen: 0, prDelayDays: 0, prStuck: 0 };

  const isOpen = pr.state === 'open' && !pr.draft;
  const prOpen = isOpen ? 1 : 0;

  const openedAt = new Date(pr.created_at);
  const now = new Date();
  const ageDays = (now.getTime() - openedAt.getTime()) / (1000 * 60 * 60 * 24);

  // Une PR ouverte depuis > 7 jours sans merge est considérée "bloquée"
  const prStuck = isOpen && ageDays > 7 ? 1 : 0;

  return {
    prOpen,
    prDelayDays: isOpen ? Math.round(ageDays) : 0,
    prStuck,
  };
}
