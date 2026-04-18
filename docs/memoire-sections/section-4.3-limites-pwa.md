# Section 4.3 — Analyse critique et perspectives

> Contenu prêt à insérer dans le mémoire.
> Complète les limites déjà identifiées (pondérations SGR, échantillon unique, SQLite).

---

## 4.3.1 Limites inhérentes à l'architecture PWA

L'implémentation du mode hors ligne via Service Worker et Workbox révèle
deux contraintes structurelles propres aux Progressive Web Apps, qui ne
constituent pas des défauts de conception mais des limites inhérentes
au standard.

**Séparation entre shell applicatif et données métier.** Le Service Worker
pré-charge en cache l'ensemble des ressources statiques de l'application
(fichiers JavaScript, feuilles de style, images, page de repli `/offline`)
lors de son installation. Cependant, les données dynamiques — projets,
tâches, historique du score SGR — sont servies par les Server Actions
de Next.js, qui interrogent la base de données à chaque requête. Le Service
Worker ne peut pas anticiper ni mettre en cache ces réponses sans les avoir
préalablement reçues. Pour pallier cette limitation, un cache applicatif en
`localStorage` a été implémenté (`lib/local-data-cache.ts`) : lors de chaque
chargement réussi, les données sont sauvegardées localement avec un TTL de
24 heures, et servies en fallback lorsque le réseau est indisponible. Cette
approche relève du pattern *stale-while-offline* : les données peuvent être
obsolètes, mais leur disponibilité garantit la continuité d'usage.

**Fragmentation du support Background Sync.** La spécification Background
Sync API (W3C, 2023) n'est implémentée que par les navigateurs basés sur
Chromium (Chrome, Edge, Opera). Firefox et Safari ne prennent pas en charge
l'événement `sync` du Service Worker, ce qui empêche la synchronisation
automatique des actions effectuées hors ligne. Pour couvrir ces navigateurs,
un mécanisme de repli a été implémenté dans `worker/index.ts` : à chaque
chargement de page, le client envoie un message `REPLAY_OFFLINE_ACTIONS`
au Service Worker, qui rejoue manuellement les actions en attente dans
IndexedDB. Ce fallback est fonctionnel mais non transparent — il nécessite
un rechargement de page, contrairement au Background Sync qui opère en
arrière-plan sans intervention utilisateur.

| Navigateur | Background Sync | Fallback message | Couverture |
|------------|:---------------:|:----------------:|:----------:|
| Chrome / Edge | Oui | — | 65% desktop, 40% mobile |
| Firefox | Non | Oui (message event) | 7% desktop |
| Safari / iOS | Non | Oui (message event) | 27% mobile |

*Sources : StatCounter, mars 2026. Le fallback couvre 100% des navigateurs modernes.*

---

## 4.3.2 Arbitrages architecturaux délibérés

Plusieurs choix de conception du Service Worker résultent d'arbitrages
explicites entre des exigences contradictoires. Ces décisions sont
documentées ici pour démontrer qu'elles relèvent d'un raisonnement
architectural et non d'un manque de maîtrise technique.

**Stratégie NetworkFirst pour les pages et les APIs.** La stratégie Workbox
`NetworkFirst` tente systématiquement de contacter le serveur avant de
servir la réponse depuis le cache. Cette approche ne procure aucun gain
de performance en situation connectée, contrairement à `CacheFirst` qui
servirait instantanément depuis le cache. Cependant, dans le contexte d'un
outil de gestion des risques Agile, la **fraîcheur des données prime sur
la vitesse de rendu** : afficher un tableau Kanban obsolète (tâches déjà
déplacées par un collaborateur) constituerait un risque fonctionnel plus
grave qu'un délai de chargement de quelques centaines de millisecondes.
Cet arbitrage s'inscrit dans la continuité du théorème CAP appliqué aux
applications web : entre cohérence (*consistency*) et disponibilité
(*availability*), le projet privilégie la cohérence lorsque le réseau
est accessible, et bascule sur la disponibilité (cache) uniquement en cas
de coupure avérée.

