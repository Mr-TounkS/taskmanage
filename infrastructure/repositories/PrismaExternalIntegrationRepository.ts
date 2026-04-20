import { PrismaClient } from '../../prisma/generated/prisma/client';
import { IExternalIntegrationRepository } from '../../domain/repositories/IExternalIntegrationRepository';
import { ExternalIntegrationEntity, ExternalIntegrationType } from '../../domain/entities/ExternalIntegration';

export class PrismaExternalIntegrationRepository implements IExternalIntegrationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(data: Omit<ExternalIntegrationEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExternalIntegrationEntity> {
    const record = await this.prisma.externalIntegration.upsert({
      where: { projectId_type: { projectId: data.projectId, type: data.type } },
      create: {
        projectId: data.projectId,
        type: data.type,
        externalProjectRef: data.externalProjectRef,
        webhookSecret: data.webhookSecret,
      },
      update: {
        externalProjectRef: data.externalProjectRef,
        webhookSecret: data.webhookSecret,
      },
    });
    return record as unknown as ExternalIntegrationEntity;
  }

  async findByProjectAndType(projectId: string, type: ExternalIntegrationType): Promise<ExternalIntegrationEntity | null> {
    const record = await this.prisma.externalIntegration.findUnique({
      where: { projectId_type: { projectId, type } },
    });
    return record as unknown as ExternalIntegrationEntity | null;
  }

  async findByProject(projectId: string): Promise<ExternalIntegrationEntity[]> {
    const records = await this.prisma.externalIntegration.findMany({
      where: { projectId },
    });
    return records as unknown as ExternalIntegrationEntity[];
  }

  async delete(id: string): Promise<void> {
    await this.prisma.externalIntegration.delete({ where: { id } });
  }
}
