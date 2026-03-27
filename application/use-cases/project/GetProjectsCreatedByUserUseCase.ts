import { IProjectRepository, ProjectWithFlatUsers } from '../../../domain/repositories/IProjectRepository';

export class GetProjectsCreatedByUserUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  async execute(email: string): Promise<ProjectWithFlatUsers[]> {
    return this.projectRepository.findManyCreatedByUser(email);
  }
}
