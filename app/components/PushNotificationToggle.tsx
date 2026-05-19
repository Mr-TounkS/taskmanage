"use client";

/**
 * PushNotificationToggle.tsx
 * Bouton d'activation/désactivation des notifications push.
 *
 * Affiché dans la NavBar — permet à l'utilisateur connecté d'activer
 * les alertes push (SGR critique, tâche assignée) sur son appareil.
 *
 * Répond à la SQ2 du mémoire : réactivité des équipes Agile distribuées
 * via notifications proactives du module de gestion des risques.
 */

import { Bell, BellOff, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface PushNotificationToggleProps {
  userEmail: string;
}

export default function PushNotificationToggle({ userEmail }: PushNotificationToggleProps) {
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe } =
    usePushNotifications();

  // Notifications non supportées : affiche un bouton désactivé avec explication.
  // iOS < 16.4 : Notification API absente. Chrome sur iOS : WebKit bloque le push.
  // Android WebView (app in-app) : Service Worker non disponible.
  if (!isSupported) {
    return (
      <div
        className="tooltip tooltip-left"
        data-tip="Notifications non supportées sur ce navigateur. Sur iOS : utilisez Safari 16.4+ en PWA installée."
      >
        <button className="btn btn-ghost btn-sm btn-circle opacity-30" disabled aria-label="Notifications non supportées">
          <BellOff size={18} />
        </button>
      </div>
    );
  }

  // Permission définitivement refusée — on ne peut plus rien faire
  if (permission === "denied") {
    return (
      <div
        className="tooltip tooltip-bottom"
        data-tip="Notifications bloquées — autorisez-les dans les paramètres du navigateur"
      >
        <button className="btn btn-ghost btn-sm btn-circle opacity-40" disabled>
          <BellOff size={18} />
        </button>
      </div>
    );
  }

  if (isSubscribed) {
    return (
      <div className="tooltip tooltip-bottom" data-tip="Désactiver les notifications push">
        <button
          onClick={unsubscribe}
          disabled={isLoading}
          className="btn btn-ghost btn-sm btn-circle text-primary"
          aria-label="Désactiver les notifications"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Bell size={18} />}
        </button>
      </div>
    );
  }

  return (
    <div className="tooltip tooltip-bottom" data-tip="Activer les notifications push (alertes SGR)">
      <button
        onClick={() => subscribe(userEmail)}
        disabled={isLoading}
        className="btn btn-ghost btn-sm btn-circle"
        aria-label="Activer les notifications"
      >
        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <BellOff size={18} />}
      </button>
    </div>
  );
}
