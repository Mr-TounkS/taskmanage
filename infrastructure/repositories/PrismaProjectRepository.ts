import { PrismaClient } from '../../prisma/generated/prisma/client';
import {
  IProjectRepository,
  ProjectWithFlatUsers,
  ProjectWithDetails,
} from '../../domain/repositories/IProjectRepository';
import { ProjectEntity } from '../../domain/entities/Project';
import { UserEntity } from '../../domain/entities/User';

export class PrismaProjectRepository implements IProjectRepository {
  constructor(private readonly prisma: PrismaClient) { }

  async create(
    name: string,
    description: string,
    createdById: string,
    inviteCode: string
  ): Promise<ProjectEntity> {
    return this.prisma.project.create({
      data: { name, description, inviteCode, createdById },
    }) as Promise<ProjectEntity>;
  }

  async findById(projectId: string): Promise<ProjectEntity | null> {
    return this.prisma.project.findUnique({
      where: { id: projectId },
    }) as Promise<ProjectEntity | null>;
  }

  async findByIdWithDetails(projectId: string): Promise<ProjectWithDetails | null> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: { include: { user: true, createdBy: true } },
        users: { select: { user: { select: { id: true, name: true, email: true } } } },
        createdBy: true,
      },
    });
    if (!project) return null;
    return {
      ...project,
      users: project.users.map((entry) => entry.user),
    } as ProjectWithDetails;
  }

  async findByInviteCode(inviteCode: string): Promise<ProjectEntity | null> {
    return this.prisma.project.findUnique({
      where: { inviteCode },
    }) as Promise<ProjectEntity | null>;
  }

  async findManyCreatedByUser(email: string): Promise<ProjectWithFlatUsers[]> {
    const projects = await this.prisma.project.findMany({
      where: { createdBy: { email } },
      include: {
        tasks: { include: { user: true, createdBy: true } },
        users: { select: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    return projects.map((p) => ({
      ...p,
      users: p.users.map((entry) => entry.user),
    })) as ProjectWithFlatUsers[];
  }

  async findManyAssociatedWithUser(email: string): Promise<ProjectWithFlatUsers[]> {
    const projects = await this.prisma.project.findMany({
      where: { users: { some: { user: { email } } } },
      include: {
        tasks: true,
        users: { select: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    return projects.map((p) => ({
      ...p,
      users: p.users.map((entry) => entry.user),
    })) as ProjectWithFlatUsers[];
  }

  async findWithAllUsers(projectId: string): Promise<(Omit<ProjectEntity, 'users'> & {
    users: { user: UserEntity }[];
    createdBy: UserEntity;
  }) | null> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        users: { include: { user: true } },
        createdBy: true,
      },
    });
    return project as unknown as (Omit<ProjectEntity, 'users'> & {
      users: { user: UserEntity }[];
      createdBy: UserEntity;
    }) | null;
  }

  async delete(projectId: string): Promise<void> {
    await this.prisma.project.delete({ where: { id: projectId } });
  }

  async addUser(userId: string, projectId: string): Promise<void> {
    await this.prisma.projectUser.create({ data: { userId, projectId } });
  }

  async isUserAlreadyMember(userId: string, projectId: string): Promise<boolean> {
    const existing = await this.prisma.projectUser.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });
    return existing !== null;
  }
}
