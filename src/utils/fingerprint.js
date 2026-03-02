/**
 * Lightweight Browser Signal Collector
 *
 * PRIVACY-FIRST APPROACH:
 * - Uses COARSE signals only (no canvas/audio/font fingerprinting)
 * - Generates a "signal hash" not a unique ID
 * - Meant to be ONE signal among many, not definitive identification
 * - Lower entropy = less invasive, more ethical
 */

// Simple hash function (FNV-1a)
function hashString(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(16);
}

// Storage key for session signal
const SIGNAL_KEY = "cl_sig";

/**
 * Collect COARSE browser signals (privacy-friendly)
 * These are low-entropy signals that don't uniquely identify users
 * but help detect likely same-device usage
 */
function collectCoarseSignals() {
  const signals = [];

  try {
    // Platform info (very coarse)
    signals.push(navigator.platform || "unknown");
    signals.push(navigator.language || "en");

    // Screen info (coarse - rounded to buckets)
    const screenBucket = Math.floor(screen.width / 100) * 100;
    signals.push(`screen:${screenBucket}`);
    signals.push(`dpr:${Math.round(window.devicePixelRatio || 1)}`);

    // Timezone (coarse)
    signals.push(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");

    // Touch capability (binary)
    signals.push(`touch:${navigator.maxTouchPoints > 0}`);

    // Coarse hardware hints
    const cores = navigator.hardwareConcurrency;
    if (cores) {
      // Bucket: 1-2, 3-4, 5-8, 9+
      const coreBucket =
        cores <= 2 ? "low" : cores <= 4 ? "mid" : cores <= 8 ? "high" : "ultra";
      signals.push(`cores:${coreBucket}`);
    }

    // Memory bucket (if available)
    const memory = navigator.deviceMemory;
    if (memory) {
      const memBucket = memory <= 2 ? "low" : memory <= 4 ? "mid" : "high";
      signals.push(`mem:${memBucket}`);
    }

    // Connection type (if available)
    const conn = navigator.connection;
    if (conn?.effectiveType) {
      signals.push(`conn:${conn.effectiveType}`);
    }

    // WebGL renderer (coarse - just vendor, not full string)
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl");
      if (gl) {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "";
          // Just use first word of vendor (e.g., "NVIDIA", "Intel", "AMD")
          signals.push(`gpu:${vendor.split(" ")[0] || "unknown"}`);
        }
      }
    } catch (e) {
      // Ignore WebGL errors
    }
  } catch (e) {
    console.warn("Error collecting browser signals:", e);
  }

  return signals;
}

/**
 * Generate a coarse browser signal hash
 * This is NOT a unique fingerprint - it's a probabilistic signal
 * Many users will share the same hash (that's intentional!)
 *
 * @returns {string} A coarse signal hash
 */
export function generateSignalHash() {
  // Check if we have a stored signal (for session consistency)
  const stored = sessionStorage.getItem(SIGNAL_KEY);
  if (stored) {
    return stored;
  }

  const signals = collectCoarseSignals();
  const signalString = signals.join("|");
  const hash = hashString(signalString);

  // Store in sessionStorage (not localStorage - resets on browser close)
  sessionStorage.setItem(SIGNAL_KEY, hash);

  return hash;
}

/**
 * Get stored signal hash or generate new one
 */
export function getSignalHash() {
  return sessionStorage.getItem(SIGNAL_KEY) || generateSignalHash();
}

/**
 * Generate a persistent device token (stored in localStorage)
 * This is the PRIMARY identifier - user can clear it if they want
 */
export function getOrCreateDeviceId() {
  const DEVICE_KEY = "cl_device";
  let deviceId = localStorage.getItem(DEVICE_KEY);

  if (!deviceId) {
    // Generate a random device ID
    deviceId = `d_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .substring(2, 10)}`;
    localStorage.setItem(DEVICE_KEY, deviceId);
  }

  return deviceId;
}

/**
 * Clear all stored identifiers (for testing or user request)
 */
export function clearAllIdentifiers() {
  sessionStorage.removeItem(SIGNAL_KEY);
  localStorage.removeItem("cl_device");
}

/**
 * Get all client signals to send to server
 * Server will use these for risk scoring
 */
export function getClientSignals() {
  return {
    signalHash: getSignalHash(),
    deviceId: getOrCreateDeviceId(),
    timestamp: Date.now(),
  };
}

export default getClientSignals;
