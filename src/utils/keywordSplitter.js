import { buildSuggestionPool } from "./smartSuggestions.js";
import { autoCorrectQuery } from "./spellCorrection.js";

/** Minimum length for a single-word keyword to be kept (avoids "is", "be", "as", etc.). */
const MIN_KEYWORD_LENGTH = 2;

/** Generic modifier words that should be split off from preceding condition phrases (e.g. "PCOS treatment" → "PCOS", "treatment"). */
const GENERIC_TRAILING_WORDS = new Set([
  "treatment",
  "treatments",
  "therapy",
  "therapies",
]);

const MEDICAL_CANONICAL_PHRASES = [
  "Parkinson Disease",
  "Stem Cell Therapy",
  "Stem Cells",
  "Regenerative Medicine",
];

const KEEP_AS_SINGLE_PHRASE = new Set(["stem cell therapy"]);

/** Stop words: filler, articles, conjunctions, prepositions, question words, and other non-search terms. */
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "nor", "so", "yet", "both", "either", "neither",
  "of", "in", "for", "to", "with", "on", "at", "by", "from", "as", "into", "through",
  "during", "before", "after", "above", "below", "between", "under", "again", "further",
  "then", "once", "here", "there", "when", "where", "why", "how", "what", "which",
  "who", "whom", "whose", "that", "this", "these", "those", "is", "are", "was", "were",
  "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "must", "shall", "can", "need", "dare", "ought",
  "used", "get", "gets", "got", "getting", "about", "overall", "general", "good",
  "than", "lead", "leads", "leading", "into", "vs", "versus", "vs.", "other", "others",
  "just", "also", "only", "very", "some", "such", "any", "all", "each", "every",
  "both", "few", "more", "most", "much", "many", "less", "same", "different",
]);

/**
 * Check if input looks like a publication title or ID
 * @param {string} query - The query to check
 * @returns {boolean} - True if it looks like a title or ID
 */
function looksLikeTitle(query) {
  const trimmed = query.trim();
  
  // Check if it's a PMID/PMC ID (numeric or PMC followed by numbers)
  if (/^(PMC)?\d+$/i.test(trimmed)) {
    return true;
  }
  
  // If it's longer than 30 characters and doesn't have obvious keyword separators,
  // it's likely a publication title
  if (trimmed.length > 30) {
    // Check if it has title-like characteristics:
    // - Contains common title words (study, analysis, effect, treatment, etc.)
    // - Has proper sentence structure (capitalization, punctuation)
    // - Doesn't have obvious keyword separators like "and treatment"
    const titleIndicators = /\b(study|analysis|effect|impact|role|investigation|evaluation|assessment|systematic review|meta-analysis|randomized|trial|cohort|case|report|review)\b/i;
    
    if (titleIndicators.test(trimmed)) {
      return true;
    }
    
    // If it's very long (>50 chars) and has multiple words, likely a title
    if (trimmed.length > 50 && trimmed.split(/\s+/).length >= 5) {
      return true;
    }
  }
  
  return false;
}

function normalizeMedicalPhraseKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bparkinsons\b/g, "parkinson")
    .replace(/\btherapies\b/g, "therapy")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Intelligently split a search query into meaningful keywords/phrases
 * Identifies known medical terms and separates them from standalone words
 * Special handling for publication titles and IDs
 * 
 * @param {string} query - The search query to split
 * @param {string[]} extraTerms - Additional terms to consider (e.g., user medical interests)
 * @returns {string[]} - Array of identified keywords/phrases
 */
