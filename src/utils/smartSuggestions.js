export const SMART_SUGGESTION_KEYWORDS = [
  "Cancer",
  "Cardiology",
  "Cardiac",
  "Cardiovascular",
  "Cardio Oncology",
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
  "Functional Neurological Disorder",
  "FND",
  "Conversion Disorder",
  "Neuropsychiatry",
  "Pediatrics",
  "Genetics",
  "Rare Disease",
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
  "Infectious Disease",
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

export function buildSuggestionPool(extraTerms = []) {
  const merged = [...SMART_SUGGESTION_KEYWORDS, ...extraTerms];
  const pool = [];
  const seen = new Set();

  for (const rawTerm of merged) {
    const term = normalizeTerm(rawTerm);
    if (!term) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push(term);
  }

  return pool;
}

const MAX_POOL_SIZE = 1200;

export function getSmartSuggestions(
  query,
  extraTerms = [],
  limit = 8
) {
  if (!query || !query.trim()) return [];

  const normalizedQuery = query.trim().toLowerCase();
  const fullPool = buildSuggestionPool(extraTerms);
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

export const DEFAULT_SUGGESTION_LIMIT = 8;

