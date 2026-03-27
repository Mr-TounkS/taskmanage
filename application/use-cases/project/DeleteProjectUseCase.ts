import { IProjectRepository } from '../../../domain/repositories/IProjectRepository';

export class DeleteProjectUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  async execute(projectId: string): Promise<void> {
    await this.projectRepository.delete(projectId);
  }
}
