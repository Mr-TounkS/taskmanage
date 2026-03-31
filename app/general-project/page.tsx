"use client"
import { useEffect, useState } from "react";
import Wrapper from "../components/Wrapper";
import { SquarePlus } from "lucide-react";
import { toast } from "react-toastify";
import { addUserToProject, getProjectsAssociatedWithUser } from "../actions";
import { useUser } from "@clerk/nextjs";
import { Project } from "../type";
import ProjectComponent from "../components/ProjectComponent";
import EmptyState from "../components/EmptyState";
import { saveToCache, readFromCache, cacheKeyAssociated } from "@/lib/local-data-cache";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const page = () => {

    const { user } = useUser()
    const email = user?.primaryEmailAddress?.emailAddress as string
    const isOnline = useOnlineStatus()
    const [inviteCode, setInviteCode] = useState('')
    const [associatedProjects, setAssociatedProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [fromCache, setFromCache] = useState(false)

    const fetchProjects = async (email: string) => {
        // Mode hors ligne → lecture depuis le cache localStorage
        if (!navigator.onLine) {
            const cached = readFromCache<Project[]>(cacheKeyAssociated(email))
            if (cached) {
                setAssociatedProjects(cached)
                setFromCache(true)
            }
            setLoading(false)
            return
        }

        try {
            const associated = await getProjectsAssociatedWithUser(email)
            setAssociatedProjects(associated)
            setFromCache(false)
            saveToCache(cacheKeyAssociated(email), associated)
        } catch (error) {
            toast.error("Erreur lors du chargement des projets:")
            // Fallback cache si la requête échoue
            const cached = readFromCache<Project[]>(cacheKeyAssociated(email))
            if (cached) {
                setAssociatedProjects(cached)
                setFromCache(true)
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (email && (associatedProjects.length === 0 || isOnline)) {
            fetchProjects(email)
        }
    }, [email, isOnline])

    const handleSubmit = async () => {
        try {

            if (inviteCode != '') {
                await addUserToProject(email, inviteCode)
                fetchProjects(email)
                setInviteCode("")
                toast.success("Vous pouvez maintenant collaborer sur ce projet.")
            } else {
                toast.error("Il manque le code du projet !")
            }

        } catch (error) {
            toast.error("Code invalide ou vous appartenez deja a ce projet !")
        }
    }

    return (
        <Wrapper>
            {fromCache && !isOnline && (
                <div className="flex items-center gap-2 text-xs text-base-content/50 mb-4 bg-base-200 rounded-lg px-3 py-2">
                    <span>📦</span>
                    <span>Données hors ligne — dernière synchronisation depuis votre session précédente</span>
                </div>
            )}
            <div className="flex">
                <div className="mb-4">
                    <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder="Code d'invitation"
                        className="w-full p-2 input input-bordered"
                    />
                </div>
                <button className="btn btn-primary ml-4" onClick={handleSubmit}>
                    Rejoindre <SquarePlus className="w-4" />
                </button>
            </div>
            <div>
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <span className="loading loading-spinner loading-md"></span>
                </div>
              ) : associatedProjects.length > 0 ? (
                <ul className="w-full grid md:grid-cols-3 gap-6">
                  {associatedProjects.map((project) => (
                    <li key={project.id}>
                      <ProjectComponent project={project} admin={0} style={true} ></ProjectComponent>
                    </li>
                  ))}
                </ul>
              ) : (
                <div>
                  <EmptyState
                  imageSrc="/empty-project.png"
                  imageAlt="Picture of an empty project"
                  message={isOnline ? "Aucun projet associé" : "Aucune donnée en cache — visitez vos projets en ligne d'abord"}
                  />
                </div>
              )}
            </div>
        </Wrapper>
    )
}

export default page