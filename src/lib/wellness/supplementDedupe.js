/**
 * Merge algorithm + manual supplement lines without near-duplicates
 * (e.g. "Omega-3 EPA/DHA" vs "Omega-3 EPA/DHA 1-2g/day").
 */
export function dedupeSupplementLines(lines) {
  const trimmed = lines.map((s) => String(s).trim()).filter(Boolean);
  const uniqueExact = [
    ...new Map(trimmed.map((x) => [x.toLowerCase(), x])).values(),
  ];
  return uniqueExact.filter((line) => {
    const low = line.toLowerCase();
    return !uniqueExact.some((other) => {
      if (other === line) return false;
      const ol = other.toLowerCase();
      return ol.length > low.length && ol.includes(low);
    });
  });
}
