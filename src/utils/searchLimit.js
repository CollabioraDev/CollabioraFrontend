/**
 * Local Storage-based Search Limit Tracking
 *
 * Guest limit (6 searches): server tracks by deviceId (x-device-id header).
 * localStorage syncs with backend for fast UI. Lenient: fail open when deviceId missing.
 */

const MAX_FREE_SEARCHES = 6;
const STORAGE_KEY = "collabiora_search_count";
const LAST_SYNC_KEY = "collabiora_search_sync";
const SYNC_INTERVAL = 5000; // Sync with backend every 5 seconds

/**
 * Get search count from local storage
 */
export function getLocalSearchCount() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      return 0;
    }
    const count = parseInt(stored, 10);
    return isNaN(count) ? 0 : Math.max(0, count);
  } catch (error) {
    console.error("Error reading search count from localStorage:", error);
    return 0;
  }
}

/**
 * Set search count in local storage
 */
export function setLocalSearchCount(count) {
  try {
    const normalizedCount = Math.max(0, Math.min(count, MAX_FREE_SEARCHES));
    localStorage.setItem(STORAGE_KEY, normalizedCount.toString());
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
  } catch (error) {
    console.error("Error writing search count to localStorage:", error);
  }
}

/**
 * Increment local search count
 */
export function incrementLocalSearchCount() {
  const current = getLocalSearchCount();
  const newCount = current + 1;
  setLocalSearchCount(newCount);
  return newCount;
}

/**
 * Get remaining searches based on local storage
 */
export function getLocalRemainingSearches() {
  const count = getLocalSearchCount();
  return Math.max(0, MAX_FREE_SEARCHES - count);
}

/**
 * Check if user can search based on local storage
 */
export function canSearchLocally() {
  const count = getLocalSearchCount();
  return count < MAX_FREE_SEARCHES;
}

/**
 * Reset local search count (for testing or when user signs in)
 */
export function resetLocalSearchCount() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LAST_SYNC_KEY);
  } catch (error) {
    console.error("Error resetting search count:", error);
  }
}

/**
 * Sync local storage with backend
 * Returns the backend's search count
 */
export async function syncWithBackend() {
  try {
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const response = await fetch(`${base}/api/search/remaining`, {
      credentials: "include",
    });

    if (response && response.ok) {
      const data = await response.json();
      
      if (data.unlimited) {
        // User is signed in - reset local count
        resetLocalSearchCount();
        return { unlimited: true, count: 0, remaining: null };
      }

      const remaining = data.remaining ?? MAX_FREE_SEARCHES;
      const backendCount = MAX_FREE_SEARCHES - remaining;
      
      // Update local storage to match backend (backend is source of truth)
      setLocalSearchCount(backendCount);
      
      return {
        unlimited: false,
        count: backendCount,
        remaining: remaining,
      };
    }
    
    // If sync fails, return current local count
    const localCount = getLocalSearchCount();
    return {
      unlimited: false,
      count: localCount,
      remaining: MAX_FREE_SEARCHES - localCount,
    };
  } catch (error) {
    console.error("Error syncing with backend:", error);
    // On error, return local count
    const localCount = getLocalSearchCount();
    return {
      unlimited: false,
      count: localCount,
      remaining: MAX_FREE_SEARCHES - localCount,
    };
  }
}

/**
 * Check if we need to sync with backend
 * (Only sync if last sync was more than SYNC_INTERVAL ago)
 */
export function shouldSyncWithBackend() {
  try {
    const lastSync = localStorage.getItem(LAST_SYNC_KEY);
    if (!lastSync) {
      return true; // Never synced, need to sync
    }
    const lastSyncTime = parseInt(lastSync, 10);
    if (isNaN(lastSyncTime)) {
      return true; // Invalid timestamp, need to sync
    }
    const now = Date.now();
    return now - lastSyncTime > SYNC_INTERVAL;
  } catch (error) {
    return true; // On error, sync to be safe
  }
}

export { MAX_FREE_SEARCHES };

