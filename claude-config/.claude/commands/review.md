---
description: Revue de code complète — Architecture + Qualité + Cohérence Mémoire
argument-hint: [fichier ou fonctionnalité à revoir]
context: fork
agent: Explore
---

# Revue de Code — $ARGUMENTS

Lance une revue complète en 3 dimensions :

## 1. Conformité Clean Architecture
Vérifie que les dépendances vont vers l'intérieur.
La logique SGR est-elle bien dans domain/ ?
Y a-t-il des imports problématiques ?

## 2. Qualité & Tests
Couverture de tests > 70% ?
TypeScript strict ?
Commentaires en français ?

## 3. Cohérence avec le Mémoire
Ce code est-il documenté dans le mémoire ?
Quelle section du mémoire alimente-t-il ?
Y a-t-il des décisions architecturales non documentées ?

Génère un rapport structuré avec les 3 axes et les actions recommandées.
