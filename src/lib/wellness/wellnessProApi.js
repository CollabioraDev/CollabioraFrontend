/**
 * collabiora Wellness Pro — API (algorithm + snapshot on server).
 */

export function getWellnessApiBase() {
  return import.meta.env.VITE_API_URL || "http://localhost:5000";
}

/**
 * @param {Record<string, unknown>} body — age, sex, healthJourney, focus, co, diet, activity, medications, manualSupplements, foodLikes, foodDislikes
 * @param {string | null} token
 */
export async function postWellnessProSnapshot(body, token) {
  const res = await fetch(`${getWellnessApiBase()}/api/wellness-pro/snapshot`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

/**
 * @param {string} token
 */
export async function fetchWellnessProSnapshot(token) {
  const res = await fetch(`${getWellnessApiBase()}/api/wellness-pro/snapshot`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.code = data.code;
    throw err;
  }
  return data;
}

/**
 * @param {string} token
 */
export async function deleteWellnessProSnapshot(token) {
  const res = await fetch(`${getWellnessApiBase()}/api/wellness-pro/snapshot`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}