export function splitIntoKeywords(query, extraTerms = []) {
  if (!query || !query.trim()) return [];
  
  const normalizedQuery = query.trim();
  
  // Special case: If the input looks like a publication title or PMID/PMC ID,
  // don't split it - keep it as a single keyword
  if (looksLikeTitle(normalizedQuery)) {
    return [normalizedQuery];
  }
  
  const normalizedQueryLower = normalizedQuery.toLowerCase();
  const queryWords = normalizedQueryLower.split(/\s+/);
  const originalWords = normalizedQuery.split(/\s+/); // preserve casing for proper nouns
  const pool = buildSuggestionPool([...MEDICAL_CANONICAL_PHRASES, ...extraTerms]);

  // Build a list of known medical terms sorted by length (longest first)
  const knownTerms = pool
    .map(term => ({
      original: term,
      lower: term.toLowerCase(),
      key: normalizeMedicalPhraseKey(term),
      length: term.split(/\s+/).length
    }))
    .sort((a, b) => b.length - a.length);

  const matchedIndices = new Set();
  const identifiedKeywords = [];
  
  // First pass: identify known medical phrases
  for (let i = 0; i < queryWords.length; i++) {
    if (matchedIndices.has(i)) continue;
    
    // Try to match increasingly longer phrases starting from this position
    for (let len = Math.min(6, queryWords.length - i); len >= 2; len--) {
      const phrase = queryWords.slice(i, i + len).join(" ");
      
      // Check if this phrase matches any known term (exact match preferred)
      const phraseKey = normalizeMedicalPhraseKey(phrase);
      const matchedTerm = knownTerms.find(term => {
        // Exact match (case insensitive)
        if (term.lower === phrase || term.key === phraseKey) return true;
        
        // For multi-word phrases, check if the phrase exactly matches a known term
        if (len > 1) {
          // Check if the known term contains this exact phrase as a substring
          const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          return regex.test(term.lower);
        }
        
        return false;
      });
      
      if (matchedTerm) {
        // Found a match, mark these indices as used
        for (let j = i; j < i + len; j++) {
          matchedIndices.add(j);
        }
        identifiedKeywords.push({
          text: queryWords.slice(i, i + len).join(" "),
          startIndex: i,
          endIndex: i + len - 1,
          matchedTerm: matchedTerm.original
        });
        break;
      }
    }
  }
  
  // Second pass: collect remaining unmatched words (lowercase for logic, keep original indices for casing)
  const remainingWithIndex = [];
  for (let i = 0; i < queryWords.length; i++) {
    if (!matchedIndices.has(i)) {
      remainingWithIndex.push({ lower: queryWords[i], original: originalWords[i] ?? queryWords[i], index: i });
    }
  }

  // Build chunks from remaining words; treat stop words as separators and skip filler-only chunks
  let currentChunk = [];
  let currentChunkOriginal = [];

  for (let i = 0; i < remainingWithIndex.length; i++) {
    const { lower: word, original } = remainingWithIndex[i];

    if (STOP_WORDS.has(word)) {
      if (currentChunk.length > 0) {
        const chunkText = currentChunk.join(" ").trim();
        const chunkOriginal = currentChunkOriginal.join(" ").trim();
        const isMeaningful = chunkText.length >= MIN_KEYWORD_LENGTH &&
          !/^\d+$/.test(chunkText) &&
          !chunkText.split(/\s+/).every(w => STOP_WORDS.has(w));
        if (isMeaningful) {
          identifiedKeywords.push({
            text: chunkOriginal, // preserve casing (proper nouns)
            startIndex: -1
          });
        }
        currentChunk = [];
        currentChunkOriginal = [];
      }
    } else {
      currentChunk.push(word);
      currentChunkOriginal.push(original);
    }
  }

  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join(" ").trim();
    const chunkOriginal = currentChunkOriginal.join(" ").trim();
    const isMeaningful = chunkText.length >= MIN_KEYWORD_LENGTH &&
      !/^\d+$/.test(chunkText) &&
      !chunkText.split(/\s+/).every(w => STOP_WORDS.has(w));
    if (isMeaningful) {
      identifiedKeywords.push({
        text: chunkOriginal,
        startIndex: -1
      });
    }
  }
  
  // Sort by original position (known terms first, then remaining words)
  identifiedKeywords.sort((a, b) => {
    if (a.startIndex === -1 && b.startIndex === -1) return 0;
    if (a.startIndex === -1) return 1;
    if (b.startIndex === -1) return -1;
    return a.startIndex - b.startIndex;
  });
  
  // Apply autocorrect to each identified keyword
  let correctedKeywords = identifiedKeywords.map(kw => {
    if (kw.matchedTerm) return kw.matchedTerm;
    return autoCorrectQuery(kw.text, extraTerms);
  });

  // Keep only meaningful keywords: not empty, not stop words, minimum length, not pure digits
  let meaningful = correctedKeywords.filter(k => {
    const t = (k && k.trim()) || "";
    if (t.length < MIN_KEYWORD_LENGTH) return false;
    if (STOP_WORDS.has(t.toLowerCase())) return false;
    if (/^\d+$/.test(t)) return false;
    return true;
  });

  // Post-process: if a keyword ends with a generic trailing word like "treatment",
  // split it into [condition phrase, trailing word] so chips and counts treat them separately.
  const expanded = [];
  for (const k of meaningful) {
    const original = (k || "").trim();
    if (!original) continue;
    const lower = original.toLowerCase();
    const parts = original.split(/\s+/);

    if (parts.length > 1 && !KEEP_AS_SINGLE_PHRASE.has(lower)) {
      const last = parts[parts.length - 1].toLowerCase();
      if (GENERIC_TRAILING_WORDS.has(last)) {
        const head = parts.slice(0, -1).join(" ").trim();
        if (
          head.length >= MIN_KEYWORD_LENGTH &&
          !STOP_WORDS.has(head.toLowerCase())
        ) {
          expanded.push(head);
        }
        expanded.push(parts[parts.length - 1]); // keep trailing word with original casing
        continue;
      }
    }

    expanded.push(original);
  }

  return [...new Set(expanded)];
}

