"use client"

import { UserButton, useUser } from "@clerk/nextjs";
import {
    FolderGit2, LayoutDashboard, Inbox, Users, BarChart2,
    Settings, ChevronDown, ChevronRight, HelpCircle, UserPlus,
    Plus, Folder, X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { checkAndAddUser, createProject, getProjectsCreatedByUser } from "../actions";
import { Project } from "../type";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
const PushNotificationToggle = dynamic(() => import("./PushNotificationToggle"), { ssr: false });

interface SidebarProps {
    /** Contrôle l'ouverture du drawer sur mobile */
    isOpen?: boolean
    /** Callback pour fermer le drawer */
    onClose?: () => void
}

const Sidebar = ({ isOpen = false, onClose }: SidebarProps) => {
    const { user } = useUser();
    const pathname = usePathname();
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectsOpen, setProjectsOpen] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    // Synchronisation utilisateur Clerk → base de données + chargement des projets
    useEffect(() => {
        if (user?.primaryEmailAddress?.emailAddress && user?.fullName) {
            checkAndAddUser(
                user.primaryEmailAddress.emailAddress,
                user.fullName,
                user.imageUrl ?? undefined
            );
            getProjectsCreatedByUser(user.primaryEmailAddress.emailAddress)
                .then(setProjects)
                .catch(() => {});
        }
    }, [user]);

    const handleCreateProject = async () => {
        if (!user?.primaryEmailAddress?.emailAddress || !name) return;
        try {
            await createProject(name, description, user.primaryEmailAddress.emailAddress);
            const updated = await getProjectsCreatedByUser(user.primaryEmailAddress.emailAddress);
            setProjects(updated);
            setName("");
            setDescription("");
            setShowModal(false);
            toast.success("Project created!");
        } catch (error) {
            console.error(error);
        }
    };

    const isActive = (href: string) => {
        if (href === "/") return pathname === "/";
        return pathname === href || pathname.startsWith(href + "/");
    };

    // Items de navigation actifs
    const activeNavItems = [
        { href: "/",           label: "Dashboard",    icon: <LayoutDashboard className="w-4 h-4" /> },
        { href: "/general-project", label: "Collaboration", icon: <Inbox    className="w-4 h-4" /> },
        { href: "/teams",      label: "Teams",        icon: <Users           className="w-4 h-4" /> },
        { href: "/analytics",  label: "Analytics",    icon: <BarChart2       className="w-4 h-4" /> },
    ];

    // Items à venir (placeholders visuels)
    const comingSoonItems = [
        { label: "Settings", icon: <Settings className="w-4 h-4" /> },
    ];

    return (
        <>
            {/* Drawer mobile + sidebar desktop */}
            <aside className={`
                fixed inset-y-0 left-0 z-40 flex flex-col w-72
                bg-base-100 border-r border-base-300
                transform transition-transform duration-300 ease-in-out
                lg:relative lg:w-64 lg:translate-x-0 lg:z-auto lg:shrink-0
                ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
            `}>

                {/* En-tête : logo + workspace + bouton fermeture mobile */}
                <div className="p-4 border-b border-base-300">
                    <div className="flex items-center gap-2 mb-3">
                        {/* Bouton fermer — visible uniquement sur mobile */}
                        <button
                            onClick={onClose}
                            className="btn btn-ghost btn-xs btn-circle lg:hidden mr-1 opacity-60"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div className="bg-primary text-primary-content rounded-lg p-1.5">
                            <FolderGit2 className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-lg leading-none">
                            Task <span className="text-primary">Manage</span>
                        </span>
                    </div>
                    {user && (
                        <div className="flex items-center gap-2 px-1 py-1 rounded-lg hover:bg-base-200 transition-colors cursor-default">
                            <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-primary">
                                    {(user.fullName || user.primaryEmailAddress?.emailAddress || "?")[0].toUpperCase()}
                                </span>
                            </div>
                            <span className="text-sm text-base-content/60 truncate flex-1">
                                {user.fullName || user.primaryEmailAddress?.emailAddress}
                            </span>
                            <ChevronDown className="w-3 h-3 text-base-content/40 shrink-0" />
                        </div>
                    )}
                </div>

                {/* Bouton "+ Nouveau projet" */}
                <div className="px-4 py-3 border-b border-base-300">
                    <button
                        onClick={() => setShowModal(true)}
                        className="btn btn-primary w-full btn-sm gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        New project
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                    {activeNavItems.map(({ href, label, icon }) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                                ${isActive(href)
                                    ? "bg-primary text-primary-content"
                                    : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
                                }`}
                        >
                            {icon}
                            {label}
                        </Link>
                    ))}

                    {/* Items désactivés — à implémenter dans les prochaines versions */}
                    {comingSoonItems.map(({ label, icon }) => (
                        <div
                            key={label}
                            title="Coming soon"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-base-content/30 cursor-not-allowed select-none"
                        >
                            {icon}
                            <span className="flex-1">{label}</span>
                            <span className="text-xs bg-base-200 text-base-content/30 px-1.5 py-0.5 rounded">soon</span>
                        </div>
                    ))}

                    {/* Arbre de projets */}
                    <div className="pt-3">
                        <button
                            onClick={() => setProjectsOpen(!projectsOpen)}
                            className="flex items-center gap-2 px-3 py-1.5 w-full text-xs font-semibold text-base-content/40 uppercase tracking-wider hover:text-base-content/60 transition-colors"
                        >
                            {projectsOpen
                                ? <ChevronDown className="w-3 h-3" />
                                : <ChevronRight className="w-3 h-3" />
                            }
                            My projects
                        </button>

                        {projectsOpen && (
                            <div className="mt-1 space-y-0.5">
                                {projects.length === 0 ? (
                                    <p className="px-3 py-2 text-xs text-base-content/30 italic">No projects</p>
                                ) : (
                                    projects.map((project) => (
                                        <Link
                                            key={project.id}
                                            href={`/project/${project.id}`}
                                            onClick={onClose}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
                                                ${pathname === `/project/${project.id}`
                                                    ? "bg-primary/10 text-primary font-medium"
                                                    : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
                                                }`}
                                        >
                                            <Folder className="w-3.5 h-3.5 shrink-0 opacity-60" />
                                            <span className="truncate">{project.name}</span>
                                        </Link>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </nav>

                {/* Zone bas : inviter + aide + profil + notifications */}
                <div className="p-4 border-t border-base-300 space-y-3">
                    <div className="flex gap-2">
                        <button
                            title="Coming soon"
                            className="btn btn-outline btn-sm flex-1 gap-1.5 text-xs cursor-not-allowed opacity-50"
                            disabled
                        >
                            <UserPlus className="w-3.5 h-3.5" />
                            Invite
                        </button>
                        <button className="btn btn-ghost btn-sm flex-1 gap-1.5 text-xs">
                            <HelpCircle className="w-3.5 h-3.5" />
                            Help
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <UserButton />
                        <span className="text-sm text-base-content/60 truncate flex-1">
                            {user?.firstName || user?.primaryEmailAddress?.emailAddress || "Profile"}
                        </span>
                        {user?.primaryEmailAddress?.emailAddress && (
                            <PushNotificationToggle userEmail={user.primaryEmailAddress.emailAddress} />
                        )}
                    </div>
                </div>
            </aside>

            {/* Modal création projet */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <div className="bg-base-100 rounded-xl p-6 w-96 shadow-xl">
                        <h3 className="font-bold text-lg mb-1">New Project</h3>
                        <p className="text-sm text-base-content/50 mb-4">Describe your project</p>
                        <input
                            placeholder="Project name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input input-bordered w-full mb-3"
                            autoFocus
                        />
                        <textarea
                            placeholder="Description (optional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="textarea textarea-bordered w-full resize-none mb-4"
                            rows={3}
                        />
                        <div className="flex gap-2 justify-end">
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={handleCreateProject}
                                disabled={!name.trim()}
                            >
                                <Plus className="w-4 h-4" />
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;
