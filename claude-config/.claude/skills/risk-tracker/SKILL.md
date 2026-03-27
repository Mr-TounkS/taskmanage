---
name: risk-tracker
description: >
  Gestionnaire du registre des risques projet. S'active quand l'utilisateur
  dit "risque", "bloquant", ou quand un risque technique est détecté.
  Met à jour le registre et propose des contre-mesures selon les principes Agile.
---

# Skill : Risk Tracker — Registre des Risques

## Objectif dual

1. **Opérationnel** : Suivre les risques réels du projet de développement
2. **Académique** : Alimenter la section 4.2.2 du mémoire (incidents documentés)

---

## Format d'entrée dans le registre

```
| ID  | Risque             | Probabilité | Impact | SGR-signal | Contre-mesure | Statut |
|-----|-------------------|-------------|--------|------------|---------------|--------|
| R01 | [description]     | H/M/F       | H/M/F  | [indicateur]| [action]     | Ouvert |
```

## Registre initial (issu du document technique)

| ID  | Risque | Probabilité | Impact | Stratégie | Actions préventives |
|-----|--------|-------------|--------|-----------|---------------------|
| R01 | Dépassement délais | Moyenne | Élevé | Atténuation | Planification, priorisation |
| R02 | Complexité technique | Élevée | Moyen | Atténuation | Stack connue, MVP, docs |
| R03 | Problèmes déploiement | Moyenne | Moyen | Acceptation | Tests, staging |
| R04 | Données insuffisantes | Faible | Élevé | Évitement | Données mockées |
| R05 | Bug critique en démo | Moyenne | Élevé | Atténuation | Tests auto, démo préparée |

---

## Contre-mesures SGR par signal

Quand un signal SGR est détecté, propose automatiquement :

- **R_WIP élevé** → Réduire WIP immédiatement, bloquer nouvelles tâches
- **R_CT élevé** → Identifier le goulot, rétrospective flash 15min
- **R_Age élevé** → Swimlane "Aging Items", interdire nouveaux démarrages
- **R_Throughput bas** → Rétrospective, réduire WIP global de 20-30%
- **R_Tech élevé** → Risk spike technique 1 jour, code review obligatoire

---

## Commande rapide

Quand l'utilisateur dit "risque [description]" :
1. Évalue probabilité + impact
2. Identifie le signal SGR correspondant (R_WIP, R_CT, etc.)
3. Propose une contre-mesure Agile
4. Ajoute au registre docs/risques.md
5. Génère une entrée de journal si l'impact est élevé
