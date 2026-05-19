/**
 * Algorithme SGR — Score Global de Risque
 *
 * Formule académique : SGR = λ1*R_flow + λ2*R_dev + λ3*R_quality
 *
 * Section mémoire : 2.3 — Algorithme SGR
 */

import {
  SGRInput,
  SGRResult,
  SGRIndicator,
  SGRTask,
  SGRTechDebt,
  SGRGitHubActivity,
  SGRColumnConfig,
  SprintContext,
  POIDS_SGR,
  POIDS_INTERNES,
  SEUILS_SGR,
  VALEURS_CRITIQUES,
  PERCENTILE_SLE,
  FENETRE_THROUGHPUT_DAYS,
} from './types';
import { MonteCarloSimulator } from './MonteCarloSimulator';

// ---------------------------------------------------------------------------
// Utilitaires internes
// ---------------------------------------------------------------------------

/**
 * Clamp a value between 0 and 100.
 */
function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/**
 * Calculate the Nth percentile of a sorted numeric array.
 * Uses the "nearest rank" method.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calcule le Cycle Time d'une tâche en jours.
 */
function cycletime(task: SGRTask): number | null {
  if (!task.startedAt || !task.completedAt) return null;
  const msParJour = 1000 * 60 * 60 * 24;
  return (task.completedAt.getTime() - task.startedAt.getTime()) / msParJour;
}

/**
 * Calcule l'âge d'une tâche en cours en jours (Work Item Age).
 */
function workItemAge(task: SGRTask, maintenant: Date): number | null {
  if (!task.startedAt) return null;
  const msParJour = 1000 * 60 * 60 * 24;
  return (maintenant.getTime() - task.startedAt.getTime()) / msParJour;
}

// ---------------------------------------------------------------------------
// Indicateurs de base
// ---------------------------------------------------------------------------

function calculerRWIP(tasks: SGRTask[], configs: SGRColumnConfig[]): SGRIndicator {
  const colonnesAvecLimite = configs.filter((c) => c.wipLimit > 0);
  if (colonnesAvecLimite.length === 0) {
    return { score: 0, weight: POIDS_INTERNES.FLOW.WIP, contribution: 0, details: {} };
  }

  const violations = colonnesAvecLimite.map(config => {
    const wipActuel = tasks.filter((t) => t.status === config.column).length;
    return clamp((Math.max(0, wipActuel - config.wipLimit) / config.wipLimit) * 100);
  });

  const score = Math.max(...violations);
  return { score, weight: POIDS_INTERNES.FLOW.WIP, contribution: score * POIDS_INTERNES.FLOW.WIP, details: {} };
}

function calculerRCT(tasks: SGRTask[], maintenant: Date): SGRIndicator {
  const tachesTerminees = tasks.filter(t => t.status === 'Done' && t.startedAt && t.completedAt);
  if (tachesTerminees.length < 2) return { score: 0, weight: POIDS_INTERNES.FLOW.CT, contribution: 0, details: {} };

  const cycleTimes = tachesTerminees.map(cycletime).filter((ct): ct is number => ct !== null).sort((a, b) => a - b);
  const ctMoyenne = cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length;
  
  const recentes = tachesTerminees.sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime()).slice(0, 5);
  const ctRecents = recentes.map(cycletime).filter((ct): ct is number => ct !== null);
  const ctActuel = ctRecents.reduce((a, b) => a + b, 0) / ctRecents.length;

  const score = clamp(ctMoyenne > 0 ? ((ctActuel - ctMoyenne) / ctMoyenne) * 100 : 0);
  return { score, weight: POIDS_INTERNES.FLOW.CT, contribution: score * POIDS_INTERNES.FLOW.CT, details: {} };
}

function calculerRAge(tasks: SGRTask[], maintenant: Date): SGRIndicator {
  const enCours = tasks.filter(t => t.status === 'In Progress' && t.startedAt);
  if (enCours.length === 0) return { score: 0, weight: POIDS_INTERNES.FLOW.AGE, contribution: 0, details: {} };

  const cycleTimes = tasks.filter(t => t.status === 'Done' && t.startedAt && t.completedAt)
    .map(cycletime).filter((ct): ct is number => ct !== null).sort((a, b) => a - b);
  
  const sle85 = cycleTimes.length > 0 ? percentile(cycleTimes, PERCENTILE_SLE) : Infinity;
  const ages = enCours.map(t => workItemAge(t, maintenant)).filter((age): age is number => age !== null);
  const tachesAuDelaSLE = ages.filter(age => age > sle85).length;
  
  const score = clamp((tachesAuDelaSLE / enCours.length) * 100);
  return { score, weight: POIDS_INTERNES.FLOW.AGE, contribution: score * POIDS_INTERNES.FLOW.AGE, details: {} };
}

