/**
 * Types partagés pour l'algorithme SGR (Score Global de Risque)
 * Section mémoire : 2.3
 */

// ---------------------------------------------------------------------------
// Données d'entrée
// ---------------------------------------------------------------------------

/** Snapshot d'une tâche nécessaire au calcul SGR */
export interface SGRTask {
  id: string;
  status: string;          // "To Do" | "In Progress" | "Done"
  startedAt: Date | null;  // Rempli au passage en "In Progress"
  completedAt: Date | null;// Rempli au passage en "Done"
}

/** Limite WIP déclarée pour une colonne Kanban */
export interface SGRColumnConfig {
  column: string;   // "To Do" | "In Progress" | "Done"
  wipLimit: number; // 0 = pas de limite
}

/** Données d'activité GitHub — alimente R_Dev (section 3.3) */
export interface SGRGitHubActivity {
  prOpen: number;       // Nombre de PRs ouvertes au moment du calcul
  prDelayDays: number;  // Délai moyen (jours) entre ouverture et merge
  prStuck: number;      // Nombre de PRs sans activité depuis > 7 jours
}

/** Données de dette technique issues de Codacy (optionnel) */
export interface SGRTechDebt {
  bugsBloquants: number;       // Bugs de sévérité "blocker" ou "critical"
  codeSmells: number;          // Nombre total de code smells
  detteTechniqueDays: number;  // Dette technique en jours-homme
}

/** Paramètres complets passés à calculateSGR */
export interface SGRInput {
  tasks: SGRTask[];
  columnConfigs: SGRColumnConfig[];
  techDebt?: SGRTechDebt;             // Absent si Codacy non intégré
  githubActivity?: SGRGitHubActivity; // Absent si GitHub non intégré
  dateReference?: Date;               // Par défaut : Date.now() — utile pour les tests
}

// ---------------------------------------------------------------------------
// Résultat du calcul
// ---------------------------------------------------------------------------

/** Détail d'un indicateur individuel */
export interface SGRIndicator {
  /** Score normalisé [0, 100] */
  score: number;
  /** Pondération dans la formule SGR */
  weight: number;
  /** Contribution pondérée au score final */
  contribution: number;
  /** Données brutes utilisées pour le calcul */
  details: Record<string, number | string>;
}

/** Résultat complet retourné par calculateSGR */
export interface SGRResult {
  /** Score Global de Risque [0, 100] */
  sgr: number;
  /** Niveau de risque interprété */
  niveau: 'faible' | 'modéré' | 'élevé' | 'critique';
  /** Sous-scores des trois dimensions */
  dimensions: {
    flow: number;     // R_flow
    dev: number;      // R_dev
    quality: number;  // R_quality
  };
  /** Détail de chaque indicateur */
  indicateurs: {
    wip: SGRIndicator;
    cycleTime: SGRIndicator;
    age: SGRIndicator;
    throughput: SGRIndicator;
    /** Présent uniquement si GitHub est intégré */
    github?: SGRIndicator;
    tech: SGRIndicator;
  };
  /** Avertissements lisibles pour l'interface */
  alertes: string[];
}

// ---------------------------------------------------------------------------
// Constantes de pondération
// ---------------------------------------------------------------------------

/** Pondérations des trois dimensions (λ1, λ2, λ3) */
export const POIDS_SGR = {
  FLOW: 0.50,
  DEV: 0.30,
  QUALITY: 0.20,
} as const;

/** Pondérations internes des sous-indicateurs */
export const POIDS_INTERNES = {
  FLOW: {
    WIP: 0.40,
    CT: 0.30,
    AGE: 0.20,
    THROUGHPUT: 0.10,
  },
  DEV: {
    PR_OPEN: 0.40,
    PR_DELAY: 0.30,
    PR_STUCK: 0.30,
  },
  QUALITY: {
    BUGS: 0.50,
    DEBT: 0.30,
    SMELLS: 0.20,
  },
} as const;

/** Seuils critiques pour la normalisation des métriques GitHub */
export const VALEURS_CRITIQUES = {
  PR_OPEN: 10,
  PR_DELAY_DAYS: 14,
  PR_STUCK: 5,
  BUGS_CRIT: 5,
  DEBT_DAYS: 5,
  SMELLS: 50,
} as const;

/** Seuils de classification du SGR */
export const SEUILS_SGR = {
  FAIBLE: 30,
  MODERE: 60,
  ELEVE: 80,
} as const;

/** Percentile utilisé pour le Service Level Expectation (SLE) */
export const PERCENTILE_SLE = 85;

/** Fenêtre d'observation pour le Throughput en jours */
export const FENETRE_THROUGHPUT_DAYS = 90;
