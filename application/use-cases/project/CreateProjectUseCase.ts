import { randomBytes } from 'crypto';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IProjectRepository } from '../../../domain/repositories/IProjectRepository';
import { ProjectEntity } from '../../../domain/entities/Project';

export class CreateProjectUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly projectRepository: IProjectRepository
  ) {}

  async execute(name: string, description: string, email: string): Promise<ProjectEntity> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new Error('User not found');

    const inviteCode = randomBytes(6).toString('hex');
    return this.projectRepository.create(name, description, user.id, inviteCode);
  }
}
