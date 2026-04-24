import { TeamMemberStats } from '../type';
import Image from 'next/image';

interface MemberCardProps {
  member: TeamMemberStats;
}

/** Carte affichant les statistiques d'un membre d'équipe (vue grille) */
export default function MemberCard({ member }: MemberCardProps) {
  const initials = (member.name ?? member.email)
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-shadow">
      <div className="card-body p-4 space-y-3">
        {/* En-tête : avatar + nom + rôle */}
        <div className="flex items-start gap-3">
          <div className="avatar placeholder shrink-0">
            {member.imageUrl ? (
              <div className="w-10 h-10 rounded-full overflow-hidden">
                <Image
                  src={member.imageUrl}
                  alt={member.name ?? member.email}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="bg-primary text-primary-content rounded-full w-10 h-10 flex items-center justify-center">
                <span className="text-sm font-bold">{initials}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{member.name ?? '—'}</p>
            <p className="text-xs text-base-content/50 truncate">{member.email}</p>
          </div>
          <span className={`badge badge-sm shrink-0 ${member.role === 'PO' ? 'badge-primary' : 'badge-ghost'}`}>
            {member.role === 'PO' ? 'PO' : 'Member'}
          </span>
        </div>

        {/* Projet */}
        <p className="text-xs text-base-content/60 truncate">
          <span className="font-medium">Project:</span> {member.projectName}
        </p>

        {/* Barre de progression */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-base-content/60">
            <span>Progress</span>
            <span className="font-medium">{member.progressPercentage}%</span>
          </div>
          <progress
            className="progress progress-primary w-full h-2"
            value={member.progressPercentage}
            max={100}
          />
        </div>

        {/* Statistiques tâches */}
        <div className="grid grid-cols-3 gap-1 text-center">
          <div className="bg-base-200 rounded-lg p-1.5">
            <p className="text-base font-bold">{member.totalTasks}</p>
            <p className="text-xs text-base-content/50 leading-tight">Total</p>
          </div>
          <div className="bg-success/10 rounded-lg p-1.5">
            <p className="text-base font-bold text-success">{member.completedTasks}</p>
            <p className="text-xs text-base-content/50 leading-tight">Done</p>
          </div>
          <div className={`rounded-lg p-1.5 ${member.overdueTasks > 0 ? 'bg-error/10' : 'bg-base-200'}`}>
            <p className={`text-base font-bold ${member.overdueTasks > 0 ? 'text-error' : ''}`}>
              {member.overdueTasks}
            </p>
            <p className="text-xs text-base-content/50 leading-tight">Overdue</p>
          </div>
        </div>

        {/* Badges d'alerte */}
        <div className="flex flex-wrap gap-1">
          {member.overdueTasks > 0 && (
            <span className="badge badge-error badge-sm gap-1">
              ⚠ {member.overdueTasks} overdue
            </span>
          )}
          {member.inProgressTasks >= 3 && (
            <span className="badge badge-warning badge-sm gap-1">
              ⚡ High load
            </span>
          )}
          {member.totalTasks === 0 && (
            <span className="badge badge-ghost badge-sm">No tasks</span>
          )}
        </div>
      </div>
    </div>
  );
}
