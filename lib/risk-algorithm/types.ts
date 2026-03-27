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

/** Données de dette technique issues de SonarQube (optionnel) */
export interface SGRTechDebt {
  bugsBloquants: number;       // Bugs de sévérité "blocker" ou "critical"
  codeSmells: number;          // Nombre total de code smells
  detteTechniqueDays: number;  // Dette technique en jours-homme
}

/** Paramètres complets passés à calculateSGR */
export interface SGRInput {
  tasks: SGRTask[];
  columnConfigs: SGRColumnConfig[];
  techDebt?: SGRTechDebt; // Absent si SonarQube non intégré
  dateReference?: Date;   // Par défaut : Date.now() — utile pour les tests
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
  /** Détail de chaque indicateur */
  indicateurs: {
    wip: SGRIndicator;
    cycleTime: SGRIndicator;
    age: SGRIndicator;
    throughput: SGRIndicator;
    tech: SGRIndicator;
  };
  /** Avertissements lisibles pour l'interface */
  alertes: string[];
}

// ---------------------------------------------------------------------------
// Constantes de pondération
// ---------------------------------------------------------------------------

export const POIDS_SGR = {
  WIP: 0.30,
  CYCLE_TIME: 0.25,
  AGE: 0.20,
  THROUGHPUT: 0.15,
  TECH: 0.10,
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
