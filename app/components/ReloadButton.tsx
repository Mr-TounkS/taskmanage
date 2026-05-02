"use client";

// Composant client pour le bouton de rechargement de la page offline.
// Séparé de la page Server Component pour permettre l'utilisation de onClick et useEffect.
// Correction : window.location.reload() recharge /offline (intercepté par le SW),
// on navigue plutôt vers "/" et on écoute l'événement "online" du navigateur.

import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

export default function ReloadButton() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  // Vérifie la connectivité réelle en faisant un fetch léger
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/manifest.json", {
        method: "HEAD",
        cache: "no-store",
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  // Redirige vers "/" dès que la connexion est confirmée
  const handleOnline = useCallback(async () => {
    const online = await checkConnectivity();
    if (online) {
      setIsOnline(true);
      router.push("/");
    }
  }, [checkConnectivity, router]);

  useEffect(() => {
    // Vérifie l'état initial
    checkConnectivity().then(setIsOnline);

    // Écoute le retour de connexion
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [checkConnectivity, handleOnline]);

  // Clic manuel sur "Réessayer" : navigue vers "/" si connecté
  const handleRetry = async () => {
    setIsRetrying(true);
    const online = await checkConnectivity();
    if (online) {
      router.push("/");
    } else {
      setIsRetrying(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        className="btn btn-primary gap-2"
        onClick={handleRetry}
        disabled={isRetrying}
      >
        <RefreshCw size={16} className={isRetrying ? "animate-spin" : ""} />
        {isRetrying ? "Checking..." : "Retry"}
      </button>

      <span className={`text-xs flex items-center gap-1 ${isOnline ? "text-success" : "text-warning"}`}>
        {isOnline ? (
          <><Wifi size={12} /> Connection restored, redirecting...</>
        ) : (
          <><WifiOff size={12} /> Waiting for connection...</>
        )}
      </span>
    </div>
  );
}
