"use client"

import { useState, useMemo } from 'react';
import { LayoutGrid, Table2 } from 'lucide-react';
import Image from 'next/image';
import { TeamMemberStats } from '../type';
import MemberCard from './MemberCard';

interface TeamsClientProps {
  members: TeamMemberStats[];
}

type ViewMode = 'cards' | 'table';
type RoleFilter = 'all' | 'PO' | 'MEMBER';
type StatusFilter = 'all' | 'overdue' | 'noTasks' | 'highLoad';

/** Composant client gérant le toggle de vue, les filtres et l'affichage des membres */
export default function TeamsClient({ members }: TeamsClientProps) {
  const [view, setView] = useState<ViewMode>('cards');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<RoleFilter>('all');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');

  // Liste dédupliquée des projets pour le dropdown
  const projects = useMemo(() => {
    const seen = new Map<string, string>();
    members.forEach(m => seen.set(m.projectId, m.projectName));
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [members]);

  // Application des filtres
  const filtered = useMemo(() => {
    return members.filter(m => {
      if (filterProject !== 'all' && m.projectId !== filterProject) return false;
      if (filterRole !== 'all' && m.role !== filterRole) return false;
      if (filterStatus === 'overdue' && m.overdueTasks === 0) return false;
      if (filterStatus === 'noTasks' && m.totalTasks > 0) return false;
      if (filterStatus === 'highLoad' && m.inProgressTasks < 3) return false;
      return true;
    });
  }, [members, filterProject, filterRole, filterStatus]);

  return (
    <div className="space-y-4">
      {/* Barre de contrôles : filtres + toggle */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filtre par projet */}
        <select
          className="select select-bordered select-sm"
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
        >
          <option value="all">All projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Filtre par rôle */}
        <div className="flex gap-1">
          {(['all', 'PO', 'MEMBER'] as RoleFilter[]).map(r => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={`btn btn-xs ${filterRole === r ? 'btn-primary' : 'btn-ghost'}`}
            >
              {r === 'all' ? 'All roles' : r === 'PO' ? 'PO' : 'Member'}
            </button>
          ))}
        </div>

        {/* Filtres statuts */}
        <div className="flex gap-1">
          {([
            { key: 'all', label: 'All' },
            { key: 'overdue', label: '⚠ Overdue' },
            { key: 'noTasks', label: 'No tasks' },
            { key: 'highLoad', label: '⚡ High load' },
          ] as { key: StatusFilter; label: string }[]).map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`btn btn-xs ${filterStatus === f.key ? 'btn-secondary' : 'btn-ghost'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Séparateur flexible */}
        <div className="flex-1" />

        {/* Toggle vue cartes / tableau */}
        <div className="join border border-base-300 rounded-lg overflow-hidden">
          <button
            onClick={() => setView('cards')}
            className={`join-item btn btn-sm gap-1.5 ${view === 'cards' ? 'btn-primary' : 'btn-ghost'}`}
            title="Vue cartes"
          >
            <LayoutGrid className="w-4 h-4" />
            Cards
          </button>
          <button
            onClick={() => setView('table')}
            className={`join-item btn btn-sm gap-1.5 ${view === 'table' ? 'btn-primary' : 'btn-ghost'}`}
            title="Vue tableau"
          >
            <Table2 className="w-4 h-4" />
            Table
          </button>
        </div>
      </div>

      {/* Compteur de résultats */}
      <p className="text-sm text-base-content/50">
        {filtered.length} member{filtered.length !== 1 ? 's' : ''} found
      </p>

      {/* Aucun résultat */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-base-content/40">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-medium">No members match these filters</p>
        </div>
      )}

      {/* Vue cartes */}
      {view === 'cards' && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(m => (
            <MemberCard key={`${m.userId}-${m.projectId}`} member={m} />
          ))}
        </div>
      )}

      {/* Vue tableau */}
      {view === 'table' && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-base-300">
          <table className="table table-sm w-full">
            <thead className="bg-base-200 text-base-content/60 text-xs uppercase tracking-wider">
              <tr>
                <th>Member</th>
                <th>Project</th>
                <th>Role</th>
                <th>Total</th>
                <th>Done</th>
                <th>In Progress</th>
                <th>Overdue</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const initials = (m.name ?? m.email)
                  .split(' ')
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <tr key={`${m.userId}-${m.projectId}`} className="hover:bg-base-50 border-t border-base-200">
                    {/* Colonne membre */}
                    <td>
                      <div className="flex items-center gap-2">
                        {m.imageUrl ? (
                          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                            <Image
                              src={m.imageUrl}
                              alt={m.name ?? m.email}
                              width={32}
                              height={32}
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">{initials}</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{m.name ?? '—'}</p>
                          <p className="text-xs text-base-content/40 truncate">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm text-base-content/70 truncate max-w-[140px]">{m.projectName}</td>
                    <td>
                      <span className={`badge badge-sm ${m.role === 'PO' ? 'badge-primary' : 'badge-ghost'}`}>
                        {m.role === 'PO' ? 'PO' : 'Member'}
                      </span>
                    </td>
                    <td className="text-sm font-medium">{m.totalTasks}</td>
                    <td className="text-sm text-success font-medium">{m.completedTasks}</td>
                    <td className="text-sm">{m.inProgressTasks}</td>
                    <td>
                      {m.overdueTasks > 0 ? (
                        <span className="badge badge-error badge-sm">{m.overdueTasks}</span>
                      ) : (
                        <span className="text-sm text-base-content/30">0</span>
                      )}
                    </td>
                    {/* Barre de progression */}
                    <td>
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <progress
                          className="progress progress-primary flex-1 h-1.5"
                          value={m.progressPercentage}
                          max={100}
                        />
                        <span className="text-xs text-base-content/50 shrink-0">{m.progressPercentage}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
