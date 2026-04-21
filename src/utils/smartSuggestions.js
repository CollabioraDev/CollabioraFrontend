import {
  buildNormalizedKey,
  resolveToCanonical,
} from "./canonicalLabels.js";

export const SMART_SUGGESTION_KEYWORDS = [
  "Cancer",
  "Cardiology",
  "Cardiac",
  "Cardiovascular",
  "Cardio-Oncology",
  "Cardiac Rehab",
  "Cardiac Surgery",
  "Cardiomyopathy",
  "Clinical Trial",
  "Clinical Trials",
  "Oncology",
  "Immunotherapy",
  "Immunology",
  "Autoimmune",
  "Neurology",
  "Neuroscience",
  "Neurodegenerative",
  "Neurological Disorders",
  "Functional Neurological Disorders",
  "FND",
  "Conversion Disorder",
  "Neuropsychiatry",
  "Pediatrics",
  "Genetics",
  "Rare Diseases",
  "Diabetes",
  "Endocrinology",
  "Metabolic Disorders",
  "Gastroenterology",
  "Hepatology",
  "Dermatology",
  "Pulmonology",
  "Hematology",
  "Multiple Sclerosis",
  "Leukemia",
  "Lung Cancer",
  "Breast Cancer",
  "Prostate Cancer",
  "Cardiothoracic",
  "Precision Medicine",
  "Digital Health",
  "AI in Healthcare",
  "Radiology",
  "Medical Imaging",
  "Behavioral Health",
  "Mental Health",
  "Immunization",
  "Vaccines",
  "Transplant",
  "Regenerative Medicine",
  "Treatment",
  "Therapy",
  "Diagnosis",
  "Prognosis",
  "Prevention",
  "Rehabilitation",
  "Management",
  "Intervention",
  "Surgery",
  "Medication",
  "Drug Therapy",
  "Physical Therapy",
  "Cognitive Behavioral Therapy",
  "CBT",
  "Psychotherapy",
  "Psychiatry",
  "Psychology",
  "Rheumatology",
  "Orthopedics",
  "Ophthalmology",
  "Otolaryngology",
  "ENT",
  "Urology",
  "Nephrology",
  "Infectious Diseases",
  "Pathology",
  "Epidemiology",
  "Public Health",
  "Emergency Medicine",
  "Critical Care",
  "Intensive Care",
  "ICU",
  "Anesthesiology",
  "Pain Management",
  "Chronic Pain",
  "Palliative Care",
  "Hospice",
  "Geriatrics",
  "Obstetrics",
  "Gynecology",
  "OBGYN",
  "Maternal Health",
  "Neonatology",
];

const normalizeTerm = (term) =>
  typeof term === "string" ? term.trim() : "";

/**
 * Build suggestion pool from SMART_SUGGESTION_KEYWORDS + extraTerms.
 * When canonicalMap is provided, each term is resolved to a canonical display label
 * and deduplication is by normalized key so one canonical label per concept is shown.
 * @param {string[]} [extraTerms=[]]
 * @param {Map<string, string>|null} [canonicalMap=null]
 * @returns {string[]}
 */
export function buildSuggestionPool(extraTerms = [], canonicalMap = null) {
  const merged = [...SMART_SUGGESTION_KEYWORDS, ...extraTerms];
  const pool = [];
  const seen = new Set();

  for (const rawTerm of merged) {
    const term = normalizeTerm(rawTerm);
    if (!term) continue;
    const displayLabel =
      canonicalMap != null
        ? resolveToCanonical(term, canonicalMap)
        : term;
    const key = buildNormalizedKey(displayLabel);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    pool.push(displayLabel);
  }

  return pool;
}

const MAX_POOL_SIZE = 1200;

/**
 * Get suggestions matching the query from the combined pool.
 * When canonicalMap is provided, pool is built with canonical labels only.
 * @param {string} query
 * @param {string[]} [extraTerms=[]]
 * @param {number} [limit=8]
 * @param {Map<string, string>|null} [canonicalMap=null]
 * @returns {string[]}
 */
export function getSmartSuggestions(
  query,
  extraTerms = [],
  limit = 8,
  canonicalMap = null
) {
  if (!query || !query.trim()) return [];

  const normalizedQuery = query.trim().toLowerCase();
  const fullPool = buildSuggestionPool(extraTerms, canonicalMap);
  const pool =
    fullPool.length > MAX_POOL_SIZE
      ? fullPool.slice(0, MAX_POOL_SIZE)
      : fullPool;

  const startsWithMatches = pool.filter((term) =>
    term.toLowerCase().startsWith(normalizedQuery)
  );

  const containsMatches = pool.filter(
    (term) =>
      !startsWithMatches.includes(term) &&
      term.toLowerCase().includes(normalizedQuery)
  );

  return [...startsWithMatches, ...containsMatches].slice(0, limit);
}

/**
 * Match a fixed list of terms against the query (same ordering as getSmartSuggestions).
 * @param {string} query
 * @param {string[]} terms
 * @param {number} [limit=8]
 * @returns {string[]}
 */
export function filterTermsMatchingQuery(query, terms, limit = 8) {
  if (!query?.trim() || !Array.isArray(terms)) return [];

  const normalizedQuery = query.trim().toLowerCase();
  const cleaned = terms
    .map((t) => (typeof t === "string" ? t.trim() : ""))
    .filter(Boolean);

  const startsWithMatches = cleaned.filter((term) =>
    term.toLowerCase().startsWith(normalizedQuery),
  );
  const containsMatches = cleaned.filter(
    (term) =>
      !startsWithMatches.includes(term) &&
      term.toLowerCase().includes(normalizedQuery),
  );

  return [...startsWithMatches, ...containsMatches].slice(0, limit);
}

/**
 * Show NLM / priority terms first, then local smart suggestions (deduped).
 * @param {string} query
 * @param {string[]} priorityTerms
 * @param {string[]} extraTerms
 * @param {number} limit
 * @param {Map<string, string>|null} canonicalMap
 * @returns {string[]}
 */
export function mergePriorityWithSmartSuggestions(
  query,
  priorityTerms,
  extraTerms,
  limit,
  canonicalMap = null,
) {
  if (!query?.trim()) return [];

  const priorityFiltered = filterTermsMatchingQuery(
    query,
    priorityTerms,
    limit,
  );
  const local = getSmartSuggestions(query, extraTerms, limit, canonicalMap);
  const seen = new Set(
    priorityFiltered.map((t) => buildNormalizedKey(t)),
  );
  const rest = local.filter(
    (t) => !seen.has(buildNormalizedKey(t)),
  );
  return [...priorityFiltered, ...rest].slice(0, limit);
}

export const DEFAULT_SUGGESTION_LIMIT = 8;

