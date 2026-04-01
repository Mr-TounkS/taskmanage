/**
 * lib/push-notifications.ts
 * Wrapper web-push pour l'envoi de notifications push via le protocole Web Push (VAPID).
 *
 * Prérequis — variables d'environnement :
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY  → clé publique VAPID (exposée au client)
 *   VAPID_PRIVATE_KEY             → clé privée VAPID (serveur uniquement)
 *   VAPID_SUBJECT                 → contact (ex: mailto:admin@taskmanage.app)
 *
 * Génération des clés : npx web-push generate-vapid-keys
 *
 * Architecture : infrastructure — ne doit pas être importé dans domain/ ni application/
 */

import webpush from "web-push";

// Configuration VAPID — initialisée une seule fois au démarrage du serveur
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? "mailto:admin@taskmanage.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Envoie une notification push à un abonnement unique.
 * Retourne false si l'abonnement est expiré (410 Gone) — le caller doit alors le supprimer.
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url ?? "/",
        icon: payload.icon ?? "/android-192x192.png",
      })
    );
    return true;
  } catch (error: unknown) {
    // Abonnement expiré ou révoqué → signale au caller pour suppression
    if (
      error instanceof Object &&
      "statusCode" in error &&
      (error as { statusCode: number }).statusCode === 410
    ) {
      return false;
    }
    console.error("[Push] Erreur envoi notification :", error);
    return false;
  }
}

/**
 * Envoie une notification push à tous les abonnements d'un utilisateur.
 * Retourne la liste des endpoints expirés à supprimer.
 */
export async function sendPushToSubscriptions(
  subscriptions: PushSubscriptionData[],
  payload: PushPayload
): Promise<string[]> {
  const expiredEndpoints: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      const success = await sendPushNotification(sub, payload);
      if (!success) expiredEndpoints.push(sub.endpoint);
    })
  );

  return expiredEndpoints;
}
