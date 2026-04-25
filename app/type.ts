import { Project as PrismaProject, Task as PrismaTask, User, ProjectRole } from '@/prisma/generated/prisma/client';

export interface TeamMemberStats {
  userId: string
  name: string | null
  email: string
  imageUrl: string | null
  projectId: string
  projectName: string
  role: ProjectRole
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
  progressPercentage: number
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface AnalyticsData {
  // Bloc 1 — Vue globale des tâches
  tasksByStatus:       { status: string;    count: number }[]
  tasksByPriority:     { priority: string;  count: number }[]
  velocityByWeek:      { week: string;      count: number }[]  // 12 dernières semaines ISO
  completionByProject: { projectName: string; total: number; done: number; rate: number }[]
  // Bloc 2 — SGR
  sgrByProject:        { projectId: string; projectName: string; history: { sgr: number; niveau: string; createdAt: string }[] }[]
  sgrLevelDistribution:{ niveau: string;    count: number }[]
  latestSGRByProject:  { projectName: string; sgr: number; niveau: string }[]
}

// ---------------------------------------------------------------------------
// Fusion du type PrismaProject avec vos propriétés supplémentaires
export type Project = PrismaProject & {
  totalTasks?: number;
  collaboratorsCount?: number;
  taskStats?: {
    toDo: number;
    inProgress: number;
    done: number;
  };
  percentages?: {
    progressPercentage: number;
    inProgressPercentage: number;
    toDoPercentage: number;
  };
  tasks?: Task[]; // Assurez-vous que la relation tasks est incluse
  users?: (User & { role: ProjectRole })[];
  createdBy?: User,
};

export type Task = PrismaTask & {
  user?: User | null;
  createdBy?: User | null;
  // Champs ajoutés — migration 20260322
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  startDate?: Date | null;
}