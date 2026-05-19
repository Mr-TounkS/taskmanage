/**
 * Actual Work Burndown — basé sur les dates réelles des tâches.
 *
 * Principe (section mémoire 3.2) :
 *   Début   = min(task.startedAt) — date RÉELLE observable en base
 *   Fin     = aujourd'hui + medianDays (Monte-Carlo) — date PROJETÉE
 *   Idéale  = droite de (total tâches au début réel) → (0 à la médiane MC)
 *   Réelle  = tâches non terminées ce jour-là (calculé depuis completedAt)
 *   Zone MC = fourchette [médiane → P85] depuis aujourd'hui
 *
 * Aucune hypothèse artificielle sur la durée de sprint.
 * Chaque valeur est soit observable en base, soit calculée par Monte-Carlo.
 */

export interface BurndownPoint {
  /** Label axe X (ex: "May 01", "Today", "+3d") */
  label: string;
  /** Index relatif à aujourd'hui — négatif = passé, 0 = today, positif = futur */
  dayIndex: number;
  /** Ligne idéale : décroissance de totalAtStart → 0 à la médiane MC */
  ideal: number | null;
  /** Courbe réelle : tâches restantes ce jour-là (null pour les futurs) */
  actual: number | null;
  /** Borne basse projection MC (médiane — optimiste) */
  projLow: number | null;
  /** Borne haute projection MC (P85 — pessimiste) */
  projHigh: number | null;
  /** true = ligne verticale "Today" */
  isToday: boolean;
}

export interface BurndownInput {
  tasks: Array<{
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
  }>;
  medianDaysToComplete: number;
  p85DaysToComplete: number;
  dateReference?: Date;
}

export type BurndownStatus =
  | { type: 'ok'; points: BurndownPoint[]; sprintStartDate: Date }
  | { type: 'no_work_started' }
  | { type: 'completed'; completedAt: Date };

/**
 * Formate une date en "May 01" pour l'axe X.
 */
function formatLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

/**
 * Calcule les données du burndown depuis les dates réelles.
 * Retourne un status discriminé pour gérer les cas particuliers honnêtement.
 */
export function computeBurndown(input: BurndownInput): BurndownStatus {
  const maintenant = input.dateReference ?? new Date();
  const msParJour = 1000 * 60 * 60 * 24;

  const { tasks, medianDaysToComplete, p85DaysToComplete } = input;

  // --- Cas : aucune tâche démarrée ---
  const tachesDemarrees = tasks.filter(t => t.startedAt !== null);
  if (tachesDemarrees.length === 0) {
    return { type: 'no_work_started' };
  }

  // Date de début réelle = première tâche démarrée
  const sprintStartDate = tachesDemarrees.reduce<Date>((min, t) =>
    t.startedAt! < min ? t.startedAt! : min,
    tachesDemarrees[0].startedAt!
  );

  const currentRemaining = tasks.filter(t => t.status !== 'Done').length;

  // --- Cas : projet complètement terminé ---
  if (currentRemaining === 0) {
    const lastCompleted = tasks
      .filter(t => t.completedAt !== null)
      .reduce<Date>((max, t) => t.completedAt! > max ? t.completedAt! : max,
        new Date(0));
    return { type: 'completed', completedAt: lastCompleted };
  }

  // Nombre total de tâches existantes au début du sprint
  // (toutes les tâches actuelles — approximation défendable pour un projet sans backlog dynamique)
  const totalTasks = tasks.length;

  // --- Construction de la série temporelle ---
  const joursDepuisDebut = Math.ceil(
    (maintenant.getTime() - sprintStartDate.getTime()) / msParJour
  );

  // Fenêtre passée : depuis sprintStart jusqu'à aujourd'hui
  const joursPasse = Math.max(joursDepuisDebut, 0);

  // Fenêtre future : jusqu'au P85 ou 21 jours max
  const joursFuturs = Math.min(Math.max(p85DaysToComplete, 3), 21);

  // Durée totale pour la ligne idéale : de sprintStart à sprintStart + medianDays
  const idealDuration = Math.max(joursPasse + medianDaysToComplete, 1);

  const points: BurndownPoint[] = [];

  for (let i = -joursPasse; i <= joursFuturs; i++) {
    const jour = new Date(maintenant.getTime() + i * msParJour);
    const isToday = i === 0;

    // Label
    const label = isToday ? 'Today' : formatLabel(jour);

    // Progression depuis le début du sprint (pour la ligne idéale)
    const joursDepuisStartCourant = joursPasse + i;
    const idealProgress = Math.min(joursDepuisStartCourant / idealDuration, 1);
    const ideal = Math.max(0, Math.round(totalTasks * (1 - idealProgress)));

    // Courbe réelle — calculée depuis les completedAt réels
    let actual: number | null = null;
    if (i <= 0) {
      actual = tasks.filter(t => {
        if (t.status !== 'Done' || t.completedAt === null) return true;
        return t.completedAt > jour;
      }).length;
    }

    // Zone de projection Monte-Carlo — uniquement pour les jours futurs
    let projLow: number | null = null;
    let projHigh: number | null = null;
    if (i > 0 && currentRemaining > 0) {
      projLow = medianDaysToComplete > 0
        ? Math.max(0, Math.round(currentRemaining * (1 - i / medianDaysToComplete)))
        : 0;
      projHigh = p85DaysToComplete > 0
        ? Math.max(0, Math.round(currentRemaining * (1 - i / p85DaysToComplete)))
        : 0;
    }

    points.push({ label, dayIndex: i, ideal, actual, projLow, projHigh, isToday });
  }

  return { type: 'ok', points, sprintStartDate };
}
