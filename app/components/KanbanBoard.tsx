"use client"

/**
 * KanbanBoard — Tableau Kanban avec drag-and-drop
 *
 * Affiche les tâches du projet en 3 colonnes (To Do, In Progress, Done).
 * Le déplacement d'une carte vers une autre colonne déclenche :
 *   1. La mise à jour du statut via updateTaskStatus (Server Action)
 *   2. L'horodatage automatique startedAt / completedAt dans le use-case
 *   3. Le rechargement du projet → recalcul SGR via onTaskMoved()
 *
 * Règle métier : passer une tâche en "Done" exige une description de solution
 * (cohérence avec la page task-details).
 *
 * Fondement : Loi de Little — CT = WIP / Throughput
 * Section mémoire : 3.2 — Kanban + fonctionnalités PWA
 */

import { useState, useRef, useEffect } from "react"
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd"
import dynamic from "next/dynamic"
import "react-quill-new/dist/quill.snow.css"
import { Task } from "@/app/type"
import KanbanCard from "./KanbanCard"
import { updateTaskStatus } from "@/app/actions"
import { toast } from "react-toastify"
import { CircleCheckBig, MoreHorizontal, Plus, WifiOff } from "lucide-react"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import { useOfflineQueue } from "@/hooks/useOfflineQueue"

