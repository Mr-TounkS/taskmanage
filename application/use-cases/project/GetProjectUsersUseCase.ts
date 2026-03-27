import { IProjectRepository } from '../../../domain/repositories/IProjectRepository';
import { UserEntity } from '../../../domain/entities/User';

export class GetProjectUsersUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  async execute(idProject: string): Promise<UserEntity[]> {
    const projectWithUsers = await this.projectRepository.findWithAllUsers(idProject);

    const collaborators = projectWithUsers?.users.map((pu: { user: UserEntity }) => pu.user) ?? [];
    const creator = projectWithUsers?.createdBy;

    const allUsers =
      creator && !collaborators.some((u) => u.id === creator.id)
        ? [creator, ...collaborators]
        : collaborators;

    return allUsers;
  }
}