function calculerRThroughput(tasks: SGRTask[], maintenant: Date): SGRIndicator {
  // Si aucune tâche active (tout est Done), le débit n'est pas un risque
  const tachesActives = tasks.filter(t => t.status !== 'Done');
  if (tachesActives.length === 0) {
    return { score: 0, weight: POIDS_INTERNES.FLOW.THROUGHPUT, contribution: 0, details: {} };
  }

  const msParJour = 1000 * 60 * 60 * 24;
  const debut90j = new Date(maintenant.getTime() - FENETRE_THROUGHPUT_DAYS * msParJour);
  const debut7j = new Date(maintenant.getTime() - 7 * msParJour);

  const terminees = tasks.filter(t => t.status === 'Done' && t.completedAt !== null);
  const taches90j = terminees.filter(t => t.completedAt! >= debut90j);
  if (taches90j.length === 0) return { score: 0, weight: POIDS_INTERNES.FLOW.THROUGHPUT, contribution: 0, details: {} };

  const thMoyen = (taches90j.length / FENETRE_THROUGHPUT_DAYS) * 7;
  const thActuel = terminees.filter(t => t.completedAt! >= debut7j).length;

  const score = clamp(thMoyen > 0 ? ((thMoyen - thActuel) / thMoyen) * 100 : 0);
  return { score, weight: POIDS_INTERNES.FLOW.THROUGHPUT, contribution: score * POIDS_INTERNES.FLOW.THROUGHPUT, details: {} };
}

/**
 * Calcule l'indicateur Monte-Carlo (R_MC) à partir du SprintContext.
 * Transforme P_delai ∈ [0, 1] en score ∈ [0, 100] pour homogénéité.
 * Retourne null si le contexte sprint est absent (indicateur désactivé).
 */
function calculerRMonteCarlo(
  sprint: SprintContext,
  maintenant: Date
): (SGRIndicator & {
  probabilityOfDelay: number;
  medianDaysToComplete: number;
  p85DaysToComplete: number;
  histogram: import('./MonteCarloSimulator').HistogramBucket[];
  remainingDays: number;
}) | null {
  const msParJour = 1000 * 60 * 60 * 24;
  const remainingDays = Math.max(
    0,
    Math.ceil((sprint.sprintEndDate.getTime() - maintenant.getTime()) / msParJour)
  );

  const result = MonteCarloSimulator.simulate({
    throughputHistory: sprint.throughputHistory,
    remainingWorkItems: sprint.remainingWorkItems,
    remainingDays,
    iterations: 10_000,
  });

  const score = clamp(result.probabilityOfDelay * 100);

  return {
    score,
    weight: POIDS_INTERNES.FLOW_MONTE_CARLO.MONTE_CARLO,
    contribution: score * POIDS_INTERNES.FLOW_MONTE_CARLO.MONTE_CARLO,
    details: {
      probabilityOfDelay: result.probabilityOfDelay,
      medianDaysToComplete: result.medianDaysToComplete,
      p85DaysToComplete: result.p85DaysToComplete,
      remainingDays,
    },
    probabilityOfDelay: result.probabilityOfDelay,
    medianDaysToComplete: result.medianDaysToComplete,
    p85DaysToComplete: result.p85DaysToComplete,
    histogram: result.histogram,
    remainingDays,
  };
}

function calculerRDev(github?: SGRGitHubActivity): SGRIndicator {
  if (!github) return { score: 0, weight: POIDS_SGR.DEV, contribution: 0, details: {} };

  const scoreOpen = clamp((github.prOpen / VALEURS_CRITIQUES.PR_OPEN) * 100);
  const scoreDelay = clamp((github.prDelayDays / VALEURS_CRITIQUES.PR_DELAY_DAYS) * 100);
  const scoreStuck = clamp((github.prStuck / VALEURS_CRITIQUES.PR_STUCK) * 100);

  const score = clamp(
    scoreOpen * POIDS_INTERNES.DEV.PR_OPEN +
    scoreDelay * POIDS_INTERNES.DEV.PR_DELAY +
    scoreStuck * POIDS_INTERNES.DEV.PR_STUCK
  );

  return { score, weight: POIDS_SGR.DEV, contribution: score * POIDS_SGR.DEV, details: { prOpen: github.prOpen, prDelayDays: github.prDelayDays, prStuck: github.prStuck } };
}

