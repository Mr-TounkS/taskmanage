/**
 * Algorithme SGR — Score Global de Risque
 *
 * Formule : SGR = 0.30×R_WIP + 0.25×R_CT + 0.20×R_Age + 0.15×R_Throughput + 0.10×R_Tech
 *
 * Chaque indicateur R_i ∈ [0, 100] (normalisé).
 * Sources : Kanban Guide 2025, Loi de Little, SLE au 85e percentile.
 *
 * Section mémoire : 2.3 — Algorithme SGR
 *
 * LIMITATION : Les pondérations sont établies par analyse de la littérature
 * (Lean Software Development, Kanban Guide 2025). Elles n'ont pas été validées
 * empiriquement dans le cadre de ce mémoire (cf. section 4.3).
 */

import {
  SGRInput,
  SGRResult,
  SGRIndicator,
  SGRTask,
  SGRTechDebt,
  SGRColumnConfig,
  POIDS_SGR,
  SEUILS_SGR,
  PERCENTILE_SLE,
  FENETRE_THROUGHPUT_DAYS,
} from './types';

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
 * Retourne null si les données sont incomplètes.
 */
function cycletime(task: SGRTask): number | null {
  if (!task.startedAt || !task.completedAt) return null;
  const msParJour = 1000 * 60 * 60 * 24;
  return (task.completedAt.getTime() - task.startedAt.getTime()) / msParJour;
}

/**
 * Calcule l'âge d'une tâche en cours en jours (Work Item Age).
 * Retourne null si la tâche n'est pas encore démarrée.
 */
function workItemAge(task: SGRTask, maintenant: Date): number | null {
  if (!task.startedAt) return null;
  const msParJour = 1000 * 60 * 60 * 24;
  return (maintenant.getTime() - task.startedAt.getTime()) / msParJour;
}

// ---------------------------------------------------------------------------
// Calcul R_WIP — Dépassement des limites Work In Progress (poids : 30%)
// ---------------------------------------------------------------------------

/**
 * R_WIP mesure le dépassement des limites WIP par colonne Kanban.
 * Fondé sur la Loi de Little : CT = WIP / Throughput.
 * Un WIP excessif dégrade mécaniquement le Cycle Time.
 *
 * @param tasks       - Toutes les tâches du projet
 * @param configs     - Limites WIP définies par colonne
 * @returns SGRIndicator avec score normalisé [0, 100]
 */
function calculerRWIP(
  tasks: SGRTask[],
  configs: SGRColumnConfig[]
): SGRIndicator {
  // Colonnes configurées avec une limite réelle (> 0)
  const colonnesAvecLimite = configs.filter((c) => c.wipLimit > 0);

  if (colonnesAvecLimite.length === 0) {
    return {
      score: 0,
      weight: POIDS_SGR.WIP,
      contribution: 0,
      details: { message: 'Aucune limite WIP configurée' },
    };
  }

  const violations: number[] = [];
  const details: Record<string, number | string> = {};

  for (const config of colonnesAvecLimite) {
    const wipActuel = tasks.filter((t) => t.status === config.column).length;
    const depassement = Math.max(0, wipActuel - config.wipLimit);
    const ratioViolation = depassement / config.wipLimit; // [0, ∞)

    details[`wip_${config.column}`] = wipActuel;
    details[`limite_${config.column}`] = config.wipLimit;
    details[`depassement_${config.column}`] = depassement;

    // Normalisation : 100% de dépassement = score max (100)
    violations.push(clamp(ratioViolation * 100));
  }

  // On prend la violation maximale (colonne la plus en tension)
  const score = Math.max(...violations);

  return {
    score,
    weight: POIDS_SGR.WIP,
    contribution: score * POIDS_SGR.WIP,
    details,
  };
}

// ---------------------------------------------------------------------------
// Calcul R_CT — Cycle Time vs historique (poids : 25%)
// ---------------------------------------------------------------------------

/**
 * R_CT mesure l'écart entre le Cycle Time récent et la moyenne historique.
 * Seuil de référence : SLE au 85e percentile des Cycle Times historiques.
 *
 * @param tasks       - Toutes les tâches du projet (terminées + en cours)
 * @param maintenant  - Date de référence du calcul
 */
