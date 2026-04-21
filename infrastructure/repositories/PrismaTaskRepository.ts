import { PrismaClient } from '../../prisma/generated/prisma/client';
import { ITaskRepository, CreateTaskData, TaskWithRelations } from '../../domain/repositories/ITaskRepository';
import { TaskEntity } from '../../domain/entities/Task';

export class PrismaTaskRepository implements ITaskRepository {
  constructor(private readonly prisma: PrismaClient) { }

  async create(data: CreateTaskData): Promise<TaskEntity> {
    return this.prisma.task.create({ data }) as unknown as Promise<TaskEntity>;
  }

  async findById(taskId: string): Promise<TaskEntity | null> {
    return this.prisma.task.findUnique({ where: { id: taskId } }) as Promise<TaskEntity | null>;
  }

  async findByIdWithRelations(taskId: string): Promise<TaskWithRelations | null> {
    return this.prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true, user: true, createdBy: true, files: true },
    }) as Promise<TaskWithRelations | null>;
  }

  async findByProject(projectId: string): Promise<TaskEntity[]> {
    return this.prisma.task.findMany({
      where: { projectId },
    }) as unknown as Promise<TaskEntity[]>;
  }

  async delete(taskId: string): Promise<void> {
    await this.prisma.task.delete({ where: { id: taskId } });
  }

  async updateStatus(taskId: string, newStatus: string, solutionDescription?: string): Promise<void> {
    const data: {
      status: string;
      solutionDescription?: string;
      startedAt?: Date;
      completedAt?: Date;
    } = { status: newStatus };

    // Horodatage automatique pour le calcul SGR
    if (newStatus === 'In Progress') {
      data.startedAt = new Date();
    }
    if (newStatus === 'Done') {
      data.completedAt = new Date();
      if (solutionDescription) data.solutionDescription = solutionDescription;
    }

    await this.prisma.task.update({ where: { id: taskId }, data });
  }
}