function calculerRQuality(techDebt?: SGRTechDebt): SGRIndicator {
  if (!techDebt) return { score: 0, weight: POIDS_SGR.QUALITY, contribution: 0, details: {} };

  const scoreBugs = clamp((techDebt.bugsBloquants / VALEURS_CRITIQUES.BUGS_CRIT) * 100);
  const scoreDette = clamp((techDebt.detteTechniqueDays / VALEURS_CRITIQUES.DEBT_DAYS) * 100);
  const scoreSmells = clamp((techDebt.codeSmells / VALEURS_CRITIQUES.SMELLS) * 100);

  const score = clamp(
    scoreBugs * POIDS_INTERNES.QUALITY.BUGS +
    scoreDette * POIDS_INTERNES.QUALITY.DEBT +
    scoreSmells * POIDS_INTERNES.QUALITY.SMELLS
  );

  return { score, weight: POIDS_SGR.QUALITY, contribution: score * POIDS_SGR.QUALITY, details: { bugsBloquants: techDebt.bugsBloquants, codeSmells: techDebt.codeSmells, detteTechniqueDays: techDebt.detteTechniqueDays } };
}

// ---------------------------------------------------------------------------
// Interprétation
// ---------------------------------------------------------------------------

function interpreterNiveau(sgr: number): SGRResult['niveau'] {
  if (sgr <= SEUILS_SGR.FAIBLE) return 'low';
  if (sgr <= SEUILS_SGR.MODERE) return 'moderate';
  if (sgr <= SEUILS_SGR.ELEVE) return 'high';
  return 'critical';
}

function genererAlertes(indicateurs: SGRResult['indicateurs']): string[] {
  const alertes: string[] = [];
  if (indicateurs.wip.score > 0) alertes.push(`WIP limit exceeded (${Math.round(indicateurs.wip.score)}%)`);
  if (indicateurs.github && indicateurs.github.score > 30) alertes.push(`GitHub activity at risk (${Math.round(indicateurs.github.score)}%)`);
  if (indicateurs.tech.score > 30) alertes.push(`High technical debt (${Math.round(indicateurs.tech.score)}%)`);
  if (indicateurs.monteCarlo) {
    const p = Math.round(indicateurs.monteCarlo.probabilityOfDelay * 100);
    if (p >= 70) alertes.push(`Monte-Carlo: ${p}% probability of sprint delay (P85 = ${indicateurs.monteCarlo.p85DaysToComplete}d)`);
  }
  return alertes;
}

// ---------------------------------------------------------------------------
// Export principal
// ---------------------------------------------------------------------------

export function calculateSGR(input: SGRInput): SGRResult {
  const maintenant = input.dateReference ?? new Date();

  const wip = calculerRWIP(input.tasks, input.columnConfigs);
  const cycleTime = calculerRCT(input.tasks, maintenant);
  const age = calculerRAge(input.tasks, maintenant);
  const throughput = calculerRThroughput(input.tasks, maintenant);
  const github = calculerRDev(input.githubActivity);
  const tech = calculerRQuality(input.techDebt);

  // Monte-Carlo activé uniquement si le contexte sprint est fourni
  const monteCarlo = input.sprintContext
    ? calculerRMonteCarlo(input.sprintContext, maintenant)
    : null;

  let scoreFlow: number;

  if (monteCarlo !== null) {
    // SGR enrichi : P_delai remplace partiellement le throughput déterministe
    const w = POIDS_INTERNES.FLOW_MONTE_CARLO;
    scoreFlow = clamp(
      wip.score       * w.WIP +
      cycleTime.score * w.CT +
      age.score       * w.AGE +
      throughput.score * w.THROUGHPUT +
      monteCarlo.score * w.MONTE_CARLO
    );
  } else {
    // SGR classique : pondération déterministe sans Monte-Carlo
    scoreFlow = clamp(
      wip.score       * POIDS_INTERNES.FLOW.WIP +
      cycleTime.score * POIDS_INTERNES.FLOW.CT +
      age.score       * POIDS_INTERNES.FLOW.AGE +
      throughput.score * POIDS_INTERNES.FLOW.THROUGHPUT
    );
  }

  const scoreDev = github.score;
  const scoreQuality = tech.score;

  const sgr = clamp(
    scoreFlow    * POIDS_SGR.FLOW +
    scoreDev     * POIDS_SGR.DEV +
    scoreQuality * POIDS_SGR.QUALITY
  );

  const indicateurs: SGRResult['indicateurs'] = {
    wip, cycleTime, age, throughput, github, tech,
    ...(monteCarlo !== null ? { monteCarlo } : {}),
  };

  return {
    sgr: Math.round(sgr * 10) / 10,
    niveau: interpreterNiveau(sgr),
    dimensions: {
      flow: Math.round(scoreFlow * 10) / 10,
      dev: Math.round(scoreDev * 10) / 10,
      quality: Math.round(scoreQuality * 10) / 10,
    },
    indicateurs,
    alertes: genererAlertes(indicateurs),
  };
}