/**
 * Enhanced keyword addition that can split input into multiple keywords
 * 
 * @param {string} input - The input text to process
 * @param {string[]} extraTerms - Additional terms for autocorrect
 * @param {boolean} autoSplit - Whether to automatically split into multiple keywords
 * @returns {Object} - Object containing keywords array and correction messages
 */
export function processKeywordInput(input, extraTerms = [], autoSplit = true) {
  if (!input || !input.trim()) {
    return { keywords: [], corrections: [] };
  }
  
  // Special case: If input is a PMID/PMC ID or looks like a title,
  // keep it as-is without modification (no autocorrect for IDs/titles)
  const trimmedInput = input.trim();
  if (/^(PMC)?\d+$/i.test(trimmedInput) || looksLikeTitle(trimmedInput)) {
    return { keywords: [trimmedInput], corrections: [] };
  }
  
  if (!autoSplit) {
    // Single keyword mode - just autocorrect the whole input
    const corrected = autoCorrectQuery(trimmedInput, extraTerms);
    const corrections = [];
    
    if (corrected.toLowerCase() !== trimmedInput.toLowerCase()) {
      corrections.push({
        original: trimmedInput,
        corrected: corrected
      });
    }
    
    return { keywords: [corrected], corrections };
  }
  
  // Multi-keyword mode - split and autocorrect
  const keywords = splitIntoKeywords(trimmedInput, extraTerms);
  const corrections = [];
  
  // Check if any corrections were made
  const reconstructed = keywords.join(" ").toLowerCase();
  const originalLower = trimmedInput.toLowerCase();
  
  if (reconstructed !== originalLower && keywords.length > 0) {
    // Determine what changed
    keywords.forEach(kw => {
      // Find if this keyword was corrected from something in the original
      const kwLower = kw.toLowerCase();
      if (!originalLower.includes(kwLower)) {
        // This might be a correction
        const originalWords = originalLower.split(/\s+/);
        const kwWords = kwLower.split(/\s+/);
        
        // Simple heuristic: if lengths match and words are similar, it's a correction
        if (originalWords.length === kwWords.length) {
          corrections.push({
            original: originalWords.join(" "),
            corrected: kw
          });
        }
      }
    });
  }
  
  return { keywords, corrections };
}