function calculerRCT(tasks: SGRTask[], maintenant: Date): SGRIndicator {
  const tachesTerminees = tasks.filter(
    (t) => t.status === 'Done' && t.startedAt && t.completedAt
  );

  if (tachesTerminees.length < 2) {
    return {
      score: 0,
      weight: POIDS_SGR.CYCLE_TIME,
      contribution: 0,
      details: { message: 'Historique insuffisant (< 2 tâches terminées)' },
    };
  }

  // Cycle Times historiques (tous)
  const cycleTimesHistoriques = tachesTerminees
    .map(cycletime)
    .filter((ct): ct is number => ct !== null)
    .sort((a, b) => a - b);

  const ctMoyenne =
    cycleTimesHistoriques.reduce((a, b) => a + b, 0) /
    cycleTimesHistoriques.length;

  const sle85 = percentile(cycleTimesHistoriques, PERCENTILE_SLE);

  // Cycle Time "récent" : moyenne des 5 dernières tâches terminées
  const recentes = tachesTerminees
    .filter((t) => t.completedAt !== null)
    .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())
    .slice(0, 5);

  const ctRecents = recentes
    .map(cycletime)
    .filter((ct): ct is number => ct !== null);

  if (ctRecents.length === 0) {
    return {
      score: 0,
      weight: POIDS_SGR.CYCLE_TIME,
      contribution: 0,
      details: { ctMoyenne, sle85, message: 'Aucune tâche récente calculable' },
    };
  }

  const ctActuel =
    ctRecents.reduce((a, b) => a + b, 0) / ctRecents.length;

  // Écart normalisé : 0 si CT actuel ≤ moyenne, 100 si CT actuel ≥ 2× la moyenne
  const ecart = ctMoyenne > 0 ? (ctActuel - ctMoyenne) / ctMoyenne : 0;
  const score = clamp(ecart * 100);

  return {
    score,
    weight: POIDS_SGR.CYCLE_TIME,
    contribution: score * POIDS_SGR.CYCLE_TIME,
    details: {
      ctActuel: Math.round(ctActuel * 10) / 10,
      ctMoyenne: Math.round(ctMoyenne * 10) / 10,
      sle85: Math.round(sle85 * 10) / 10,
      nbTachesHistorique: cycleTimesHistoriques.length,
      nbTachesRecentes: ctRecents.length,
      depassementSLE: ctActuel > sle85 ? 1 : 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Calcul R_Age — Work Item Age (poids : 20%)
// ---------------------------------------------------------------------------

/**
 * R_Age mesure le pourcentage de tâches "In Progress" dont l'âge dépasse
 * le SLE au 85e percentile des Cycle Times historiques.
 * Un âge élevé signale des tâches bloquées ou sous-estimées.
 *
 * @param tasks       - Toutes les tâches du projet
 * @param maintenant  - Date de référence du calcul
 */
function calculerRAge(tasks: SGRTask[], maintenant: Date): SGRIndicator {
  const enCours = tasks.filter(
    (t) => t.status === 'In Progress' && t.startedAt
  );

  if (enCours.length === 0) {
    return {
      score: 0,
      weight: POIDS_SGR.AGE,
      contribution: 0,
      details: { message: 'Aucune tâche en cours' },
    };
  }

  // SLE_85 calculé sur les Cycle Times historiques
  const cycleTimesHistoriques = tasks
    .filter((t) => t.status === 'Done' && t.startedAt && t.completedAt)
    .map(cycletime)
    .filter((ct): ct is number => ct !== null)
    .sort((a, b) => a - b);

  const sle85 =
    cycleTimesHistoriques.length > 0
      ? percentile(cycleTimesHistoriques, PERCENTILE_SLE)
      : Infinity; // Pas d'historique : on ne peut pas déclencher d'alerte

  const agesEnCours = enCours
    .map((t) => workItemAge(t, maintenant))
    .filter((age): age is number => age !== null);

  const tachesAuDelaSLE = agesEnCours.filter((age) => age > sle85).length;
  const score = clamp((tachesAuDelaSLE / enCours.length) * 100);

  return {
    score,
    weight: POIDS_SGR.AGE,
    contribution: score * POIDS_SGR.AGE,
    details: {
      nbEnCours: enCours.length,
      nbDepassantSLE: tachesAuDelaSLE,
      sle85: sle85 === Infinity ? 'N/A' : Math.round(sle85 * 10) / 10,
      ageMoyen:
        agesEnCours.length > 0
          ? Math.round(
              (agesEnCours.reduce((a, b) => a + b, 0) / agesEnCours.length) *
                10
            ) / 10
          : 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Calcul R_Throughput — Débit de l'équipe (poids : 15%)
// ---------------------------------------------------------------------------

/**
 * R_Throughput mesure la baisse du débit (tâches/semaine) par rapport
 * à la moyenne sur les 90 derniers jours.
 * Fondé sur la définition du Throughput dans le Kanban Guide 2025.
 *
 * @param tasks       - Toutes les tâches du projet
 * @param maintenant  - Date de référence du calcul
 */
function calculerRThroughput(tasks: SGRTask[], maintenant: Date): SGRIndicator {
  const msParJour = 1000 * 60 * 60 * 24;
  const debut90j = new Date(
    maintenant.getTime() - FENETRE_THROUGHPUT_DAYS * msParJour
  );
  const debut7j = new Date(maintenant.getTime() - 7 * msParJour);

  const tachesTerminees = tasks.filter(
    (t) => t.status === 'Done' && t.completedAt !== null
  );

  // Tâches terminées dans la fenêtre de 90 jours
  const taches90j = tachesTerminees.filter(
    (t) => t.completedAt! >= debut90j && t.completedAt! <= maintenant
  );

  if (taches90j.length === 0) {
    return {
      score: 0,
      weight: POIDS_SGR.THROUGHPUT,
      contribution: 0,
      details: { message: 'Aucune tâche terminée dans les 90 derniers jours' },
    };
  }

  // Débit moyen sur 90 jours (en tâches/semaine)
  const throughputMoyen90j = (taches90j.length / FENETRE_THROUGHPUT_DAYS) * 7;

  // Débit de la semaine courante
  const taches7j = tachesTerminees.filter(
    (t) => t.completedAt! >= debut7j && t.completedAt! <= maintenant
  );
  const throughputActuel = taches7j.length; // tâches/semaine courante

  // Score : 0 si débit stable ou en hausse, 100 si débit nul
  const baisse = throughputMoyen90j > 0
    ? (throughputMoyen90j - throughputActuel) / throughputMoyen90j
    : 0;
  const score = clamp(baisse * 100);

  return {
    score,
    weight: POIDS_SGR.THROUGHPUT,
    contribution: score * POIDS_SGR.THROUGHPUT,
    details: {
      throughputMoyen90j: Math.round(throughputMoyen90j * 10) / 10,
      throughputActuel,
      nbTaches90j: taches90j.length,
      nbTaches7j: taches7j.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Calcul R_Tech — Dette Technique SonarQube (poids : 10%)
// ---------------------------------------------------------------------------

/**
 * R_Tech estime le risque lié à la dette technique.
 * Source : données SonarQube (bugs bloquants, code smells, dette en jours).
 * Si les données SonarQube sont absentes, le score est 0 (conservateur).
 *
 * Seuils d'alerte :
 *   - > 5 bugs bloquants → contribution maximale bugs
 *   - dette > 5 jours-homme → contribution maximale dette
 */
function calculerRTech(techDebt?: SGRTechDebt): SGRIndicator {
  if (!techDebt) {
    return {
      score: 0,
      weight: POIDS_SGR.TECH,
      contribution: 0,
      details: { message: 'Données SonarQube non disponibles' },
    };
  }

  const SEUIL_BUGS = 5;
  const SEUIL_DETTE_DAYS = 5;
  const SEUIL_SMELLS = 50;

  // Score bugs : 0 pour 0 bug, 100 pour ≥ SEUIL_BUGS bugs bloquants
  const scoreBugs = clamp((techDebt.bugsBloquants / SEUIL_BUGS) * 100);

  // Score dette technique : 0 pour 0 jour, 100 pour ≥ SEUIL_DETTE_DAYS jours
  const scoreDette = clamp(
    (techDebt.detteTechniqueDays / SEUIL_DETTE_DAYS) * 100
  );

  // Score code smells : contribution modérée (indicateur secondaire)
  const scoreSmells = clamp((techDebt.codeSmells / SEUIL_SMELLS) * 100);

  // Agrégation pondérée : bugs = 50%, dette = 30%, smells = 20%
  const score = clamp(
    scoreBugs * 0.5 + scoreDette * 0.3 + scoreSmells * 0.2
  );

  return {
    score,
    weight: POIDS_SGR.TECH,
    contribution: score * POIDS_SGR.TECH,
    details: {
      bugsBloquants: techDebt.bugsBloquants,
      codeSmells: techDebt.codeSmells,
      detteTechniqueDays: techDebt.detteTechniqueDays,
      scoreBugs: Math.round(scoreBugs),
      scoreDette: Math.round(scoreDette),
      scoreSmells: Math.round(scoreSmells),
    },
  };
}

// ---------------------------------------------------------------------------
// Interprétation du score
// ---------------------------------------------------------------------------

/**
 * Détermine le niveau de risque à partir du score SGR.
 */
function interpreterNiveau(
  sgr: number
): SGRResult['niveau'] {
  if (sgr <= SEUILS_SGR.FAIBLE) return 'faible';
  if (sgr <= SEUILS_SGR.MODERE) return 'modéré';
  if (sgr <= SEUILS_SGR.ELEVE) return 'élevé';
  return 'critique';
}

/**
 * Génère les alertes lisibles à partir des indicateurs calculés.
 */
function genererAlertes(indicateurs: SGRResult['indicateurs']): string[] {
  const alertes: string[] = [];

  if (indicateurs.wip.score > 0) {
    alertes.push(
      `Limite WIP dépassée — score R_WIP : ${Math.round(indicateurs.wip.score)}/100`
    );
  }
  if (indicateurs.cycleTime.score > 50) {
    alertes.push(
      `Cycle Time élevé (+${Math.round(indicateurs.cycleTime.score)}% vs historique)`
    );
  }
  if (indicateurs.age.score > 20) {
    alertes.push(
      `${Math.round(indicateurs.age.score)}% des tâches en cours dépassent le SLE`
    );
  }
  if (indicateurs.throughput.score > 30) {
    alertes.push(
      `Débit en baisse de ${Math.round(indicateurs.throughput.score)}% vs moyenne 90 jours`
    );
  }
  if (indicateurs.tech.score > 0) {
    alertes.push(
      `Dette technique détectée — score R_Tech : ${Math.round(indicateurs.tech.score)}/100`
    );
  }

  return alertes;
}

// ---------------------------------------------------------------------------
// Fonction principale exportée
// ---------------------------------------------------------------------------

/**
 * Calcule le Score Global de Risque (SGR) pour un projet donné.
 *
 * @param input - Données du projet : tâches, configs WIP, dette technique
 * @returns SGRResult avec le score agrégé, le niveau de risque et le détail
 *
 * @example
 * const result = calculateSGR({ tasks, columnConfigs, techDebt });
 * console.log(result.sgr);     // ex: 47.3
 * console.log(result.niveau);  // "modéré"
 */
export function calculateSGR(input: SGRInput): SGRResult {
  const maintenant = input.dateReference ?? new Date();

  // Calcul de chaque indicateur
  const wip = calculerRWIP(input.tasks, input.columnConfigs);
  const cycleTime = calculerRCT(input.tasks, maintenant);
  const age = calculerRAge(input.tasks, maintenant);
  const throughput = calculerRThroughput(input.tasks, maintenant);
  const tech = calculerRTech(input.techDebt);

  // Agrégation pondérée : SGR = Σ (score_i × poids_i)
  const sgr = clamp(
    wip.contribution +
      cycleTime.contribution +
      age.contribution +
      throughput.contribution +
      tech.contribution
  );

  const indicateurs = { wip, cycleTime, age, throughput, tech };

  return {
    sgr: Math.round(sgr * 10) / 10,
    niveau: interpreterNiveau(sgr),
    indicateurs,
    alertes: genererAlertes(indicateurs),
  };
}
