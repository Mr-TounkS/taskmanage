import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",           // Service Worker généré dans /public
  register: true,           // Enregistrement automatique du SW
  reloadOnOnline: true,     // Recharge la page quand la connexion revient
  cacheOnFrontEndNav: true, // Cache les navigations côté client
  disable: process.env.NODE_ENV === "development", // Désactivé en dev
  fallbacks: {
    // Page affichée si la ressource demandée n'est pas en cache et que l'utilisateur est hors ligne
    document: "/offline",
  },
});

const nextConfig: NextConfig = {
  // Indique à Next.js la racine du workspace pour éviter la confusion
  // avec d'autres package-lock.json présents sur la machine
  turbopack: {},
  images: {
    // Domaines autorisés pour les photos de profil Clerk
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
    ],
  },
};

export default withPWA(nextConfig);
