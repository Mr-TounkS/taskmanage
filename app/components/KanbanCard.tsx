"use client"

/**
 * KanbanCard — Carte tâche draggable dans le tableau Kanban
 *
 * Représente une tâche sous forme de carte avec :
 * - Titre, assigné, date de livraison
 * - Indicateur visuel de retard (dueDate dépassée)
 * - Liens vers le détail et suppression (si créateur)
 *
 * Section mémoire : 3.2 — Kanban + fonctionnalités PWA
 */

import { Draggable } from "@hello-pangea/dnd"
import { Task } from "@/app/type"
import UserInfo from "./UserInfo"
import Link from "next/link"
import { ArrowRight, Trash, AlertCircle, AlertTriangle, Minus, ArrowDown } from "lucide-react"

interface KanbanCardProps {
    task: Task
    index: number
    email?: string
    onDelete?: (id: string) => void
}

// Badge de priorité — couleur + icône selon le niveau
function PriorityBadge({ priority }: { priority?: string }) {
    if (!priority || priority === 'MEDIUM') return (
        <span className="badge badge-warning badge-sm gap-1">
            <Minus className="w-3 h-3" /> Moyenne
        </span>
    )
    if (priority === 'HIGH') return (
        <span className="badge badge-error badge-sm gap-1">
            <AlertTriangle className="w-3 h-3" /> Élevée
        </span>
    )
    return (
        <span className="badge badge-success badge-sm gap-1">
            <ArrowDown className="w-3 h-3" /> Faible
        </span>
    )
}

export default function KanbanCard({ task, index, email, onDelete }: KanbanCardProps) {
    const canDelete = email === task.createdBy?.email

    // Détermine si la tâche est en retard
    const estEnRetard =
        task.dueDate &&
        task.status !== "Done" &&
        new Date(task.dueDate) < new Date()

    return (
        <Draggable draggableId={task.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`
                        bg-base-100 border rounded-xl p-3 mb-3 shadow-sm
                        transition-shadow duration-150
                        ${snapshot.isDragging ? "shadow-lg ring-2 ring-primary/40 rotate-1" : ""}
                        ${estEnRetard ? "border-error/40" : "border-base-300"}
                    `}
                >
                    {/* Ligne supérieure : priorité + badge retard */}
                    <div className="flex items-center justify-between mb-2">
                        <PriorityBadge priority={task.priority} />
                        {estEnRetard && (
                            <div className="flex items-center gap-1 text-error text-xs">
                                <AlertCircle className="w-3 h-3" />
                                <span>En retard</span>
                            </div>
                        )}
                    </div>

                    {/* Titre de la tâche */}
                    <p className="text-sm font-semibold leading-snug mb-2">
                        {task.name.length > 80
                            ? `${task.name.slice(0, 80)}…`
                            : task.name}
                    </p>

                    {/* Assigné à */}
                    <div className="mb-2">
                        <UserInfo
                            role=""
                            email={task.user?.email || null}
                            name={task.user?.name || null}
                            imageUrl={task.user?.imageUrl || null}
                        />
                    </div>

                    {/* Dates */}
                    <div className="flex flex-col gap-0.5 mb-3">
                        {task.startDate && (
                            <p className="text-xs text-base-content/50">
                                Début : {new Date(task.startDate).toLocaleDateString("fr-FR")}
                            </p>
                        )}
                        {task.dueDate && (
                            <p className={`text-xs ${estEnRetard ? "text-error font-medium" : "text-base-content/50"}`}>
                                Livraison : {new Date(task.dueDate).toLocaleDateString("fr-FR")}
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <Link
                            href={`/task-details/${task.id}`}
                            className="btn btn-primary btn-xs flex-1"
                        >
                            Détails
                            <ArrowRight className="w-3 h-3" />
                        </Link>
                        {canDelete && (
                            <button
                                onClick={() => onDelete?.(task.id)}
                                className="btn btn-ghost btn-xs text-error"
                            >
                                <Trash className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </Draggable>
    )
}
