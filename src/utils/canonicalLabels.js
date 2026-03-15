/**
 * Canonical label normalization for search suggestions and stored taxonomy terms.
 * - Builds normalized keys for dedupe/matching.
 * - Maps aliases and casing variants to a canonical display label.
 * - Fallback formatter for free-text when no canonical match exists (preserves COVID-19, OBGYN, etc.).
 */

/**
 * Build a normalized key for matching/deduplication (lowercase, trim, collapse spaces).
 * @param {string} term
 * @returns {string}
 */
export function buildNormalizedKey(term) {
  if (term == null || typeof term !== "string") return "";
  return term.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Format a free-text label when it does not match any canonical entry.
 * Title-cases words but preserves: acronyms (all-caps length <= 4), hyphenated (e.g. COVID-19),
 * apostrophes (e.g. Parkinson's).
 * @param {string} text
 * @returns {string}
 */
export function formatLabelFallback(text) {
  if (!text || typeof text !== "string") return text;
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  return trimmed
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      // Keep all-caps acronyms (length <= 4) and known forms
      if (word.length <= 4 && word === word.toUpperCase()) return word;
      // Hyphenated: capitalize each part (e.g. COVID-19, post-inflammatory)
      if (word.includes("-")) {
        return word
          .split("-")
          .map((part) => {
            if (!part) return part;
            if (part.length <= 4 && part === part.toUpperCase()) return part;
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          })
          .join("-");
      }
      if (word.includes("'")) {
        const parts = word.split("'");
        return parts
          .map((part) => {
            if (!part) return part;
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          })
          .join("'");
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Build a map from normalized key -> canonical display label from a list of canonical labels.
 * Each label is also its own canonical form (for curated lists like SMART_SUGGESTION_KEYWORDS).
 * @param {string[]} canonicalLabels
 * @returns {Map<string, string>}
 */
export function buildCanonicalMapFromLabels(canonicalLabels) {
  const map = new Map();
  if (!Array.isArray(canonicalLabels)) return map;
  for (const label of canonicalLabels) {
    if (typeof label !== "string") continue;
    const trimmed = label.trim();
    if (!trimmed) continue;
    const key = buildNormalizedKey(trimmed);
    if (!key) continue;
    // First occurrence wins so curated order is respected
    if (!map.has(key)) map.set(key, trimmed);
  }
  return map;
}

/**
 * Build a map from normalized key -> canonical display label from ICD-11 shaped dataset.
 * Uses display_name as canonical; maps each display_name and each patient_term (except ICD code patterns) to that canonical.
 * @param {Array<{ display_name?: string; patient_terms?: string[] }>} icd11Dataset
 * @returns {Map<string, string>}
 */
export function buildCanonicalMapFromIcd11(icd11Dataset) {
  const map = new Map();
  if (!Array.isArray(icd11Dataset)) return map;

  const isIcdCodeLike = (s) => {
    const lower = s.toLowerCase();
    return (
      lower.includes("icd11 code") ||
      lower.includes("icd code") ||
      /icd11\s+[a-z]{2}[0-9]{2}/i.test(s) ||
      /icd\s+[a-z]{2}[0-9]{2}/i.test(s)
    );
  };

  for (const item of icd11Dataset) {
    const canonical =
      item.display_name && typeof item.display_name === "string"
        ? item.display_name.trim()
        : "";
    if (!canonical) continue;

    const key = buildNormalizedKey(canonical);
    if (key && !map.has(key)) map.set(key, canonical);

    if (Array.isArray(item.patient_terms)) {
      for (const term of item.patient_terms) {
        if (typeof term !== "string") continue;
        const t = term.trim();
        if (!t || isIcdCodeLike(t)) continue;
        const k = buildNormalizedKey(t);
        if (k && !map.has(k)) map.set(k, canonical);
      }
    }
  }
  return map;
}

/**
 * Resolve a term to its canonical display label using the provided map.
 * If not in map, returns formatLabelFallback(term).
 * @param {string} term
 * @param {Map<string, string>} canonicalMap
 * @returns {string}
 */
export function resolveToCanonical(term, canonicalMap) {
  if (term == null || typeof term !== "string") return term;
  const trimmed = term.trim();
  if (!trimmed) return trimmed;
  if (!canonicalMap || !(canonicalMap instanceof Map)) return formatLabelFallback(trimmed);
  const key = buildNormalizedKey(trimmed);
  return canonicalMap.get(key) ?? formatLabelFallback(trimmed);
}

/**
 * Normalize an array of terms to canonical labels (dedupe by normalized key, prefer canonical).
 * @param {string[]} terms
 * @param {Map<string, string>} canonicalMap
 * @returns {string[]}
 */
export function resolveTermsToCanonical(terms, canonicalMap) {
  if (!Array.isArray(terms)) return [];
  const seen = new Set();
  const out = [];
  for (const term of terms) {
    const canonical = resolveToCanonical(term, canonicalMap);
    const key = buildNormalizedKey(canonical);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(canonical);
  }
  return out;
}
