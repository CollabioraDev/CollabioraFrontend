/**
 * Generic medication names for Pro autocomplete (not trade names).
 * Categories support interaction checks with supplements.
 */

/** @typedef {{ id: string; label: string; category: string }} MedicationGeneric */

/** @type {MedicationGeneric[]} */
export const MEDICATION_GENERICS = [
  { id: "metformin", label: "metformin", category: "antidiabetic" },
  { id: "semaglutide", label: "semaglutide", category: "antidiabetic" },
  { id: "empagliflozin", label: "empagliflozin", category: "antidiabetic" },
  { id: "lisinopril", label: "lisinopril", category: "ace_inhibitor" },
  { id: "enalapril", label: "enalapril", category: "ace_inhibitor" },
  { id: "ramipril", label: "ramipril", category: "ace_inhibitor" },
  { id: "captopril", label: "captopril", category: "ace_inhibitor" },
  { id: "perindopril", label: "perindopril", category: "ace_inhibitor" },
  { id: "losartan", label: "losartan", category: "arb" },
  { id: "valsartan", label: "valsartan", category: "arb" },
  { id: "spironolactone", label: "spironolactone", category: "k_sparing_diuretic" },
  { id: "eplerenone", label: "eplerenone", category: "k_sparing_diuretic" },
  { id: "amiloride", label: "amiloride", category: "k_sparing_diuretic" },
  { id: "triamterene", label: "triamterene", category: "k_sparing_diuretic" },
  { id: "warfarin", label: "warfarin", category: "anticoagulant" },
  { id: "apixaban", label: "apixaban", category: "anticoagulant" },
  { id: "rivaroxaban", label: "rivaroxaban", category: "anticoagulant" },
  { id: "dabigatran", label: "dabigatran", category: "anticoagulant" },
  { id: "clopidogrel", label: "clopidogrel", category: "antiplatelet" },
  { id: "aspirin", label: "aspirin", category: "antiplatelet" },
  { id: "levothyroxine", label: "levothyroxine", category: "thyroid" },
  { id: "methimazole", label: "methimazole", category: "thyroid" },
  { id: "propylthiouracil", label: "propylthiouracil", category: "thyroid" },
  { id: "atorvastatin", label: "atorvastatin", category: "statin" },
  { id: "rosuvastatin", label: "rosuvastatin", category: "statin" },
  { id: "omeprazole", label: "omeprazole", category: "ppi" },
  { id: "prednisone", label: "prednisone", category: "corticosteroid" },
  { id: "alendronate", label: "alendronate", category: "bisphosphonate" },
  { id: "gabapentin", label: "gabapentin", category: "neurologic" },
  { id: "levodopa", label: "levodopa", category: "neurologic" },
];

export function normalizeMedToken(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function findMedicationByLabel(label) {
  const n = normalizeMedToken(label);
  return MEDICATION_GENERICS.find((m) => m.label === n);
}
