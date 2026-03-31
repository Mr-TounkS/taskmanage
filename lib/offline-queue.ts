/**
 * offline-queue.ts
 * Gestion de la file d'attente des actions hors ligne via IndexedDB.
 * Permet de stocker les actions effectuées sans connexion et de les rejouer
 * dès que la connexion est rétablie (via Background Sync API).
 *
 * Répond à la sous-question SQ2 : disponibilité hors ligne des équipes Agile.
 */

// Nom et version de la base IndexedDB
const DB_NAME = "taskmanage-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending-actions";

/** Structure d'une action en attente de synchronisation */
export interface OfflineAction {
  id?: number;         // Auto-généré par IndexedDB
  type: string;        // Ex: "UPDATE_TASK_STATUS", "CREATE_TASK"
  payload: unknown;    // Données de l'action (sérialisables)
  url: string;         // Endpoint API cible
  method: string;      // Méthode HTTP (POST, PUT, PATCH, DELETE)
  timestamp: number;   // Date de mise en queue (ms)
  retries: number;     // Nombre de tentatives effectuées
}

/** Opens (or creates) the IndexedDB database */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Crée le store avec auto-incrément sur la clé "id"
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("type", "type", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Adds a pending action to the IndexedDB queue.
 * Called when an action fails due to network unavailability.
 */
export async function enqueueAction(
  action: Omit<OfflineAction, "id" | "timestamp" | "retries">
): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const entry: Omit<OfflineAction, "id"> = {
      ...action,
      timestamp: Date.now(),
      retries: 0,
    };
    const request = store.add(entry);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Returns all pending actions from the queue, sorted by timestamp.
 */
export async function getPendingActions(): Promise<OfflineAction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("timestamp");
    const request = index.getAll();
    request.onsuccess = () => resolve(request.result as OfflineAction[]);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Returns the number of pending actions (badge / indicator).
 */
export async function getPendingCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Removes a successfully replayed action from the queue.
 */
export async function removeAction(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Increments the retry counter for a failed action.
 */
export async function incrementRetries(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const action = getReq.result as OfflineAction;
      if (action) {
        action.retries += 1;
        const putReq = store.put(action);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } else {
        resolve();
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Clears all pending actions (after full sync or on logout).
 */
export async function clearQueue(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
