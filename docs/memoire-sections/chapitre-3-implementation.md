# CHAPITRE 3 — IMPLÉMENTATION DU SYSTÈME

Le chapitre 2 a formalisé le modèle SGR et posé les bases de l'architecture. Le présent chapitre décrit comment ce modèle a été transformé en un système fonctionnel déployé. Chaque section correspond à une couche de la réalisation : les choix technologiques, la structure du code, le noyau fonctionnel, les intégrations externes, les fonctionnalités PWA, l'interface utilisateur et les tests. L'objectif est de montrer que le modèle théorique fonctionne dans une application réelle, accessible, et utilisable dans des conditions de connectivité variables.

**Principe de preuve visuelle adopté dans ce chapitre.** Chaque figure répond à une idée précise : un diagramme UML lorsqu'il s'agit de structure, de comportement ou de flux, une capture d'écran lorsqu'il s'agit de prouver qu'un élément visible à l'utilisateur existe effectivement dans le produit livré. Aucune figure n'est présentée sans explication de son rôle dans la démonstration, et chaque figure est rattachée à l'argument SGR sous-jacent — l'outil ne sert de preuve que parce qu'il participe à la chaîne de production ou de restitution du score de risque.

---

## 3.1 Pile technique et environnement de développement

Le choix des technologies a été guidé par quatre contraintes principales : la testabilité du module SGR, la modularité de l'architecture en couches, le support natif des fonctionnalités PWA, et la capacité à s'intégrer avec des sources de données externes telles que GitHub et Codacy. Le tableau suivant présente la pile technique retenue et la justification de chaque choix.

**Tableau 3.1 — Pile technique retenue**

| Composant | Technologie retenue | Justification |
|---|---|---|
| Cadre applicatif | Next.js 16.1.6 + React 19 | App Router, Server Actions, rendu serveur natif, compatibilité PWA |
| Langage | TypeScript 5 | Typage strict des entités SGR, détection d'erreurs à la compilation |
| Base de données | PostgreSQL (Neon — hébergement sans serveur) | Parité dev/prod, transactions ACID, compatibilité Prisma |
| Gestionnaire de données | Prisma v7 + adaptateur Neon | Migrations versionnées, requêtes typées, isolation de la couche infrastructure |
| Authentification | Clerk v6 | Sessions JWT, intégration Next.js native, gestion des rôles par projet |
| Interface utilisateur | Tailwind CSS v4 + DaisyUI v5 | CSS minimal, composants accessibles, pas de conflit avec le cache Service Worker |
| Graphiques | Recharts 3.8.1 | Composants React natifs, TypeScript, courbe temporelle SGR |
| Stockage fichiers | Vercel Blob | Intégration transparente avec le déploiement Vercel |
| PWA | Service Worker Workbox + Manifest | Précache, stratégies de cache, notifications push, mode hors ligne |
| Tests unitaires | Jest 29 | Isolation des fonctions SGR, couverture mesurable |
| Tests de bout en bout | Playwright | Scénarios utilisateur critiques, validation PWA |
| Déploiement | Vercel (Hobby) | Déploiement continu depuis GitHub, variables d'environnement sécurisées |

Deux substitutions méritent d'être justifiées par rapport aux prévisions initiales. L'outil Material-UI a été remplacé par Tailwind CSS car Material-UI génère des ressources CSS volumineuses qui alourdissent le précache du Service Worker, dégradant les performances en mode hors ligne. NextAuth.js a été remplacé par Clerk en raison d'une incompatibilité entre les conventions de nommage de l'intergiciel NextAuth.js et celles de Next.js 16 — Clerk propose un intergiciel prêt à l'emploi (`proxy.ts`) compatible avec cette version.

**Figure 3.1 — Diagramme de déploiement (UML 2.5)**

[📊 DIAGRAMME DE DÉPLOIEMENT : trois nœuds — `<<device>> Poste développeur` (Next.js dev server, navigateur), `<<executionEnvironment>> Vercel Edge` (application déployée), `<<database>> Neon PostgreSQL` (eu-central-1). Flèches étiquetées `HTTPS` entre le poste et Vercel, `TCP/SSL pooler` entre Vercel et Neon, et une flèche en pointillés `identical schema` entre le poste et Neon pour montrer la parité dev/prod.]

**Pourquoi ce diagramme est nécessaire.** Il prouve visuellement la décision la plus structurante de la pile technique : l'abandon de SQLite en développement au profit d'une seule et même base PostgreSQL Neon partagée entre l'environnement local et la production. Cette parité élimine une classe entière de bogues liés aux divergences de comportement entre moteurs SQL (types de colonnes, gestion des transactions, précision des dates utilisées par le Cycle Time). **Lien avec le SGR :** les indicateurs R_CT et R_Throughput dépendent de soustractions de dates à la milliseconde près ; une divergence de comportement entre SQLite et PostgreSQL sur ces opérations fausserait le score calculé en production sans qu'aucun test local ne le détecte.

---

## 3.2 Architecture logicielle de l'application

L'application est organisée selon les principes de la Clean Architecture [17], en quatre couches dont les dépendances sont dirigées vers le domaine. Cette organisation, décrite conceptuellement en section 2.4, se matérialise dans le code par quatre répertoires distincts.

**Figure 3.2 — Arborescence réelle du projet**

[📊 DIAGRAMME ARBORESCENCE (PlantUML `salt` ou arbre) : quatre dossiers racine `domain/`, `application/`, `infrastructure/`, `app/`, avec un fichier représentatif par sous-dossier : `domain/repositories/ITaskRepository.ts`, `application/use-cases/sgr/CalculateSGRUseCase.ts`, `infrastructure/repositories/PrismaTaskRepository.ts`, `app/actions.ts`.]

