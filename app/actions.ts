"use server"

import prisma from "@/lib/prisma";

// Infrastructure
import { PrismaUserRepository } from "@/infrastructure/repositories/PrismaUserRepository";
import { PrismaProjectRepository } from "@/infrastructure/repositories/PrismaProjectRepository";
import { PrismaTaskRepository } from "@/infrastructure/repositories/PrismaTaskRepository";
import { PrismaColumnWIPConfigRepository } from "@/infrastructure/repositories/PrismaColumnWIPConfigRepository";
import { PrismaSGRHistoryRepository } from "@/infrastructure/repositories/PrismaSGRHistoryRepository";

// Use Cases - User
import { CheckAndAddUserUseCase } from "@/application/use-cases/user/CheckAndAddUserUseCase";

// Use Cases - Project
import { CreateProjectUseCase } from "@/application/use-cases/project/CreateProjectUseCase";
import { GetProjectsCreatedByUserUseCase } from "@/application/use-cases/project/GetProjectsCreatedByUserUseCase";
import { DeleteProjectUseCase } from "@/application/use-cases/project/DeleteProjectUseCase";
import { AddUserToProjectUseCase } from "@/application/use-cases/project/AddUserToProjectUseCase";
import { GetProjectsAssociatedWithUserUseCase } from "@/application/use-cases/project/GetProjectsAssociatedWithUserUseCase";
import { GetProjectInfoUseCase } from "@/application/use-cases/project/GetProjectInfoUseCase";
import { GetProjectUsersUseCase } from "@/application/use-cases/project/GetProjectUsersUseCase";

// Use Cases - WIP
import { UpsertWIPConfigUseCase } from "@/application/use-cases/wip/UpsertWIPConfigUseCase";

// Use Cases - SGR
import { CalculateSGRUseCase } from "@/application/use-cases/sgr/CalculateSGRUseCase";
import { SGRTechDebt } from "@/lib/risk-algorithm/types";

// Use Cases - Task
import { CreateTaskUseCase } from "@/application/use-cases/task/CreateTaskUseCase";
import { DeleteTaskUseCase } from "@/application/use-cases/task/DeleteTaskUseCase";
import { GetTaskDetailsUseCase } from "@/application/use-cases/task/GetTaskDetailsUseCase";
import { UpdateTaskStatusUseCase } from "@/application/use-cases/task/UpdateTaskStatusUseCase";

function makeRepos() {
    const userRepo = new PrismaUserRepository(prisma);
    const projectRepo = new PrismaProjectRepository(prisma);
    const taskRepo = new PrismaTaskRepository(prisma);
    const columnWIPConfigRepo = new PrismaColumnWIPConfigRepository(prisma);
    const sgrHistoryRepo = new PrismaSGRHistoryRepository(prisma);
    return { userRepo, projectRepo, taskRepo, columnWIPConfigRepo, sgrHistoryRepo };
}

export async function checkAndAddUser(email: string, name: string, imageUrl?: string) {
    const { userRepo } = makeRepos();
    return new CheckAndAddUserUseCase(userRepo).execute(email, name, imageUrl);
}

export async function createProject(name: string, description: string, email: string) {
    const { userRepo, projectRepo } = makeRepos();
    try {
        return await new CreateProjectUseCase(userRepo, projectRepo).execute(name, description, email);
    } catch (error) {
        console.error(error);
        throw new Error();
    }
}

export async function getProjectsCreatedByUser(email: string) {
    const { projectRepo } = makeRepos();
    try {
        return await new GetProjectsCreatedByUserUseCase(projectRepo).execute(email);
    } catch (error) {
        console.error(error);
        throw new Error();
    }
}

export async function deleteProjectById(projectId: string) {
    const { projectRepo } = makeRepos();
    try {
        return await new DeleteProjectUseCase(projectRepo).execute(projectId);
    } catch (error) {
        console.error(error);
        throw new Error();
    }
}

export async function addUserToProject(email: string, inviteCode: string) {
    const { userRepo, projectRepo } = makeRepos();
    try {
        return await new AddUserToProjectUseCase(userRepo, projectRepo).execute(email, inviteCode);
    } catch (error) {
        console.error(error);
        throw new Error();
    }
}

export async function getProjectsAssociatedWithUser(email: string) {
    const { projectRepo } = makeRepos();
    try {
        return await new GetProjectsAssociatedWithUserUseCase(projectRepo).execute(email);
    } catch (error) {
        console.error(error);
        throw new Error();
    }
}

