/**
 * lib/push-notifications.ts
 * Envoi de notifications push via Firebase Cloud Messaging (Admin SDK).
 *
 * Migration web-push VAPID → firebase-admin FCM :
 * Le token FCM (stocké dans PushSubscription.endpoint) est utilisé
 * comme identifiant de destination pour chaque message.
 *
 * Variables d'environnement requises (serveur uniquement) :
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 *
 * Architecture : infrastructure — ne pas importer dans domain/ ni application/
 */

import { fcmAdmin } from "@/lib/firebase-admin";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

export interface PushSubscriptionData {
  endpoint: string; // Contient le token FCM
  p256dh: string;   // Inutilisé avec FCM (conservé pour compatibilité schéma)
  auth: string;     // Inutilisé avec FCM (conservé pour compatibilité schéma)
}

/**
 * Envoie une notification push FCM à un token unique.
 * Retourne false si le token est expiré/invalide — le caller doit le supprimer.
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<boolean> {
  try {
    await fcmAdmin.send({
      token: subscription.endpoint,
      notification: {
        title: payload.title,
        body:  payload.body,
      },
      webpush: {
        notification: {
          icon:  payload.icon ?? "/android/launchericon-192x192.png",
          badge: "/android/launchericon-96x96.png",
        },
        fcmOptions: {
          link: payload.url ?? "/",
        },
      },
    });
    return true;
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token"
    ) {
      return false;
    }
    console.error("[FCM] Erreur envoi notification :", error);
    return false;
  }
}

/**
 * Envoie une notification push FCM à tous les tokens d'un utilisateur.
 * Retourne la liste des tokens expirés à supprimer.
 */
export async function sendPushToSubscriptions(
  subscriptions: PushSubscriptionData[],
  payload: PushPayload
): Promise<string[]> {
  const expiredTokens: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      const success = await sendPushNotification(sub, payload);
      if (!success) expiredTokens.push(sub.endpoint);
    })
  );

  return expiredTokens;
}
