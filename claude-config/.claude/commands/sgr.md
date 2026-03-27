---
description: Calculer ou analyser le Score Global de Risque du projet
argument-hint: [optionnel: valeurs des métriques WIP CT Age Throughput Tech]
---

# Analyse SGR — Score Global de Risque

## Formule
SGR = 0.30×R_WIP + 0.25×R_CT + 0.20×R_Age + 0.15×R_Throughput + 0.10×R_Tech

## Si des valeurs sont fournies dans $ARGUMENTS :
Calcule le SGR et interprète le résultat :
- 0-30 : Risque faible → Continuer normalement
- 31-60 : Risque modéré → Surveiller, rétrospective recommandée
- 61-80 : Risque élevé → Action immédiate requise
- 81-100 : Risque critique → Stopper, plan de remédiation urgent

## Propose automatiquement :
1. La contre-mesure Agile adaptée au signal dominant
2. Une entrée dans le journal de bord
3. La mise à jour du registre des risques (docs/risques.md)
