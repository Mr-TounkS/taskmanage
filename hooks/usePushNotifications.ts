"use client";

/**
 * usePushNotifications.ts
 * Hook React pour gérer l'abonnement aux notifications push Web.
 *
 * Fonctionnement :
 *   1. Vérifie le support (Notification API + ServiceWorker + PushManager)
 *   2. Demande la permission à l'utilisateur
 *   3. Souscrit via pushManager.subscribe() avec la clé VAPID publique
 *   4. Sauve l'abonnement en base via /api/push/subscribe
 *   5. Permet le désabonnement via /api/push/unsubscribe
 */

import { useCallback, useEffect, useState } from "react";

type PermissionState = "default" | "granted" | "denied";

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: PermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: (userEmail: string) => Promise<void>;
  unsubscribe: () => Promise<void>;
}

/** Convertit une clé VAPID base64url en Uint8Array pour pushManager.subscribe() */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<PermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Vérifie le support et l'état initial au montage
  useEffect(() => {
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission as PermissionState);

      // Vérifie si un abonnement actif existe déjà
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(sub !== null);
        });
      });
    }
  }, []);

  const subscribe = useCallback(async (userEmail: string): Promise<void> => {
    if (!isSupported) return;
    setIsLoading(true);

    try {
      // Demande la permission à l'utilisateur
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);

      if (result !== "granted") {
        setIsLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidKey) {
        console.error("[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY manquant dans les variables d'environnement");
        setIsLoading(false);
        return;
      }

      // Vérifie que la clé VAPID fait bien 65 bytes (point P-256 non compressé)
      const keyArray = urlBase64ToUint8Array(vapidKey);
      if (keyArray.length !== 65) {
        console.error(`[Push] Clé VAPID invalide : ${keyArray.length} bytes (attendu 65). Vérifiez NEXT_PUBLIC_VAPID_PUBLIC_KEY.`);
        setIsLoading(false);
        return;
      }

      // Supprime l'ancien abonnement s'il existe (évite le conflit de clé VAPID)
      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
      }

      // Souscrit auprès du navigateur avec la clé VAPID publique
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyArray as unknown as ArrayBuffer,
      });

      const keys = subscription.toJSON().keys as { p256dh: string; auth: string };

      // Sauvegarde l'abonnement en base
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userEmail,
        }),
      });

      setIsSubscribed(true);
    } catch (error) {
      console.error("[Push] Erreur lors de l'abonnement :", error);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        // Supprime en base
        await fetch("/api/push/unsubscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        // Désabonne côté navigateur
        await subscription.unsubscribe();
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error("[Push] Erreur lors du désabonnement :", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe };
}
