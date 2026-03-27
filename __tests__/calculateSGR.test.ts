/**
 * Tests unitaires — Algorithme SGR (Score Global de Risque)
 *
 * Couvre les 5 indicateurs : R_WIP, R_CT, R_Age, R_Throughput, R_Tech
 * Cible de couverture : > 70% (cf. section 4.1 du mémoire)
 *
 * Stratégie : test des cas limites (0, max, données absentes)
 * et des cas nominaux pour chaque indicateur.
 */

import { calculateSGR } from "@/lib/risk-algorithm/calculateSGR";
import { SGRInput, SGRTask } from "@/lib/risk-algorithm/types";

// ---------------------------------------------------------------------------
// Helpers de test
// ---------------------------------------------------------------------------

/** Crée une tâche terminée avec un Cycle Time précis (en jours) */
function tacheTerminee(id: string, cycleTimeDays: number, baseDate: Date = new Date("2025-06-01")): SGRTask {
  const completedAt = new Date(baseDate);
  const startedAt = new Date(baseDate.getTime() - cycleTimeDays * 86400_000);
  return { id, status: "Done", startedAt, completedAt };
}

/** Crée une tâche en cours démarrée il y a N jours */
function tacheEnCours(id: string, ageJours: number, baseDate: Date = new Date("2025-06-01")): SGRTask {
  const startedAt = new Date(baseDate.getTime() - ageJours * 86400_000);
  return { id, status: "In Progress", startedAt, completedAt: null };
}

/** Crée une tâche à faire */
function tacheToDo(id: string): SGRTask {
  return { id, status: "To Do", startedAt: null, completedAt: null };
}

const DATE_REF = new Date("2025-06-01");

// ---------------------------------------------------------------------------
// Tests : cas général — aucune donnée
// ---------------------------------------------------------------------------

