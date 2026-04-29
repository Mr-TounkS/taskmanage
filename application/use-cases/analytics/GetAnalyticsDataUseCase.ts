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

    // ── Bloc 2 : métriques de flux Kanban ───────────────────────────────────
    const throughputStats  = this.computeThroughputStats(velocityByWeek);
    const cycleTimePoints  = this.computeCycleTimePoints(allTasks);
    const { sleDays, sle85Change } = this.computeSLE(allTasks);

    return {
      tasksByStatus,
      tasksByPriority,
      velocityByWeek,
      completionByProject,
      throughputStats,
      cycleTimePoints,
      sleDays,
      sle85Change,
      sgrByProject,
      sgrLevelDistribution,
      latestSGRByProject,
    };
  }

  // ── Helpers privés ────────────────────────────────────────────────────────

  /**
   * Calcule le débit moyen (4 dernières semaines) et la variation vs 4 semaines précédentes.
   */
  private computeThroughputStats(velocity: { week: string; count: number }[]): { avgPerWeek: number; changePercent: number } {
    const last4 = velocity.slice(-4).map(d => d.count);
    const prev4 = velocity.slice(-8, -4).map(d => d.count);
    const avgLast = last4.reduce((a, b) => a + b, 0) / Math.max(last4.length, 1);
    const avgPrev = prev4.reduce((a, b) => a + b, 0) / Math.max(prev4.length, 1);
    const changePercent = avgPrev > 0 ? Math.round((avgLast - avgPrev) / avgPrev * 100) : 0;
    return { avgPerWeek: Math.round(avgLast), changePercent };
  }

  /**
   * Retourne les points de Cycle Time (completedAt − startedAt en jours)
   * pour toutes les tâches terminées ayant les deux horodatages.
   * Triés par date de livraison croissante.
   */
  private computeCycleTimePoints(
    tasks: { status: string; startedAt: Date | null; completedAt: Date | null }[]
  ): { date: string; cycleTimeDays: number }[] {
    return tasks
      .filter(t => t.status === 'Done' && t.startedAt !== null && t.completedAt !== null)
      .map(t => ({
        date: new Date(t.completedAt!).toISOString(),
        cycleTimeDays: Math.max(
          0,
          Math.round((new Date(t.completedAt!).getTime() - new Date(t.startedAt!).getTime()) / 86_400_000)
        ),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calcule le SLE (85e centile du Cycle Time) sur les 30 derniers jours
   * et la variation par rapport aux 30 jours précédents.
   */
  private computeSLE(
    tasks: { status: string; startedAt: Date | null; completedAt: Date | null }[]
  ): { sleDays: number; sle85Change: number } {
    const now        = Date.now();
    const MS_30_DAYS = 30 * 86_400_000;

    const ctOf = (period: { from: number; to: number }) =>
      tasks
        .filter(t =>
          t.status === 'Done' &&
          t.startedAt !== null &&
          t.completedAt !== null &&
          new Date(t.completedAt!).getTime() >= period.from &&
          new Date(t.completedAt!).getTime() <= period.to
        )
        .map(t =>
          Math.max(0, (new Date(t.completedAt!).getTime() - new Date(t.startedAt!).getTime()) / 86_400_000)
        );

    const current  = ctOf({ from: now - MS_30_DAYS, to: now });
    const previous = ctOf({ from: now - 2 * MS_30_DAYS, to: now - MS_30_DAYS });

    const sle85 = (values: number[]) => {
      if (values.length === 0) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      const idx    = Math.ceil(sorted.length * 0.85) - 1;
      return Math.round(sorted[Math.max(0, idx)]);
    };

    const sleDays    = sle85(current);
    const prevSLE    = sle85(previous);
    const sle85Change = prevSLE > 0 ? Math.round((sleDays - prevSLE) / prevSLE * 100) : 0;

    return { sleDays, sle85Change };
  }

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
