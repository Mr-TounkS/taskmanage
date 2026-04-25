import { IProjectRepository } from '../../../domain/repositories/IProjectRepository';
import { ISGRHistoryRepository } from '../../../domain/repositories/ISGRHistoryRepository';
import { AnalyticsData } from '../../../app/type';

export class GetAnalyticsDataUseCase {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly sgrHistoryRepository: ISGRHistoryRepository,
  ) {}

  /**
   * Agrège toutes les données analytiques pour un utilisateur :
   * - Bloc 1 : statistiques de tâches (statut, priorité, vélocité, taux de complétion)
   * - Bloc 2 : évolution SGR par projet, distribution des niveaux, derniers scores
   */
  async execute(userEmail: string): Promise<AnalyticsData> {
    const projects = await this.projectRepository.findManyAssociatedWithUser(userEmail);

    // ── Collecte de toutes les tâches ────────────────────────────────────────
    const allTasks = projects.flatMap(p => p.tasks);

    // ── Bloc 1a : répartition par statut ────────────────────────────────────
    const statusMap = new Map<string, number>();
    for (const task of allTasks) {
      statusMap.set(task.status, (statusMap.get(task.status) ?? 0) + 1);
    }
    const tasksByStatus = ['To Do', 'In Progress', 'Done'].map(s => ({
      status: s,
      count: statusMap.get(s) ?? 0,
    }));

    // ── Bloc 1b : répartition par priorité ──────────────────────────────────
    const priorityMap = new Map<string, number>();
    for (const task of allTasks) {
      const p = task.priority ?? 'MEDIUM';
      priorityMap.set(p, (priorityMap.get(p) ?? 0) + 1);
    }
    const tasksByPriority = ['LOW', 'MEDIUM', 'HIGH'].map(p => ({
      priority: p,
      count: priorityMap.get(p) ?? 0,
    }));

    // ── Bloc 1c : vélocité hebdomadaire (12 dernières semaines) ─────────────
    const velocityByWeek = this.computeVelocity(allTasks);

    // ── Bloc 1d : taux de complétion par projet ──────────────────────────────
    const completionByProject = projects.map(p => {
      const total = p.tasks.length;
      const done  = p.tasks.filter(t => t.status === 'Done').length;
      return {
        projectName: p.name,
        total,
        done,
        rate: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    });

    // ── Bloc 2 : historique SGR par projet ───────────────────────────────────
    const sgrByProject: AnalyticsData['sgrByProject'] = [];
    const sgrLevelMap = new Map<string, number>();
    const latestSGRByProject: AnalyticsData['latestSGRByProject'] = [];

    for (const project of projects) {
      const history = await this.sgrHistoryRepository.findByProject(project.id);

      // Courbe multi-projets
      sgrByProject.push({
        projectId: project.id,
        projectName: project.name,
        history: history.map(h => ({
          sgr:       Math.round(h.sgr),
          niveau:    h.niveau,
          createdAt: h.createdAt.toISOString(),
        })),
      });

      // Distribution des niveaux (sur tout l'historique)
      for (const h of history) {
        sgrLevelMap.set(h.niveau, (sgrLevelMap.get(h.niveau) ?? 0) + 1);
      }

      // Dernier score connu par projet
      if (history.length > 0) {
        const latest = history[0]; // findByProject retourne du plus récent au plus ancien
        latestSGRByProject.push({
          projectName: project.name,
          sgr:         Math.round(latest.sgr),
          niveau:      latest.niveau,
        });
      }
    }

    const sgrLevelDistribution = ['faible', 'modéré', 'élevé', 'critique'].map(n => ({
      niveau: n,
      count:  sgrLevelMap.get(n) ?? 0,
    }));

    return {
      tasksByStatus,
      tasksByPriority,
      velocityByWeek,
      completionByProject,
      sgrByProject,
      sgrLevelDistribution,
      latestSGRByProject,
    };
  }

  // ── Helpers privés ────────────────────────────────────────────────────────

  /**
   * Groupe les tâches terminées par semaine ISO sur les 12 dernières semaines.
   * Retourne un tableau de 12 entrées avec le label "Wnn" et le nombre de tâches.
   */
  private computeVelocity(tasks: { status: string; completedAt: Date | null }[]): { week: string; count: number }[] {
    const now   = new Date();
    const weeks = 12;
    const result: { week: string; count: number }[] = [];

    for (let i = weeks - 1; i >= 0; i--) {
      // Début de la semaine (lundi) à i semaines en arrière
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + 1 - i * 7);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Numéro de semaine ISO pour le label
      const weekNum = this.getISOWeekNumber(weekStart);
      const label   = `W${String(weekNum).padStart(2, '0')}`;

      const count = tasks.filter(t =>
        t.status === 'Done' &&
        t.completedAt !== null &&
        new Date(t.completedAt) >= weekStart &&
        new Date(t.completedAt) <= weekEnd
      ).length;

      result.push({ week: label, count });
    }

    return result;
  }

  /** Calcule le numéro de semaine ISO 8601 pour une date donnée */
  private getISOWeekNumber(date: Date): number {
    const d    = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}
