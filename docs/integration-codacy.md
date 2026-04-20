# 3.3 — Intégration Codacy pour l'indicateur R_Quality

## Contexte & Motivation

Le plan initial prévoyait une intégration SonarQube via webhooks GitHub. Cependant, l'analyse pragmatique a conduit au remplacement par **Codacy** pour deux raisons :

1. **Webhooks sortants gratuits** : Codacy ne propose pas de webhooks sortants sur le plan gratuit (limité à Slack/Jira). GitHub détecte les analyses Codacy via des **Check Runs** (événement `check_run`), ce qui offre un mécanisme d'intégration indirect.
2. **API REST v3 disponible** : Codacy propose une API REST v3 documentée pour récupérer les métriques directement, sans dépendre des webhooks.

## Architecture de l'intégration

### Phase 1 : Exploration (Webhooks GitHub → Codacy via Check Runs)

**Hypothèse initiale** : Intercepter les Check Runs postés par Codacy sur GitHub pour récupérer les métriques de qualité.

**Implémentation** :
```typescript
// app/api/webhooks/github/route.ts
export async function POST(req: Request) {
  const payload = JSON.parse(await req.text());
  
  if (payload.action === 'completed' && payload.check_run?.app?.slug === 'codacy') {
    const { bugsBloquants, codeSmells } = extractCodacyMetrics(payload);
    // Mise à jour du SGR...
  }
}
```

**Résultat** : ✅ Intégration fonctionnelle mais délai d'une CI/CD après chaque commit.

### Phase 2 : Évolution → API REST Polling

**Problème** : Les webhooks introduisent une latence (attente du build Codacy) et dépendent de l'exécution de la CI/CD.

**Solution** : Utiliser l'**API REST v3 de Codacy** pour faire du **polling à la demande** :
- Endpoint : `POST /analysis/organizations/gh/{org}/repositories/{repo}/issues/search`
- Authentification : header `api-token: <token>`
- Avantage : pas de latence webhook, métriques à jour instantanément

## Implémentation technique

### Configuration

**Variables d'environnement** (`env.local`, Vercel) :
```env
CODACY_API_TOKEN=<token>           # Token API Codacy (Account → API Tokens)
CODACY_ORG=Mr-TounkS              # Organisation GitHub
CODACY_REPO=taskmanage             # Dépôt GitHub
```

### Fonction `fetchCodacyMetrics`

**Fichier** : `lib/codacy-api.ts`

```typescript
export async function fetchCodacyMetrics(
  org: string,
  repo: string,
  token: string,
): Promise<SGRTechDebt | null>
```

**Stratégie** :
1. **Appel 1** : `POST /issues/search` (limite=1) → compte total
2. **Appel 2** : `POST /issues/search?category=Error` → bugs critiques
3. **Parallélisation** : `Promise.all()` pour minimiser la latence

**Réponse API** :
```json
{
  "pagination": {
    "total": 317,
    "cursor": "...",
    "limit": 1
  }
}
```

**Transformation en SGRTechDebt** :
```typescript
return {
  bugsBloquants: 12,              // Nombre d'issues "Error"
  codeSmells: 305,                // Total - bugs = smells
  detteTechniqueDays: 19.81       // Total × 0.0625 (30 min par issue / 8h)
}
```

### Intégration au calcul SGR

**Fichier** : `app/actions.ts`

```typescript
export async function getProjectSGR(
  projectId: string,
  techDebt?: SGRTechDebt
) {
  const codacyToken = process.env.CODACY_API_TOKEN;
  const codacyOrg = process.env.CODACY_ORG ?? 'Mr-TounkS';
  const codacyRepo = process.env.CODACY_REPO ?? 'taskmanage';

  // Récupération auto si token configuré
  const resolvedTechDebt = techDebt ?? (
    codacyToken
      ? await fetchCodacyMetrics(codacyOrg, codacyRepo, codacyToken)
      : null
  ) ?? undefined;

  return await new CalculateSGRUseCase(...).execute({
    projectId,
    techDebt: resolvedTechDebt,
  });
}
```

## Indicateur R_Quality (poids : 20%)

### Formule

```
R_Quality = clamp(
  (bugsBloquants / 5) × 0.50 +        // 50% bugs critiques
  (detteTechniqueDays / 5) × 0.30 +   // 30% dette en jours
  (codeSmells / 50) × 0.20             // 20% code smells
)
```

