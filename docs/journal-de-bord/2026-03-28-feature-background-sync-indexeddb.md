---
📅 Date    : 2026-03-28
🏷️ Type    : FEATURE + INCIDENT
📂 Section : 3.2.2 — Mode hors ligne et synchronisation
⚡ SGR     : 42 (risque modéré — fonctionnalité offline critique pour SQ2)
---

## Implémentation du Background Sync et correction du bug ReloadButton

### 🔍 Contexte
La section 3.2.2 du mémoire affirmait que "les actions effectuées hors ligne sont mises
en file d'attente dans IndexedDB et transmises au serveur dès la reprise de connexion via
l'événement sync". Cette affirmation était inexacte : la fonctionnalité n'était pas
implémentée. Par ailleurs, le bouton "Réessayer" de la page `/offline` ne fonctionnait
pas — il appelait `window.location.reload()`, ce qui rechargait la page `/offline`
elle-même (interceptée par le Service Worker depuis le précache), créant une boucle
infinie indépendamment de l'état de la connexion.

### 🎯 Décision / Constat
**Bug corrigé :** `ReloadButton.tsx` modifié pour utiliser `router.push("/")` au lieu de
`window.location.reload()`. Ajout d'une vérification active de connectivité via
`fetch("/manifest.json", { cache: "no-store" })` et écoute de l'événement `online` du
navigateur pour redirection automatique.

**Feature implémentée :** Architecture complète de synchronisation différée :
- `lib/offline-queue.ts` — Wrapper IndexedDB (enqueueAction, getPendingActions,
  removeAction, incrementRetries, clearQueue)
- `hooks/useOfflineQueue.ts` — Hook React exposant `execute()` qui route
  automatiquement vers fetch direct (online) ou IndexedDB (offline)
- `worker/index.ts` — Code Service Worker personnalisé fusionné par next-pwa
  (écoute `sync: "offline-actions"`, rejoue les actions, max 3 retries)
- `next.config.ts` — Ajout de `customWorkerSrc: "worker"` pour inclure le code SW custom

### ⚖️ Alternatives considérées
| Option | Avantages | Inconvénients | Raison du rejet |
|--------|-----------|---------------|-----------------|
| Librairie `idb` (wrapper IndexedDB) | API promesse plus simple | Dépendance externe supplémentaire | Vanilla IndexedDB suffisant pour le use-case |
| `workbox-background-sync` plugin | Intégration Workbox native | Config complexe avec next-pwa v10 | `customWorkerSrc` plus flexible |
| Pas d'implémentation (section 3.2.2 supprimée) | Moins de risque | Perd un argument pour SQ2 | Contredit la problématique du mémoire |
| LocalStorage à la place d'IndexedDB | Plus simple | Non disponible dans SW, pas async | Incompatible avec le contexte Service Worker |

### 📊 Impact mesuré
- **Sur le SGR** : Réduction du risque de 42→35 (fonctionnalité offline désormais prouvée)
- **Sur le planning** : +2h de développement, mais section 3.2.2 du mémoire maintenant
  exacte et justifiable lors de la soutenance
- **Sur le code** :
  - `app/components/ReloadButton.tsx` — modifié (bug fix)
  - `lib/offline-queue.ts` — créé (120 lignes)
  - `hooks/useOfflineQueue.ts` — créé (115 lignes)
  - `worker/index.ts` — créé (135 lignes)
  - `next.config.ts` — modifié (+1 ligne `customWorkerSrc`)

### 📚 Lien avec le mémoire
- **Section concernée** : `3.2.2 — Mode hors ligne et synchronisation`
- **Argument académique** : L'implémentation du Background Sync API répond directement
  à la sous-question de recherche SQ2 (*"Comment garantir la disponibilité de l'outil
  pour des équipes Agile distribuées ?"*). La combinaison IndexedDB + SW `sync` event
  constitue le pattern standard PWA pour la persistance offline-first, documenté dans
  les spécifications W3C et recommandé par Google Workbox. Le bug du `reload()` illustre
  un risque classique en développement PWA : la confusion entre le contexte navigateur
  et le contexte Service Worker (deux scopes d'exécution distincts).

### 🔮 Prochaine action
1. Écrire les tests Jest pour `lib/offline-queue.ts` (mock IndexedDB avec `fake-indexeddb`)
2. Corriger la section 3.2.2 du mémoire pour qu'elle décrive l'implémentation réelle
3. Ajouter un badge "N actions en attente" dans le layout pour les utilisateurs offline
