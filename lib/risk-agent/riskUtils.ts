/**
 * Utilitaires de calcul déterministe pour le Risk Command Center.
 *
 * Ce module est importable côté client (pas de dépendance Node.js).
 * Il calcule les root causes et la tendance SGR depuis des données réelles,
 * garantissant que l'UI n'affiche jamais de données hallucinées par le LLM.
 *
 * Section mémoire : 3.3 — Architecture hybride données réelles + LLM
 */

import { SGRResult } from '../risk-algorithm/types';
import { RootCauseItem, SGRTrend } from './types';

export function computeRootCauses(sgrResult: SGRResult): RootCauseItem[] {
  const ind = sgrResult.indicateurs;
  const items: RootCauseItem[] = [
    { indicator: 'WIP',        label: 'WIP Saturation',   score: ind.wip.score,        contribution: Math.round(ind.wip.contribution * 0.5),        direction: ind.wip.score > 30        ? 'RISK' : 'SAFE' },
    { indicator: 'CycleTime',  label: 'Cycle Time',       score: ind.cycleTime.score,  contribution: Math.round(ind.cycleTime.contribution * 0.5),  direction: ind.cycleTime.score > 30  ? 'RISK' : 'SAFE' },
    { indicator: 'TaskAge',    label: 'Task Age',         score: ind.age.score,        contribution: Math.round(ind.age.contribution * 0.5),        direction: ind.age.score > 30        ? 'RISK' : 'SAFE' },
    { indicator: 'Throughput', label: 'Throughput',       score: ind.throughput.score, contribution: Math.round(ind.throughput.contribution * 0.5), direction: ind.throughput.score > 30 ? 'RISK' : 'SAFE' },
    { indicator: 'TechDebt',   label: 'Technical Debt',   score: ind.tech.score,       contribution: Math.round(ind.tech.contribution * 0.2),       direction: ind.tech.score > 30       ? 'RISK' : 'SAFE' },
  ];
  if (ind.monteCarlo) {
    items.push({
      indicator: 'MonteCarlo',
      label: 'Delay Probability',
      score: ind.monteCarlo.score,
      contribution: Math.round(ind.monteCarlo.contribution * 0.5),
      direction: ind.monteCarlo.probabilityOfDelay > 0.3 ? 'RISK' : 'SAFE',
    });
  }
  return items.sort((a, b) => b.contribution - a.contribution);
}

export function computeTrend(
  currentSgr: number,
  history: { sgr: number; calculatedAt: Date }[]
): SGRTrend {
  if (history.length < 2) {
    return { direction: 'STABLE', delta: 0, period: '—', previousSgr: currentSgr, currentSgr };
  }
  const now = new Date();
  const h48 = new Date(now.getTime() - 48 * 3600_000);
  const recent = history.filter(h => new Date(h.calculatedAt) >= h48);
  const previousSgr = recent.length > 0 ? recent[0].sgr : history[history.length - 2].sgr;
  const delta = Math.round((currentSgr - previousSgr) * 10) / 10;
  return {
    direction: Math.abs(delta) < 2 ? 'STABLE' : delta > 0 ? 'UP' : 'DOWN',
    delta,
    period: recent.length > 0 ? '48h' : `${history.length} pts`,
    previousSgr,
    currentSgr,
  };
}
