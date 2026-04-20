/**
 * Route POST /api/webhooks/sonarqube?projectId=<id>
 *
 * Reçoit les résultats d'analyse SonarCloud et déclenche un recalcul SGR.
 * La signature HMAC-SHA256 (en-tête X-Sonar-Webhook-HMAC-SHA256) est vérifiée.
 *
 * Section mémoire : 3.3 — Intégration SonarQube
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PrismaExternalIntegrationRepository } from '@/infrastructure/repositories/PrismaExternalIntegrationRepository';
import { PrismaTaskRepository } from '@/infrastructure/repositories/PrismaTaskRepository';
import { PrismaColumnWIPConfigRepository } from '@/infrastructure/repositories/PrismaColumnWIPConfigRepository';
import { PrismaSGRHistoryRepository } from '@/infrastructure/repositories/PrismaSGRHistoryRepository';
import { ProcessSonarQubeWebhookUseCase } from '@/application/use-cases/webhook/ProcessSonarQubeWebhookUseCase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId requis' }, { status: 400 });
  }

  // Lire le body brut pour la vérification HMAC
  const rawBody = Buffer.from(await request.arrayBuffer());

  // SonarCloud envoie la signature dans X-Sonar-Webhook-HMAC-SHA256
  const signature = request.headers.get('x-sonar-webhook-hmac-sha256') ?? '';

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

  const useCase = new ProcessSonarQubeWebhookUseCase(
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

    if (message.includes('signature')) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.includes('No SonarQube integration')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    console.error('[webhook/sonarqube]', message);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
