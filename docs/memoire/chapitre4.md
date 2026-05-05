# Chapitre 4 — Évaluation du système et discussion

---

## 4.1. Objectifs de l'évaluation

L'évaluation d'un système logiciel se justifie différemment selon que l'on cherche à
mesurer sa conformité technique, son adéquation fonctionnelle ou sa valeur scientifique.
Dans le cadre de ce mémoire, l'évaluation poursuit trois objectifs distincts mais
complémentaires, qui correspondent chacun à un niveau d'argumentation différent
vis-à-vis de la problématique centrale.

Le premier objectif est de nature **technique** : vérifier que le système fonctionne
conformément aux exigences formulées au chapitre 1. Cela recouvre la correction
algorithmique du module SGR, la fiabilité de l'interface Kanban, la robustesse de
l'architecture PWA en conditions dégradées (mode hors ligne), et la conformité aux
standards de qualité web mesurés par l'outil Lighthouse. Ces vérifications passent par
une stratégie de tests à trois niveaux — unitaires, intégration, et bout en bout —
détaillée à la section 4.2.

Le deuxième objectif est **méthodologique** : évaluer si l'algorithme SGR produit des
scores cohérents avec la réalité perçue du risque projet. Cette évaluation ne peut pas
être conduite en laboratoire sur des données synthétiques, car elle exige une
confrontation avec un contexte de développement réel. Le protocole retenu — qualifier
le projet *TaskManage* lui-même comme terrain d'étude — est présenté à la section 4.2
et discuté à la section 4.3.

Le troisième objectif est **réflexif** : documenter les écarts entre les décisions
de conception initiales et les ajustements opérés au fil du développement. Ce journal
de bord, dont la section 4.6 analyse la contribution, constitue à la fois un outil de
pilotage du projet et une source de données qualitatives sur la viabilité de l'approche.
Ensemble, ces trois objectifs permettent de formuler une réponse argumentée à la
problématique centrale : *dans quelle mesure une PWA intégrant nativement un module de
détection proactive des risques constitue-t-elle une réponse viable aux limites des
outils de gestion Agile existants ?*

---

## 4.2. Protocole de test et scénario d'étude

### 4.2.1 Stratégie de test à trois niveaux

La stratégie de validation repose sur la pyramide de tests classique, adaptée aux
contraintes d'un projet mené par un développeur unique dans un contexte académique.
Chaque niveau répond à une question précise et s'appuie sur des outils différents.

```
                    ┌────────────────────┐
                    │   Tests E2E (E2E)  │  16 tests Playwright
                    │   (Playwright)     │  Scénarios utilisateur
                    └────────┬───────────┘
                             │
               ┌─────────────┴─────────────┐
               │   Tests d'intégration      │  Inclus dans Jest
               │   (use-cases + Server      │  (flux SGR complet)
               │    Actions)                │
               └─────────────┬─────────────┘
                             │
         ┌───────────────────┴───────────────────┐
         │         Tests unitaires (Jest)         │
         │  30 tests — 93,7 % couverture module   │
         │  SGR (calculateSGR.ts)                 │
         └───────────────────────────────────────┘
```
*Figure 4.1 — Pyramide de tests du projet TaskManage*

**Tests unitaires avec Jest.** Trente tests unitaires ont été écrits pour les
fonctions du module SGR (`lib/risk-algorithm/calculateSGR.ts`) et les use-cases
applicatifs. La couverture de code atteint 93,7 % sur le module algorithmique, ce
qui dépasse l'objectif initial de 70 % fixé dans les exigences non fonctionnelles
(section 1.4). Chaque indicateur — R_WIP, R_CT, R_Age, R_Throughput, R_Tech — est
testé de manière indépendante, ce qui est rendu possible par le découplage des
fonctions pures du reste de l'application. Cette isolation est une conséquence directe
du choix de la Clean Architecture : la logique métier ne dépend d'aucun framework, et
peut donc être testée sans environnement d'exécution particulier.

