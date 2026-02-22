"use client"
import { createTask, getProjectInfo, getProjectUser } from "@/app/actions";
import AssignTask from "@/app/components/AssignTask";
import Wrapper from "@/app/components/Wrapper";
import { Project } from "@/app/type";
import { useUser } from "@clerk/nextjs";
import { User } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import ReactQuill from "react-quill-new";
import 'react-quill-new/dist/quill.snow.css'
import { toast } from "react-toastify";

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
    const [selectedUser, setselectedUser] = useState<User | null>(null)
    const [DueDate, setDueDate] = useState<Date | null>(null)
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const rooter = useRouter()

    const fetchInfos = async (projectId: string) => {
        try {
            const project = await getProjectInfo(projectId, true)
            setProject(project)

            const associatedUser = await getProjectUser(projectId)
            setUsersProject(associatedUser)
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

    const handleUserSelected = (user: User) => {
        setselectedUser(user)
    }

    const handleSubmit = async () => {
        if (!name || !projectId || !selectedUser || !description || !DueDate) {
            toast.error('Veuillez remplir tous les champs obligatoires')
            return
        }

        if (!selectedUser) {
            toast.error('Veuillez assigner la tâche à un collaborateur');
            return;
        }

        try {
            await createTask(
                name,
                description,
                DueDate,
                projectId,
                email,                  // createdByEmail = toi
                selectedUser.email      // assignToEmail = choisi
            );
            toast.success('Tâche créée avec succès !');
            rooter.push(`/project/${projectId}`);
        } catch (error) {
            toast.error('Erreur lors de la création de la tâche : ' + (error as Error).message);
        }
    }

    return (
        <Wrapper>
            <div >
                <div className="breadcrumbs text-sm">
                    <ul>
                        <li><Link href={`/project/${projectId}`}>Retour</Link></li>
                        <li><div className="badge badge-primary">{project?.name}</div></li>
                    </ul>
                </div>
                <div className="flex flex-col md:flex-row md:justify-between">
                    <div className="md:w-1/4">
                        <AssignTask users={usersProject} projectId={projectId} onAssignTask={handleUserSelected} />
                        <div className="flex justify-betweem items-center mt-4">
                            <span className="badge">
                                A livré
                            </span>
                            <input type="date"
                                className="input input-bordered border border-base-300 focus:outline-none"
                                placeholder="date d'echéance"
                                onChange={(e) => setDueDate(new Date(e.target.value))}
                            />
                        </div>
                    </div>
                    <div className="md:w-3/4 mt-4 md:mt-0 md:ml-4">
                        <div className="flex flex-col justify-between w-full">
                            <input
                                placeholder="Nom de la tache"
                                className="w-full input input-bordered border border-base-300 font-bold mb-4"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                            <ReactQuill
                                placeholder="Decrivez la tache"
                                value={description}
                                modules={modules}
                                onChange={setDescription}
                            />
                        </div>
                        <div className="flex justify-end" onClick={handleSubmit}>
                            <button className="btn mt-4 btn-md btn-primary" >Créer la tache</button></div>
                    </div>

                </div>
            </div>
        </Wrapper>
    )
}
export default page