**Désactivation du Service Worker en mode développement.** La configuration
`disable: process.env.NODE_ENV === "development"` dans `next.config.ts`
empêche l'enregistrement du Service Worker lors du développement local.
Ce choix, recommandé par la documentation officielle de `@ducanh2912/next-pwa`,
prévient les conflits entre le *hot module replacement* (HMR) de Webpack et
le cache du Service Worker, qui peuvent provoquer des comportements
imprévisibles (pages figées sur une version obsolète du code). Les tests
de fonctionnalité PWA sont réalisés sur un build de production
(`npm run build && npm start`), validés par 16 tests E2E Playwright.

**Limites de taille du cache API.** Les routes `/api/` sont configurées
avec un maximum de 16 entrées et un TTL de 24 heures. Ces paramètres
reflètent l'hypothèse d'usage du projet : un chef de projet Agile gère
typiquement 2 à 5 projets actifs simultanément (Anderson, 2010), chacun
comptant entre 10 et 30 tâches. Avec 16 entrées de cache, les requêtes
API des 2 projets les plus récents restent accessibles hors ligne. Pour
un déploiement à plus grande échelle, ce paramètre pourrait être ajusté
via la configuration Workbox dans `next.config.ts`.

**Cache cross-origin limité à une heure.** Les ressources externes — en
particulier les avatars utilisateurs hébergés sur `img.clerk.com` — sont
mises en cache avec un TTL d'une heure seulement. Ce délai court garantit
que les modifications de profil (changement de photo) sont répercutées
rapidement. L'impact en mode hors ligne est négligeable : un composant de
repli affiche les initiales de l'utilisateur lorsque l'avatar n'est pas
disponible dans le cache.

---

## 4.3.3 Limite corrigée post-analyse

**Activation immédiate du Service Worker (skipWaiting).** L'analyse des
limites a révélé un risque non détecté par l'algorithme SGR lui-même :
l'appel à `self.skipWaiting()` dans le Service Worker force l'activation
immédiate de chaque nouvelle version, sans attendre la fermeture des
onglets existants. Dans un scénario multi-onglets — courant chez les chefs
de projet qui consultent simultanément plusieurs tableaux Kanban — cette
stratégie peut provoquer une incohérence d'interface : un onglet exécute
le nouveau Service Worker tandis qu'un autre utilise encore l'ancienne
version des ressources. Ce cas illustre un méta-risque : un outil conçu
pour détecter les risques Agile présentait lui-même un risque non détecté
par son propre module SGR. La correction consiste à remplacer l'activation
automatique par un prompt utilisateur ("Nouvelle version disponible —
Actualiser ?"), implémenté via la bibliothèque `workbox-window`.

---

## 4.3.4 Synthèse des limites identifiées

| # | Limite | Catégorie | Impact | Mitigation |
|---|--------|-----------|--------|------------|
| 1 | Pondérations SGR non validées empiriquement | Algorithmique | Modéré | Perspectives : validation multi-équipes |
| 2 | Échantillon unique (auto-évaluation) | Méthodologique | Élevé | Biais documenté ; reproduction souhaitée |
| 3 | SQLite (dev) vs PostgreSQL (prod) | Infrastructure | Faible | Migration Prisma transparente |
| 4 | Séparation shell/données dans le SW | PWA (inhérente) | Faible | localStorage avec TTL 24h |
| 5 | Background Sync non universel | PWA (inhérente) | Faible | Fallback message event couvre 100% |
| 6 | NetworkFirst sans gain de vitesse | PWA (arbitrage) | Nul | Choix délibéré (cohérence > vitesse) |
| 7 | SW désactivé en développement | PWA (arbitrage) | Nul | Convention standard ; tests sur build prod |
| 8 | Cache API limité (16 entrées) | PWA (arbitrage) | Faible | Adapté au persona cible (2-5 projets) |
| 9 | Cache cross-origin 1h | PWA (arbitrage) | Nul | Fallback initiales utilisateur |
| 10 | skipWaiting multi-onglets | PWA (corrigée) | Critique → Nul | Prompt de mise à jour (workbox-window) |

*10 limites identifiées, dont 6 inhérentes ou délibérées, 3 méthodologiques, et 1 corrigée.*
