---
description: Implémenter une nouvelle fonctionnalité selon le workflow EPCT
argument-hint: [nom de la fonctionnalité]
---

# Workflow EPCT — Nouvelle Fonctionnalité : $ARGUMENTS

## 1. EXPLORE
Recherche tous les fichiers liés à "$ARGUMENTS" dans le projet.
Identifie les dépendances existantes et le placement dans la Clean Architecture.

## 2. PLAN
Propose un plan d'implémentation détaillé avec :
- Fichiers à créer/modifier
- Placement dans la Clean Architecture (domain / infrastructure / presentation)
- Tests à écrire
- Lien avec le mémoire (quelle section est alimentée)

**Attends ma validation avant de passer à l'étape CODE.**

## 3. CODE
Implémente selon le plan validé.
Commente en français. Respecte les conventions TypeScript.

## 4. TEST
Lance : npm test && tsc --noEmit && npm run lint
Corrige jusqu'à ce que les 3 commandes passent.

## 5. JOURNAL
Génère automatiquement une entrée dans docs/journal-reflexif.md.