describe("calculateSGR — aucune donnée", () => {
  it("retourne un SGR à 0 si aucune tâche et aucune config WIP", () => {
    const input: SGRInput = { tasks: [], columnConfigs: [], dateReference: DATE_REF };
    const result = calculateSGR(input);
    expect(result.sgr).toBe(0);
    expect(result.niveau).toBe("faible");
    expect(result.alertes).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tests : R_WIP (poids 30%)
// ---------------------------------------------------------------------------

describe("R_WIP — dépassement des limites WIP", () => {
  it("score 0 quand aucune limite WIP configurée", () => {
    const input: SGRInput = {
      tasks: [tacheEnCours("t1", 1), tacheEnCours("t2", 2)],
      columnConfigs: [],
      dateReference: DATE_REF,
    };
    const result = calculateSGR(input);
    expect(result.indicateurs.wip.score).toBe(0);
  });

  it("score 0 quand WIP dans les limites", () => {
    const input: SGRInput = {
      tasks: [tacheEnCours("t1", 1), tacheEnCours("t2", 2)],
      columnConfigs: [{ column: "In Progress", wipLimit: 3 }],
      dateReference: DATE_REF,
    };
    const result = calculateSGR(input);
    expect(result.indicateurs.wip.score).toBe(0);
  });

  it("score 100 quand WIP = 2× la limite (100% de dépassement)", () => {
    const tasks = Array.from({ length: 6 }, (_, i) => tacheEnCours(`t${i}`, 1));
    const input: SGRInput = {
      tasks,
      columnConfigs: [{ column: "In Progress", wipLimit: 3 }],
      dateReference: DATE_REF,
    };
    const result = calculateSGR(input);
    expect(result.indicateurs.wip.score).toBe(100);
  });

  it("score partiel (50) pour un dépassement de 50%", () => {
    // 3 tâches pour une limite de 2 → dépassement = 1 → ratio = 0.5 → score = 50
    const tasks = Array.from({ length: 3 }, (_, i) => tacheEnCours(`t${i}`, 1));
    const input: SGRInput = {
      tasks,
      columnConfigs: [{ column: "In Progress", wipLimit: 2 }],
      dateReference: DATE_REF,
    };
    const result = calculateSGR(input);
    expect(result.indicateurs.wip.score).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Tests : R_CT — Cycle Time (poids 25%)
// ---------------------------------------------------------------------------

describe("R_CT — Cycle Time vs historique", () => {
  it("score 0 avec moins de 2 tâches terminées (historique insuffisant)", () => {
    const input: SGRInput = {
      tasks: [tacheTerminee("t1", 5)],
      columnConfigs: [],
      dateReference: DATE_REF,
    };
    const result = calculateSGR(input);
    expect(result.indicateurs.cycleTime.score).toBe(0);
  });

  it("score 0 quand le CT récent est égal à la moyenne historique", () => {
    // Toutes les tâches ont le même CT → pas d'écart
    const tasks = Array.from({ length: 6 }, (_, i) => tacheTerminee(`t${i}`, 5));
    const input: SGRInput = { tasks, columnConfigs: [], dateReference: DATE_REF };
    const result = calculateSGR(input);
    expect(result.indicateurs.cycleTime.score).toBe(0);
  });

  it("score élevé quand les tâches récentes sont bien plus lentes", () => {
    // Historique : 10 tâches à 2 jours, puis 5 tâches récentes à 6 jours (+200%)
    const historique = Array.from({ length: 10 }, (_, i) =>
      tacheTerminee(`h${i}`, 2, new Date("2025-04-01"))
    );
    const recentes = Array.from({ length: 5 }, (_, i) =>
      tacheTerminee(`r${i}`, 6, DATE_REF)
    );
    const input: SGRInput = {
      tasks: [...historique, ...recentes],
      columnConfigs: [],
      dateReference: DATE_REF,
    };
    const result = calculateSGR(input);
    expect(result.indicateurs.cycleTime.score).toBeGreaterThan(50);
  });
});

// ---------------------------------------------------------------------------
// Tests : R_Age — Work Item Age (poids 20%)
// ---------------------------------------------------------------------------

describe("R_Age — âge des tâches en cours", () => {
  it("score 0 si aucune tâche en cours", () => {
    const input: SGRInput = {
      tasks: [tacheTerminee("t1", 3)],
      columnConfigs: [],
      dateReference: DATE_REF,
    };
    const result = calculateSGR(input);
    expect(result.indicateurs.age.score).toBe(0);
  });

  it("score 0 si aucun historique (SLE infini)", () => {
    const input: SGRInput = {
      tasks: [tacheEnCours("t1", 100)],
      columnConfigs: [],
      dateReference: DATE_REF,
    };
    const result = calculateSGR(input);
    // Sans historique, SLE = Infinity → aucune tâche ne dépasse
    expect(result.indicateurs.age.score).toBe(0);
  });

  it("score 100 si toutes les tâches dépassent le SLE", () => {
    // Historique : 10 tâches terminées en 5 jours (SLE 85e ≈ 5 jours)
    const historique = Array.from({ length: 10 }, (_, i) =>
      tacheTerminee(`h${i}`, 5, new Date("2025-05-01"))
    );
    // Tâche en cours depuis 20 jours (>> SLE)
    const enCours = tacheEnCours("en1", 20);
    const input: SGRInput = {
      tasks: [...historique, enCours],
      columnConfigs: [],
      dateReference: DATE_REF,
    };
    const result = calculateSGR(input);
    expect(result.indicateurs.age.score).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Tests : R_Throughput — Débit (poids 15%)
// ---------------------------------------------------------------------------

describe("R_Throughput — débit de l'équipe", () => {
  it("score 0 si aucune tâche terminée dans les 90 derniers jours", () => {
    const input: SGRInput = {
      tasks: [],
      columnConfigs: [],
      dateReference: DATE_REF,
    };
    const result = calculateSGR(input);
    expect(result.indicateurs.throughput.score).toBe(0);
  });

  it("score 0 si débit stable (même cadence que la moyenne 90j)", () => {
    // 1 tâche par semaine pendant 90 jours ≈ 12-13 tâches, dont 1 cette semaine
    const taches: SGRTask[] = [];
    for (let i = 0; i < 12; i++) {
      const joursAvant = i * 7 + 1; // 1 tâche par semaine
      const completedAt = new Date(DATE_REF.getTime() - joursAvant * 86400_000);
      taches.push({
        id: `t${i}`,
        status: "Done",
        startedAt: new Date(completedAt.getTime() - 2 * 86400_000),
        completedAt,
      });
    }
    // Ajouter 1 tâche cette semaine
    taches.push(tacheTerminee("recent", 2, DATE_REF));

    const input: SGRInput = { tasks: taches, columnConfigs: [], dateReference: DATE_REF };
    const result = calculateSGR(input);
    // Le débit cette semaine est proche de la moyenne → score faible
    expect(result.indicateurs.throughput.score).toBeLessThan(50);
  });

  it("score 100 si débit nul cette semaine alors que l'historique est actif", () => {
    // 10 tâches terminées il y a 10-89 jours, aucune cette semaine
    const taches: SGRTask[] = Array.from({ length: 10 }, (_, i) =>
      tacheTerminee(`h${i}`, 0, new Date(DATE_REF.getTime() - (10 + i * 5) * 86400_000))
    );
    const input: SGRInput = { tasks: taches, columnConfigs: [], dateReference: DATE_REF };
    const result = calculateSGR(input);
    expect(result.indicateurs.throughput.score).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Tests : R_Tech — Dette technique (poids 10%)
// ---------------------------------------------------------------------------

describe("R_Tech — dette technique SonarQube", () => {
  it("score 0 si données SonarQube absentes", () => {
    const input: SGRInput = { tasks: [], columnConfigs: [], dateReference: DATE_REF };
    const result = calculateSGR(input);
    expect(result.indicateurs.tech.score).toBe(0);
  });

  it("score 0 si aucune dette technique", () => {
    const input: SGRInput = {
      tasks: [],
      columnConfigs: [],
      techDebt: { bugsBloquants: 0, codeSmells: 0, detteTechniqueDays: 0 },
      dateReference: DATE_REF,
    };
    const result = calculateSGR(input);
    expect(result.indicateurs.tech.score).toBe(0);
  });

  it("score 100 si tous les seuils max sont atteints", () => {
    const input: SGRInput = {
      tasks: [],
      columnConfigs: [],
      techDebt: { bugsBloquants: 10, codeSmells: 100, detteTechniqueDays: 10 },
      dateReference: DATE_REF,
    };
    const result = calculateSGR(input);
    expect(result.indicateurs.tech.score).toBe(100);
  });

  it("score partiel avec seulement des bugs bloquants", () => {
    // 5 bugs bloquants = seuil max pour les bugs (50% du score tech)
    const input: SGRInput = {
      tasks: [],
      columnConfigs: [],
      techDebt: { bugsBloquants: 5, codeSmells: 0, detteTechniqueDays: 0 },
      dateReference: DATE_REF,
    };
    const result = calculateSGR(input);
    // score = 100 * 0.5 (bugs) + 0 + 0 = 50
    expect(result.indicateurs.tech.score).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Tests : Résultat agrégé
// ---------------------------------------------------------------------------

describe("calculateSGR — résultat agrégé", () => {
  it("le SGR est borné entre 0 et 100", () => {
    const input: SGRInput = {
      tasks: Array.from({ length: 10 }, (_, i) => tacheEnCours(`t${i}`, 50)),
      columnConfigs: [{ column: "In Progress", wipLimit: 1 }],
      techDebt: { bugsBloquants: 20, codeSmells: 500, detteTechniqueDays: 30 },
      dateReference: DATE_REF,
    };
    const result = calculateSGR(input);
    expect(result.sgr).toBeGreaterThanOrEqual(0);
    expect(result.sgr).toBeLessThanOrEqual(100);
  });

  it("la somme des contributions ≈ SGR (tolérance arrondi)", () => {
    const tasks = Array.from({ length: 5 }, (_, i) => tacheTerminee(`t${i}`, 3));
    const input: SGRInput = {
      tasks,
      columnConfigs: [{ column: "In Progress", wipLimit: 2 }],
      techDebt: { bugsBloquants: 2, codeSmells: 10, detteTechniqueDays: 1 },
      dateReference: DATE_REF,
    };
    const result = calculateSGR(input);
    const sommePonderee =
      result.indicateurs.wip.contribution +
      result.indicateurs.cycleTime.contribution +
      result.indicateurs.age.contribution +
      result.indicateurs.throughput.contribution +
      result.indicateurs.tech.contribution;
    expect(result.sgr).toBeCloseTo(sommePonderee, 0);
  });

  it("niveau 'faible' pour un SGR ≤ 30", () => {
    const input: SGRInput = { tasks: [], columnConfigs: [], dateReference: DATE_REF };
    expect(calculateSGR(input).niveau).toBe("faible");
  });
});