// Éditeur riche — chargé côté client uniquement (pas de SSR)
const ReactQuill = dynamic(() => import("react-quill-new"), {
    ssr: false,
    loading: () => (
        <div className="h-32 w-full bg-base-200 animate-pulse rounded-xl" />
    ),
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KanbanBoardProps {
    tasks: Task[]
    email?: string
    onDelete: (id: string) => void
    /** Callback déclenché après un déplacement réussi — recharge le projet */
    onTaskMoved: () => void
}

// Icône de statut de colonne — cercle coloré comme dans la capture
function StatusDot({ status }: { status: string }) {
    if (status === "To Do") {
        return <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-400 bg-transparent shrink-0" />
    }
    if (status === "In Progress") {
        return <div className="w-3.5 h-3.5 rounded-full bg-yellow-400 shrink-0" />
    }
    return <CircleCheckBig className="w-3.5 h-3.5 text-green-500 fill-green-100 shrink-0" />
}

// Configuration des colonnes Kanban
const COLONNES = [
    { id: "To Do",       label: "To Do",       couleurBg: "bg-gray-50 dark:bg-base-200/60" },
    { id: "In Progress", label: "In Progress", couleurBg: "bg-yellow-50/60 dark:bg-base-200/60" },
    { id: "Done",        label: "Done",         couleurBg: "bg-green-50/60 dark:bg-base-200/60" },
] as const

const modules = {
    toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link"],
        ["clean"],
    ],
}

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export default function KanbanBoard({ tasks, email, onDelete, onTaskMoved }: KanbanBoardProps) {
    // Identifiant de la tâche en attente de clôture (drag vers "Done")
    const [pendingTaskId, setPendingTaskId] = useState<string | null>(null)
    const [solution, setSolution] = useState("")
    const [enCours, setEnCours] = useState(false)
    const modalRef = useRef<HTMLDialogElement>(null)
    // Colonne active sur mobile (une colonne affichée à la fois)
    const [mobileCol, setMobileCol] = useState<string>("To Do")

    // Détection de la connexion et file d'attente offline
    const isOnline = useOnlineStatus()
    const { execute: executeOffline } = useOfflineQueue()

    // Copie locale des tâches pour les mises à jour optimistes (offline-first)
    const [localTasks, setLocalTasks] = useState<Task[]>(tasks)

    // Synchronise la copie locale quand les props changent (retour online)
    useEffect(() => {
        setLocalTasks(tasks)
    }, [tasks])

    /**
     * Applique une mise à jour optimiste sur la copie locale des tâches.
     * L'UI reflète le changement immédiatement, même sans confirmation serveur.
     */
    const applyOptimisticMove = (taskId: string, newStatus: string) => {
        setLocalTasks((prev) =>
            prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t)
        )
    }

    /**
     * Gestionnaire de fin de drag-and-drop.
     * Règle d'autorisation : seul l'assigné de la tâche peut la déplacer.
     * Si la destination est "Done" → ouvre la modal de solution.
     * Sinon → applique le changement directement (online ou offline).
     */
    const handleDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result

        // Annulé ou déposé dans la même colonne
        if (!destination) return
        if (destination.droppableId === source.droppableId) return

        // Vérification d'autorisation : seul l'assigné peut déplacer sa tâche
        const tache = localTasks.find((t) => t.id === draggableId)
        if (tache?.user?.email !== email) {
            toast.error("You can only move tasks assigned to you")
            return
        }

        const nouveauStatut = destination.droppableId as "To Do" | "In Progress" | "Done"

        if (nouveauStatut === "Done") {
            // Règle métier : une solution est obligatoire pour clôturer une tâche
            setPendingTaskId(draggableId)
            setSolution("")
            modalRef.current?.showModal()
            return
        }

        // Mise à jour optimiste immédiate (UI réactive même hors ligne)
        applyOptimisticMove(draggableId, nouveauStatut)

        const labelColonne = COLONNES.find((c) => c.id === nouveauStatut)?.label

        if (!isOnline) {
            // Hors ligne → mise en file d'attente IndexedDB + Background Sync
            const result = await executeOffline({
                type: "UPDATE_TASK_STATUS",
                url: `/api/tasks/${draggableId}/status`,
                method: "PATCH",
                payload: { status: nouveauStatut },
            })
            if (result.queued) {
                toast.info(`Moved to "${labelColonne}" — will sync when back online`)
            }
            return
        }

        // En ligne → Server Action directe
        try {
            await updateTaskStatus(draggableId, nouveauStatut)
            onTaskMoved()
            toast.success(`Task moved to "${labelColonne}"`)
        } catch {
            // Rollback de la mise à jour optimiste en cas d'erreur
            applyOptimisticMove(draggableId, source.droppableId)
            toast.error("Failed to move task")
        }
    }

    /**
     * Valide la clôture de la tâche avec la solution saisie.
     * En mode offline : mise en queue et mise à jour optimiste.
     */
    const confirmerCloture = async () => {
        if (!pendingTaskId) return

        const solutionNettoyee = solution.replace(/<[^>]*>/g, "").trim()
        if (!solutionNettoyee) {
            toast.error("A solution is required")
            return
        }

        setEnCours(true)

        if (!isOnline) {
            // Mise à jour optimiste + queue offline
            applyOptimisticMove(pendingTaskId, "Done")
            await executeOffline({
                type: "UPDATE_TASK_STATUS",
                url: `/api/tasks/${pendingTaskId}/status`,
                method: "PATCH",
                payload: { status: "Done", solution },
            })
            modalRef.current?.close()
            setPendingTaskId(null)
            setSolution("")
            setEnCours(false)
            toast.info("Task marked as done — will sync when back online")
            return
        }

        try {
            await updateTaskStatus(pendingTaskId, "Done", solution)
            modalRef.current?.close()
            setPendingTaskId(null)
            setSolution("")
            onTaskMoved()
            toast.success("Task closed!")
        } catch {
            toast.error("Error closing the task")
        } finally {
            setEnCours(false)
        }
    }

    /** Annulation : ferme la modal sans appliquer le changement */
    const annuler = () => {
        modalRef.current?.close()
        setPendingTaskId(null)
        setSolution("")
    }

    // Filtre les tâches par colonne (sur la copie locale pour les updates optimistes)
    const tachesPar = (statut: string) => localTasks.filter((t) => t.status === statut)

    return (
        <>
            {/* Indicateur offline local au Kanban */}
            {!isOnline && (
                <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 border border-warning/30 rounded-lg px-3 py-2 mb-3">
                    <WifiOff size={14} />
                    <span>
                        You are offline. Task moves will be synced automatically when back online.
                    </span>
                </div>
            )}

            <DragDropContext onDragEnd={handleDragEnd}>
                {/* Sélecteur de colonne — visible uniquement sur mobile */}
                <div className="flex lg:hidden gap-1 mb-3 bg-base-200/50 rounded-xl p-1">
                    {COLONNES.map((col) => (
                        <button
                            key={col.id}
                            onClick={() => setMobileCol(col.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all
                                ${mobileCol === col.id
                                    ? "bg-base-100 shadow-sm text-base-content"
                                    : "text-base-content/50 hover:text-base-content/70"
                                }`}
                        >
                            <StatusDot status={col.id} />
                            <span className="truncate">{col.label}</span>
                            <span className="text-[10px] opacity-60">({tachesPar(col.id).length})</span>
                        </button>
                    ))}
                </div>

                {/* Colonnes : une seule visible sur mobile, grille sur desktop */}
                <div className="lg:grid lg:grid-cols-3 lg:gap-3">
                    {COLONNES.map((colonne) => {
                        const taches = tachesPar(colonne.id)

                        return (
                            <div
                                key={colonne.id}
                                className={`
                                    flex flex-col rounded-xl overflow-hidden mb-3 lg:mb-0
                                    ${colonne.couleurBg}
                                    ${mobileCol !== colonne.id ? "hidden lg:flex" : "flex"}
                                `}
                            >
                                {/* En-tête de colonne */}
                                <div className="flex items-center justify-between px-3 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <StatusDot status={colonne.id} />
                                        <span className="font-medium text-sm text-base-content/80">
                                            {colonne.label}
                                        </span>
                                        <span className="text-xs text-base-content/40 font-medium">
                                            {taches.length}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-0.5">
                                        <button
                                            className="btn btn-ghost btn-xs btn-circle opacity-40 hover:opacity-100"
                                            title="Options"
                                        >
                                            <MoreHorizontal className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-xs btn-circle opacity-40 hover:opacity-100"
                                            title="Add a task"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Zone de dépôt */}
                                <Droppable droppableId={colonne.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`
                                                flex-1 min-h-[200px] px-2 pb-2 transition-colors duration-150
                                                ${snapshot.isDraggingOver ? "bg-primary/5 rounded-b-xl" : ""}
                                            `}
                                        >
                                            {taches.length === 0 && (
                                                <div className="flex items-center justify-center text-base-content/25 text-xs py-10 select-none">
                                                    Drop a task here
                                                </div>
                                            )}
                                            {taches.map((task, index) => (
                                                <KanbanCard
                                                    key={task.id}
                                                    task={task}
                                                    index={index}
                                                    email={email}
                                                    onDelete={onDelete}
                                                />
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        )
                    })}
                </div> {/* fin grille colonnes */}
            </DragDropContext>

            {/* Modal de clôture — solution obligatoire pour passer en "Done" */}
            <dialog ref={modalRef} className="modal">
                <div className="modal-box">
                    <button
                        onClick={annuler}
                        className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                    >
                        ✕
                    </button>
                    <h3 className="font-bold text-lg">What is the solution?</h3>
                    <p className="py-3 text-base-content/60 text-sm">
                        Describe exactly what you did to close this task.
                    </p>
                    <ReactQuill
                        placeholder="Describe the solution..."
                        value={solution}
                        modules={modules}
                        onChange={setSolution}
                    />
                    <div className="flex gap-2 mt-4">
                        <button onClick={annuler} className="btn btn-ghost btn-sm flex-1">
                            Cancel
                        </button>
                        <button
                            onClick={confirmerCloture}
                            disabled={solution.replace(/<[^>]*>/g, "").trim() === "" || enCours}
                            className="btn btn-primary btn-sm flex-1"
                        >
                            {enCours ? (
                                <span className="loading loading-spinner loading-xs" />
                            ) : (
                                "Complete"
                            )}
                        </button>
                    </div>
                </div>
            </dialog>
        </>
    )
}
