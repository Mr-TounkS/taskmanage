# Journal de Bord Réflexif — PWA Kanban Tool

> Ce journal alimente la section 4.2 du mémoire : 
> "Étude de cas : Application de l'outil à son propre développement"

---

## Entrée #1 — [DATE DE DÉBUT]

### Déclencheur
Initialisation du projet — Choix de la Clean Architecture

### Contexte technique
- SGR : N/A (projet non encore démarré)
- Indicateurs : N/A

### Décision prise
Adopter la Clean Architecture plutôt que l'architecture en couches classique.
Alternatives considérées : Layered Architecture, DDD complet, Architecture Hexagonale
Raison du choix : Maintenabilité > 70% couverture tests, isolation de la logique SGR, 
indépendance des frameworks externes (PostgreSQL, GitHub API, SonarQube)

### Impact observé
- Sur le code : Structure en 4 couches (domain / infrastructure / presentation / shared)
- Sur le SGR : Non mesurable à ce stade
- Sur le calendrier : +2 jours de setup initial estimés

### Leçon pour le mémoire
- Section concernée : Chapitre 2, section 2.1
- Enseignement : Le choix architectural est directement conditionné par l'exigence
  de testabilité (NFR : couverture > 70%) et par la nécessité d'isoler la logique SGR
  de tout framework externe — validant la pertinence de la Clean Architecture pour
  ce type de projet.
- Question de soutenance potentielle : "Pourquoi avoir choisi la Clean Architecture
  plutôt qu'une architecture hexagonale, qui offre des garanties similaires ?"

---

## Entrée #2 — 2026-03-10

### Déclencheur
Implémentation complète de la chaîne SGR : schéma Prisma → algorithme → use-case → Server Action.
Incident technique détecté en cours de session : divergence entre `@prisma/client` et le client généré custom.

### Contexte technique
- SGR : module algorithmique implémenté pour la première fois — pas encore de score calculable sur données réelles
- Fichiers créés : `lib/risk-algorithm/types.ts`, `lib/risk-algorithm/calculateSGR.ts`, `application/use-cases/sgr/CalculateSGRUseCase.ts`
- Fichiers modifiés : `app/actions.ts`, `domain/repositories/ITaskRepository.ts`, `infrastructure/repositories/PrismaTaskRepository.ts`, `infrastructure/repositories/PrismaColumnWIPConfigRepository.ts`

### Décision prise

**1. Architecture de l'algorithme SGR en fonctions isolées**
Chaque indicateur (R_WIP, R_CT, R_Age, R_Throughput, R_Tech) est une fonction pure indépendante,
agrégée dans une fonction principale `calculateSGR`. Cela permet de tester chaque indicateur
séparément sans dépendance à la base de données.

**2. Résolution de l'incident Prisma client custom**
Le générateur `prisma-client` avec `output = "./generated/prisma"` ne met pas à jour
`@prisma/client` dans `node_modules`. Les types divergent : `@prisma/client` ignore
le modèle `ColumnWIPConfig`. Solution adoptée : conserver l'import depuis le chemin généré
dans `PrismaColumnWIPConfigRepository`, et utiliser un cast `as unknown as GeneratedPrismaClient`
dans `makeRepos()` pour réconcilier les deux types à la frontière infrastructure/présentation.

**3. Ajout de `findByProject` sur `ITaskRepository`**
La méthode manquait dans l'interface domaine — nécessaire pour que le use-case SGR puisse
récupérer toutes les tâches d'un projet sans dépendance directe à Prisma.

### Impact observé
- Sur le code : la chaîne complète est opérationnelle — `getProjectSGR(projectId)` est appelable depuis n'importe quel composant Next.js
- Sur le SGR : les cinq indicateurs sont calculables dès que des tâches avec horodatages existent en base
- Sur le calendrier : incident Prisma résolu en cours de session, pas de retard estimé
- Sur l'architecture : le cast `as unknown` introduit une dette technique mineure à la frontière infrastructure — à documenter en 4.3

### Leçon pour le mémoire
- Section concernée : Chapitre 3, sections 3.1 et 3.4 ; Chapitre 4, section 4.3
- Enseignement : L'utilisation d'un générateur Prisma custom (output non standard) crée une
  friction TypeScript à la frontière infrastructure/présentation. Ce cas illustre concrètement
  la tension entre la Clean Architecture (qui préconise des interfaces abstraites) et les
  contraintes pratiques des ORM modernes dont les types sont liés à leur client généré.
  Ce type d'incident — invisible en développement naïf mais révélé par la rigueur
  architecturale — constitue une donnée empirique pour la section 4.2 (étude de cas).
