import { IProjectRepository, ProjectWithDetails } from '../../../domain/repositories/IProjectRepository';
import { ProjectEntity } from '../../../domain/entities/Project';

export class GetProjectInfoUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  async execute(idProject: string, details: boolean): Promise<ProjectEntity | ProjectWithDetails> {
    if (details) {
      const project = await this.projectRepository.findByIdWithDetails(idProject);
      if (!project) throw new Error('Projet non trouve');
      return project;
    }
    const project = await this.projectRepository.findById(idProject);
    if (!project) throw new Error('Projet non trouve');
    return project;
  }
}
