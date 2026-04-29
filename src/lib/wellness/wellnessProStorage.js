const SNAPSHOT_KEY = "collabiora-wellness-pro-snapshot-v1";
const DAILY_PLANS_KEY = "collabiora-wellness-daily-plans-v1";

/** Dispatched by the profile wellness modal after it persists a snapshot (see WellnessOnlySettingsModal). */
export const WELLNESS_SNAPSHOT_UPDATED = "collabiora-wellness-snapshot-updated";

/** Local calendar date (YYYY-MM-DD) for persisting today's personalized plans. */
export function getWellnessLocalDateKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function readWellnessDailyPlans() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DAILY_PLANS_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? o : null;
  } catch {
    return null;
  }
}

export function writeWellnessDailyPlans(data) {
  if (typeof window === "undefined") return;
  try {
    if (data == null) {
      localStorage.removeItem(DAILY_PLANS_KEY);
      return;
    }
    localStorage.setItem(DAILY_PLANS_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

export function clearWellnessDailyPlans() {
  try {
    localStorage.removeItem(DAILY_PLANS_KEY);
  } catch {
    /* ignore */
  }
}

export function readWellnessProSnapshot() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? o : null;
  } catch {
    return null;
  }
}

export function writeWellnessProSnapshot(data) {
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(data));
}

export function clearWellnessProSnapshot() {
  localStorage.removeItem(SNAPSHOT_KEY);
}

export function buildSnapshotPayload(state) {
  return {
    age: state.age,
    sex: state.sex,
    healthJourney: state.healthJourney,
    focus: state.focus,
    co: [...state.coSelected],
    diet: state.diet,
    activity: state.activity,
    foodLikes: state.foodLikes,
    foodDislikes: state.foodDislikes,
    medications: state.medications,
    manualSupplements: state.manualSupplements,
    dismissedSupplements:
      Array.isArray(state.dismissedSupplements) ? state.dismissedSupplements : [],
  };
}
