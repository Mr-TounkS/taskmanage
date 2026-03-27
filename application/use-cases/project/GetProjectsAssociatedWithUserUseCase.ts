import { IProjectRepository, ProjectWithFlatUsers } from '../../../domain/repositories/IProjectRepository';

export class GetProjectsAssociatedWithUserUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  async execute(email: string): Promise<ProjectWithFlatUsers[]> {
    return this.projectRepository.findManyAssociatedWithUser(email);
  }
}
