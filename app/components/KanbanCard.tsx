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

// Badge de priorité — compact sur mobile, complet sur desktop
function PriorityBadge({ priority }: { priority?: string }) {
    const config = {
        HIGH: { classe: "badge-error", icone: AlertTriangle, label: "Élevée" },
        MEDIUM: { classe: "badge-warning", icone: Minus, label: "Moyenne" },
        LOW: { classe: "badge-success", icone: ArrowDown, label: "Faible" },
    }
    const { classe, icone: Icone, label } = config[priority as keyof typeof config] || config.MEDIUM
    return (
        <span className={`badge ${classe} badge-xs sm:badge-sm gap-0.5 sm:gap-1 text-[10px] sm:text-xs`}>
            <Icone className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            <span className="hidden sm:inline">{label}</span>
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
                    className={`
                        bg-base-100 border rounded-xl p-2.5 sm:p-3 mb-2.5 shadow-sm
                        transition-shadow duration-150 overflow-hidden
                        ${snapshot.isDragging ? "shadow-lg ring-2 ring-primary/40 rotate-1" : ""}
                        ${estEnRetard ? "border-error/40" : "border-base-300"}
                    `}
                >
                    {/* Zone de drag — seule cette partie est draggable (pas les boutons) */}
                    <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">

                    {/* Ligne supérieure : priorité + badge retard */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                        <PriorityBadge priority={task.priority} />
                        {estEnRetard && (
                            <span className="badge badge-error badge-xs gap-0.5 text-[9px] whitespace-nowrap">
                                <AlertCircle className="w-2.5 h-2.5" />
                                Retard
                            </span>
                        )}
                    </div>

                    {/* Titre de la tâche — tronqué proprement */}
                    <p className="text-xs sm:text-sm font-semibold leading-snug mb-1.5 line-clamp-2">
                        {task.name}
                    </p>

                    {/* Assigné à — prénom sur mobile, nom complet sur desktop */}
                    <div className="mb-1.5 overflow-hidden">
                        <div className="flex items-center gap-1.5 min-w-0">
                            {task.user?.imageUrl ? (
                                <img
                                    src={task.user.imageUrl}
                                    alt={task.user.name || ""}
                                    className="w-5 h-5 lg:w-6 lg:h-6 rounded-full shrink-0 object-cover"
                                />
                            ) : (
                                <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold shrink-0">
                                    {(task.user?.name || "?")[0].toUpperCase()}
                                </div>
                            )}
                            <div className="flex flex-col min-w-0">
                                {/* Mobile : prénom uniquement */}
                                <span className="text-[11px] text-base-content/70 truncate min-w-0 lg:hidden">
                                    {task.user?.name?.split(" ")[0] || "Non assigné"}
                                </span>
                                {/* Desktop : nom complet */}
                                <span className="text-xs text-base-content/70 truncate min-w-0 hidden lg:inline">
                                    {task.user?.name || "Non assigné"}
                                </span>
                                {/* Desktop : email */}
                                {task.user?.email && (
                                    <span className="text-[10px] text-base-content/40 truncate min-w-0 hidden lg:inline">
                                        {task.user.email}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Dates — compact sur mobile, complet sur desktop */}
                    <div className="flex flex-col gap-0.5 mb-1.5 tabular-nums">
                        {task.startDate && (
                            <p className="text-[10px] text-base-content/50">
                                <span className="hidden lg:inline">Début : </span>
                                <span className="lg:hidden">
                                    {new Date(task.startDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                                </span>
                                <span className="hidden lg:inline">
                                    {new Date(task.startDate).toLocaleDateString("fr-FR")}
                                </span>
                            </p>
                        )}
                        {task.dueDate && (
                            <p className={`text-[10px] ${estEnRetard ? "text-error font-medium" : "text-base-content/50"}`}>
                                <span className="hidden lg:inline">Livraison : </span>
                                <span className="lg:hidden">
                                    {new Date(task.dueDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                                </span>
                                <span className="hidden lg:inline">
                                    {new Date(task.dueDate).toLocaleDateString("fr-FR")}
                                </span>
                            </p>
                        )}
                    </div>

                    </div>{/* Fin de la zone de drag */}

                    {/* Actions — boutons compacts (hors zone de drag pour le clic mobile) */}
                    <div className="flex items-center gap-1.5">
                        <Link
                            href={`/task-details/${task.id}`}
                            className="btn btn-primary btn-xs flex-1 text-[11px] sm:text-xs h-7 min-h-0"
                        >
                            Détails <ArrowRight className="w-3 h-3" />
                        </Link>
                        {canDelete && (
                            <button
                                onClick={() => onDelete?.(task.id)}
                                className="btn btn-ghost btn-xs text-error h-7 min-h-0 px-1.5"
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
