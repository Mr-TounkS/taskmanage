"use client"
import { deleteTaskById, getProjectInfo } from "@/app/actions";
import EmptyState from "@/app/components/EmptyState";
import ProjectComponent from "@/app/components/ProjectComponent";
import TaskComponent from "@/app/components/TaskComponent";
import KanbanBoard from "@/app/components/KanbanBoard";
import UserInfo from "@/app/components/UserInfo";
import SGRWidget from "@/app/components/SGRWidget";
import WIPConfigWidget from "@/app/components/WIPConfigWidget";
import Wrapper from "@/app/components/Wrapper";
import { Project } from "@/app/type";
import { useUser } from "@clerk/nextjs";
import { CircleCheckBig, CopyPlus, Kanban, List, ListTodo, Loader, SlidersHorizontal, UserCheck } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

const page = ({ params }: { params: Promise<{ projectId: string }> }) => {

    const { user } = useUser();
    const email = user?.primaryEmailAddress?.emailAddress;
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<Project | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [assignedFilter, setAssignedFilter] = useState<boolean>(false);
    const [taskCounts, setTaskCounts] = useState({ todo: 0, inProgress: 0, done: 0, assigned: 0 })
    const [sgrRefreshKey, setSgrRefreshKey] = useState(0)
    // Vue active : "liste" ou "kanban"
    const [vue, setVue] = useState<"liste" | "kanban">("liste")

    const fetchInfos = async (projectId: string) => {
        try {
            const project = await getProjectInfo(projectId, true)
            setProject(project)
            // Déclenche le recalcul du SGR à chaque rechargement du projet
            setSgrRefreshKey(k => k + 1)
        } catch (error) {
            console.error("Erreur lors du chargement du projet:", error);
        }
    }

    useEffect(() => {
        const getId = async () => {
            const resolvedParams = await params;
            setProjectId(resolvedParams.projectId);
            fetchInfos(resolvedParams.projectId)
        }
        getId()
    }, [params])

    // Recalcule le SGR quand l'utilisateur revient sur l'onglet (ex: après changement de statut)
    useEffect(() => {
        if (!projectId) return
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchInfos(projectId)
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [projectId])

    useEffect(() => {
        if (project && project.tasks) {
            const counts = {
                todo: project.tasks.filter(task => task.status == "To Do").length,
                inProgress: project.tasks.filter(task => task.status == "In Progress").length,
                done: project.tasks.filter(task => task.status == "Done").length,
                assigned: project.tasks.filter(task => task?.user?.email == email).length
            }
            setTaskCounts(counts)
        }
    }, [project, email])


    const filteredTasks = project?.tasks?.filter(task => {
        const statutsMatch = !statusFilter || task.status == statusFilter
        const assignedMatch = !assignedFilter || task?.user?.email == email
        return statutsMatch && assignedMatch
    })

    const deleteTask = async (taskId: string) => {
        try {
            await deleteTaskById(taskId)
            fetchInfos(projectId)
            toast.success('Tache supprimée !')
        } catch (error) {
            toast.error('Error task project')
        }
    }

    return (
        <Wrapper>
            <div className="flex flex-col lg:flex-row gap-6">
                <div className="w-full lg:w-72 xl:w-80 shrink-0">
                    <div className="p-5 border border-base-300 rounded-xl mb-6">
                        <UserInfo
                            role="Creer par"
                            email={project?.createdBy?.email || null}
                            name={project?.createdBy?.name || null}
                            imageUrl={project?.createdBy?.imageUrl || null}
                        />
                    </div>

                    {/* Configuration des limites WIP — alimente R_WIP dans le SGR */}
                    {projectId && (
                        <WIPConfigWidget
                            projectId={projectId}
                            taskCounts={taskCounts}
                            onSaved={() => setSgrRefreshKey(k => k + 1)}
                        />
                    )}

                    {/* Widget SGR — recalculé à chaque rechargement du projet */}
                    {projectId && <SGRWidget projectId={projectId} refreshKey={sgrRefreshKey} />}

                    <div className="w-full">
                        {project && (
                            <ProjectComponent project={project} admin={0} style={false} ></ProjectComponent>
                        )}
                    </div>
                </div>
                <div className="w-full min-w-0">

                    {/* Barre d'outils : filtres + toggle vue + nouvelle tâche */}
                    <div className="flex flex-wrap justify-between items-start gap-3">
                        <div className="flex flex-col">
                            {/* Filtres — masqués en vue Kanban (la board gère elle-même les colonnes) */}
                            {vue === "liste" && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <button
                                        onClick={() => { setStatusFilter(''); setAssignedFilter(false) }}
                                        className={`btn btn-sm ${!statusFilter && !assignedFilter ? 'btn-primary' : ''}`}>
                                        <SlidersHorizontal className="w-4" /> Tous ({project?.tasks?.length || 0})
                                    </button>

                                    <button
                                        onClick={() => { setStatusFilter('To Do') }}
                                        className={`btn btn-sm ${statusFilter === "To Do" ? 'btn-primary' : ''}`}>
                                        <ListTodo className="w-4" /> A faire ({taskCounts.todo})
                                    </button>

                                    <button
                                        onClick={() => { setStatusFilter('In Progress') }}
                                        className={`btn btn-sm ${statusFilter === "In Progress" ? 'btn-primary' : ''}`}>
                                        <Loader className="w-4" /> En Cours ({taskCounts.inProgress})
                                    </button>

                                    <button
                                        onClick={() => { setStatusFilter('Done') }}
                                        className={`btn btn-sm ${statusFilter === "Done" ? 'btn-primary' : ''}`}>
                                        <CircleCheckBig className="w-4" /> Finis ({taskCounts.done})
                                    </button>

                                    <button
                                        onClick={() => { setAssignedFilter(!assignedFilter) }}
                                        className={`btn btn-sm ${assignedFilter ? 'btn-primary' : ''}`}>
                                        <UserCheck className="w-4" /> Vos taches ({taskCounts.assigned})
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Groupe droite : toggle vue + bouton nouvelle tâche */}
                        <div className="flex items-center gap-2 mt-2 md:mt-0 shrink-0">
                            {/* Toggle Vue Liste / Vue Kanban */}
                            <div className="join">
                                <button
                                    onClick={() => setVue("liste")}
                                    className={`join-item btn btn-sm ${vue === "liste" ? "btn-primary" : ""}`}
                                    title="Vue liste"
                                >
                                    <List className="w-4 h-4" />
                                    Liste
                                </button>
                                <button
                                    onClick={() => setVue("kanban")}
                                    className={`join-item btn btn-sm ${vue === "kanban" ? "btn-primary" : ""}`}
                                    title="Vue Kanban"
                                >
                                    <Kanban className="w-4 h-4" />
                                    Kanban
                                </button>
                            </div>

                            <Link href={`/new-tasks/${projectId}`} className="btn btn-sm">
                                Nouvelle tache
                                <CopyPlus />
                            </Link>
                        </div>
                    </div>

                    {/* Contenu principal : Vue Liste ou Vue Kanban */}
                    <div className="mt-6">
                        {vue === "kanban" ? (
                            /* ── Vue Kanban ── */
                            project?.tasks && project.tasks.length > 0 ? (
                                <KanbanBoard
                                    tasks={project.tasks}
                                    email={email}
                                    onDelete={deleteTask}
                                    onTaskMoved={() => fetchInfos(projectId)}
                                />
                            ) : (
                                <EmptyState
                                    imageSrc="/empty-task.png"
                                    imageAlt="Picture of an empty project"
                                    message="0 tâche à afficher"
                                />
                            )
                        ) : (
                            /* ── Vue Liste ── */
                            <div className="border border-base-300 p-5 shadow-sm rounded-xl">
                                {filteredTasks && filteredTasks.length > 0 ? (
                                    <div className="overflow-auto">
                                        <table className="table table-lg">
                                            <thead>
                                                <tr>
                                                    <th></th>
                                                    <th>Titre</th>
                                                    <th>Assigné à</th>
                                                    <th className="hidden md:table-cell">Date de début</th>
                                                    <th className="hidden md:flex">A livré le</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="w-fit">
                                                {filteredTasks.map((task, index) => (
                                                    <tr key={task.id} className="border-t last:border-none">
                                                        <TaskComponent task={task} index={index} onDelete={deleteTask} email={email} />
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <EmptyState
                                        imageSrc="/empty-task.png"
                                        imageAlt="Picture of an empty project"
                                        message="0 tâche à afficher"
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </Wrapper>
    )
}

export default page
