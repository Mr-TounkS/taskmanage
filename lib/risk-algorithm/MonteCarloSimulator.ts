/**
 * Moteur de Simulation de Monte-Carlo pour l'estimation stochastique des délais.
 *
 * Méthode : Bootstrap sampling sur l'historique empirique du débit (Throughput).
 * Chaque itération simule l'avancement jour par jour jusqu'à épuisement du scope
 * restant, en tirant aléatoirement un débit historique (échantillonnage avec remise).
 *
 * Référence mathématique — Section mémoire 3.2 :
 *   P_delai = (1/N) * Σ 𝟙(D_sim,i > D_dispo)
 *
 * Complexité : O(N × S_restant / t_moyen) — linéaire en nombre d'itérations.
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface MonteCarloInput {
  /** Nombre de tâches terminées par jour sur les sprints précédents */
  throughputHistory: number[];
  /** Tâches restantes dans le sprint actuel */
  remainingWorkItems: number;
  /** Jours ouvrés restants avant la date butoir */
  remainingDays: number;
  /** Nombre d'itérations — recommandé : 10 000 */
  iterations?: number;
}

/** Un point de la distribution pour le graphique de visualisation */
export interface HistogramBucket {
  /** Jour central du bucket (axe X) */
  day: number;
  /** Fréquence relative en % (axe Y) */
  frequency: number;
  /** true si ce bucket est au-delà de la deadline (zone rouge) */
  isDelay: boolean;
}

export interface MonteCarloResult {
  /** Probabilité stochastique de dérive temporelle P_delai ∈ [0, 1] */
  probabilityOfDelay: number;
  /** Médiane des durées simulées (jours) */
  medianDaysToComplete: number;
  /** 85e percentile (Service Level Expectation) */
  p85DaysToComplete: number;
  /** Nombre d'itérations effectuées */
  iterations: number;
  /**
   * Distribution des durées simulées en 20 buckets pour la visualisation.
   * Permet de tracer la courbe de distribution avec les lignes verticales
   * (deadline rouge, médiane verte) — section mémoire 3.2.
   */
  histogram: HistogramBucket[];
  /** Jours restants avant la deadline (= ligne rouge sur le graphique) */
  remainingDays: number;
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Nombre d'itérations par défaut pour une précision statistique acceptable (±1%) */
const DEFAULT_ITERATIONS = 10_000;

/** Facteur de sécurité : stoppe la simulation si elle dépasse ce multiple de remainingDays */
const SIMULATION_CAP_FACTOR = 5;

/** Nombre de buckets pour l'histogramme de distribution */
const HISTOGRAM_BUCKETS = 20;

// ---------------------------------------------------------------------------
// Utilitaires internes
// ---------------------------------------------------------------------------

/**
 * Calculates the Nth percentile of a sorted numeric array (nearest-rank method).
 */
function percentileOf(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Valide que l'historique contient des données exploitables.
 * Filtre les valeurs nulles ou négatives qui fausseraient la simulation.
 */
function sanitizeHistory(history: number[]): number[] {
  return history.filter((v) => Number.isFinite(v) && v > 0);
}

/**
 * Construit un histogramme de distribution à partir des jours simulés.
 * Divise la plage [min, max] en HISTOGRAM_BUCKETS intervalles égaux.
 * Chaque bucket contient la fréquence relative (%) des simulations.
 */
function buildHistogram(
  sortedDays: number[],
  remainingDays: number
): HistogramBucket[] {
  if (sortedDays.length === 0) return [];

  const min = sortedDays[0];
  const max = sortedDays[sortedDays.length - 1];
  const range = Math.max(max - min, 1);
  const bucketSize = range / HISTOGRAM_BUCKETS;

  const counts = new Array(HISTOGRAM_BUCKETS).fill(0);
  for (const d of sortedDays) {
    const idx = Math.min(
      Math.floor((d - min) / bucketSize),
      HISTOGRAM_BUCKETS - 1
    );
    counts[idx]++;
  }

  const total = sortedDays.length;
  return counts.map((count, i) => {
    const day = Math.round(min + i * bucketSize + bucketSize / 2);
    return {
      day,
      frequency: Math.round((count / total) * 100 * 10) / 10,
      isDelay: day > remainingDays,
    };
  });
}

// ---------------------------------------------------------------------------
// Simulateur principal
// ---------------------------------------------------------------------------

export class MonteCarloSimulator {
  /**
   * Exécute la simulation de Monte-Carlo par Bootstrap sampling.
   *
   * Si l'historique est vide ou invalide, retourne une probabilité neutre de 0.5
   * (incertitude maximale) plutôt qu'une valeur arbitraire.
   *
   * @param input - Paramètres de simulation
   * @returns Résultat probabiliste incluant P_delai, médiane et P85
   */
  public static simulate(input: MonteCarloInput): MonteCarloResult {
    const iterations = input.iterations ?? DEFAULT_ITERATIONS;
    const history = sanitizeHistory(input.throughputHistory);

    // Cas dégénéré : historique insuffisant → incertitude maximale
    if (history.length === 0) {
      return {
        probabilityOfDelay: 0.5,
        medianDaysToComplete: input.remainingDays,
        p85DaysToComplete: Math.ceil(input.remainingDays * 1.5),
        iterations,
        histogram: [],
        remainingDays: input.remainingDays,
      };
    }

    // Cas trivial : aucun travail restant
    if (input.remainingWorkItems <= 0) {
      return {
        probabilityOfDelay: 0,
        medianDaysToComplete: 0,
        p85DaysToComplete: 0,
        iterations,
        histogram: [],
        remainingDays: input.remainingDays,
      };
    }

    const cap = input.remainingDays * SIMULATION_CAP_FACTOR;
    let delayCount = 0;
    const simulatedDays: number[] = new Array(iterations);

    for (let i = 0; i < iterations; i++) {
      let scope = input.remainingWorkItems;
      let days = 0;

      // Simulation jour par jour par Bootstrap sampling (tirage avec remise)
      while (scope > 0 && days < cap) {
        const idx = Math.floor(Math.random() * history.length);
        scope -= history[idx];
        days++;
      }

      simulatedDays[i] = days;
      if (days > input.remainingDays) delayCount++;
    }

    simulatedDays.sort((a, b) => a - b);

    return {
      probabilityOfDelay: delayCount / iterations,
      medianDaysToComplete: percentileOf(simulatedDays, 50),
      p85DaysToComplete: percentileOf(simulatedDays, 85),
      iterations,
      histogram: buildHistogram(simulatedDays, input.remainingDays),
      remainingDays: input.remainingDays,
    };
  }
}
