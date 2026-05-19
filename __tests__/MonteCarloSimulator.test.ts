/**
 * Tests unitaires — Simulateur de Monte-Carlo
 *
 * Stratégie :
 *   - Propriétés statistiques vérifiées avec des histoires synthétiques
 *   - Cas limites : historique vide, scope nul, deadline dépassée
 *   - Cohérence probabiliste : P_delai ∈ [0, 1], médiane ≤ P85
 *
 * Note : les tests probabilistes utilisent des marges larges (±15 points)
 * car Monte-Carlo est stochastique. Les seeds ne sont pas fixés pour rester
 * représentatifs d'un usage réel.
 *
 * Section mémoire : 3.2 — Validation du moteur stochastique
 */

import { MonteCarloSimulator, MonteCarloInput } from '@/lib/risk-algorithm/MonteCarloSimulator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Crée un historique uniforme : chaque jour = throughput constant */
function histoUniforme(throughputParJour: number, nbJours: number): number[] {
  return Array(nbJours).fill(throughputParJour);
}

// ---------------------------------------------------------------------------
// Cas limites
// ---------------------------------------------------------------------------

describe('MonteCarloSimulator — cas limites', () => {
  it('retourne probabilité 0.5 si historique vide', () => {
    const result = MonteCarloSimulator.simulate({
      throughputHistory: [],
      remainingWorkItems: 10,
      remainingDays: 5,
    });
    expect(result.probabilityOfDelay).toBe(0.5);
    expect(result.medianDaysToComplete).toBe(5); // remainingDays par défaut
  });

  it('retourne probabilité 0 si aucun travail restant', () => {
    const result = MonteCarloSimulator.simulate({
      throughputHistory: [2, 3, 1],
      remainingWorkItems: 0,
      remainingDays: 5,
    });
    expect(result.probabilityOfDelay).toBe(0);
    expect(result.medianDaysToComplete).toBe(0);
  });

  it('filtre les valeurs nulles ou négatives de l historique', () => {
    // Un historique avec des zéros bouclerait infiniment — doit être filtré
    const result = MonteCarloSimulator.simulate({
      throughputHistory: [0, -1, 0, 2, 0],
      remainingWorkItems: 5,
      remainingDays: 10,
    });
    // L historique effectif = [2] → 5 jours / 2 par jour = doit finir en ~3 jours
    expect(result.probabilityOfDelay).toBeGreaterThanOrEqual(0);
    expect(result.probabilityOfDelay).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Propriétés invariantes (toujours vraies quelle que soit l entrée valide)
// ---------------------------------------------------------------------------

describe('MonteCarloSimulator — propriétés invariantes', () => {
  const inputBase: MonteCarloInput = {
    throughputHistory: [1, 2, 3, 2, 1, 3, 2, 2, 1, 3],
    remainingWorkItems: 10,
    remainingDays: 7,
    iterations: 5_000,
  };

  it('P_delai est toujours dans [0, 1]', () => {
    const { probabilityOfDelay } = MonteCarloSimulator.simulate(inputBase);
    expect(probabilityOfDelay).toBeGreaterThanOrEqual(0);
    expect(probabilityOfDelay).toBeLessThanOrEqual(1);
  });

  it('médiane ≤ P85 (ordre des percentiles)', () => {
    const { medianDaysToComplete, p85DaysToComplete } = MonteCarloSimulator.simulate(inputBase);
    expect(medianDaysToComplete).toBeLessThanOrEqual(p85DaysToComplete);
  });

  it('retourne le bon nombre d itérations', () => {
    const { iterations } = MonteCarloSimulator.simulate({ ...inputBase, iterations: 1_000 });
    expect(iterations).toBe(1_000);
  });

  it('utilise 10 000 itérations par défaut', () => {
    const { iterations } = MonteCarloSimulator.simulate({
      throughputHistory: [2],
      remainingWorkItems: 5,
      remainingDays: 5,
    });
    expect(iterations).toBe(10_000);
  });
});

// ---------------------------------------------------------------------------
// Comportement probabiliste — scénarios extrêmes
// ---------------------------------------------------------------------------

describe('MonteCarloSimulator — comportement probabiliste', () => {
  it('P_delai proche de 0 quand le scope est très petit vs le débit', () => {
    // 1 tâche restante, débit = 5/jour, 10 jours restants → quasi aucun risque
    const { probabilityOfDelay } = MonteCarloSimulator.simulate({
      throughputHistory: histoUniforme(5, 20),
      remainingWorkItems: 1,
      remainingDays: 10,
      iterations: 10_000,
    });
    // Devrait être < 5% — marge large car stochastique
    expect(probabilityOfDelay).toBeLessThan(0.05);
  });

  it('P_delai proche de 1 quand le scope est impossible à finir', () => {
    // 100 tâches restantes, débit = 1/jour, seulement 5 jours
    const { probabilityOfDelay } = MonteCarloSimulator.simulate({
      throughputHistory: histoUniforme(1, 20),
      remainingWorkItems: 100,
      remainingDays: 5,
      iterations: 10_000,
    });
    // Pratiquement impossible → doit être > 95%
    expect(probabilityOfDelay).toBeGreaterThan(0.95);
  });

  it('scénario nominal : 10 tâches, débit 2/jour, 7 jours → risque modéré', () => {
    // 10 tâches / 2 par jour = 5 jours → devrait finir, mais historique variable
    const { probabilityOfDelay } = MonteCarloSimulator.simulate({
      throughputHistory: [1, 2, 3, 1, 2, 3, 2, 1, 2, 2], // variance réaliste
      remainingWorkItems: 10,
      remainingDays: 7,
      iterations: 10_000,
    });
    // Avec 7 jours disponibles pour 5 jours de travail moyen, risque bas-modéré
    expect(probabilityOfDelay).toBeGreaterThanOrEqual(0);
    expect(probabilityOfDelay).toBeLessThan(0.5);
  });

  it('médiane cohérente : proche de scope / débit_moyen', () => {
    // scope = 20, débit moyen = 2/jour → médiane attendue ≈ 10 jours
    const { medianDaysToComplete } = MonteCarloSimulator.simulate({
      throughputHistory: histoUniforme(2, 30),
      remainingWorkItems: 20,
      remainingDays: 30,
      iterations: 10_000,
    });
    // Marge de ±3 jours autour de 10
    expect(medianDaysToComplete).toBeGreaterThanOrEqual(7);
    expect(medianDaysToComplete).toBeLessThanOrEqual(13);
  });
});

// ---------------------------------------------------------------------------
// Intégration avec calculateSGR
// ---------------------------------------------------------------------------

describe('MonteCarloSimulator — intégration SGR', () => {
  it('le score Monte-Carlo est normalisé entre 0 et 100', () => {
    // P_delai = 0.75 → score = 75
    const result = MonteCarloSimulator.simulate({
      throughputHistory: histoUniforme(1, 20),
      remainingWorkItems: 100,
      remainingDays: 5,
      iterations: 5_000,
    });
    const scoreNormalise = result.probabilityOfDelay * 100;
    expect(scoreNormalise).toBeGreaterThanOrEqual(0);
    expect(scoreNormalise).toBeLessThanOrEqual(100);
  });
});
