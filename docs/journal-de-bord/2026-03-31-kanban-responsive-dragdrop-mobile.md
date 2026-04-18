# Journal de Bord — 2026-03-31

## KanbanCard responsive + fix drag-and-drop mobile

**Type** : FIX + AMÉLIORATION UI
**Section mémoire** : 3.2.1 (tableau Kanban), 3.2.3 (responsive/PWA)
**Impact SGR** : Amélioration UX mobile — R_Tech diminué

---

### Contexte

Le tableau Kanban présentait deux problèmes majeurs sur mobile :
1. **Informations tassées** : noms, dates, badges illisibles sur petit écran
2. **Bouton "Détails" non cliquable** : le drag-and-drop interceptait les clics

### Problème 1 : Responsive design

**Symptôme** : Sur mobile (< 1024px), les 3 colonnes Kanban tentaient de s'afficher
côté à côté, rendant les cartes illisibles.

**Solution — Progressive Disclosure :**
- **Mobile** : colonnes en scroll horizontal, cartes compactes
  - Prénom uniquement (pas nom complet)
  - Dates en format court (JJ/MM)
  - Badges priorité sans label texte (icone seule)
  - "En retard" → badge compact "Retard"
- **Desktop (≥ 1024px)** : affichage complet
  - Nom complet + email
  - Dates avec labels ("Début :", "Livraison :")
  - Badges avec labels texte

**Breakpoint** : changé de `md` (768px) à `lg` (1024px) pour le passage en grille.

### Problème 2 : Drag-and-drop vs clic

**Symptôme** : Sur mobile (Chrome DevTools device toolbar), cliquer sur "Détails"
ne faisait rien — le drag-and-drop interceptait l'événement tactile.

**Cause** : `dragHandleProps` était appliqué sur le `<div>` parent qui englobait
aussi les boutons d'action.

**Solution** : Séparation de la zone de drag :
```tsx
// Avant : tout le card est draggable
<div {...provided.dragHandleProps}>
  {/* contenu + boutons */}
</div>

// Après : seul le contenu est draggable, pas les boutons
<div>
  <div {...provided.dragHandleProps}>
    {/* contenu : titre, assigné, dates */}
  </div>
  {/* boutons hors de la zone de drag */}
  <div className="flex items-center gap-1.5">
    <Link href={...}>Détails</Link>
    <button onClick={...}>Supprimer</button>
  </div>
</div>
```

### Lecons apprises

1. **Progressive disclosure** : sur mobile, montrer l'essentiel, cacher le reste.
   Pattern UX fondamental pour les PWA responsive.
2. **dragHandleProps** : dans @hello-pangea/dnd, il faut toujours séparer la zone
   de drag de la zone d'interaction (liens, boutons). Sur desktop la souris
   distingue drag/clic, mais sur mobile les événements tactiles sont ambigus.
3. **Breakpoints** : `lg` (1024px) est plus adapté que `md` (768px) pour passer
   d'une vue mobile à une vue desktop sur un Kanban à 3 colonnes.

### Lien avec le mémoire

Illustre la **SQ2** (mobilité) : l'interface s'adapte au contexte d'utilisation
(bureau vs terrain). Le pattern progressive disclosure est un exemple concret
de design responsive pour une PWA de gestion de projet (section 3.2.3).

---

*Rédigé le 2026-03-31*
