"use client"
import { deleteTaskById, getProjectInfo } from "@/app/actions";
import EmptyState from "@/app/components/EmptyState";
import ProjectComponent from "@/app/components/ProjectComponent";
import TaskComponent from "@/app/components/TaskComponent";
import UserInfo from "@/app/components/UserInfo";
import Wrapper from "@/app/components/Wrapper";
import { Project } from "@/app/type";
import { useUser } from "@clerk/nextjs";
import { CircleCheckBig, CopyPlus, ListTodo, Loader, SlidersHorizontal, UserCheck } from "lucide-react";
import Link from "next/link";
import { todo } from "node:test";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

const page = ({ params }: { params: Promise<{ projectId: string }> }) => {

    const { user } = useUser();
    const email = user?.primaryEmailAddress?.emailAddress;
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<Project | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [assignedFilter, setAssignedFilter] = useState<boolean>(false);
    const [taskCounts, setTaskCounts] = useState({ todo: 0, inProgress: 0, done: 0, assigned: 0 })

    const fetchInfos = async (projectId: string) => {
        try {
            const project = await getProjectInfo(projectId, true)
            setProject(project)
        } catch (error) {
            console.error("Erreur lors du chargement du projet:", error);
        }
    }

    useEffect(() => {
        const getId = async () => {
            const resolvedParams = await params;
            setProjectId(resolvedParams.projectId);
            fetchInfos(resolvedParams.projectId)
        }
        getId()
    }, [params])

    useEffect(() => {
        if (project && project.tasks) {
            const counts = {
                todo: project.tasks.filter(task => task.status == "To Do").length,
                inProgress: project.tasks.filter(task => task.status == "In Progress").length,
                done: project.tasks.filter(task => task.status == "Done").length,
                assigned: project.tasks.filter(task => task?.user?.email == email).length
            }
            setTaskCounts(counts)
        }
    }, [params])


    const filteredTasks = project?.tasks?.filter(task => {
        const statutsMatch = !statusFilter || task.status == statusFilter
        const assignedMatch = !assignedFilter || task?.user?.email == email
        return statutsMatch && assignedMatch
    })

    const deleteTask = async (taskId: string) => {
        try {
            await deleteTaskById(taskId)
            fetchInfos(projectId)
            toast.success('Tache supprimée !')
        } catch (error) {
            toast.error('Error task project')
        }
    }

    return (
        <Wrapper>
            <div className="md:flex md:flex-row flex-col">
                <div className="md:w-1/4">
                    <div className="p-5 border border-base-300 rounded-x1 mb-6">
                        <UserInfo
                            role="Creer par"
                            email={project?.createdBy?.email || null}
                            name={project?.createdBy?.name || null}
                        />
                    </div>

                    <div className="w-full">
                        {project && (
                            <ProjectComponent project={project} admin={0} style={false} ></ProjectComponent>
                        )}
                    </div>
                </div>
                <div className="mt-6 md:ml-6 md:mt-0 md:w-3/4">
                    <div className="md:flex md:justify-between">
                        <div className="flex flex-col ">
                            <div className="space-x-2 mt-2">
                                <button
                                    onClick={() => { setStatusFilter(''); setAssignedFilter(false) }}
                                    className={`btn btn-sm ${!statusFilter && !assignedFilter ? 'btn-primary' : ''}`}>
                                    <SlidersHorizontal className="w-4" /> Tous ({project?.tasks?.length || 0})
                                </button>

                                <button
                                    onClick={() => { setStatusFilter('To Do') }}
                                    className={`btn btn-sm ${statusFilter === "To Do" ? 'btn-primary' : ''}`}>
                                    <ListTodo className="w-4" /> A faire ({taskCounts.todo})
                                </button>

                                <button
                                    onClick={() => { setStatusFilter('In Progress') }}
                                    className={`btn btn-sm ${statusFilter === "In Progress" ? 'btn-primary' : ''}`}>
                                    <Loader className="w-4" /> En Cours ({taskCounts.inProgress})
                                </button>
                            </div>
                            <div className="space-x-2 mt-2">
                                <button
                                    onClick={() => { setStatusFilter('Done') }}
                                    className={`btn btn-sm ${statusFilter === "Done" ? 'btn-primary' : ''}`}>
                                    <CircleCheckBig className="w-4" /> Finis ({taskCounts.done})
                                </button>

                                <button
                                    onClick={() => { setAssignedFilter(!assignedFilter) }}
                                    className={`btn btn-sm ${assignedFilter ? 'btn-primary' : ''}`}>
                                    <UserCheck className="w-4" /> Vos taches ({taskCounts.assigned})
                                </button>
                            </div>
                        </div>
                        <Link href={`/new-tasks/${projectId}`} className="btn btn-sm mt-2 md:mt-0">
                            Nouvelle tache
                            <CopyPlus />
                        </Link>
                    </div>
                    <div className="mt-6 border border-base-300 p-5 shadow-sm rounded-xl">
                        {filteredTasks && filteredTasks.length > 0 ? (
                            <div className="overflow-auto">
                                <table className="table table-lg">
                                    <thead>
                                        <tr>
                                            <th></th>
                                            <th>Titre</th>
                                            <th>Assigné à</th>
                                            <th className="hidden md:flex">A livré le</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="w-fit">

                                        {filteredTasks.map((task, index) => (
                                            <tr key={task.id} className="border-t last:border-none">
                                                <TaskComponent task={task} index={index} onDelete={deleteTask} email={email} />
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <EmptyState
                                imageSrc="/empty-task.png"
                                imageAlt="Picture of an empty project"
                                message="0 tâche à afficher"
                            />
                        )}
                    </div>
                </div>

            </div>
        </Wrapper>
    )
}

export default page