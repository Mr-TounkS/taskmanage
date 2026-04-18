# Section 3.2.2 — Mode hors ligne et synchronisation

> Contenu prêt à insérer dans le mémoire (remplace la version précédente).
> Chaque affirmation correspond à du code implémenté et vérifiable.

---

## 3.2.2 Mode hors ligne et synchronisation

L'architecture hors ligne de Task Manage repose sur trois couches
complémentaires, chacune répondant à un aspect distinct de la
sous-question SQ2 : "Dans quelle mesure l'architecture PWA répond-elle
aux exigences de disponibilité hors ligne des équipes Agile distribuées ?"

### Couche 1 — Service Worker et cache des ressources statiques

Lors de la première ouverture de l'application, le Service Worker est
enregistré automatiquement par la bibliothèque `@ducanh2912/next-pwa`
(option `register: true` dans `next.config.ts`). Durant la phase
d'installation, la directive `precacheAndRoute` de Workbox télécharge et
stocke en cache l'intégralité des ressources critiques : 57 fichiers au
total, comprenant les scripts JavaScript compilés, les feuilles de style,
les icônes PWA et la page de repli `/offline`. Cette phase de
pré-chargement garantit la disponibilité de l'interface dès le second
lancement, indépendamment de l'état du réseau.

Les requêtes ultérieures sont interceptées par le Service Worker et
routées selon la stratégie Workbox appropriée :

| Type de ressource | Stratégie Workbox | Justification |
|-------------------|-------------------|---------------|
| Pages et APIs | `NetworkFirst` | Fraîcheur des données prioritaire |
| JS Next.js statiques | `CacheFirst` | Fichiers immuables (hash dans le nom) |
| Images, fonts | `StaleWhileRevalidate` | Affichage immédiat + mise à jour silencieuse |
| Fichiers JSON/CSV | `NetworkFirst` | Données susceptibles de changer |

Lorsqu'une page est demandée hors ligne et absente du cache, la
directive `fallbacks.document: "/offline"` définit la page de repli.
Cette page, implémentée en Server Component (`app/offline/page.tsx`),
informe l'utilisateur des fonctionnalités disponibles et indisponibles
sans connexion, et intègre un composant client `ReloadButton` qui
surveille l'événement `online` du navigateur pour rediriger
automatiquement vers la page d'accueil dès le rétablissement de la
connexion.

### Couche 2 — Cache applicatif des données dynamiques

Le Service Worker cache le *shell* de l'application (HTML, CSS, JS) mais
pas les données métier (projets, tâches, scores SGR), qui sont servies
par les Server Actions de Next.js à chaque requête. Pour garantir la
consultation des données en mode hors ligne, un cache applicatif en
`localStorage` a été implémenté (`lib/local-data-cache.ts`).

Le mécanisme fonctionne selon le pattern suivant :

```
SI navigator.onLine == true
  → fetch Server Action → afficher les données
  → saveToCache(clé, données)          // sauvegarde pour usage offline
SINON
  → readFromCache(clé)                  // lecture depuis localStorage
  → afficher les données en cache
  → afficher le bandeau "Données hors ligne"
```

Chaque entrée du cache est horodatée et invalidée après 24 heures (TTL
configurable). Les clés de cache sont indexées par identifiant utilisateur
(`projects_{email}`) ou par identifiant de ressource (`project_{id}`),
garantissant l'isolation des données entre utilisateurs.

### Couche 3 — File d'attente et synchronisation différée

Les actions effectuées hors ligne (déplacement de tâches, modification
de statut) sont sérialisées dans une base **IndexedDB** locale
(`lib/offline-queue.ts`). Chaque entrée contient le type d'action, l'URL
cible, la méthode HTTP, le payload et un compteur de tentatives.

Dès la reprise de connexion, le Service Worker écoute l'événement `sync`
(tag `"offline-actions"`) déclenché par le navigateur et rejoue chaque
action vers l'API Next.js avec un mécanisme de retry plafonné à trois
tentatives (`worker/index.ts`). Les actions ayant dépassé ce seuil sont
supprimées de la file et journalisées en console.

Pour les navigateurs ne supportant pas le Background Sync (Firefox,
Safari), un mécanisme de repli est implémenté : à chaque chargement de
page, le client envoie un message `REPLAY_OFFLINE_ACTIONS` au Service
Worker, qui déclenche manuellement la synchronisation.

L'interface utilisateur reflète cet état de manière transparente :
- Un indicateur dans le tableau Kanban signale le mode hors ligne
- Les déplacements de cartes appliquent une **mise à jour optimiste**
  (l'interface change immédiatement, la synchronisation suit)
- Un toast confirme la mise en file d'attente de chaque action
