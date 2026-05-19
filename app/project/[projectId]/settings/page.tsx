"use client"

/**
 * Page de configuration d'un projet — /project/[projectId]/settings
 *
 * Regroupe les paramètres avancés : intégration GitHub, futurs paramètres.
 * Accessible uniquement par le PO du projet.
 *
 * Section mémoire : 3.3 — Intégration GitHub + Codacy
 */

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { ArrowLeft, Settings } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import GitHubIntegrationWidget from "@/app/components/GitHubIntegrationWidget";
import Wrapper from "@/app/components/Wrapper";
import { getProjectInfo } from "@/app/actions";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function SettingsPage({ params }: PageProps) {
  const { projectId } = use(params);
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const [userRole, setUserRole] = useState<'PO' | 'MEMBER'>('MEMBER');
  const [projectName, setProjectName] = useState('');
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!projectId || !email) return;
    getProjectInfo(projectId, true)
      .then((project) => {
        if (!project) return;
        setProjectName(project.name ?? '');
        const role = project.users?.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (u: any) => ('email' in u ? u.email : u.user?.email) === email
        )?.role;
        setUserRole(role === 'PO' ? 'PO' : 'MEMBER');
      })
      .finally(() => { setChargement(false); });
  }, [projectId, email]);

  return (
    <Wrapper>
      <div className="max-w-xl mx-auto py-8 px-4">
        {/* En-tête */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/project/${projectId}`}
            className="btn btn-ghost btn-sm btn-circle"
            title="Back to project"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-base-content/60" />
              <h1 className="text-lg font-bold">Settings</h1>
            </div>
            {projectName && (
              <p className="text-xs text-base-content/50">{projectName}</p>
            )}
          </div>
        </div>

        {chargement ? (
          <div className="space-y-3">
            <div className="skeleton h-48 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-4">
            <GitHubIntegrationWidget
              projectId={projectId}
              userRole={userRole}
            />
          </div>
        )}
      </div>
    </Wrapper>
  );
}
