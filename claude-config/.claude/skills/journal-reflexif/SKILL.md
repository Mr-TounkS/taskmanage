---
name: journal-reflexif
description: >
  Gestionnaire du journal de bord réflexif. S'active quand l'utilisateur
  dit "note", "journal", "incident", ou après toute décision technique 
  importante. Documente les décisions pour alimenter la section 4.2 du mémoire.
---

# Skill : Journal de Bord Réflexif

## Objectif académique

Ce journal alimente directement la section 4.2 du mémoire :
"Étude de cas : Application de l'outil à son propre développement"

Chaque entrée est une donnée empirique pour valider (ou invalider) l'algorithme SGR.

---

## Format d'une entrée de journal

```
## Entrée #[N] — [DATE]

### Déclencheur
[Ce qui a provoqué cette entrée : alerte SGR, blocage technique, décision architecturale, incident]

### Contexte technique
- SGR au moment de l'incident : [score ou N/A]
- Indicateurs actifs : [WIP / CT / Age / Throughput / Tech]
- Métriques GitHub/SonarQube si disponibles : [...]

### Décision prise
Description : [décision ou action choisie]
Alternatives considérées : [option A, option B]
Raison du choix : [justification]

### Impact observé
- Sur le code : [...]
- Sur le SGR (si mesurable) : [avant → après]
- Sur le calendrier : [...]

### Leçon pour le mémoire
- Section concernée : Chapitre [X], section [Y]
- Enseignement : [ce que cet incident prouve ou illustre]
- Question de soutenance potentielle : [...]
```

---

## Déclencheurs automatiques

Propose une entrée de journal automatiquement quand :
- Une décision d'architecture est prise
- Un bug critique est résolu
- Une intégration API est réalisée
- Un test échoue puis est corrigé
- Le SGR détecterait un signal de risque réel

## Commande rapide

Quand l'utilisateur dit "note [contenu]" :
1. Lis docs/journal-reflexif.md
2. Génère une entrée formatée
3. Ajoute-la au fichier
4. Confirme avec le numéro d'entrée et la section du mémoire concernée
