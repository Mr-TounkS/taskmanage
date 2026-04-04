"use client"
import { getProjectInfo, getTakDetails, updateTaskStatus } from "@/app/actions";
import EmptyState from "@/app/components/EmptyState";
import UserInfo from "@/app/components/UserInfo";
import Wrapper from "@/app/components/Wrapper";
import { Project, Task } from "@/app/type";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import 'react-quill-new/dist/quill.snow.css'
import { toast } from "react-toastify";

import dynamic from 'next/dynamic';

// On importe ReactQuill dynamiquement et on désactive le SSR
const ReactQuill = dynamic(() => import('react-quill-new'), {
    ssr: false,
    loading: () => <div className="h-40 w-full bg-base-200 animate-pulse rounded-xl">Chargement de l'éditeur...</div>
});

// L'import du CSS reste le même
import 'react-quill-new/dist/quill.snow.css';


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
        try {
            const task = await getTakDetails(taskId)
            setTask(task)
            setStatus(task.status)
            setRealStatus(task.status)
            fetchProject(task.projectId)
        } catch (error) {
            toast.error('Erreur lors du chargement des details de la tache !');
        }
    }

    const fetchProject = async (projectId: string) => {
        try {
            const project = await getProjectInfo(projectId, false)
            setProject(project)
        } catch (error) {
            toast.error('Erreur lors du chargement du projet !');
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
            toast.error(error instanceof Error ? error.message : 'Erreur lors du changement de status')
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

        // Cette regex supprime toutes les balises HTML et les espaces vides
        const strippedSolution = solution.replace(/<[^>]*>/g, '').trim();

        try {
            // On vérifie si le contenu "nettoyé" est vide
            if (strippedSolution !== "") {
                await updateTaskStatus(taskId, newStatus, solution);
                fetchInfos(taskId);
                if (modal) {
                    modal.close();
                }
                toast.success('Tache cloturée');
                setSolution(""); // Optionnel : vider l'éditeur après succès
            } else {
                // Maintenant, cela s'affichera si l'utilisateur n'a rien tapé d'utile
                toast.error('Il manque une solution');
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erreur lors du changement de status");
        }
    }

    useEffect(() => {
        const modal = document.getElementById('my_modal_3') as HTMLDialogElement
        const handleClose = () => {
            if (status === "Done" && status !== realStatus) {
                setStatus(realStatus)
            }
        }

        if (modal) {
            modal.addEventListener('close', handleClose)
        }

        return () => {
            if (modal) {
                modal.removeEventListener('close', handleClose)
            }
        }
    }, [status, realStatus])

    return (
        <Wrapper>
            {
                task ? (
                    <div>
                        <div className="flex flex-col md:justify-between md:flex-row">
                            <div className="breadcrumbs text-sm">
                                <ul>
                                    <li><Link href={`/project/${task?.projectId}`}>Retour</Link></li>
                                    <li>{project?.name}</li>
                                </ul>
                            </div>
                            <div className="p-5 border border-base-300 rounded-xl w-full md:w-fit my-4">
                                <UserInfo
                                    role="Assigné a"
                                    email={task.user?.email || null}
                                    name={task.user?.name || null}
                                    imageUrl={task.user?.imageUrl || null}
                                />
                            </div>
                        </div>

                        <h1 className="font-semibold italic text-2xl mb-4">{task.name}</h1>

                        <div className="flex justify-between items-center mb-4">
                            <span>
                                A livré le
                                <div className="badge badge-ghost ml-2">{task?.dueDate?.toLocaleDateString()}</div>
                            </span>
                            <div>
                                {/* Label visually hidden mais accessible aux lecteurs d'écran */}
                                {/* Corrige : "Select elements do not have associated label" — Lighthouse Accessibility */}
                                <label htmlFor="task-status-select" className="sr-only">
                                    Statut de la tâche
                                </label>
                                <select
                                    id="task-status-select"
                                    value={status}
                                    onChange={handleStatusChange}
                                    disabled={status == "Done" || task.user?.email !== email}
                                    className="select select-sm select-bordered select-primary focus:outline-none ml-3">
                                    <option value="To Do">A faire</option>
                                    <option value="In Progress">En cours</option>
                                    <option value="Done">Terminée</option>
                                </select>
                            </div>
                        </div>

                        <div className="mb-6">
                            <div className="flex md:justify-between md:items-center flex-col md:flex-row">

                                <div className="p-5 border border-base-300 rounded-xl w-full md:w-fit">
                                    <UserInfo
                                        role="Créer par"
                                        email={task.createdBy?.email || null}
                                        name={task.createdBy?.name || null}
                                        imageUrl={task.createdBy?.imageUrl || null}
                                    />
                                </div>
                                <div className="badge badge-primary my-4 md:mt-0">
                                    {task.dueDate && `
                                        ${Math.max(0, Math.ceil((new Date(task.dueDate).getTime() - new Date().getTime()) /
                                        (1000 * 60 * 60 * 24)))} jours restants
                                      `}
                                </div>
                            </div>
                        </div>

                        <div className="ql-snow w-full">
                            <div
                                className="ql-editor p-5 border-base-300 border rounded-xl"
                                dangerouslySetInnerHTML={{ __html: task.description }}
                            />
                        </div>

                        {
                            task?.solutionDescription && (
                                <div>
                                    <div className="badge badge-primary my-4">
                                        Solution
                                    </div>
                                    <div className="ql-snow w-full">
                                        <div
                                            className="ql-editor p-5 border-base-300 border rounded-xl"
                                            dangerouslySetInnerHTML={{ __html: task.solutionDescription }}
                                        />
                                    </div>
                                </div>
                            )
                        }

                        <dialog id="my_modal_3" className="modal">
                            <div className="modal-box">
                                <form method="dialog">
                                    {/* if there is a button in form, it will close the modal */}
                                    <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                                </form>
                                <h3 className="font-bold text-lg">C'est quoi la solution ?</h3>
                                <p className="py-4">Decrivez ce que vous avez fait exactemen</p>
                                <ReactQuill
                                    placeholder="Decrivez la solution"
                                    value={solution}
                                    modules={modules}
                                    onChange={setSolution}
                                />
                                <button
                                    onClick={() => closeTask(status)}
                                    className="btn mt-4"
                                    disabled={solution.replace(/<[^>]*>/g, '').trim() === ""}>Terminé(e)</button>
                            </div>
                        </dialog>
                    </div>
                ) : (
                    <EmptyState
                        imageSrc="/empty-task.png"
                        imageAlt="Picture of an empty project"
                        message="Cette tache n'existe pas"
                    />
                )}
        </Wrapper>
    )
}

export default page