/**
 * Build indexes over MeSH terms so we only search a small subset per keystroke.
 * - byFirstLetter: { "a": [...], "b": [...] } — max MAX_PER_LETTER terms per letter
 * - byFirstTwoLetters: { "ca": [...], "di": [...] } — max MAX_PER_TWO terms per pair
 * Keeps suggestion/autocorrect pool small for fast typing.
 */
const MAX_PER_LETTER = 1800;
const MAX_PER_TWO = 700;

export function buildMeshIndex(terms) {
  if (!Array.isArray(terms) || terms.length === 0) {
    return { byFirstLetter: {}, byFirstTwoLetters: {} };
  }

  const byFirst = Object.create(null);
  const byFirstTwo = Object.create(null);

  for (const term of terms) {
    const t = typeof term === "string" ? term.trim() : "";
    if (!t) continue;
    const lower = t.toLowerCase();
    const c0 = lower[0];
    if (!c0 || !/[a-z]/.test(c0)) continue;

    if (!byFirst[c0]) byFirst[c0] = [];
    if (byFirst[c0].length < MAX_PER_LETTER) byFirst[c0].push(term.trim());

    const c1 = lower[1];
    if (c1 && /[a-z]/.test(c1)) {
      const key = c0 + c1;
      if (!byFirstTwo[key]) byFirstTwo[key] = [];
      if (byFirstTwo[key].length < MAX_PER_TWO) byFirstTwo[key].push(term.trim());
    }
  }

  return { byFirstLetter: byFirst, byFirstTwoLetters: byFirstTwo };
}

/**
 * Get a small slice of MeSH terms relevant to the current query for suggestions/autocorrect.
 * Uses 2-letter index when query has 2+ chars, else 1-letter, else empty.
 */
export function getMeshSliceForQuery(index, query) {
  if (!index || !query || typeof query !== "string") return [];
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  const { byFirstLetter, byFirstTwoLetters } = index;
  if (q.length >= 2) {
    const key2 = q.slice(0, 2);
    if (byFirstTwoLetters[key2]?.length) return byFirstTwoLetters[key2];
  }
  const key1 = q[0];
  if (byFirstLetter[key1]?.length) return byFirstLetter[key1];
  return [];
}
