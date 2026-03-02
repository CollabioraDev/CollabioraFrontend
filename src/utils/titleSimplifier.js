/**
 * Service for simplifying publication titles using AI
 * Includes caching to avoid repeated API calls for the same title
 */

// In-memory cache for simplified titles
const titleCache = new Map();

// Cache expiration time (24 hours)
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

/**
 * Get simplified title from cache or API
 * @param {string} originalTitle - The original publication title
 * @param {string} baseUrl - Base API URL
 * @returns {Promise<string>} - Simplified title
 */
export async function getSimplifiedTitle(originalTitle, baseUrl = "") {
  if (!originalTitle || typeof originalTitle !== "string") {
    return originalTitle || "";
  }

  // If title is already short, return as is
  if (originalTitle.length <= 60) {
    return originalTitle;
  }

  // Check cache first
  const cacheKey = originalTitle.toLowerCase().trim();
  const cached = titleCache.get(cacheKey);

  if (cached) {
    // Check if cache is still valid
    if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
      return cached.simplifiedTitle;
    } else {
      // Remove expired cache entry
      titleCache.delete(cacheKey);
    }
  }

  // If already fetching this title, return a promise that resolves when done
  if (cached && cached.pending) {
    return cached.pending;
  }

  // Create a promise for this request
  const fetchPromise = fetch(`${baseUrl}/api/ai/simplify-title`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: originalTitle }),
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Failed to simplify title");
      }
      const data = await response.json();
      const simplified = data.simplifiedTitle || originalTitle;

      // Cache the result
      titleCache.set(cacheKey, {
        simplifiedTitle: simplified,
        timestamp: Date.now(),
        pending: null,
      });

      return simplified;
    })
    .catch((error) => {
      console.error("Error simplifying title:", error);
      // On error, cache the original title to avoid repeated failed requests
      titleCache.set(cacheKey, {
        simplifiedTitle: originalTitle,
        timestamp: Date.now(),
        pending: null,
      });
      return originalTitle;
    });

  // Store pending promise in cache
  titleCache.set(cacheKey, {
    simplifiedTitle: originalTitle, // Temporary fallback
    timestamp: Date.now(),
    pending: fetchPromise,
  });

  return fetchPromise;
}

/**
 * Clear the title cache (useful for testing or memory management)
 */
export function clearTitleCache() {
  titleCache.clear();
}

/**
 * Get cache size (for debugging)
 */
export function getCacheSize() {
  return titleCache.size;
}