**Tests bout en bout avec Playwright.** Seize tests E2E automatisés couvrent les
scénarios utilisateur critiques, organisés en trois fichiers : `e2e/offline.spec.ts`
(6 tests sur la page de repli hors ligne), `e2e/pwa.spec.ts` (6 tests sur la
configuration PWA — manifest, Service Worker, installabilité) et
`e2e/navigation.spec.ts` (4 tests sur la navigation publique). Ces tests s'exécutent
sur un navigateur Chromium réel via Playwright, ce qui valide le comportement du
système dans des conditions proches de la production.

### 4.2.2 Scénario d'étude : le dog-fooding comme protocole d'évaluation

Pour évaluer la pertinence du module SGR sur des données réelles, une approche
de *dog-fooding* — terme désignant l'utilisation d'un produit par ses propres
concepteurs — a été adoptée : le projet *TaskManage* a été géré dans l'application
*TaskManage* elle-même durant la phase de développement. Un projet intitulé
"TaskManage — Sprint Final" a été créé avec les colonnes Kanban `TODO`,
`IN_PROGRESS` et `DONE`, et les tâches correspondant aux développements réels ont
été déplacées au fil des sessions de travail.

Ce protocole présente deux avantages académiques. D'abord, il garantit que les données
d'entrée du SGR sont authentiques : elles résultent d'un processus de développement
réel, avec ses délais, ses blocages et ses accélérations. Ensuite, il permet de
comparer le score SGR produit par l'algorithme avec la perception subjective du risque
ressentie par le développeur au même moment, fournissant ainsi une base qualitative
pour évaluer la cohérence du modèle.

La limite principale de ce protocole est son caractère autoréférentiel : le même
individu produit les données et interprète les résultats, ce qui expose à un biais
de confirmation. Cette limite est discutée à la section 4.7.

---

## 4.3. Données utilisées pour l'évaluation

Les données d'entrée du système SGR sont extraites directement du projet de
dog-fooding. Elles couvrent l'ensemble du sprint final (semaine du 31 mars au
6 avril 2026) et sont structurées selon les cinq indicateurs de l'algorithme.

### 4.3.1 État du Kanban en début de sprint

```
┌──────────────────────┬─────────────────────┬──────────────────────┐
│       TODO           │    IN_PROGRESS       │        DONE          │
│   (WIP illimité)     │   (WIP limite : 3)   │   (WIP illimité)     │
├──────────────────────┼─────────────────────┼──────────────────────┤
│ Déploiement Vercel   │ Migration Neon DB    │ Algorithme SGR       │
│ Tests Playwright     │ Kanban mobile fix    │ Tests Jest (30)      │
│ Rédaction mémoire    │                     │ PWA Background Sync  │
│ Diagrammes UML       │                     │ Graphique SGR        │
└──────────────────────┴─────────────────────┴──────────────────────┘
  4 tâches en attente   2 tâches actives       4 tâches terminées
```
*Figure 4.2 — État du tableau Kanban au début du sprint final (31 mars 2026)*

### 4.3.2 Tableau des métriques SGR collectées

| Indicateur | Valeur mesurée | Valeur de référence | Score R_i normalisé |
|------------|---------------|---------------------|---------------------|
| R_WIP | 2 tâches IN_PROGRESS / limite 3 | Limite WIP : 3 | **0** (sous la limite) |
| R_CT | Cycle Time moyen : 2,3 jours | Historique : 1,8 jours | **28** (+28% vs historique) |
| R_Age | 1 tâche sur 2 > SLE 85e percentile | SLE_85 : 3 jours | **50** (50% des tâches en retard) |
| R_Throughput | 2 tâches/semaine | Moyenne 90j : 3 tâches/semaine | **33** (baisse de 33%) |
| R_Tech | 0 bug critique, dette estimée 0,5j | Seuil : 5 bugs ou 5j | **5** (dette faible) |

*Tableau 4.1 — Métriques d'entrée du SGR lors du sprint final*

Ces données ont été produites automatiquement par le système lors du calcul SGR déclenché
depuis l'interface `SGRWidget`. Les horodatages `startedAt` et `completedAt` des tâches
sont enregistrés dans la base de données Neon PostgreSQL à chaque transition de colonne
via le use-case `UpdateTaskStatusUseCase`.

---

