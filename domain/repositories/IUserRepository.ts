import { UserEntity } from '../entities/User';

export interface IUserRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  create(email: string, name: string, imageUrl?: string | null): Promise<UserEntity>;
  updateImageUrl(email: string, imageUrl: string): Promise<void>;
}
