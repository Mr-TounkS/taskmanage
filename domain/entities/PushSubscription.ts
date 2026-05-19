/**
 * Entité domain — PushSubscription
 * Représente un abonnement aux notifications push d'un utilisateur.
 *
 * Section mémoire : 3.4 — Module actif de gestion des risques (notifications)
 */

export interface SubscriptionKeys {
  /** Clé publique ECDH (inutilisée avec Firebase FCM, conservée pour compatibilité) */
  p256dh: string;
  /** Secret d'authentification (inutilisé avec Firebase FCM) */
  auth: string;
}

export interface PushSubscriptionEntity {
  id: string;
  userId: string;
  /** Token FCM (stocké dans endpoint pour compatibilité schéma) */
  endpoint: string;
  keys: SubscriptionKeys;
  createdAt: Date;
}
