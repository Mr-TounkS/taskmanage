import { ITaskRepository } from '../../../domain/repositories/ITaskRepository';

export class UpdateTaskStatusUseCase {
  constructor(private readonly taskRepository: ITaskRepository) {}

  async execute(taskId: string, newStatus: string, solutionDescription?: string): Promise<void> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) throw new Error('Tache non trouve');

    await this.taskRepository.updateStatus(taskId, newStatus, solutionDescription);
  }
}
