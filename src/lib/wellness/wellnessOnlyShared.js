import { readWellnessProSnapshot } from "./wellnessProStorage.js";

export const WELLNESS_CO_OPTIONS = [
  { id: "none", label: "None" },
  { id: "dm", label: "Type 2 diabetes / prediabetes" },
  { id: "htn", label: "Hypertension" },
  { id: "cvd", label: "Cardiovascular disease / high cholesterol" },
  { id: "osteo", label: "Osteoporosis / low bone density" },
  { id: "thyroid", label: "Thyroid condition" },
  { id: "ibs", label: "GI / IBS" },
  { id: "neuro", label: "Neurological condition" },
];

/** @param {"prevent"|"manage"} healthJourney @param {"general"|"weight"|"energy"} focus */
export function mapWellnessGoal(healthJourney, focus) {
  if (focus === "weight") return "weight";
  if (focus === "energy") return "energy";
  if (healthJourney === "manage") return "manage";
  return "prev";
}

export function createWellnessSnapshotState() {
  const s = readWellnessProSnapshot();
  return {
    age: s?.age ?? "mid",
    sex: s?.sex ?? "f",
    healthJourney: s?.healthJourney ?? "prevent",
    focus: s?.focus ?? "general",
    coSelected: new Set(
      Array.isArray(s?.co) && s.co.length ? s.co : ["none"],
    ),
    diet: s?.diet ?? "varied",
    activity: s?.activity ?? "light",
    foodLikes: typeof s?.foodLikes === "string" ? s.foodLikes : "",
    foodDislikes: typeof s?.foodDislikes === "string" ? s.foodDislikes : "",
    medications: Array.isArray(s?.medications) ? s.medications : [],
    manualSupplements: Array.isArray(s?.manualSupplements)
      ? s.manualSupplements
      : [],
    dismissedSupplements: Array.isArray(s?.dismissedSupplements)
      ? s.dismissedSupplements
      : [],
  };
}
