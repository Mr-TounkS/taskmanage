"use client"
import { getProjectInfo, getTakDetails, getTaskFiles, updateTaskStatus } from "@/app/actions";
import EmptyState from "@/app/components/EmptyState";
import UserInfo from "@/app/components/UserInfo";
import Wrapper from "@/app/components/Wrapper";
import { Project, Task } from "@/app/type";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import 'react-quill-new/dist/quill.snow.css'
import { toast } from "react-toastify";
import { FileText, Image as ImageIcon, ExternalLink, Paperclip } from "lucide-react";
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill-new'), {
    ssr: false,
    loading: () => <div className="h-40 w-full bg-base-200 animate-pulse rounded-xl" />,
});

interface AttachedFile {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    blobUrl: string;
}

const page = ({ params }: { params: Promise<{ taskId: string }> }) => {

    const { user } = useUser();
    const email = user?.primaryEmailAddress?.emailAddress;

    const [task, setTask] = useState<Task | null>(null)
    const [taskId, setTaskId] = useState<string>("")
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<Project | null>(null);
    const [status, setStatus] = useState("");
    const [realStatus, setRealStatus] = useState("");
    const [solution, setSolution] = useState("");
    // État de chargement — évite d'afficher "tâche inexistante" pendant le fetch
    const [isLoading, setIsLoading] = useState(true)
    // Fichiers joints à la tâche
    const [files, setFiles] = useState<AttachedFile[]>([])

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

    const fetchInfos = async (taskId: string) => {
        setIsLoading(true)
        try {
            // Charge la tâche et ses fichiers joints en parallèle
            const [taskData, taskFiles] = await Promise.all([
                getTakDetails(taskId),
                getTaskFiles(taskId),
            ])
            setTask(taskData)
            setStatus(taskData.status)
            setRealStatus(taskData.status)
            setFiles(taskFiles as AttachedFile[])
            fetchProject(taskData.projectId)
        } catch (error) {
            toast.error('Failed to load task details');
        } finally {
            setIsLoading(false)
        }
    }

    const fetchProject = async (projectId: string) => {
        try {
            const project = await getProjectInfo(projectId, false)
            setProject(project as unknown as Project | null)
        } catch (error) {
            toast.error('Failed to load project');
        }
    }

    useEffect(() => {
        const getId = async () => {
            const resolvedParams = await params;
            setTaskId(resolvedParams.taskId);
            fetchInfos(resolvedParams.taskId)
        }
        getId()
    }, [params])

    const changeStatus = async (taskId: string, newStatus: string) => {
        try {
            await updateTaskStatus(taskId, newStatus)
            fetchInfos(taskId)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to update status')
        }
    }

    const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = event.target.value;
        setStatus(newStatus)
        const modal = document.getElementById('my_modal_3') as HTMLDialogElement

        if (newStatus == "To Do" || newStatus == "In Progress") {
            changeStatus(taskId, newStatus)
            toast.success('Status change')
            modal.close()
        } else {
            modal.showModal()
        }
    }

    const closeTask = async (newStatus: string) => {
        const modal = document.getElementById('my_modal_3') as HTMLDialogElement;
        const strippedSolution = solution.replace(/<[^>]*>/g, '').trim();

        try {
            if (strippedSolution !== "") {
                await updateTaskStatus(taskId, newStatus, solution);
                fetchInfos(taskId);
                if (modal) modal.close();
                toast.success('Task closed');
                setSolution("");
            } else {
                toast.error('Please provide a solution');
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update status");
        }
    }

    useEffect(() => {
        const modal = document.getElementById('my_modal_3') as HTMLDialogElement
        const handleClose = () => {
            if (status === "Done" && status !== realStatus) setStatus(realStatus)
        }
        if (modal) modal.addEventListener('close', handleClose)
        return () => { if (modal) modal.removeEventListener('close', handleClose) }
    }, [status, realStatus])

    // ── Rendu conditionnel selon l'état de chargement ──────────────────────────

    if (isLoading) {
        return (
            <Wrapper>
                <div className="flex flex-col gap-4 animate-pulse">
                    <div className="skeleton h-6 w-32 rounded" />
                    <div className="skeleton h-8 w-64 rounded" />
                    <div className="skeleton h-4 w-48 rounded" />
                    <div className="skeleton h-48 w-full rounded-xl" />
                </div>
            </Wrapper>
        )
    }

    if (!task) {
        return (
            <Wrapper>
                <EmptyState
                    imageSrc="/empty-task.png"
                    imageAlt="Picture of an empty project"
                    message="This task does not exist"
                />
            </Wrapper>
        )
    }

    // ── Rendu principal ────────────────────────────────────────────────────────

    return (
        <Wrapper>
            <div>
                {/* Breadcrumb + assigné */}
                <div className="flex flex-col md:justify-between md:flex-row">
                    <div className="breadcrumbs text-sm">
                        <ul>
                            <li><Link href={`/project/${task.projectId}`}>Back</Link></li>
                            <li>{project?.name}</li>
                        </ul>
                    </div>
                    <div className="p-5 border border-base-300 rounded-xl w-full md:w-fit my-4">
                        <UserInfo
                            role="Assigned to"
                            email={task.user?.email || null}
                            name={task.user?.name || null}
                            imageUrl={task.user?.imageUrl || null}
                        />
                    </div>
                </div>

                {/* Titre */}
                <h1 className="font-semibold italic text-2xl mb-4">{task.name}</h1>

                {/* Date de livraison + sélecteur de statut */}
                <div className="flex justify-between items-center mb-4">
                    <span>
                        Due date
                        <div className="badge badge-ghost ml-2">{task?.dueDate?.toLocaleDateString()}</div>
                    </span>
                    <div>
                        <label htmlFor="task-status-select" className="sr-only">Task status</label>
                        <select
                            id="task-status-select"
                            value={status}
                            onChange={handleStatusChange}
                            disabled={status == "Done" || task.user?.email !== email}
                            className="select select-sm select-bordered select-primary focus:outline-none ml-3"
                        >
                            <option value="To Do">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Done">Done</option>
                        </select>
                    </div>
                </div>

                {/* Créateur + jours restants */}
                <div className="mb-6">
                    <div className="flex md:justify-between md:items-center flex-col md:flex-row">
                        <div className="p-5 border border-base-300 rounded-xl w-full md:w-fit">
                            <UserInfo
                                role="Created by"
                                email={task.createdBy?.email || null}
                                name={task.createdBy?.name || null}
                                imageUrl={task.createdBy?.imageUrl || null}
                            />
                        </div>
                        <div className="badge badge-primary my-4 md:mt-0">
                            {task.dueDate && `${Math.max(0, Math.ceil(
                                (new Date(task.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                            ))} days remaining`}
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="ql-snow w-full">
                    <div
                        className="ql-editor p-5 border-base-300 border rounded-xl"
                        dangerouslySetInnerHTML={{ __html: task.description }}
                    />
                </div>

                {/* Solution (si tâche clôturée) */}
                {task.solutionDescription && (
                    <div className="mt-6">
                        <div className="badge badge-primary mb-3">Solution</div>
                        <div className="ql-snow w-full">
                            <div
                                className="ql-editor p-5 border-base-300 border rounded-xl"
                                dangerouslySetInnerHTML={{ __html: task.solutionDescription }}
                            />
                        </div>
                    </div>
                )}

                {/* Pièces jointes */}
                {files.length > 0 && (
                    <div className="mt-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Paperclip className="w-4 h-4 text-base-content/60" />
                            <span className="text-sm font-semibold text-base-content/70 uppercase tracking-wide">
                                Attachments ({files.length})
                            </span>
                        </div>
                        <div className="flex flex-col gap-2">
                            {files.map((file) => (
                                <a
                                    key={file.id}
                                    href={file.blobUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 border border-base-300 rounded-xl hover:bg-base-200 transition-colors group"
                                >
                                    {file.mimeType.startsWith("image/") ? (
                                        <ImageIcon className="w-5 h-5 text-primary shrink-0" />
                                    ) : (
                                        <FileText className="w-5 h-5 text-primary shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{file.fileName}</p>
                                        <p className="text-xs text-base-content/40">
                                            {file.fileSize < 1024
                                                ? `${file.fileSize} B`
                                                : file.fileSize < 1024 * 1024
                                                    ? `${Math.round(file.fileSize / 1024)} KB`
                                                    : `${(file.fileSize / (1024 * 1024)).toFixed(1)} MB`
                                            }
                                        </p>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-base-content/30 group-hover:text-primary shrink-0 transition-colors" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Modal de clôture */}
                <dialog id="my_modal_3" className="modal">
                    <div className="modal-box">
                        <form method="dialog">
                            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                        </form>
                        <h3 className="font-bold text-lg">What is the solution?</h3>
                        <p className="py-4">Describe what you did exactly</p>
                        <ReactQuill
                            placeholder="Describe the solution"
                            value={solution}
                            modules={modules}
                            onChange={setSolution}
                        />
                        <button
                            onClick={() => closeTask(status)}
                            className="btn btn-primary mt-4"
                            disabled={solution.replace(/<[^>]*>/g, '').trim() === ""}
                        >
                            Close task
                        </button>
                    </div>
                </dialog>
            </div>
        </Wrapper>
    )
}

export default page
