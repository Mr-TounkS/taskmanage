"use client"

/**
 * GitHubIntegrationWidget — Configuration du webhook GitHub par projet
 *
 * Permet au PO de lier un dépôt GitHub à son projet TaskManage.
 * Le webhook GitHub envoie les événements pull_request et check_run
 * vers /api/webhooks/github, ce qui déclenche un recalcul automatique du SGR.
 *
 * Section mémoire : 3.3 — Intégration GitHub + Codacy
 */

import { useEffect, useState } from "react";
import { Github, Copy, Check, RefreshCw, Save, Trash2, ExternalLink } from "lucide-react";
import { saveGitHubIntegration, getGitHubIntegration, deleteGitHubIntegration } from "@/app/actions";
import { toast } from "react-toastify";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GitHubIntegrationWidgetProps {
  projectId: string;
  userRole?: 'PO' | 'MEMBER';
}

// ---------------------------------------------------------------------------
// Utilitaire — génération d'un secret HMAC-SHA256 côté client
// ---------------------------------------------------------------------------

function genererSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export default function GitHubIntegrationWidget({
  projectId,
  userRole = 'MEMBER',
}: GitHubIntegrationWidgetProps) {
  const isPO = userRole === 'PO';

  const [repoFullName, setRepoFullName] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [estConnecte, setEstConnecte] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/github?projectId=${projectId}`
    : '';

  // Chargement de la configuration existante
  useEffect(() => {
    if (!projectId) return;
    getGitHubIntegration(projectId)
      .then((integration) => {
        if (integration) {
          setRepoFullName(integration.externalProjectRef);
          setWebhookSecret(integration.webhookSecret);
          setEstConnecte(true);
        } else {
          setWebhookSecret(genererSecret());
        }
      })
      .catch(() => toast.error('Erreur lors du chargement de la configuration GitHub'))
      .finally(() => setChargement(false));
  }, [projectId]);

  const handleSave = async () => {
    if (!isPO) return;
    if (!repoFullName.trim()) {
      toast.error('Le nom du dépôt est requis (ex: vercel/next.js)');
      return;
    }
    setSauvegarde(true);
    try {
      await saveGitHubIntegration(projectId, repoFullName.trim(), webhookSecret);
      setEstConnecte(true);
      toast.success('Intégration GitHub enregistrée !');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSauvegarde(false);
    }
  };

  const handleDelete = async () => {
    if (!isPO) return;
    if (!confirm('Supprimer l\'intégration GitHub ? Le webhook cessera de fonctionner.')) return;
    setSuppression(true);
    try {
      await deleteGitHubIntegration(projectId);
      setRepoFullName('');
      setWebhookSecret(genererSecret());
      setEstConnecte(false);
      toast.success('Intégration GitHub supprimée');
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setSuppression(false);
    }
  };

  const handleRegenererSecret = () => {
    if (!isPO) return;
    setWebhookSecret(genererSecret());
    setEstConnecte(false);
  };

  const copier = async (texte: string, type: 'url' | 'secret') => {
    await navigator.clipboard.writeText(texte);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  if (chargement) {
    return (
      <div className="p-5 border border-base-300 rounded-xl">
        <div className="skeleton h-4 w-32 mb-4" />
        <div className="skeleton h-8 w-full mb-2" />
        <div className="skeleton h-8 w-full" />
      </div>
    );
  }

  return (
    <div className="p-5 border border-base-300 rounded-xl">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Github className="w-4 h-4" />
          <h3 className="font-semibold text-sm">GitHub Webhook</h3>
        </div>
        <span className={`badge badge-sm ${estConnecte ? 'badge-success' : 'badge-ghost'}`}>
          {estConnecte ? 'Connected' : 'Not configured'}
        </span>
      </div>

      <p className="text-xs text-base-content/60 mb-4">
        Connects your GitHub repository to automatically update the SGR score
        on each pull request and Codacy analysis.
      </p>

      {/* Champ dépôt */}
      <div className="form-control mb-3">
        <label className="label py-1">
          <span className="label-text text-xs">GitHub repository</span>
        </label>
        <input
          type="text"
          placeholder="owner/repo  (ex: vercel/next.js)"
          value={repoFullName}
          onChange={(e) => setRepoFullName(e.target.value)}
          disabled={!isPO}
          className="input input-sm input-bordered w-full font-mono text-xs"
        />
      </div>

      {/* URL webhook — lecture seule + copier */}
      <div className="form-control mb-3">
        <label className="label py-1">
          <span className="label-text text-xs">Webhook URL (to copy in GitHub)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={webhookUrl}
            readOnly
            className="input input-sm input-bordered w-full font-mono text-xs text-base-content/60"
          />
          <button
            onClick={() => copier(webhookUrl, 'url')}
            className="btn btn-sm btn-ghost"
            title="Copy URL"
          >
            {copiedUrl ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Secret webhook */}
      <div className="form-control mb-4">
        <label className="label py-1">
          <span className="label-text text-xs">Webhook secret</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={webhookSecret}
            readOnly
            className="input input-sm input-bordered w-full font-mono text-xs text-base-content/60"
          />
          <button
            onClick={() => copier(webhookSecret, 'secret')}
            className="btn btn-sm btn-ghost"
            title="Copy secret"
          >
            {copiedSecret ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
          </button>
          {isPO && (
            <button
              onClick={handleRegenererSecret}
              className="btn btn-sm btn-ghost"
              title="Regenerate secret"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-base-200 rounded-lg p-3 mb-4 text-xs text-base-content/70 space-y-1">
        <p className="font-semibold text-base-content/80 mb-1">GitHub configuration steps :</p>
        <p>1. Go to your repo → Settings → Webhooks → Add webhook</p>
        <p>2. Paste the URL above in <span className="font-mono">Payload URL</span></p>
        <p>3. Content type : <span className="font-mono">application/json</span></p>
        <p>4. Paste the secret above in <span className="font-mono">Secret</span></p>
        <p>5. Select events : <span className="font-mono">Pull requests</span> + <span className="font-mono">Check runs</span></p>
        <a
          href={repoFullName ? `https://github.com/${repoFullName}/settings/hooks/new` : 'https://github.com'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-primary mt-2 hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          Open GitHub webhook settings
        </a>
      </div>

      {/* Actions */}
      {isPO && (
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={sauvegarde || !repoFullName.trim()}
            className="btn btn-primary btn-sm flex-1"
          >
            {sauvegarde
              ? <span className="loading loading-spinner loading-xs" />
              : <Save className="w-3 h-3" />
            }
            Save
          </button>
          {estConnecte && (
            <button
              onClick={handleDelete}
              disabled={suppression}
              className="btn btn-error btn-outline btn-sm"
              title="Delete integration"
            >
              {suppression
                ? <span className="loading loading-spinner loading-xs" />
                : <Trash2 className="w-3 h-3" />
              }
            </button>
          )}
        </div>
      )}

      {!isPO && (
        <p className="text-xs text-base-content/40 text-center">
          Only the project owner (PO) can configure this integration.
        </p>
      )}
    </div>
  );
}
