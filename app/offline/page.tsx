// Page de fallback hors ligne — affichée par le Service Worker quand
// la page demandée n'est pas disponible dans le cache et que l'utilisateur est hors ligne.
// Répond à la sous-question SQ2 : disponibilité hors ligne des équipes Agile distribuées.

import type { Metadata } from "next";
import { WifiOff, CheckCircle, XCircle } from "lucide-react";
import ReloadButton from "../components/ReloadButton";
import BackButton from "../components/BackButton";

export const metadata: Metadata = {
  title: "Hors ligne — Task Manage",
  description: "Vous êtes actuellement hors ligne.",
};

// Fonctionnalités disponibles sans connexion (pages précachées par le SW)
const DISPONIBLE_OFFLINE = [
  "Consulter vos projets récemment visités",
  "Voir les tâches en cours de vos tableaux Kanban",
  "Lire les détails de vos tâches",
  "Consulter votre dernier score SGR calculé",
];

// Fonctionnalités nécessitant une connexion active
const NECESSITE_CONNEXION = [
  "Créer ou modifier des tâches",
  "Recalculer le score SGR",
  "Inviter des collaborateurs",
  "Synchroniser les données GitHub / SonarQube",
];

export default function OfflinePage() {
  return (
    <div className="relative min-h-screen bg-base-200 flex items-center justify-center p-4">
      <BackButton />
      <div className="max-w-lg w-full">

        {/* En-tête */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body items-center text-center gap-4">

            <div className="p-4 bg-warning/10 rounded-full">
              <WifiOff size={48} className="text-warning" />
            </div>

            <h1 className="card-title text-2xl">Vous êtes hors ligne</h1>
            <p className="text-base-content/70">
              Task Manage fonctionne partiellement sans connexion grâce au
              cache du Service Worker. Les données affichées correspondent
              à votre dernière session en ligne.
            </p>

            {/* Bouton réessayer — le reloadOnOnline dans next.config.ts
                recharge automatiquement dès que la connexion revient */}
            <ReloadButton />
          </div>
        </div>

        {/* Disponibilité des fonctionnalités */}
        <div className="grid grid-cols-1 gap-4 mt-4 sm:grid-cols-2">

          {/* Fonctionnalités disponibles */}
          <div className="card bg-success/10 shadow">
            <div className="card-body gap-3">
              <h2 className="font-semibold text-success flex items-center gap-2">
                <CheckCircle size={18} />
                Disponible hors ligne
              </h2>
              <ul className="space-y-2">
                {DISPONIBLE_OFFLINE.map((item) => (
                  <li key={item} className="text-sm text-base-content/80 flex items-start gap-2">
                    <span className="text-success mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Fonctionnalités indisponibles */}
          <div className="card bg-error/10 shadow">
            <div className="card-body gap-3">
              <h2 className="font-semibold text-error flex items-center gap-2">
                <XCircle size={18} />
                Nécessite une connexion
              </h2>
              <ul className="space-y-2">
                {NECESSITE_CONNEXION.map((item) => (
                  <li key={item} className="text-sm text-base-content/80 flex items-start gap-2">
                    <span className="text-error mt-0.5">✗</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Indicateur de statut */}
        <p className="text-center text-xs text-base-content/40 mt-4">
          La page se rechargera automatiquement dès que la connexion sera rétablie.
        </p>

      </div>
    </div>
  );
}
