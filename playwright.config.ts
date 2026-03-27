// Configuration Playwright E2E — PWA Agile Risk Manager
// Exécute les tests dans Chromium contre l'application Next.js en développement.
// Le serveur est démarré automatiquement avant les tests et arrêté après.

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // Dossier contenant les tests E2E
  testDir: "./e2e",

  // Pattern des fichiers de test
  testMatch: "**/*.spec.ts",

  // Délai maximum par test (30 secondes)
  timeout: 30_000,

  // Délai maximum pour une assertion (5 secondes)
  expect: {
    timeout: 5_000,
  },

  // Nombre de tentatives en cas d'échec (0 en local, 1 en CI)
  retries: process.env.CI ? 1 : 0,

  // Rapport de test : liste dans le terminal + rapport HTML
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],

  // Configuration partagée entre tous les tests
  use: {
    // URL de base de l'application
    baseURL: "http://localhost:3000",

    // Capture d'écran seulement en cas d'échec
    screenshot: "only-on-failure",

    // Trace seulement lors de la première tentative qui échoue
    trace: "on-first-retry",
  },

  // Tests uniquement sur Chromium (Chrome/Edge) pour simplifier
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Serveur géré manuellement par le développeur.
  // Lancez "npm run dev" dans un terminal séparé avant d'exécuter les tests.
  // En CI, le serveur est démarré par le pipeline avant l'étape de test.
  webServer: process.env.CI
    ? {
        command: "npm run build && npm run start",
        url: "http://localhost:3000/offline",
        timeout: 120_000,
      }
    : undefined,
});