## 4.4. Résultats du calcul du SGR

### 4.4.1 Application de la formule

L'algorithme SGR applique la formule pondérée suivante aux cinq indicateurs normalisés :

```
SGR = 0,30 × R_WIP + 0,25 × R_CT + 0,20 × R_Age + 0,15 × R_Throughput + 0,10 × R_Tech

SGR = 0,30 × 0  +  0,25 × 28  +  0,20 × 50  +  0,15 × 33  +  0,10 × 5

SGR = 0  +  7,0  +  10,0  +  4,95  +  0,5

SGR ≈ 22,5  →  Niveau : 🟢 FAIBLE
```

### 4.4.2 Évolution du SGR sur la période d'évaluation

L'historique des calculs SGR, rendu accessible via le composant `SGRHistoryChart`
(graphique en courbes Recharts), permet d'observer l'évolution du score au fil du
développement. Les données collectées lors du sprint final montrent la progression
suivante :

```
 SGR
 100 │
  80 │
  60 │                    ╭─╮
  40 │               ╭────╯ ╰──╮
  20 │    ╭──────────╯          ╰───────────╮
   0 │────╯                                 ╰──── (fin sprint)
     └────────────────────────────────────────────▶ temps
          Début      Migration    Mobile fix   Déploiement
          sprint     Neon         Kanban       Vercel ✅
          (WIP OK)   (R_Age↑)     (R_CT↑)      (SGR→22)

  ████ SGR > 60 (Élevé)    ████ SGR 31–60 (Modéré)    ░░░░ SGR 0–30 (Faible)
```
*Figure 4.3 — Évolution schématique du score SGR lors du sprint final*

Le pic observé autour de la migration de la base de données (31 mars 2026) correspond
à un moment où plusieurs tâches étaient simultanément en cours : la migration
SQLite → PostgreSQL Neon, la correction du drag-and-drop mobile, et la préparation
du déploiement Vercel. Ce cumul de travaux en parallèle a fait monter R_Age (proportion
de tâches dépassant le SLE) et R_CT (allongement du cycle time moyen), conduisant à
un SGR de l'ordre de 45 — niveau modéré, cohérent avec la tension ressentie à ce
moment du développement.

### 4.4.3 Niveaux d'alerte et seuils

```
  Niveau    │ Plage SGR │ Signal visuel │ Action recommandée
  ──────────┼───────────┼───────────────┼─────────────────────────────────
  🟢 Faible  │   0 – 30  │ Jauge verte   │ Continuer normalement
  🟡 Modéré  │  31 – 60  │ Jauge jaune   │ Rétrospective, surveillance accrue
  🟠 Élevé   │  61 – 80  │ Jauge orange  │ Action immédiate, contre-mesure
  🔴 Critique │  81 – 100 │ Jauge rouge   │ Arrêt, plan de remédiation urgent
```
*Figure 4.4 — Grille d'interprétation du Score Global de Risque*

---

## 4.5. Analyse des alertes et interprétation

### 4.5.1 Cohérence entre score et perception

L'un des critères implicites d'évaluation d'un modèle de scoring est sa capacité à
produire des scores que les praticiens jugent cohérents avec leur expérience du terrain.
En confrontant les scores SGR calculés automatiquement avec les notes du journal de bord
réflexif rédigées simultanément, il est possible d'évaluer cette cohérence de manière
qualitative.

La correspondance est globalement satisfaisante. Lors des deux sessions les plus
tendues du sprint final — la migration Neon et le déploiement Vercel — les scores
calculés atteignaient respectivement 45 et 38 (niveau modéré), tandis que les entrées
du journal décrivaient explicitement une "tension sur le planning" et un "risque de
déploiement non résolu". À l'inverse, une fois le déploiement confirmé réussi et
les tâches en cours réduites à deux, le score est redescendu à 22 (niveau faible),
ce qui correspondait à un sentiment de maîtrise retrouvée.

### 4.5.2 Comportement de chaque indicateur

L'analyse détaillée de la contribution de chaque indicateur révèle des comportements
attendus et quelques cas limites intéressants.

