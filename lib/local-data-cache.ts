/**
 * local-data-cache.ts
 * Cache localStorage pour les données dynamiques (projets, tâches).
 *
 * Stratégie offline-first :
 * 1. Quand online → charger depuis le serveur + sauvegarder en cache
 * 2. Quand offline → lire depuis le cache localStorage
 *
 * Ce cache répond à la SQ2 : permettre la consultation des données
 * lors de coupures réseau, sans modifier l'architecture Clean Architecture.
 */

const CACHE_PREFIX = "tm_cache_";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 heures

interface CacheEntry<T> {
  data: T;
  savedAt: number; // timestamp ms
}

/**
 * Saves data to localStorage under the given key.
 */
export function saveToCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, savedAt: Date.now() };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage peut être indisponible (quota dépassé, mode privé)
    console.warn("[Cache] Impossible de sauvegarder :", key);
  }
}

/**
 * Reads data from localStorage. Returns null if absent or expired.
 */
export function readFromCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    // Invalidation après TTL
    if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Removes a specific cache entry.
 */
export function clearCacheEntry(key: string): void {
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
  } catch {
    // silencieux
  }
}

// ─── Clés de cache métier ────────────────────────────────────────────────────

/** Clé pour la liste des projets d'un utilisateur */
export const cacheKeyProjects = (email: string) => `projects_${email}`;

/** Clé pour les projets associés (collaboration) */
export const cacheKeyAssociated = (email: string) => `associated_${email}`;

/** Clé pour les détails d'un projet (tâches incluses) */
export const cacheKeyProject = (projectId: string) => `project_${projectId}`;
