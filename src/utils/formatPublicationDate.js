const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTH_NAMES_LOWER = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/**
 * Normalize PubMed/API month (numeric string, full name, or abbr) to short label.
 * @param {string|number|null|undefined} month
 * @returns {string}
 */
function monthToShort(month) {
  if (month == null || month === "") return "";
  const s = String(month).trim();
  if (!s) return "";
  const n = parseInt(s, 10);
  if (Number.isFinite(n) && n >= 1 && n <= 12) return MONTH_SHORT[n - 1];
  const lower = s.toLowerCase();
  for (let i = 0; i < 12; i++) {
    if (
      lower === MONTH_NAMES_LOWER[i] ||
      lower === MONTH_SHORT[i].toLowerCase()
    ) {
      return MONTH_SHORT[i];
    }
  }
  if (/^[A-Za-z]{3,9}$/.test(s)) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }
  return s;
}

/**
 * e.g. "Oct 2025", "Jan 2026". Year-only when month missing.
 * @param {string|number|null|undefined} month
 * @param {string|number|null|undefined} year
 * @returns {string}
 */
export function formatPublicationMonthYear(month, year) {
  const y =
    year != null && String(year).trim() !== "" ? String(year).trim() : "";
  const mShort = monthToShort(month);
  if (mShort && y) return `${mShort} ${y}`;
  if (y) return y;
  if (mShort) return mShort;
  return "";
}

/**
 * For detail views: "Jan 15, 2026" when day present, else same as formatPublicationMonthYear.
 * @param {string|number|null|undefined} month
 * @param {string|number|null|undefined} year
 * @param {string|number|null|undefined} day
 * @returns {string}
 */
export function formatPublicationDateLine(month, year, day) {
  const y =
    year != null && String(year).trim() !== "" ? String(year).trim() : "";
  const mShort = monthToShort(month);
  const d =
    day != null && String(day).trim() !== "" ? String(day).trim() : "";
  if (mShort && d && y) return `${mShort} ${d}, ${y}`;
  const my = formatPublicationMonthYear(month, year);
  if (my) return my;
  if (y) return y;
  return "N/A";
}
