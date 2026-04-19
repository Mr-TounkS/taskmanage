import { UserEntity } from '../entities/User';
import { ProjectEntity } from '../entities/Project';
import { TaskEntity } from '../entities/Task';
import { ProjectRole } from '../entities/ProjectUser';

export interface ProjectWithFlatUsers extends Omit<ProjectEntity, 'users'> {
  tasks: TaskEntity[];
  users: (UserEntity & { role: ProjectRole })[];
}

export interface ProjectWithDetails extends Omit<ProjectEntity, 'users'> {
  tasks: TaskEntity[];
  users: (UserEntity & { role: ProjectRole })[];
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
    users: { user: UserEntity; role: ProjectRole }[];
    createdBy: UserEntity;
  }) | null>;
  delete(projectId: string): Promise<void>;
  addUser(userId: string, projectId: string, role?: ProjectRole): Promise<void>;
  isUserAlreadyMember(userId: string, projectId: string): Promise<boolean>;
}
