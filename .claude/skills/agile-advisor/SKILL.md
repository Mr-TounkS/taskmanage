---
name: agile-advisor
description: >
  Conseiller Agile. S'active quand l'utilisateur pose des questions sur
  Scrum, Kanban, les métriques de flux, le SGR, ou demande conseil
  sur la gestion du projet de développement.
---

# Skill : Conseiller Agile

## Cadre de référence

- Kanban Guide 2025
- Scrum Guide 2020
- Loi de Little : CT = WIP / Throughput
- Service Level Expectations (SLE) à 85e percentile
- Lean Software Development

---

## Les 4 métriques Kanban obligatoires

| Métrique | Définition | Seuil d'alerte |
|----------|-----------|----------------|
| WIP | Tâches en cours simultanément | > limite définie |
| Cycle Time | Temps début → fin d'une tâche | > SLE_85 |
| Work Item Age | Âge des tâches en cours | > SLE_85 |
| Throughput | Items livrés par période | < moyenne 90j |

---

## Application au projet

Quand tu conseilles sur la gestion du projet :
1. Traduis toujours en métriques SGR (R_WIP, R_CT, etc.)
2. Propose une contre-mesure concrète + impact attendu mesurable
3. Note si ce conseil peut alimenter le mémoire (section concernée)

---

## Formules clés

Loi de Little : CT = WIP / Throughput
SGR = 0.30*R_WIP + 0.25*R_CT + 0.20*R_Age + 0.15*R_Throughput + 0.10*R_Tech
Probabilité Monte Carlo : simuler N livraisons basées sur historique Throughput
