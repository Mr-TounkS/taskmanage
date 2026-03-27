// Tests E2E — Page hors ligne (/offline)
// Valide que la page de fallback PWA s'affiche correctement sans authentification.
// Répond à SQ2 : disponibilité hors ligne des équipes Agile distribuées.
// Section mémoire : 3.2 (PWA) + 4.1 (stratégie de test)

import { test, expect } from "@playwright/test";

test.describe("Page hors ligne (/offline)", () => {
  test.beforeEach(async ({ page }) => {
    // Navigation directe vers la page offline — accessible sans authentification
    await page.goto("/offline");
  });

  test("affiche le titre principal", async ({ page }) => {
    // Vérifie que le message principal est visible
    await expect(
      page.getByRole("heading", { name: "Vous êtes hors ligne" })
    ).toBeVisible();
  });

  test("affiche le bouton Réessayer", async ({ page }) => {
    // Le bouton recharge la page quand la connexion revient
    await expect(page.getByRole("button", { name: /Réessayer/i })).toBeVisible();
  });

  test("affiche la section des fonctionnalités disponibles offline", async ({ page }) => {
    // Vérifie que la liste des fonctionnalités offline est présente
    await expect(page.getByText("Disponible hors ligne")).toBeVisible();
    await expect(
      page.getByText("Consulter vos projets récemment visités")
    ).toBeVisible();
    await expect(
      page.getByText("Consulter votre dernier score SGR calculé")
    ).toBeVisible();
  });

  test("affiche la section des fonctionnalités nécessitant une connexion", async ({ page }) => {
    // Vérifie que la liste des fonctionnalités nécessitant une connexion est présente
    await expect(page.getByText("Nécessite une connexion")).toBeVisible();
    await expect(page.getByText("Créer ou modifier des tâches")).toBeVisible();
    await expect(page.getByText("Recalculer le score SGR")).toBeVisible();
  });

  test("affiche le message de rechargement automatique", async ({ page }) => {
    // Vérifie le message d'information sur le rechargement automatique
    await expect(
      page.getByText(
        "La page se rechargera automatiquement dès que la connexion sera rétablie."
      )
    ).toBeVisible();
  });

  test("a le bon title de page", async ({ page }) => {
    // Vérifie les métadonnées — important pour le SEO et l'accessibilité
    await expect(page).toHaveTitle(/Hors ligne/i);
  });
});
