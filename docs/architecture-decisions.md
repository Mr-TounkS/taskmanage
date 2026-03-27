# Registre des Décisions d'Architecture (ADR)

> Ces décisions alimentent le Chapitre 2 du mémoire.

---

## ADR-001 — Clean Architecture

**Statut :** Acceptée  
**Date :** [DATE]  
**Section mémoire :** 2.1

**Contexte :** Besoin d'une architecture maintenable (> 70% couverture tests), 
évolutive et permettant d'isoler la logique SGR.

**Décision :** Adopter la Clean Architecture avec 4 couches :
- `domain/` → Entités + Use-cases + Algorithme SGR
- `infrastructure/` → PostgreSQL, GitHub API, SonarQube
- `presentation/` → Next.js, React Components
- `shared/` → Types TypeScript partagés

**Conséquences :** 
- ✅ Logique SGR testable indépendamment de la DB
- ✅ Changement de technologie possible sans impact sur le domaine
- ⚠️ Complexité initiale plus élevée qu'une architecture en couches

---

## ADR-002 — Next.js comme framework frontend

**Statut :** Acceptée  
**Date :** [DATE]  
**Section mémoire :** 2.1, 3.1

**Contexte :** Besoin SSR pour performance PWA, routing intégré, écosystème React.

**Décision :** Next.js 14 avec App Router + TypeScript strict

**Conséquences :**
- ✅ SSR natif → Score Lighthouse > 90 atteignable
- ✅ API Routes intégrées pour les webhooks GitHub/SonarQube
- ⚠️ Courbe d'apprentissage App Router vs Pages Router

---

## ADR-003 — PostgreSQL + Prisma ORM

**Statut :** Acceptée  
**Date :** [DATE]  
**Section mémoire :** 2.1, 3.1

**Contexte :** Données relationnelles (Projet → Sprint → Tâche → Risque), 
besoin de transactions ACID pour l'intégrité des données SGR.

**Décision :** PostgreSQL avec Prisma ORM pour le typage fort et les migrations.

**Conséquences :**
- ✅ Typage bout-en-bout (TypeScript → Prisma → PostgreSQL)
- ✅ Migrations automatiques
- ✅ Compatible Railway/Render pour le déploiement
