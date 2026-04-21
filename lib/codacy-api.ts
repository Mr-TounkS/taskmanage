/**
 * Client Codacy REST API v3
 *
 * Récupère les métriques de qualité d'un dépôt GitHub analysé par Codacy.
 * Utilisé comme source de données pour l'indicateur R_Quality du SGR.
 *
 * Documentation : https://docs.codacy.com/codacy-api/examples/obtaining-current-issues-in-repositories/
 * Endpoint : POST /analysis/organizations/gh/{org}/repositories/{repo}/issues/search
 * Section mémoire : 3.3 — Intégration Codacy
 */

import { SGRTechDebt } from './risk-algorithm/types';

const CODACY_BASE_URL = 'https://app.codacy.com/api/v3';

interface CodacySearchResponse {
  pagination: {
    total: number;
    cursor?: string;
    limit?: number;
  };
}

/**
 * Compte les issues d'un dépôt Codacy selon un filtre de niveau.
 * Utilise limit=1 pour minimiser le payload — seul pagination.total est nécessaire.
 *
 * @param levels - Niveaux à filtrer (ex: ["Error"]) ou null pour tout
 */
async function countIssues(
  org: string,
  repo: string,
  token: string,
  levels?: string[],
): Promise<number> {
  const url = `${CODACY_BASE_URL}/analysis/organizations/gh/${org}/repositories/${repo}/issues/search?limit=1`;
  const body = levels ? { levels } : {};

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'api-token': token,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
    next: { revalidate: 300 }, // Cache 5 min côté Next.js
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.warn(`[codacy-api] ${res.status} ${res.statusText} — levels=${JSON.stringify(levels ?? 'all')} — ${text.slice(0, 200)}`);
    return -1;
  }

  const data: CodacySearchResponse = await res.json();
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
    // Appels parallèles : total et bugs bloquants (niveau Error)
    const [totalIssues, bugsError] = await Promise.all([
      countIssues(org, repo, token),
      countIssues(org, repo, token, ['Error']),
    ]);

    if (totalIssues === -1) {
      console.error('[codacy-api] Impossible de récupérer les issues — vérifier le token et le dépôt');
      return null;
    }

    const bugsBloquants = bugsError === -1 ? 0 : bugsError;
    const codeSmells = Math.max(0, totalIssues - bugsBloquants);

    // Dette technique estimée : 30 min par issue ÷ 8h/jour
    const detteTechniqueDays = totalIssues * 0.0625;

    console.log(
      `[codacy-api] ✓ ${org}/${repo} — total: ${totalIssues}, bugs(Error): ${bugsBloquants}, smells: ${codeSmells}, dette: ${detteTechniqueDays.toFixed(2)}j`,
    );

    return { bugsBloquants, codeSmells, detteTechniqueDays };
  } catch (error) {
    console.error('[codacy-api] Erreur réseau:', error);
    return null;
  }
}
