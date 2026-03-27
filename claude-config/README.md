# 🚀 Guide d'Installation — Claude Code Configuration

## Structure des fichiers à copier

```
Votre projet/
├── CLAUDE.md                          ← Copier ici (racine du projet)
└── .claude/
    ├── settings.json                  ← Configuration + sécurité
    ├── validate-command.js            ← Hook de sécurité
    ├── auto-journal.js               ← Hook journal automatique
    ├── rules/
    │   └── code-style.md             ← Règles de code
    ├── skills/
    │   ├── code-engineer/SKILL.md    ← /code-engineer
    │   ├── memoire-writer/SKILL.md   ← /memoire-writer
    │   ├── journal-bord/SKILL.md     ← /journal-bord
    │   ├── risk-tracker/SKILL.md     ← /risk-tracker
    │   └── test-validator/SKILL.md   ← /test-validator
    └── agents/
        ├── architect.md              ← @architect
        ├── redacteur.md              ← @redacteur
        └── reviewer.md               ← @reviewer
```

---

## Installation en 3 étapes

### Étape 1 — Copier les fichiers
```bash
# Depuis la racine de votre projet PWA
cp -r claude-config/CLAUDE.md ./CLAUDE.md
cp -r claude-config/.claude ./.claude
```

### Étape 2 — Installer Claude Code (si pas déjà fait)
```bash
npm install -g @anthropic-ai/claude-code
```

### Étape 3 — Alias de confort (ajouter dans ~/.zshrc ou ~/.bashrc)
```bash
# Lancer Claude Code avec bypass permissions + hook sécurité
alias cc="claude --dangerously-skip-permissions"

# Continuer la dernière conversation
alias ccc="claude --dangerously-skip-permissions -c"

# Mode planification uniquement (pas de code)
alias ccplan="claude --dangerously-skip-permissions -p"
```

---

## Utilisation quotidienne

### Coder une feature
```
/code-engineer implémenter le tableau Kanban avec drag & drop
```

### Rédiger une section du mémoire
```
/memoire-writer 3.2 Implémentation du tableau Kanban
```

### Documenter une décision
```
/journal-bord choix de Prisma plutôt que TypeORM pour l'ORM
```

### Tracker un risque
```
/risk-tracker l'intégration SonarQube prend plus de temps que prévu
```

### Valider le code
```
/test-validator module SGR — calculateur de score
```

### Agents spécialisés
```
@architect quelle architecture pour le module de notifications push ?
@redacteur rédige la section 2.1 sur l'architecture PWA
@reviewer révise le fichier src/lib/risk-algorithm/calculator.ts
```

---

## Commandes utiles Claude Code

```bash
claude /usage          # Voir l'utilisation et les limites
claude /memory         # Éditer les fichiers mémoire
claude /init           # Bootstrapper un CLAUDE.md de base
```

---

## Structure docs/ recommandée pour le projet

```
docs/
├── journal-de-bord/
│   ├── INDEX.md                    ← Table des matières auto
│   ├── 2025-01-XX-decision-*.md   ← Entrées par date
│   └── weekly-summary-semaine-N.md
├── registre-risques.md             ← Tableau des risques (mis à jour)
├── architecture-decisions/         ← ADR (Architecture Decision Records)
│   └── ADR-001-clean-architecture.md
└── memoire-drafts/                 ← Brouillons des sections
    ├── chap1-litterature.md
    ├── chap2-conception.md
    ├── chap3-realisation.md
    └── chap4-tests.md
```