**R_WIP (30% du score)** s'est maintenu à zéro pendant l'essentiel du sprint, le
nombre de tâches en cours n'ayant jamais dépassé la limite configurée de trois. Cela
reflète une discipline Kanban respectée, mais soulève également une question : si
l'indicateur le plus pondéré est toujours nul, son influence sur le SGR global est
nulle, ce qui peut sembler contre-intuitif. Ce cas illustre l'importance de calibrer
les limites WIP de manière réaliste — une limite trop généreuse neutralise la
sensibilité du premier indicateur.

**R_Age (20%)** a été le contributeur le plus significatif lors des pics de risque.
La tâche "Migration SQLite → PostgreSQL Neon" est restée plusieurs jours en colonne
`IN_PROGRESS` sans progresser, son age dépassant le SLE au 85e percentile. L'indicateur
a correctement capté ce blocage, confirmant l'intérêt de surveiller l'âge des tâches
en cours plutôt que leur seul statut [Vacanti, 2015].

**R_CT (25%)** a réagi avec un léger décalage temporel par rapport aux événements réels,
ce qui est structurellement attendu : le Cycle Time est une métrique *a posteriori*,
calculée sur les tâches terminées. Un blocage en cours de sprint n'apparaît dans R_CT
que lorsque les tâches bloquées finissent par être fermées avec un temps de cycle
allongé. Ce décalage inhérent constitue une limite du modèle, discutée à la section 4.7.

**R_Throughput (15%)** a capté la baisse de débit observée lors de la semaine de
migration, où seules deux tâches ont été terminées contre une moyenne historique de
trois. L'indicateur a contribué modérément au SGR (+4,95 points), ce qui paraît
proportionné.

**R_Tech (10%)** est resté quasi nul tout au long de l'évaluation. En l'absence
d'intégration active avec un outil d'analyse statique du code (SonarQube ou Codacy),
cet indicateur est alimenté par des valeurs par défaut. Sa contribution au SGR est
donc plus symbolique que mesurée dans le contexte de ce projet. La section 4.8
évoque des pistes pour renforcer cet indicateur dans de futures itérations.

---

## 4.6. Apport du journal de bord réflexif

### 4.6.1 La démarche réflexive comme outil de pilotage

Le journal de bord réflexif, nourri de cinq entrées structurées entre mars et
avril 2026, n'a pas été conçu comme un simple compte-rendu d'activité. Sa structure —
déclencheur, contexte technique, décision prise, impact observé, leçon pour le mémoire
— l'apparente à une forme de *post-mortem* itératif, pratiqué après chaque événement
significatif plutôt qu'en fin de projet. Cette granularité permet de conserver la
mémoire des alternatives rejetées et des motivations qui ont guidé chaque choix,
informations qui disparaissent habituellement des commits git ou des tickets de
backlog.

| # | Entrée | Date | Type | Enseignement principal |
|---|--------|------|------|------------------------|
| 1 | Clean Architecture | début | Décision | Isolation SGR impose des interfaces abstraites |
| 2 | Incident Prisma client custom | 2026-03-10 | Incident | Tension Clean Architecture / contraintes ORM |
| 3 | Background Sync + IndexedDB | 2026-03-28 | Feature+Incident | Fragmentation support SW — fallback nécessaire |
| 4 | Migration Neon + déploiement Vercel | 2026-03-31 | Feature+Deploy | Risque infra éliminé ; dog-fooding validé |
| 5 | Optimisations Lighthouse | 2026-04-04 | Rétrospective | Server Components réduit TBT ; SSR améliore FCP |

*Tableau 4.2 — Synthèse des entrées du journal de bord réflexif*

### 4.6.2 Incidents documentés et leur résolution

Deux incidents techniques méritent une attention particulière pour leur portée
analytique. Le premier concerne la divergence entre le client Prisma généré
(chemin custom `./prisma/generated/prisma/`) et le client standard `@prisma/client`.
Cette divergence TypeScript, détectée lors de l'implémentation du use-case SGR,
a nécessité l'introduction d'un cast `as unknown as GeneratedPrismaClient` à la
frontière entre les couches infrastructure et application. Ce contournement introduit
une dette technique mineure mais révèle une tension réelle entre les ambitions de
la Clean Architecture — qui suppose des interfaces abstraites indépendantes des
frameworks — et les contraintes pratiques des ORM modernes dont les types sont
intrinsèquement liés à leur client généré.

