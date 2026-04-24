import { IProjectRepository } from '../../../domain/repositories/IProjectRepository';
import { TeamMemberStats } from '../../../app/type';

export class GetTeamsOverviewUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  /**
   * Agrège les statistiques de tâches par membre pour tous les projets associés à un utilisateur.
   * Utilisé par l'onglet Teams pour visualiser la charge et l'avancement de chaque membre.
   */
  async execute(userEmail: string): Promise<TeamMemberStats[]> {
    const projects = await this.projectRepository.findManyAssociatedWithUser(userEmail);
    const now = new Date();
    const stats: TeamMemberStats[] = [];

    for (const project of projects) {
      for (const member of project.users) {
        // Tâches assignées à ce membre dans ce projet
        const memberTasks = project.tasks.filter(t => t.userId === member.id);

        const totalTasks = memberTasks.length;
        const completedTasks = memberTasks.filter(t => t.status === 'Done').length;
        const inProgressTasks = memberTasks.filter(t => t.status === 'In Progress').length;
        // Retard : date d'échéance dépassée et tâche non terminée
        const overdueTasks = memberTasks.filter(
          t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'Done'
        ).length;

        const progressPercentage = totalTasks > 0
          ? Math.round((completedTasks / totalTasks) * 100)
          : 0;

        stats.push({
          userId: member.id,
          name: member.name,
          email: member.email,
          imageUrl: member.imageUrl ?? null,
          projectId: project.id,
          projectName: project.name,
          role: member.role,
          totalTasks,
          completedTasks,
          inProgressTasks,
          overdueTasks,
          progressPercentage,
        });
      }
    }

    return stats;
  }
}
