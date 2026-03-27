---
name: test-validator
description: >
  Générer et exécuter les tests d'une feature de la PWA.
  Utilise quand une feature est terminée, ou quand l'utilisateur
  dit "teste", "valide", "écris les tests", "vérifier que ça marche".
argument-hint: "[feature ou module à tester]"
---

# ✅ Test Validator — Stratégie de Tests PWA

## OBJECTIF ACADÉMIQUE

> La Section 4.1 du mémoire documente la stratégie de test.
> Chaque test écrit ici contribue directement à cette section.
> Objectif : couverture > 70% sur le module SGR (exigence non-fonctionnelle).

---

## STRATÉGIE DE TESTS (3 NIVEAUX)

### Niveau 1 — Tests Unitaires (Jest)
Pour chaque fonction isolée, notamment :
- Fonctions du calculateur SGR (`lib/risk-algorithm/calculator.ts`)
- Transformations de données Prisma
- Utilitaires TypeScript

```typescript
// Template test unitaire
describe('[NomDeLaFeature]', () => {
  describe('[NomDeLaFonction]', () => {
    it('devrait [comportement attendu] quand [condition]', () => {
      // Arrange
      const input = { /* données de test */ }
      // Act
      const result = maFonction(input)
      // Assert
      expect(result).toEqual(/* résultat attendu */)
    })

    it('devrait gérer [cas limite]', () => {
      // ...
    })
  })
})
```

### Niveau 2 — Tests d'Intégration (Jest + Prisma)
Pour les interactions avec la base de données :

```typescript
// Template test intégration
describe('Repository: [NomDuRepository]', () => {
  beforeEach(async () => {
    // Nettoyer la DB de test
    await prisma.[table].deleteMany()
  })

  it('devrait créer [entité] avec les bonnes données', async () => {
    // ...
  })
})
```

### Niveau 3 — Tests E2E PWA (Lighthouse)
Pour valider les exigences PWA :

```bash
# Score Lighthouse > 90 requis
npx lighthouse http://localhost:3000 \
  --output json \
  --output-path ./tests/lighthouse-report.json \
  --only-categories=performance,pwa,accessibility

# Vérifier les scores
node -e "
  const r = require('./tests/lighthouse-report.json');
  const scores = r.categories;
  console.log('Performance:', scores.performance.score * 100);
  console.log('PWA:', scores.pwa.score * 100);
  console.log('Accessibility:', scores.accessibility.score * 100);
"
```

---

## WORKFLOW D'EXÉCUTION

### 1. IDENTIFIER les fonctions à tester
Liste toutes les fonctions publiques du module concerné.

### 2. GÉNÉRER les tests
Pour chaque fonction :
- Test du cas nominal
- Test des cas limites (null, undefined, valeurs extrêmes)
- Test des cas d'erreur

### 3. EXÉCUTER et CORRIGER
```bash
npm test -- --coverage --testPathPattern=[feature]
```

### 4. DOCUMENTER pour le mémoire

```markdown
## Résultats de tests — [Feature] — [DATE]

| Module | Tests | Passés | Échoués | Couverture |
|--------|-------|--------|---------|------------|
| SGR Calculator | [N] | [N] | [N] | [N]% |
| Kanban API | [N] | [N] | [N] | [N]% |

**Observations** : [Ce que les tests ont révélé]
**Lien mémoire** : Section 4.1 — Stratégie de test
```

---

## TESTS PRIORITAIRES SGR

Ces tests sont critiques pour la validation académique (Section 4.2.3) :

```typescript
// Tests de l'algorithme SGR - priorité maximale
describe('SGR Algorithm', () => {
  it('devrait retourner 0 quand tous les indicateurs sont optimaux')
  it('devrait retourner 100 quand tous les indicateurs sont critiques')
  it('devrait respecter la formule: 0.30×R_WIP + 0.25×R_CT + ...')
  it('devrait normaliser les valeurs entre 0 et 100')
  it('devrait déclencher une alerte quand SGR > 70')
})
```
