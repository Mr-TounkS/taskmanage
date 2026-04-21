"use client"
import { createTask, getProjectInfo, getProjectUser, uploadTaskFile } from '@/app/actions';
import AssignTask from '@/app/components/AssignTask';
import FileUploadZone, { PendingFile } from '@/app/components/FileUploadZone';
import Wrapper from '@/app/components/Wrapper'
import { Project } from '@/app/type';
import { useUser } from '@clerk/nextjs';
import { User } from '@/prisma/generated/prisma/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import 'react-quill-new/dist/quill.snow.css'
import { toast } from 'react-toastify';
import { AlertTriangle, ArrowDown, Minus } from 'lucide-react';

type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

// CSS importé en haut (Next.js gère les CSS séparément, pas de risque SSR)
// Seul le module JS a besoin de ssr:false (il accède à window/document)
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false })

const page = ({ params }: { params: Promise<{ projectId: string }> }) => {

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'font': [] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'color': [] }, { 'background': [] }],
            ['blockquote', 'code-block'],
            ['link', 'image'],
            ['clean']
        ]
    };

    const { user } = useUser();
    const email = user?.primaryEmailAddress?.emailAddress as string;
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<Project | null>(null);
    const [usersProject, setUsersProject] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [priority, setPriority] = useState<TaskPriority>('MEDIUM')
    const [startDate, setStartDate] = useState<Date | null>(null)
    const [dueDate, setDueDate] = useState<Date | null>(null)
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
    const [uploading, setUploading] = useState(false)
    const rooter = useRouter()

    const fetchInfos = async (projectId: string) => {
        try {
            const project = await getProjectInfo(projectId, true)
            setProject(project)
            const associatedUsers = await getProjectUser(projectId)
            setUsersProject(associatedUsers)
        } catch (error) {
            console.error('Erreur lors du chargement du projet:', error);
        }
    }

    useEffect(() => {
        const getId = async () => {
            const resolvedParams = await params;
            setProjectId(resolvedParams.projectId)
            fetchInfos(resolvedParams.projectId)
        }
        getId()
    }, [params])

    const handleUserSelect = (user: User) => {
        setSelectedUser(user)
    }

    const handleSubmit = async () => {
        if (!name || !projectId || !selectedUser || !description || !dueDate) {
            toast.error('Veuillez remplir tous les champs obligatoires')
            return
        }
        if (startDate && dueDate && startDate > dueDate) {
            toast.error('La date de début ne peut pas être après la date de fin')
            return
        }
        try {
            setUploading(true)
            const task = await createTask(name, description, priority, startDate, dueDate, projectId, email, selectedUser.email)

            // Upload des fichiers joints (optionnel)
            if (pendingFiles.length > 0 && task?.id) {
                const failed: string[] = []
                for (const pf of pendingFiles) {
                    try {
                        const fd = new FormData()
                        fd.append("file", pf.file)
                        await uploadTaskFile(task.id, fd)
                    } catch {
                        failed.push(pf.file.name)
                    }
                }
                if (failed.length > 0) {
                    toast.warn(`Tâche créée mais ${failed.length} fichier(s) non uploadé(s) : ${failed.join(", ")}`)
                }
            }

            rooter.push(`/project/${projectId}`)
        } catch (error) {
            toast.error("Une erreur est survenue lors de la création de la tâche." + error);
        } finally {
            setUploading(false)
        }
    }

    return (
        <Wrapper>
            <div>
                <div className="breadcrumbs text-sm">
                    <ul>
                        <li><Link href={`/project/${projectId}`}>Retour</Link></li>
                        <li>
                            <div className='badge badge-primary'>{project?.name}</div>
                        </li>
                    </ul>
                </div>

                <div className='flex flex-col md:flex-row gap-6'>

                    {/* ── Colonne gauche ── */}
                    <div className='w-full md:w-1/4 flex flex-col gap-4'>

                        {/* Assignation */}
                        <AssignTask users={usersProject} projectId={projectId} onAssignTask={handleUserSelect} />

                        {/* Priorité */}
                        <div className='border border-base-300 rounded-xl p-4'>
                            <p className='text-xs font-semibold text-base-content/60 uppercase tracking-wide mb-3'>
                                Priorité
                            </p>
                            <div className='flex flex-col gap-2'>
                                <button
                                    type="button"
                                    onClick={() => setPriority('LOW')}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left
                                        ${priority === 'LOW' ? 'border-success bg-success/10' : 'border-base-300 hover:border-base-400'}`}
                                >
                                    <ArrowDown className="w-4 h-4 text-success" />
                                    <span className="text-success font-semibold">Faible</span>
                                    {priority === 'LOW' && <span className='ml-auto text-success text-xs'>✓</span>}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPriority('MEDIUM')}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left
                                        ${priority === 'MEDIUM' ? 'border-warning bg-warning/10' : 'border-base-300 hover:border-base-400'}`}
                                >
                                    <Minus className="w-4 h-4 text-warning" />
                                    <span className="text-warning font-semibold">Moyenne</span>
                                    {priority === 'MEDIUM' && <span className='ml-auto text-warning text-xs'>✓</span>}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPriority('HIGH')}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left
                                        ${priority === 'HIGH' ? 'border-error bg-error/10' : 'border-base-300 hover:border-base-400'}`}
                                >
                                    <AlertTriangle className="w-4 h-4 text-error" />
                                    <span className="text-error font-semibold">Élevée</span>
                                    {priority === 'HIGH' && <span className='ml-auto text-error text-xs'>✓</span>}
                                </button>
                            </div>
                        </div>

                        {/* Dates */}
                        <div className='border border-base-300 rounded-xl p-4'>
                            <p className='text-xs font-semibold text-base-content/60 uppercase tracking-wide mb-3'>
                                Dates
                            </p>
                            <div className='flex flex-col gap-3'>
                                <div>
                                    <label className='text-xs text-base-content/60 block mb-1'>
                                        Date de début
                                    </label>
                                    <input
                                        suppressHydrationWarning
                                        className='input input-bordered input-sm border-base-300 w-full'
                                        type="date"
                                        onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
                                    />
                                </div>
                                <div>
                                    <label className='text-xs text-base-content/60 block mb-1'>
                                        Date de livraison <span className='text-error'>*</span>
                                    </label>
                                    <input
                                        suppressHydrationWarning
                                        className='input input-bordered input-sm border-base-300 w-full'
                                        type="date"
                                        onChange={(e) => setDueDate(new Date(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* ── Colonne droite ── */}
                    <div className='w-full md:flex-1 min-w-0 overflow-hidden flex flex-col gap-4'>
                        <input
                            suppressHydrationWarning
                            placeholder='Nom de la tâche *'
                            className='w-full input input-bordered border border-base-300 font-bold'
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <div className='w-full max-w-full overflow-hidden'>
                            <ReactQuill
                                placeholder='Décrivez la tâche...'
                                value={description}
                                modules={modules}
                                onChange={setDescription}
                            />
                        </div>

                        {/* Pièces jointes — optionnel */}
                        <div className='border border-base-300 rounded-xl p-4'>
                            <FileUploadZone
                                files={pendingFiles}
                                onChange={setPendingFiles}
                                disabled={uploading}
                            />
                        </div>

                        <div className='flex justify-end'>
                            <button
                                className='btn btn-primary btn-md'
                                onClick={handleSubmit}
                                disabled={uploading}
                            >
                                {uploading ? (
                                    <><span className="loading loading-spinner loading-sm" /> Création en cours...</>
                                ) : (
                                    "Créer la tâche"
                                )}
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </Wrapper>
    )
}

export default page
