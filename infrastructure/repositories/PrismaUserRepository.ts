import { PrismaClient } from '../../prisma/generated/prisma/client';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserEntity } from '../../domain/entities/User';

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) { }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(email: string, name: string, imageUrl?: string): Promise<UserEntity> {
    return this.prisma.user.create({ data: { email, name, imageUrl } });
  }

  async updateImageUrl(email: string, imageUrl: string): Promise<void> {
    await this.prisma.user.update({ where: { email }, data: { imageUrl } });
  }
}
