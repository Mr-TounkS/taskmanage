/**
 * Route POST /api/webhooks/github?projectId=<id>
 *
 * Reçoit les événements GitHub et déclenche un recalcul SGR.
 * Gère deux types d'événements :
 *   - pull_request : met à jour R_GitHub (activité PR)
 *   - check_run    : intercepte les analyses Codacy et met à jour R_Quality
 *
 * La signature HMAC-SHA256 (X-Hub-Signature-256) est vérifiée avant tout traitement.
 * Codacy n'ayant pas de webhooks outbound sur le plan gratuit, ses résultats
 * arrivent via les GitHub Check Runs qu'il poste automatiquement.
 *
 * Section mémoire : 3.3 — Intégration GitHub + Codacy
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PrismaExternalIntegrationRepository } from '@/infrastructure/repositories/PrismaExternalIntegrationRepository';
import { PrismaTaskRepository } from '@/infrastructure/repositories/PrismaTaskRepository';
import { PrismaColumnWIPConfigRepository } from '@/infrastructure/repositories/PrismaColumnWIPConfigRepository';
import { PrismaSGRHistoryRepository } from '@/infrastructure/repositories/PrismaSGRHistoryRepository';
import { ProcessGitHubWebhookUseCase } from '@/application/use-cases/webhook/ProcessGitHubWebhookUseCase';

export const dynamic = 'force-dynamic';

const ACCEPTED_EVENTS = new Set(['pull_request', 'check_run', 'ping']);

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId requis' }, { status: 400 });
  }

  const rawBody = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get('x-hub-signature-256') ?? '';
  const event = request.headers.get('x-github-event') ?? '';

  // Répondre au ping de configuration GitHub
  if (event === 'ping') {
    return NextResponse.json({ pong: true }, { status: 200 });
  }

  // Ignorer les événements non pertinents pour le SGR
  if (!ACCEPTED_EVENTS.has(event)) {
    return NextResponse.json({ ignored: true, event }, { status: 200 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return NextResponse.json({ error: 'Payload JSON invalide' }, { status: 400 });
  }

  const integrationRepo = new PrismaExternalIntegrationRepository(prisma);
  const taskRepo = new PrismaTaskRepository(prisma);
  const columnWIPConfigRepo = new PrismaColumnWIPConfigRepository(prisma);
  const sgrHistoryRepo = new PrismaSGRHistoryRepository(prisma);

  const useCase = new ProcessGitHubWebhookUseCase(
    integrationRepo,
    taskRepo,
    columnWIPConfigRepo,
    sgrHistoryRepo,
  );

  try {
    await useCase.execute({
      projectId,
      event,
      payload: payload as Parameters<typeof useCase.execute>[0]['payload'],
      signature,
      rawBody,
    });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';

    if (message.includes('signature')) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.includes('No GitHub integration')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    console.error('[webhook/github]', message);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
