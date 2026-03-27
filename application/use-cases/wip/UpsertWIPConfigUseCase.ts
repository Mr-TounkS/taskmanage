/**
 * Use-case : Configuration des limites WIP par colonne Kanban
 *
 * Permet de définir ou mettre à jour la limite de Work In Progress
 * pour chaque colonne d'un projet. Une limite à 0 signifie "pas de limite".
 *
 * Fondement théorique : Loi de Little — CT = WIP / Throughput.
 * Limiter le WIP est le levier principal pour maîtriser le Cycle Time.
 *
 * Section mémoire : 2.3 — Algorithme SGR (R_WIP)
 */

import { IColumnWIPConfigRepository } from '../../../domain/repositories/IColumnWIPConfigRepository';
import { ColumnWIPConfigEntity } from '../../../domain/entities/ColumnWIPConfig';

// Colonnes Kanban supportées par l'application
export const COLONNES_KANBAN = ['To Do', 'In Progress', 'Done'] as const;
export type ColonneKanban = typeof COLONNES_KANBAN[number];

export interface UpsertWIPConfigInput {
  projectId: string;
  /** Limite WIP pour chaque colonne (0 = pas de limite) */
  configs: { column: ColonneKanban; wipLimit: number }[];
}

export class UpsertWIPConfigUseCase {
  constructor(
    private readonly columnWIPConfigRepository: IColumnWIPConfigRepository
  ) {}

  /**
   * Sauvegarde les limites WIP pour toutes les colonnes d'un projet.
   * Utilise un upsert pour créer ou mettre à jour chaque entrée.
   *
   * @param input - projectId + tableau des configs par colonne
   * @returns Les entités sauvegardées
   */
  async execute(input: UpsertWIPConfigInput): Promise<ColumnWIPConfigEntity[]> {
    const { projectId, configs } = input;

    // Validation : les limites WIP doivent être des entiers positifs ou nuls
    for (const config of configs) {
      if (!Number.isInteger(config.wipLimit) || config.wipLimit < 0) {
        throw new Error(
          `Limite WIP invalide pour la colonne "${config.column}" : doit être un entier ≥ 0`
        );
      }
    }

    // Upsert parallèle pour chaque colonne
    const resultats = await Promise.all(
      configs.map((config) =>
        this.columnWIPConfigRepository.upsert(
          projectId,
          config.column,
          config.wipLimit
        )
      )
    );

    return resultats;
  }
}
