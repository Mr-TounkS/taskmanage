import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import Wrapper from "@/app/components/Wrapper";
import TeamsClient from "@/app/components/TeamsClient";
import { getTeamsOverview } from "@/app/actions";

/** Page Teams — affiche tous les membres des projets de l'utilisateur avec leurs statistiques */
export default async function TeamsPage() {
  const user = await currentUser();

  if (!user?.primaryEmailAddress?.emailAddress) {
    redirect("/sign-in");
  }

  const email = user.primaryEmailAddress.emailAddress;
  const members = await getTeamsOverview(email);

  return (
    <Wrapper>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary rounded-xl p-2.5">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Teams</h1>
            <p className="text-sm text-base-content/50">
              Overview of all members across your projects
            </p>
          </div>
        </div>

        {/* Résumé rapide */}
        {members.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Members"
              value={new Set(members.map(m => m.userId)).size}
              color="text-primary"
            />
            <StatCard
              label="Projects"
              value={new Set(members.map(m => m.projectId)).size}
              color="text-secondary"
            />
            <StatCard
              label="Tasks done"
              value={members.reduce((acc, m) => acc + m.completedTasks, 0)}
              color="text-success"
            />
            <StatCard
              label="Overdue"
              value={members.reduce((acc, m) => acc + m.overdueTasks, 0)}
              color="text-error"
            />
          </div>
        )}

        {/* Aucun membre */}
        {members.length === 0 ? (
          <div className="text-center py-24 text-base-content/40">
            <p className="text-5xl mb-4">👥</p>
            <p className="font-semibold text-lg">No team members yet</p>
            <p className="text-sm mt-1">
              Invite collaborators to your projects to see them here.
            </p>
          </div>
        ) : (
          <TeamsClient members={members} />
        )}
      </div>
    </Wrapper>
  );
}

/** Carte de statistique résumée */
function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-base-100 border border-base-300 rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-base-content/50 mt-0.5">{label}</p>
    </div>
  );
}
