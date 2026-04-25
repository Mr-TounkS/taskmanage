/**
 * Tests unitaires — GetAnalyticsDataUseCase
 *
 * Valide l'agrégation des données analytiques :
 * - Comptage par statut, priorité
 * - Vélocité hebdomadaire (tâches Done avec completedAt)
 * - Taux de complétion par projet
 * - Distribution des niveaux SGR
 * - Cas limites : 0 projets, 0 tâches
 *
 * Section mémoire : 4.1 — Stratégie de test
 */

import { GetAnalyticsDataUseCase } from "@/application/use-cases/analytics/GetAnalyticsDataUseCase";
import { IProjectRepository, ProjectWithFlatUsers } from "@/domain/repositories/IProjectRepository";
import { ISGRHistoryRepository } from "@/domain/repositories/ISGRHistoryRepository";
import { SGRHistoryEntity } from "@/domain/entities/SGRHistory";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(overrides: {
  id: string;
  status?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  completedAt?: Date | null;
  userId?: string | null;
}) {
  return {
    id: overrides.id,
    name: `Task ${overrides.id}`,
    description: "",
    status: overrides.status ?? "To Do",
    priority: overrides.priority ?? "MEDIUM",
    startDate: null,
    dueDate: null,
    startedAt: null,
    completedAt: overrides.completedAt ?? null,
    projectId: "proj1",
    userId: overrides.userId ?? null,
    createdById: "user1",
    solutionDescription: null,
  };
}

function makeProject(id: string, name: string, tasks: ReturnType<typeof makeTask>[]): ProjectWithFlatUsers {
  return {
    id,
    name,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    inviteCode: id,
    createdById: "user1",
    tasks,
    users: [],
  };
}

function makeSGREntry(niveau: SGRHistoryEntity["niveau"], sgr = 50): SGRHistoryEntity {
  return {
    id: Math.random().toString(),
    projectId: "proj1",
    sgr,
    niveau,
    alertes: "[]",
    createdAt: new Date(),
  };
}

function makeProjectRepo(projects: ProjectWithFlatUsers[]): jest.Mocked<IProjectRepository> {
  return {
    findManyAssociatedWithUser: jest.fn().mockResolvedValue(projects),
    create: jest.fn(), findById: jest.fn(), findByIdWithDetails: jest.fn(),
    findByInviteCode: jest.fn(), findManyCreatedByUser: jest.fn(),
    findWithAllUsers: jest.fn(), delete: jest.fn(), addUser: jest.fn(),
    isUserAlreadyMember: jest.fn(),
  };
}

