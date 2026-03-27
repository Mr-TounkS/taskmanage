import { SGRHistoryEntity } from '../entities/SGRHistory';

export interface ISGRHistoryRepository {
  /** Sauvegarde un calcul SGR pour un projet */
  save(entry: Omit<SGRHistoryEntity, 'id' | 'createdAt'>): Promise<SGRHistoryEntity>;
  /** Retourne l'historique SGR d'un projet (du plus récent au plus ancien) */
  findByProject(projectId: string): Promise<SGRHistoryEntity[]>;
}
