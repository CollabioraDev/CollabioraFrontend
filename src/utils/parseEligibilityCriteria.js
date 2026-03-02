/**
 * Formats criteria text by cleaning up asterisks and improving readability
 * @param {string} text - The criteria text to format
 * @returns {string} Formatted text
 */
function formatCriteriaText(text) {
  if (!text) return "";
  
  // Split by lines to process each line individually
  const lines = text.split(/\r?\n/);
  const formattedLines = [];
  let inNestedList = false; // Track if we're in a nested list (after a colon)
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;
    
    // Remove leading asterisks (single or multiple) and clean up
    const cleanedLine = line.replace(/^\s*\*+\s*/, "").trim();
    if (!cleanedLine) continue;
    
    // Check if previous cleaned line ended with colon
    const prevLine = i > 0 ? lines[i - 1].trim() : "";
    const prevCleaned = prevLine.replace(/^\s*\*+\s*/, "").trim();
    const prevHasColon = prevCleaned.endsWith(":");
    
    // Check if current line is a main item (starts with common verbs)
    const isMainItem = /^(Have|Are|Must|Will|Should|Can|Do|Be|Has|Is|Was|Were|Had|Been|Need)/i.test(cleanedLine);
    
    // Update nested context: if previous line had colon, we're in nested list
    if (prevHasColon) {
      inNestedList = true;
    }
    
    // If current line ends with colon, next lines will be nested
    const currentHasColon = cleanedLine.endsWith(":");
    
    // Format the line based on context
    if (inNestedList && !isMainItem) {
      // Sub-item: indent with bullet
      formattedLines.push(`  • ${cleanedLine}`);
      // If this line doesn't end with colon, we might exit nested context
      // But wait for next main item to be sure
    } else if (isMainItem) {
      // Main item: regular bullet
      formattedLines.push(`• ${cleanedLine}`);
      // If this main item ends with colon, next items will be nested
      inNestedList = currentHasColon;
    } else {
      // Other items: add bullet if needed
      if (!cleanedLine.startsWith("•") && !cleanedLine.startsWith("-")) {
        formattedLines.push(`• ${cleanedLine}`);
      } else {
        formattedLines.push(cleanedLine);
      }
      inNestedList = currentHasColon;
    }
    
    // Reset nested context when we hit a new main item that doesn't have a colon
    if (isMainItem && !currentHasColon) {
      inNestedList = false;
    }
  }
  
  // Join lines and clean up spacing
  let result = formattedLines.join("\n");
  
  // Clean up multiple consecutive line breaks
  result = result.replace(/\n\s*\n+/g, "\n");
  
  return result.trim();
}

/**
 * Parses eligibility criteria text into inclusion and exclusion sections
 * @param {string} criteriaText - The full eligibility criteria text
 * @returns {Object} Object with inclusion and exclusion properties
 */
