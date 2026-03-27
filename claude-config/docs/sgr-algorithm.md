# Spécification Algorithme SGR — Score Global de Risque

> Section mémoire : Chapitre 2, section 2.3

## Formule principale

```
SGR = 0.30×R_WIP + 0.25×R_CT + 0.20×R_Age + 0.15×R_Throughput + 0.10×R_Tech
```

Chaque R_i ∈ [0, 100] (normalisé)

---

## Définition des indicateurs

### R_WIP (30%) — Work In Progress
- **Source** : Kanban interne (IndexedDB + sync)
- **Calcul** : (WIP_actuel - WIP_limite) / WIP_limite × 100
- **Loi de Little** : CT = WIP / Throughput
- **Seuil alerte** : WIP > limite définie par colonne

### R_CT (25%) — Cycle Time
- **Source** : Historique des tâches terminées
- **Calcul** : (CT_actuel - CT_moyenne) / CT_moyenne × 100
- **SLE** : Seuil au 85e percentile
- **Seuil alerte** : CT > SLE_85

### R_Age (20%) — Work Item Age
- **Source** : Tâches en cours dans le Kanban
- **Calcul** : % tâches dont l'âge > SLE_85
- **Seuil alerte** : > 20% des tâches en cours au-delà de SLE_85

### R_Throughput (15%) — Débit
- **Source** : Tâches complétées par période (semaine)
- **Calcul** : (Throughput_moy90j - Throughput_actuel) / Throughput_moy90j × 100
- **Seuil alerte** : Baisse > 30% vs moyenne 90 jours

### R_Tech (10%) — Dette Technique
- **Source** : SonarQube API (webhooks)
- **Calcul** : f(bugs_critiques, code_smells, dette_technique_jours)
- **Seuil alerte** : > 5 bugs critiques OU dette > 5 jours

---

## Interprétation du SGR

| SGR | Niveau | Action |
|-----|--------|--------|
| 0-30 | 🟢 Faible | Continuer normalement |
| 31-60 | 🟡 Modéré | Surveillance accrue, rétrospective recommandée |
| 61-80 | 🟠 Élevé | Action immédiate, contre-mesure Agile |
| 81-100 | 🔴 Critique | Stopper, plan de remédiation urgent |

---

## Limitation documentée (pour le mémoire)

**Important** : Les pondérations (0.30, 0.25, 0.20, 0.15, 0.10) sont établies 
par analyse de la littérature sur le Lean Software Development et le Kanban Guide 2025.
Elles n'ont pas été validées empiriquement dans le cadre de ce mémoire.

Cette limitation doit être explicitement mentionnée en section 4.3 (analyse critique).

**Défense en soutenance** : "Ces pondérations constituent une proposition 
méthodologique fondée sur la littérature existante. Une validation empirique 
sur plusieurs équipes constitue une perspective de recherche future."
