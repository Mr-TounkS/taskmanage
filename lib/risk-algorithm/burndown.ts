/**
 * Burndown Chart Prédictif — calcul des séries de données.
 *
 * Trois courbes (section mémoire 3.2) :
 *   1. Idéale   : décroissance linéaire de N tâches → 0 sur la durée du sprint
 *   2. Réelle   : tâches restantes réelles jour par jour (historique)
 *   3. Projection Monte-Carlo : zone ombrée [médiane → P85] depuis aujourd'hui
 *
 * Justification scientifique :
 *   Tout écart entre courbe réelle et ligne idéale est corrélé au SGR.
 *   La zone de projection matérialise l'incertitude stochastique calculée
 *   par Monte-Carlo — c'est la preuve visuelle du moteur probabiliste.
 */

export interface BurndownPoint {
  /** Label affiché sur l'axe X (ex: "J-7", "Today", "J+3") */
  label: string;
  /** Index du jour relatif à aujourd'hui (négatif = passé, 0 = today, positif = futur) */
  dayIndex: number;
  /** Ligne idéale : décroissance linéaire [0, total] */
  ideal: number | null;
  /** Courbe réelle : tâches restantes ce jour-là (null pour les jours futurs) */
  actual: number | null;
  /** Borne basse de la projection MC (médiane) — null pour jours passés */
  projLow: number | null;
  /** Borne haute de la projection MC (P85) — null pour jours passés */
  projHigh: number | null;
  /** true = aujourd'hui */
  isToday: boolean;
}

export interface BurndownInput {
  tasks: Array<{
    status: string;
    completedAt: Date | null;
    startedAt: Date | null;
  }>;
  /** Jours restants avant la deadline (depuis Monte-Carlo) */
  remainingDays: number;
  /** Médiane de complétion en jours (depuis Monte-Carlo) */
  medianDaysToComplete: number;
  /** P85 de complétion en jours (depuis Monte-Carlo) */
  p85DaysToComplete: number;
  /** Date de référence (utile pour les tests) */
  dateReference?: Date;
}

export function computeBurndown(input: BurndownInput): BurndownPoint[] {
  const maintenant = input.dateReference ?? new Date();
  const msParJour = 1000 * 60 * 60 * 24;

  const totalTasks = input.tasks.length;
  if (totalTasks === 0) return [];

  const currentRemaining = input.tasks.filter(t => t.status !== 'Done').length;

  // Fenêtre passée : max 14 jours en arrière (ou depuis la 1ère tâche démarrée)
  const premiereDate = input.tasks
    .map(t => t.startedAt ?? t.completedAt)
    .filter((d): d is Date => d !== null)
    .reduce<Date | null>((min, d) => (!min || d < min ? d : min), null);

  const joursPassesBruts = premiereDate
    ? Math.ceil((maintenant.getTime() - premiereDate.getTime()) / msParJour)
    : 0;
  const joursPassés = Math.min(joursPassesBruts, 14);

  // Fenêtre future : jusqu'au P85 ou la deadline (max 21 jours)
  const joursFuturs = Math.min(
    Math.max(input.p85DaysToComplete, input.remainingDays),
    21
  );

  const points: BurndownPoint[] = [];
  const totalJours = joursPassés + joursFuturs + 1;

  for (let i = -joursPassés; i <= joursFuturs; i++) {
    const jour = new Date(maintenant.getTime() + i * msParJour);
    const isToday = i === 0;

    // Label lisible
    const label = isToday ? 'Today'
      : i < 0 ? `J${i}`
      : `J+${i}`;

    // Ligne idéale : décroissance linéaire de totalTasks à 0 sur la durée du sprint
    // On part de joursPassés jours avant aujourd'hui et on finit à remainingDays après
    const sprintDuration = joursPassés + input.remainingDays;
    const idealProgress = (joursPassés + i) / Math.max(sprintDuration, 1);
    const ideal = Math.max(0, Math.round(totalTasks * (1 - idealProgress)));

    // Courbe réelle (jours passés + aujourd'hui)
    let actual: number | null = null;
    if (i <= 0) {
      actual = input.tasks.filter(t => {
        if (t.status !== 'Done' || t.completedAt === null) return true; // pas terminée
        return t.completedAt > jour; // terminée après ce jour = encore "restante" ce jour-là
      }).length;
    }

    // Zone de projection Monte-Carlo (jours futurs uniquement)
    let projLow: number | null = null;
    let projHigh: number | null = null;
    if (i > 0) {
      // Projection médiane : décroissance linéaire sur medianDays
      projLow = i <= input.medianDaysToComplete
        ? Math.max(0, Math.round(currentRemaining * (1 - i / input.medianDaysToComplete)))
        : 0;
      // Projection P85 : décroissance plus lente sur p85Days
      projHigh = i <= input.p85DaysToComplete
        ? Math.max(0, Math.round(currentRemaining * (1 - i / input.p85DaysToComplete)))
        : 0;
    }

    points.push({ label, dayIndex: i, ideal, actual, projLow, projHigh, isToday });
  }

  return points;
}
