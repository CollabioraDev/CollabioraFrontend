/**
 * Guest browse experiment: landing Yori without message limits, full top nav,
 * no anonymous 6-search cap in the UI (when enabled), easy revert via the flag.
 *
 * Guests browse with the default (general / patient) labels; "For Researchers"
 * in the navbar links to /onboarding — there is no guest role preview toggle.
 *
 * Revert: set GUEST_BROWSE_MODE_ENABLED to false.
 *
 * API: set GUEST_BROWSE_UNLIMITED_SEARCH=true in server .env (required for
 * unlimited anonymous searches; if false, the API returns the free-search limit
 * message). Restart the API after changing. Revert: set false when turning off.
 *
 * Search UX: do not send `userId` on publications/trials/experts search requests
 * unless the user has a valid session token. Otherwise the API may load that
 * user's profile (e.g. researcher) and skip patient-style simplified titles.
 */
export const GUEST_BROWSE_MODE_ENABLED = true;

/**
 * Default page size for `/api/search/publications` and `/api/search/trials`
 * (must match `pageSize = "9"` in server/routes/search.routes.js).
 * Used so the first page matches a normal signed-in session, not a reduced guest teaser.
 */
export const PUBLICATIONS_AND_TRIALS_PAGE_SIZE = 9;

/** Effective role for UI: signed-in user only; guests always browse as patient/general labels. */
export function getEffectiveUiRole() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "null");
    if (u && (u._id || u.id)) return u.role || "patient";
  } catch {
    /* ignore */
  }
  return "patient";
}
