/** Compact trial cards: avoid rendering huge concatenated location strings. */

export const TRIAL_CARD_LOCATION_MAX_CHARS = 140;

/** Many US sites are joined as "... United StatesOtherSite" with no separator. */
export const TRIAL_CARD_LOCATION_MIN_US_SITES = 3;

/**
 * @param {unknown} locationsText
 * @returns {boolean}
 */
export function shouldSummarizeTrialLocations(locationsText) {
  if (locationsText == null || typeof locationsText !== "string") return false;
  const t = locationsText.trim();
  if (!t || t === "Not specified") return false;
  if (t.length > TRIAL_CARD_LOCATION_MAX_CHARS) return true;
  const usMatches = t.match(/United States/gi);
  if (usMatches && usMatches.length >= TRIAL_CARD_LOCATION_MIN_US_SITES) {
    return true;
  }
  return false;
}

/**
 * Shorten huge concatenated location strings on trial search cards (idempotent).
 * @param {unknown} searchResults
 * @param {(key: string, opts?: { defaultValue?: string }) => string} t
 */
export function normalizeSearchResultsTrialLocations(searchResults, t) {
  if (
    !searchResults ||
    searchResults.type !== "trials" ||
    !Array.isArray(searchResults.items)
  ) {
    return searchResults;
  }
  const label = t("chat.trialMultipleLocations", {
    defaultValue: "Multiple locations",
  });
  let changed = false;
  const items = searchResults.items.map((trial) => {
    const loc = trial?.locations;
    if (
      loc &&
      loc !== "Not specified" &&
      shouldSummarizeTrialLocations(loc)
    ) {
      changed = true;
      return { ...trial, locations: label };
    }
    return trial;
  });
  return changed ? { ...searchResults, items } : searchResults;
}
