import { IProjectRepository } from '../../../domain/repositories/IProjectRepository';
import { UserEntity } from '../../../domain/entities/User';
import { ProjectRole } from '../../../domain/entities/ProjectUser';

export class GetProjectUsersUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  async execute(idProject: string): Promise<(UserEntity & { role: ProjectRole })[]> {
    const projectWithUsers = await this.projectRepository.findWithAllUsers(idProject);

    if (!projectWithUsers) return [];

    return projectWithUsers.users.map(pu => ({
      ...pu.user,
      role: pu.role
    }));
  }
}