- Question de soutenance potentielle : "Comment avez-vous géré la divergence de types
  entre le client Prisma généré et le client standard ? Quelles alternatives aviez-vous ?"

---

## Entrée #3 — 2026-03-14

### Déclencheur
Finalisation du module SGR : implémentation du composant `SGRWidget`, écriture des tests unitaires Jest,
et résolution de deux incidents bloquants détectés lors de la première exécution en conditions réelles.

### Contexte technique
- SGR : premier calcul réel sur données de production déclenché — deux erreurs ont empêché l'affichage initial
- Fichiers créés : `app/components/SGRWidget.tsx`, `__tests__/calculateSGR.test.ts`, `jest.config.ts`
- Fichiers modifiés : `app/project/[projectId]/page.tsx`, `app/page.tsx`, `app/general-project/page.tsx`
- Couverture tests : 93,7 % statements, 100 % fonctions sur `calculateSGR.ts` (21 tests, tous passants)

### Incidents détectés et résolus

**Incident 1 — Client Prisma non régénéré (`Unknown argument 'startedAt'`)**
La migration `20260310093950_add_sgr_fields` avait bien été créée lors de la session précédente
et appliquée à la base de données. Cependant, `npx prisma generate` n'avait pas été exécuté
à l'issue de cette session. Le client généré dans `prisma/generated/prisma/` ne connaissait donc
ni les champs `startedAt`/`completedAt` sur `Task`, ni le modèle `ColumnWIPConfig`.
Conséquence : l'appel `this.prisma.task.update({ data: { startedAt: ... } })` échouait à
l'exécution avec "Unknown argument", et `this.prisma.columnWIPConfig` était `undefined`.
Résolution : exécution de `npx prisma generate` suivie d'un redémarrage du serveur de développement.

**Incident 2 — Affichage prématuré de l'état vide ("Aucun projet créé")**
Les pages `app/page.tsx` et `app/general-project/page.tsx` initialisaient leur état local
avec un tableau vide `useState<Project[]>([])`. En l'absence d'un état de chargement explicite,
l'interface affichait le composant `EmptyState` pendant les quelques centaines de millisecondes
nécessaires au fetch asynchrone, avant de le remplacer par la liste réelle des projets.
Ce comportement, imperceptible avec un réseau local rapide, deviendrait visible en production
sur une connexion moins favorable. Résolution : ajout d'un état `loading` initialisé à `true`,
mis à `false` dans le bloc `finally` de chaque fetch, conditionnant l'affichage de l'état vide.

### Décision prise
Adopter systématiquement le pattern loading/data/error pour tout composant effectuant
un appel asynchrone au chargement. Ce pattern est une exigence de qualité d'interface,
pas une optimisation optionnelle.

### Impact observé
- Sur le code : le module SGR est visible et fonctionnel dans l'interface de chaque projet
- Sur le SGR : premier score calculé sur données réelles — score 0 (aucune tâche avec horodatage existante, données antérieures à la migration)
- Sur le calendrier : incidents résolus en cours de session sans impact sur le planning
- Sur la qualité : couverture de test > 70 % atteinte sur le module SGR, objectif NFR validé

### Leçon pour le mémoire
- Section concernée : Chapitre 4, sections 4.1 et 4.2
- Enseignement 1 (incident Prisma) : La gestion d'un générateur Prisma custom requiert
  un protocole de régénération systématique après chaque migration — cette étape manquante
  illustre la fragilité des conventions implicites dans un processus de développement individuel.
  En équipe, ce type d'oubli serait détecté par les pipelines CI/CD. Son occurrence ici
  constitue une donnée empirique pertinente pour l'étude de cas sur le propre développement (4.2).
- Enseignement 2 (état vide) : La distinction entre "données absentes" et "données en cours
  de chargement" est une exigence fonctionnelle à part entière. L'ignorer produit un comportement
  incorrect — pas seulement une dégradation cosmétique — ce qui justifie sa place dans une
  stratégie de test d'interface.
- Question de soutenance potentielle : "Votre SGR affiche un score de 0 sur les tâches
  antérieures à la migration. Comment gérez-vous la migration des données historiques,
  et quel impact cela a-t-il sur la fiabilité des indicateurs de départ ?"

---

## Entrée #4 — 2026-03-27

### Déclencheur
Implémentation et validation complète des tests E2E Playwright (16/16 tests passants).
Trois incidents bloquants successifs résolus en cours de session.

