/**
 * Test examples for keyword splitting and autocorrect functionality
 * Run these manually in browser console or with a test runner
 */

import { splitIntoKeywords, processKeywordInput } from './keywordSplitter.js';

// Test cases demonstrating the functionality
const testCases = [
  {
    description: "User's example: functional neurological disorders treatment",
    input: "functional neurological disorders treatment",
    expectedKeywords: ["Functional Neurological Disorders", "Treatment"],
    expectedCount: 2
  },
  {
    description: "Multiple medical conditions",
    input: "diabetes and cardiovascular disease",
    expectedKeywords: ["Diabetes", "Cardiovascular"],
    expectedCount: 2
  },
  {
    description: "Medical specialty with treatment",
    input: "cardiology immunotherapy",
    expectedKeywords: ["Cardiology", "Immunotherapy"],
    expectedCount: 2
  },
  {
    description: "Complex query with multiple concepts",
    input: "multiple sclerosis treatment and rehabilitation",
    expectedKeywords: ["Multiple Sclerosis", "Treatment", "Rehabilitation"],
    expectedCount: 3
  },
  {
    description: "Misspelled terms (autocorrect)",
    input: "cardiolgy treatmnt",
    expectedKeywords: ["Cardiology", "Treatment"],
    expectedCount: 2
  },
  {
    description: "Long medical phrase with action",
    input: "functional neurological disorder diagnosis and management",
    expectedKeywords: ["Functional Neurological Disorder", "Diagnosis", "Management"],
    expectedCount: 3
  },
  {
    description: "Research-related query",
    input: "clinical trials for cancer treatment",
    expectedKeywords: ["Clinical Trials", "Cancer", "Treatment"],
    expectedCount: 3
  },
  {
    description: "PMID - should stay as single keyword",
    input: "12345678",
    expectedKeywords: ["12345678"],
    expectedCount: 1
  },
  {
    description: "PMC ID - should stay as single keyword",
    input: "PMC7654321",
    expectedKeywords: ["PMC7654321"],
    expectedCount: 1
  },
  {
    description: "Long publication title - should stay as single keyword",
    input: "A systematic review and meta-analysis of the effectiveness of cognitive behavioral therapy for functional neurological disorders",
    expectedKeywords: ["A systematic review and meta-analysis of the effectiveness of cognitive behavioral therapy for functional neurological disorders"],
    expectedCount: 1
  },
  {
    description: "Title with 'study' keyword - should stay as single keyword",
    input: "The role of inflammation in cardiovascular disease: a comprehensive study of 10000 patients",
    expectedKeywords: ["The role of inflammation in cardiovascular disease: a comprehensive study of 10000 patients"],
    expectedCount: 1
  }
];

/**
 * Run all test cases
 */
export function runTests() {
  console.log("=== Keyword Splitting & Autocorrect Tests ===\n");
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.description}`);
    console.log(`Input: "${testCase.input}"`);
    
    try {
      const result = splitIntoKeywords(testCase.input);
      console.log(`Output: [${result.map(k => `"${k}"`).join(", ")}]`);
      console.log(`Expected: [${testCase.expectedKeywords.map(k => `"${k}"`).join(", ")}]`);
      
      if (result.length === testCase.expectedCount) {
        console.log("✓ PASSED - Correct number of keywords");
        passed++;
      } else {
        console.log(`✗ FAILED - Expected ${testCase.expectedCount} keywords, got ${result.length}`);
        failed++;
      }
    } catch (error) {
      console.log(`✗ ERROR: ${error.message}`);
      failed++;
    }
    
    console.log("---\n");
  });
  
  console.log(`\n=== Results ===`);
  console.log(`Passed: ${passed}/${testCases.length}`);
  console.log(`Failed: ${failed}/${testCases.length}`);
}

/**
 * Interactive test function
 */
export function testQuery(query) {
  console.log(`\n=== Testing: "${query}" ===`);
  
  // Test with auto-split enabled
  const withSplit = processKeywordInput(query, [], true);
  console.log("\nWith Auto-Split:");
  console.log("Keywords:", withSplit.keywords);
  console.log("Corrections:", withSplit.corrections);
  
  // Test with auto-split disabled
  const withoutSplit = processKeywordInput(query, [], false);
  console.log("\nWithout Auto-Split:");
  console.log("Keywords:", withoutSplit.keywords);
  console.log("Corrections:", withoutSplit.corrections);
}

// Example usage in console:
// import { testQuery, runTests } from './utils/keywordSplitter.test.js';
// testQuery("functional neurological disorders treatment");
// runTests();

export default {
  runTests,
  testQuery,
  testCases
};
