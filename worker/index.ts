/**
 * worker/index.ts — Code Service Worker personnalisé (Background Sync)
 *
 * Ce fichier est fusionné par @ducanh2912/next-pwa dans le SW généré.
 * Il ajoute la gestion du Background Sync pour rejouer les actions
 * effectuées hors ligne et stockées dans IndexedDB.
 *
 * Architecture : ce code s'exécute dans le contexte Service Worker (pas React).
 * Il accède directement à IndexedDB sans passer par les hooks React.
 */

// ─── Types (dupliqués ici car le SW n'importe pas depuis lib/) ───────────────

interface OfflineAction {
  id: number;
  type: string;
  payload: unknown;
  url: string;
  method: string;
  timestamp: number;
  retries: number;
}

// ─── Constantes IndexedDB ────────────────────────────────────────────────────

const DB_NAME = "taskmanage-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending-actions";
const MAX_RETRIES = 3;

// ─── Helpers IndexedDB (contexte SW) ────────────────────────────────────────

/** Opens the IndexedDB database in Service Worker context */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = self.indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Returns all pending actions from IndexedDB */
async function getPendingActions(): Promise<OfflineAction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as OfflineAction[]);
    req.onerror = () => reject(req.error);
  });
}

/** Removes a successfully replayed action */
async function removeAction(db: IDBDatabase, id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Increments the retry counter on a failed action */
async function incrementRetries(db: IDBDatabase, action: OfflineAction): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const updated: OfflineAction = { ...action, retries: action.retries + 1 };
    const req = store.put(updated);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── Logique de synchronisation ──────────────────────────────────────────────

/**
 * Rejoue toutes les actions en attente dans IndexedDB.
 * Appelée lors de l'événement "sync" déclenché par le navigateur
 * dès que la connexion est rétablie.
 */
async function replayOfflineActions(): Promise<void> {
  const actions = await getPendingActions();

  if (actions.length === 0) return;

  const db = await openDB();

  for (const action of actions) {
    // Ignore les actions ayant dépassé le nombre max de tentatives
    if (action.retries >= MAX_RETRIES) {
      await removeAction(db, action.id);
      console.warn(`[SW] Action ${action.type} supprimée après ${MAX_RETRIES} échecs.`);
      continue;
    }

    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action.payload),
      });

      if (response.ok) {
        await removeAction(db, action.id);
        console.log(`[SW] Action synchronisée : ${action.type} (id=${action.id})`);
      } else {
        await incrementRetries(db, action);
        console.warn(`[SW] Échec action ${action.type} — statut ${response.status}`);
      }
    } catch {
      // Réseau encore indisponible — on incrémente et on réessaiera
      await incrementRetries(db, action);
    }
  }
}

// ─── Enregistrement de l'événement sync ──────────────────────────────────────

self.addEventListener("sync", (event: Event) => {
  const syncEvent = event as SyncEvent;
  if (syncEvent.tag === "offline-actions") {
    // waitUntil garantit que le SW reste actif jusqu'à la fin de la sync
    syncEvent.waitUntil(replayOfflineActions());
  }
});

// ─── Fallback : sync au chargement de page (iOS Safari sans Background Sync) ─
// ─── + Gestion du skipWaiting conditionnel (prompt utilisateur) ──────────────

self.addEventListener("message", (event: MessageEvent) => {
  const data = event.data as { type?: string } | undefined;

  if (data?.type === "REPLAY_OFFLINE_ACTIONS") {
    // Rejoue les actions offline manuellement (navigateurs sans Background Sync)
    (event as MessageEvent & { waitUntil: (p: Promise<unknown>) => void })
      .waitUntil?.(replayOfflineActions());
  }

  if (data?.type === "SKIP_WAITING") {
    // L'utilisateur a accepté la mise à jour via le prompt SWUpdatePrompt.
    // On active le nouveau SW maintenant que tous les onglets sont prêts.
    // Cast nécessaire : self dans le contexte SW est un ServiceWorkerGlobalScope
    (self as unknown as { skipWaiting: () => void }).skipWaiting();
  }
});

// ─── Gestion des notifications push ─────────────────────────────────────────

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

// Cast du scope SW pour accéder à registration et clients
type SW = {
  registration: { showNotification: (title: string, options: NotificationOptions) => Promise<void> };
  clients: {
    matchAll: (opts: { type: string; includeUncontrolled: boolean }) => Promise<SWClient[]>;
    openWindow: (url: string) => Promise<unknown>;
  };
};

interface SWClient {
  url: string;
  focus?: () => Promise<SWClient>;
}

interface SWPushEvent extends Event {
  data: { json: () => unknown } | null;
  waitUntil: (p: Promise<unknown>) => void;
}

interface SWNotificationEvent extends Event {
  notification: { close: () => void; data: unknown };
  waitUntil: (p: Promise<unknown>) => void;
}

// Reçoit les données envoyées par le serveur via web-push et affiche la notification
self.addEventListener("push", (event: Event) => {
  const pushEvent = event as SWPushEvent;
  const data = pushEvent.data?.json() as PushPayload | undefined;

  if (!data) return;

  const notificationOptions: NotificationOptions = {
    body: data.body,
    icon: data.icon ?? "/android-192x192.png",
    badge: "/android-96x96.png",
    data: { url: data.url ?? "/" },
  };

  pushEvent.waitUntil(
    (self as unknown as SW).registration.showNotification(data.title, notificationOptions)
  );
});

// Ouvre l'URL associée à la notification quand l'utilisateur clique dessus
self.addEventListener("notificationclick", (event: Event) => {
  const notifEvent = event as SWNotificationEvent;
  notifEvent.notification.close();

  const url = (notifEvent.notification.data as { url?: string })?.url ?? "/";
  const sw = self as unknown as SW;

  notifEvent.waitUntil(
    sw.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Réutilise un onglet existant si possible
        for (const client of clientList) {
          if (client.url === url && client.focus) {
            return client.focus();
          }
        }
        return sw.clients.openWindow(url);
      })
  );
});

// ─── Déclarations des types non standard (Background Sync API) ───────────────
// SyncEvent et SyncManager ne sont pas encore dans les types TS officiels (dom lib)
declare interface SyncEvent extends Event {
  readonly tag: string;
  waitUntil(promise: Promise<unknown>): void;
}
