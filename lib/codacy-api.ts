/**
 * Client Codacy REST API v3
 *
 * Récupère les métriques de qualité d'un dépôt GitHub analysé par Codacy.
 * Utilisé comme source de données pour l'indicateur R_Quality du SGR.
 *
 * Documentation : https://api.codacy.com/api/v3
 * Section mémoire : 3.3 — Intégration Codacy
 */

import { SGRTechDebt } from './risk-algorithm/types';

const CODACY_BASE_URL = 'https://app.codacy.com/api/v3';

interface CodacyRepositoryQuality {
  grade: string;          // "A" | "B" | "C" | "D" | "F"
  totalIssues: number;
  issuesToFixTotal?: number;
  newIssues?: number;
}

interface CodacyIssueCategory {
  category: string; // "error_prone" | "security" | "code_style" | "performance" | "compatibility" | "unused_code"
  count: number;
}

interface CodacyQualityResponse {
  data: CodacyRepositoryQuality;
}

interface CodacyIssueCategoriesResponse {
  data: {
    categories: CodacyIssueCategory[];
  };
}

/**
 * Récupère les métriques qualité depuis l'API Codacy et les transforme en SGRTechDebt.
 *
 * @param org   - Nom de l'organisation GitHub (ex: "Mr-TounkS")
 * @param repo  - Nom du dépôt (ex: "taskmanage")
 * @param token - Token API Codacy (process.env.CODACY_API_TOKEN)
 * @returns SGRTechDebt ou null si l'API n'est pas disponible
 */
export async function fetchCodacyMetrics(
  org: string,
  repo: string,
  token: string,
): Promise<SGRTechDebt | null> {
  try {
    // Récupération de la qualité globale du dépôt
    const qualityRes = await fetch(
      `${CODACY_BASE_URL}/organizations/gh/${org}/repositories/${repo}/repository-quality`,
      {
        headers: {
          'api-token': token,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 300 }, // Cache 5 min côté Next.js
      },
    );

    if (!qualityRes.ok) {
      console.warn(`[codacy-api] Quality endpoint: ${qualityRes.status} ${qualityRes.statusText}`);
      return null;
    }

    const quality: CodacyQualityResponse = await qualityRes.json();
    const totalIssues = quality.data?.totalIssues ?? 0;

    // Tentative de récupération du détail par catégorie
    let bugsBloquants = 0;
    let codeSmells = 0;

    try {
      const categoriesRes = await fetch(
        `${CODACY_BASE_URL}/organizations/gh/${org}/repositories/${repo}/issues/category-counts`,
        {
          headers: { 'api-token': token },
          next: { revalidate: 300 },
        },
      );

      if (categoriesRes.ok) {
        const categories: CodacyIssueCategoriesResponse = await categoriesRes.json();
        for (const cat of (categories.data?.categories ?? [])) {
          if (cat.category === 'error_prone' || cat.category === 'security') {
            bugsBloquants += cat.count;
          } else {
            codeSmells += cat.count;
          }
        }
      } else {
        // Fallback : estimation 20% bugs / 80% code smells
        bugsBloquants = Math.round(totalIssues * 0.2);
        codeSmells = totalIssues - bugsBloquants;
      }
    } catch {
      bugsBloquants = Math.round(totalIssues * 0.2);
      codeSmells = totalIssues - bugsBloquants;
    }

    // Dette technique estimée : 30 min par issue ÷ 8h/jour
    const detteTechniqueDays = totalIssues * 0.0625;

    return { bugsBloquants, codeSmells, detteTechniqueDays };
  } catch (error) {
    console.error('[codacy-api] Erreur réseau:', error);
    return null;
  }
}
