"use client";

/**
 * useOfflineQueue.ts
 * Hook React pour la gestion des actions en mode hors ligne.
 *
 * Comportement :
 * - Si l'utilisateur est EN LIGNE → exécute l'action directement via fetch
 * - Si l'utilisateur est HORS LIGNE → stocke l'action dans IndexedDB
 *   et enregistre un tag Background Sync auprès du Service Worker
 *
 * Le Service Worker (worker/index.ts) rejoue les actions dès que
 * l'événement "sync" est déclenché par le navigateur à la reprise de connexion.
 */

import { useCallback, useEffect, useState } from "react";
import {
  enqueueAction,
  getPendingCount,
  type OfflineAction,
} from "@/lib/offline-queue";

/** Paramètres d'une action à effectuer */
interface ExecuteActionParams {
  type: string;       // Identifiant métier (ex: "UPDATE_TASK_STATUS")
  url: string;        // Route API Next.js (ex: "/api/tasks/123")
  method?: string;    // Méthode HTTP, défaut "POST"
  payload: unknown;   // Corps de la requête
}

interface UseOfflineQueueReturn {
  /** Exécute une action : en ligne → fetch direct, hors ligne → queue */
  execute: (params: ExecuteActionParams) => Promise<{ queued: boolean; data?: unknown }>;
  /** Nombre d'actions en attente dans IndexedDB */
  pendingCount: number;
  /** L'utilisateur est-il actuellement en ligne ? */
  isOnline: boolean;
}

export function useOfflineQueue(): UseOfflineQueueReturn {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Synchronise le compteur depuis IndexedDB
  const refreshCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    refreshCount();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshCount]);

  /**
   * Exécute une action :
   * - En ligne → appel fetch direct
   * - Hors ligne → mise en queue IndexedDB + enregistrement Background Sync
   */
  const execute = useCallback(
    async (
      params: ExecuteActionParams
    ): Promise<{ queued: boolean; data?: unknown }> => {
      const { type, url, method = "POST", payload } = params;

      // Tentative d'exécution directe si connecté
      if (navigator.onLine) {
        try {
          const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const data: unknown = await response.json().catch(() => null);
            return { queued: false, data };
          }
        } catch {
          // Réseau coupé malgré navigator.onLine → on passe à la queue
        }
      }

      // Mise en file d'attente hors ligne
      const actionEntry: Omit<OfflineAction, "id" | "timestamp" | "retries"> = {
        type,
        url,
        method,
        payload,
      };

      await enqueueAction(actionEntry);
      await refreshCount();

      // Enregistrement du tag Background Sync auprès du Service Worker
      if ("serviceWorker" in navigator && "SyncManager" in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          // Cast nécessaire : SyncManager n'est pas encore dans les types TS standard
          const reg = registration as ServiceWorkerRegistration & {
            sync: { register: (tag: string) => Promise<void> };
          };
          await reg.sync.register("offline-actions");
        } catch {
          // Background Sync non disponible (iOS Safari, etc.) — la sync
          // sera déclenchée manuellement au prochain chargement de page
        }
      }

      return { queued: true };
    },
    [refreshCount]
  );

  return { execute, pendingCount, isOnline };
}