### Seuils de normalisation

| Métrique | Seuil | Justification |
|----------|-------|---------------|
| `BUGS_CRIT` | 5 | > 5 bugs critiques = score 100% |
| `DEBT_DAYS` | 5 | > 5 jours de dette technique = score 100% |
| `SMELLS` | 50 | > 50 code smells = score 100% |

### Exemple de résultat

Pour le dépôt `Mr-TounkS/taskmanage` au 20 avril 2025 :
- **Total issues** : 317
- **Bugs (Error)** : 12 → score = (12/5)×0.50 = 120% → clamped 100%
- **Code smells** : 305 → score = (305/50)×0.20 = 122% → clamped 100%
- **Dette technique** : 19.81 jours → score = (19.81/5)×0.30 = 118% → clamped 100%
- **R_Quality final** : ~100% (saturé)

→ Impact sur SGR global : `SGR = ... + 100 × 0.20 = +20 points`

## Historique des tentatives

| Tentative | Approche | Endpoint | Résultat | Raison du changement |
|-----------|----------|----------|----------|---------------------|
| 1 | Webhooks GitHub Check Runs | Webhook Python → API | ✅ | Délai et dépendance CI/CD |
| 2 | GET `/organizations/.../issues` | GET (pageSize=1) | ❌ 404 | Endpoint inexistant |
| 3 | POST `/analysis/.../issues/search` | POST (body JSON) | ✅ | Endpoint correct, docmentation officielle |

### Débogage du 404 (Tentative 2)

**Erreur** :
```
[codacy-api] Quality endpoint: 404 Not Found
```

**Root cause** : Mauvaise interprétation de la documentation — endpoint supposé `/repository-quality` n'existe pas.

**Recherche** : Consultation de la documentation officielle Codacy API v3, exemples de code.

**Solution** : Endpoint correct trouvé dans les exemples : `POST /analysis/organizations/gh/{org}/repositories/{repo}/issues/search`

## Limitations & Perspectives

### Limitation 1 : Délai de latence Codacy

**Problème** : L'analyse Codacy peut prendre 1–5 min après un push.

**Workaround** : Appel API manuel via bouton "Recalculer le SGR" dans l'interface.

**Perspective** : Intégrer un job cron qui repolls automatiquement toutes les heures.

### Limitation 2 : Seuils de normalisation non validés

**Hypothèse** : Les seuils (5 bugs, 5 jours, 50 smells) sont des hypothèses théoriques, pas validées empiriquement.

**Implication** : R_Quality peut être surévalué ou sous-évalué selon le contexte du projet.

**Perspective** : Ajuster les seuils via machine learning après collecte d'un dataset de projets représentatif.

### Limitation 3 : Un seul dépôt supporté

**Contexte** : Code dur les valeurs `CODACY_ORG` et `CODACY_REPO`.

**Perspective** : Permettre la configuration par projet (ExternalIntegration dans la DB).

## Test & Validation

### Test manuel

1. Va sur https://taskmanage-mu.vercel.app → un projet
2. Clique "Recalculer le SGR"
3. Vérifie les logs Vercel :
   ```
   [codacy-api] ✓ Mr-TounkS/taskmanage — total: 317, bugs(Error): 12, smells: 305, dette: 19.81j
   ```
4. Rafraîchis la page → SGR Widget affiche R_Quality > 0

### Test automatisé

```typescript
it("intègre les données Codacy dans R_Tech quand disponibles", async () => {
  const useCase = new CalculateSGRUseCase(taskRepo, wipRepo);
  const result = await useCase.execute({
    projectId: "proj-1",
    techDebt: { bugsBloquants: 5, codeSmells: 50, detteTechniqueDays: 5 },
  });

  expect(result.indicateurs.tech.score).toBeGreaterThan(0);
});
```

## Conclusion

L'intégration Codacy via API REST polling offre une solution pragmatique et réactive pour :
- **Récupérer les métriques de qualité** sans latence webhook
- **Alimenter le R_Quality** de l'algorithme SGR
- **Valider l'hypothèse** que les métriques de code influencent le risque global d'un projet

**Archivage** : Les webhooks GitHub initialement prévus ont été abandonnés en raison de la complexité de l'écosystème (Codacy → GitHub Check Runs → TaskManage), remplacés par un polling API plus simple et plus prévisible.
