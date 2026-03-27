---
name: journal-bord
description: >
  Générer une entrée structurée dans le Journal de Bord Réflexif du projet.
  Utilise ce skill automatiquement quand : une décision architecturale est prise,
  un risque est identifié, une feature est terminée, un incident se produit.
  Peut aussi être invoqué manuellement avec /journal-bord.
argument-hint: "[événement ou décision à documenter]"
---

# 📓 Journal de Bord Réflexif — Protocole de Documentation

Le journal de bord est un **élément central du mémoire** (Section 4.2.2).
Chaque entrée doit être suffisamment détaillée pour être citée dans la soutenance.

## QUAND GÉNÉRER UNE ENTRÉE ?

Génère automatiquement une entrée quand tu détectes :
- ✅ Une décision architecturale ou technologique importante
- ✅ Un problème / bug bloquant rencontré et résolu
- ✅ Un risque nouveau identifié dans le registre
- ✅ Une feature complète implémentée
- ✅ Un écart entre la planification et la réalité
- ✅ Un changement de priorité ou de scope

---

## FORMAT D'ENTRÉE OBLIGATOIRE

```markdown
---
📅 Date    : [DATE AUTOMATIQUE]
🏷️ Type    : [DÉCISION | INCIDENT | FEATURE | RISQUE | RETROSPECTIVE]
📂 Section : [Section du mémoire concernée]
⚡ SGR     : [Score de risque estimé au moment de l'événement: 0-100]
---

## [TITRE DE L'ÉVÉNEMENT]

### 🔍 Contexte
[Situation au moment de l'événement — 2-3 phrases]

### 🎯 Décision / Constat
[Ce qui a été décidé ou observé — précis et factuel]

### ⚖️ Alternatives considérées
| Option | Avantages | Inconvénients | Raison du rejet |
|--------|-----------|---------------|-----------------|
| [A]    | ...       | ...           | ...             |
| [B]    | ...       | ...           | ...             |

### 📊 Impact mesuré
- **Sur le SGR** : [hausse/baisse du score de risque]
- **Sur le planning** : [impact sur les délais]
- **Sur le code** : [fichiers affectés]

### 📚 Lien avec le mémoire
- **Section concernée** : [ex: "2.3 — Algorithme SGR"]
- **Argument académique** : [comment cet événement illustre ou valide un point du mémoire]

### 🔮 Prochaine action
[Action concrète à prendre suite à cet événement]
```

---

## AGRÉGATION HEBDOMADAIRE

Chaque vendredi, génère un résumé hebdomadaire :

```markdown
# 📊 Bilan Semaine [N] — [dates]

## Métriques
- Features terminées : [N]
- Risques identifiés : [N]
- Score SGR moyen : [N]/100
- Écart planning : [en avance/retard de X jours]

## Décisions majeures
[Liste des entrées de la semaine]

## Apprentissages pour le mémoire
[Ce qui peut être utilisé dans la démarche réflexive — Section 4.2]
```

---

## STOCKAGE

Toutes les entrées sont sauvegardées dans :
```
docs/journal-de-bord/
├── YYYY-MM-DD-[type]-[titre].md
├── weekly-summary-semaine-N.md
└── INDEX.md  ← table des matières auto-générée
```
