"use client"
import { deleteTaskById, getProjectInfo, updateProjectName } from "@/app/actions";
import { saveToCache, readFromCache, cacheKeyProject } from "@/lib/local-data-cache";
import EmptyState from "@/app/components/EmptyState";
import ProjectComponent from "@/app/components/ProjectComponent";
import TaskComponent from "@/app/components/TaskComponent";
import UserInfo from "@/app/components/UserInfo";
import dynamic from "next/dynamic";

// Chargement différé des composants lourds pour réduire le TBT (Total Blocking Time)
const CalendarView = dynamic(() => import("@/app/components/CalendarView"), {
    loading: () => <div className="skeleton h-96 w-full rounded-xl" />,
    ssr: false,
});
const KanbanBoard = dynamic(() => import("@/app/components/KanbanBoard"), {
    loading: () => <div className="flex justify-center py-10"><span className="loading loading-spinner loading-lg text-primary" /></div>,
    ssr: false,
});
const SGRWidget = dynamic(() => import("@/app/components/SGRWidget"), {
    loading: () => <div className="skeleton h-48 w-full rounded-xl" />,
    ssr: false,
});
const WIPConfigWidget = dynamic(() => import("@/app/components/WIPConfigWidget"), {
    loading: () => <div className="skeleton h-24 w-full rounded-xl" />,
    ssr: false,
});
const FilesTab = dynamic(() => import("@/app/components/FilesTab"), {
    loading: () => <div className="skeleton h-64 w-full rounded-xl" />,
    ssr: false,
});
import Wrapper from "@/app/components/Wrapper";
import { Project } from "@/app/type";
import { useUser } from "@clerk/nextjs";
import { Calendar, Check, CircleCheckBig, CopyPlus, Files, Kanban, List, ListTodo, Loader, Pencil, Settings, SlidersHorizontal, UserCheck, X } from "lucide-react";
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
    // Vue active : "kanban", "liste", "overview", "calendar" ou "files"
    const [vue, setVue] = useState<"liste" | "kanban" | "overview" | "calendar" | "files">("kanban")
    const [userRole, setUserRole] = useState<'PO' | 'MEMBER'>('MEMBER')

    // État d'édition du nom de projet
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameValue, setNameValue] = useState("");
    const [isSavingName, setIsSavingName] = useState(false);

    const fetchInfos = async (projectId: string) => {
        // Mode hors ligne → lecture depuis le cache localStorage
        if (!navigator.onLine) {
            const cached = readFromCache<Project>(cacheKeyProject(projectId))
            if (cached) {
                setProject(cached)
                const role = cached.users?.find(u => u.email === email)?.role || 'MEMBER'
                setUserRole(role as 'PO' | 'MEMBER')
            }
            return
        }

        try {
            const project = await getProjectInfo(projectId, true)
            // Convert ProjectEntity | ProjectWithDetails to Project
            if (project) {
                const mappedProject: Project = {
                    ...project,
                    users: project.users?.map(u => ({
                        id: u.id,
                        email: 'email' in u ? u.email : (u as any).user?.email || '',
                        name: 'name' in u ? u.name : (u as any).user?.name || '',
                        imageUrl: 'imageUrl' in u ? u.imageUrl : (u as any).user?.imageUrl || '',
                        role: u.role
                    }))
                };
                setProject(mappedProject);
            } else {
                setProject(null);
            }

            // Déterminer le rôle de l'utilisateur actuel
            const role = project?.users?.find(u => ('email' in u ? u.email : (u as any).user?.email) === email)?.role || 'MEMBER'
            setUserRole(role as 'PO' | 'MEMBER')

            // Sauvegarde en cache pour les sessions offline
            saveToCache(cacheKeyProject(projectId), project)
            // Déclenche le recalcul du SGR à chaque rechargement du projet
            setSgrRefreshKey(k => k + 1)
        } catch (error) {
            console.error("Error loading project:", error);
            // Fallback cache si la requête échoue
            const cached = readFromCache<Project>(cacheKeyProject(projectId))
            if (cached) {
                setProject(cached)
                const role = cached.users?.find(u => u.email === email)?.role || 'MEMBER'
                setUserRole(role as 'PO' | 'MEMBER')
            }
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

    /** Ouvre l'éditeur de nom et pré-remplit avec le nom actuel */
    const startEditingName = () => {
        setNameValue(project?.name ?? "");
        setIsEditingName(true);
    };

    /** Sauvegarde le nouveau nom via la Server Action */
    const saveProjectName = async () => {
        const trimmed = nameValue.trim();
        if (!trimmed || trimmed === project?.name) {
            setIsEditingName(false);
            return;
        }
        setIsSavingName(true);
        try {
            await updateProjectName(projectId, trimmed);
            setProject(prev => prev ? { ...prev, name: trimmed } : prev);
            toast.success("Project renamed!");
        } catch {
            toast.error("Failed to rename project");
        } finally {
            setIsSavingName(false);
            setIsEditingName(false);
        }
    };

    /** Annule l'édition */
    const cancelEditingName = () => {
        setIsEditingName(false);
        setNameValue("");
    };

    const deleteTask = async (taskId: string) => {
        try {
            await deleteTaskById(taskId)
            fetchInfos(projectId)
            toast.success('Task deleted!')
        } catch (error) {
            toast.error('Error deleting task')
        }
    }

    return (
        <Wrapper>
            {/* En-tête du projet : nom + actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    {isEditingName ? (
                        /* ── Mode édition : champ texte inline ── */
                        <div className="flex items-center gap-1.5">
                            <input
                                autoFocus
                                type="text"
                                value={nameValue}
                                onChange={e => { setNameValue(e.target.value); }}
                                onKeyDown={e => {
                                    if (e.key === "Enter") void saveProjectName();
                                    if (e.key === "Escape") cancelEditingName();
                                }}
                                className="input input-bordered input-sm text-xl sm:text-2xl font-bold h-9 w-52 sm:w-72 px-2"
                                maxLength={80}
                                disabled={isSavingName}
                            />
                            <button
                                onClick={saveProjectName}
                                disabled={isSavingName || !nameValue.trim()}
                                className="btn btn-success btn-xs btn-circle"
                                title="Save"
                            >
                                {isSavingName
                                    ? <span className="loading loading-spinner loading-xs" />
                                    : <Check className="w-3.5 h-3.5" />
                                }
                            </button>
                            <button
                                onClick={cancelEditingName}
                                disabled={isSavingName}
                                className="btn btn-ghost btn-xs btn-circle"
                                title="Cancel"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        /* ── Mode lecture : nom + bouton crayon ── */
                        <>
                            <h1 className="text-xl sm:text-2xl font-bold truncate">
                                {project?.name || <span className="skeleton w-40 h-7 inline-block rounded" />}
                            </h1>
                            {project && (
                                <button
                                    onClick={startEditingName}
                                    className="btn btn-ghost btn-xs btn-circle opacity-40 hover:opacity-100 shrink-0"
                                    title="Rename project"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Link
                        href={`/project/${projectId}/settings`}
                        className="hidden sm:flex btn btn-primary btn-sm gap-1.5"
                        title="Project settings"
                    >
                        <Settings className="w-4 h-4" />
                        Automation
                    </Link>
                    <Link href={`/new-tasks/${projectId}`} className="btn btn-primary btn-sm gap-1.5">
                        <CopyPlus className="w-4 h-4" />
                        <span className="hidden xs:inline">New task</span>
                        <span className="xs:hidden">Add</span>
                    </Link>
                </div>
            </div>

            {/* Barre d'onglets — scroll horizontal sur mobile */}
            <div className="border-b border-base-300 mb-5 -mx-4 px-4 lg:-mx-8 lg:px-8">
                <div className="flex gap-0 overflow-x-auto scrollbar-none">
                    {[
                        { id: "overview", icon: <SlidersHorizontal className="w-4 h-4" />, label: "Overview" },
                        { id: "liste", icon: <List className="w-4 h-4" />, label: "List" },
                        { id: "kanban", icon: <Kanban className="w-4 h-4" />, label: "Board" },
                        { id: "calendar", icon: <Calendar className="w-4 h-4" />, label: "Calendar" },
                        { id: "files", icon: <Files className="w-4 h-4" />, label: "Files" },
                    ].map(({ id, icon, label }) => (
                        <button
                            key={id}
                            onClick={() => setVue(id as "overview" | "liste" | "kanban" | "calendar" | "files")}
                            className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors shrink-0
                                ${vue === id
                                    ? "border-primary text-primary"
                                    : "border-transparent text-base-content/60 hover:text-base-content"
                                }`}
                        >
                            {icon} {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Onglet Board (Kanban) ── */}
            {vue === "kanban" && (
                !project ? (
                    <div className="flex justify-center py-16">
                        <span className="loading loading-spinner loading-lg text-primary" />
                    </div>
                ) : project.tasks && project.tasks.length > 0 ? (
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
                        message="No tasks to display"
                    />
                )
            )}

            {/* ── Onglet Liste ── */}
            {vue === "liste" && (
                <div>
                    {/* Barre de filtres avancés */}
                    <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-base-300">
                        {/* Filtres statut actifs */}
                        <button
                            onClick={() => { setStatusFilter(''); setAssignedFilter(false) }}
                            className={`btn btn-sm gap-1.5 ${!statusFilter && !assignedFilter ? 'btn-primary' : 'btn-ghost border border-base-300'}`}>
                            <SlidersHorizontal className="w-3.5 h-3.5" /> All
                            <span className="badge badge-sm">{project?.tasks?.length || 0}</span>
                        </button>
                        <button
                            onClick={() => setStatusFilter('To Do')}
                            className={`btn btn-sm gap-1.5 ${statusFilter === "To Do" ? 'btn-primary' : 'btn-ghost border border-base-300'}`}>
                            <ListTodo className="w-3.5 h-3.5" /> To Do
                            <span className="badge badge-sm">{taskCounts.todo}</span>
                        </button>
                        <button
                            onClick={() => setStatusFilter('In Progress')}
                            className={`btn btn-sm gap-1.5 ${statusFilter === "In Progress" ? 'btn-primary' : 'btn-ghost border border-base-300'}`}>
                            <Loader className="w-3.5 h-3.5" /> In Progress
                            <span className="badge badge-sm">{taskCounts.inProgress}</span>
                        </button>
                        <button
                            onClick={() => setStatusFilter('Done')}
                            className={`btn btn-sm gap-1.5 ${statusFilter === "Done" ? 'btn-primary' : 'btn-ghost border border-base-300'}`}>
                            <CircleCheckBig className="w-3.5 h-3.5" /> Done
                            <span className="badge badge-sm">{taskCounts.done}</span>
                        </button>
                        <button
                            onClick={() => setAssignedFilter(!assignedFilter)}
                            className={`btn btn-sm gap-1.5 ${assignedFilter ? 'btn-primary' : 'btn-ghost border border-base-300'}`}>
                            <UserCheck className="w-3.5 h-3.5" /> My tasks
                            <span className="badge badge-sm">{taskCounts.assigned}</span>
                        </button>
                    </div>

                    <div className="border border-base-300 shadow-sm rounded-xl">
                        {!project ? (
                            <div className="flex justify-center py-16">
                                <span className="loading loading-spinner loading-lg text-primary" />
                            </div>
                        ) : filteredTasks && filteredTasks.length > 0 ? (
                            <div className="overflow-auto">
                                <table className="table table-lg">
                                    <thead>
                                        <tr>
                                            <th></th>
                                            <th>Title</th>
                                            <th>Assigned to</th>
                                            <th>Start date</th>
                                            <th>Due date</th>
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
                                message="No tasks to display"
                            />
                        )}
                    </div>
                </div>
            )}

            {/* ── Onglet Calendrier ── */}
            {vue === "calendar" && (
                <CalendarView
                    tasks={project?.tasks || []}
                    email={email}
                />
            )}

            {/* ── Onglet Files ── */}
            {vue === "files" && projectId && (
                <FilesTab projectId={projectId} userRole={userRole} />
            )}

            {/* ── Onglet Vue d'ensemble (SGR, WIP, info projet) ── */}
            {vue === "overview" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-6">
                        <div className="p-5 border border-base-300 rounded-xl mb-6 space-y-4">
                            <UserInfo
                                role="Product Owner"
                                email={project?.createdBy?.email || null}
                                name={project?.createdBy?.name || null}
                                imageUrl={project?.createdBy?.imageUrl || null}
                            />
                            {project?.users && project.users.length > 1 && (
                                <div className="pt-4 border-t border-base-200">
                                    <p className="text-xs font-semibold text-base-content/50 mb-3 uppercase tracking-wider">Team members</p>
                                    <div className="space-y-3">
                                        {project.users
                                            .filter(u => u.id !== project.createdById)
                                            .map(u => (
                                                <UserInfo
                                                    key={u.id}
                                                    role="Member"
                                                    email={u.email}
                                                    name={u.name}
                                                    imageUrl={u.imageUrl}
                                                />
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                        </div>
                        {project && (
                            <ProjectComponent project={project} admin={0} style={false} />
                        )}
                    </div>
                    <div className="space-y-6">
                        {/* Configuration des limites WIP — alimente R_WIP dans le SGR */}
                        {projectId && (
                            <WIPConfigWidget
                                projectId={projectId}
                                taskCounts={taskCounts}
                                userRole={userRole}
                                onSaved={() => setSgrRefreshKey(k => k + 1)}
                            />
                        )}
                        {/* Widget SGR — recalculé à chaque rechargement du projet */}
                        {projectId && <SGRWidget projectId={projectId} refreshKey={sgrRefreshKey} />}
                    </div>
                </div>
            )}
        </Wrapper>
    )
}

export default page
