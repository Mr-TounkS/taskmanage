/**
 * app/page.tsx — Server Component (SSR)
 *
 * Page d'accueil — liste des projets de l'utilisateur connecté.
 *
 * Pattern Server / Client Component :
 *   - Ce fichier (Server) → récupère currentUser() via Clerk SSR
 *   - HomeClient (Client) → gère l'état, le cache offline, les interactions
 *
 * Avantage Lighthouse Performance :
 *   - Le shell HTML est pré-rendu côté serveur (réduit FCP et Speed Index)
 *   - Le TBT (Total Blocking Time) est réduit car moins de JS à exécuter au chargement
 *   - Compatible avec le cache Service Worker (NetworkFirst strategy)
 *
 * Section mémoire : 3.2 — Architecture PWA + SQ2 (mobilité, disponibilité)
 */

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Wrapper from "./components/Wrapper";
import HomeClient from "./components/HomeClient";

export default async function Home() {
  // Récupération de l'utilisateur côté serveur — pas de round-trip client
  const user = await currentUser();

  // Redirige vers la page de connexion si non authentifié
  if (!user) redirect("/sign-in");

  const email = user.primaryEmailAddress?.emailAddress ?? "";

  return (
    <Wrapper>
      {/* HomeClient gère toute la logique interactive (useState, fetch, cache offline) */}
      <HomeClient email={email} />
    </Wrapper>
  );
}
