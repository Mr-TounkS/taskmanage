"use client";

/**
 * SWUpdatePrompt.tsx
 * Prompt utilisateur pour la mise à jour du Service Worker.
 *
 * Remplace le comportement dangereux de self.skipWaiting() automatique :
 * au lieu de forcer l'activation du nouveau SW (incohérence multi-onglets),
 * on détecte le SW en attente et on affiche un bandeau discret :
 * "Nouvelle version disponible — Actualiser ?"
 *
 * L'utilisateur clique → on envoie SKIP_WAITING au SW → le SW s'active →
 * tous les onglets rechargent via controllerchange.
 *
 * Correction de la limite #5 identifiée dans la section 4.3 du mémoire.
 */

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";

export default function SWUpdatePrompt() {
  const [waitingSW, setWaitingSW] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);

  const detectWaitingSW = useCallback(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.ready.then((registration) => {
      // Vérifie s'il y a déjà un SW en attente
      if (registration.waiting) {
        setWaitingSW(registration.waiting);
      }

      // Écoute les futures mises à jour
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          // Le nouveau SW est installé et en attente d'activation
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setWaitingSW(newWorker);
          }
        });
      });
    });

    // Recharge automatique quand le nouveau SW prend le contrôle
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  useEffect(() => {
    detectWaitingSW();
  }, [detectWaitingSW]);

  // Envoie le message SKIP_WAITING au SW en attente
  const handleUpdate = () => {
    if (waitingSW) {
      waitingSW.postMessage({ type: "SKIP_WAITING" });
    }
  };

  // Rien à afficher si pas de SW en attente ou si l'utilisateur a fermé
  if (!waitingSW || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-md animate-in slide-in-from-bottom-4">
      <div className="bg-base-100 border border-primary/30 shadow-xl rounded-xl px-4 py-3 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold">Nouvelle version disponible</p>
          <p className="text-xs text-base-content/60">
            Actualisez pour obtenir les dernières fonctionnalités.
          </p>
        </div>
        <button
          onClick={handleUpdate}
          className="btn btn-primary btn-sm gap-1.5 shrink-0"
        >
          <RefreshCw size={14} />
          Actualiser
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="btn btn-ghost btn-xs btn-circle shrink-0"
          aria-label="Fermer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
