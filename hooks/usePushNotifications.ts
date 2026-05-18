"use client";

/**
 * usePushNotifications.ts
 * Hook React — abonnement aux notifications push via Web Push VAPID natif.
 *
 * Fonctionnement (conforme au tutoriel web-push) :
 *   1. Enregistre le Service Worker (sw.js généré par next-pwa)
 *   2. Demande la permission Notification à l'utilisateur
 *   3. Génère la PushSubscription via pushManager.subscribe(VAPID public key)
 *   4. Sauvegarde l'abonnement (endpoint + p256dh + auth) via /api/push/subscribe
 *
 * Section mémoire : 3.4 — Module actif de gestion des risques
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

/**
 * Converts a URL-safe Base64 string to a Uint8Array.
 * Required by pushManager.subscribe() for the applicationServerKey.
 */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer as ArrayBuffer;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported]   = useState<boolean>(false);
  const [permission, setPermission]     = useState<PermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading]       = useState<boolean>(false);
  const [endpoint, setEndpoint]         = useState<string | null>(null);

  // Vérifie le support et l'état initial au montage
  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager"   in window &&
      "Notification"  in window;

    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission as PermissionState);

      // Vérifie si une subscription active existe déjà dans le SW
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          if (sub && Notification.permission === "granted") {
            setIsSubscribed(true);
            setEndpoint(sub.endpoint);
          }
        })
        .catch(() => {/* SW pas encore prêt */});
    }
  }, []);

  const subscribe = useCallback(async (userEmail: string): Promise<void> => {
    if (!isSupported) return;
    setIsLoading(true);

    try {
      // Étape 1 — Demande la permission
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      if (result !== "granted") return;

      // Étape 2 — Attend que le Service Worker soit actif
      const registration = await navigator.serviceWorker.ready;
      console.log("[WebPush] SW actif :", registration.active?.scriptURL);

      // Étape 3 — Purge toute subscription existante (ancienne clé Firebase ou VAPID différente)
      // Sans cette purge, Chrome lève "push service error" si les clés ont changé.
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        console.log("[WebPush] Purge ancienne subscription...");
        await existingSub.unsubscribe();
      }

      // Étape 4 — Génère la PushSubscription avec la clé publique VAPID
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error("[WebPush] NEXT_PUBLIC_VAPID_PUBLIC_KEY manquant dans .env");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      console.log("[WebPush] Subscription générée :", subscription.endpoint.slice(0, 50) + "...");

      // Étape 4 — Sauvegarde l'abonnement en base (endpoint + keys)
      const subJson = subscription.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          endpoint: subJson.endpoint,
          p256dh:   subJson.keys?.p256dh   ?? "",
          auth:     subJson.keys?.auth     ?? "",
        }),
      });

      setIsSubscribed(true);
      setEndpoint(subscription.endpoint);
    } catch (error) {
      console.error("[WebPush] Erreur lors de l'abonnement :", error);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Désabonnement côté navigateur
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();

      // Suppression en base
      if (endpoint) {
        await fetch("/api/push/unsubscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }

      setIsSubscribed(false);
      setEndpoint(null);
    } catch (error) {
      console.error("[WebPush] Erreur lors du désabonnement :", error);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  return { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe };
}
