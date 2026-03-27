# Journal de Bord Réflexif — PWA Kanban Tool

> Ce journal alimente la section 4.2 du mémoire : 
> "Étude de cas : Application de l'outil à son propre développement"

---

## Entrée #1 — [DATE DE DÉBUT]

### Déclencheur
Initialisation du projet — Choix de la Clean Architecture

### Contexte technique
- SGR : N/A (projet non encore démarré)
- Indicateurs : N/A

### Décision prise
Adopter la Clean Architecture plutôt que l'architecture en couches classique.
Alternatives considérées : Layered Architecture, DDD complet, Architecture Hexagonale
Raison du choix : Maintenabilité > 70% couverture tests, isolation de la logique SGR, 
indépendance des frameworks externes (PostgreSQL, GitHub API, SonarQube)

### Impact observé
- Sur le code : Structure en 4 couches (domain / infrastructure / presentation / shared)
- Sur le SGR : Non mesurable à ce stade
- Sur le calendrier : +2 jours de setup initial estimés

### Leçon pour le mémoire
- Section concernée : Chapitre 2, section 2.1
- Enseignement : Le choix architectural est directement conditionné par l'exigence 
  de testabilité (NFR : couverture > 70%) et par la nécessité d'isoler la logique SGR 
  de tout framework externe — validant la pertinence de la Clean Architecture pour 
  ce type de projet.
- Question de soutenance potentielle : "Pourquoi avoir choisi la Clean Architecture 
  plutôt qu'une architecture hexagonale, qui offre des garanties similaires ?"