Le second incident concerne la désactivation involontaire du Service Worker en
environnement de développement, causée par la convention `disable: NODE_ENV ===
"development"` recommandée par la bibliothèque `@ducanh2912/next-pwa`. Cette
décision, documentée dans l'entrée \#3 du journal, a conduit à une période de
confusion lors des tests E2E : les tests Playwright ne trouvaient pas le Service
Worker enregistré. La résolution a consisté à ne lancer les tests PWA que sur un
build de production, ce qui est désormais explicitement documenté dans la procédure
de test.

### 4.6.3 Valeur académique de la démarche réflexive

D'un point de vue méthodologique, le journal de bord s'inscrit dans la tradition de
la recherche-action (*action research*) telle que décrite par Kemmis et McTaggart
[2000] : le chercheur est simultanément acteur et observateur du système qu'il étudie,
et documente ses observations au fil de l'action plutôt qu'a posteriori. Cette
posture permet de limiter le biais de reconstruction rétrospective, où l'on tend à
rationaliser a posteriori des décisions prises sous contrainte. Les cinq entrées du
journal, rédigées immédiatement après chaque événement, constituent ainsi un témoignage
plus fidèle du processus réel de développement que ne l'aurait été un simple rapport
final.

---

## 4.7. Discussion des limites du modèle

L'honnêteté intellectuelle commande de soumettre le modèle SGR à une critique rigoureuse.
Trois catégories de limites ont été identifiées : les limites algorithmiques, les limites
méthodologiques, et les limites inhérentes à l'architecture PWA.

### 4.7.1 Limites algorithmiques

**Pondérations non validées empiriquement.** Les coefficients de l'algorithme SGR
(0,30, 0,25, 0,20, 0,15, 0,10) ont été établis à partir d'une analyse de la littérature
sur le Lean Software Development [Anderson, 2010] et le Kanban Guide 2025. Ils
reflètent une hypothèse raisonnée : le WIP est l'indicateur le plus influent car il
constitue la variable de contrôle centrale de la méthode Kanban (Loi de Little) ;
le Cycle Time vient en second car il mesure la valeur délivrée au client. Cette
hiérarchisation est défendable, mais elle n'a pas été soumise à une validation
empirique sur un corpus d'équipes réelles. En l'absence d'une telle validation,
les pondérations constituent une proposition méthodologique plutôt qu'un résultat
scientifique établi.

**Décalage temporel du Cycle Time.** Comme évoqué à la section 4.5.2, R_CT est une
métrique rétrospective : elle ne réagit à un blocage qu'une fois les tâches concernées
terminées. Ce décalage est inhérent à la définition du Cycle Time [Vacanti, 2015], mais
il limite la capacité du SGR à détecter certains risques *de manière proactive*. Une
tâche bloquée depuis trois jours sans être terminée n'impacte R_CT que lorsqu'elle
sera finalement clôturée — ce qui peut intervenir trop tard.

**Seuils de normalisation non adaptatifs.** Les seuils qui convertissent les valeurs
brutes en scores normalisés (0–100) sont fixes. Par exemple, R_WIP est calculé comme
`(WIP_actuel - WIP_limite) / WIP_limite × 100`. Cette formule suppose que la limite
WIP est correctement définie, ce qui requiert une connaissance a priori de la capacité
de l'équipe. Pour une nouvelle équipe ou un nouveau projet, cette connaissance
est insuffisante, rendant les premiers scores peu représentatifs.

### 4.7.2 Limites méthodologiques

**Échantillon unique.** L'évaluation du système repose sur un seul projet, conduit
par un seul développeur, dans un contexte académique. Les résultats observés — la
cohérence entre scores SGR et perception subjective du risque — ne peuvent pas être
généralisés sans une réplication sur des équipes aux profils différents. En sciences
du génie logiciel, la validité externe d'une étude de cas unique reste limitée, et
les conclusions doivent être présentées comme des indices de validité plutôt que
comme des preuves [Runeson & Höst, 2009].

