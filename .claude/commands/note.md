---
description: Ajouter une entrée dans le journal de bord réflexif
argument-hint: [description de l'incident ou décision]
disable-model-invocation: false
---

# Journal Réflexif — Nouvelle Entrée

Déclenché par : $ARGUMENTS

Lis le fichier docs/journal-reflexif.md pour connaitre le numéro de la dernière entrée.

Génère une nouvelle entrée avec le format suivant :

## Entrée #[N+1] — [DATE AUJOURD'HUI]

### Déclencheur
$ARGUMENTS

### Contexte technique
[Demande-moi les métriques SGR actuelles si pertinent]

### Décision prise
[À remplir avec moi]

### Impact observé
[À évaluer après implémentation]

### Leçon pour le mémoire
- Section concernée : [identifie la section du plan]
- Enseignement : [ce que cet incident démontre pour la recherche]

Ajoute cette entrée à la fin de docs/journal-reflexif.md.
