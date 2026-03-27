import { ITaskRepository } from '../../../domain/repositories/ITaskRepository';

export class DeleteTaskUseCase {
  constructor(private readonly taskRepository: ITaskRepository) {}

  async execute(taskId: string): Promise<void> {
    await this.taskRepository.delete(taskId);
  }
}
