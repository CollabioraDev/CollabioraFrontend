/**
 * Cross-tab synchronization utility
 * Uses BroadcastChannel API (modern) and storage events (fallback)
 */

let broadcastChannel = null;

// Initialize BroadcastChannel if available
if (typeof BroadcastChannel !== "undefined") {
  broadcastChannel = new BroadcastChannel("curalink-sync");
}

/**
 * Broadcast a message to all tabs
 * @param {string} type - Message type (e.g., 'email-verified', 'user-updated')
 * @param {Object} data - Data to broadcast
 */
export function broadcastMessage(type, data = {}) {
  const message = { type, data, timestamp: Date.now() };

  // Use BroadcastChannel if available
  if (broadcastChannel) {
    broadcastChannel.postMessage(message);
  }

  // Also trigger storage event as fallback
  // We'll use a custom key that changes to trigger the event
  const syncKey = `curalink-sync-${type}-${Date.now()}`;
  localStorage.setItem(syncKey, JSON.stringify(message));
  // Remove it immediately to avoid cluttering
  setTimeout(() => {
    localStorage.removeItem(syncKey);
  }, 100);
}

/**
 * Listen for cross-tab messages
 * @param {Function} callback - Callback function that receives (type, data)
 * @returns {Function} Cleanup function to remove listeners
 */
export function listenForMessages(callback) {
  const handlers = [];

  // Listen via BroadcastChannel
  if (broadcastChannel) {
    const handler = (event) => {
      if (event.data && event.data.type) {
        callback(event.data.type, event.data.data);
      }
    };
    broadcastChannel.addEventListener("message", handler);
    handlers.push(() => {
      broadcastChannel.removeEventListener("message", handler);
    });
  }

  // Listen via storage events (fallback)
  const storageHandler = (event) => {
    if (event.key && event.key.startsWith("curalink-sync-")) {
      try {
        const message = JSON.parse(event.newValue);
        if (message && message.type) {
          callback(message.type, message.data);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  };
  window.addEventListener("storage", storageHandler);
  handlers.push(() => {
    window.removeEventListener("storage", storageHandler);
  });

  // Return cleanup function
  return () => {
    handlers.forEach((cleanup) => cleanup());
  };
}

/**
 * Broadcast email verification event
 * @param {Object} userData - Updated user data
 */
export function broadcastEmailVerified(userData) {
  broadcastMessage("email-verified", { user: userData });
}

/**
 * Broadcast user update event
 * @param {Object} userData - Updated user data
 */
export function broadcastUserUpdate(userData) {
  broadcastMessage("user-updated", { user: userData });
}
