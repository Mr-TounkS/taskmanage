"use client"

interface SGRScoreTableProps {
  data: { projectName: string; sgr: number; niveau: string }[]
}

const NIVEAU_CONFIG: Record<string, { label: string; badge: string }> = {
  "faible":   { label: "Low",      badge: "badge-success" },
  "modéré":   { label: "Moderate", badge: "badge-warning" },
  "élevé":    { label: "High",     badge: "badge-error"   },
  "critique": { label: "Critical", badge: "badge-error"   },
};

/** Tableau des derniers scores SGR par projet */
export default function SGRScoreTable({ data }: SGRScoreTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-xs text-base-content/40 text-center py-8">
        No SGR data available
      </div>
    );
  }

  // Tri du plus risqué au moins risqué
  const sorted = [...data].sort((a, b) => b.sgr - a.sgr);

  return (
    <div className="overflow-x-auto">
      <table className="table table-sm w-full">
        <thead className="text-xs text-base-content/50 uppercase tracking-wider">
          <tr>
            <th>Project</th>
            <th className="text-right">SGR Score</th>
            <th className="text-center">Level</th>
            <th>Risk bar</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => {
            const config = NIVEAU_CONFIG[item.niveau] ?? { label: item.niveau, badge: "badge-ghost" };
            const barColor =
              item.sgr >= 80 ? "bg-error" :
              item.sgr >= 60 ? "bg-warning" :
              item.sgr >= 30 ? "bg-warning/60" :
              "bg-success";

            return (
              <tr key={item.projectName} className="border-t border-base-200">
                <td className="font-medium text-sm truncate max-w-[140px]">{item.projectName}</td>
                <td className="text-right font-bold text-sm">{item.sgr}<span className="text-base-content/30 font-normal">/100</span></td>
                <td className="text-center">
                  <span className={`badge badge-sm ${config.badge}`}>{config.label}</span>
                </td>
                <td className="w-32">
                  <div className="w-full bg-base-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${barColor}`}
                      style={{ width: `${item.sgr}%` }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
