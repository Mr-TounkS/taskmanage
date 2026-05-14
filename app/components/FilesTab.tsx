"use client"

import { getProjectFiles, deleteTaskFile } from "@/app/actions"
import {
    FileText, FileSpreadsheet, Presentation, Image,
    File, Download, Trash2, RefreshCw,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskFileEntry {
    id: string
    fileName: string
    fileSize: number
    mimeType: string
    blobUrl: string
    uploadedAt: Date
}

interface TaskWithFiles {
    id: string
    name: string
    status: string
    files: TaskFileEntry[]
}

interface FilesTabProps {
    projectId: string
    userRole: 'PO' | 'MEMBER'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ mimeType }: { mimeType: string }) {
    if (mimeType.startsWith("image/"))
        return <Image className="w-5 h-5 text-purple-500 shrink-0" />
    if (mimeType.includes("pdf"))
        return <FileText className="w-5 h-5 text-red-500 shrink-0" />
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv"))
        return <FileSpreadsheet className="w-5 h-5 text-green-600 shrink-0" />
    if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
        return <Presentation className="w-5 h-5 text-orange-500 shrink-0" />
    if (mimeType.includes("word") || mimeType.includes("document"))
        return <FileText className="w-5 h-5 text-blue-500 shrink-0" />
    return <File className="w-5 h-5 text-base-content/50 shrink-0" />
}

const STATUS_BADGE: Record<string, string> = {
    "To Do": "badge-ghost",
    "In Progress": "badge-warning",
    "Done": "badge-success",
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function FilesTab({ projectId, userRole }: FilesTabProps) {
    const [tasks, setTasks] = useState<TaskWithFiles[]>([])
    const [loading, setLoading] = useState(true)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [filter, setFilter] = useState<string>("all")

    const load = async () => {
        setLoading(true)
        const data = await getProjectFiles(projectId)
        setTasks(data as TaskWithFiles[])
        setLoading(false)
    }

    useEffect(() => { load() }, [projectId])

    const totalFiles = tasks.reduce((acc, t) => acc + t.files.length, 0)
    const totalSize = tasks.reduce(
        (acc, t) => acc + t.files.reduce((a, f) => a + f.fileSize, 0), 0
    )

    // Filtrage par type MIME
    const filteredTasks = tasks.map(task => ({
        ...task,
        files: task.files.filter(f => {
            if (filter === "all") return true
            if (filter === "image") return f.mimeType.startsWith("image/")
            if (filter === "pdf") return f.mimeType.includes("pdf")
            if (filter === "office")
                return f.mimeType.includes("word") || f.mimeType.includes("spreadsheet") ||
                    f.mimeType.includes("excel") || f.mimeType.includes("presentation") ||
                    f.mimeType.includes("powerpoint") || f.mimeType.includes("document")
            return true
        }),
    })).filter(t => t.files.length > 0)

    const handleDelete = async (fileId: string) => {
        setDeletingId(fileId)
        try {
            await deleteTaskFile(fileId)
            toast.success("Fichier supprimé")
            await load()
        } catch {
            toast.error("Erreur lors de la suppression")
        } finally {
            setDeletingId(null)
        }
    }

    // ---------------------------------------------------------------------------
    // Rendu
    // ---------------------------------------------------------------------------

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <span className="loading loading-spinner loading-lg text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* En-tête stats + filtres */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-sm text-base-content/60">
                    <span><strong className="text-base-content">{totalFiles}</strong> fichier{totalFiles !== 1 ? "s" : ""}</span>
                    <span>·</span>
                    <span>{formatSize(totalSize)} au total</span>
                    <button onClick={load} className="btn btn-ghost btn-xs gap-1">
                        <RefreshCw className="w-3 h-3" /> Rafraîchir
                    </button>
                </div>

                <div className="flex gap-2">
                    {[
                        { value: "all", label: "Tous" },
                        { value: "pdf", label: "PDF" },
                        { value: "office", label: "Office" },
                        { value: "image", label: "Images" },
                    ].map(f => (
                        <button
                            key={f.value}
                            onClick={() => setFilter(f.value)}
                            className={`btn btn-xs ${filter === f.value ? "btn-primary" : "btn-ghost"}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Liste vide */}
            {filteredTasks.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-20 text-base-content/40">
                    <File className="w-12 h-12" />
                    <p className="text-sm">
                        {totalFiles === 0
                            ? "Aucun fichier attaché à ce projet"
                            : "Aucun fichier dans cette catégorie"}
                    </p>
                </div>
            )}

            {/* Groupes par tâche */}
            {filteredTasks.map(task => (
                <div key={task.id} className="card bg-base-100 border border-base-200 shadow-sm">
                    <div className="card-body p-4 gap-3">
                        {/* En-tête tâche */}
                        <div className="flex items-center gap-2">
                            <span className={`badge badge-sm ${STATUS_BADGE[task.status] ?? "badge-ghost"}`}>
                                {task.status}
                            </span>
                            <span className="font-medium text-sm truncate">{task.name}</span>
                            <span className="text-xs text-base-content/40 ml-auto shrink-0">
                                {task.files.length} fichier{task.files.length !== 1 ? "s" : ""}
                            </span>
                        </div>

                        {/* Liste des fichiers */}
                        <div className="divide-y divide-base-200">
                            {task.files.map(file => (
                                <div key={file.id} className="flex items-center gap-3 py-2">
                                    <FileIcon mimeType={file.mimeType} />

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{file.fileName}</p>
                                        <p className="text-xs text-base-content/40">
                                            {formatSize(file.fileSize)} · {new Date(file.uploadedAt).toLocaleDateString("fr-FR")}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <a
                                            href={file.blobUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-ghost btn-xs"
                                            title="Télécharger"
                                        >
                                            <Download className="w-4 h-4" />
                                        </a>

                                        {userRole === 'PO' && (
                                            <button
                                                onClick={() => handleDelete(file.id)}
                                                disabled={deletingId === file.id}
                                                className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                                                title="Supprimer"
                                            >
                                                {deletingId === file.id
                                                    ? <span className="loading loading-spinner loading-xs" />
                                                    : <Trash2 className="w-4 h-4" />
                                                }
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
