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
import { SGRResult, SGRTechDebt, SGRGitHubActivity } from '../../../lib/risk-algorithm/types';

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

    const result = calculateSGR({
      tasks: sgrTasks,
      columnConfigs: sgrColumnConfigs,
      techDebt,
      githubActivity,
      dateReference,
    });

    // Persistance de l'historique SGR si le repository est disponible
    if (this.sgrHistoryRepository) {
      await this.sgrHistoryRepository.save({
        projectId,
        sgr: result.sgr,
        niveau: result.niveau,
        alertes: JSON.stringify(result.alertes),
      });
    }

    return result;
  }
}
