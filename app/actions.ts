"use server"

import prisma from "@/lib/prisma";
import { error } from "node:console";
import { randomBytes } from "crypto";
import { use } from "react";

export async function checkAndAddUser(email: string, name: string) {
    if (!email) return
    try {
        const existingUser = await prisma.user.findUnique({
            where: {
                email: email
            }
        })
        if (!existingUser && name) {
            await prisma.user.create({
                data: {
                    email: email,
                    name: name
                }
            })
            console.error("Erreur lors de la verification de l'tutilisateur:")
        } else {
            console.error("Utilisateur deja present dans la base de donnees:")
        }
    } catch (error) {
        console.error("Erreur lors de la verification de l'tutilisateur:", error);
    }
}

function generateUniqueCode(): string {
    return randomBytes(6).toString('hex')
}
export async function createProject(name: string, description: string, email: string) {
    try {
        const inviteCode = generateUniqueCode()
        const user = await prisma.user.findUnique({
            where: {
                email
            }
        })

        if (!user) {
            throw new Error('User not found')
        }

        const newProject = await prisma.project.create({
            data: {
                name,
                description,
                inviteCode,
                createdById: user.id
            }
        })
        return newProject;

    } catch (error) {
        console.error(error)
        throw new Error
    }
}

export async function getProjectsCreatedByUser(email: string) {
    try {
        const projects = await prisma.project.findMany({
            where: {
                createdBy: { email }
            },
            include: {
                tasks: {
                    include: {
                        user: true,
                        createdBy: true
                    },
                },
                users: {
                    select: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                }
            }
        })

        const formatedProjects = projects.map((project) => ({
            ...project,
            users: project.users.map((userEntry) => userEntry.user)
        }))

        return formatedProjects

    } catch (error) {
        console.error(error)
        throw new Error
    }
}

export async function deleteProjectById(projectId: string) {
    try {
        await prisma.project.delete({
            where: {
                id: projectId
            }
        })
        console.log(`Projet avec l'ID ${projectId} supprimer avec succes.`);
    } catch (error) {
        console.error(error)
        throw new Error
    }
}

export async function addUserToProject(email: string, inviteCode: string) {
    try {

        const project = await prisma.project.findUnique({
            where: { inviteCode }

        })

        if (!project) {
            throw new Error('Projet non trouve');
        }

        const user = await prisma.user.findUnique({
            where: { email }

        })

        if (!user) {
            throw new Error('Utilisateur non trouve');
        }

        const existingAssociation = await prisma.projectUser.findUnique({
            where: {
                userId_projectId: {
                    userId: user.id,
                    projectId: project.id
                }
            }
        })

        if (existingAssociation) {
            throw new Error('Utilisateur deja associer a ce projet');
        }

        await prisma.projectUser.create({
            data: {
                userId: user.id,
                projectId: project.id
            }
        })

        return "Utilisateur ajoute avec succes";

    } catch (error) {
        console.error(error)
        throw new Error
    }
}

export async function getProjectsAssociatedWithUser(email: string) {
    try {
        const projects = await prisma.project.findMany({
            where: {
                users: {
                    some: {
                        user: {
                            email
                        }
                    }
                }
            },
            include: {
                tasks: true,
                users: {
                    select: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                }
            }
        })

        const formatedProjects = projects.map((project) => ({
            ...project,
            users: project.users.map((userEntry) => userEntry.user)
        }))

        return formatedProjects
    } catch (error) {
        console.error(error)
        throw new Error
    }
}

export async function getProjectInfo(idProject: string, details: boolean) {
    try {
        const project = await prisma.project.findUnique({
            where: {
                id: idProject
            },
            include: details ? {
                tasks: {
                    include: {
                        user: true,
                        createdBy: true
                    }
                },
                users: {
                    select: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                },
                createdBy: true
            } : undefined
        })

        if (!project) {
            throw new Error('Projet non trouve');
        }

        return project

    } catch (error) {
        console.error(error)
        throw new Error
    }
}

export async function getProjectUser(idProject: string) {
    try {
        const projectWithUser = await prisma.project.findUnique({
            where: {
                id: idProject
            },
            include: {
                users: {
                    include: {
                        user: true,
                    }
                },
            }
        })

        const users = projectWithUser?.users.map((projectUser => projectUser.user)) || []
        return users

    } catch (error) {
        console.error(error)
        throw new Error
    }
}

/* actions.ts
export async function getProjectUser(idProject: string) {
    try {
        const projectWithUser = await prisma.project.findUnique({
            where: { id: idProject },
            include: { users: { include: { user: true } } }
        });

        console.log("Utilisateurs trouvés pour ce projet:", projectWithUser?.users.length);
        
        const users = projectWithUser?.users.map((projectUser => projectUser.user)) || [];
        return users;
    } catch (error) {  console.error(error)
        throw new Error }
}*/

export async function createTask(
    name: string,
    description: string,
    dueDate: Date | null,
    projectId: string,
    createdByEmail: string,
    assignToEmail: string | undefined
) {
    try {
        const createdBy = await prisma.user.findUnique({
            where: { email: createdByEmail }
        })

        if (!createdBy) {
            throw new Error(`utilisateur avec l'email ${createdByEmail} introuvable`);
        }

        let assignUserId = createdBy.id

        if (assignToEmail) {
            const assignUser = await prisma.user.findUnique({
                where: { email: assignToEmail }
            })
            if (!assignUser) {
                throw new Error(`utilisateur avec l'email ${assignToEmail} introuvable`);
            }
            assignUserId = assignUser.id
        }

        const newTask = await prisma.task.create({
            data: {
                name,
                description,
                dueDate,
                projectId,
                createdById: createdBy.id,
                userId: assignUserId
            }
        })

        console.log('Tâche créée avec succès:', newTask);
        return newTask;

    } catch (error) {
        console.error(error)
        throw new Error
    }
}

export async function deleteTaskById(taskId: string) {
    try {
        await prisma.task.delete({
            where: {
                id: taskId
            }
        })
    } catch (error) {
        console.error(error)
        throw new Error
    }
}

export const getTakDetails = async (taskId: string) => {
    try {
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                project: true,
                user: true,
                createdBy: true
            }
        })

        if (!task) {
            throw new Error('Tache non trouvee')
        }

        return task
    } catch (error) {
        console.error(error)
        throw new Error
    }
}

export const updateTaskStatus = async (taskId: string, newStatus: string, solutionDescription?: string) => {
    try {
        const existingTask = await prisma.task.findUnique({
            where: {
                id: taskId
            }
        })

        if (!existingTask) {
            throw new Error('Tache non trouve');
        }

        if (newStatus === "Done" && solutionDescription) {
            await prisma.task.update({
                where: { id: taskId },
                data: {
                    status: newStatus,
                    solutionDescription
                }
            })
        } else {
            await prisma.task.update({
                where: { id: taskId },
                data: {
                    status: newStatus
                }
            })
        }

    } catch (error) {
        console.error(error)
        throw new Error
    }
}