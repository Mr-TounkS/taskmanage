# Guide d'installation — Claude Code Configuration

## Structure des fichiers à déployer

```
Ton projet PWA/
├── CLAUDE.md                          ← Cerveau global (copier ici)
├── .claude/
│   ├── settings.json                  ← Permissions + hooks de sécurité
│   ├── validate-command.js            ← Hook sécurité bash
│   ├── commands/
│   │   ├── feature.md                 ← /feature [nom]
│   │   ├── redige-section.md          ← /redige-section [2.1]
│   │   ├── note.md                    ← /note [incident]
│   │   ├── sgr.md                     ← /sgr [métriques]
│   │   └── review.md                  ← /review [fichier]
│   ├── skills/
│   │   ├── code-engineer/SKILL.md     ← Auto: quand tu codes
│   │   ├── memoire-writer/SKILL.md    ← Auto: quand tu rédiges
│   │   ├── journal-reflexif/SKILL.md  ← Auto: quand tu dis "note"
│   │   ├── risk-tracker/SKILL.md      ← Auto: quand tu dis "risque"
│   │   └── agile-advisor/SKILL.md     ← Auto: questions Agile/Kanban
│   └── agents/
│       ├── tech-reviewer.md           ← Revue code en parallèle
│       └── memoire-section-writer.md  ← Rédaction section en sous-agent
└── docs/
    ├── journal-reflexif.md            ← Journal de bord (alimenté auto)
    ├── architecture-decisions.md      ← ADR (alimenté après chaque décision)
    ├── risques.md                     ← Registre des risques
    └── sgr-algorithm.md               ← Spec complète de l'algorithme

```

---

## Installation en 4 étapes

### Étape 1 — Installer Claude Code
```bash
npm install -g @anthropic-ai/claude-code
```

### Étape 2 — Configurer les alias (ajoute dans ~/.zshrc ou ~/.bashrc)
```bash
# Lance Claude Code sans devoir confirmer chaque action
alias cc="claude --dangerously-skip-permissions"

# Continue la dernière conversation
alias ccc="claude --dangerously-skip-permissions -c"
```

### Étape 3 — Copier les fichiers dans ton projet
```bash
# Depuis la racine de ton projet PWA :
cp -r /chemin/vers/ce-dossier/.claude ./
cp -r /chemin/vers/ce-dossier/docs ./
cp /chemin/vers/ce-dossier/CLAUDE.md ./
```

### Étape 4 — Vérifier l'installation
```bash
cc  # Démarre Claude Code
# Puis dans Claude Code :
/help          # Vérifie que tes commandes apparaissent
/feature test  # Test du workflow EPCT
```

---

## Commandes disponibles

| Commande | Usage | Déclencheur |
|----------|-------|-------------|
| `/feature [nom]` | Implémenter une fonctionnalité (EPCT) | Manuel |
| `/redige-section [2.1]` | Rédiger une section du mémoire | Manuel |
| `/note [incident]` | Entrée journal de bord | Manuel ou "note ..." |
| `/sgr [métriques]` | Calculer/analyser le SGR | Manuel ou "risque ..." |
| `/review [fichier]` | Revue code 3 dimensions | Manuel |

## Skills auto-invoqués

| Skill | Déclencheur automatique |
|-------|------------------------|
| `code-engineer` | Quand tu demandes de coder |
| `memoire-writer` | Quand tu demandes de rédiger |
| `journal-reflexif` | Quand tu dis "note" ou "incident" |
| `risk-tracker` | Quand tu dis "risque" ou "bloquant" |
| `agile-advisor` | Questions Scrum/Kanban/SGR |

---

## Meta-prompts utiles à connaître

### Démarrer une session de développement
```
"Je veux implémenter [fonctionnalité]. Lis les fichiers concernés et 
propose un plan avant de coder."
```

### Convertir du code en contenu mémoire
```
"On vient d'implémenter [X]. Rédige la section [2.3] du mémoire 
en utilisant cette implémentation comme base."
```

### Documenter une décision
```
"note : J'ai décidé de [X] plutôt que [Y] parce que [raison]. 
Ajoute ça au journal et identifie la section du mémoire concernée."
```

### Analyse de risque rapide
```
"sgr : WIP=8 sur limite 5, CT=9j vs moyenne 6j, 3 bugs SonarQube.
Qu'est-ce que ça donne comme score et quelle action dois-je prendre ?"
```
