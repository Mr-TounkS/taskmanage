"use client"

import dynamic from "next/dynamic";
import { AnalyticsData } from "@/app/type";

// ssr: false autorisé uniquement dans un Client Component
const TaskStatusChart      = dynamic(() => import("@/app/components/analytics/TaskStatusChart"),      { ssr: false, loading: () => <ChartSkeleton /> });
const TaskPriorityChart    = dynamic(() => import("@/app/components/analytics/TaskPriorityChart"),    { ssr: false, loading: () => <ChartSkeleton /> });
const ThroughputChart      = dynamic(() => import("@/app/components/analytics/ThroughputChart"),      { ssr: false, loading: () => <ChartSkeleton /> });
const CompletionRateChart  = dynamic(() => import("@/app/components/analytics/CompletionRateChart"),  { ssr: false, loading: () => <ChartSkeleton /> });
const CycleTimeChart       = dynamic(() => import("@/app/components/analytics/CycleTimeChart"),       { ssr: false, loading: () => <ChartSkeleton /> });
const SGRLevelDistribution = dynamic(() => import("@/app/components/analytics/SGRLevelDistribution"), { ssr: false, loading: () => <ChartSkeleton /> });
const SGRScoreTable        = dynamic(() => import("@/app/components/analytics/SGRScoreTable"),        { ssr: false });

interface AnalyticsClientProps {
  data: AnalyticsData;
}

/** Client Component — contient les dynamic imports Recharts (ssr: false interdit en Server Component) */
export default function AnalyticsClient({ data }: AnalyticsClientProps) {
  return (
    <div className="space-y-8">

      {/* ── Bloc 1 : Vue globale des tâches ── */}
      <Section title="Tasks Overview" subtitle="Distribution and completion across all projects">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard title="By status">
            <TaskStatusChart data={data.tasksByStatus} />
          </ChartCard>
          <ChartCard title="By priority">
            <TaskPriorityChart data={data.tasksByPriority} />
          </ChartCard>
          <ChartCard title="Débit">
            <ThroughputChart data={data.velocityByWeek} stats={data.throughputStats} />
          </ChartCard>
          <ChartCard title="Completion rate by project">
            <CompletionRateChart data={data.completionByProject} />
          </ChartCard>
        </div>
      </Section>

      {/* ── Bloc 2 : SGR ── */}
      <Section title="Risk Score (SGR)" subtitle="Evolution and distribution of the Global Risk Score">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard title="Niveau de service attendu" className="md:col-span-2">
            <CycleTimeChart points={data.cycleTimePoints} sleDays={data.sleDays} sle85Change={data.sle85Change} />
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
