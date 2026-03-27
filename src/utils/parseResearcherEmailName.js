/**
 * Parse display names from institutional email local parts (e.g. AKeener → "A Keener").
 * Heuristic: split before uppercase letters; format segments; derive surname as last word.
 */

/** @param {string} localPart */
export function splitLocalPartIntoSegments(localPart) {
  if (!localPart || typeof localPart !== "string") return [];
  const s = localPart.trim();
  if (!s) return [];
  const parts = [];
  let buf = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const isUpper = c === c.toUpperCase() && c !== c.toLowerCase();
    if (i > 0 && isUpper) {
      if (buf) parts.push(buf);
      buf = c;
    } else {
      buf += c;
    }
  }
  if (buf) parts.push(buf);
  return parts;
}

/** @param {string} segment */
function formatSegment(segment) {
  if (!segment) return "";
  if (segment.length === 1) return segment.toUpperCase();
  return (
    segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
  );
}

/** @param {string[]} segments */
export function formatNameFromSegments(segments) {
  return segments.map(formatSegment).filter(Boolean).join(" ");
}

/**
 * Last token for "Dear Dr. [LastName]" — last word of the display name.
 * @param {string} displayName
 */
export function deriveLastNameFromDisplayName(displayName) {
  const s = String(displayName || "").trim();
  if (!s) return "";
  const parts = s.split(/\s+/);
  return parts[parts.length - 1] || "";
}

/**
 * @param {string} email
 * @returns {{ displayName: string, lastName: string }}
 */
export function parseDisplayNameFromEmail(email) {
  const raw = String(email || "").trim();
  const at = raw.indexOf("@");
  const local = at === -1 ? raw : raw.slice(0, at);
  const segments = splitLocalPartIntoSegments(local);
  const displayName = formatNameFromSegments(segments);
  const lastName = deriveLastNameFromDisplayName(displayName);
  return { displayName, lastName };
}

const EMAIL_IN_TEXT = /[^\s,;<>]+@[^\s@]+\.[^\s@]+/gi;

/**
 * Extract unique emails from pasted text (lines, commas, leading "-" bullets).
 * @param {string} text
 * @returns {string[]}
 */
export function extractEmailsFromBulkText(text) {
  if (!text || typeof text !== "string") return [];
  const lines = text.split(/\r?\n/);
  const found = [];
  for (const line of lines) {
    let trimmed = line.trim().replace(/^[-•*]\s*/, "");
    if (!trimmed) continue;
    const chunks = trimmed
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const chunk of chunks) {
      const matches = chunk.match(EMAIL_IN_TEXT);
      if (matches) {
        for (const m of matches) found.push(m.trim());
      }
    }
  }
  const seen = new Set();
  const out = [];
  for (const e of found) {
    const lower = e.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      out.push(e);
    }
  }
  return out;
}
