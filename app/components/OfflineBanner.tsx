"use client";

/**
 * OfflineBanner.tsx
 * Bandeau global affiché automatiquement en haut de l'application
 * dès que la connexion est perdue.
 *
 * Affiche :
 * - L'état hors ligne avec icône animée
 * - Le nombre d'actions en attente de synchronisation (depuis IndexedDB)
 * - Un message de confirmation quand la connexion revient
 *
 * Ce composant répond à la SQ2 du mémoire : visibilité de l'état offline
 * pour les équipes Agile distribuées.
 */

import { useEffect, useState } from "react";
import { WifiOff, Wifi, Clock } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getPendingCount } from "@/lib/offline-queue";

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [showRestoredMsg, setShowRestoredMsg] = useState<boolean>(false);
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  // Rafraîchit le compteur d'actions en attente
  useEffect(() => {
    const refreshCount = async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    };
    refreshCount();
    // Écoute les messages du SW pour rafraîchir le compteur après sync
    const handleMessage = (event: MessageEvent) => {
      if ((event.data as { type?: string })?.type === "SYNC_COMPLETE") {
        refreshCount();
      }
    };
    navigator.serviceWorker?.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, [isOnline]);

  // Affiche brièvement le message "Connexion rétablie" au retour en ligne
  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowRestoredMsg(true);
      const timer = setTimeout(() => setShowRestoredMsg(false), 4000);
      return () => clearTimeout(timer);
    }
    if (!isOnline) {
      setWasOffline(true);
    }
  }, [isOnline, wasOffline]);

  // Rien à afficher si online et pas de message de retour
  if (isOnline && !showRestoredMsg) return null;

  // Bandeau "Connexion rétablie"
  if (isOnline && showRestoredMsg) {
    return (
      <div className="w-full bg-success text-success-content px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium animate-pulse">
        <Wifi size={16} />
        Connexion rétablie — synchronisation en cours…
      </div>
    );
  }

  // Bandeau "Hors ligne"
  return (
    <div className="w-full bg-warning text-warning-content px-4 py-2 flex items-center justify-between gap-2 text-sm font-medium">
      <div className="flex items-center gap-2">
        <WifiOff size={16} className="shrink-0" />
        <span>
          Mode hors ligne — les données affichées correspondent à votre
          dernière session.
        </span>
      </div>

      {/* Badge actions en attente */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-1 bg-warning-content/20 rounded-full px-2 py-0.5 shrink-0">
          <Clock size={13} />
          <span className="text-xs font-bold">
            {pendingCount} action{pendingCount > 1 ? "s" : ""} en attente
          </span>
        </div>
      )}
    </div>
  );
}
