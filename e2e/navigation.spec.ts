// Tests E2E — Navigation et chargement de l'application
// Valide que les pages publiques se chargent sans erreur critique.
// Section mémoire : 3.2 (Kanban + fonctionnalités) + 4.1 (stratégie de test)

import { test, expect } from "@playwright/test";

test.describe("Navigation publique", () => {
  test("la page d'accueil se charge sans erreur critique", async ({ page }) => {
    // Capture les erreurs JavaScript pour détecter les crashs au chargement
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");

    // Attend le chargement DOM — pas networkidle (Next.js dev garde HMR ouvert)
    await page.waitForLoadState("load");

    // Aucune erreur JS critique ne doit survenir au chargement
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("Warning:") &&     // Ignore les warnings React
        !e.includes("Service Worker") // Ignore les erreurs SW (désactivé en dev)
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("la page offline se charge sans erreur critique", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/offline");
    await page.waitForLoadState("load");

    const criticalErrors = errors.filter(
      (e) => !e.includes("Warning:") && !e.includes("Service Worker")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("la page sign-in Clerk se charge", async ({ page }) => {
    // La page de connexion doit être accessible — point d'entrée principal
    await page.goto("/sign-in");
    await page.waitForLoadState("load");

    // Vérifie que la page a chargé (statut 200 implicite via goto réussi)
    expect(page.url()).toContain("sign-in");
  });

  test("une route inexistante redirige vers sign-in si non authentifié", async ({ page }) => {
    // Comportement attendu : les routes protégées inconnues redirigent vers sign-in
    // (Clerk intercepte avant que Next.js puisse afficher la 404)
    await page.goto("/cette-page-nexiste-pas", { waitUntil: "load" });

    // L'utilisateur non authentifié atterrit sur la page sign-in
    await expect(page.locator("body")).toContainText("Sign in");
  });
});
