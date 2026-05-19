// Offline fallback page — displayed by the Service Worker when
// the requested page is not available in cache and the user is offline.
// Addresses sub-question SQ2: offline availability for distributed Agile teams.

import type { Metadata } from "next";
import { WifiOff, CheckCircle, XCircle } from "lucide-react";
import ReloadButton from "../components/ReloadButton";
import BackButton from "../components/BackButton";

export const metadata: Metadata = {
  title: "Offline — Task Manage",
  description: "You are currently offline.",
};

const AVAILABLE_OFFLINE = [
  "Browse your recently visited projects",
  "View tasks in your Kanban boards",
  "Read your task details",
  "Check your last calculated SGR score",
];

const REQUIRES_CONNECTION = [
  "Create or edit tasks",
  "Recalculate the SGR score",
  "Invite collaborators",
  "Sync GitHub / SonarQube data",
];

export default function OfflinePage() {
  return (
    <div className="relative min-h-screen bg-base-200 flex items-center justify-center p-4">
      <BackButton />
      <div className="max-w-lg w-full">

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body items-center text-center gap-4">

            <div className="p-4 bg-warning/10 rounded-full">
              <WifiOff size={48} className="text-warning" />
            </div>

            <h1 className="card-title text-2xl">You are offline</h1>
            <p className="text-base-content/70">
              Task Manage works partially without a connection thanks to the
              Service Worker cache. The data shown reflects your last online
              session.
            </p>

            <ReloadButton />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mt-4 sm:grid-cols-2">

          <div className="card bg-success/10 shadow">
            <div className="card-body gap-3">
              <h2 className="font-semibold text-success flex items-center gap-2">
                <CheckCircle size={18} />
                Available offline
              </h2>
              <ul className="space-y-2">
                {AVAILABLE_OFFLINE.map((item) => (
                  <li key={item} className="text-sm text-base-content/80 flex items-start gap-2">
                    <span className="text-success mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card bg-error/10 shadow">
            <div className="card-body gap-3">
              <h2 className="font-semibold text-error flex items-center gap-2">
                <XCircle size={18} />
                Requires a connection
              </h2>
              <ul className="space-y-2">
                {REQUIRES_CONNECTION.map((item) => (
                  <li key={item} className="text-sm text-base-content/80 flex items-start gap-2">
                    <span className="text-error mt-0.5">✗</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-base-content/40 mt-4">
          The page will reload automatically once the connection is restored.
        </p>

      </div>
    </div>
  );
}
