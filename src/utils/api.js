// API utility with JWT token support and privacy-friendly signals
import { getSignalHash, getOrCreateDeviceId } from "./fingerprint.js";

const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Get client signals for rate limiting
 * Uses coarse, privacy-friendly signals (not aggressive fingerprinting)
 */
function getClientSignals() {
  return {
    signalHash: getSignalHash(),
    deviceId: getOrCreateDeviceId(),
  };
}

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  
  // Get privacy-friendly client signals
  const signals = getClientSignals();
  
  const headers = {
    "Content-Type": "application/json",
    ...(token && { "Authorization": `Bearer ${token}` }),
    // Send coarse signal hash (probabilistic, not unique ID)
    ...(signals.signalHash && { "x-client-signal": signals.signalHash }),
    // Send device ID (localStorage-based, user can clear)
    ...(signals.deviceId && { "x-device-id": signals.deviceId }),
    ...options.headers,
  };

  const response = await fetch(`${base}${endpoint}`, {
    ...options,
    headers,
    credentials: "include", // Include cookies for device token
  });

  if (response.status === 401) {
    // Token expired or invalid
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/signin";
    return;
  }

  return response;
}

export default apiFetch;
