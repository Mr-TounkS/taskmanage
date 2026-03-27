"use client"
import Image from "next/image";
import Wrapper from "./components/Wrapper";
import { useEffect, useState } from "react";
import { FolderGit2 } from "lucide-react";
import { createProject, deleteProjectById, getProjectsCreatedByUser } from "./actions";
import { useUser } from "@clerk/nextjs";
import { toast } from "react-toastify";
import { Project } from "./type";
import ProjectComponent from "./components/ProjectComponent";
import EmptyState from "./components/EmptyState";

export default function Home() {

  const { user } = useUser()
  const email = user?.primaryEmailAddress?.emailAddress as string
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProjects = async (email: string) => {
    try {
      const myproject = await getProjectsCreatedByUser(email)
      setProjects(myproject)
    } catch (error) {
      console.error('Erreur lors du chargement du projets:', error);
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (email) {
      fetchProjects(email)
    }
  }, [email])

  const deleteProject = async (projectId: string) => {
    try {
        await deleteProjectById(projectId)
        fetchProjects(email)
        toast.success("Projet supprimé !")
    } catch (error) {
      throw new Error("Error deleting project: " + error);
    }
  }

  const handleSubmit = async () => {
    try {
      const modal = document.getElementById('my_modal_3') as HTMLDialogElement
      const project = await createProject(name, description, email)
      if (modal) {
        modal.close()
      }

      setName(""),
      setDescription("")
      fetchProjects(email)
      toast.success("Projet cree")

    } catch (error) {
      console.error('Error creating project:', error);
    }
  }
  return (
    <Wrapper>
      <div>
        {/* You can open the modal using document.getElementById('ID').showModal() method */}
        <button className="btn btn-primary mb-6" onClick={() => (document.getElementById('my_modal_3') as HTMLDialogElement).showModal()}>Nouveau projet <FolderGit2 /></button>
        <dialog id="my_modal_3" className="modal">
          <div className="modal-box">
            <form method="dialog">
              {/* if there is a button in form, it will close the modal */}
              <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
            </form>
            <h3 className="font-bold text-lg">Nouveau Projet</h3>
            <p className="py-4">Decrivez votre projet simplement grace a la description</p>
            <div>
              <input
                placeholder="Nom du projet"
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
                className="mb-2 textarea textarea-bordered border border-base-300 w-full resize-none textarea-md placeholder::text-sm "
              ></textarea>
              <button className="btn btn-primary" onClick={handleSubmit}>
                Nouveau projet <FolderGit2 />
              </button>
            </div>
          </div>
        </dialog>
        <div className="w-full">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          ) : projects.length > 0 ? (
            <ul className="w-full grid md:grid-cols-3 gap-6">
              {projects.map((project) => (
                <li key={project.id}>
                  <ProjectComponent project={project} admin={1} style={true} onDelete={deleteProject}></ProjectComponent>
                </li>
              ))}
            </ul>
          ) : (
            <div>
              <EmptyState
              imageSrc="/empty-project.png"
              imageAlt="Picture of an empty project"
              message="Aucun projet cree"
              />
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  );
}
