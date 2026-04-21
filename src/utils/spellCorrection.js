import { buildSuggestionPool } from "./smartSuggestions.js";

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - Edit distance
 */
function levenshteinDistance(a, b) {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  
  if (aLower === bLower) return 0;
  if (aLower.length === 0) return bLower.length;
  if (bLower.length === 0) return aLower.length;

  const matrix = [];
  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= aLower.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      if (bLower.charAt(i - 1) === aLower.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[bLower.length][aLower.length];
}

/**
 * Calculate similarity score between two strings (0-1, where 1 is identical)
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - Similarity score
 */
function similarityScore(a, b) {
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;
  return 1 - distance / maxLength;
}

/**
 * Check if a word might be a typo based on similarity threshold
 * @param {string} word - Word to check
 * @param {string} candidate - Candidate word to compare against
 * @param {number} threshold - Minimum similarity threshold (0-1)
 * @returns {boolean} - True if candidate is a likely correction
 */
function isLikelyCorrection(word, candidate, threshold = 0.7) {
  if (word.toLowerCase() === candidate.toLowerCase()) return false; // Exact match, not a correction
  
  // For short words (3 chars or less), require exact match or very high similarity
  if (word.length <= 3) {
    return similarityScore(word, candidate) >= 0.85;
  }
  
  // For longer words, use the threshold
  return similarityScore(word, candidate) >= threshold;
}

/** Max terms to consider for spell correction (avoids slow Levenshtein over huge pools) */
const MAX_POOL_FOR_SPELL_CHECK = 350;

/**
 * Clinical head nouns in eponymous / formal disease names ("Huntington disease", "Crohn disease").
 * The suggestion pool often contains plural phrases ("Infectious Diseases"), so naive similarity
 * would wrongly rewrite "disease" → "diseases". Never spell-correct these tokens.
 */
const CLINICAL_NAME_TOKENS_NO_SPELL_REPLACE = new Set([
  "disease",
  "syndrome",
  "disorder",
]);

/**
 * Get spell correction suggestions for a query
 * @param {string} query - Search query to correct
 * @param {string[]} extraTerms - Additional terms to consider (e.g., medical interests)
 * @param {number} maxSuggestions - Maximum number of suggestions to return
 * @param {number} similarityThreshold - Minimum similarity threshold (0-1)
 * @returns {string[]} - Array of corrected suggestions
 */
export function getSpellCorrections(
  query,
  extraTerms = [],
  maxSuggestions = 3,
  similarityThreshold = 0.7
) {
  if (!query || !query.trim()) return [];

  const queryLower = query.trim().toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
  const fullPool = buildSuggestionPool(extraTerms);
  const pool =
    fullPool.length > MAX_POOL_FOR_SPELL_CHECK
      ? fullPool.slice(0, MAX_POOL_FOR_SPELL_CHECK)
      : fullPool;

  // If query is a single word, try to correct it
  if (queryWords.length === 1) {
    const word = queryWords[0];
    
    // Find similar words
    const corrections = pool
      .map(term => {
        // Check if any word in the term matches
        const termWords = term.toLowerCase().split(/\s+/);
        let bestMatch = null;
        let bestScore = 0;
        
        for (const termWord of termWords) {
          if (isLikelyCorrection(word, termWord, similarityThreshold)) {
            const score = similarityScore(word, termWord);
            if (score > bestScore) {
              bestScore = score;
              bestMatch = term; // Return the full term, not just the word
            }
          }
        }
        
        return bestMatch ? { term: bestMatch, score: bestScore } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions)
      .map(item => item.term);
    
    return corrections;
  }

  // For multi-word queries, try to correct each word
  const correctedQueries = [];
  
  for (let i = 0; i < queryWords.length; i++) {
    const word = queryWords[i];
    const corrections = pool
      .map(term => {
        const termWords = term.toLowerCase().split(/\s+/);
        for (const termWord of termWords) {
          if (isLikelyCorrection(word, termWord, similarityThreshold)) {
            const score = similarityScore(word, termWord);
            return { term: termWord, score, fullTerm: term };
          }
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 1); // Take best match for each word
    
    if (corrections.length > 0) {
      // Replace the word in the query with the correction
      const correctedWords = [...queryWords];
      correctedWords[i] = corrections[0].term;
      correctedQueries.push(correctedWords.join(" "));
    }
  }
  
  return correctedQueries.slice(0, maxSuggestions);
}

/**
 * Auto-correct a query by replacing misspelled words with suggestions
 * @param {string} query - Search query to auto-correct
 * @param {string[]} extraTerms - Additional terms to consider
 * @returns {string} - Auto-corrected query, or original if no corrections found
 */
export function autoCorrectQuery(query, extraTerms = []) {
  if (!query || !query.trim()) return query;

  const queryLower = query.trim().toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
  const pool = buildSuggestionPool(extraTerms);
  
  // Create a set of all valid words from the pool
  const validWords = new Set();
  pool.forEach(term => {
    term.toLowerCase().split(/\s+/).forEach(word => {
      if (word.length > 2) validWords.add(word);
    });
  });
  
  // Check each word in the query
  const correctedWords = queryWords.map(word => {
    if (CLINICAL_NAME_TOKENS_NO_SPELL_REPLACE.has(word)) return word;

    // If word is already in valid words, keep it
    if (validWords.has(word)) return word;
    
    // Find best match
    let bestMatch = null;
    let bestScore = 0;
    
    for (const validWord of validWords) {
      if (isLikelyCorrection(word, validWord, 0.75)) {
        const score = similarityScore(word, validWord);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = validWord;
        }
      }
    }
    
    return bestMatch || word; // Return correction if found, otherwise keep original
  });
  
  const correctedQuery = correctedWords.join(" ");
  
  // Only return corrected query if it's different from original
  if (correctedQuery.toLowerCase() !== queryLower) {
    return correctedQuery;
  }
  
  return query; // Return original if no corrections
}

