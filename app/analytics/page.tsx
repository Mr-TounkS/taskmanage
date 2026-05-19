import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BarChart2 } from "lucide-react";
import Wrapper from "@/app/components/Wrapper";
import AnalyticsClient from "@/app/components/AnalyticsClient";
import { getAnalyticsData } from "@/app/actions";

/** Page Analytics — Server Component : fetch des données + délégation au Client Component */
export default async function AnalyticsPage() {
  const user = await currentUser();

  if (!user?.primaryEmailAddress?.emailAddress) {
    redirect("/sign-in");
  }

  const email = user.primaryEmailAddress.emailAddress;
  const data  = await getAnalyticsData(email);

  const totalTasks    = data.tasksByStatus.reduce((s, d) => s + d.count, 0);
  const doneTasks     = data.tasksByStatus.find(d => d.status === "Done")?.count ?? 0;
  const totalProjects = data.completionByProject.length;
  const avgSGR        = data.latestSGRByProject.length > 0
    ? Math.round(data.latestSGRByProject.reduce((s, p) => s + p.sgr, 0) / data.latestSGRByProject.length)
    : null;

  return (
    <Wrapper>
      <div className="space-y-8">

        {/* ── En-tête ── */}
        <div className="flex items-center gap-3">
          <div className="bg-secondary/10 text-secondary rounded-xl p-2.5">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-sm text-base-content/50">
              Overview of your tasks and risk scores across all projects
            </p>
          </div>
        </div>

        {/* ── KPIs résumés (rendu serveur — pas de Recharts) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPICard label="Total tasks" value={totalTasks}                              color="text-primary"   />
          <KPICard label="Completed"   value={doneTasks}                               color="text-success"   />
          <KPICard label="Projects"    value={totalProjects}                           color="text-secondary" />
          <KPICard label="Avg SGR"     value={avgSGR !== null ? `${avgSGR}/100` : "—"} color="text-warning"  />
        </div>

        {/* ── Graphiques — délégués au Client Component (ssr: false) ── */}
        <AnalyticsClient data={data} />

      </div>
    </Wrapper>
  );
}

function KPICard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-base-100 border border-base-300 rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-base-content/50 mt-0.5">{label}</p>
    </div>
  );
}
