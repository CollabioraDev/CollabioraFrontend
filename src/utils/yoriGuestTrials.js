import { GUEST_BROWSE_MODE_ENABLED } from "./guestBrowseMode.js";

/** Guest Yori trial on the marketing site (shared by guest landing page + floating chat). */
export const YORI_GUEST_TRIAL_COUNT_KEY = "collabiora_yori_guest_trial_count";
export const MAX_GUEST_TRIALS = 3;

export function getGuestTrialCount() {
  if (GUEST_BROWSE_MODE_ENABLED) return 0;
  try {
    const n = parseInt(localStorage.getItem(YORI_GUEST_TRIAL_COUNT_KEY) || "0", 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function incrementGuestTrialAfterMessage() {
  if (GUEST_BROWSE_MODE_ENABLED) return;
  const n = getGuestTrialCount();
  if (n < MAX_GUEST_TRIALS) {
    try {
      localStorage.setItem(YORI_GUEST_TRIAL_COUNT_KEY, String(n + 1));
    } catch {
      /* ignore */
    }
  }
  window.dispatchEvent(new Event("yoriGuestTrialUpdated"));
}

export function isGuestTrialExhausted() {
  if (GUEST_BROWSE_MODE_ENABLED) return false;
  return getGuestTrialCount() >= MAX_GUEST_TRIALS;
}
