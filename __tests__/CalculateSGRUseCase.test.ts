/**
 * Tests d'intégration — CalculateSGRUseCase
 *
 * Valide l'orchestration du use-case : récupération des données
 * via les repositories et délégation au moteur SGR.
 *
 * Stratégie : mocking des repositories (ITaskRepository,
 * IColumnWIPConfigRepository, ISGRHistoryRepository) pour isoler
 * le use-case de toute dépendance infrastructure.
 *
 * Section mémoire : 4.1 — Stratégie de test
 */

import { CalculateSGRUseCase } from "@/application/use-cases/sgr/CalculateSGRUseCase";
import { ITaskRepository } from "@/domain/repositories/ITaskRepository";
import { IColumnWIPConfigRepository } from "@/domain/repositories/IColumnWIPConfigRepository";
import { ISGRHistoryRepository } from "@/domain/repositories/ISGRHistoryRepository";
import { TaskEntity } from "@/domain/entities/Task";
import { ColumnWIPConfigEntity } from "@/domain/entities/ColumnWIPConfig";
import { SGRHistoryEntity } from "@/domain/entities/SGRHistory";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DATE_REF = new Date("2025-06-01");

/** Crée un mock minimal de ITaskRepository */
function makeTaskRepo(tasks: Partial<TaskEntity>[] = []): jest.Mocked<ITaskRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdWithRelations: jest.fn(),
    findByProject: jest.fn().mockResolvedValue(tasks),
    delete: jest.fn(),
    updateStatus: jest.fn(),
  } as unknown as jest.Mocked<ITaskRepository>;
}

/** Crée un mock minimal de IColumnWIPConfigRepository */
function makeWIPRepo(configs: ColumnWIPConfigEntity[] = []): jest.Mocked<IColumnWIPConfigRepository> {
  return {
    findByProject: jest.fn().mockResolvedValue(configs),
    findByProjectAndColumn: jest.fn(),
    upsert: jest.fn(),
  } as unknown as jest.Mocked<IColumnWIPConfigRepository>;
}

