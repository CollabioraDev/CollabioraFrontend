/**
 * Tutorial sample data - fetches pre-loaded hypertension publication results
 * from the backend tutorial endpoint for the Publications page tour.
 * No search limit or external API; always the same 6 results.
 */

/**
 * Fetch pre-loaded tutorial publications from backend (constant hypertension results).
 */
export async function fetchTutorialSamplePublications() {
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${base}/api/search/publications/tutorial`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: "include",
    });

    if (!response.ok) return null;

    const data = await response.json();
    const results = data.results || [];
    return results.length > 0 ? results : null;
  } catch (e) {
    console.warn("Tutorial: could not fetch sample publications", e);
    return null;
  }
}

/**
 * Load sample publications for tutorial (always from backend tutorial endpoint).
 */
export async function loadTutorialSamplePublications() {
  return fetchTutorialSamplePublications();
}

/**
 * Fetch pre-loaded tutorial trials from backend (hypertension sample results).
 */
export async function fetchTutorialSampleTrials() {
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${base}/api/search/trials/tutorial`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: "include",
    });

    if (!response.ok) return null;

    const data = await response.json();
    const results = data.results || [];
    return results.length > 0 ? results : null;
  } catch (e) {
    console.warn("Tutorial: could not fetch sample trials", e);
    return null;
  }
}

/**
 * Load sample trials for tutorial (always from backend tutorial endpoint).
 */
export async function loadTutorialSampleTrials() {
  return fetchTutorialSampleTrials();
}

/**
 * Fetch pre-loaded tutorial experts from backend (sample cards for tour).
 */
export async function fetchTutorialSampleExperts() {
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${base}/api/search/experts/tutorial`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: "include",
    });

    if (!response.ok) return null;

    const data = await response.json();
    const results = data.results || [];
    return results.length > 0 ? results : null;
  } catch (e) {
    console.warn("Tutorial: could not fetch sample experts", e);
    return null;
  }
}

/**
 * Load sample experts for tutorial (always from backend tutorial endpoint).
 */
export async function loadTutorialSampleExperts() {
  return fetchTutorialSampleExperts();
}

/** @deprecated Use loadTutorialSamplePublications. Kept for compatibility. */
export function getCachedTutorialSample() {
  return null;
}
