/**
 * Compact trial cards: avoid rendering huge concatenated location strings.
 * Keep thresholds in sync with `formatTrialLocationsForChatCard` in
 * `server/services/chatbotAlignedSearch.service.js`.
 */

export const TRIAL_CARD_LOCATION_MAX_CHARS = 100;

/** Many sites are joined as "... United StatesOtherSite" with no separator. */
export const TRIAL_CARD_LOCATION_MIN_US_SITES = 2;

const CHAT_TRIAL_LOCATION_MAX_CHARS = TRIAL_CARD_LOCATION_MAX_CHARS;

function locationEntryToChatString(loc) {
  if (loc == null) return "";
  if (typeof loc === "string") return loc.trim();
  const parts = [
    loc.facility,
    loc.city,
    loc.state,
    loc.zip,
    loc.country,
  ].filter(Boolean);
  return parts.join(", ").trim();
}

function looksLikeManySitesConcatenated(s) {
  if (!s || typeof s !== "string") return false;
  if (s.length > CHAT_TRIAL_LOCATION_MAX_CHARS) return true;
  const us = (s.match(/United States/gi) || []).length;
  if (us >= TRIAL_CARD_LOCATION_MIN_US_SITES) return true;
  if ((s.match(/,/g) || []).length >= 10) return true;
  return false;
}

/**
 * @param {unknown} locationsInput — `trial.locations` (array or string) or similar
 * @returns {string} primary string for heuristics
 */
export function trialLocationsToPrimaryString(locationsInput) {
  if (locationsInput == null) return "";
  if (Array.isArray(locationsInput)) {
    return locationsInput
      .map((loc) => locationEntryToChatString(loc))
      .filter(Boolean)
      .join(" · ");
  }
  if (typeof locationsInput === "string") return locationsInput.trim();
  return String(locationsInput).trim();
}

/**
 * @param {unknown} locationsInput
 * @returns {boolean}
 */
export function shouldSummarizeTrialLocations(locationsInput) {
  if (locationsInput == null) return false;
  if (Array.isArray(locationsInput)) {
    if (locationsInput.length > 2) return true;
    const joined = trialLocationsToPrimaryString(locationsInput);
    if (!joined || joined === "Not specified") return false;
    return shouldSummarizeTrialLocations(joined);
  }
  if (typeof locationsInput !== "string") return false;
  const t = locationsInput.trim();
  if (!t || t === "Not specified") return false;
  if (t.length > TRIAL_CARD_LOCATION_MAX_CHARS) return true;
  return looksLikeManySitesConcatenated(t);
}

/**
 * One line for Yori trial cards (defense in depth vs. server + old streamed payloads).
 * @param {{ locations?: unknown; location?: string }} trial
 * @param {(key: string, opts?: { defaultValue?: string }) => string} t
 * @returns {string|null} null = hide location row
 */
export function formatTrialLocationDisplayForCard(trial, t) {
  if (!trial) return null;
  const multipleLabel = t("chat.trialMultipleLocations", {
    defaultValue: "Multiple locations",
  });
  const raw = trial.locations;

  if (Array.isArray(raw) && raw.length > 0) {
    if (raw.length > 2) return multipleLabel;
    const lines = raw
      .slice(0, 2)
      .map(locationEntryToChatString)
      .filter(Boolean);
    if (lines.length === 0) return null;
    if (lines.length === 1) {
      const one = lines[0];
      if (looksLikeManySitesConcatenated(one)) return multipleLabel;
      if (one.length > CHAT_TRIAL_LOCATION_MAX_CHARS) {
        return `${one.slice(0, CHAT_TRIAL_LOCATION_MAX_CHARS - 1).trimEnd()}…`;
      }
      return one;
    }
    const joined = lines.join(" · ");
    if (joined.length > CHAT_TRIAL_LOCATION_MAX_CHARS) return multipleLabel;
    if (lines.some((l) => looksLikeManySitesConcatenated(l))) {
      return multipleLabel;
    }
    return joined;
  }

  const oneStr =
    typeof raw === "string" && raw.trim()
      ? raw.trim()
      : typeof trial.location === "string" && trial.location.trim()
        ? trial.location.trim()
        : "";
  if (!oneStr || oneStr === "Not specified") return null;
  if (looksLikeManySitesConcatenated(oneStr)) return multipleLabel;
  if (oneStr.length > CHAT_TRIAL_LOCATION_MAX_CHARS) {
    return `${oneStr.slice(0, CHAT_TRIAL_LOCATION_MAX_CHARS - 1).trimEnd()}…`;
  }
  return oneStr;
}

/**
 * Shorten huge location payloads on trial search cards (idempotent).
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
  let changed = false;
  const items = searchResults.items.map((trial) => {
    const next = formatTrialLocationDisplayForCard(trial, t);
    const out = next ?? "Not specified";
    if (trial.locations === out) return trial;
    changed = true;
    return { ...trial, locations: out };
  });
  return changed ? { ...searchResults, items } : searchResults;
}