/** Crée un mock minimal de ISGRHistoryRepository */
function makeHistoryRepo(): jest.Mocked<ISGRHistoryRepository> {
  return {
    save: jest.fn().mockResolvedValue({
      id: "hist-1",
      projectId: "proj-1",
      sgr: 0,
      niveau: "faible",
      alertes: "[]",
      createdAt: DATE_REF,
    } as SGRHistoryEntity),
    findByProject: jest.fn().mockResolvedValue([]),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CalculateSGRUseCase — orchestration", () => {
  it("appelle findByProject sur les deux repositories avec le bon projectId", async () => {
    const taskRepo = makeTaskRepo();
    const wipRepo = makeWIPRepo();
    const useCase = new CalculateSGRUseCase(taskRepo, wipRepo);

    await useCase.execute({ projectId: "proj-abc", dateReference: DATE_REF });

    expect(taskRepo.findByProject).toHaveBeenCalledWith("proj-abc");
    expect(wipRepo.findByProject).toHaveBeenCalledWith("proj-abc");
  });

  it("retourne un SGRResult avec les bonnes propriétés", async () => {
    const useCase = new CalculateSGRUseCase(makeTaskRepo(), makeWIPRepo());
    const result = await useCase.execute({ projectId: "proj-abc", dateReference: DATE_REF });

    expect(result).toHaveProperty("sgr");
    expect(result).toHaveProperty("niveau");
    expect(result).toHaveProperty("indicateurs");
    expect(result).toHaveProperty("alertes");
    expect(typeof result.sgr).toBe("number");
  });

  it("retourne SGR = 0 quand le projet n'a aucune tâche ni config WIP", async () => {
    const useCase = new CalculateSGRUseCase(makeTaskRepo([]), makeWIPRepo([]));
    const result = await useCase.execute({ projectId: "proj-vide", dateReference: DATE_REF });

    expect(result.sgr).toBe(0);
    expect(result.niveau).toBe("faible");
  });

  it("calcule un score R_WIP > 0 quand le WIP dépasse la limite configurée", async () => {
    // 4 tâches "In Progress" pour une limite de 2
    const tasks = Array.from({ length: 4 }, (_, i) => ({
      id: `t${i}`,
      status: "In Progress",
      startedAt: new Date("2025-05-28"),
      completedAt: null,
    }));
    const configs: ColumnWIPConfigEntity[] = [
      { id: "c1", projectId: "proj-1", column: "In Progress", wipLimit: 2 },
    ];

    const useCase = new CalculateSGRUseCase(makeTaskRepo(tasks), makeWIPRepo(configs));
    const result = await useCase.execute({ projectId: "proj-1", dateReference: DATE_REF });

    expect(result.indicateurs.wip.score).toBeGreaterThan(0);
    expect(result.sgr).toBeGreaterThan(0);
  });

  it("intègre les données SonarQube dans R_Tech quand techDebt est fourni", async () => {
    const useCase = new CalculateSGRUseCase(makeTaskRepo(), makeWIPRepo());
    const result = await useCase.execute({
      projectId: "proj-1",
      techDebt: { bugsBloquants: 5, codeSmells: 50, detteTechniqueDays: 5 },
      dateReference: DATE_REF,
    });

    expect(result.indicateurs.tech.score).toBeGreaterThan(0);
  });

  it("ne persiste PAS l'historique si sgrHistoryRepository n'est pas fourni", async () => {
    const historyRepo = makeHistoryRepo();
    // Use-case sans repository d'historique (3e param absent)
    const useCase = new CalculateSGRUseCase(makeTaskRepo(), makeWIPRepo());

    await useCase.execute({ projectId: "proj-1", dateReference: DATE_REF });

    expect(historyRepo.save).not.toHaveBeenCalled();
  });

  it("persiste l'historique SGR si sgrHistoryRepository est fourni", async () => {
    const historyRepo = makeHistoryRepo();
    const useCase = new CalculateSGRUseCase(makeTaskRepo(), makeWIPRepo(), historyRepo);

    const result = await useCase.execute({ projectId: "proj-1", dateReference: DATE_REF });

    expect(historyRepo.save).toHaveBeenCalledTimes(1);
    expect(historyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj-1",
        sgr: result.sgr,
        niveau: result.niveau,
      })
    );
  });

  it("sérialise les alertes en JSON dans l'historique", async () => {
    const historyRepo = makeHistoryRepo();
    // Tâches qui dépassent WIP → génère des alertes
    const tasks = Array.from({ length: 5 }, (_, i) => ({
      id: `t${i}`,
      status: "In Progress",
      startedAt: new Date("2025-05-28"),
      completedAt: null,
    }));
    const configs: ColumnWIPConfigEntity[] = [
      { id: "c1", projectId: "proj-1", column: "In Progress", wipLimit: 2 },
    ];
    const useCase = new CalculateSGRUseCase(makeTaskRepo(tasks), makeWIPRepo(configs), historyRepo);

    await useCase.execute({ projectId: "proj-1", dateReference: DATE_REF });

    const appelSave = historyRepo.save.mock.calls[0][0];
    // Vérifier que alertes est une chaîne JSON valide
    expect(() => JSON.parse(appelSave.alertes)).not.toThrow();
    const alertes = JSON.parse(appelSave.alertes);
    expect(Array.isArray(alertes)).toBe(true);
    expect(alertes.length).toBeGreaterThan(0);
  });

  it("les indicateurs détaillés correspondent au score global", async () => {
    const tasks = Array.from({ length: 3 }, (_, i) => ({
      id: `t${i}`,
      status: "In Progress",
      startedAt: new Date("2025-05-28"),
      completedAt: null,
    }));
    const configs: ColumnWIPConfigEntity[] = [
      { id: "c1", projectId: "proj-1", column: "In Progress", wipLimit: 1 },
    ];
    const useCase = new CalculateSGRUseCase(makeTaskRepo(tasks), makeWIPRepo(configs));
    const result = await useCase.execute({ projectId: "proj-1", dateReference: DATE_REF });

    // Avec la formule hiérarchique, SGR = scoreFlow×0.50 + 0 + 0
    // scoreFlow = somme des contributions des indicateurs de flux
    const scoreFlow =
      result.indicateurs.wip.contribution +
      result.indicateurs.cycleTime.contribution +
      result.indicateurs.age.contribution +
      result.indicateurs.throughput.contribution;

    expect(result.sgr).toBeCloseTo(scoreFlow * 0.50, 0);
  });
});
