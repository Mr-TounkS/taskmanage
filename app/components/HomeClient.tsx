"use client"

/**
 * HomeClient.tsx
 * Partie interactive de la page d'accueil — gestion des projets de l'utilisateur.
 *
 * Séparation Server / Client Component :
 *   - page.tsx (Server) → récupère l'email via currentUser() (Clerk SSR)
 *   - HomeClient (Client) → gère l'état, le cache offline, les interactions UI
 *
 * Cette séparation réduit le TBT (Total Blocking Time) en pre-rendant le shell HTML
 * côté serveur et en différant l'hydratation à ce composant uniquement.
 *
 * Section mémoire : 3.2 — Kanban + fonctionnalités PWA (SQ2 : mobilité et offline)
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import { FolderGit2 } from "lucide-react";
import { createProject, deleteProjectById, getProjectsCreatedByUser } from "../actions";
import { toast } from "react-toastify";
import { Project } from "../type";
import ProjectComponent from "./ProjectComponent";
import EmptyState from "./EmptyState";
import { saveToCache, readFromCache, cacheKeyProjects } from "@/lib/local-data-cache";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface HomeClientProps {
  /** Email de l'utilisateur connecté — transmis depuis le Server Component */
  email: string;
}

export default function HomeClient({ email }: HomeClientProps) {
  const isOnline = useOnlineStatus();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  const fetchProjects = async (userEmail: string) => {
    // Mode hors ligne → lecture immédiate depuis le cache localStorage
    if (!navigator.onLine) {
      const cached = readFromCache<Project[]>(cacheKeyProjects(userEmail));
      if (cached) {
        setProjects(cached);
        setFromCache(true);
      }
      setLoading(false);
      return;
    }

    try {
      const myproject = await getProjectsCreatedByUser(userEmail);
      setProjects(myproject);
      setFromCache(false);
      // Sauvegarde en cache pour les prochaines sessions offline
      saveToCache(cacheKeyProjects(userEmail), myproject);
    } catch (error) {
      console.error("Erreur lors du chargement des projets:", error);
      // Fallback cache si la requête échoue malgré une connexion apparente
      const cached = readFromCache<Project[]>(cacheKeyProjects(userEmail));
      if (cached) {
        setProjects(cached);
        setFromCache(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (email && (projects.length === 0 || isOnline)) {
      fetchProjects(email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, isOnline]);

  const deleteProject = async (projectId: string) => {
    try {
      await deleteProjectById(projectId);
      fetchProjects(email);
      toast.success("Project deleted!");
    } catch (error) {
      throw new Error("Error deleting project: " + error);
    }
  };

  const handleSubmit = async () => {
    try {
      const modal = document.getElementById("my_modal_3") as HTMLDialogElement;
      await createProject(name, description, email);
      if (modal) modal.close();
      setName("");
      setDescription("");
      fetchProjects(email);
      toast.success("Project created!");
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  return (
    <div>
      {/* Bouton d'ouverture de la modal de création */}
      <button
        className="btn btn-primary mb-6"
        onClick={() =>
          (document.getElementById("my_modal_3") as HTMLDialogElement).showModal()
        }
      >
        New project <FolderGit2 />
      </button>

      {/* Modal de création de projet */}
      <dialog id="my_modal_3" className="modal">
        <div className="modal-box">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          </form>
          <h3 className="font-bold text-lg">New Project</h3>
          <p className="py-4">Describe your project using the description field</p>
          <div>
            <input
              placeholder="Project name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-base-300 input input-bordered w-full mb-4 placeholder:text-sm"
              required
            />
            <textarea
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="mb-2 textarea textarea-bordered border border-base-300 w-full resize-none textarea-md placeholder::text-sm"
            ></textarea>
            <button className="btn btn-primary" onClick={handleSubmit}>
              New project <FolderGit2 />
            </button>
          </div>
        </div>
      </dialog>

      {/* Indicateur de données en cache (mode offline) */}
      {fromCache && !isOnline && (
        <div className="flex items-center gap-2 text-xs text-base-content/50 mb-4 bg-base-200 rounded-lg px-3 py-2">
          <span>📦</span>
          <span>Offline data — last sync from your previous session</span>
        </div>
      )}

      {/* Liste des projets */}
      <div className="w-full">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        ) : projects.length > 0 ? (
          <ul className="w-full grid md:grid-cols-3 gap-6">
            {projects.map((project) => (
              <li key={project.id}>
                <ProjectComponent
                  project={project}
                  admin={1}
                  style={true}
                  onDelete={deleteProject}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            imageSrc="/empty-project.png"
            imageAlt="Picture of an empty project"
            message={
              isOnline
                ? "No projects created"
                : "No cached data — visit your projects online first"
            }
          />
        )}
      </div>
    </div>
  );
}
