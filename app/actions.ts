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
import { GetTeamsOverviewUseCase } from "@/application/use-cases/project/GetTeamsOverviewUseCase";
import { GetAnalyticsDataUseCase } from "@/application/use-cases/analytics/GetAnalyticsDataUseCase";

// Use Cases - WIP
import { UpsertWIPConfigUseCase } from "@/application/use-cases/wip/UpsertWIPConfigUseCase";

// Use Cases - SGR
import { CalculateSGRUseCase } from "@/application/use-cases/sgr/CalculateSGRUseCase";
import { SGRTechDebt } from "@/lib/risk-algorithm/types";
import { fetchCodacyMetrics } from "@/lib/codacy-api";

// Push notifications
import { sendPushToSubscriptions } from "@/lib/push-notifications";

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
        console.error('[createProject Action Error]', error);
        throw error;
    }
}

export async function getProjectsCreatedByUser(email: string) {
    const { projectRepo } = makeRepos();
    try {
        return await new GetProjectsCreatedByUserUseCase(projectRepo).execute(email);
    } catch (error) {
        console.error('[getProjectsCreatedByUser Error]', error);
        throw error;
    }
}

export async function deleteProjectById(projectId: string) {
    const { projectRepo } = makeRepos();
    try {
        return await new DeleteProjectUseCase(projectRepo).execute(projectId);
    } catch (error) {
        console.error('[deleteProjectById Error]', error);
        throw error;
    }
}

/** Met à jour le nom d'un projet (renommage inline depuis la page projet) */
export async function updateProjectName(projectId: string, newName: string): Promise<void> {
    const trimmed = newName.trim();
    if (!trimmed) throw new Error("Project name cannot be empty");
    await prisma.project.update({
        where: { id: projectId },
        data: { name: trimmed },
    });
}

export async function addUserToProject(email: string, inviteCode: string) {
    const { userRepo, projectRepo } = makeRepos();
    try {
        return await new AddUserToProjectUseCase(userRepo, projectRepo).execute(email, inviteCode);
    } catch (error) {
        console.error('[addUserToProject Error]', error);
        throw error;
    }
}

export async function getProjectsAssociatedWithUser(email: string) {
    const { projectRepo } = makeRepos();
    try {
        return await new GetProjectsAssociatedWithUserUseCase(projectRepo).execute(email);
    } catch (error) {
        console.error('[getProjectsAssociatedWithUser Error]', error);
        throw error;
    }
}

export async function getProjectInfo(idProject: string, details: boolean) {
    const { projectRepo } = makeRepos();
    try {
        return await new GetProjectInfoUseCase(projectRepo).execute(idProject, details);
    } catch (error) {
        console.error('[getProjectInfo Error]', error);
        throw error;
    }
}

export async function getProjectUser(idProject: string) {
    const { projectRepo } = makeRepos();
    try {
        return await new GetProjectUsersUseCase(projectRepo).execute(idProject);
    } catch (error) {
        console.error('[getProjectUser Error]', error);
        throw error;
    }
}

export async function getAnalyticsData(email: string) {
    const { projectRepo, sgrHistoryRepo } = makeRepos();
    try {
        return await new GetAnalyticsDataUseCase(projectRepo, sgrHistoryRepo).execute(email);
    } catch (error) {
        console.error('[getAnalyticsData Error]', error);
        throw error;
    }
}

export async function getTeamsOverview(email: string) {
    const { projectRepo } = makeRepos();
    try {
        return await new GetTeamsOverviewUseCase(projectRepo).execute(email);
    } catch (error) {
        console.error('[getTeamsOverview Error]', error);
        throw error;
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
        console.error('[deleteTaskById Error]', error);
        throw error;
    }
}

export const getTakDetails = async (taskId: string) => {
    const { taskRepo } = makeRepos();
    try {
        return await new GetTaskDetailsUseCase(taskRepo).execute(taskId);
    } catch (error) {
        console.error('[getTakDetails Error]', error);
        throw error;
    }
};

