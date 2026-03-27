import { PrismaClient } from '../../prisma/generated/prisma/client';
import { IColumnWIPConfigRepository } from '../../domain/repositories/IColumnWIPConfigRepository';
import { ColumnWIPConfigEntity } from '../../domain/entities/ColumnWIPConfig';

export class PrismaColumnWIPConfigRepository implements IColumnWIPConfigRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByProject(projectId: string): Promise<ColumnWIPConfigEntity[]> {
    return this.prisma.columnWIPConfig.findMany({ where: { projectId } });
  }

  async findByProjectAndColumn(projectId: string, column: string): Promise<ColumnWIPConfigEntity | null> {
    return this.prisma.columnWIPConfig.findUnique({
      where: { projectId_column: { projectId, column } },
    });
  }

  async upsert(projectId: string, column: string, wipLimit: number): Promise<ColumnWIPConfigEntity> {
    return this.prisma.columnWIPConfig.upsert({
      where: { projectId_column: { projectId, column } },
      update: { wipLimit },
      create: { projectId, column, wipLimit },
    });
  }
}