**Biais de confirmation.** Le protocole de dog-fooding, bien qu'il produise des
données authentiques, n'immunise pas contre le biais de confirmation : le concepteur
du modèle est aussi celui qui interprète ses résultats. Il est possible qu'une
interprétation involontairement favorable ait conduit à survaloriser les moments de
cohérence et à minimiser les divergences. Ce biais est documenté, mais non entièrement
neutralisable dans le cadre d'une étude individuelle.

### 4.7.3 Limites PWA documentées

| # | Limite | Catégorie | Impact | Mitigation appliquée |
|---|--------|-----------|--------|----------------------|
| 1 | Background Sync non universel | Inhérente au standard | Faible | Fallback `message event` couvre 100% navigateurs |
| 2 | Séparation shell / données dynamiques | Inhérente au standard | Faible | `localStorage` TTL 24h (*stale-while-offline*) |
| 3 | NetworkFirst sans gain de vitesse | Arbitrage délibéré | Nul | Cohérence données > vitesse (théorème CAP) |
| 4 | SW désactivé en développement | Arbitrage délibéré | Nul | Tests PWA sur build de production uniquement |
| 5 | `skipWaiting` multi-onglets | Découverte tardive → corrigée | Critique → Nul | `SWUpdatePrompt.tsx` : prompt explicite de mise à jour |

*Tableau 4.3 — Limites de l'architecture PWA et mitigations*

Il est notable que la limite la plus sévère (ligne 5) n'a pas été détectée par
l'algorithme SGR lui-même, mais par une analyse manuelle lors de la rédaction du
journal. Ce méta-constat illustre les frontières du modèle : le SGR mesure les risques
de flux Kanban et de qualité technique, mais ne surveille pas les risques
comportementaux du Service Worker, qui relèvent d'une autre catégorie de risques
logiciels.

---

## 4.8. Pistes d'amélioration et perspectives

Les limites identifiées à la section précédente ne remettent pas en cause la viabilité
de l'approche, mais dessinent un agenda de recherche et de développement cohérent pour
les itérations futures.

### 4.8.1 Validation empirique des pondérations

La piste la plus fondamentale consiste à soumettre les pondérations du SGR à une
validation empirique sur un corpus d'équipes Agile réelles. Le protocole envisagé
serait le suivant : instrumenter le système SGR sur un ensemble d'équipes utilisant
TaskManage pendant plusieurs sprints, collecter les perceptions subjectives du risque
via un questionnaire court (type Likert) à chaque fin de sprint, et calculer la
corrélation entre scores SGR et perceptions déclarées. Si la corrélation est
significative, les pondérations peuvent être considérées comme valides ; si elle
est faible, une méthode d'optimisation (moindres carrés, apprentissage par renforcement)
pourrait les ajuster automatiquement.

### 4.8.2 Vers un SGR adaptatif par apprentissage automatique

À plus long terme, les pondérations fixes constituent une simplification volontaire.
Un modèle SGR de deuxième génération pourrait les remplacer par des coefficients
appris à partir des données historiques de chaque équipe. Des approches comme la
régression logistique sur les données de sprints passés, ou des réseaux de neurones
récurrents (LSTM) entraînés sur l'historique SGR, permettraient d'adapter le modèle
au contexte spécifique de chaque projet. Cette direction rejoint les travaux récents
sur le machine learning appliqué à la prédiction des défaillances logicielles
[Malhotra, 2015].

### 4.8.3 Intégration d'un indicateur proactif pour R_CT

Pour corriger le décalage temporel de l'indicateur R_CT, une piste consiste à le
compléter par une métrique en temps réel : le *Work Item Age* (R_Age, déjà présent
dans le modèle) détecte les tâches qui s'allongent *avant* qu'elles ne soient
terminées. Une évolution possible serait de fusionner R_CT et R_Age en un indicateur
composite de type *flow efficiency*, mesurant le ratio entre le temps de travail actif
et le temps d'attente total, tel que défini par Modig et Åhlström [2012].

### 4.8.4 Extension à d'autres méthodologies et contextes

