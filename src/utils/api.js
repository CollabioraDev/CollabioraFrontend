// API utility with JWT token support and privacy-friendly signals
import { getSignalHash, getOrCreateDeviceId } from "./fingerprint.js";

const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
const REFRESH_ENDPOINT = `${base}/api/auth/refresh`;
let refreshPromise = null;
let authFetchInstalled = false;
let sessionRefreshTimer = null;

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

function decodeJwtPayload(token) {
  try {
    const payload = token?.split(".")?.[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isTokenExpiringSoon(token, thresholdMs = 10 * 60 * 1000) {
  const payload = decodeJwtPayload(token);
  const expMs = Number(payload?.exp) * 1000;
  if (!Number.isFinite(expMs)) return false;
  return expMs - Date.now() <= thresholdMs;
}

function clearAuthState() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("logout"));
}

function setAuthState(user, token) {
  if (token) {
    localStorage.setItem("token", token);
  }
  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
    window.dispatchEvent(new Event("userUpdated"));
  }
}

function buildApiUrl(endpoint) {
  if (typeof endpoint !== "string") return endpoint;
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  if (endpoint.startsWith("/")) return `${base}${endpoint}`;
  return `${base}/${endpoint}`;
}

function getRequestUrl(input) {
  if (typeof input === "string") return input;
  if (input instanceof Request) return input.url;
  return String(input || "");
}

function mergeHeaders(input, initHeaders, token) {
  const merged = new Headers(input instanceof Request ? input.headers : undefined);
  if (initHeaders) {
    new Headers(initHeaders).forEach((value, key) => merged.set(key, value));
  }
  if (token && !merged.has("Authorization")) {
    merged.set("Authorization", `Bearer ${token}`);
  }
  return merged;
}

function shouldHandleApiRequest(url) {
  return typeof url === "string" && url.startsWith(`${base}/api/`);
}

async function refreshSessionToken(fetchImpl = fetch) {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const response = await fetchImpl(REFRESH_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok || !data?.token) {
        if (response.status === 401) {
          clearAuthState();
        }
        return null;
      }

      setAuthState(data.user, data.token);
      return data.token;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function installAuthFetchInterceptor() {
  if (authFetchInstalled) return;
  if (typeof window === "undefined" || typeof window.fetch !== "function") return;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = getRequestUrl(input);

    if (!shouldHandleApiRequest(url) || url === REFRESH_ENDPOINT) {
      return nativeFetch(input, init);
    }

    const currentToken = localStorage.getItem("token");
    const firstInit = {
      ...init,
      headers: mergeHeaders(input, init.headers, currentToken),
    };

    let response = await nativeFetch(input, firstInit);

    if (response.status !== 401 || !currentToken) {
      return response;
    }

    const refreshedToken = await refreshSessionToken(nativeFetch);
    if (!refreshedToken) {
      return response;
    }

    const retryInit = {
      ...init,
      headers: mergeHeaders(input, init.headers, refreshedToken),
    };

    response = await nativeFetch(input, retryInit);
    return response;
  };

  authFetchInstalled = true;
}

export function startSessionAutoRefresh() {
  if (sessionRefreshTimer) return;
  if (typeof window === "undefined") return;

  const maybeRefresh = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!isTokenExpiringSoon(token)) return;
    await refreshSessionToken(window.fetch.bind(window));
  };

  maybeRefresh();
  sessionRefreshTimer = window.setInterval(maybeRefresh, 5 * 60 * 1000);
}

const ACTIVITY_FLAG_KEY = "collabiora_activity_recorded_utc_day";

/** One successful ping per user per UTC day; localStorage dedupes across tabs. */
export function recordDailyPlatformActivity() {
  if (typeof window === "undefined") return;
  const token = localStorage.getItem("token");
  if (!token) return;

  let userId;
  try {
    const u = JSON.parse(localStorage.getItem("user") || "null");
    userId = u?._id || u?.id;
  } catch {
    return;
  }
  if (!userId) return;

  const todayUtc = new Date().toISOString().slice(0, 10);
  const flag = `${userId}|${todayUtc}`;
  try {
    if (localStorage.getItem(ACTIVITY_FLAG_KEY) === flag) return;
  } catch {
    return;
  }

  void fetch(`${base}/api/users/me/activity`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
    .then((res) => {
      if (res.ok) {
        try {
          localStorage.setItem(ACTIVITY_FLAG_KEY, flag);
        } catch {
          /* ignore */
        }
      }
    })
    .catch(() => {});
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

  const response = await fetch(buildApiUrl(endpoint), {
    ...options,
    headers,
    credentials: "include", // Include cookies for device token
  });
  return response;
}

export default apiFetch;
