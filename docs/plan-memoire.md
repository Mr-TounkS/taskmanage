# Plan du Mémoire — Master 2 Génie Logiciel

**Titre provisoire :**
*Conception et développement d'une PWA intégrant un module algorithmique de détection proactive des risques pour la gestion de projet Agile*

**Auteur :** [Votre prénom NOM]
**Directrice :** Lidya IVANOVA
**Établissement :** Tomsk State Université
**Période :** Janvier – Juin 2025

---

## Problématique centrale

> Dans quelle mesure la conception et le développement d'une PWA intégrant nativement un module algorithmique de détection proactive des risques constitue-t-elle une réponse viable aux limites des outils de gestion de projet Agile existants ?

**Sous-questions de recherche :**
- **SQ1 :** Comment modéliser un algorithme de scoring des risques fondé sur les métriques Kanban et les indicateurs de qualité logicielle ?
- **SQ2 :** Dans quelle mesure l'architecture PWA répond-elle aux exigences de mobilité, disponibilité hors ligne et réactivité des équipes Agile distribuées ?

---

## Objectifs

| Type | Objectif |
|------|----------|
| Technique | Construire une PWA fonctionnelle avec Kanban, backlog, sprints et module SGR |
| Méthodologique | Modéliser un algorithme de scoring des risques ancré dans la littérature Lean/Kanban |
| Analytique | Évaluer la viabilité de l'approche par étude de cas sur son propre développement |

---

## Démarche en 4 phases

| Phase | Contenu | Chapitre |
|-------|---------|---------|
| 1 — Analyse | Littérature Agile, outils existants, exigences | Chapitre 1 |
| 2 — Conception | Architecture PWA, modélisation SGR | Chapitre 2 |
| 3 — Réalisation | Implémentation, intégrations, tests | Chapitre 3 |
| 4 — Validation | Tests, étude de cas, analyse critique | Chapitre 4 |

---

## Structure détaillée

### Introduction
- Contexte : limites des outils Agile actuels (Jira, Trello) face aux équipes distribuées
- Problématique + sous-questions de recherche
- Objectifs (technique / méthodologique / analytique)
- Démarche en 4 phases
- Annonce du plan

---

### Chapitre 1 — Analyse des exigences et de la littérature

#### 1.1 Analyse des méthodologies Agile
- Scrum : sprints, cérémonies, artefacts
- Kanban : flux, WIP, métriques (Cycle Time, Throughput, Lead Time)
- Limites des approches existantes pour la gestion proactive des risques

#### 1.2 Analyse des outils existants et lacunes
- Jira : riche mais complexe, absence de détection proactive des risques
- Trello : simple mais sans métriques Kanban avancées
- Monday, Linear, Notion : comparatif fonctionnel
- **Lacune identifiée** : aucun outil n'intègre nativement un score de risque algorithmique basé sur les métriques de flux

#### 1.3 Exigences fonctionnelles
- Tableau Kanban avec limites WIP configurables
- Backlog produit (création, priorisation, estimation)
- Gestion des sprints (planification, suivi, clôture)
- Module SGR : calcul automatique, alertes, historique
- Intégrations : GitHub (commits, issues) + SonarQube (qualité)

#### 1.4 Exigences non fonctionnelles
- PWA : installable, hors ligne (Service Worker + Cache API)
- Performance : Lighthouse score > 90
- Sécurité : authentification, autorisation par rôle
- Maintenabilité : Clean Architecture, couverture tests > 70%
- Accessibilité : WCAG 2.1 niveau AA

---

### Chapitre 2 — Conception de l'architecture et de l'algorithme

#### 2.1 Architecture PWA
- Choix du framework : Next.js 14 + App Router (voir ADR-002)
- Architecture en couches : Clean Architecture (voir ADR-001)
  - `domain/` → Entités, interfaces, algorithme SGR
  - `application/` → Use-cases
  - `infrastructure/` → Prisma, API externes
  - `app/` (Next.js) → Présentation
- Base de données : SQLite (développement) → PostgreSQL (production) (voir ADR-003)
- Authentification : Clerk (remplacement pragmatique de NextAuth.js — justification : intégration Next.js 14 plus fluide)
- UI : Tailwind CSS + DaisyUI (remplacement pragmatique de MUI — justification : légèreté, compatibilité PWA)

#### 2.2 Modélisation du module de gestion des risques
- Modèle conceptuel : Projet → Sprint → Tâche → Métriques → SGR
- Diagramme de classes des entités du domaine
- Flux de calcul du SGR (pipeline de données)

