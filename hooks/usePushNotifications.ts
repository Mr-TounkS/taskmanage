"use client";

/**
 * usePushNotifications.ts
 * Hook React pour gérer l'abonnement aux notifications push via Firebase FCM.
 *
 * Migration Web Push VAPID → Firebase FCM :
 *   - Ancienne méthode : pushManager.subscribe() → échouait avec "push service error"
 *   - Nouvelle méthode : getToken() Firebase → chemin d'enregistrement différent,
 *     contourne les restrictions réseau liées au FCM direct du navigateur
 *
 * Fonctionnement :
 *   1. Enregistre le Service Worker Firebase (firebase-messaging-sw.js)
 *   2. Demande la permission Notification à l'utilisateur
 *   3. Récupère le token FCM via getToken()
 *   4. Sauvegarde le token en base via /api/push/subscribe
 *   5. Gère les notifications en premier plan via onMessage()
 *
 * Section mémoire : 3.4 — Module actif de gestion des risques
 */

import { useCallback, useEffect, useState } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "@/lib/firebase-client";

type PermissionState = "default" | "granted" | "denied";

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: PermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: (userEmail: string) => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported]   = useState<boolean>(false);
  const [permission, setPermission]     = useState<PermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading]       = useState<boolean>(false);
  const [fcmToken, setFcmToken]         = useState<string | null>(null);

  // Vérifie le support et l'état initial au montage
  useEffect(() => {
    const supported =
      "serviceWorker" in navigator &&
      "Notification" in window &&
      typeof window !== "undefined";

    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission as PermissionState);
      // isSubscribed = true uniquement si un token FCM est stocké en session
      // (permission "granted" ne garantit pas qu'un token actif existe en base)
      const cachedToken = sessionStorage.getItem("fcm_token");
      setIsSubscribed(!!cachedToken && Notification.permission === "granted");
    }
  }, []);

  // Écoute les notifications en premier plan (app ouverte)
  useEffect(() => {
    if (!isSupported || permission !== "granted") return;

    const messaging = getFirebaseMessaging();
    if (!messaging) return;

    const unsubscribeMessage = onMessage(messaging, (payload) => {
      console.log("[FCM] Notification reçue en premier plan :", payload);
      // Les alertes en premier plan sont gérées par les toasts SGR automatiques
    });

    return () => unsubscribeMessage();
  }, [isSupported, permission]);

  const subscribe = useCallback(async (userEmail: string): Promise<void> => {
    if (!isSupported) return;
    setIsLoading(true);

    try {
      // Étape 1 — Demande la permission à l'utilisateur
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);

      if (result !== "granted") {
        setIsLoading(false);
        return;
      }

      const messaging = getFirebaseMessaging();
      if (!messaging) {
        console.error("[FCM] Firebase Messaging non disponible");
        setIsLoading(false);
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.error("[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY manquant");
        setIsLoading(false);
        return;
      }

      // Étape 2 — Récupère ou enregistre le Service Worker Firebase
      // FCM cherche automatiquement /firebase-messaging-sw.js à la racine.
      // On récupère l'enregistrement existant pour éviter les conflits avec sw.js (next-pwa).
      let swRegistration = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
      if (!swRegistration) {
        swRegistration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js",
          { scope: "/firebase-cloud-messaging-push-scope" }
        );
      }

      // Étape 3 — Récupère le token FCM (remplace pushManager.subscribe())
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: swRegistration,
      });

      if (!token) {
        console.error("[FCM] Token vide — vérifiez la configuration Firebase");
        setIsLoading(false);
        return;
      }

      console.log("[FCM] Token obtenu avec succès");
      setFcmToken(token);
      sessionStorage.setItem("fcm_token", token); // Persistance locale pour isSubscribed

      // Étape 4 — Sauvegarde le token en base
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, userEmail }),
      });

      setIsSubscribed(true);
    } catch (error) {
      console.error("[FCM] Erreur lors de l'abonnement :", error);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      if (fcmToken) {
        await fetch("/api/push/unsubscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: fcmToken }),
        });
      }
      setIsSubscribed(false);
      setFcmToken(null);
      sessionStorage.removeItem("fcm_token");
    } catch (error) {
      console.error("[FCM] Erreur lors du désabonnement :", error);
    } finally {
      setIsLoading(false);
    }
  }, [fcmToken]);

  return { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe };
}
