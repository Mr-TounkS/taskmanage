import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",              // Service Worker output directory
  register: true,              // Automatically register the SW on load
  reloadOnOnline: true,        // Reload the page when connection is restored
  cacheOnFrontEndNav: true,    // Cache client-side navigations
  disable: process.env.NODE_ENV === "development", // Disabled in dev mode
  customWorkerSrc: "worker",   // Merges worker/index.ts into the generated SW (Background Sync)
  fallbacks: {
    // Page served when the requested resource is not cached and the user is offline
    document: "/offline",
  },
  // Note : skipWaiting est auto-injecté par next-pwa (pas configurable).
  // SWUpdatePrompt.tsx gère la cohérence multi-onglets via controllerchange.
});

const nextConfig: NextConfig = {
  turbopack: {},
  images: {
    // Allowed domains for Clerk profile pictures
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
    ],
  },
};

export default withPWA(nextConfig);