#### 2.3 Algorithme SGR — Score Global de Risque
```
SGR = 0.30×R_WIP + 0.25×R_CT + 0.20×R_Age + 0.15×R_Throughput + 0.10×R_Tech
```
- R_WIP (30%) : dépassement des limites WIP — Loi de Little
- R_CT (25%) : écart Cycle Time vs historique — SLE 85e percentile
- R_Age (20%) : % tâches au-delà du SLE
- R_Throughput (15%) : baisse débit vs moyenne 90 jours
- R_Tech (10%) : bugs critiques + code smells (SonarQube)

> Référence complète : `docs/sgr-algorithm.md`

#### 2.4 Journal de Bord Réflexif
- Méthode : documentation continue des décisions architecturales
- Incidents rencontrés et résolutions
- Évolution des choix techniques au fil du développement

> Référence complète : `docs/journal-reflexif.md`

---

### Chapitre 3 — Réalisation et intégration

#### 3.1 Technologies et librairies
- Stack final et justification des écarts par rapport au plan initial
- Configuration du projet (Next.js, Prisma, Clerk, Tailwind)
- Structure du dépôt et conventions de code

#### 3.2 Kanban + fonctionnalités PWA
- Implémentation du tableau Kanban (drag & drop, WIP limits)
- Gestion des tâches (CRUD, assignation, statuts)
- Service Worker : stratégies de cache, synchronisation hors ligne
- Manifest PWA : installabilité, icônes, splash screen

#### 3.3 Intégration GitHub + SonarQube (webhooks)
- Architecture des webhooks (Next.js API Routes)
- Récupération des métriques GitHub (commits, issues ouvertes, PR)
- Récupération des métriques SonarQube (bugs, code smells, dette technique)
- Alimentation du R_Tech dans l'algorithme SGR

#### 3.4 Module actif de gestion des risques
- Calcul automatique du SGR (déclenchement sur événement + polling)
- Interface de visualisation : score, jauge, détail par indicateur
- Système d'alertes (niveaux : Faible / Modéré / Élevé / Critique)
- Historique des scores SGR par projet

---

### Chapitre 4 — Tests, validation et démarche réflexive

#### 4.1 Stratégie de test
- Tests unitaires (Jest) : fonctions SGR, use-cases du domaine
- Tests d'intégration : API Routes, flux Kanban → SGR
- Tests E2E (Playwright) : scénarios utilisateur critiques
- Couverture cible : > 70% sur le module SGR

#### 4.2 Étude de cas sur son propre développement
- Application du SGR au projet TaskManage lui-même
- Analyse des métriques collectées durant le développement
- Résultats : corrélation entre score SGR et incidents réels
- Limites de l'auto-évaluation (biais de confirmation)

#### 4.3 Analyse critique et perspectives
- Atteinte des objectifs initiaux
- Limites identifiées :
  - Pondérations SGR non validées empiriquement (hypothèse théorique)
  - Échantillon unique (étude de cas sur un seul projet)
  - SQLite en développement ≠ PostgreSQL en production
- Perspectives de recherche future :
  - Validation empirique des pondérations sur plusieurs équipes
  - Apprentissage automatique pour l'ajustement dynamique des pondérations
  - Extension à d'autres méthodologies (SAFe, LeSS)

---

### Conclusion
- Synthèse des contributions (technique + méthodologique)
- Réponse à la problématique centrale
- Réponse aux sous-questions SQ1 et SQ2
- Apport au domaine du génie logiciel
- Ouverture : vers un SGR adaptatif basé sur le machine learning

---

## Références bibliographiques (à compléter)

- Anderson, D. J. (2010). *Kanban: Successful Evolutionary Change for Your Technology Business*
- Beck, K. et al. (2001). *Manifeste Agile*
- Martin, R. C. (2017). *Clean Architecture: A Craftsman's Guide to Software Structure and Design*
- Vacanti, D. S. (2015). *Actionable Agile Metrics for Predictability*
- [Kanban Guide 2025]
- [Documentation Next.js 14]
- [Documentation Prisma ORM]

---

## État d'avancement

| Section | Statut |
|---------|--------|
| Introduction | 🔲 À rédiger |
| Chapitre 1 | 🔲 À rédiger |
| Chapitre 2 | 🔲 À rédiger |
| Chapitre 3 | 🔲 À rédiger |
| Chapitre 4 | 🔲 À rédiger |
| Conclusion | 🔲 À rédiger |
