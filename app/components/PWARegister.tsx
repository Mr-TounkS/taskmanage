"use client";

/**
 * PWARegister.tsx
 * Enregistrement manuel du Service Worker pour l'App Router Next.js.
 *
 * Problème : @ducanh2912/next-pwa avec `register: true` ne déclenche pas
 * systématiquement l'enregistrement du SW avec l'App Router (contrairement
 * au Pages Router). Le SW est bien généré dans public/sw.js mais pas toujours
 * enregistré auprès du navigateur.
 *
 * Solution : enregistrement explicite via navigator.serviceWorker.register()
 * au montage du composant, identique à l'approche recommandée pour l'App Router.
 *
 * Prérequis pour les notifications push :
 *   - Le SW doit être enregistré → navigator.serviceWorker.ready résout
 *   - pushManager.subscribe() nécessite un SW actif
 *
 * Section mémoire : 3.2 — Kanban + fonctionnalités PWA (SQ2)
 */

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    // Chrome autorise les push sur localhost (http) et sur tout domaine HTTPS.
    // On enregistre le SW dès que le navigateur le supporte, sans restreindre
    // au protocole HTTPS (ce qui bloquait les tests en dev sur localhost).
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA] Service Worker enregistré :", registration.scope);
        })
        .catch((error) => {
          console.error("[PWA] Échec enregistrement Service Worker :", error);
        });
    }
  }, []);

  // Composant invisible — aucun rendu DOM
  return null;
}
