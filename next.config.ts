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

// ---------------------------------------------------------------------------
// En-têtes de sécurité HTTP — Lighthouse Best Practices
// Corrige : CSP, COOP, XFO, X-Content-Type-Options, Referrer-Policy
// Section mémoire : 1.4 — Exigences non fonctionnelles (sécurité)
// ---------------------------------------------------------------------------
const securityHeaders = [
  // Empêche l'inclusion dans une iframe (clickjacking) — remplace X-Frame-Options
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  // Empêche le navigateur de deviner le type MIME (MIME sniffing)
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Contrôle les informations de référence envoyées au serveur
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Isole le contexte de navigation (protection Spectre/side-channel)
  // unsafe-none → same-origin pour activer COOP strict
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  // Politique d'accès aux ressources cross-origin
  {
    key: "Cross-Origin-Resource-Policy",
    value: "cross-origin",
  },
  // Restrictions sur les API navigateur sensibles
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Content Security Policy — autorise Clerk, Vercel, et les ressources internes
  // Mode "report-only" en dev pour éviter les blocages pendant le développement
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Scripts : self + Clerk + Firebase SW compat scripts + inline Next.js
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com https://www.gstatic.com",
      // Styles : self + inline (DaisyUI/Tailwind génère des styles inline)
      "style-src 'self' 'unsafe-inline'",
      // Images : self + data URIs + Clerk avatars
      "img-src 'self' data: blob: https://img.clerk.com https://images.clerk.dev",
      // Polices de caractères
      "font-src 'self' data:",
      // Connexions réseau : self + Clerk API + Neon DB + Firebase FCM
      "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://*.neon.tech wss://*.neon.tech https://*.googleapis.com https://*.firebase.com https://*.firebaseio.com https://fcm.googleapis.com",
      // Frames : Clerk utilise des iframes pour l'authentification
      "frame-src 'self' https://clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
      // Workers : Service Worker PWA
      "worker-src 'self' blob:",
      // Manifest PWA
      "manifest-src 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  turbopack: {},
  // Modules Node.js natifs — ne pas bundler via webpack
  serverExternalPackages: ["firebase-admin"],
  experimental: {
    // Réduit le bundle en important uniquement les composants utilisés
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  images: {
    // Allowed domains for Clerk profile pictures
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
    ],
  },
  // Applique les en-têtes de sécurité sur toutes les routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withPWA(nextConfig);
