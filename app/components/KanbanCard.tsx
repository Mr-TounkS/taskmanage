"use client"

/**
 * KanbanCard — Carte tâche draggable, redesign UI Linear/Notion
 * Section mémoire : 3.2 — Kanban + fonctionnalités PWA
 */

import { Draggable } from "@hello-pangea/dnd"
import { Task } from "@/app/type"
import Link from "next/link"
import { Calendar, Flag, MoreHorizontal, Trash } from "lucide-react"

interface KanbanCardProps {
    task: Task
    index: number
    email?: string
    onDelete?: (id: string) => void
}

// Icône de flag colorée selon la priorité (correspond aux flags de la capture)
function PriorityRow({ priority }: { priority?: string }) {
    const config: Record<string, { flagClass: string; label: string }> = {
        HIGH:   { flagClass: "text-red-500",  label: "High priority" },
        MEDIUM: { flagClass: "text-gray-400", label: "Normal priority" },
        LOW:    { flagClass: "text-blue-400", label: "Low priority" },
    }
    const { flagClass, label } = config[priority ?? "MEDIUM"] ?? config.MEDIUM
    return (
        <div className="flex items-center gap-1.5">
            <Flag className={`w-3 h-3 shrink-0 ${flagClass}`} />
            <span className={`text-xs font-medium ${flagClass}`}>{label}</span>
        </div>
    )
}

// Format date : "17 mars - 09:00"
function formatDate(date: string | Date): string {
    const d = new Date(date)
    return (
        d.toLocaleDateString("en-US", { day: "numeric", month: "short" }) +
        " - " +
        d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    )
}

export default function KanbanCard({ task, index, email, onDelete }: KanbanCardProps) {
    const canDelete = email === task.createdBy?.email

    const isOverdue =
        task.dueDate &&
        task.status !== "Done" &&
        new Date(task.dueDate) < new Date()

    return (
        <Draggable draggableId={task.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`
                        group bg-base-100 rounded-xl border border-base-200 mb-2
                        shadow-sm transition-all duration-150 overflow-hidden
                        ${snapshot.isDragging
                            ? "shadow-xl ring-2 ring-primary/30 rotate-1 scale-[1.02]"
                            : "hover:shadow-md hover:border-base-300"
                        }
                    `}
                >
                    {/* Zone draggable (tout sauf les boutons d'action) */}
                    <div {...provided.dragHandleProps} className="p-3 cursor-grab active:cursor-grabbing">

                        {/* Ligne 1 : Titre + spinner En cours + bouton "..." */}
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                {task.status === "In Progress" && (
                                    <span className="loading loading-spinner loading-xs text-warning shrink-0 mt-0.5" />
                                )}
                                <p className="font-semibold text-sm leading-snug line-clamp-2 text-base-content">
                                    {task.name}
                                </p>
                            </div>

                            {/* Menu "..." → ouvre le détail */}
                            <Link
                                href={`/task-details/${task.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="btn btn-ghost btn-xs btn-circle opacity-0 group-hover:opacity-50 hover:!opacity-100 shrink-0 mt-0.5"
                                title="Voir les détails"
                            >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {/* Ligne 2 : Avatar(s) de l'assigné */}
                        <div className="flex items-center gap-1 mb-2.5">
                            {task.user ? (
                                task.user.imageUrl ? (
                                    <img
                                        src={task.user.imageUrl}
                                        alt={task.user.name || ""}
                                        className="w-5 h-5 rounded-full object-cover ring-2 ring-base-100"
                                    />
                                ) : (
                                    <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold ring-2 ring-base-100">
                                        {(task.user.name || "?")[0].toUpperCase()}
                                    </div>
                                )
                            ) : (
                                <div className="w-5 h-5 rounded-full bg-base-200 ring-2 ring-base-100" />
                            )}
                        </div>

                        {/* Ligne 3 : Date de livraison + badge "En retard" */}
                        {task.dueDate && (
                            <div className="flex items-center gap-1.5 mb-2">
                                <Calendar className="w-3 h-3 shrink-0 text-base-content/40" />
                                <span className="text-xs text-base-content/50 tabular-nums">
                                    {formatDate(task.dueDate)}
                                </span>
                                {isOverdue && (
                                    <span className="text-xs text-orange-500 font-semibold">
                                        Overdue
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Ligne 4 : Priorité avec drapeau coloré */}
                        <PriorityRow priority={task.priority} />
                    </div>

                    {/* Bouton supprimer — séparé de la zone de drag, visible si autorisé */}
                    {canDelete && (
                        <div className="px-3 pb-2.5 flex justify-end">
                            <button
                                onClick={() => onDelete?.(task.id)}
                                className="btn btn-ghost btn-xs btn-circle opacity-0 group-hover:opacity-40 hover:!opacity-100 hover:text-error"
                                title="Delete task"
                            >
                                <Trash className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </Draggable>
    )
}