export async function getProjectInfo(idProject: string, details: boolean) {
    const { projectRepo } = makeRepos();
    try {
        return await new GetProjectInfoUseCase(projectRepo).execute(idProject, details);
    } catch (error) {
        console.error(error);
        throw new Error();
    }
}

export async function getProjectUser(idProject: string) {
    const { projectRepo } = makeRepos();
    try {
        return await new GetProjectUsersUseCase(projectRepo).execute(idProject);
    } catch (error) {
        console.error(error);
        throw new Error();
    }
}

export async function createTask(
    name: string,
    description: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH',
    startDate: Date | null,
    dueDate: Date | null,
    projectId: string,
    createdByEmail: string,
    assignToEmail: string | undefined
) {
    const { userRepo, taskRepo } = makeRepos();
    try {
        return await new CreateTaskUseCase(userRepo, taskRepo).execute(
            name, description, priority, startDate, dueDate, projectId, createdByEmail, assignToEmail
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[createTask Error]', message);
        throw new Error(message);
    }
}

export async function deleteTaskById(taskId: string) {
    const { taskRepo } = makeRepos();
    try {
        return await new DeleteTaskUseCase(taskRepo).execute(taskId);
    } catch (error) {
        console.error(error);
        throw new Error();
    }
}

export const getTakDetails = async (taskId: string) => {
    const { taskRepo } = makeRepos();
    try {
        return await new GetTaskDetailsUseCase(taskRepo).execute(taskId);
    } catch (error) {
        console.error(error);
        throw new Error();
    }
};

/**
 * Calcule le Score Global de Risque (SGR) pour un projet.
 * Données SonarQube optionnelles — absentes si l'intégration n'est pas configurée.
 */
export async function getProjectSGR(
    projectId: string,
    techDebt?: SGRTechDebt
) {
    const { taskRepo, columnWIPConfigRepo, sgrHistoryRepo } = makeRepos();
    try {
        return await new CalculateSGRUseCase(taskRepo, columnWIPConfigRepo, sgrHistoryRepo).execute({
            projectId,
            techDebt,
        });
    } catch (error) {
        console.error('[SGR Error]', error);
        throw new Error(`Erreur lors du calcul du SGR: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Récupère les limites WIP configurées pour un projet.
 */
export async function getWIPConfigs(projectId: string) {
    const { columnWIPConfigRepo } = makeRepos();
    try {
        return await columnWIPConfigRepo.findByProject(projectId);
    } catch (error) {
        console.error('[WIP Error]', error);
        throw new Error(`Erreur lors du chargement des configs WIP: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Sauvegarde les limites WIP pour les 3 colonnes Kanban d'un projet.
 * Une limite à 0 signifie "pas de limite".
 */
export async function upsertWIPConfigs(
    projectId: string,
    configs: { column: string; wipLimit: number }[]
) {
    const { columnWIPConfigRepo } = makeRepos();
    try {
        return await new UpsertWIPConfigUseCase(columnWIPConfigRepo).execute({
            projectId,
            configs: configs as { column: 'To Do' | 'In Progress' | 'Done'; wipLimit: number }[],
        });
    } catch (error) {
        console.error('[WIP Error]', error);
        throw new Error(`Erreur lors de la sauvegarde des configs WIP: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Récupère l'historique des scores SGR d'un projet, du plus ancien au plus récent.
 * Retourne des données sérialisables (createdAt converti en string ISO).
 */
export async function getSGRHistory(projectId: string): Promise<{
    id: string;
    sgr: number;
    niveau: string;
    createdAt: string;
}[]> {
    const { sgrHistoryRepo } = makeRepos();
    try {
        const entries = await sgrHistoryRepo.findByProject(projectId);
        // findByProject retourne du plus récent au plus ancien — on inverse pour le graphique
        return [...entries].reverse().map((e) => ({
            id: e.id,
            sgr: e.sgr,
            niveau: e.niveau,
            createdAt: new Date(e.createdAt).toISOString(),
        }));
    } catch (error) {
        console.error('[SGR History Error]', error);
        return [];
    }
}

export const updateTaskStatus = async (
    taskId: string,
    newStatus: string,
    solutionDescription?: string
) => {
    const { taskRepo } = makeRepos();
    try {
        return await new UpdateTaskStatusUseCase(taskRepo).execute(taskId, newStatus, solutionDescription);
    } catch (error) {
        console.error('[UpdateStatus Error]', error);
        throw new Error(`Erreur lors du changement de status: ${error instanceof Error ? error.message : String(error)}`);
    }
};
