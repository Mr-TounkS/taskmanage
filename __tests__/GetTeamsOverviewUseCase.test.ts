/**
 * Tests unitaires — GetTeamsOverviewUseCase
 *
 * Valide le calcul des statistiques de membres :
 * - Comptage des tâches (total, complétées, en cours, en retard)
 * - Calcul du pourcentage de progression
 * - Filtrage par membre assigné (userId)
 * - Cas limites : aucune tâche, aucun projet
 *
 * Section mémoire : 4.1 — Stratégie de test
 */

import { GetTeamsOverviewUseCase } from "@/application/use-cases/project/GetTeamsOverviewUseCase";
import { IProjectRepository, ProjectWithFlatUsers } from "@/domain/repositories/IProjectRepository";
import { ProjectRole } from "@/domain/entities/ProjectUser";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PAST_DATE = new Date("2020-01-01");
const FUTURE_DATE = new Date("2099-12-31");

function makeUser(id: string, role: ProjectRole = "MEMBER") {
  return {
    id,
    name: `User ${id}`,
    email: `user${id}@test.com`,
    imageUrl: null,
    role,
  };
}

function makeTask(overrides: {
  id: string;
  userId?: string | null;
  status?: string;
  dueDate?: Date | null;
}) {
  return {
    id: overrides.id,
    name: `Task ${overrides.id}`,
    description: "",
    status: overrides.status ?? "To Do",
    priority: "MEDIUM" as const,
    startDate: null,
    dueDate: overrides.dueDate ?? null,
    startedAt: null,
    completedAt: null,
    projectId: "proj1",
    userId: overrides.userId ?? null,
    createdById: "creator",
    solutionDescription: null,
  };
}

function makeProjectRepo(projects: ProjectWithFlatUsers[]): jest.Mocked<IProjectRepository> {
  return {
    findManyAssociatedWithUser: jest.fn().mockResolvedValue(projects),
    create: jest.fn(),
    findById: jest.fn(),
    findByIdWithDetails: jest.fn(),
    findByInviteCode: jest.fn(),
    findManyCreatedByUser: jest.fn(),
    findWithAllUsers: jest.fn(),
    delete: jest.fn(),
    addUser: jest.fn(),
    isUserAlreadyMember: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GetTeamsOverviewUseCase", () => {
  const USER_EMAIL = "owner@test.com";

  it("retourne un tableau vide si aucun projet associé", async () => {
    const repo = makeProjectRepo([]);
    const result = await new GetTeamsOverviewUseCase(repo).execute(USER_EMAIL);
    expect(result).toEqual([]);
  });

  it("retourne des stats correctes pour un membre avec des tâches", async () => {
    const user = makeUser("u1");
    const project: ProjectWithFlatUsers = {
      id: "proj1",
      name: "Mon Projet",
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      inviteCode: "abc",
      createdById: "owner",
      tasks: [
        makeTask({ id: "t1", userId: "u1", status: "Done" }),
        makeTask({ id: "t2", userId: "u1", status: "In Progress" }),
        makeTask({ id: "t3", userId: "u1", status: "To Do", dueDate: PAST_DATE }),
      ],
      users: [user],
    };

    const result = await new GetTeamsOverviewUseCase(makeProjectRepo([project])).execute(USER_EMAIL);

    expect(result).toHaveLength(1);
    const stats = result[0];
    expect(stats.userId).toBe("u1");
    expect(stats.projectId).toBe("proj1");
    expect(stats.totalTasks).toBe(3);
    expect(stats.completedTasks).toBe(1);
    expect(stats.inProgressTasks).toBe(1);
    expect(stats.overdueTasks).toBe(1);
    expect(stats.progressPercentage).toBe(33);
  });

  it("ne comptabilise pas les tâches assignées à un autre membre", async () => {
    const u1 = makeUser("u1");
    const u2 = makeUser("u2");
    const project: ProjectWithFlatUsers = {
      id: "proj1",
      name: "Projet",
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      inviteCode: "xyz",
      createdById: "owner",
      tasks: [
        makeTask({ id: "t1", userId: "u1", status: "Done" }),
        makeTask({ id: "t2", userId: "u2", status: "To Do" }),
      ],
      users: [u1, u2],
    };

    const result = await new GetTeamsOverviewUseCase(makeProjectRepo([project])).execute(USER_EMAIL);

    expect(result).toHaveLength(2);
    const statsU1 = result.find(r => r.userId === "u1")!;
    const statsU2 = result.find(r => r.userId === "u2")!;
    expect(statsU1.totalTasks).toBe(1);
    expect(statsU2.totalTasks).toBe(1);
    expect(statsU1.completedTasks).toBe(1);
    expect(statsU2.completedTasks).toBe(0);
  });

  it("progressPercentage est 0 si aucune tâche assignée", async () => {
    const user = makeUser("u1");
    const project: ProjectWithFlatUsers = {
      id: "proj1",
      name: "Projet Vide",
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      inviteCode: "abc",
      createdById: "owner",
      tasks: [],
      users: [user],
    };

    const result = await new GetTeamsOverviewUseCase(makeProjectRepo([project])).execute(USER_EMAIL);

    expect(result[0].totalTasks).toBe(0);
    expect(result[0].progressPercentage).toBe(0);
  });

  it("ne compte pas comme overdue une tâche Done avec dueDate passée", async () => {
    const user = makeUser("u1");
    const project: ProjectWithFlatUsers = {
      id: "proj1",
      name: "Projet",
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      inviteCode: "abc",
      createdById: "owner",
      tasks: [
        makeTask({ id: "t1", userId: "u1", status: "Done", dueDate: PAST_DATE }),
      ],
      users: [user],
    };

    const result = await new GetTeamsOverviewUseCase(makeProjectRepo([project])).execute(USER_EMAIL);

    expect(result[0].overdueTasks).toBe(0);
  });

  it("ne compte pas comme overdue une tâche avec dueDate future", async () => {
    const user = makeUser("u1");
    const project: ProjectWithFlatUsers = {
      id: "proj1",
      name: "Projet",
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      inviteCode: "abc",
      createdById: "owner",
      tasks: [
        makeTask({ id: "t1", userId: "u1", status: "To Do", dueDate: FUTURE_DATE }),
      ],
      users: [user],
    };

    const result = await new GetTeamsOverviewUseCase(makeProjectRepo([project])).execute(USER_EMAIL);

    expect(result[0].overdueTasks).toBe(0);
  });

  it("agrège correctement les stats sur plusieurs projets", async () => {
    const user = makeUser("u1");
    const proj1: ProjectWithFlatUsers = {
      id: "proj1", name: "P1", description: null,
      createdAt: new Date(), updatedAt: new Date(), inviteCode: "a", createdById: "owner",
      tasks: [makeTask({ id: "t1", userId: "u1", status: "Done" })],
      users: [user],
    };
    const proj2: ProjectWithFlatUsers = {
      id: "proj2", name: "P2", description: null,
      createdAt: new Date(), updatedAt: new Date(), inviteCode: "b", createdById: "owner",
      tasks: [makeTask({ id: "t2", userId: "u1", status: "To Do" })],
      users: [user],
    };

    const result = await new GetTeamsOverviewUseCase(makeProjectRepo([proj1, proj2])).execute(USER_EMAIL);

    // Un enregistrement par (membre × projet)
    expect(result).toHaveLength(2);
    const p1Stats = result.find(r => r.projectId === "proj1")!;
    const p2Stats = result.find(r => r.projectId === "proj2")!;
    expect(p1Stats.completedTasks).toBe(1);
    expect(p2Stats.completedTasks).toBe(0);
  });
});
