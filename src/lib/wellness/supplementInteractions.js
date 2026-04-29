/**
 * Flags potential supplement ↔ medication interactions (education only).
 */

import { findMedicationByLabel, normalizeMedToken } from "./medicationGenerics.js";

/**
 * @param {string[]} medicationLabels
 * @param {string[]} supplementLines - algorithm vit tags + manual entries
 * @returns {{ flags: string[] }}
 */
export function getSupplementDrugInteractionFlags(medicationLabels, supplementLines) {
  const meds = medicationLabels.map(normalizeMedToken).filter(Boolean);
  const medObjs = meds
    .map((m) => findMedicationByLabel(m))
    .filter(Boolean);

  const hasAce =
    medObjs.some((m) => m.category === "ace_inhibitor") ||
    meds.some((m) => m.includes("pril")); // catch missed ACE names
  const hasArb = medObjs.some((m) => m.category === "arb");
  const hasKspare = medObjs.some((m) => m.category === "k_sparing_diuretic");
  const hasAnticoag = medObjs.some(
    (m) => m.category === "anticoagulant" || m.category === "antiplatelet",
  );
  const hasMetformin = meds.some((m) => m === "metformin");
  const hasThyroidRx = medObjs.some((m) => m.category === "thyroid");

  const textBlob = supplementLines.join(" ").toLowerCase();

  const flags = [];

  const mentionsPotassium =
    /\bpotassium\b/.test(textBlob) || /\bk\s*supplement/.test(textBlob);
  if (mentionsPotassium && (hasAce || hasArb || hasKspare)) {
    flags.push(
      "Potassium supplements can be risky with ACE inhibitors, ARBs, or potassium-sparing diuretics — confirm with your clinician.",
    );
  }

  const mentionsOmega =
    /\bomega[- ]?3\b/.test(textBlob) ||
    /\bepa\b/.test(textBlob) ||
    /\bdha\b/.test(textBlob) ||
    /fish oil/.test(textBlob);
  if (mentionsOmega && hasAnticoag) {
    flags.push(
      "Omega-3/fish oil may add bleeding risk with anticoagulants or antiplatelets — discuss dose with your clinician.",
    );
  }

  const mentionsBiotin = /\bbiotin\b/.test(textBlob);
  if (mentionsBiotin && hasThyroidRx) {
    flags.push(
      "Biotin can interfere with some thyroid blood tests — tell your lab and clinician; often hold before labs.",
    );
  }

  const mentionsIodine = /\biodine\b|kelp|lugol/i.test(textBlob);
  if (mentionsIodine) {
    flags.push(
      "High-dose iodine or kelp is not appropriate for everyone with thyroid disease — ask your clinician before starting.",
    );
  }

  const mentionsBerberineOrChrome =
    /\bberberine\b|\bchromium\b|alpha[- ]?lipoic|ala\b/.test(textBlob);
  if (mentionsBerberineOrChrome && hasMetformin) {
    flags.push(
      "Some glucose-related supplements can overlap with metformin effects — review additions with your clinician.",
    );
  }

  return { flags };
}

/** Quick picks for manual vitamin entry autocomplete */
export const COMMON_SUPPLEMENT_PICKS = [
  "Vitamin D3",
  "Magnesium glycinate",
  "Omega-3 EPA/DHA",
  "B-complex",
  "Biotin",
  "Potassium chloride",
  "Iron bisglycinate",
  "Calcium citrate",
  "Vitamin K2 (MK-7)",
  "Ashwagandha",
  "Melatonin",
];