### Contexte technique
- SGR : non recalculé lors de cette session (focus sur l'infrastructure de test)
- Fichiers créés : `e2e/offline.spec.ts`, `e2e/pwa.spec.ts`, `e2e/navigation.spec.ts`, `playwright.config.ts`, `app/components/ReloadButton.tsx`
- Fichiers modifiés : `proxy.ts`, `app/offline/page.tsx`, `package.json`
- Résultat final : **16/16 tests passants en 19,7 secondes** (Chromium)

### Incidents détectés et résolus

**Incident 1 — Convention `middleware.ts` → `proxy.ts` (Next.js 16.1.6)**
Next.js 16 a renommé la convention `middleware.ts` en `proxy.ts`. Un fichier `proxy.ts`
existait déjà dans le projet avec la configuration Clerk de base. La création d'un
`middleware.ts` a produit une erreur de démarrage : *"Both middleware file and proxy file
are detected"*. Résolution : suppression de `middleware.ts` et mise à jour de `proxy.ts`.
Note : ce changement de convention n'est pas documenté dans les sources d'août 2025 —
il illustre la rapidité d'évolution des frameworks Next.js et le risque de désynchronisation
entre documentation externe et version réelle utilisée.

**Incident 2 — Clerk `dev-browser-missing` bloque les routes "publiques"**
En mode développement, Clerk v6 exige un cookie de session "dev browser" sur toutes les
requêtes, y compris les routes marquées comme publiques via `createRouteMatcher`. Ce mécanisme
est une couche de vérification interne à Clerk qui s'exécute avant le callback du proxy.
Conséquence : la route `/offline` retournait 307 (redirection vers `/sign-in`) malgré sa
présence dans la liste des routes publiques. Résolution : exclusion de `/offline` et
`/manifest.json` du `matcher` du proxy, afin que Clerk ne traite pas du tout ces requêtes.

**Incident 3 — Server Component avec `onClick` (`app/offline/page.tsx`)**
La page `/offline` était un Server Component contenant un bouton avec `onClick={() => window.location.reload()}`.
Dans Next.js 14+, les gestionnaires d'événements sont interdits dans les Server Components.
Ce bug préexistait (la page retournait HTTP 200 mais avec une erreur de rendu silencieuse) ;
il est devenu une erreur 500 explicite une fois le proxy correctement configuré.
Résolution : extraction du bouton dans un composant client dédié `ReloadButton.tsx`.

### Décision prise

**Stratégie de test E2E limitée aux routes publiques (sans authentification)**
Face à la complexité de configurer Clerk en mode test (credentials de test nécessaires),
la décision a été prise de valider en priorité les scénarios accessibles sans authentification :
- Page hors ligne (`/offline`) — valide la réponse à SQ2
- Configuration PWA (`manifest.json`, métadonnées, icônes)
- Navigation publique (comportement Clerk sur routes inconnues, page sign-in)

Les tests E2E authentifiés (Kanban, SGR, création de tâches) sont différés à la phase
d'obtention des credentials Clerk de test.

### Impact observé
- Sur le code : correction d'un bug préexistant (`onClick` dans Server Component) révélé par les tests
- Sur l'architecture : `proxy.ts` est maintenant documenté avec les routes publiques explicites — améliore la lisibilité de la politique d'authentification
- Sur la stratégie de test : la couverture E2E couvre les scénarios PWA offline (SQ2) et les comportements d'authentification (SQ1 partiel)
- Sur le calendrier : 3 incidents résolus en une session, pas de dépassement

### Leçon pour le mémoire
- Section concernée : Chapitre 4, sections 4.1 et 4.2 ; Chapitre 3, section 3.2
- Enseignement 1 (Next.js 16 / proxy.ts) : La rapidité d'évolution des frameworks constitue
  un risque de maintenance actif. La transition `middleware.ts` → `proxy.ts` illustre que
  la documentation de référence peut être obsolète sur des versions très récentes.
  Ce risque, identifié dans le registre des risques comme "dette de version", s'est
  concrétisé ici — donnée empirique pour la section 4.2.
- Enseignement 2 (Clerk dev-browser-missing) : L'intégration d'un service d'authentification
  tiers (Clerk) introduit des comportements spécifiques au mode développement qui diffèrent
  de la production. Cette asymétrie complique les tests d'intégration et illustre le coût
  caché des dépendances à des services externes — pertinent pour la section 4.3 (analyse critique).
- Enseignement 3 (Server Component / onClick) : Les tests E2E ont révélé un bug préexistant
  invisible en tests unitaires (Jest ne teste pas le rendu). Ceci valide empiriquement la
  complémentarité des niveaux de test (unitaire + E2E) défendue dans la stratégie de test
  de la section 4.1.
- Question de soutenance potentielle : "Vos tests E2E ne couvrent pas les flux authentifiés.
  Comment justifiez-vous cette limitation dans votre stratégie de validation ?"

---

## Entrée #5 — 2026-03-27

### Déclencheur
Implémentation du graphique d'historique SGR — visualisation de l'évolution temporelle
du Score Global de Risque. Feature motivée par un constat de fond : sans visualisation
temporelle, le SGR reste un outil réactif, pas proactif.

### Contexte technique
- SGR : module de calcul déjà fonctionnel, table `SGRHistory` déjà alimentée à chaque calcul
- Fichiers créés : `app/components/SGRHistoryChart.tsx` (Recharts AreaChart)
- Fichiers modifiés : `app/actions.ts` (+`getSGRHistory`), `app/components/SGRWidget.tsx`
- Bibliothèque ajoutée : `recharts@^3.8.1` (installée depuis le cache npm)
- Tests : 30/30 Jest ✅ — TypeScript strict ✅

### Décision prise

**Recharts plutôt que Chart.js ou D3**
Alternatives considérées : Chart.js (nécessite un wrapper React non maintenu pour Next.js),
D3 (puissant mais verbeux, courbe d'apprentissage élevée, peu pertinent pour un composant
de visualisation standard), Victory (moins populaire, moins de support).
Recharts est natif React, composable, compatible `"use client"`, et ne nécessite pas
de gestion manuelle du canvas. Pertinence directe pour un projet Next.js + TypeScript.

**AreaChart avec dégradé plutôt que LineChart**
La zone colorée sous la courbe renforce la perception visuelle du niveau de risque :
une zone large et haute = danger immédiat. Un simple LineChart ne transmettrait pas
la même urgence de lecture. Ce choix est documentable en section 3.4 comme
décision d'UI orientée par l'objectif métier (détection proactive).

**Appel parallèle `Promise.all([getProjectSGR, getSGRHistory])`**
Le calcul SGR et la récupération de l'historique sont indépendants — les appeler
en séquence aurait doublé inutilement le temps de chargement du widget.

### Impact observé
- Sur l'interface : le SGRWidget est maintenant auto-suffisant pour démontrer la valeur
  proactive de l'outil — un jury peut lire la courbe en 3 secondes
- Sur le mémoire : la section 4.2 peut maintenant s'appuyer sur **la courbe réelle**
  du projet pendant son développement — preuve empirique centrale
- Sur le SGR lui-même : le graphique révèle que les scores précédents (score 0 sur
  données sans horodatage) constituent un plancher artificiel au début de la courbe
  — à mentionner comme limite méthodologique en section 4.3
- Sur le calendrier : 0 régression, 30 tests toujours verts

### Leçon pour le mémoire
- Section concernée : Chapitre 3, section 3.4 ; Chapitre 4, sections 4.2 et 4.3
- Enseignement 1 (proactif vs réactif) : La distinction entre un score ponctuel et une
  courbe d'évolution est fondamentale pour répondre à la problématique. Un score de 65/100
  est ambigu (est-ce grave ?). Une courbe qui monte de 20 à 65 en 5 jours est une alarme
  claire. Le graphique transforme le SGR d'indicateur statique en outil de détection
  de tendances — ce glissement sémantique est la contribution principale de cette feature
  à la thèse centrale.
- Enseignement 2 (données historiques) : La table `SGRHistory` accumulait des données
  depuis la session 2026-03-15. Le graphique a rendu visibles des patterns qui étaient
  dans la base sans être exploitables. Ceci illustre le principe qu'une donnée sans
  visualisation n'a pas de valeur opérationnelle — argument pour la section 3.4.
- Enseignement 3 (incident réseau npm) : L'installation de Recharts a d'abord échoué
  pour erreur réseau. La résolution via `--prefer-offline` (cache local) démontre
  l'importance d'un cache de dépendances local dans un environnement de développement
  contraint — pertinent pour la section 3.1 (environnement de développement).
- Question de soutenance potentielle : "Votre courbe SGR commence à 0. Comment
  distinguez-vous un risque réellement nul d'un artefact lié à l'absence de données
  historiques au démarrage du projet ?"

---

## Entrée #10 — 2026-04-24

### Déclencheur
Implémentation de l'onglet Teams — visualisation des membres d'équipe avec statistiques
de tâches, double vue (cartes / tableau) et filtres interactifs. Feature motivée par un
besoin concret : l'outil gérait les tâches mais ne donnait aucune visibilité sur la charge
individuelle des membres ni les indicateurs de risque humain (retards, surcharge).

### Contexte technique
- Fichiers créés :
  - `application/use-cases/project/GetTeamsOverviewUseCase.ts` — agrège stats par membre
  - `app/teams/page.tsx` — Server Component, résumé global + délégation au client
  - `app/components/TeamsClient.tsx` — Client Component, toggle + filtres + rendu dual
  - `app/components/MemberCard.tsx` — carte présentationnelle par membre
  - `__tests__/GetTeamsOverviewUseCase.test.ts` — 7 tests unitaires
- Fichiers modifiés :
  - `app/type.ts` — +`TeamMemberStats` interface
  - `app/actions.ts` — +`getTeamsOverview(email)` Server Action
  - `app/components/Sidebar.tsx` — Teams activé (déplacé de `comingSoonItems` vers `activeNavItems`)
- Tests : 7 nouveaux tests ✅, 0 régression sur les 33 tests existants

### Décision prise

**Réutiliser `findManyAssociatedWithUser` plutôt que créer une nouvelle requête Prisma**
La méthode existante retourne déjà `ProjectWithFlatUsers` (projets + users + tasks).
L'agrégation des statistiques par membre est faite en mémoire dans le use case, sans
aller-retour supplémentaire vers la base de données. Cette approche évite de surcharger
l'infrastructure pour une feature de visualisation dont le volume de données reste limité.
Alternative rejetée : créer une requête SQL agrégée (`GROUP BY userId`) — plus performante
à grande échelle, mais prématurée pour un projet académique où le nombre de membres
par projet est borné (< 20).

**State local pour le toggle de vue (cards/table)**
Le toggle `view: 'cards' | 'table'` est géré en state React local dans `TeamsClient.tsx`.
Alternative considérée : persister le choix dans `localStorage` pour retrouver la dernière
vue à la reconnexion. Rejeté — la complexité n'est pas justifiée pour une préférence
d'affichage sans impact métier.

**Découpage Server Component (page) + Client Component (TeamsClient)**
La page `/teams` est un Server Component qui effectue le fetch et passe les données
au composant client. Ce pattern garantit que le fetch ne se fait qu'une fois, côté serveur,
et que le rendu initial est statique (pas de loading state visible). Le Client Component
prend en charge uniquement l'interactivité (toggle, filtres).

### Impact observé
- Sur l'interface : l'onglet Teams est désormais fonctionnel et accessible depuis la sidebar
- Sur la visibilité risque : les filtres "Overdue" et "High load" matérialisent visuellement
  des indicateurs de risque humain — R_Age (retard individuel) et surcharge WIP
- Sur l'architecture : 0 modification au domain layer — le use case s'insère proprement
  dans la Clean Architecture sans violer les règles de dépendance
- Sur le calendrier : feature complète en une session, sans régression

### Leçon pour le mémoire
- Section concernée : Chapitre 3, section 3.2 (réalisation) ; Chapitre 4, section 4.1
  (analyse des risques humains)
- Enseignement 1 (risque humain = dimension manquante du SGR) : L'onglet Teams révèle
  que le SGR actuel mesure des risques de flux (WIP, Cycle Time, Throughput) mais pas
  les risques humains distribués (surcharge individuelle, retards d'un membre spécifique).
  La vue Teams est complémentaire au SGR : elle localise le risque là où le SGR le détecte.
  Argument exploitable en section 4.1 pour discuter des limites de l'algorithme et des
  extensions possibles (R_Load = indicateur de charge individuelle).
- Enseignement 2 (réutilisation vs requête dédiée) : Le choix de réutiliser
  `findManyAssociatedWithUser` illustre un arbitrage classique entre optimisation précoce
  et pragmatisme. Pour un mémoire de Master, documenter ce choix et ses limites (passage
  à l'échelle) est plus instructif qu'optimiser une requête pour un contexte qui n'existera
  pas. Pertinent pour la section 3.2 sous l'angle "décisions architecturales justifiées".
- Enseignement 3 (Server/Client split Next.js 15+) : Le pattern `Server Component fetch →
  Client Component interactivité` est la recommandation officielle Next.js App Router.
  Le respecter ici alors que la feature aurait pu être entièrement client-side démontre
  une maîtrise du framework au-delà du tutoriel — argument pour la section 3.1.
- Question de soutenance potentielle : "Votre onglet Teams affiche la charge individuelle,
  mais elle n'entre pas dans le calcul SGR. Envisagez-vous d'intégrer un indicateur de
  risque humain dans l'algorithme, et pourquoi ne l'avez-vous pas fait ?"
