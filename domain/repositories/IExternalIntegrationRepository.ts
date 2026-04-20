import { ExternalIntegrationEntity, ExternalIntegrationType } from '../entities/ExternalIntegration';

export interface IExternalIntegrationRepository {
  /** Crée ou met à jour une intégration pour un projet */
  upsert(data: Omit<ExternalIntegrationEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExternalIntegrationEntity>;
  /** Trouve l'intégration d'un type donné pour un projet */
  findByProjectAndType(projectId: string, type: ExternalIntegrationType): Promise<ExternalIntegrationEntity | null>;
  /** Trouve toutes les intégrations d'un projet */
  findByProject(projectId: string): Promise<ExternalIntegrationEntity[]>;
  /** Supprime une intégration */
  delete(id: string): Promise<void>;
}
