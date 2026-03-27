// Tests E2E — PWA (Progressive Web App)
// Valide la configuration PWA : manifest, métadonnées, et disponibilité des assets.
// Répond à SQ2 : architecture PWA pour les équipes Agile distribuées.
// Section mémoire : 3.2 (fonctionnalités PWA) + 4.1 (stratégie de test)

import { test, expect } from "@playwright/test";

test.describe("Configuration PWA", () => {
  test("le manifest.json est accessible et valide", async ({ request }) => {
    // Vérification directe via une requête HTTP — pas besoin d'un navigateur complet
    const response = await request.get("/manifest.json");

    // Le manifest doit répondre avec un statut 200
    expect(response.status()).toBe(200);

    // Le contenu doit être du JSON valide
    const manifest = await response.json();

    // Champs obligatoires pour qu'une PWA soit installable
    expect(manifest).toHaveProperty("name");
    expect(manifest).toHaveProperty("icons");
    expect(manifest.icons).toBeInstanceOf(Array);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test("le layout principal inclut le lien vers le manifest", async ({ page }) => {
    await page.goto("/offline");

    // Le head doit contenir le lien vers manifest.json
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute("href", "/manifest.json");
  });

  test("la meta theme-color est présente", async ({ page }) => {
    await page.goto("/offline");

    // La couleur de thème est requise pour les PWA sur mobile (Android)
    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute("content", "#8936FF");
  });

  test("la page d'accueil répond avec un statut 200", async ({ request }) => {
    // Vérification que le serveur Next.js est opérationnel
    const response = await request.get("/");
    expect(response.status()).toBe(200);
  });

  test("la page offline répond avec un statut 200", async ({ request }) => {
    // La page de fallback doit être accessible — utilisée par le Service Worker
    const response = await request.get("/offline");
    expect(response.status()).toBe(200);
  });

  test("l'icône apple-touch-icon est accessible", async ({ request }) => {
    // Icône requise pour l'installation sur iOS (Add to Home Screen)
    const response = await request.get("/icon512_rounded.png");
    expect(response.status()).toBe(200);
  });
});
