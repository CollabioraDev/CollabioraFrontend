// Username generator for anonymous usernames (HealthUnlocked style)
// Uses adjective + noun + optional number combinations

const ADJECTIVES = [
  "Calm",
  "Quiet",
  "Gentle",
  "Soft",
  "Kind",
  "Still",
  "Warm",
  "Clear",
  "Cozy",
  "Silent",
  "Tiny",
  "Care",
  "Pixel",
  "Echo",
  "Signal",
  "Funky",
  "Loop",
  "Cosmic",
  "Vibe",
  "Neon",
  "Chill",
  "Mood",
  "Health",
  "Wellness",
  "Healing",
  "Support",
  "Open",
  "Safe",
  "Blue",
  "Bright",
  "Peaceful",
  "Serene",
  "Tranquil",
  "Mellow",
  "Smooth",
  "Light",
  "Fresh",
  "Pure",
  "Sweet",
  "Calm",
  "Zen",
  "Flow",
  "Dream",
  "Star",
  "Moon",
  "Sun",
  "Sky",
  "Ocean",
  "River",
  "Forest",
];

const NOUNS = [
  "Pebble",
  "Echo",
  "Harbor",
  "Orbit",
  "Signal",
  "Bloom",
  "Lantern",
  "Anchor",
  "Waypoint",
  "Current",
  "Steps",
  "Drift",
  "Feather",
  "Loop",
  "Well",
  "Noodle",
  "Sprout",
  "Pulse",
  "Leaf",
  "Balance",
  "Beacon",
  "Comet",
  "Nest",
  "Network",
  "Compass",
  "Sphere",
  "Haven",
  "Horizon",
  "Latitude",
  "Vector",
  "Tide",
  "Journey",
  "Pathway",
  "Path",
  "Trail",
  "Bridge",
  "Gate",
  "Door",
  "Window",
  "Light",
  "Flame",
  "Spark",
  "Glow",
  "Ray",
  "Beam",
  "Wave",
  "Ripple",
  "Stream",
  "Breeze",
  "Wind",
  "Cloud",
  "Mist",
  "Dew",
  "Drop",
  "Pearl",
  "Gem",
  "Stone",
  "Rock",
  "Crystal",
  "Star",
  "Moon",
  "Sun",
  "Sky",
];

/**
 * Generate a single username
 * @param {Object} options - Configuration options
 * @param {boolean} options.withNumber - Whether to include a 3-digit number (default: false, only 30% chance)
 * @returns {string} Generated username
 */
export function generateUsername({ withNumber = false } = {}) {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  
  // Only add number 30% of the time (or if explicitly requested)
  const shouldAddNumber = withNumber || Math.random() < 0.3;
  const number = shouldAddNumber
    ? Math.floor(100 + Math.random() * 900) // 3-digit number (100-999)
    : "";

  return `${adj}${noun}${number}`;
}

/**
 * Generate unique usernames (ensures no duplicates)
 * @param {number} count - Number of unique usernames to generate (default: 3)
 * @param {boolean} withNumber - Whether to force numbers (default: false, uses 30% chance)
 * @returns {string[]} Array of unique usernames
 */
export function generateUniqueUsernames(count = 3, withNumber = false) {
  const results = new Set();

  while (results.size < count) {
    results.add(generateUsername({ withNumber }));
  }

  return Array.from(results);
}
