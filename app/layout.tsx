import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import OfflineBanner from "./components/OfflineBanner";
import SWUpdatePrompt from "./components/SWUpdatePrompt";
import PWARegister from "./components/PWARegister";

export const metadata: Metadata = {
  title: "Task Manage",
  description: "PWA de gestion de projet Agile avec détection proactive des risques (SGR)",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Task Manage",
  },
};

export const viewport: Viewport = {
  themeColor: "#8936FF",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="fr" data-theme="light">
        <head>
          <link rel="apple-touch-icon" href="/icon512_rounded.png" />
        </head>
        <body>
          {/* Enregistrement manuel du SW — contourne le bug App Router avec next-pwa */}
          <PWARegister />
          {/* Bandeau offline — affiché automatiquement dès perte de connexion */}
          <OfflineBanner />
          {/* Prompt de mise à jour SW — remplace skipWaiting automatique */}
          <SWUpdatePrompt />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
