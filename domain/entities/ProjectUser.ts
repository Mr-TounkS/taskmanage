import { UserEntity } from './User';
import { ProjectEntity } from './Project';

export type ProjectRole = 'PO' | 'MEMBER';

export interface ProjectUserEntity {
  id: string;
  userId: string;
  projectId: string;
  role: ProjectRole;
  user?: UserEntity;
  project?: ProjectEntity;
}
