# Journal de Bord — 2026-03-31

## Migration SQLite → PostgreSQL Neon + Déploiement Vercel

**Type** : FEATURE + INCIDENT
**Section mémoire** : 3.2 (réalisation), 4.2 (réflexion)
**Impact SGR** : Risque "SQLite ≠ PostgreSQL" éliminé

---

### Contexte

Pour la présentation au jury, l'application doit être accessible en ligne.
Jusqu'ici, la base de données était SQLite (fichier `dev.db` local), incompatible
avec les hébergeurs serverless (Vercel, Railway). La migration vers PostgreSQL
était un risque identifié depuis le début du projet.

### Décision : Neon PostgreSQL

**Alternatives évaluées :**
| Option | Avantage | Inconvénient |
|--------|----------|--------------|
| Railway PostgreSQL | Simple, gratuit 500h | Pas serverless, cold starts |
| Supabase | PostgreSQL + Auth intégré | Overkill (Clerk déjà en place) |
| **Neon** | **Serverless, pooler intégré, free tier généreux** | **Nouveau, moins mature** |

**Choix : Neon** — parfaitement adapté à Vercel (serverless ↔ serverless).
Le pooler Neon (`-pooler` dans l'URL) gère les connexions éphémères des Server Actions.

### Implémentation

#### 1. Migration du schéma Prisma
```prisma
// Avant
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")  // file:./dev.db
}

// Après
datasource db {
  provider = "postgresql"
  // URL gérée par prisma.config.ts (Prisma 7)
}
```

#### 2. Adapter Prisma 7 pour Neon
Prisma 7 avec `engine = "client"` nécessite un adapter explicite :
```typescript
// lib/prisma.ts
import { PrismaNeon } from '@prisma/adapter-neon'
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
return new PrismaClient({ adapter })
```

Packages installés : `@prisma/adapter-neon@^7.6.0`, `@neondatabase/serverless@^1.0.2`

#### 3. Configuration Vercel
- `prisma.config.ts` : suppression du fallback SQLite
- Variable d'environnement `DATABASE_URL` configurée dans Vercel Dashboard

### Incident : Module not found sur Vercel

**Erreur** : `Module not found: Can't resolve '../prisma/generated/prisma/client'`

**Cause** : Le dossier `prisma/generated/` est dans `.gitignore` (bonne pratique).
Vercel ne dispose donc pas du client Prisma généré après `npm install`.

**Solution** : Ajout d'un script `postinstall` dans `package.json` :
```json
"postinstall": "prisma generate"
```
Ce script s'exécute automatiquement après `npm install` sur Vercel,
générant le client Prisma avant le `next build`.

### Résultat

- **URL production** : https://taskmanage-mu.vercel.app
- **Status** : Ready, Error Rate 0%
- **Commit** : `65f61cb fix: ajouter postinstall prisma generate pour Vercel`

### Lecons apprises

1. **Prisma 7 + Serverless** : l'architecture adapter-based est plus flexible
   mais nécessite une configuration explicite (pas de "ça marche tout seul").
2. **postinstall** : pattern standard pour les projets Prisma déployés — le client
   généré ne doit jamais être commité, il doit être régénéré à chaque déploiement.
3. **Neon pooler** : le suffixe `-pooler` dans l'URL est crucial pour les
   environnements serverless (connexions éphémères).

### Lien avec le mémoire

Cette migration valide la **portabilité de l'architecture Clean Architecture** :
seule la couche infrastructure (`lib/prisma.ts`) a été modifiée. Les use-cases,
le domaine et les composants UI n'ont subi aucun changement — preuve concrète
de la séparation des préoccupations (section 3.1.2).

---

*Rédigé le 2026-03-31 — Déploiement réussi en production*
