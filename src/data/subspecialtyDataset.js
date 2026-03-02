/**
 * Maps primary specialties to their subspecialties.
 * Subspecialty names only (no "American Board of" or parent suffix).
 * Derived from ABMS/ACGME specialty taxonomy.
 */
import { primarySpecialtyOptions } from "./primarySpecialtyOptions.js";

/** Build mapping: primary specialty name -> array of subspecialty names */
function buildSubspecialtyMap() {
  const map = {};
  for (const opt of primarySpecialtyOptions) {
    const commaIdx = opt.indexOf(", ");
    if (commaIdx < 0) continue; // Skip standalone primary specialties
    const subspecialtyName = opt.slice(0, commaIdx).trim();
    const primaryName = opt.slice(commaIdx + 2).trim();
    if (!map[primaryName]) map[primaryName] = [];
    if (!map[primaryName].includes(subspecialtyName)) {
      map[primaryName].push(subspecialtyName);
    }
  }
  // Sort subspecialties alphabetically within each primary
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => a.localeCompare(b));
  }
  return map;
}

export const primaryToSubspecialties = buildSubspecialtyMap();

/**
 * Get subspecialty options for a selected primary specialty.
 * @param {string} primarySpecialty - The selected primary (e.g. "Internal Medicine" or "Cardiovascular Disease, Internal Medicine")
 * @returns {string[]} Array of subspecialty names, or [] if none/unknown
 */
export function getSubspecialtiesForPrimary(primarySpecialty) {
  if (!primarySpecialty?.trim()) return [];
  const primaryName = primarySpecialty.includes(", ")
    ? primarySpecialty.slice(primarySpecialty.indexOf(", ") + 2).trim()
    : primarySpecialty.trim();
  return primaryToSubspecialties[primaryName] || [];
}

/**
 * Get subspecialty option groups for CustomSelect.
 * Returns a single group "Subspecialties" with the filtered list when primary is selected.
 * @param {string} primarySpecialty - The selected primary specialty
 * @returns {Array<{ group: string; options: string[] }>} Option groups for dropdown
 */
export function getSubspecialtyOptionGroups(primarySpecialty) {
  const subs = getSubspecialtiesForPrimary(primarySpecialty);
  if (subs.length === 0) return [];
  return [{ group: "Subspecialties", options: subs }];
}
