/**
 * Use-case : Enregistrement d'un abonnement push
 *
 * Orchestre la récupération de l'utilisateur par email et la persistance
 * de son token FCM (stocké dans endpoint) via ISubscriptionRepository.
 *
 * Section mémoire : 3.4 — Module actif de gestion des risques (notifications)
 */

import { ISubscriptionRepository } from '../../../domain/repositories/ISubscriptionRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';

export interface RegisterPushSubscriptionInput {
  userEmail: string;
  /** URL unique du push service du navigateur */
  token: string;   // endpoint
  p256dh?: string; // clé publique de chiffrement
  auth?: string;   // secret d'authentification
}

export class RegisterPushSubscriptionUseCase {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: RegisterPushSubscriptionInput): Promise<void> {
    const { userEmail, token, p256dh, auth } = input;

    const user = await this.userRepository.findByEmail(userEmail);
    if (!user) throw new Error(`Utilisateur introuvable : ${userEmail}`);

    await this.subscriptionRepository.save({
      userId:   user.id,
      endpoint: token,
      p256dh:   p256dh ?? '',
      auth:     auth   ?? '',
    });
  }
}
