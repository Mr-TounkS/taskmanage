"use client"

import { useRef, useState } from "react"
import { Paperclip, X, FileText, Image, Upload } from "lucide-react"

const ACCEPTED_TYPES = [
    ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
    ".png", ".jpg", ".jpeg", ".gif", ".webp",
]
const MAX_SIZE_MB = 5
const MAX_FILES = 5

export interface PendingFile {
    file: File
    preview?: string
}

interface FileUploadZoneProps {
    files: PendingFile[]
    onChange: (files: PendingFile[]) => void
    disabled?: boolean
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function fileIcon(mimeType: string) {
    if (mimeType.startsWith("image/")) return <Image className="w-4 h-4 text-primary" />
    return <FileText className="w-4 h-4 text-primary" />
}

export default function FileUploadZone({ files, onChange, disabled }: FileUploadZoneProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [dragOver, setDragOver] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const addFiles = (incoming: FileList | null) => {
        if (!incoming) return
        setError(null)

        const toAdd: PendingFile[] = []
        for (const file of Array.from(incoming)) {
            if (files.length + toAdd.length >= MAX_FILES) {
                setError(`Maximum ${MAX_FILES} fichiers autorisés`)
                break
            }
            if (file.size > MAX_SIZE_MB * 1024 * 1024) {
                setError(`"${file.name}" dépasse ${MAX_SIZE_MB} Mo`)
                continue
            }
            const ext = "." + file.name.split(".").pop()?.toLowerCase()
            if (!ACCEPTED_TYPES.includes(ext)) {
                setError(`Type non autorisé : ${ext}`)
                continue
            }
            const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined
            toAdd.push({ file, preview })
        }
        if (toAdd.length > 0) onChange([...files, ...toAdd])
    }

    const remove = (index: number) => {
        const updated = files.filter((_, i) => i !== index)
        onChange(updated)
        setError(null)
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs text-base-content/60 mb-1">
                <Paperclip className="w-3.5 h-3.5" />
                <span>Pièces jointes (optionnel) — max {MAX_FILES} fichiers, {MAX_SIZE_MB} Mo chacun</span>
            </div>

            {/* Zone de dépôt */}
            <div
                onClick={() => !disabled && inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault()
                    setDragOver(false)
                    addFiles(e.dataTransfer.files)
                }}
                className={`
                    flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors text-sm
                    ${dragOver ? "border-primary bg-primary/5" : "border-base-300 hover:border-primary/50"}
                    ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                    ${files.length >= MAX_FILES ? "pointer-events-none opacity-40" : ""}
                `}
            >
                <Upload className="w-5 h-5 text-base-content/40" />
                <span className="text-base-content/50 text-xs text-center">
                    Glissez vos fichiers ici ou <span className="text-primary font-medium">cliquez pour parcourir</span>
                </span>
                <span className="text-base-content/30 text-xs">
                    PDF, Word, Excel, PowerPoint, images
                </span>
            </div>

            <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPTED_TYPES.join(",")}
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
                disabled={disabled}
            />

            {/* Erreur */}
            {error && (
                <p className="text-error text-xs flex items-center gap-1">
                    <X className="w-3 h-3" /> {error}
                </p>
            )}

            {/* Liste des fichiers sélectionnés */}
            {files.length > 0 && (
                <ul className="flex flex-col gap-1.5 mt-1">
                    {files.map((pf, i) => (
                        <li key={i} className="flex items-center gap-2 bg-base-200 rounded-lg px-3 py-1.5 text-xs">
                            {pf.preview ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={pf.preview} alt={pf.file.name} className="w-6 h-6 rounded object-cover" />
                            ) : (
                                fileIcon(pf.file.type)
                            )}
                            <span className="flex-1 truncate font-medium">{pf.file.name}</span>
                            <span className="text-base-content/40">{formatSize(pf.file.size)}</span>
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); remove(i) }}
                                    className="btn btn-ghost btn-xs btn-circle"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
