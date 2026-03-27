import { UserEntity } from './User';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface TaskEntity {
  id: string;
  name: string;
  description: string;
  status: string;
  // Priorité de la tâche — alimentera R_Age dans le SGR (tâches haute priorité en retard = risque accru)
  priority: TaskPriority;
  // Date de début planifiée par l'utilisateur
  startDate: Date | null;
  dueDate: Date | null;
  // Horodatages pour le calcul SGR (Cycle Time, Work Item Age, Throughput)
  startedAt: Date | null;
  completedAt: Date | null;
  projectId: string;
  userId: string | null;
  createdById: string;
  solutionDescription: string | null;
  user?: UserEntity | null;
  createdBy?: UserEntity | null;
  project?: {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    inviteCode: string;
    createdById: string;
  };
}
