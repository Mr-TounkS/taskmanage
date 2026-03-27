import { ITaskRepository, TaskWithRelations } from '../../../domain/repositories/ITaskRepository';

export class GetTaskDetailsUseCase {
  constructor(private readonly taskRepository: ITaskRepository) {}

  async execute(taskId: string): Promise<TaskWithRelations> {
    const task = await this.taskRepository.findByIdWithRelations(taskId);
    if (!task) throw new Error('Tache non trouvee');
    return task;
  }
}
