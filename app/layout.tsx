import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Task Manage — Agile Risk Manager",
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
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
