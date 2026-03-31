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
import { ListTodo, Loader, CircleCheckBig, WifiOff } from "lucide-react"
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

// Configuration des colonnes Kanban
const COLONNES = [
    {
        id: "To Do",
        label: "À faire",
        icon: ListTodo,
        couleurHeader: "bg-red-50 border-red-200",
        couleurBadge: "badge-error",
    },
    {
        id: "In Progress",
        label: "En cours",
        icon: Loader,
        couleurHeader: "bg-yellow-50 border-yellow-200",
        couleurBadge: "badge-warning",
    },
    {
        id: "Done",
        label: "Terminé",
        icon: CircleCheckBig,
        couleurHeader: "bg-green-50 border-green-200",
        couleurBadge: "badge-success",
    },
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
            toast.error("Vous ne pouvez déplacer que les tâches qui vous sont assignées")
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
                toast.info(`Déplacé vers "${labelColonne}" — synchronisation à la reconnexion`)
            }
            return
        }

        // En ligne → Server Action directe
        try {
            await updateTaskStatus(draggableId, nouveauStatut)
            onTaskMoved()
            toast.success(`Tâche déplacée vers "${labelColonne}"`)
        } catch {
            // Rollback de la mise à jour optimiste en cas d'erreur
            applyOptimisticMove(draggableId, source.droppableId)
            toast.error("Impossible de déplacer la tâche")
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
            toast.error("Il manque une solution")
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
            toast.info("Tâche marquée terminée — synchronisation à la reconnexion")
            return
        }

        try {
            await updateTaskStatus(pendingTaskId, "Done", solution)
            modalRef.current?.close()
            setPendingTaskId(null)
            setSolution("")
            onTaskMoved()
            toast.success("Tâche clôturée !")
        } catch {
            toast.error("Erreur lors de la clôture de la tâche")
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
                        Vous êtes hors ligne. Les déplacements de tâches seront synchronisés
                        automatiquement dès la reprise de connexion.
                    </span>
                </div>
            )}

            <DragDropContext onDragEnd={handleDragEnd}>
                {/* Scroll horizontal sur mobile, grille 3 colonnes sur desktop */}
                <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory lg:grid lg:grid-cols-3 lg:overflow-x-visible lg:snap-none">
                    {COLONNES.map((colonne) => {
                        const taches = tachesPar(colonne.id)
                        const Icone = colonne.icon

                        return (
                            <div
                                key={colonne.id}
                                className="flex flex-col rounded-xl border border-base-300 overflow-hidden min-w-[260px] w-[78vw] sm:w-[55vw] md:w-[45vw] lg:min-w-0 lg:w-auto shrink-0 lg:shrink snap-center"
                            >
                                {/* En-tête de colonne */}
                                <div
                                    className={`flex items-center justify-between px-4 py-3 border-b ${colonne.couleurHeader}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icone className="w-4 h-4" />
                                        <span className="font-semibold text-sm">{colonne.label}</span>
                                    </div>
                                    <span className={`badge badge-sm ${colonne.couleurBadge}`}>
                                        {taches.length}
                                    </span>
                                </div>

                                {/* Zone de dépôt */}
                                <Droppable droppableId={colonne.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`
                                                flex-1 min-h-[200px] p-3 transition-colors duration-150
                                                ${snapshot.isDraggingOver ? "bg-primary/5" : ""}
                                            `}
                                        >
                                            {taches.length === 0 ? (
                                                <div className="flex items-center justify-center h-full text-base-content/30 text-xs py-8">
                                                    Déposez une tâche ici
                                                </div>
                                            ) : (
                                                taches.map((task, index) => (
                                                    <KanbanCard
                                                        key={task.id}
                                                        task={task}
                                                        index={index}
                                                        email={email}
                                                        onDelete={onDelete}
                                                    />
                                                ))
                                            )}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        )
                    })}
                </div>
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
                    <h3 className="font-bold text-lg">C&apos;est quoi la solution ?</h3>
                    <p className="py-3 text-base-content/60 text-sm">
                        Décrivez ce que vous avez fait exactement pour clôturer cette tâche.
                    </p>
                    <ReactQuill
                        placeholder="Décrivez la solution..."
                        value={solution}
                        modules={modules}
                        onChange={setSolution}
                    />
                    <div className="flex gap-2 mt-4">
                        <button onClick={annuler} className="btn btn-ghost btn-sm flex-1">
                            Annuler
                        </button>
                        <button
                            onClick={confirmerCloture}
                            disabled={solution.replace(/<[^>]*>/g, "").trim() === "" || enCours}
                            className="btn btn-primary btn-sm flex-1"
                        >
                            {enCours ? (
                                <span className="loading loading-spinner loading-xs" />
                            ) : (
                                "Terminer"
                            )}
                        </button>
                    </div>
                </div>
            </dialog>
        </>
    )
}
