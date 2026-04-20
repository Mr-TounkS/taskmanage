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

interface CodacyPagination {
  total: number;
}

interface CodacyIssuesResponse {
  pagination: CodacyPagination;
}

/**
 * Récupère le nombre d'issues d'une catégorie donnée via l'API Codacy.
 * On utilise pageSize=1 pour minimiser le payload — seul pagination.total nous intéresse.
 */
async function fetchIssueCount(
  org: string,
  repo: string,
  token: string,
  category?: string,
): Promise<number> {
  const params = new URLSearchParams({ pageSize: '1' });
  if (category) params.set('category', category);

  const res = await fetch(
    `${CODACY_BASE_URL}/organizations/gh/${org}/repositories/${repo}/issues?${params}`,
    {
      headers: {
        'api-token': token,
        'Accept': 'application/json',
      },
      next: { revalidate: 300 }, // Cache 5 min côté Next.js
    },
  );

  if (!res.ok) {
    console.warn(`[codacy-api] Issues (category=${category ?? 'all'}): ${res.status} ${res.statusText}`);
    return -1; // Sentinelle : indique une erreur
  }

  const data: CodacyIssuesResponse = await res.json();
  return data.pagination?.total ?? 0;
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
    // Récupération parallèle : total + bugs bloquants (ErrorProne + Security)
    const [totalIssues, errorProne, security] = await Promise.all([
      fetchIssueCount(org, repo, token),
      fetchIssueCount(org, repo, token, 'ErrorProne'),
      fetchIssueCount(org, repo, token, 'Security'),
    ]);

    if (totalIssues === -1) {
      console.error('[codacy-api] Impossible de récupérer les issues (endpoint inaccessible)');
      return null;
    }

    // Bugs bloquants = ErrorProne + Security (valeur minimale : 0)
    const bugsBloquants = Math.max(0, (errorProne === -1 ? 0 : errorProne) + (security === -1 ? 0 : security));
    const codeSmells = Math.max(0, totalIssues - bugsBloquants);

    // Dette technique estimée : 30 min par issue ÷ 8h/jour
    const detteTechniqueDays = totalIssues * 0.0625;

    console.log(
      `[codacy-api] ✓ ${org}/${repo} — total: ${totalIssues}, bugs: ${bugsBloquants}, smells: ${codeSmells}, dette: ${detteTechniqueDays.toFixed(2)}j`,
    );

    return { bugsBloquants, codeSmells, detteTechniqueDays };
  } catch (error) {
    console.error('[codacy-api] Erreur réseau:', error);
    return null;
  }
}
