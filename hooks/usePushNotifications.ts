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
      // Affiche une notification native quand l'app est ouverte (le SW ne le fait pas en foreground)
      const title = payload.notification?.title ?? "TaskManage";
      const body  = payload.notification?.body  ?? "";
      if (Notification.permission === "granted" && body) {
        new Notification(title, {
          body,
          icon: "/android/launchericon-192x192.png",
        });
      }
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
      // Log de diagnostic : affiche les 12 premiers et derniers chars pour vérification
      console.log(`[FCM] VAPID key utilisée : ${vapidKey.slice(0, 12)}...${vapidKey.slice(-8)}`);

      // Étape 2 — Récupère le SW actif.
      // En production (Vercel HTTPS), sw.js est actif via PWARegister.
      // En développement (localhost), même logique — Chrome accepte push sur http://localhost.
      // Fallback : si aucun SW n'est actif, on enregistre firebase-messaging-sw.js.
      let swRegistration: ServiceWorkerRegistration;
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        const activeReg = registrations.find((r) => r.active !== null);

        if (activeReg) {
          swRegistration = activeReg;
          console.log("[FCM] SW actif trouvé :", activeReg.active?.scriptURL);
        } else {
          console.warn("[FCM] Aucun SW actif — enregistrement de firebase-messaging-sw.js…");
          swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

          if (swRegistration.installing) {
            await new Promise<void>((resolve, reject) => {
              const sw = swRegistration.installing!;
              sw.addEventListener("statechange", function handler() {
                if (sw.state === "activated") {
                  sw.removeEventListener("statechange", handler);
                  resolve();
                } else if (sw.state === "redundant") {
                  sw.removeEventListener("statechange", handler);
                  reject(new Error("SW redondant avant activation"));
                }
              });
            });
          }
        }
      } catch (swErr: unknown) {
        console.error("[FCM] Impossible d'obtenir un Service Worker :", swErr);
        setIsLoading(false);
        return;
      }

      // Étape 2b — Purge toutes les subscriptions push sur TOUS les SW enregistrés.
      // Une ancienne subscription (VAPID key différente, firebase-messaging-sw.js
      // ou sw.js d'un déploiement précédent) bloque getToken() avec "push service error".
      try {
        const allRegs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          allRegs.map(async (reg) => {
            try {
              const sub = await reg.pushManager.getSubscription();
              if (sub) {
                await sub.unsubscribe();
                console.log("[FCM] Subscription supprimée sur :", reg.active?.scriptURL ?? reg.scope);
              }
            } catch {
              // Pas bloquant si un SW particulier ne coopère pas
            }
          })
        );
      } catch {
        // Pas bloquant — on continue
      }

      // Étape 3 — Récupère le token FCM avec le SW actif
      let token: string | null = null;
      try {
        token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: swRegistration,
        });
      } catch (tokenErr: unknown) {
        const errMsg = tokenErr instanceof Error ? tokenErr.message : String(tokenErr);
        if (errMsg.includes("push service error")) {
          console.error(
            "[FCM] push service error — causes possibles :\n" +
            "  1. VAPID key incorrecte (vérifiez Firebase Console → Cloud Messaging → Web Push certificates)\n" +
            "  2. fcm.googleapis.com inaccessible (réseau/proxy)\n" +
            "  3. Redéployez sur Vercel pour que la nouvelle clé NEXT_PUBLIC_ soit baked dans le build\n" +
            "Erreur originale :", tokenErr
          );
        } else {
          console.error("[FCM] Échec getToken :", tokenErr);
        }
        setIsLoading(false);
        return;
      }

      if (!token) {
        console.error("[FCM] Token vide — configuration Firebase incorrecte");
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
