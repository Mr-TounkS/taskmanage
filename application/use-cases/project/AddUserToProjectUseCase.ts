import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IProjectRepository } from '../../../domain/repositories/IProjectRepository';

export class AddUserToProjectUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly projectRepository: IProjectRepository
  ) {}

  async execute(email: string, inviteCode: string): Promise<string> {
    const project = await this.projectRepository.findByInviteCode(inviteCode);
    if (!project) throw new Error('Projet non trouve');

    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new Error('Utilisateur non trouve');

    const alreadyMember = await this.projectRepository.isUserAlreadyMember(user.id, project.id);
    if (alreadyMember) throw new Error('Utilisateur deja associer a ce projet');

    await this.projectRepository.addUser(user.id, project.id);
    return 'Utilisateur ajoute avec succes';
  }
}
