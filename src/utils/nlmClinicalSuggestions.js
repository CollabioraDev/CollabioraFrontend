import apiFetch from "./api.js";

/**
 * @param {string} query
 * @param {{
 *   includeProcedures?: boolean
 *   includeDiseaseNames?: boolean
 *   includeHpo?: boolean
 *   signal?: AbortSignal
 * }} [options]
 * @returns {Promise<string[]>}
 */
export async function fetchNlmClinicalSuggestions(
  query,
  {
    includeProcedures = true,
    includeDiseaseNames = true,
    includeHpo = true,
    signal,
  } = {},
) {
  const q = typeof query === "string" ? query.trim() : "";
  if (q.length < 2) {
    return [];
  }

  const params = new URLSearchParams({ q });
  if (!includeProcedures) params.set("procedures", "0");
  if (!includeDiseaseNames) params.set("diseases", "0");
  if (!includeHpo) params.set("hpo", "0");

  try {
    const response = await apiFetch(
      `/api/nlm-clinical/suggestions?${params.toString()}`,
      { signal },
    );
    if (!response.ok) return [];
    const data = await response.json();
    const raw = Array.isArray(data?.suggestions) ? data.suggestions : [];
    return raw
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}
