/**
 * collabiora wellness quiz — deterministic rule engine (v1.0 spec).
 * @see product spec: Wellness Quiz Algorithm
 */

/** @typedef {'young'|'mid'|'older'} Age */
/** @typedef {'f'|'m'|'other'} Sex */
/** @typedef {'prev'|'manage'|'weight'|'energy'} Goal */
/** @typedef {'none'|'dm'|'htn'|'cvd'|'osteo'|'thyroid'|'ibs'|'neuro'} Comorbidity */
/** @typedef {'varied'|'plantbased'|'lowcarb'|'processed'|'unsure'} Diet */
/** @typedef {'sedentary'|'light'|'moderate'|'active'} Activity */

/**
 * @param {Age} age
 * @param {Sex} sex
 * @param {Goal} goal
 * @param {Set<Comorbidity>|Comorbidity[]} co
 * @param {Diet} diet
 * @param {Activity} activity
 */
export function getWellnessPlan(age, sex, goal, co, diet, activity) {
  const comorb = co instanceof Set ? co : new Set(co);

  let dietTags = [];
  let dietNote = "";
  let exTags = [];
  let exNote = "";
  /** @type {Set<string>} */
  const vitTags = new Set();
  let vitNote = "";
  const cautions = [];

  // --- DIET (priority: comorbidity > goal > default) ---
  if (comorb.has("dm")) {
    dietTags = ["Low glycaemic index", "Mediterranean", "Limit refined carbs"];
    dietNote =
      "Distribute carbs across 3 meals; aim for 25g fibre daily.";
  } else if (comorb.has("cvd")) {
    dietTags = ["Mediterranean", "DASH", "Low saturated fat"];
    dietNote =
      "Aim for fatty fish 2x per week. Keep sodium below 2,300mg daily.";
  } else if (comorb.has("htn")) {
    dietTags = ["DASH", "Low sodium", "High potassium foods"];
    dietNote =
      "Target sodium below 1,500mg/day. Potassium-rich foods (unless kidney disease).";
  } else if (comorb.has("ibs")) {
    dietTags = ["Low-FODMAP trial", "Anti-inflammatory"];
    dietNote =
      "Use Low-FODMAP as short-term reset; reintroduce foods systematically.";
  } else if (goal === "weight") {
    dietTags = ["Mediterranean", "Higher protein", "Moderate caloric deficit"];
    dietNote =
      "Aim for 1.2-1.6g protein per kg bodyweight.";
  } else if (goal === "energy") {
    dietTags = ["Anti-inflammatory", "Low glycaemic index", "Whole foods"];
    dietNote =
      "Avoid blood sugar spikes. Eat regular meals; limit ultra-processed food.";
  } else {
    dietTags = ["Mediterranean", "Plant-forward", "Whole foods"];
    dietNote =
      "The Mediterranean pattern has the strongest evidence base for long-term health and longevity.";
  }

  if (diet === "processed") {
    dietNote +=
      " Reducing ultra-processed foods is the single highest-impact dietary change you can make.";
  }

  // --- EXERCISE ---
  const base =
    age === "older"
      ? "150 min moderate aerobic/wk"
      : "150-300 min moderate aerobic/wk";

  if (comorb.has("cvd")) {
    exTags = ["Supervised cardiac rehab", "Low-moderate intensity"];
    exNote =
      "Keep heart rate at 40-60% of max. Avoid heavy lifting until cleared by doctor.";
  } else if (comorb.has("dm")) {
    exTags = [
      "Resistance training 3x/wk",
      base,
      "10-min post-meal walks",
    ];
    exNote =
      "Post-meal walks are one of the most effective tools for controlling blood sugar.";
  } else if (comorb.has("osteo")) {
    exTags = [
      "Weight-bearing aerobic",
      "Resistance training",
      "Balance work",
    ];
    exNote =
      "Impact activities like brisk walking stimulate bone density. Balance training reduces fall risk.";
  } else if (comorb.has("neuro")) {
    exTags = ["Aerobic 3-5x/wk", "Balance & coordination", "Dual-task training"];
    exNote =
      "Aerobic exercise is neuroprotective. Tai chi and dance have strong evidence for neurological conditions.";
  } else if (goal === "weight") {
    exTags = ["HIIT 2x/wk", "Resistance 2-3x/wk", base];
    exNote =
      "Combining cardio and strength maximises resting metabolic rate.";
  } else if (age === "older") {
    exTags = [
      "150 min moderate aerobic/wk",
      "Strength training 2x/wk",
      "Daily flexibility & balance",
    ];
    exNote =
      "Strength and balance work become the priority after 56.";
  } else {
    exTags = [base, "Strength training 2x/wk", "Flexibility"];
    exNote =
      "Even 2 sessions of strength training per week significantly improves metabolic health.";
  }

  if (activity === "sedentary") {
    exNote +=
      " Starting small is fine - even a 10-minute daily walk is a meaningful first step.";
  }
  if (activity === "active") {
    exNote +=
      " You're already hitting activity targets - focus on training quality and recovery.";
  }

  // --- VITAMINS (additive) ---
  vitTags.add("Vitamin D3 1,000-2,000 IU/day");
  if (sex === "f" && age !== "older") vitTags.add("Iron (if menstruating)");
  if (sex === "f") vitTags.add("Folate 400-800mcg");
  if (age === "older") {
    vitTags.add("Calcium 1,200mg/day");
    vitTags.add("Vitamin B12");
    vitTags.add("Magnesium glycinate");
    vitNote +=
      "B12 absorption declines with age. Calcium from food preferred; supplement only if dietary gap. ";
  }
  if (comorb.has("cvd")) {
    vitTags.add("Omega-3 EPA/DHA 1-2g/day");
    vitTags.add("CoQ10 100-200mg");
  }
  if (comorb.has("dm")) {
    vitTags.add("Magnesium");
    vitTags.add("Alpha-lipoic acid");
  }
  if (comorb.has("htn")) vitTags.add("Magnesium 300-400mg");
  if (comorb.has("osteo")) {
    vitTags.add("Calcium 1,000-1,200mg/day");
    vitTags.add("Vitamin K2 (MK-7)");
  }
  if (comorb.has("neuro")) {
    vitTags.add("Omega-3 DHA 1-2g/day");
    vitTags.add("B-complex");
  }
  if (goal === "energy") {
    vitTags.add("B-complex");
    vitTags.add("Magnesium malate");
    vitTags.add("Ashwagandha (adaptogen)");
  }

  vitNote = vitNote.trim();

  // --- CAUTIONS ---
  if (comorb.has("cvd")) {
    cautions.push(
      "Omega-3 above 3g/day may increase bleeding risk if you take blood thinners.",
    );
  }
  if (comorb.has("dm")) {
    cautions.push(
      "Some blood sugar supplements can interact with metformin - check with your doctor first.",
    );
  }
  if (comorb.has("htn")) {
    cautions.push(
      "Do not take potassium supplements if you are on ACE inhibitors or potassium-sparing diuretics.",
    );
  }
  if (comorb.has("thyroid")) {
    cautions.push(
      "High-dose iodine is not recommended for Hashimoto's thyroiditis.",
    );
    cautions.push(
      "Biotin supplements interfere with thyroid blood test results - stop 3 days before labs.",
    );
  }

  return {
    dietTags,
    dietNote,
    exTags,
    exNote,
    vitTags: [...vitTags],
    vitNote,
    cautions,
  };
}

/**
 * @param {Age} age
 * @param {Goal} goal
 */
export function getIntroLine(age, goal) {
  if (age === "older") {
    return "With your health profile, here is a personalised wellness snapshot from Yori.";
  }
  if (goal === "prev") {
    return "Great starting point. Here is a personalised wellness snapshot from Yori.";
  }
  return "Based on your goals, here is a personalised wellness snapshot from Yori.";
}

export const DISCLAIMER =
  "This snapshot is for general wellness education only and is not medical advice. Always consult your healthcare provider before making changes to your diet, exercise routine, or supplements.";
