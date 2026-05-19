/**
 * PrismaSubscriptionRepository
 * Implémentation Prisma de ISubscriptionRepository.
 *
 * Section mémoire : 3.4 — Module actif de gestion des risques (notifications)
 */

import { PrismaClient } from '../../prisma/generated/prisma/client';
import { ISubscriptionRepository, SaveSubscriptionData } from '../../domain/repositories/ISubscriptionRepository';
import { PushSubscriptionEntity } from '../../domain/entities/PushSubscription';

export class PrismaSubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(data: SaveSubscriptionData): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where:  { endpoint: data.endpoint },
      create: {
        userId:   data.userId,
        endpoint: data.endpoint,
        p256dh:   data.p256dh,
        auth:     data.auth,
      },
      update: { userId: data.userId },
    });
  }

  async findByProject(projectId: string): Promise<PushSubscriptionEntity[]> {
    const records = await this.prisma.pushSubscription.findMany({
      where: {
        user: {
          OR: [
            { userProjects: { some: { projectId } } },
            { createdProjects: { some: { id: projectId } } },
          ],
        },
      },
      select: {
        id: true, userId: true, endpoint: true,
        p256dh: true, auth: true, createdAt: true,
      },
    });

    return records.map((r) => ({
      id:        r.id,
      userId:    r.userId,
      endpoint:  r.endpoint,
      keys:      { p256dh: r.p256dh, auth: r.auth },
      createdAt: r.createdAt,
    }));
  }

  async deleteByEndpoint(endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }

  async deleteManyByEndpoints(endpoints: string[]): Promise<void> {
    if (endpoints.length === 0) return;
    await this.prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: endpoints } },
    });
  }

  async findByUserId(userId: string): Promise<PushSubscriptionEntity | null> {
    const record = await this.prisma.pushSubscription.findFirst({
      where: { userId },
    });
    if (!record) return null;
    return {
      id:        record.id,
      userId:    record.userId,
      endpoint:  record.endpoint,
      keys:      { p256dh: record.p256dh, auth: record.auth },
      createdAt: record.createdAt,
    };
  }
}
