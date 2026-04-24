import { TaskEntity, TaskPriority } from '../entities/Task';
import { UserEntity } from '../entities/User';

export interface CreateTaskData {
  name: string;
  description: string;
  priority: TaskPriority;
  startDate: Date | null;
  dueDate: Date | null;
  projectId: string;
  createdById: string;
  userId: string;
}

export interface TaskFile {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  blobUrl: string;
  uploadedAt: Date;
}

export interface TaskWithRelations extends TaskEntity {
  user: UserEntity | null;
  createdBy: UserEntity;
  files: TaskFile[];
  project: {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    inviteCode: string;
    createdById: string;
  };
}

export interface ITaskRepository {
  create(data: CreateTaskData): Promise<TaskEntity>;
  findById(taskId: string): Promise<TaskEntity | null>;
  findByIdWithRelations(taskId: string): Promise<TaskWithRelations | null>;
  /** Retourne toutes les tâches d'un projet — utilisé par le calcul SGR */
  findByProject(projectId: string): Promise<TaskEntity[]>;
  delete(taskId: string): Promise<void>;
  updateStatus(taskId: string, newStatus: string, solutionDescription?: string): Promise<void>;
}
