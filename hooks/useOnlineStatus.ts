"use client";

/**
 * useOnlineStatus.ts
 * Hook React pour suivre l'état de connexion réseau en temps réel.
 *
 * Debounce de 600ms sur l'événement "offline" pour éviter les faux positifs
 * lors du rechargement de page (le SW prend brièvement le contrôle et peut
 * émettre un flash offline → online).
 */

import { useEffect, useRef, useState } from "react";

export function useOnlineStatus(): boolean {
  // Démarre toujours à true : le bandeau ne s'affiche que si un événement
  // "offline" réel se produit, pas au chargement initial de la page.
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      // Annule le timer offline si la connexion revient avant le délai
      if (offlineTimerRef.current) {
        clearTimeout(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
      setIsOnline(true);
    };

    const handleOffline = () => {
      // Attend 600ms avant de déclarer offline (évite le flash au rechargement)
      offlineTimerRef.current = setTimeout(() => {
        setIsOnline(false);
      }, 600);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
    };
  }, []);

  return isOnline;
}