function makeSGRRepo(entries: SGRHistoryEntity[] = []): jest.Mocked<ISGRHistoryRepository> {
  return {
    save: jest.fn(),
    findByProject: jest.fn().mockResolvedValue(entries),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GetAnalyticsDataUseCase", () => {
  const EMAIL = "user@test.com";

  it("retourne des tableaux vides si aucun projet", async () => {
    const uc = new GetAnalyticsDataUseCase(makeProjectRepo([]), makeSGRRepo());
    const result = await uc.execute(EMAIL);

    expect(result.tasksByStatus.every(s => s.count === 0)).toBe(true);
    expect(result.tasksByPriority.every(p => p.count === 0)).toBe(true);
    expect(result.completionByProject).toHaveLength(0);
    expect(result.sgrByProject).toHaveLength(0);
  });

  it("compte correctement les tâches par statut", async () => {
    const tasks = [
      makeTask({ id: "t1", status: "To Do" }),
      makeTask({ id: "t2", status: "To Do" }),
      makeTask({ id: "t3", status: "In Progress" }),
      makeTask({ id: "t4", status: "Done" }),
    ];
    const uc = new GetAnalyticsDataUseCase(
      makeProjectRepo([makeProject("p1", "P1", tasks)]),
      makeSGRRepo(),
    );
    const result = await uc.execute(EMAIL);

    expect(result.tasksByStatus.find(s => s.status === "To Do")?.count).toBe(2);
    expect(result.tasksByStatus.find(s => s.status === "In Progress")?.count).toBe(1);
    expect(result.tasksByStatus.find(s => s.status === "Done")?.count).toBe(1);
  });

  it("compte correctement les tâches par priorité", async () => {
    const tasks = [
      makeTask({ id: "t1", priority: "HIGH" }),
      makeTask({ id: "t2", priority: "HIGH" }),
      makeTask({ id: "t3", priority: "LOW" }),
    ];
    const uc = new GetAnalyticsDataUseCase(
      makeProjectRepo([makeProject("p1", "P1", tasks)]),
      makeSGRRepo(),
    );
    const result = await uc.execute(EMAIL);

    expect(result.tasksByPriority.find(p => p.priority === "HIGH")?.count).toBe(2);
    expect(result.tasksByPriority.find(p => p.priority === "LOW")?.count).toBe(1);
    expect(result.tasksByPriority.find(p => p.priority === "MEDIUM")?.count).toBe(0);
  });

  it("calcule le taux de complétion correctement", async () => {
    const tasks = [
      makeTask({ id: "t1", status: "Done" }),
      makeTask({ id: "t2", status: "Done" }),
      makeTask({ id: "t3", status: "To Do" }),
      makeTask({ id: "t4", status: "To Do" }),
    ];
    const uc = new GetAnalyticsDataUseCase(
      makeProjectRepo([makeProject("p1", "MonProjet", tasks)]),
      makeSGRRepo(),
    );
    const result = await uc.execute(EMAIL);

    const proj = result.completionByProject.find(p => p.projectName === "MonProjet")!;
    expect(proj.total).toBe(4);
    expect(proj.done).toBe(2);
    expect(proj.rate).toBe(50);
  });

  it("taux de complétion = 0 si aucune tâche dans le projet", async () => {
    const uc = new GetAnalyticsDataUseCase(
      makeProjectRepo([makeProject("p1", "Vide", [])]),
      makeSGRRepo(),
    );
    const result = await uc.execute(EMAIL);

    expect(result.completionByProject[0].rate).toBe(0);
  });

  it("compte la vélocité uniquement sur les tâches Done avec completedAt cette semaine", async () => {
    const thisWeekMonday = new Date();
    thisWeekMonday.setDate(thisWeekMonday.getDate() - thisWeekMonday.getDay() + 1);
    thisWeekMonday.setHours(12, 0, 0, 0);

    const tasks = [
      makeTask({ id: "t1", status: "Done", completedAt: thisWeekMonday }),
      makeTask({ id: "t2", status: "Done", completedAt: thisWeekMonday }),
      makeTask({ id: "t3", status: "In Progress", completedAt: null }),
    ];
    const uc = new GetAnalyticsDataUseCase(
      makeProjectRepo([makeProject("p1", "P1", tasks)]),
      makeSGRRepo(),
    );
    const result = await uc.execute(EMAIL);

    // La semaine courante doit contenir 2 tâches
    const lastWeek = result.velocityByWeek[result.velocityByWeek.length - 1];
    expect(lastWeek.count).toBe(2);
    expect(result.velocityByWeek).toHaveLength(12);
  });

  it("distribue correctement les niveaux SGR", async () => {
    const sgrRepo = makeSGRRepo([
      makeSGREntry("faible", 20),
      makeSGREntry("faible", 25),
      makeSGREntry("modéré", 50),
      makeSGREntry("critique", 90),
    ]);
    const uc = new GetAnalyticsDataUseCase(
      makeProjectRepo([makeProject("p1", "P1", [])]),
      sgrRepo,
    );
    const result = await uc.execute(EMAIL);

    expect(result.sgrLevelDistribution.find(l => l.niveau === "faible")?.count).toBe(2);
    expect(result.sgrLevelDistribution.find(l => l.niveau === "modéré")?.count).toBe(1);
    expect(result.sgrLevelDistribution.find(l => l.niveau === "critique")?.count).toBe(1);
    expect(result.sgrLevelDistribution.find(l => l.niveau === "élevé")?.count).toBe(0);
  });
});
