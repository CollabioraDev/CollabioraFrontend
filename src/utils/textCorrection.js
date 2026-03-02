/**
 * Simple capitalization helper for text inputs
 * @param {string} text - The text to capitalize
 * @returns {string} - Capitalized text
 */
export function capitalizeText(text) {
  if (!text || typeof text !== "string") return text;
  
  const trimmedText = text.trim();
  if (!trimmedText) return trimmedText;
  
  return trimmedText
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      // Keep abbreviations uppercase if they're all caps (e.g., AI, HIV, COVID-19)
      if (word.length <= 4 && word === word.toUpperCase()) {
        return word;
      }
      // Handle words with apostrophes (e.g., "don't" -> "Don't")
      if (word.includes("'")) {
        const parts = word.split("'");
        return parts
          .map((part) => {
            if (!part) return part;
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          })
          .join("'");
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Process comma-separated values with capitalization
 * @param {string} text - Comma-separated text
 * @returns {string} - Capitalized comma-separated text
 */
export function capitalizeCommaSeparated(text) {
  if (!text || typeof text !== "string") {
    return text || "";
  }

  const items = text.split(",").map((item) => item.trim()).filter(Boolean);
  
  if (items.length === 0) {
    return "";
  }

  // Process each item
  const capitalizedItems = items.map((item) => capitalizeText(item));

  return capitalizedItems.join(", ");
}