Le modèle SGR a été conçu principalement pour des équipes utilisant Kanban. Son
extension à Scrum, SAFe ou LeSS demanderait d'adapter les indicateurs aux artefacts
correspondants (velocity, sprint burndown, PI objectives). Une architecture de plugins
permettrait de déclarer différents profils de pondération selon la méthodologie choisie
par l'équipe, sans modifier le cœur algorithmique.

### 4.8.5 Amélioration de la couverture R_Tech

L'indicateur R_Tech (10% du SGR) repose actuellement sur l'intégration optionnelle
avec des outils d'analyse statique (Codacy). Sa fiabilité dépend donc entièrement de
la connexion du dépôt GitHub associé au projet. Une piste d'amélioration serait
d'enrichir R_Tech avec des métriques extraites directement du graphe de commits :
fréquence des commits de type `fix:`, ratio bugs fermés / bugs ouverts via l'API
GitHub Issues, ou nombre de pull requests en attente de revue. Ces proxies de la
dette technique sont accessibles sans dépendance à un outil payant.

### 4.8.6 Synthèse des perspectives

```
  Court terme (< 3 mois)
  ├── Validation pondérations sur 3–5 équipes pilotes
  ├── Enrichissement R_Tech avec métriques GitHub natives
  └── Tests E2E authentifiés avec credentials Clerk de test

  Moyen terme (3–12 mois)
  ├── SGR adaptatif par régression sur données historiques
  ├── Profils de pondération par méthodologie (Scrum, SAFe)
  └── Dashboard analytique multi-projets avec tendances

  Long terme (> 12 mois)
  ├── Modèle LSTM sur historique SGR pour prédiction de risque
  ├── API publique SGR pour intégration dans outils tiers (Jira, Linear)
  └── Étude comparative multi-organisations (validation externe)
```
*Figure 4.5 — Feuille de route des améliorations du système SGR*

---

## Synthèse du chapitre

Ce chapitre a présenté l'évaluation du système TaskManage selon trois axes
complémentaires : la validation technique (tests automatisés), la validation
fonctionnelle (dog-fooding sur données réelles), et la réflexivité méthodologique
(journal de bord).

Les résultats techniques sont satisfaisants : 30 tests unitaires Jest avec 93,7 %
de couverture sur le module SGR, 16 tests E2E Playwright tous passants, et un score
Lighthouse de 99/100 en performance mesurée en conditions réelles (mode incognito,
sans extensions). Ces chiffres attestent que le système fonctionne conformément aux
exigences énoncées au chapitre 1.

La validation fonctionnelle, conduite sur les données du sprint final, montre une
cohérence globale entre les scores SGR calculés et la perception subjective du risque
documentée en temps réel. Elle illustre également les mécanismes algorithmiques
concrets : la montée de R_Age lors d'un blocage de tâche, la contribution modérée de
R_Throughput lors d'un ralentissement, et la quasi-neutralité de R_Tech faute d'une
intégration outillée.

Les limites identifiées — pondérations non validées empiriquement, échantillon unique,
décalage temporel de R_CT — sont réelles et documentées honnêtement. Elles constituent
non pas des défauts du projet, mais les frontières naturelles d'une première version
d'un modèle original, dont les perspectives d'amélioration sont tracées à la section 4.8.

---

*Références mobilisées dans ce chapitre :*
- Anderson, D. J. (2010). *Kanban: Successful Evolutionary Change for Your Technology Business.* Blue Hole Press.
- Kemmis, S. & McTaggart, R. (2000). *Participatory Action Research.* In Denzin & Lincoln (Eds.), Handbook of Qualitative Research.
- Malhotra, R. (2015). *Empirical Research in Software Engineering.* CRC Press.
- Modig, N. & Åhlström, P. (2012). *This is Lean: Resolving the Efficiency Paradox.* Rheologica Publishing.
- Runeson, P. & Höst, M. (2009). Guidelines for conducting and reporting case study research in software engineering. *Empirical Software Engineering*, 14(2), 131–164.
- Vacanti, D. S. (2015). *Actionable Agile Metrics for Predictability.* ActionableAgile Press.
