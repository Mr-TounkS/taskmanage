/**
 * Route POST /api/webhooks/github?projectId=<id>
 *
 * Reçoit les événements Pull Request depuis GitHub et déclenche un recalcul SGR.
 * La signature HMAC-SHA256 (en-tête X-Hub-Signature-256) est vérifiée avant tout traitement.
 *
 * Section mémoire : 3.3 — Intégration GitHub
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PrismaExternalIntegrationRepository } from '@/infrastructure/repositories/PrismaExternalIntegrationRepository';
import { PrismaTaskRepository } from '@/infrastructure/repositories/PrismaTaskRepository';
import { PrismaColumnWIPConfigRepository } from '@/infrastructure/repositories/PrismaColumnWIPConfigRepository';
import { PrismaSGRHistoryRepository } from '@/infrastructure/repositories/PrismaSGRHistoryRepository';
import { ProcessGitHubWebhookUseCase } from '@/application/use-cases/webhook/ProcessGitHubWebhookUseCase';

// Next.js App Router — désactiver le body parser automatique pour lire le buffer brut
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId requis' }, { status: 400 });
  }

  // Lire le body brut pour la vérification HMAC
  const rawBody = Buffer.from(await request.arrayBuffer());

  // Signature GitHub dans l'en-tête X-Hub-Signature-256
  const signature = request.headers.get('x-hub-signature-256') ?? '';

  // Type d'événement GitHub (push, pull_request, etc.)
  const event = request.headers.get('x-github-event') ?? '';

  // Ignorer tout ce qui n'est pas un événement PR
  if (event !== 'pull_request' && event !== 'ping') {
    return NextResponse.json({ ignored: true, event }, { status: 200 });
  }

  // Répondre immédiatement au ping de configuration
  if (event === 'ping') {
    return NextResponse.json({ pong: true }, { status: 200 });
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
      payload: payload as Parameters<typeof useCase.execute>[0]['payload'],
      signature,
      rawBody,
    });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';

    // Signature invalide → 401
    if (message.includes('signature')) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    // Intégration non configurée → 404
    if (message.includes('No GitHub integration')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    console.error('[webhook/github]', message);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
