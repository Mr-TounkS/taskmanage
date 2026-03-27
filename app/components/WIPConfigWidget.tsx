"use client"

/**
 * WIPConfigWidget — Interface de configuration des limites WIP par colonne Kanban
 *
 * Permet au chef de projet de définir le nombre maximum de tâches
 * autorisées dans chaque colonne (To Do, In Progress, Done).
 * Une valeur de 0 désactive la limite pour la colonne concernée.
 *
 * Fondement : Loi de Little (CT = WIP / Throughput) — alimente R_WIP dans le SGR.
 * Section mémoire : 3.2 — Kanban + fonctionnalités PWA
 */

import { useEffect, useState } from "react";
import { Settings, Save, AlertTriangle } from "lucide-react";
import { getWIPConfigs, upsertWIPConfigs } from "@/app/actions";
import { toast } from "react-toastify";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WIPConfigWidgetProps {
  projectId: string;
  /** Nombre de tâches actuellement dans chaque colonne */
  taskCounts: { todo: number; inProgress: number; done: number };
  /** Callback appelé après sauvegarde — pour déclencher le recalcul SGR */
  onSaved?: () => void;
}

// Colonnes Kanban avec leur clé dans taskCounts
const COLONNES = [
  { key: 'To Do',       label: 'À faire',    countKey: 'todo' as const },
  { key: 'In Progress', label: 'En cours',   countKey: 'inProgress' as const },
  { key: 'Done',        label: 'Terminé',    countKey: 'done' as const },
];

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export default function WIPConfigWidget({
  projectId,
  taskCounts,
  onSaved,
}: WIPConfigWidgetProps) {
  // Limites WIP saisies par l'utilisateur (0 = pas de limite)
  const [limites, setLimites] = useState<Record<string, number>>({
    'To Do': 0,
    'In Progress': 0,
    'Done': 0,
  });
  const [ouvert, setOuvert] = useState(false);
  const [sauvegarde, setSauvegarde] = useState(false);

  // Chargement des configs existantes au montage
  useEffect(() => {
    if (!projectId) return;
    getWIPConfigs(projectId).then((configs) => {
      if (configs.length > 0) {
        const map: Record<string, number> = { 'To Do': 0, 'In Progress': 0, 'Done': 0 };
        configs.forEach((c) => { map[c.column] = c.wipLimit; });
        setLimites(map);
      }
    });
  }, [projectId]);

  const handleSave = async () => {
    setSauvegarde(true);
    try {
      const configs = COLONNES.map((col) => ({
        column: col.key,
        wipLimit: limites[col.key] ?? 0,
      }));
      await upsertWIPConfigs(projectId, configs);
      toast.success('Limites WIP sauvegardées !');
      setOuvert(false);
      onSaved?.();
    } catch {
      toast.error('Erreur lors de la sauvegarde des limites WIP');
    } finally {
      setSauvegarde(false);
    }
  };

  // Détermine si une colonne dépasse sa limite
  const depasse = (col: typeof COLONNES[number]) => {
    const limite = limites[col.key];
    const actuel = taskCounts[col.countKey];
    return limite > 0 && actuel > limite;
  };

  return (
    <div className="p-5 border border-base-300 rounded-xl mb-6">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Limites WIP</h3>
        <button
          onClick={() => setOuvert((o) => !o)}
          className="btn btn-ghost btn-xs"
          title="Configurer les limites WIP"
        >
          <Settings className="w-3 h-3" />
        </button>
      </div>

      {/* Résumé — toujours visible */}
      <div className="space-y-2">
        {COLONNES.map((col) => {
          const limite = limites[col.key];
          const actuel = taskCounts[col.countKey];
          const enDepassement = depasse(col);

          return (
            <div key={col.key} className="flex items-center justify-between">
              <span className="text-xs text-base-content/70 w-20 shrink-0">
                {col.label}
              </span>
              <div className="flex items-center gap-1">
                {/* Tâches actuelles */}
                <span className={`text-xs font-bold ${enDepassement ? 'text-error' : 'text-base-content'}`}>
                  {actuel}
                </span>
                <span className="text-xs text-base-content/40">/</span>
                {/* Limite configurée */}
                <span className="text-xs text-base-content/50">
                  {limite === 0 ? '∞' : limite}
                </span>
                {enDepassement && (
                  <AlertTriangle className="w-3 h-3 text-error ml-1" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Formulaire de configuration — dépliable */}
      {ouvert && (
        <div className="mt-4 pt-4 border-t border-base-300">
          <p className="text-xs text-base-content/50 mb-3">
            Définissez le nombre max de tâches par colonne.<br />
            <span className="font-medium">0 = pas de limite.</span>
          </p>

          <div className="space-y-3">
            {COLONNES.map((col) => (
              <div key={col.key} className="flex items-center gap-3">
                <label className="text-xs w-20 shrink-0 text-base-content/70">
                  {col.label}
                </label>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={limites[col.key]}
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value) || 0);
                    setLimites((prev) => ({ ...prev, [col.key]: val }));
                  }}
                  className="input input-sm input-bordered w-20 text-center"
                />
                {/* Badge dépassement en temps réel */}
                {depasse(col) && (
                  <span className="badge badge-error badge-xs">
                    +{taskCounts[col.countKey] - limites[col.key]}
                  </span>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={sauvegarde}
            className="btn btn-primary btn-sm w-full mt-4"
          >
            {sauvegarde ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            Sauvegarder
          </button>
        </div>
      )}
    </div>
  );
}
