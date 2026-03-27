import { PrismaClient } from '../../prisma/generated/prisma/client';
import { ISGRHistoryRepository } from '../../domain/repositories/ISGRHistoryRepository';
import { SGRHistoryEntity } from '../../domain/entities/SGRHistory';

export class PrismaSGRHistoryRepository implements ISGRHistoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(entry: Omit<SGRHistoryEntity, 'id' | 'createdAt'>): Promise<SGRHistoryEntity> {
    const record = await this.prisma.sGRHistory.create({
      data: {
        projectId: entry.projectId,
        sgr: entry.sgr,
        niveau: entry.niveau,
        alertes: entry.alertes,
      },
    });
    return record as unknown as SGRHistoryEntity;
  }

  async findByProject(projectId: string): Promise<SGRHistoryEntity[]> {
    const records = await this.prisma.sGRHistory.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return records as unknown as SGRHistoryEntity[];
  }
}
