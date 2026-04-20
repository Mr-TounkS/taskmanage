export type ExternalIntegrationType = 'github' | 'sonarqube';

export interface ExternalIntegrationEntity {
  id: string;
  projectId: string;
  type: ExternalIntegrationType;
  /** Référence externe : "owner/repo" pour GitHub, clé de projet pour SonarCloud */
  externalProjectRef: string;
  webhookSecret: string;
  createdAt: Date;
  updatedAt: Date;
}
