"use client";

// Composant client pour le bouton de rechargement de la page offline.
// Séparé de la page Server Component pour permettre l'utilisation de onClick.

import { RefreshCw } from "lucide-react";

export default function ReloadButton() {
  return (
    <button
      className="btn btn-primary gap-2"
      onClick={() => window.location.reload()}
    >
      <RefreshCw size={16} />
      Réessayer
    </button>
  );
}