export function parseEligibilityCriteria(criteriaText) {
  if (!criteriaText || criteriaText === "Not specified") {
    return {
      inclusion: "",
      exclusion: "",
      hasBoth: false,
    };
  }

  const text = String(criteriaText).trim();

  // Common patterns for splitting inclusion/exclusion
  const patterns = [
    // Pattern 1: "Required criteria to participate in study:" followed by "Criteria that might exclude you from the study:"
    /Required\s+criteria\s+to\s+participate\s+in\s+study\s*:?\s*(.*?)(?=Criteria\s+that\s+might\s+exclude\s+you\s+from\s+the\s+study\s*:?\s*)/is,
    // Pattern 2: "Inclusion Criteria:" followed by "Exclusion Criteria:"
    /Inclusion\s+Criteria\s*:?\s*(.*?)(?=Exclusion\s+Criteria\s*:?\s*)/is,
    // Pattern 3: "Inclusion:" followed by "Exclusion:"
    /Inclusion\s*:?\s*(.*?)(?=Exclusion\s*:?\s*)/is,
    // Pattern 4: "INCLUSION CRITERIA" followed by "EXCLUSION CRITERIA"
    /INCLUSION\s+CRITERIA\s*:?\s*(.*?)(?=EXCLUSION\s+CRITERIA\s*:?\s*)/is,
    // Pattern 5: "Eligibility Criteria - Inclusion" followed by "Eligibility Criteria - Exclusion"
    /Eligibility\s+Criteria\s*[-–]\s*Inclusion\s*:?\s*(.*?)(?=Eligibility\s+Criteria\s*[-–]\s*Exclusion\s*:?\s*)/is,
  ];

  let inclusion = "";
  let exclusion = "";
  let hasBoth = false;

  // Try to find a pattern match
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      inclusion = match[1].trim();
      // Extract exclusion part (everything after the exclusion header)
      const exclusionMatch = text.match(/Criteria\s+that\s+might\s+exclude\s+you\s+from\s+the\s+study\s*:?\s*(.*?)$/is) ||
                            text.match(/Exclusion\s+Criteria\s*:?\s*(.*?)$/is) ||
                            text.match(/Exclusion\s*:?\s*(.*?)$/is) ||
                            text.match(/EXCLUSION\s+CRITERIA\s*:?\s*(.*?)$/is) ||
                            text.match(/Eligibility\s+Criteria\s*[-–]\s*Exclusion\s*:?\s*(.*?)$/is);
      
      if (exclusionMatch) {
        exclusion = exclusionMatch[1].trim();
        hasBoth = true;
      }
      break;
    }
  }

  // If no pattern matched, try to split by common delimiters
  if (!hasBoth) {
    // Check if text contains both inclusion and exclusion keywords
    const hasInclusionKeyword = /inclusion/i.test(text);
    const hasExclusionKeyword = /exclusion/i.test(text);

    if (hasInclusionKeyword && hasExclusionKeyword) {
      // Try to split by finding the exclusion keyword position (check for new format first)
      let exclusionIndex = text.search(/Criteria\s+that\s+might\s+exclude\s+you\s+from\s+the\s+study\s*:?/i);
      if (exclusionIndex === -1) {
        exclusionIndex = text.search(/exclusion\s+(criteria\s*)?:?/i);
      }
      if (exclusionIndex > 0) {
        inclusion = text.substring(0, exclusionIndex).trim();
        // Remove the exclusion header and get the rest
        const exclusionPart = text.substring(exclusionIndex);
        const exclusionMatch = exclusionPart.match(/Criteria\s+that\s+might\s+exclude\s+you\s+from\s+the\s+study\s*:?\s*(.*?)$/is) ||
                              exclusionPart.match(/exclusion\s+(criteria\s*)?:?\s*(.*?)$/is);
        if (exclusionMatch) {
          exclusion = exclusionMatch[1] || exclusionMatch[2] || exclusionMatch[0].replace(/(Criteria\s+that\s+might\s+exclude\s+you\s+from\s+the\s+study|exclusion\s+(criteria\s*)?)\s*:?\s*/i, "").trim();
          hasBoth = true;
        }
      }
    }
  }

  // If still no split found, treat entire text as inclusion (common case)
  if (!hasBoth && text) {
    inclusion = text;
    exclusion = "";
    hasBoth = false;
  }

  // Clean up any label text that might have been included in the content
  // Remove labels from the beginning and also remove any repeated labels within the content
  const cleanInclusion = inclusion
    .replace(/^Required\s+criteria\s+to\s+participate\s+in\s+study\s*:?\s*/i, "")
    .replace(/^Inclusion\s+Criteria\s*:?\s*/i, "")
    .replace(/^Inclusion\s*:?\s*/i, "")
    .replace(/\n\s*Required\s+criteria\s+to\s+participate\s+in\s+study\s*:?\s*/gi, "\n")
    .replace(/\n\s*Inclusion\s+Criteria\s*:?\s*/gi, "\n")
    .replace(/\n\s*Inclusion\s*:?\s*/gi, "\n")
    .trim();
  
  const cleanExclusion = exclusion
    .replace(/^Criteria\s+that\s+might\s+exclude\s+you\s+from\s+the\s+study\s*:?\s*/i, "")
    .replace(/^Exclusion\s+Criteria\s*:?\s*/i, "")
    .replace(/^Exclusion\s*:?\s*/i, "")
    .replace(/\n\s*Criteria\s+that\s+might\s+exclude\s+you\s+from\s+the\s+study\s*:?\s*/gi, "\n")
    .replace(/\n\s*Exclusion\s+Criteria\s*:?\s*/gi, "\n")
    .replace(/\n\s*Exclusion\s*:?\s*/gi, "\n")
    .trim();

  // Format the criteria text for better display
  const formattedInclusion = cleanInclusion ? formatCriteriaText(cleanInclusion) : "";
  const formattedExclusion = cleanExclusion ? formatCriteriaText(cleanExclusion) : "";

  return {
    inclusion: formattedInclusion,
    exclusion: formattedExclusion,
    hasBoth: hasBoth && formattedInclusion && formattedExclusion,
  };
}

