import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { ITaskRepository } from '../../../domain/repositories/ITaskRepository';
import { TaskEntity, TaskPriority } from '../../../domain/entities/Task';

export class CreateTaskUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly taskRepository: ITaskRepository
  ) {}

  async execute(
    name: string,
    description: string,
    priority: TaskPriority,
    startDate: Date | null,
    dueDate: Date | null,
    projectId: string,
    createdByEmail: string,
    assignToEmail: string | undefined
  ): Promise<TaskEntity> {
    const createdBy = await this.userRepository.findByEmail(createdByEmail);
    if (!createdBy) throw new Error(`utilisateur avec l'email ${createdByEmail} introuvable`);

    let assignUserId = createdBy.id;
    if (assignToEmail) {
      const assignUser = await this.userRepository.findByEmail(assignToEmail);
      if (!assignUser) throw new Error(`utilisateur avec l'email ${assignToEmail} introuvable`);
      assignUserId = assignUser.id;
    }

    return this.taskRepository.create({
      name,
      description,
      priority,
      startDate,
      dueDate,
      projectId,
      createdById: createdBy.id,
      userId: assignUserId,
    });
  }
}
