# Règles de Code — PWA Agile Risk Manager

## TypeScript
- TOUJOURS typer explicitement les props, paramètres et retours
- JAMAIS utiliser `any` — utiliser `unknown` et affiner avec des guards
- Préférer les `interface` pour les objets métier, `type` pour les unions

## React / Next.js
- Composants fonctionnels uniquement (pas de class components)
- `use client` uniquement quand nécessaire (interactivité, hooks d'état)
- Server Components par défaut pour les pages et layouts
- Imports depuis `next/navigation` (pas `next/router`)

## Prisma
- Singleton client : toujours importer depuis `@/lib/prisma`
- Transactions pour toute opération multi-tables
- `select` explicite pour éviter de surcharger les requêtes
- Migrations nommées explicitement : `npx prisma migrate dev --name [description]`

## Architecture
- Logique métier dans `lib/` — jamais dans les composants
- Algorithme SGR dans `lib/risk-algorithm/` uniquement
- Types partagés dans `types/` — jamais dupliqués
- Hooks custom dans `hooks/` pour la logique réutilisable

## Nommage
- Composants : PascalCase (`KanbanBoard.tsx`)
- Hooks : camelCase avec préfixe `use` (`useRiskScore.ts`)
- Utils : camelCase (`calculateSGR.ts`)
- Types/Interfaces : PascalCase (`RiskEntry`, `KanbanColumn`)
- Constantes : UPPER_SNAKE_CASE (`MAX_WIP_LIMIT`)

## Commentaires
- Logique métier : en **français**
- Fonctions utilitaires : en **anglais**
- JSDoc obligatoire pour toutes les fonctions du module SGR

## Git
- Commits en français : `feat: ajouter le calcul du score SGR`
- Branches : `feature/[nom]`, `fix/[nom]`, `docs/[nom]`
- Toujours passer par `npm run build` avant de commit
