"use client"
import { createTask, getProjectInfo, getProjectUser } from '@/app/actions';
import AssignTask from '@/app/components/AssignTask';
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
    const rooter = useRouter()

    const fetchInfos = async (projectId: string) => {
        try {
            const project = await getProjectInfo(projectId, true)
            setProject(project as unknown as Project | null)
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
            toast.error('Please fill in all required fields')
            return
        }
        if (startDate && dueDate && startDate > dueDate) {
            toast.error('Start date cannot be after the due date')
            return
        }
        try {
            await createTask(name, description, priority, startDate, dueDate, projectId, email, selectedUser.email)
            rooter.push(`/project/${projectId}`)
        } catch (error) {
            toast.error("An error occurred while creating the task." + error);
        }
    }

    return (
        <Wrapper>
            <div>
                <div className="breadcrumbs text-sm">
                    <ul>
                        <li><Link href={`/project/${projectId}`}>Back</Link></li>
                        <li>
                            <div className='badge badge-primary'>{project?.name}</div>
                        </li>
                    </ul>
                </div>

                <div className='flex flex-col lg:flex-row gap-5'>

                    {/* ── Colonne gauche (panneau latéral) ── */}
                    <div className='w-full lg:w-64 xl:w-72 shrink-0 flex flex-col gap-4'>

                        {/* Assignation */}
                        <div className='border border-base-300 rounded-xl p-4 overflow-hidden'>
                            <p className='text-xs font-semibold text-base-content/60 uppercase tracking-wide mb-3'>
                                Assigned to
                            </p>
                            <AssignTask users={usersProject} projectId={projectId} onAssignTask={handleUserSelect} />
                        </div>

                        {/* Priorité + Dates côte à côte sur mobile/tablet, empilés sur desktop */}
                        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4'>

                            {/* Priorité */}
                            <div className='border border-base-300 rounded-xl p-4'>
                                <p className='text-xs font-semibold text-base-content/60 uppercase tracking-wide mb-3'>
                                    Priority
                                </p>
                                <div className='flex flex-col gap-2'>
                                    {[
                                        { value: 'LOW'    as TaskPriority, icon: <ArrowDown className="w-4 h-4 text-success" />,    label: 'Low',    color: 'success' },
                                        { value: 'MEDIUM' as TaskPriority, icon: <Minus className="w-4 h-4 text-warning" />,        label: 'Medium', color: 'warning' },
                                        { value: 'HIGH'   as TaskPriority, icon: <AlertTriangle className="w-4 h-4 text-error" />,  label: 'High',   color: 'error'   },
                                    ].map(({ value, icon, label, color }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setPriority(value)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left
                                                ${priority === value
                                                    ? `border-${color} bg-${color}/10`
                                                    : 'border-base-300 hover:border-base-400'}`}
                                        >
                                            {icon}
                                            <span className={`text-${color} font-semibold`}>{label}</span>
                                            {priority === value && <span className={`ml-auto text-${color} text-xs`}>✓</span>}
                                        </button>
                                    ))}
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
                                            Start date
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
                                            Due date <span className='text-error'>*</span>
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
                    </div>

                    {/* ── Colonne droite (formulaire principal) ── */}
                    <div className='flex-1 min-w-0 flex flex-col gap-4'>
                        <input
                            suppressHydrationWarning
                            placeholder='Task name *'
                            className='w-full input input-bordered border border-base-300 font-bold'
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <div className='w-full overflow-hidden'>
                            <ReactQuill
                                placeholder='Describe the task...'
                                value={description}
                                modules={modules}
                                onChange={setDescription}
                            />
                        </div>
                        <div className='flex justify-end'>
                            <button className='btn btn-primary w-full sm:w-auto' onClick={handleSubmit}>
                                Create task
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </Wrapper>
    )
}

export default page