**Pourquoi cette figure.** Elle confronte la théorie de la section 2.4 à la réalité du dépôt Git : les quatre couches ne sont pas une abstraction rhétorique, elles sont matérialisées sur le disque et versionnées. La règle de dépendance est vérifiable statiquement par une inspection des imports. **Lien avec le SGR :** l'isolation du module `lib/risk-algorithm/` dans une couche sans dépendance externe est ce qui a rendu possible une couverture de tests de 93,7 % — sans cette séparation, chaque test aurait dû instancier Prisma et Clerk, rendant les tests lents et fragiles.

**Figure 3.3 — Diagramme de composants Clean Architecture (UML 2.5)**

[📊 DIAGRAMME DE COMPOSANTS : cinq couches concentriques (Frameworks & Drivers, Infrastructure, Interface Adapters, Application, Entities), systèmes externes (Vercel, Neon, Codacy, Clerk), relations `..|>` de réalisation entre `PrismaXxxRepository` et les interfaces `IXxxRepository`, relations `..>` de dépendance entre use-cases et interfaces. Flèches convergeant vers les Entities.]

**Pourquoi ce diagramme.** L'arborescence (figure 3.2) montre *où* se trouvent les fichiers ; ce diagramme montre *comment* ils communiquent. Il rend visible le Principe d'Inversion des Dépendances : les use-cases de la couche Application ne connaissent que les interfaces, et les implémentations Prisma sont injectées depuis l'extérieur via la fabrique `makeRepos()`. **Lien avec le SGR :** `CalculateSGRUseCase` dépend de `ITaskRepository` et `ICodacyClient` mais ignore totalement PostgreSQL et l'interface Codacy REST. Cette ignorance est ce qui permettra, dans une version ultérieure, d'ajouter la source GitHub sans modifier la logique de calcul du score.

**Tableau 3.2 — Cas d'usage implémentés par couche**

| Domaine fonctionnel | Cas d'usage |
|---|---|
| Projet (7) | CreateProject, GetProjectsCreatedByUser, GetProjectsAssociatedWithUser, DeleteProject, AddUserToProject, GetProjectInfo, GetProjectUsers |
| Tâche (4) | CreateTask, UpdateTaskStatus, DeleteTask, GetTaskDetails |
| Utilisateur (1) | CheckAndAddUser |
| Limites de travail en cours (1) | UpsertWIPConfig |
| SGR (1) | CalculateSGR |

Les Actions serveur de Next.js jouent le rôle de couche de coordination entre la présentation et les cas d'usage. Une Action serveur est une fonction TypeScript marquée par la directive `"use server"`, exécutée côté serveur et appelable directement depuis les composants React sans exposition d'une route HTTP. Le fichier `app/actions.ts` suit un modèle de fabrique (`makeRepos()`) qui instancie les dépôts d'infrastructure à chaque appel. Ce modèle garantit que les Actions serveur ne contiennent aucune logique métier — elles reçoivent les paramètres, instancient les dépendances et délèguent au cas d'usage correspondant.

---

## 3.3 Implémentation du noyau fonctionnel

### 3.3.1 Modèle de données : projets et tâches

La gestion des projets repose sur un modèle de données à deux niveaux. Un projet (`Project`) est créé par un utilisateur qui en devient automatiquement le Propriétaire de Produit. D'autres utilisateurs peuvent rejoindre le projet via un code d'invitation unique, généré lors de la création et stocké dans le champ `inviteCode`. Le rôle de chaque membre est persisté dans la table de jointure `UserProject`, avec une valeur `PO` pour le Propriétaire de Produit et `MEMBER` pour les membres ordinaires.

**Figure 3.4 — Diagramme de classes du domaine (UML 2.5)**

[📊 DIAGRAMME DE CLASSES : classes `User`, `Project`, `UserProject` (table de jointure avec attribut `role: ProjectRole`), `Task`, `ColumnWIPConfig`, `SGRHistory`, `TaskFile`. Enums `ProjectRole`, `TaskStatus`, `Priority` reliés par des flèches `..>`. Multiplicités `1..*` / `0..*` explicites. Attributs `startedAt`, `completedAt`, `priority`, `startDate` de `Task` surlignés car ils alimentent directement le SGR.]

**Pourquoi ce diagramme.** Il rend lisible le lien entre la structure des données et l'algorithme du chapitre 2. Les champs `startedAt` et `completedAt` n'existent pas par hasard dans `Task` : ils sont la matière première des indicateurs R_CT et R_Age. De même, `ColumnWIPConfig` a été introduit spécifiquement pour permettre le calcul de R_WIP. **Lien avec le SGR :** sans ce modèle, l'algorithme serait formellement correct mais empiriquement inutilisable, faute de données à agréger.

Le cycle de vie d'une tâche est modélisé par trois états. Le cas d'usage `UpdateTaskStatusUseCase` enrichit automatiquement les horodatages lors des transitions d'état : `startedAt` est enregistré lors du premier passage en "In Progress", et `completedAt` lors du passage en "Done". Cette alimentation automatique élimine toute saisie manuelle susceptible d'introduire des erreurs de mesure.

**Figure 3.5 — Diagramme d'états de la tâche (UML 2.5)**