/**
 * Calcule le Score Global de Risque (SGR) pour un projet.
 * Si CODACY_API_TOKEN est configuré, les métriques qualité sont récupérées
 * automatiquement depuis l'API Codacy (R_Quality).
 */
export async function getProjectSGR(
    projectId: string,
    techDebt?: SGRTechDebt
) {
    const { taskRepo, columnWIPConfigRepo, sgrHistoryRepo } = makeRepos();
    try {
        // Récupération automatique des métriques Codacy si le token est disponible
        const codacyToken = process.env.CODACY_API_TOKEN;
        const codacyOrg = process.env.CODACY_ORG ?? 'Mr-TounkS';
        const codacyRepo = process.env.CODACY_REPO ?? 'taskmanage';

        const resolvedTechDebt = techDebt ?? (
            codacyToken
                ? await fetchCodacyMetrics(codacyOrg, codacyRepo, codacyToken)
                : null
        ) ?? undefined;

        const result = await new CalculateSGRUseCase(taskRepo, columnWIPConfigRepo, sgrHistoryRepo).execute({
            projectId,
            techDebt: resolvedTechDebt,
        });

        // Déclenche une notification push si le SGR dépasse le seuil d'alerte
        if (result.sgr >= 60) {
            await notifyProjectMembersPush(projectId, result.sgr, result.niveau);
        }

        return result;
    } catch (error) {
        console.error('[SGR Error]', error);
        throw new Error(`Erreur lors du calcul du SGR: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Envoie une notification push à tous les membres abonnés d'un projet.
 * Supprime automatiquement les abonnements expirés (code 410).
 */
async function notifyProjectMembersPush(
    projectId: string,
    sgr: number,
    niveau: string
): Promise<void> {
    try {
        // Récupère tous les abonnements push des membres du projet
        const subscriptions = await prisma.pushSubscription.findMany({
            where: {
                user: {
                    OR: [
                        { userProjects: { some: { projectId } } },
                        { createdProjects: { some: { id: projectId } } },
                    ],
                },
            },
        });

        if (subscriptions.length === 0) return;

        const isCritical = sgr >= 80;
        const payload = {
            title: isCritical ? "Risque critique détecté" : "Risque modéré détecté",
            body: `SGR : ${Math.round(sgr)}/100 — Niveau ${niveau}. Vérifiez votre tableau Kanban.`,
            url: `/project/${projectId}`,
            icon: "/android-192x192.png",
        };

        const expiredEndpoints = await sendPushToSubscriptions(subscriptions, payload);

        // Nettoie les abonnements expirés
        if (expiredEndpoints.length > 0) {
            await prisma.pushSubscription.deleteMany({
                where: { endpoint: { in: expiredEndpoints } },
            });
        }
    } catch (error) {
        // Ne bloque jamais le calcul SGR si le push échoue
        console.error("[Push SGR] Erreur notification :", error);
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
 * Vérifie que l'utilisateur est bien le Product Owner (PO) du projet.
 */
export async function upsertWIPConfigs(
    projectId: string,
    configs: { column: string; wipLimit: number }[],
    userEmail: string // Email de l'utilisateur effectuant l'action
) {
    const { columnWIPConfigRepo, projectRepo, userRepo } = makeRepos();
    try {
        // 1. Récupérer l'utilisateur
        const user = await userRepo.findByEmail(userEmail);
        if (!user) throw new Error("Utilisateur non trouvé");

        // 2. Vérifier le rôle dans le projet
        const projectWithUsers = await projectRepo.findWithAllUsers(projectId);
        if (!projectWithUsers) throw new Error("Projet non trouvé");

        const userRole = projectWithUsers.users.find(u => u.user.id === user.id)?.role;
        if (userRole !== 'PO') {
            throw new Error("Action non autorisée : Seul le Product Owner peut modifier les limites WIP.");
        }

        // 3. Exécuter la mise à jour
        return await new UpsertWIPConfigUseCase(columnWIPConfigRepo).execute({
            projectId,
            configs: configs as { column: 'To Do' | 'In Progress' | 'Done'; wipLimit: number }[],
        });
    } catch (error) {
        console.error('[WIP Auth Error]', error);
        throw new Error(error instanceof Error ? error.message : "Erreur de sécurité lors de la sauvegarde");
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
        throw error;
    }
};

/**
 * Retourne tous les fichiers attachés à une tâche, triés par date d'upload.
 */
export const getTaskFiles = async (taskId: string) => {
    try {
        return await prisma.taskFile.findMany({
            where: { taskId },
            orderBy: { uploadedAt: 'asc' },
            select: { id: true, fileName: true, fileSize: true, mimeType: true, blobUrl: true },
        });
    } catch (error) {
        console.error('[GetTaskFiles Error]', error);
        return [];
    }
};

// Téléchargement de fichiers pour les tâches complétées
export const uploadTaskFile = async (taskId: string, formData: FormData) => {
    const { put } = await import('@vercel/blob');

    try {
        const file = formData.get('file') as File;
        if (!file) throw new Error('No file provided');

        // Validation de la taille (max 5 MB)
        const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
        if (file.size > MAX_SIZE) {
            throw new Error(`File size exceeds 5 MB limit. Size: ${Math.round(file.size / 1024 / 1024)} MB`);
        }

        // Vérification du nombre de fichiers existants
        const existingFiles = await prisma.taskFile.findMany({ where: { taskId } });
        if (existingFiles.length >= 5) {
            throw new Error('Maximum 5 files per task');
        }

        // Upload vers Vercel Blob
        const filename = `${Date.now()}-${file.name}`;
        const blob = await put(`tasks/${taskId}/${filename}`, file, { access: 'public' });

        // Enregistrement des métadonnées
        const taskFile = await prisma.taskFile.create({
            data: {
                taskId,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
                blobUrl: blob.url,
            },
        });

        return {
            fileId: taskFile.id,
            fileName: taskFile.fileName,
            fileSize: taskFile.fileSize,
            blobUrl: taskFile.blobUrl,
        };
    } catch (error) {
        console.error('[Upload File Error]', error);
        throw error;
    }
};

// ---------------------------------------------------------------------------
// Intégration GitHub — configuration webhook par projet
// ---------------------------------------------------------------------------

import { PrismaExternalIntegrationRepository } from "@/infrastructure/repositories/PrismaExternalIntegrationRepository";

/** Enregistre ou met à jour la configuration GitHub d'un projet */
export async function saveGitHubIntegration(
    projectId: string,
    repoFullName: string,
    webhookSecret: string,
) {
    if (!repoFullName.match(/^[\w.-]+\/[\w.-]+$/)) {
        throw new Error("Format invalide — utiliser owner/repo (ex: vercel/next.js)");
    }
    const repo = new PrismaExternalIntegrationRepository(prisma);
    return repo.upsert({ projectId, type: 'github', externalProjectRef: repoFullName, webhookSecret });
}

/** Récupère la configuration GitHub existante d'un projet (null si absente) */
export async function getGitHubIntegration(projectId: string) {
    const repo = new PrismaExternalIntegrationRepository(prisma);
    return repo.findByProjectAndType(projectId, 'github');
}

/** Supprime l'intégration GitHub d'un projet */
export async function deleteGitHubIntegration(projectId: string) {
    const repo = new PrismaExternalIntegrationRepository(prisma);
    const integration = await repo.findByProjectAndType(projectId, 'github');
    if (integration) await repo.delete(integration.id);
}

// Suppression de fichier
export const deleteTaskFile = async (fileId: string) => {
    const { del } = await import('@vercel/blob');

    try {
        // Récupération du fichier avant suppression
        const taskFile = await prisma.taskFile.findUnique({ where: { id: fileId } });
        if (!taskFile) throw new Error('File not found');

        // Suppression de Vercel Blob
        await del(taskFile.blobUrl);

        // Suppression de la base de données
        await prisma.taskFile.delete({ where: { id: fileId } });

        return { success: true };
    } catch (error) {
        console.error('[Delete File Error]', error);
        throw error;
    }
};
