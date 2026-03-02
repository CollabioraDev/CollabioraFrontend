/**
 * Display name for a user (author or current user).
 * For researchers: prefer API-provided displayName (e.g. "Dr. Ahmed Hasan, MD PHD"), then build from profile.
 * Do not add "Dr." or credentials if the name already contains them (e.g. dummy data "Dr. M. Patel, MD, PhD").
 * For others: name || username || fallback.
 * @param {object} user - { displayName?, name?, username?, role?, profession?, certifications?[] }
 * @param {string} fallback - Fallback if no name (default "Anonymous")
 * @returns {string}
 */
function nameAlreadyHasTitleOrCredentials(name) {
  if (!name || typeof name !== "string") return false;
  const s = name.trim();
  if (/^Dr\.\s/i.test(s) || /^Prof\.\s/i.test(s)) return true;
  if (/,?\s*(MD|PhD|MBBS|DO|PharmD|ScD|EdD)(\s|,|$)/i.test(s)) return true;
  return false;
}

/** Dummy forum helper id — for this account we show only username, not displayName. */
const DUMMY_FORUM_HELPER_ID = "__collabiora_forum_helper__";

export function getDisplayName(user, fallback = "Anonymous") {
  if (!user) return fallback;
  // Dummy forum helper: use only username (no displayName / "Forum Helper" label)
  if (user._id === DUMMY_FORUM_HELPER_ID) {
    return (user.username || "").trim() || fallback;
  }
  // API may send displayName for researchers (Dr. Name, MD PHD)
  if (user.displayName && String(user.displayName).trim()) {
    return user.displayName.trim();
  }
  // Researcher without displayName: build from name/username; do not add Dr/credentials if already present (e.g. dummy researchers)
  if (user.role === "researcher") {
    const name = (user.name || user.username || "").trim() || fallback;
    if (nameAlreadyHasTitleOrCredentials(name)) return name;
    const parts = [];
    if (user.profession) parts.push(String(user.profession).trim());
    if (Array.isArray(user.certifications) && user.certifications.length > 0) {
      user.certifications.forEach((c) => {
        const s = String(c).trim();
        if (s) parts.push(s);
      });
    }
    const credentials = parts.join(" ").trim();
    if (credentials) return `Dr. ${name}, ${credentials}`;
    return `Dr. ${name}`;
  }
  return (user.name || user.username || fallback).trim() || fallback;
}
