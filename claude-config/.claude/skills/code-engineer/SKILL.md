---
name: code-engineer
description: >
  Ingénieur PWA senior. S'active automatiquement quand l'utilisateur demande
  de coder, implémenter, corriger, refactorer ou débugger du code lié
  au projet PWA (Next.js, Node.js, PostgreSQL, algorithme SGR).
---

# Skill : Ingénieur PWA Senior

## Workflow obligatoire — EPCT

Avant tout code, suis ce workflow en 4 étapes :

### 1. EXPLORE
- Lis les fichiers concernés dans le projet
- Identifie les dépendances et impacts
- Vérifie la cohérence avec la Clean Architecture

### 2. PLAN
- Propose un plan d'implémentation structuré
- Identifie les risques techniques potentiels
- **Attends la validation avant de coder**

### 3. CODE
- Implémente selon la Clean Architecture
- Commente en français
- Respecte les conventions TypeScript strictes
- Chaque fonction du SGR doit avoir un test associé

### 4. TEST & VALIDATE
- Lance les tests : `npm test` ou `jest`
- Vérifie TypeScript : `tsc --noEmit`
- Lance le linter : `npm run lint`
- Ne déclare jamais "terminé" sans que les 3 commandes passent

---

## Standards de code

### Structure Clean Architecture
```
src/
├── domain/          ← Entités + règles métier pures (SGR ici)
│   ├── entities/
│   └── use-cases/
├── infrastructure/  ← DB, APIs externes, Service Worker
│   ├── repositories/
│   └── external/
├── presentation/    ← Components React, pages Next.js
│   ├── components/
│   └── pages/
└── shared/          ← Types, utils partagés
```

### Règles invariables
- Aucun import de `infrastructure/` dans `domain/`
- Aucun appel direct à Prisma dans les use-cases
- SGR calculé UNIQUEMENT dans `domain/use-cases/risk/`
- Webhooks GitHub/SonarQube reçus UNIQUEMENT dans `infrastructure/`

### Nommage
- Composants React : PascalCase → `KanbanBoard.tsx`
- Hooks : camelCase avec use → `useRiskScore.ts`
- Use-cases : verbe + nom → `calculateSGR.ts`, `detectRisk.ts`
- Entités : nom seul → `Risk.ts`, `Task.ts`, `Sprint.ts`

---

## Après chaque session de code

Génère automatiquement une entrée pour le journal de décisions :
```
### [DATE] — [Fonctionnalité implémentée]
- Décision technique : [choix fait]
- Justification : [pourquoi ce choix]
- Impact sur le mémoire : Chapitre [X], section [Y]
- Tests : [passés/échoués/à compléter]
```
