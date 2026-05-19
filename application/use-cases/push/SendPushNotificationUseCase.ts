/**
 * Use-case : Envoi de notifications push aux membres d'un projet
 *
 * Déclenché automatiquement par CalculateSGRUseCase quand SGR ≥ 60.
 * Récupère les abonnements du projet, envoie via WebPushService,
 * puis purge les tokens FCM expirés.
 *
 * Section mémoire : 3.4 — Module actif de gestion des risques (notifications)
 */

import { ISubscriptionRepository } from '../../../domain/repositories/ISubscriptionRepository';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface WebPushService {
  /**
   * Envoie une notification à une liste d'abonnements.
   * Retourne les endpoints expirés à supprimer.
   */
  send(
    subscriptions: Array<{ endpoint: string; p256dh: string; auth: string }>,
    payload: { title: string; body: string; url?: string },
  ): Promise<string[]>;
}

export interface SendPushNotificationInput {
  projectId: string;
  sgr: number;
  niveau: RiskLevel;
}

export class SendPushNotificationUseCase {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly webPushService: WebPushService,
  ) {}

  async execute(input: SendPushNotificationInput): Promise<void> {
    const { projectId, sgr, niveau } = input;

    // Règle métier : push uniquement si SGR ≥ 60 (high ou critical)
    if (sgr < 60) return;

    const subscriptions = await this.subscriptionRepository.findByProject(projectId);
    if (subscriptions.length === 0) return;

    const niveauLabel = niveau === 'critical' ? 'CRITICAL' : 'HIGH';
    const payload = {
      title: `⚠️ Project risk: ${niveauLabel}`,
      body:  `SGR = ${Math.round(sgr)} — Check your project dashboard`,
      url:   '/',
    };

    const subData = subscriptions.map((s) => ({
      endpoint: s.endpoint,
      p256dh:   s.keys.p256dh,
      auth:     s.keys.auth,
    }));

    const expiredEndpoints = await this.webPushService.send(subData, payload);

    // Nettoyage automatique des tokens FCM expirés
    if (expiredEndpoints.length > 0) {
      await this.subscriptionRepository.deleteManyByEndpoints(expiredEndpoints);
    }
  }
}
