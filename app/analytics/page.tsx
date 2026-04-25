import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BarChart2 } from "lucide-react";
import dynamic from "next/dynamic";
import Wrapper from "@/app/components/Wrapper";
import { getAnalyticsData } from "@/app/actions";
import { AnalyticsData } from "@/app/type";

// Chargement différé des composants Recharts — évite le SSR des canvas
const TaskStatusChart       = dynamic(() => import("@/app/components/analytics/TaskStatusChart"),       { ssr: false, loading: () => <ChartSkeleton /> });
const TaskPriorityChart     = dynamic(() => import("@/app/components/analytics/TaskPriorityChart"),     { ssr: false, loading: () => <ChartSkeleton /> });
const VelocityChart         = dynamic(() => import("@/app/components/analytics/VelocityChart"),         { ssr: false, loading: () => <ChartSkeleton /> });
const CompletionRateChart   = dynamic(() => import("@/app/components/analytics/CompletionRateChart"),   { ssr: false, loading: () => <ChartSkeleton /> });
const SGRMultiChart         = dynamic(() => import("@/app/components/analytics/SGRMultiChart"),         { ssr: false, loading: () => <ChartSkeleton /> });
const SGRLevelDistribution  = dynamic(() => import("@/app/components/analytics/SGRLevelDistribution"),  { ssr: false, loading: () => <ChartSkeleton /> });
const SGRScoreTable         = dynamic(() => import("@/app/components/analytics/SGRScoreTable"),         { ssr: false });

/** Page Analytics — Vue globale des tâches + évolution SGR */
export default async function AnalyticsPage() {
  const user = await currentUser();

  if (!user?.primaryEmailAddress?.emailAddress) {
    redirect("/sign-in");
  }

  const email = user.primaryEmailAddress.emailAddress;
  const data: AnalyticsData = await getAnalyticsData(email);

  const totalTasks      = data.tasksByStatus.reduce((s, d) => s + d.count, 0);
  const doneTasks       = data.tasksByStatus.find(d => d.status === "Done")?.count ?? 0;
  const totalProjects   = data.completionByProject.length;
  const avgSGR          = data.latestSGRByProject.length > 0
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

        {/* ── KPIs résumés ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPICard label="Total tasks"    value={totalTasks}                        color="text-primary"   />
          <KPICard label="Completed"      value={doneTasks}                          color="text-success"   />
          <KPICard label="Projects"       value={totalProjects}                      color="text-secondary" />
          <KPICard label="Avg SGR"        value={avgSGR !== null ? `${avgSGR}/100` : "—"} color="text-warning" />
        </div>

        {/* ── Bloc 1 : Vue globale des tâches ── */}
        <Section title="Tasks Overview" subtitle="Distribution and completion across all projects">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <ChartCard title="By status">
              <TaskStatusChart data={data.tasksByStatus} />
            </ChartCard>

            <ChartCard title="By priority">
              <TaskPriorityChart data={data.tasksByPriority} />
            </ChartCard>

            <ChartCard title="Velocity — tasks completed per week (last 12 weeks)">
              <VelocityChart data={data.velocityByWeek} />
            </ChartCard>

            <ChartCard title="Completion rate by project">
              <CompletionRateChart data={data.completionByProject} />
            </ChartCard>

          </div>
        </Section>

        {/* ── Bloc 2 : SGR ── */}
        <Section title="Risk Score (SGR)" subtitle="Evolution and distribution of the Global Risk Score">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <ChartCard title="SGR evolution — all projects" className="md:col-span-2">
              <SGRMultiChart data={data.sgrByProject} />
            </ChartCard>

            <ChartCard title="Risk level distribution">
              <SGRLevelDistribution data={data.sgrLevelDistribution} />
            </ChartCard>

            <ChartCard title="Latest SGR score by project">
              <SGRScoreTable data={data.latestSGRByProject} />
            </ChartCard>

          </div>
        </Section>

      </div>
    </Wrapper>
  );
}

// ── Sous-composants ────────────────────────────────────────────────────────

function KPICard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-base-100 border border-base-300 rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-base-content/50 mt-0.5">{label}</p>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-base-content/50">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-base-100 border border-base-300 rounded-xl p-4 space-y-2 ${className}`}>
      <p className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">{title}</p>
      {children}
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-[220px] w-full bg-base-200 animate-pulse rounded-lg" />;
}
