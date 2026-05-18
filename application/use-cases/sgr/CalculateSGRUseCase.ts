/**
 * Use-case : Calcul du Score Global de Risque pour un projet
 *
 * Ce use-case orchestre la récupération des données nécessaires
 * (tâches du projet, configurations WIP) et délègue le calcul
 * au module algorithmique `calculateSGR`.
 * Si un repository d'historique est fourni, le résultat est persisté
 * pour alimenter l'étude réflexive (section 4.2 du mémoire).
 *
 * Respecte la Clean Architecture : aucune dépendance vers Prisma ou Next.js.
 * Section mémoire : 2.2 — Modélisation du module de gestion des risques
 */

import { ITaskRepository } from '../../../domain/repositories/ITaskRepository';
import { IColumnWIPConfigRepository } from '../../../domain/repositories/IColumnWIPConfigRepository';
import { ISGRHistoryRepository } from '../../../domain/repositories/ISGRHistoryRepository';
import { calculateSGR } from '../../../lib/risk-algorithm/calculateSGR';
import { SGRResult, SGRTechDebt, SGRGitHubActivity, SprintContext } from '../../../lib/risk-algorithm/types';

export interface CalculateSGRInput {
  projectId: string;
  /** Données SonarCloud optionnelles — absentes si l'intégration n'est pas configurée */
  techDebt?: SGRTechDebt;
  /** Données GitHub optionnelles — absentes si l'intégration n'est pas configurée */
  githubActivity?: SGRGitHubActivity;
  /** Date de référence — utile pour les tests déterministes */
  dateReference?: Date;
}

export class CalculateSGRUseCase {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly columnWIPConfigRepository: IColumnWIPConfigRepository,
    /** Repository optionnel — si fourni, chaque calcul est persisté dans l'historique */
    private readonly sgrHistoryRepository?: ISGRHistoryRepository
  ) {}

  /**
   * Exécute le calcul SGR pour un projet donné et persiste le résultat.
   *
   * @param input - Identifiant du projet et données optionnelles
   * @returns SGRResult avec score, niveau de risque, détail des indicateurs et alertes
   */
  async execute(input: CalculateSGRInput): Promise<SGRResult> {
    const { projectId, techDebt, githubActivity, dateReference } = input;

    // Récupération parallèle des données pour minimiser la latence
    const [taches, colonnesWIP] = await Promise.all([
      this.taskRepository.findByProject(projectId),
      this.columnWIPConfigRepository.findByProject(projectId),
    ]);

    // Sécurité : l'adapter better-sqlite3 peut retourner des strings ISO au lieu de Date
    const toDate = (v: unknown): Date | null => {
      if (v == null) return null;
      if (v instanceof Date) return v;
      const d = new Date(v as string);
      return isNaN(d.getTime()) ? null : d;
    };

    // Mapping vers les types attendus par l'algorithme SGR
    const sgrTasks = taches.map((t) => ({
      id: t.id,
      status: t.status,
      startedAt: toDate(t.startedAt),
      completedAt: toDate(t.completedAt),
    }));

    const sgrColumnConfigs = colonnesWIP.map((c) => ({
      column: c.column,
      wipLimit: c.wipLimit,
    }));

    // Dérivation automatique du SprintContext pour activer Monte-Carlo
    // Hypothèse : sprint de 2 semaines à partir d'aujourd'hui (durée Scrum standard)
    const maintenant = dateReference ?? new Date();
    const msParJour = 1000 * 60 * 60 * 24;
    const sprintContext: SprintContext | undefined = (() => {
      const terminees = sgrTasks.filter(t => t.completedAt !== null);
      if (terminees.length < 3) return undefined; // Pas assez d'historique

      // Débit quotidien sur les 30 derniers jours
      const debut30j = new Date(maintenant.getTime() - 30 * msParJour);
      const throughputMap = new Map<string, number>();
      for (let d = 0; d < 30; d++) {
        const jour = new Date(debut30j.getTime() + d * msParJour);
        const cle = jour.toISOString().slice(0, 10);
        throughputMap.set(cle, 0);
      }
      for (const t of terminees) {
        const cle = t.completedAt!.toISOString().slice(0, 10);
        if (throughputMap.has(cle)) throughputMap.set(cle, (throughputMap.get(cle) ?? 0) + 1);
      }
      const throughputHistory = Array.from(throughputMap.values()).filter(v => v > 0);
      if (throughputHistory.length < 3) return undefined;

      return {
        sprintEndDate: new Date(maintenant.getTime() + 14 * msParJour),
        remainingWorkItems: sgrTasks.filter(t => t.status !== 'Done').length,
        throughputHistory,
      };
    })();

    const result = calculateSGR({
      tasks: sgrTasks,
      columnConfigs: sgrColumnConfigs,
      techDebt,
      githubActivity,
      sprintContext,
      dateReference,
    });

    // Persistance de l'historique SGR si le repository est disponible
    if (this.sgrHistoryRepository) {
      const niveauDB = {
        low: 'faible',
        moderate: 'modéré',
        high: 'élevé',
        critical: 'critique',
      } as const satisfies Record<SGRResult['niveau'], 'faible' | 'modéré' | 'élevé' | 'critique'>;

      await this.sgrHistoryRepository.save({
        projectId,
        sgr: result.sgr,
        niveau: niveauDB[result.niveau],
        alertes: JSON.stringify(result.alertes),
      });
    }

    return result;
  }
}
