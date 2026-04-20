/**
 * Use-case : Traitement des événements webhook Codacy
 *
 * Reçoit le résultat d'une analyse Codacy (Repository ou PullRequest),
 * vérifie la signature HMAC-SHA256, transforme les issues en SGRTechDebt
 * et déclenche un recalcul SGR.
 *
 * Section mémoire : 3.3 — Intégration Codacy (qualité logicielle)
 * Section mémoire : 2.3 — Algorithme SGR (dimension R_Quality)
 *
 * Mapping Codacy → SGRTechDebt :
 *   bugsBloquants  ← issues catégorie "error_prone" (bugs potentiels)
 *   codeSmells     ← total issues − error_prone
 *   detteTechnique ← estimation : 30 min par issue (0.0625 jour-homme)
 */

import { IExternalIntegrationRepository } from '../../../domain/repositories/IExternalIntegrationRepository';
import { ITaskRepository } from '../../../domain/repositories/ITaskRepository';
import { IColumnWIPConfigRepository } from '../../../domain/repositories/IColumnWIPConfigRepository';
import { ISGRHistoryRepository } from '../../../domain/repositories/ISGRHistoryRepository';
import { CalculateSGRUseCase } from '../sgr/CalculateSGRUseCase';
import { SGRTechDebt } from '../../../lib/risk-algorithm/types';

// ---------------------------------------------------------------------------
// Types — payload Codacy
// ---------------------------------------------------------------------------

interface CodacyRepositoryPayload {
  event: 'Repository';
  payload: {
    repositoryQuality?: {
      grade?: string;          // "A" | "B" | "C" | "D" | "F"
      totalIssues?: number;
      issuesToFixTotal?: number;
    };
    commit?: {
      analysis?: {
        totalIssues?: number;
        newIssues?: number;
        categories?: Record<string, number>;
      };
    };
  };
}

interface CodacyPullRequestPayload {
  event: 'PullRequest';
  payload: {
    pullRequest?: {
      status?: string; // "analyzed"
      isUpToStandards?: boolean;
      issues?: {
        new?: number;
        fixed?: number;
        total?: number;
      };
      coverage?: {
        isUpToStandards?: boolean;
        coverage?: number;
      };
    };
  };
}

type CodacyPayload = CodacyRepositoryPayload | CodacyPullRequestPayload | { event: string };

export interface ProcessCodacyWebhookInput {
  projectId: string;
  payload: CodacyPayload;
  /** Signature fournie dans l'en-tête X-Codacy-Signature (format: "sha256=<hex>") */
  signature: string;
  rawBody: Buffer;
}

// ---------------------------------------------------------------------------
// Use-case
// ---------------------------------------------------------------------------

export class ProcessCodacyWebhookUseCase {
  constructor(
    private readonly integrationRepository: IExternalIntegrationRepository,
    private readonly taskRepository: ITaskRepository,
    private readonly columnWIPConfigRepository: IColumnWIPConfigRepository,
    private readonly sgrHistoryRepository: ISGRHistoryRepository,
  ) {}

  async execute(input: ProcessCodacyWebhookInput): Promise<void> {
    const { projectId, payload, signature, rawBody } = input;

    // 1. Vérifier que l'intégration Codacy est configurée pour ce projet
    const integration = await this.integrationRepository.findByProjectAndType(projectId, 'codacy');
    if (!integration) {
      throw new Error(`No Codacy integration configured for project ${projectId}`);
    }

    // 2. Vérifier la signature HMAC-SHA256
    const isValid = await verifyCodacySignature(rawBody, integration.webhookSecret, signature);
    if (!isValid) {
      throw new Error('Invalid Codacy webhook signature');
    }

    // 3. Ignorer les événements non pertinents
    const event = (payload as { event: string }).event;
    if (event !== 'Repository' && event !== 'PullRequest') return;

    // 4. Extraire les métriques de qualité
    const techDebt = extractTechDebt(payload);

    // 5. Recalculer le SGR avec les nouvelles données
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
 * Vérifie la signature HMAC-SHA256 de Codacy.
 * Codacy envoie : X-Codacy-Signature: sha256=<hex>
 */
async function verifyCodacySignature(
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
 * Transforme un payload Codacy en SGRTechDebt.
 *
 * Codacy classe les issues par catégories :
 *   error_prone     → bugs potentiels (équivalent "bugsBloquants")
 *   code_style      → code smells stylistiques
 *   compatibility   → code smells de compatibilité
 *   performance     → code smells de performance
 *   security        → bugs de sécurité (traités comme bugsBloquants)
 *   unused_code     → code mort (code smells)
 *   documentation   → ignoré (pas de risque opérationnel)
 *
 * Dette technique estimée : 30 min par issue ≈ 0.0625 jour-homme (base 8h)
 */
function extractTechDebt(payload: CodacyPayload): SGRTechDebt {
  const event = (payload as { event: string }).event;

  if (event === 'Repository') {
    const p = (payload as CodacyRepositoryPayload).payload;
    const categories = p.commit?.analysis?.categories ?? {};
    const totalIssues = p.commit?.analysis?.totalIssues ?? p.repositoryQuality?.totalIssues ?? 0;

    const bugsBloquants = (categories['error_prone'] ?? 0) + (categories['security'] ?? 0);
    const codeSmells = totalIssues - bugsBloquants;
    const detteTechniqueDays = totalIssues * 0.0625; // 30 min/issue ÷ 8h

    return { bugsBloquants, codeSmells: Math.max(0, codeSmells), detteTechniqueDays };
  }

  if (event === 'PullRequest') {
    const p = (payload as CodacyPullRequestPayload).payload;
    const totalIssues = p.pullRequest?.issues?.total ?? 0;
    const newIssues = p.pullRequest?.issues?.new ?? 0;

    // Sans détail par catégorie dans les PR events, on estime 30% de bugs
    const bugsBloquants = Math.round(newIssues * 0.3);
    const codeSmells = totalIssues - bugsBloquants;
    const detteTechniqueDays = totalIssues * 0.0625;

    return { bugsBloquants, codeSmells: Math.max(0, codeSmells), detteTechniqueDays };
  }

  return { bugsBloquants: 0, codeSmells: 0, detteTechniqueDays: 0 };
}
