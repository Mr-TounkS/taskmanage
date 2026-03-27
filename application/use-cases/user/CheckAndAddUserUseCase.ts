import { IUserRepository } from '../../../domain/repositories/IUserRepository';

export class CheckAndAddUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(email: string, name: string, imageUrl?: string): Promise<void> {
    if (!email) return;
    const existing = await this.userRepository.findByEmail(email);
    if (!existing && name) {
      await this.userRepository.create(email, name, imageUrl);
    } else if (existing && imageUrl && existing.imageUrl !== imageUrl) {
      // Met à jour la photo si elle a changé (ex: changement de photo Google)
      await this.userRepository.updateImageUrl(email, imageUrl);
    }
  }
}