[📊 DIAGRAMME D'ÉTATS : état initial → `TO_DO` → `IN_PROGRESS` → `DONE` → état final. Sur la transition `TO_DO → IN_PROGRESS`, entry action : `startedAt := now()`. Sur la transition `IN_PROGRESS → DONE`, entry action : `completedAt := now()` + ouverture modale « Solution + fichiers ». Transition de retour `IN_PROGRESS → TO_DO` possible sans effacer `startedAt`.]

**Pourquoi ce diagramme.** Il documente la convention d'horodatage qui fait foi pour tous les calculs temporels du SGR. Un reviewer qui souhaite auditer les résultats doit d'abord comprendre *à quel moment* les timestamps sont posés. **Lien avec le SGR :** le Cycle Time (`completedAt − startedAt`) et l'Age (`now − startedAt`) sont entièrement déterminés par ce diagramme d'états — toute modification du cycle de vie impacterait directement R_CT et R_Age.

### 3.3.2 Calcul du SGR

Le module de calcul du SGR est implémenté dans `lib/risk-algorithm/calculateSGR.ts`. Nous avons structuré ce module comme un ensemble de fonctions pures, chacune calculant un indicateur à partir de données en entrée, sans état partagé ni effets de bord. Cette organisation garantit que chaque indicateur peut être testé indépendamment avec des jeux de données contrôlés.

La fonction principale `calculateSGR()` reçoit un objet `SGRInput` contenant les tâches du projet, les configurations de limites de travail en cours, et les données de qualité (optionnelles). Elle retourne un objet `SGRResult` contenant le score global, le niveau de risque, les scores individuels de chaque indicateur et les alertes textuelles associées.

La formule implémentée est la suivante :

```
SGR = 0,30 × R_WIP + 0,25 × R_CT + 0,20 × R_Age + 0,15 × R_Throughput + 0,10 × R_Tech
```

**Figure 3.6 — Diagramme d'activité du pipeline SGR (UML 2.5)**

[📊 DIAGRAMME D'ACTIVITÉ : nœud initial → action `Charger tâches + WIPConfig + Codacy` (fork) → cinq activités parallèles `calculerRWIP`, `calculerRCT`, `calculerRAge`, `calculerRThroughput`, `calculerRTech` → join → action `Pondérer × poids` → action `Borner entre 0 et 100` → action `interpréterNiveau(sgr)` → action `persister SGRHistory` → nœud final. Partitions (swimlanes) : Infrastructure / Application / Domain.]

**Pourquoi ce diagramme.** Il rend visible le déroulement d'un calcul de SGR, avec l'indépendance des cinq indicateurs (matérialisée par la fourche/jointure) et la traversée des couches architecturales (swimlanes). Il répond à la recommandation de la directrice de recherche (conférence du 22 avril) de formaliser le pipeline sous forme d'activité plutôt que d'états. **Lien avec le SGR :** ce diagramme est la représentation exécutable de la formule — chaque action correspond à une fonction unitaire testée et chaque flèche à une composition vérifiable.

Le calcul de R_WIP parcourt chaque colonne ayant une limite configurée et calcule le ratio entre le dépassement et la limite. Le score de la colonne la plus surchargée est retenu. Ce choix reflète le principe de la Loi de Little [12] : le débit d'un système est contraint par son goulot d'étranglement, pas par sa moyenne.

Le calcul de R_CT compare le Cycle Time moyen des cinq tâches les plus récemment terminées au Cycle Time historique moyen de l'ensemble du projet. Le calcul de R_Age détermine le 85e centile des Cycle Times historiques, qui constitue le Niveau d'Engagement de Service ; toute tâche en cours dont l'âge dépasse ce seuil est comptabilisée comme en retard. Le calcul de R_Throughput compare le débit de la semaine écoulée au débit hebdomadaire moyen des 90 derniers jours — une fenêtre qui couvre trois à quatre cycles de sprint, offrant une base de référence statistiquement représentative.

La persistance du résultat est réalisée dans le cas d'usage `CalculateSGRUseCase`, qui appelle `calculateSGR()` puis enregistre le score et le niveau dans la table `SGRHistory`. Chaque calcul est ainsi horodaté et conservé, permettant la reconstruction de la courbe temporelle du risque.

**Figure 3.7 — Capture d'écran : SGRWidget**

[📸 CAPTURE D'ÉCRAN : jauge circulaire avec score chiffré et couleur de niveau, 5 barres de progression des indicateurs R_WIP / R_CT / R_Age / R_Throughput / R_Tech avec valeurs, alertes textuelles en bas.]

**Pourquoi cette capture (et non un diagramme).** Le pipeline (figure 3.6) prouve que le calcul fonctionne ; la capture prouve que le résultat est *restitué à l'utilisateur* de manière compréhensible. La décomposition en cinq barres n'est pas décorative : elle permet à l'équipe de diagnostiquer *quelle dimension* tire le score vers le haut, et donc quelle action corrective entreprendre. **Lien avec le SGR :** l'interface est la dernière étape de la chaîne de valeur — un score calculé mais invisible n'aurait aucun effet proactif.

### 3.3.3 Historique du SGR

L'historique du SGR est récupéré via l'Action serveur `getSGRHistory()`, qui retourne les enregistrements de la table `SGRHistory` triés chronologiquement. Ces données alimentent le composant `SGRHistoryChart.tsx`, qui utilise un graphique à aire de la bibliothèque Recharts pour représenter l'évolution temporelle du score. Trois seuils horizontaux pointillés sont tracés à 30, 60 et 80, correspondant aux frontières entre les niveaux Faible, Modéré, Élevé et Critique.

**Figure 3.8 — Capture d'écran : graphique d'historique du SGR**

[📸 CAPTURE D'ÉCRAN : courbe en aire colorée sur fond blanc, axe des abscisses avec dates, axe des ordonnées de 0 à 100, trois lignes pointillées horizontales aux seuils 30/60/80, points de données visibles.]

**Pourquoi cette capture.** Elle constitue la preuve empirique principale en réponse à l'hypothèse H1 (la proactivité). Un score ponctuel de 55 peut correspondre à une situation stable ou à une dégradation en cours — seule la courbe permet d'en décider. Aucun diagramme UML ne peut remplacer cette capture, car l'argument est précisément que le système *fournit* cette information à l'équipe. **Lien avec le SGR :** sans historique, le SGR n'est qu'un indicateur rétrospectif. Avec historique, il devient un outil d'anticipation — c'est l'argument central du mémoire.

---

## 3.4 Intégration des sources de données externes

### 3.4.1 Intégration Codacy pour les métriques de qualité

La conception initiale prévoyait SonarQube comme source des métriques de qualité logicielle, via des webhooks sortants déclenchés après chaque analyse. Cette approche s'est révélée incompatible avec les contraintes budgétaires du projet : SonarCloud conditionne l'envoi de webhooks sortants à un abonnement payant. Nous avons retenu Codacy comme alternative, dont l'interface de programmation REST v3 est accessible sans frais sur les dépôts publics.

Le module `lib/codacy-api.ts` expose une fonction `fetchCodacyMetrics()` qui effectue deux requêtes parallèles vers l'interface Codacy : une requête sans filtre pour le nombre total de problèmes détectés, et une requête filtrée sur le niveau "Error" pour les bogues critiques.

**Figure 3.9 — Diagramme de séquence : récupération des métriques Codacy (UML 2.5)**

[📊 DIAGRAMME DE SÉQUENCE : acteurs `SGRWidget` → `getProjectSGR` (action serveur) → `CalculateSGRUseCase` → `CodacyClient` → API Codacy (deux requêtes parallèles `par`) → agrégation → `calculateSGR()` → retour. Cadre `opt [codacy.ok]` autour des appels Codacy pour montrer que le calcul se poursuit même en cas d'échec.]

**Pourquoi ce diagramme.** Il matérialise une décision architecturale clé : l'intégration Codacy est *optionnelle* et *non bloquante*. Si l'interface Codacy est indisponible ou renvoie une erreur, le SGR est tout de même calculé — R_Tech prend simplement la valeur zéro. **Lien avec le SGR :** cette résilience est conforme au principe de dégradation gracieuse énoncé en section 2.4. L'équipe continue à voir son score de risque même quand une source externe tombe, ce qui évite que le SGR devienne lui-même un point de fragilité.

Les données collectées sont transformées en objet `SGRTechDebt` selon les règles suivantes : les bogues bloquants correspondent aux problèmes de niveau "Error", les problèmes de qualité correspondent à la différence entre le total et les bogues bloquants, et la dette technique en jours est estimée à raison de 30 minutes par problème.

La résolution du point d'accès `/issues/search` a nécessité une correction en cours de développement. Le point d'accès `/repository-quality` initialement testé retournait une erreur 404 non documentée. L'incident a été résolu en consultant directement les collections Postman de l'interface Codacy v3, épisode documenté dans le journal réflexif.

### 3.4.2 Perspectives d'intégration GitHub

Le modèle SGR intègre un indicateur R_dev prévu pour être alimenté par des métriques d'activité GitHub : nombre de demandes de fusion ouvertes, délai moyen entre ouverture et intégration, proportion de demandes sans activité depuis plus de sept jours. L'interface `SGRGitHubActivity` et la fonction `calculerRDev()` sont implémentées dans le module de calcul et couvertes par les tests unitaires.

L'intégration effective avec l'interface de programmation GitHub REST n'a pas été réalisée dans le périmètre de ce projet. Lorsque l'objet `githubActivity` est absent, R_dev retourne un score nul, ce qui ne bloque pas le calcul du SGR. Cette architecture garantit que l'ajout de l'intégration GitHub dans une version future ne nécessitera aucune modification de la logique de calcul — seule l'Action serveur `getProjectSGR()` devra être enrichie d'un appel à un module dédié, sur le modèle du module Codacy existant. **Lien avec le SGR :** le score actuel repose donc sur quatre indicateurs effectifs plus un cinquième neutralisé, limitation assumée et documentée en section 4.3.

---

## 3.5 Fonctionnalités PWA

### 3.5.1 Service Worker et stratégies de cache

Le Service Worker est généré à partir du fichier `public/sw.js`, en utilisant la bibliothèque Workbox. Trois stratégies de cache sont configurées selon la nature des ressources.

**Figure 3.10 — Diagramme de composants : stratégies de cache par type de ressource**

[📊 DIAGRAMME DE COMPOSANTS : composant `Service Worker` au centre, trois ports de sortie étiquetés `NetworkFirst`, `CacheFirst`, `StaleWhileRevalidate` reliés respectivement à `Pages dynamiques (/project/*)`, `Assets statiques (CSS, JS, images)` et `Données semi-statiques (/api/project)`. Caches `runtime-cache` et `precache` représentés comme des composants persistants. Flèche entrante depuis `navigator` étiquetée `fetch event`.]

**Pourquoi ce diagramme.** Il rend explicite le routage des requêtes selon leur nature, qui est invisible à l'utilisateur mais détermine entièrement le comportement hors ligne. Sans cette visualisation, la description textuelle des trois stratégies reste abstraite. **Lien avec le SGR :** la page `/project/[id]` (qui contient le `SGRWidget`) est servie en NetworkFirst afin de toujours présenter le score le plus récent lorsque la connexion est disponible, tout en restant consultable hors ligne — condition nécessaire pour que le SGR soit réellement utilisable en mobilité (SQ2).

En complément, le module `lib/local-data-cache.ts` implémente un cache applicatif dans `localStorage` avec une durée de vie de 24 heures. Les données de projet sont sauvegardées dans ce cache lors de chaque chargement réussi, et relues en cas d'absence de connectivité.

### 3.5.2 Mode hors ligne et synchronisation

Lorsque le réseau est indisponible, les actions de l'utilisateur — notamment les changements de statut de tâches — ne peuvent pas être transmises au serveur. Nous avons implémenté une file d'attente persistante dans IndexedDB via le module `lib/offline-queue.ts`.

**Figure 3.11 — Diagramme de séquence : action offline et synchronisation différée (UML 2.5)**

[📊 DIAGRAMME DE SÉQUENCE : acteur `Utilisateur` → `KanbanBoard` → `useOfflineQueue` → (branche `alt`) soit `fetch()` si en ligne, soit `IndexedDB.put()` si hors ligne. Plus tard, événement `online` → `Background Sync` → lecture IndexedDB → rejoue les actions → message `SYNC_COMPLETE` vers `OfflineBanner` → mise à jour du compteur. Sur iOS, repli sur `navigator.onLine` documenté par une note.]

**Pourquoi ce diagramme.** Il prouve que les actions hors ligne ne sont pas perdues mais différées, et documente le mécanisme de reprise automatique. **Lien avec le SGR :** une équipe en déplacement qui termine des tâches hors connexion doit retrouver, au retour en ligne, un SGR recalculé intégrant ces nouvelles complétions. Sans file de synchronisation, les `completedAt` seraient perdus et le SGR serait biaisé.

**Figure 3.12 — Capture d'écran : bannière offline active**

[📸 CAPTURE D'ÉCRAN : bannière jaune en haut de l'interface — icône WiFi barré, texte « Offline mode — showing data from your last session », badge à droite avec compteur « 3 actions pending ».]

**Pourquoi cette capture.** Le diagramme de séquence prouve que le mécanisme fonctionne ; la capture prouve qu'il est *visible* pour l'utilisateur. La transparence sur l'état de synchronisation est essentielle : un utilisateur qui ignore que ses actions sont en file risque de les ressaisir ou de perdre confiance dans l'outil. **Lien avec le SGR :** cette rétroaction soutient la SQ2 (mobilité) en rendant l'état du système lisible même quand la connexion est instable.

### 3.5.3 Installation et notifications push

Le manifeste PWA déclare les métadonnées nécessaires à l'installation de l'application sur l'écran d'accueil d'un appareil : nom, icônes aux résolutions 192×192 et 512×512, couleur de thème, et mode d'affichage `standalone` qui supprime l'interface du navigateur lors du lancement.

Les notifications push sont implémentées via l'interface Web Push [18]. Lorsqu'un utilisateur autorise les notifications, son abonnement (endpoint, clés de chiffrement) est transmis au serveur et persisté dans la table `PushSubscription`. Une notification est déclenchée automatiquement lorsque le SGR d'un projet dépasse 60, correspondant au seuil d'entrée dans le niveau Élevé.

**Figure 3.13 — Diagramme de séquence : déclenchement d'une notification push sur franchissement de seuil**

[📊 DIAGRAMME DE SÉQUENCE : `CalculateSGRUseCase` → calcule score → compare avec score précédent (`SGRHistory`) → si franchissement du seuil 60 vers le haut → `PushNotificationService.notifyProjectMembers()` → itère sur `PushSubscription` → envoi Web Push → navigateur utilisateur → notification système. Traitement des expirations HTTP 410 illustré par une note.]

**Pourquoi ce diagramme.** Il matérialise le caractère *proactif* du système : aucune action humaine ne déclenche la notification, c'est le franchissement d'un seuil calculé qui la provoque. C'est le cœur de l'argument de proactivité. **Lien avec le SGR :** c'est ici que le score cesse d'être une information passive affichée dans un widget et devient une alerte poussée vers les membres de l'équipe — réponse directe à la problématique de détection tardive des risques exposée au chapitre 1.

---

## 3.6 Interface utilisateur et tableaux de bord

### 3.6.1 Tableau Kanban

Le tableau Kanban est organisé en trois colonnes : "To Do", "In Progress" et "Done". Le déplacement des cartes entre colonnes est réalisé via les attributs HTML5 natifs `draggable`, `onDragStart`, `onDragOver` et `onDrop`, sans bibliothèque externe — choix qui garantit la compatibilité avec les navigateurs mobiles, y compris en mode hors ligne.

L'en-tête de chaque colonne affiche un badge indiquant le nombre de tâches en cours par rapport à la limite configurée. Lorsque la limite est dépassée, le badge passe au rouge — premier niveau d'alerte visuelle, déclenché avant même le recalcul du SGR.

**Figure 3.14 — Diagramme de séquence : déplacement d'une tâche et recalcul du SGR (UML 2.5)**

[📊 DIAGRAMME DE SÉQUENCE — participants : `Utilisateur`, `KanbanBoard` (Client), `updateTaskStatus` (Server Action), `UpdateTaskStatusUseCase`, `PrismaTaskRepository`, `SGRWidget` (Client), `getProjectSGR` (Server Action), `CalculateSGRUseCase`, `PrismaColumnWIPConfigRepository`, `SGRHistoryRepository`.

Flux :
1. `Utilisateur → KanbanBoard` : drag → drop sur colonne cible (ex. To Do → In Progress)
2. `KanbanBoard → KanbanBoard` : `applyOptimisticMove()` — déplacement visuel immédiat sans attendre le serveur
3. `KanbanBoard → updateTaskStatus` : `(taskId, newStatus)`
4. `updateTaskStatus → UpdateTaskStatusUseCase` : `execute(taskId, newStatus)`
5. `UpdateTaskStatusUseCase → PrismaTaskRepository` : `updateStatus()` — note sur la flèche : *startedAt := now() si → IN_PROGRESS ; completedAt := now() si → DONE*
6. `PrismaTaskRepository → UpdateTaskStatusUseCase` : ok
7. `UpdateTaskStatusUseCase → updateTaskStatus` : ok
8. `updateTaskStatus → KanbanBoard` : ok
9. `KanbanBoard → KanbanBoard` : `onTaskMoved()` → `fetchInfos(projectId)` → `setSgrRefreshKey(k+1)`
10. Cadre `ref` déclenché par `sgrRefreshKey` : `SGRWidget → getProjectSGR` : `(projectId)`
11. `getProjectSGR → CalculateSGRUseCase` : `execute(projectId)`
12. `CalculateSGRUseCase → PrismaTaskRepository` : `findByProject()` — récupère toutes les tâches avec statut courant
13. `CalculateSGRUseCase → PrismaColumnWIPConfigRepository` : `findByProject()` — récupère les limites WIP par colonne
14. Note sur les deux flèches retour : *R_WIP = max(0, (nbTâches_IN_PROGRESS − limiteWIP) / limiteWIP) × 100*
15. `CalculateSGRUseCase → CalculateSGRUseCase` : `calculateSGR(tasks, wipConfigs)` — calcule SGR avec nouveau R_WIP
16. `CalculateSGRUseCase → SGRHistoryRepository` : `persist(score, niveau)` — horodaté, conservé pour l'historique
17. `CalculateSGRUseCase → getProjectSGR` : `SGRResult`
18. `getProjectSGR → SGRWidget` : nouveau score affiché — jauge et barres indicateurs mises à jour

Cadre `alt` en bas à gauche du diagramme : *si tâche déplacée vers IN_PROGRESS et nbTâches > limiteWIP → R_WIP ↑ → SGR ↑ ; si tâche déplacée hors de IN_PROGRESS → R_WIP ↓ → SGR ↓*.]

**Pourquoi ce diagramme.** La capture d'écran ci-dessous prouve que le badge WIP passe au rouge ; ce diagramme prouve *pourquoi* le score SGR change en conséquence. Le lien entre un geste utilisateur (déplacer une carte) et la variation du score de risque global est entièrement invisible dans l'interface — c'est précisément ce que ce diagramme rend lisible. **Lien avec le SGR :** il matérialise la boucle de rétroaction complète : action utilisateur → persistance de l'horodatage → recalcul R_WIP → mise à jour du SGR → rétroaction visuelle. C'est cette boucle qui confère au système son caractère proactif : l'équipe n'attend pas un rapport périodique, elle voit le score évoluer à chaque décision de flux.

**Figure 3.15 — Capture d'écran : tableau Kanban avec dépassement WIP**

[📸 CAPTURE D'ÉCRAN : trois colonnes, cartes avec badges de priorité, badge WIP rouge sur la colonne « In Progress » en dépassement (ex. 5/3), modale de clôture ouverte avec éditeur de texte et zone d'envoi de fichiers.]

**Pourquoi cette capture.** Elle démontre la rétroaction locale au niveau de la colonne : le dépassement est visible *avant même* que le SGRWidget affiche le nouveau score. **Lien avec le SGR :** l'indicateur R_WIP représente 30 % du score global. Le badge rouge est le signal de premier niveau ; le score SGR recalculé est le signal agrégé de second niveau — les deux opèrent en complémentarité sur des temporalités différentes.

### 3.6.2 Vue d'ensemble et calendrier

La vue d'ensemble d'un projet centralise les informations analytiques sur une page unique : membres de l'équipe à gauche, `WIPConfigWidget` et `SGRWidget` à droite. La vue calendrier présente une grille mensuelle dans laquelle chaque tâche est positionnée à sa date d'échéance, avec étiquettes colorées selon statut et priorité.

**Figure 3.16 — Capture d'écran : vue calendrier mensuelle**

[📸 CAPTURE D'ÉCRAN : grille mensuelle avec tâches positionnées sur leurs dates d'échéance, étiquettes colorées (rouge priorité haute, jaune en cours, vert terminées), navigation entre mois, filtres statut/priorité/assignation.]

**Pourquoi cette capture.** La vue calendrier est une vue complémentaire du Kanban qui rend visible la dimension *temporelle* des engagements. **Lien avec le SGR :** une concentration visible de tâches à haute priorité sur une même semaine est un signal avant-coureur d'un pic de R_Age à venir — l'utilisateur anticipe visuellement ce que l'algorithme mesurera a posteriori.

### 3.6.3 Tableau de bord analytique transversal

Le `SGRWidget` restitue le score de risque d'un projet à un instant donné. Cette granularité est suffisante pour l'action corrective immédiate mais insuffisante pour le pilotage stratégique : un chef de projet responsable de plusieurs équipes a besoin de comparer simultanément l'état de risque de chacune et d'observer les tendances agrégées dans le temps. Le tableau de bord Analytics répond à ce besoin en consolidant, sur une page unique, l'ensemble des données de tous les projets auxquels l'utilisateur est rattaché.

Le cas d'usage `GetAnalyticsDataUseCase` est l'orchestrateur de cette agrégation. Il récupère, pour un utilisateur donné, l'ensemble des projets associés, leurs tâches et leur historique SGR, puis calcule huit séries de données distinctes regroupées en deux blocs fonctionnels.

Le premier bloc, intitulé "Tasks Overview", centralise quatre indicateurs de flux agrégés. La répartition par statut (To Do / In Progress / Done) et par priorité (Low / Medium / High) donnent une photographie instantanée de la charge globale. Le composant `ThroughputChart` présente le nombre de tâches terminées par semaine ISO sur les douze dernières semaines sous la forme d'un graphique composé : une aire bleue représente le débit brut, une ligne rouge pointillée superposée matérialise la tendance calculée par régression linéaire (moindres carrés). L'en-tête affiche la moyenne hebdomadaire des quatre dernières semaines et la variation en pourcentage par rapport aux quatre semaines précédentes, offrant ainsi un signal immédiat de progression ou de régression du flux. Le taux de complétion par projet, exprimé en pourcentage de tâches "Done" sur le total, permet d'identifier immédiatement les projets à l'arrêt.

Le second bloc, intitulé "Risk Score (SGR)", articule trois vues complémentaires. Le composant `CycleTimeChart`, affiché en pleine largeur, est un nuage de points représentant le Cycle Time de chaque tâche terminée (axe des ordonnées, en jours) en fonction de sa date de livraison (axe des abscisses). Une ligne pointillée violette trace le Niveau d'Engagement de Service (SLE) au 85e centile, calculé sur les trente derniers jours : 85 % des tâches terminées durant cette période l'ont été en un nombre de jours inférieur ou égal à ce seuil. L'en-tête affiche la valeur courante du SLE en jours et la variation par rapport à la période précédente de trente jours — une hausse étant signalée en rouge, une baisse en vert, car une dégradation du SLE tr aduit un allongement des délais de livraison. La distribution des niveaux de risque SGR (Faible / Modéré / Élevé / Critique) et le tableau des derniers scores par projet complètent ce bloc.

**Figure 3.19 — Capture d'écran : tableau de bord Analytics — Bloc 1 (Tasks Overview)**

[📸 CAPTURE D'ÉCRAN : quatre cartes Recharts disposées en grille 2×2 — en haut à gauche un graphique circulaire de répartition par statut (To Do / In Progress / Done), en haut à droite un graphique à barres par priorité (Low / Medium / High), en bas à gauche le composant `ThroughputChart` : aire bleue du débit hebdomadaire sur 12 semaines (labels W07–W18) surmontée d'une ligne rouge pointillée de tendance, en-tête "4 items completed / week" avec variation "+0 %", légende "Completed items / Trend" ; en bas à droite un graphique à barres horizontales de taux de complétion par projet avec pourcentages.]

**Pourquoi cette capture.** Elle prouve que les métriques de flux utilisées par l'algorithme SGR sont exposées à l'utilisateur sous une forme lisible et enrichie — non comme des chiffres bruts, mais avec leur tendance. La ligne de régression linéaire permet à l'équipe de distinguer une semaine creuse ponctuelle d'une baisse structurelle du débit, ce que le score R_Throughput seul ne restitue pas. **Lien avec le SGR :** le `ThroughputChart` partage la même fenêtre de douze semaines que l'indicateur R_Throughput, permettant à l'équipe de corréler visuellement la tendance du débit avec l'évolution du score — condition nécessaire pour qu'une alerte SGR déclenche une action corrective et non une simple curiosité.

**Figure 3.20 — Capture d'écran : tableau de bord Analytics — Bloc 2 (Risk Score SGR)**

[📸 CAPTURE D'ÉCRAN : en haut sur toute la largeur, `CycleTimeChart` — nuage de points bleus représentant chaque tâche terminée (axe X : date de livraison formatée "5 Jun", "12 Jun", etc. ; axe Y : Cycle Time en jours suffixé "d"), ligne pointillée violette au 85e centile avec label "85th percentile", en-tête "8 d — 85% of items are done in 8 days or less" avec variation en rouge ou vert ; en bas à gauche, `SGRLevelDistribution` — graphique circulaire avec les quatre niveaux colorés et leurs pourcentages ; en bas à droite, `SGRScoreTable` — tableau à trois colonnes (Projet, Score, Niveau) avec badge coloré sur la colonne Niveau.]

**Pourquoi cette capture.** Elle rend visible la distribution réelle des délais de livraison, que le score SGR agrège mais n'expose pas individuellement. La ligne SLE au 85e centile est l'engagement de service que l'équipe peut communiquer aux parties prenantes : "85 % de nos tâches sont livrées en X jours ou moins". Un glissement de cette ligne vers le haut sur plusieurs périodes est un signal d'alerte fiable, antérieur à toute dégradation visible sur le Kanban. **Lien avec le SGR :** le SLE est la grandeur de référence de l'indicateur R_Age — toute tâche en cours dont l'âge dépasse le SLE courant est comptabilisée comme en retard et contribue directement à la hausse du score global.

Sur le plan architectural, les six composants Recharts sont chargés dynamiquement (`next/dynamic` avec `ssr: false`) depuis le composant client enveloppe `AnalyticsClient`. Ce choix est imposé par une contrainte de Next.js 16 : les composants Recharts font appel à des interfaces du navigateur (`window`, `ResizeObserver`) incompatibles avec le rendu serveur. L'agrégation des données est réalisée côté serveur par `GetAnalyticsDataUseCase`, appelé depuis l'Action serveur `getAnalyticsData()`, avant transmission au composant client. Cette séparation respecte le principe de responsabilité unique : le serveur agrège, le client visualise.

---

## 3.7 Tests et validation technique

### 3.7.1 Tests unitaires du module SGR

Les tests unitaires du module SGR sont organisés dans deux fichiers : `__tests__/calculateSGR.test.ts` pour les fonctions de calcul, et `__tests__/CalculateSGRUseCase.test.ts` pour l'orchestrateur. Nous avons atteint une couverture de 93,7 % sur le module `lib/risk-algorithm/calculateSGR.ts`, avec 30 tests tous passants.

Les cas de test couvrent les scénarios normaux, les cas limites (historique vide, aucune limite WIP configurée, tâches sans `startedAt`) et les cas extrêmes (Cycle Time négatif, débit nul, score dépassant 100 avant bornage). Chaque indicateur est testé indépendamment, ce qui a permis d'identifier et de corriger plusieurs comportements inattendus lors du développement — notamment le retour d'`Infinity` pour le SLE lorsque l'historique de Cycle Times est insuffisant.

**Tableau 3.3 — Résultats des tests unitaires**

| Fichier de test | Nombre de tests | Résultat | Couverture |
|---|---|---|---|
| `calculateSGR.test.ts` | 21 | Tous passants | 93,7 % |
| `CalculateSGRUseCase.test.ts` | 9 | Tous passants | — |
| **Total** | **30** | **Tous passants** | — |

**Figure 3.17 — Capture d'écran : rapport de couverture Jest**

[📸 CAPTURE D'ÉCRAN : sortie console `npm run test:coverage` montrant le tableau de couverture, avec la ligne `calculateSGR.ts` surlignée à 93,7 %, et les 30 tests marqués `PASS`.]

**Pourquoi cette capture.** La couverture annoncée dans le tableau 3.3 est une affirmation ; la sortie de l'outil Jest en est la preuve vérifiable. **Lien avec le SGR :** c'est le chiffre le plus exigeant à défendre en soutenance — il fonde la confiance que les scores restitués par l'application sont arithmétiquement corrects.

### 3.7.2 Tests de bout en bout avec Playwright

Les tests Playwright couvrent seize scénarios répartis en trois fichiers. Le fichier `e2e/offline.spec.ts` valide le comportement de la page `/offline` : affichage correct du message, présence du bouton de rechargement. Le fichier `e2e/pwa.spec.ts` vérifie la configuration PWA : présence et validité du manifeste, balises meta de couleur de thème. Le fichier `e2e/navigation.spec.ts` teste la navigation publique.

Les seize tests sont tous passants sur le navigateur Chromium. Ces tests nécessitent que le serveur de développement soit en cours d'exécution préalablement à leur exécution, car Playwright ne démarre pas automatiquement le serveur en environnement local — comportement documenté dans le journal de bord suite à un incident de configuration.

### 3.7.3 Performances et accessibilité

L'application a été évaluée avec l'outil Lighthouse de Google Chrome sur la version déployée (https://taskmanage-mu.vercel.app).

**Figure 3.18 — Capture d'écran : rapport Lighthouse en production**

[📸 CAPTURE D'ÉCRAN : rapport Lighthouse — scores de Performance, Accessibilité, Bonnes pratiques, SEO et PWA. Encadré PWA explicitement vert (installable, service worker enregistré, manifest valide).]

**Pourquoi cette capture.** Elle apporte une mesure *externe* et reproductible, produite par un outil standard de l'industrie, sur le domaine public de production. Elle ferme la boucle de validation ouverte par les tests unitaires (correction interne) et E2E (parcours utilisateur). **Lien avec le SGR :** un outil d'aide à la décision ne peut jouer son rôle que s'il est effectivement accessible et rapide. Un score Lighthouse faible signifierait que l'utilisateur abandonne avant même d'avoir consulté son SGR.

La mise en cache des ressources statiques par le Service Worker contribue directement au score de performance en réduisant le temps de chargement à partir de la deuxième visite. L'utilisation de Tailwind CSS, qui ne génère que les classes effectivement utilisées, maintient le poids du fichier CSS à un niveau minimal.

---

> **Récapitulatif des visuels de ce chapitre (11 diagrammes UML + 10 captures d'écran)**
>
> **Diagrammes UML**
> 1. Fig. 3.1 — Déploiement dev/prod (§3.1)
> 2. Fig. 3.2 — Arborescence du projet (§3.2)
> 3. Fig. 3.3 — Composants Clean Architecture (§3.2)
> 4. Fig. 3.4 — Classes du domaine (§3.3.1)
> 5. Fig. 3.5 — États de la tâche (§3.3.1)
> 6. Fig. 3.6 — Activité pipeline SGR (§3.3.2)
> 7. Fig. 3.9 — Séquence Codacy (§3.4.1)
> 8. Fig. 3.10 — Composants stratégies de cache (§3.5.1)
> 9. Fig. 3.11 — Séquence offline/sync (§3.5.2)
> 10. Fig. 3.13 — Séquence push sur seuil SGR (§3.5.3)
> 11. Fig. 3.14 — Séquence drag-drop → recalcul SGR / R_WIP (§3.6.1)
>
> **Captures d'écran (chacune associée à une preuve unique)**
> 1. Fig. 3.7 — SGRWidget (preuve : restitution lisible du score) (§3.3.2)
> 2. Fig. 3.8 — Graphique SGRHistoryChart (preuve : proactivité H1) (§3.3.3)
> 3. Fig. 3.12 — OfflineBanner actif (preuve : transparence offline) (§3.5.2)
> 4. Fig. 3.15 — Kanban + badge WIP rouge (preuve : rétroaction WIP locale) (§3.6.1)
> 5. Fig. 3.16 — Vue calendrier (preuve : anticipation temporelle) (§3.6.2)
> 6. Fig. 3.19 — Analytics Bloc 1 — vue tâches (preuve : données brutes accessibles) (§3.6.3)
> 7. Fig. 3.20 — Analytics Bloc 2 — SGR croisé (preuve : proactivité à l'échelle portefeuille) (§3.6.3)
> 8. Fig. 3.17 — Couverture Jest 93,7 % (preuve : correction interne) (§3.7.1)
> 9. Fig. 3.18 — Rapport Lighthouse (preuve : accessibilité externe) (§3.7.3)
