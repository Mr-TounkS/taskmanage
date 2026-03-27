import { UserEntity } from '../entities/User';
import { ProjectEntity } from '../entities/Project';
import { TaskEntity } from '../entities/Task';

export interface ProjectWithFlatUsers extends ProjectEntity {
  tasks: TaskEntity[];
  users: UserEntity[];
}

export interface ProjectWithDetails extends ProjectEntity {
  tasks: TaskEntity[];
  users: UserEntity[];
  createdBy: UserEntity;
}

export interface IProjectRepository {
  create(name: string, description: string, createdById: string, inviteCode: string): Promise<ProjectEntity>;
  findById(projectId: string): Promise<ProjectEntity | null>;
  findByIdWithDetails(projectId: string): Promise<ProjectWithDetails | null>;
  findByInviteCode(inviteCode: string): Promise<ProjectEntity | null>;
  findManyCreatedByUser(email: string): Promise<ProjectWithFlatUsers[]>;
  findManyAssociatedWithUser(email: string): Promise<ProjectWithFlatUsers[]>;
  findWithAllUsers(projectId: string): Promise<(Omit<ProjectEntity, 'users'> & {
    users: { user: UserEntity }[];
    createdBy: UserEntity;
  }) | null>;
  delete(projectId: string): Promise<void>;
  addUser(userId: string, projectId: string): Promise<void>;
  isUserAlreadyMember(userId: string, projectId: string): Promise<boolean>;
}
