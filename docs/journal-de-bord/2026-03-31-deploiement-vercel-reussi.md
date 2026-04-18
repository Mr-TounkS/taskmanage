# Journal de Bord — Entrée #9
## Déploiement Vercel réussi + Lancement du Dog-fooding

**Date** : 31 mars 2026
**Phase** : Déploiement & Validation
**Durée** : ~2h (migration Neon + debug Vercel + déploiement)

---

### Contexte
L'application devait être accessible en ligne pour la soutenance du mémoire. Le déploiement sur Vercel nécessitait une migration complète de SQLite vers PostgreSQL (Neon).

### Décisions prises

| Décision | Justification |
|----------|---------------|
| PostgreSQL Neon (eu-central-1) | Serverless, compatible Vercel, gratuit Hobby |
| `@prisma/adapter-neon` | Prisma 7 requiert un adapter explicite (plus de Query Engine binaire) |
| `postinstall: "prisma generate"` | `prisma/generated/` est gitignored → doit être généré à chaque `npm install` sur Vercel |
| Dog-fooding sprint final | Utiliser l'app pour gérer ses propres tâches = preuve empirique pour le jury |

### Incidents techniques

1. **Prisma 7 : `url` interdit dans schema.prisma**
   - Erreur P1012 : la datasource URL doit être dans `prisma.config.ts`
   - Fix : suppression de `url = env("DATABASE_URL")` du schema

2. **PrismaClient require "adapter"**
   - Prisma 7 client engine ne supporte plus `datasourceUrl`
   - Fix : `new PrismaClient({ adapter: new PrismaNeon({ connectionString }) })`

3. **Module not found : `../prisma/generated/prisma/client`**
   - Cause : `prisma/generated/` dans `.gitignore`, donc absent sur Vercel
   - Fix : `"postinstall": "prisma generate"` dans `package.json`

### Résultat
- **URL** : https://taskmanage-mu.vercel.app
- **Status** : ● Ready, Error Rate 0%
- **Build** : commit `65f61cb` déployé avec succès

### Réflexion
Le passage SQLite → PostgreSQL illustre un risque classique de migration de base de données en fin de projet. L'utilisation de Prisma 7 avec son adapter pattern a ajouté une couche de complexité inattendue. La stratégie de `postinstall` est un pattern standard pour les ORM avec code généré — leçon importante pour la section 4.3 du mémoire (limites et perspectives).

### Impact mémoire
- **Section 3.2** : preuve de déploiement continu (screenshot Vercel)
- **Section 4.1** : validation SQ3 (accessibilité web via URL publique)
- **Section 4.3** : incident migration comme exemple de risque technique géré
