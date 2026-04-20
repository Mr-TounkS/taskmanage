/**
 * Use-case : Traitement des événements webhook GitHub
 *
 * Gère deux types d'événements via un seul webhook :
 *   - pull_request : met à jour R_GitHub (métriques PR : prOpen, prDelayDays, prStuck)
 *   - check_run    : détecte les analyses Codacy et met à jour R_Quality (SGRTechDebt)
 *
 * Codacy ne fournit pas de webhooks outbound sur le plan gratuit.
 * En revanche, il poste des GitHub Check Runs sur chaque PR analysée.
 * Ce use-case intercepte ces check_run events pour extraire les métriques qualité.
 *
 * Section mémoire : 3.3 — Intégration GitHub + Codacy
 * Section mémoire : 2.3 — Algorithme SGR (R_Dev + R_Quality)
 */

import { IExternalIntegrationRepository } from '../../../domain/repositories/IExternalIntegrationRepository';
import { ITaskRepository } from '../../../domain/repositories/ITaskRepository';
import { IColumnWIPConfigRepository } from '../../../domain/repositories/IColumnWIPConfigRepository';
import { ISGRHistoryRepository } from '../../../domain/repositories/ISGRHistoryRepository';
import { CalculateSGRUseCase } from '../sgr/CalculateSGRUseCase';
import { SGRGitHubActivity, SGRTechDebt } from '../../../lib/risk-algorithm/types';

// ---------------------------------------------------------------------------
// Types — payloads GitHub
// ---------------------------------------------------------------------------

interface GitHubPRPayload {
  action: string;
  repository?: { full_name: string };
  pull_request?: {
    state: string;
    created_at: string;
    merged_at: string | null;
    draft: boolean;
  };
}

interface GitHubCheckRunPayload {
  action: string;
  check_run?: {
    name: string;
    conclusion: string | null; // "success" | "failure" | "neutral" | "skipped" | null
    app?: { slug: string };   // "codacy" pour les check runs Codacy
    output?: {
      title: string | null;   // ex: "Found 5 issues" ou "No issues found"
      summary: string | null;
    };
  };
}

type GitHubPayload = GitHubPRPayload | GitHubCheckRunPayload | Record<string, unknown>;

export interface ProcessGitHubWebhookInput {
  projectId: string;
  payload: GitHubPayload;
  event: string;  // valeur de l'en-tête X-Github-Event
  signature: string;
  rawBody: Buffer;
}

// ---------------------------------------------------------------------------
// Use-case
// ---------------------------------------------------------------------------

export class ProcessGitHubWebhookUseCase {
  constructor(
    private readonly integrationRepository: IExternalIntegrationRepository,
    private readonly taskRepository: ITaskRepository,
    private readonly columnWIPConfigRepository: IColumnWIPConfigRepository,
    private readonly sgrHistoryRepository: ISGRHistoryRepository,
  ) {}

  async execute(input: ProcessGitHubWebhookInput): Promise<void> {
    const { projectId, payload, event, signature, rawBody } = input;

    const integration = await this.integrationRepository.findByProjectAndType(projectId, 'github');
    if (!integration) {
      throw new Error(`No GitHub integration configured for project ${projectId}`);
    }

    const isValid = await verifyGitHubSignature(rawBody, integration.webhookSecret, signature);
    if (!isValid) {
      throw new Error('Invalid GitHub webhook signature');
    }

    const sgrUseCase = new CalculateSGRUseCase(
      this.taskRepository,
      this.columnWIPConfigRepository,
      this.sgrHistoryRepository,
    );

    if (event === 'pull_request') {
      const pr = (payload as GitHubPRPayload);
      if (pr.action !== 'opened' && pr.action !== 'closed' &&
          pr.action !== 'reopened' && pr.action !== 'synchronize') return;

      const githubActivity = extractGitHubActivity(pr);
      await sgrUseCase.execute({ projectId, githubActivity });
      return;
    }

    if (event === 'check_run') {
      const checkRunPayload = payload as GitHubCheckRunPayload;
      const cr = checkRunPayload.check_run;
      // Traiter uniquement les check runs Codacy terminés
      if (!cr || cr.app?.slug !== 'codacy' || checkRunPayload.action !== 'completed') return;
      if (cr.conclusion === null || cr.conclusion === 'skipped') return;

      const techDebt = extractCodacyTechDebt(cr);
      await sgrUseCase.execute({ projectId, techDebt });
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function extractGitHubActivity(payload: GitHubPRPayload): SGRGitHubActivity {
  const pr = payload.pull_request;
  if (!pr) return { prOpen: 0, prDelayDays: 0, prStuck: 0 };

  const isOpen = pr.state === 'open' && !pr.draft;
  const ageDays = (Date.now() - new Date(pr.created_at).getTime()) / (1000 * 60 * 60 * 24);

  return {
    prOpen: isOpen ? 1 : 0,
    prDelayDays: isOpen ? Math.round(ageDays) : 0,
    prStuck: isOpen && ageDays > 7 ? 1 : 0,
  };
}

/**
 * Extrait les métriques de qualité depuis un check run Codacy.
 *
 * Le titre du check run Codacy suit le format :
 *   "Found X issues" → X issues au total
 *   "No issues found" → 0 issue
 *   "Fixed X issues" → amélioration
 *
 * Sans détail par catégorie dans les check runs (contrairement à l'API Codacy),
 * on estime : 20% de bugs, 80% de code smells, 30 min de dette par issue.
 */
function extractCodacyTechDebt(checkRun: NonNullable<GitHubCheckRunPayload['check_run']>): SGRTechDebt {
  const title = checkRun.output?.title ?? '';
  const match = title.match(/(\d+)\s+issue/i);
  const totalIssues = match ? parseInt(match[1], 10) : 0;

  const bugsBloquants = Math.round(totalIssues * 0.2);
  const codeSmells = totalIssues - bugsBloquants;
  const detteTechniqueDays = totalIssues * 0.0625; // 30 min/issue ÷ 8h/jour

  return { bugsBloquants, codeSmells, detteTechniqueDays };
}
