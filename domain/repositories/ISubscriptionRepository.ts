/**
 * Interface repository — ISubscriptionRepository
 * Contrat d'accès aux abonnements push — indépendant de l'infrastructure.
 *
 * Section mémoire : 3.4 — Module actif de gestion des risques (notifications)
 */

import { PushSubscriptionEntity } from '../entities/PushSubscription';

export interface SaveSubscriptionData {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface ISubscriptionRepository {
  /** Crée ou met à jour un abonnement (upsert sur endpoint) */
  save(data: SaveSubscriptionData): Promise<void>;
  /** Retourne tous les abonnements actifs des membres d'un projet */
  findByProject(projectId: string): Promise<PushSubscriptionEntity[]>;
  /** Supprime un abonnement par son endpoint (token FCM expiré) */
  deleteByEndpoint(endpoint: string): Promise<void>;
  /** Supprime en masse les tokens FCM expirés */
  deleteManyByEndpoints(endpoints: string[]): Promise<void>;
  /** Recherche un abonnement par userId */
  findByUserId(userId: string): Promise<PushSubscriptionEntity | null>;
}
