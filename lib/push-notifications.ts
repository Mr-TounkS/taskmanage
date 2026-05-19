/**
 * lib/push-notifications.ts
 * Envoi de notifications push via Web Push VAPID natif (package web-push).
 *
 * Le protocole Web Push standard utilise :
 *   - endpoint  : URL unique du push service du navigateur
 *   - p256dh    : clé publique de chiffrement du client
 *   - auth      : secret d'authentification du client
 *
 * Variables d'environnement requises (serveur uniquement) :
 *   VAPID_PUBLIC_KEY   (généré via : npx web-push generate-vapid-keys)
 *   VAPID_PRIVATE_KEY
 *   VAPID_MAILTO       (ex: mailto:admin@example.com)
 *
 * Architecture : infrastructure — ne pas importer dans domain/ ni application/
 * Section mémoire : 3.4 — Module actif de gestion des risques (notifications)
 */

import webpush from "web-push";

let vapidInitialized = false;

/**
 * Initialise les clés VAPID de manière paresseuse (lazy).
 * Appelé juste avant chaque envoi — évite l'erreur au build
 * quand les variables d'environnement ne sont pas encore disponibles.
 */
function ensureVapidInitialized(): void {
  if (vapidInitialized) return;

  const publicKey  = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const mailto     = process.env.VAPID_MAILTO ?? "mailto:admin@taskmanage.app";

  if (!publicKey || !privateKey) {
    throw new Error(
      "[WebPush] VAPID keys missing. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in environment variables."
    );
  }

  webpush.setVapidDetails(mailto, publicKey, privateKey);
  vapidInitialized = true;
}

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
 * Sends a Web Push notification to a single subscription.
 * Returns false if the subscription is expired/invalid — caller should delete it.
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<boolean> {
  try {
    ensureVapidInitialized();
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify({
        title: payload.title,
        body:  payload.body,
        icon:  payload.icon ?? "/android/launchericon-192x192.png",
        url:   payload.url  ?? "/",
      }),
    );
    return true;
  } catch (error: unknown) {
    const status = (error as { statusCode?: number })?.statusCode;
    // 404 = endpoint gone, 410 = subscription expired
    if (status === 404 || status === 410) return false;
    console.error("[WebPush] Error sending notification:", error);
    return false;
  }
}

/**
 * Sends a Web Push notification to all subscriptions of a project.
 * Returns the list of expired endpoints to delete.
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
