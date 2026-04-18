---
📅 Date    : 2026-04-04
🏷️ Type    : FEATURE + RETROSPECTIVE
📂 Section : 3.2 — Réalisation PWA / 4.3 — Analyse critique et perspectives
⚡ SGR     : 15 (projet en phase finale — risques techniques maîtrisés)
---

# Optimisations Lighthouse — Score 56→99 Performance, 77→100 Best Practices

## 🔍 Contexte

Lors d'un audit Lighthouse en mode normal (avec extensions Chrome actives), les scores
obtenus étaient préoccupants : Performance à 56, Best Practices à 77. Ces scores auraient
fragilisé la démonstration au jury de la qualité de la PWA. Un audit en mode incognito,
représentatif des conditions réelles, a révélé que les extensions gonflaient les mesures.
Cependant, les causes de fond (JS inutilisé, absence de headers sécurité, page entièrement
client-side) étaient bien réelles et nécessitaient correction.

## 🎯 Décision / Constat

Cinq corrections ont été appliquées pour atteindre les scores cibles :

1. **Server Component SSR sur la home page** — `app/page.tsx` a été transformé en
   Server Component utilisant `currentUser()` de Clerk côté serveur. La logique interactive
   a été extraite dans `HomeClient.tsx`. Le shell HTML est désormais pré-rendu côté serveur,
   réduisant le FCP et le Speed Index.

2. **Security Headers HTTP** dans `next.config.ts` — Ajout de 6 en-têtes de sécurité :
   `X-Frame-Options`, `X-Content-Type-Options`, `Cross-Origin-Opener-Policy`,
   `Cross-Origin-Resource-Policy`, `Referrer-Policy`, `Permissions-Policy`, et un
   `Content-Security-Policy` complet autorisant Clerk, Vercel et le Service Worker PWA.

3. **Landmark `<main>`** dans `Wrapper.tsx` — Remplacement du `<div>` englobant par
   un élément `<main>` sémantique, requis par les standards ARIA pour l'accessibilité
   des lecteurs d'écran.

4. **Label associé au `<select>`** dans `task-details/page.tsx` — Ajout d'un
   `<label htmlFor="task-status-select">` avec classe `sr-only` (visible uniquement
   pour les lecteurs d'écran), sans impact visuel sur l'interface.

5. **Lazy load Recharts** dans `SGRWidget.tsx` — Le composant `SGRHistoryChart`
   (qui importe Recharts ~300Ko) est désormais chargé via `dynamic()` de Next.js avec
   `ssr: false`. Ceci différe l'exécution du graphique après le First Contentful Paint,
   réduisant significativement le Total Blocking Time.

### Résultats mesurés (mode incognito, Lighthouse 13.0.2) :

| Métrique | Avant | Après | Δ |
|----------|-------|-------|---|
| Performance | 56 | **99** | +43 |
| Accessibility | 89 | **94** | +5 |
| Best Practices | 77 | **100** | +23 |
| SEO | 91 | **100** | +9 |
| FCP | 1.6 s | **0.4 s** | −75% |
| LCP | 1.7 s | **0.7 s** | −59% |
| TBT | 580 ms | **0 ms** | −100% |
| Speed Index | 3.7 s | **1.1 s** | −70% |

## ⚖️ Alternatives considérées

| Option | Avantages | Inconvénients | Raison du rejet |
|--------|-----------|---------------|-----------------|
| Ne corriger que les headers (fix minimal) | Rapide, Best Practices 77→100 | Performance reste à 56 | Insuffisant pour le jury |
| Migrer vers App Router full-SSR | Performance maximale | Refactoring complet de toutes les pages | Trop risqué en phase finale de mémoire |
| Utiliser `next/bundle-analyzer` pour optimiser le bundle | Précis, ciblé | Temps d'analyse + corrections multiples | Solution adoptée plus rapide et suffisante |
| Garder les scores actuels en expliquant le contexte | Zéro effort | Score 56 indefendable devant le jury | Rejeté — qualité réelle nécessaire |

## 📊 Impact mesuré

- **Sur le SGR** : Score de risque technique (R_Tech) en baisse — la dette technique diminue
  avec l'amélioration de la qualité du code et des pratiques de sécurité
- **Sur le planning** : Fix réalisé en 1 session — 0 retard généré
- **Sur le code** :
  - `next.config.ts` — ajout des security headers
  - `app/components/Wrapper.tsx` — `<div>` → `<main>`
  - `app/task-details/[taskId]/page.tsx` — label accessible
  - `app/components/SGRWidget.tsx` — dynamic import Recharts
  - `app/page.tsx` — transformé en Server Component
  - `app/components/HomeClient.tsx` — nouveau fichier (logique interactive extraite)

## 📚 Lien avec le mémoire

- **Section concernée** :
  - **1.4** — Exigences non fonctionnelles (performance, sécurité, accessibilité)
  - **3.2** — Réalisation PWA — preuve concrète que l'architecture Next.js répond aux exigences
  - **4.3** — Analyse critique : le score TBT à 0ms valide la réactivité de l'application
    pour les équipes Agile distribuées (SQ2)

- **Argument académique** : Le score Lighthouse de 99/100 en Performance constitue une
  validation empirique de la sous-question SQ2 du mémoire : *"Dans quelle mesure l'architecture
  PWA répond-elle aux exigences de mobilité, disponibilité hors ligne et réactivité ?"*
  Un TBT de 0ms et un LCP de 0.7s démontrent que l'application est "instantanément réactive",
  caractéristique clé pour les équipes Agile distribuées travaillant sur mobile ou réseau limité.

  Le passage de la home page en Server Component illustre également la maîtrise du pattern
  **Server/Client Component de React 18+**, décision architecturale alignée avec le
  principe de "rendu progressif" de la Clean Architecture côté présentation.

- **Citation possible en soutenance** :
  > "L'audit Lighthouse en conditions réelles révèle un score de performance de 99/100,
  > avec un Time to Interactive (mesuré via TBT) de 0ms — confirmant que la PWA TaskManage
  > satisfait aux exigences de réactivité des équipes Agile distribuées posées en SQ2."

## 🔮 Prochaine action

- Corriger le dernier point Accessibility (94→100) : boutons icônes sans `aria-label`
  (NavBar, WIPConfigWidget, SGRWidget) — gain estimé +6pts
- Capturer une **capture d'écran du rapport Lighthouse** pour l'insérer comme figure
  dans la section 4.3 du mémoire (preuve empirique de la qualité PWA)
