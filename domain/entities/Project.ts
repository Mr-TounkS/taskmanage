import { UserEntity } from './User';
import { TaskEntity } from './Task';

export interface ProjectEntity {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  inviteCode: string;
  createdById: string;
  tasks?: TaskEntity[];
  users?: UserEntity[];
  createdBy?: UserEntity;
}
