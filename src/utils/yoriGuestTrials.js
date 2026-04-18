import { GUEST_BROWSE_MODE_ENABLED } from "./guestBrowseMode.js";

/**
 * Guest Yori trial while browsing signed-out (floating chat on trial/publication pages).
 * Home `/home` uses {@link YORI_GUEST_HOME_TRIAL_COUNT_KEY} and {@link MAX_GUEST_HOME_MESSAGES}.
 */
export const YORI_GUEST_TRIAL_COUNT_KEY = "collabiora_yori_guest_trial_count";
export const MAX_GUEST_TRIALS = 3;

/** `/home` Yori guest — separate budget; clearing chat resets this count. */
export const YORI_GUEST_HOME_TRIAL_COUNT_KEY =
  "collabiora_yori_guest_home_trial_count_v1";
export const MAX_GUEST_HOME_MESSAGES = 20;

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

export function getGuestHomeTrialCount() {
  if (GUEST_BROWSE_MODE_ENABLED) return 0;
  try {
    const n = parseInt(
      localStorage.getItem(YORI_GUEST_HOME_TRIAL_COUNT_KEY) || "0",
      10,
    );
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function incrementGuestHomeTrialAfterMessage() {
  if (GUEST_BROWSE_MODE_ENABLED) return;
  const n = getGuestHomeTrialCount();
  if (n < MAX_GUEST_HOME_MESSAGES) {
    try {
      localStorage.setItem(YORI_GUEST_HOME_TRIAL_COUNT_KEY, String(n + 1));
    } catch {
      /* ignore */
    }
  }
  window.dispatchEvent(new Event("yoriGuestTrialUpdated"));
}

export function isGuestHomeTrialExhausted() {
  if (GUEST_BROWSE_MODE_ENABLED) return false;
  return getGuestHomeTrialCount() >= MAX_GUEST_HOME_MESSAGES;
}

/** Clears the home-page guest message budget (call when user clears chat on `/home`). */
export function resetGuestHomeTrialCount() {
  if (GUEST_BROWSE_MODE_ENABLED) return;
  try {
    localStorage.removeItem(YORI_GUEST_HOME_TRIAL_COUNT_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("yoriGuestTrialUpdated"));
}
