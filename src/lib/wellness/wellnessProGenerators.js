/**
 * Pro tier: deterministic meal + exercise copy (no ML) layered on getWellnessPlan.
 */

/**
 * @param {string[]} dislikes - foods to avoid mentioning
 * @param {string} line
 */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function avoidDislikes(dislikes, line) {
  let out = line;
  for (const d of dislikes) {
    const t = d.trim();
    if (t.length < 2) continue;
    try {
      const re = new RegExp(`\\b${escapeRegExp(t)}\\b`, "gi");
      out = out.replace(re, "an alternative you enjoy");
    } catch {
      /* ignore */
    }
  }
  return out;
}

function applyFoodLikes(likes, line) {
  const t = String(likes || "").trim();
  if (!t) return line;
  return `${line} Preference cue: where it fits, include or season toward ${t}.`;
}

/** Illustrative maintenance-style band for UI copy only — not medical advice. */
export function estimatedMaintenanceKcalRange(profile) {
  const { age = "mid", sex = "f", activity = "light" } = profile || {};
  let low = 1650;
  let high = 2150;
  if (age === "young") {
    low += 100;
    high += 250;
  }
  if (age === "older") {
    low -= 150;
    high -= 150;
  }
  if (sex === "m") {
    low += 150;
    high += 200;
  }
  if (activity === "sedentary") {
    low -= 200;
    high -= 200;
  }
  if (activity === "moderate") {
    low += 50;
    high += 150;
  }
  if (activity === "active") {
    low += 150;
    high += 350;
  }
  low = Math.round(Math.max(1200, low) / 50) * 50;
  high = Math.round(Math.max(low + 300, high) / 50) * 50;
  return { low, high };
}

const ALT_MEAL_SETS = [
  {
    breakfast:
      "Scrambled tofu or eggs with spinach and tomatoes; wholegrain toast; fruit on the side.",
    lunch:
      "Lentil soup with a side salad (olive oil + lemon); wholegrain crackers; water.",
    dinner:
      "Baked chicken or chickpea stew; roasted root vegetables; small portion of brown rice.",
    snacks: "Pear with a small handful of walnuts; herbal tea.",
  },
  {
    breakfast:
      "Smoothie: yoghurt or soy yoghurt, oats, banana, flax; add cinnamon if you like.",
    lunch:
      "Tuna or chickpea salad sandwich on wholegrain bread; cucumber and tomato sticks.",
    dinner:
      "Stir-fry: plenty of vegetables, tofu or prawns, ginger and garlic; small portion noodles or rice.",
    snacks: "Cottage cheese or hummus with vegetable sticks.",
  },
  {
    breakfast:
      "Wholegrain cereal with milk or fortified plant milk; berries; coffee or tea without sugar.",
    lunch:
      "Grain bowl: quinoa, grilled vegetables, beans, tahini-lemon dressing.",
    dinner:
      "Fish or bean tacos on corn tortillas with slaw; salsa; lime.",
    snacks: "Orange and a few almonds; plain yoghurt if it fits your plan.",
  },
];

const WORKOUT_FOCUS_TWISTS = [
  "Emphasis today: **steady aerobic** — keep breathing controlled throughout.",
  "Emphasis today: **mobility between sets** — short walks or arm circles, not sitting still.",
  "Emphasis today: **time on feet** — accumulate minutes rather than chasing peak heart rate.",
];

/**
 * @param {ReturnType<typeof import('./getWellnessPlan.js').getWellnessPlan>} plan
 * @param {{
 *   healthFocus: 'manage'|'prevent',
 *   dislikes: string[],
 *   co: Set<string>,
 * }} ctx
 */
export function buildDailyMeals(plan, ctx) {
  const dislikes = ctx.dislikes.map((s) => s.trim()).filter(Boolean);
  const likes = String(ctx.likes || "").trim();
  const dm = ctx.co.has("dm");
  const neuro = ctx.co.has("neuro");
  const tags = plan.dietTags.join(" ").toLowerCase();
  const lowFodmap = tags.includes("fodmap") || tags.includes("low-fodmap");

  const breakfast = dm
    ? "Greek yoghurt with berries and chia; wholegrain toast with nut butter; unsweetened tea or coffee."
    : neuro
      ? "Oatmeal with walnuts and blueberries; egg or tofu scramble with vegetables; herbal tea."
      : "Overnight oats with fruit; vegetable omelette or tofu scramble; wholegrain bread.";

  const lunch = lowFodmap
    ? "Lactose-free / lower-FODMAP pick: rice or quinoa bowl with grilled protein, low-FODMAP veg (e.g. carrots, cucumber), olive oil; avoid onion/garlic if sensitive."
    : dm
      ? "Large salad with chickpeas or grilled chicken, olive oil dressing; small wholegrain pita; sparkling water."
      : "Mediterranean bowl: grains, beans, colourful vegetables, olive oil, herbs; piece of fruit.";

  const dinner = dm
    ? "Baked salmon or lentil stew; quinoa or brown rice; non-starchy vegetables; herbs and lemon instead of heavy sauces."
    : "Grilled fish or legumes; roasted vegetables; olive oil; herbs — keep sodium modest.";

  const snacks = dm
    ? "Apple with almonds; vegetable sticks with hummus; plain cottage cheese."
    : "Mixed nuts (portion-controlled); fresh fruit; yoghurt.";

  return {
    breakfast: avoidDislikes(dislikes, applyFoodLikes(likes, breakfast)),
    lunch: avoidDislikes(dislikes, applyFoodLikes(likes, lunch)),
    dinner: avoidDislikes(dislikes, applyFoodLikes(likes, dinner)),
    snacks: avoidDislikes(dislikes, applyFoodLikes(likes, snacks)),
  };
}

/**
 * Rotated template line for one meal slot (used when single-meal AI refresh fails).
 * @param {"breakfast"|"lunch"|"dinner"|"snacks"} slot
 * @param {string[]} dislikesList
 * @param {number} saltIndex
 */
export function getAlternateMealLine(slot, dislikesList, saltIndex) {
  const s = String(slot || "breakfast").toLowerCase();
  const key = ["breakfast", "lunch", "dinner", "snacks"].includes(s) ? s : "breakfast";
  const v = Math.abs(Number(saltIndex) || 0) % ALT_MEAL_SETS.length;
  const line = ALT_MEAL_SETS[v][key] || ALT_MEAL_SETS[0].breakfast;
  return avoidDislikes(dislikesList || [], line);
}

/**
 * @param {import('./getWellnessPlan.js').getWellnessPlan} plan
 * @param {{ healthFocus: 'manage'|'prevent', co: Set<string>, activity: string }} ctx
 */
export function buildDailyExercisePlan(plan, ctx) {
  const manage = ctx.healthFocus === "manage";
  const neuro = ctx.co.has("neuro");
  const cvd = ctx.co.has("cvd");

  const warmUp = "5–8 minutes: easy walking or joint circles; light dynamic stretches.";
  const main = neuro
    ? "20–30 minutes: brisk walk or stationary bike at comfortable pace; finish with 10 minutes of balance drills (tandem stance, slow stepping)."
    : cvd
      ? "15–25 minutes: walking at a conversational pace; stop if you feel chest pain, unusual shortness of breath, or dizziness."
      : "25–40 minutes: brisk walking, cycling, or elliptical — moderate effort (can talk, not sing).";

  const strength = "2 sets of 8–12 reps: sit-to-stand, row with band, calf raises — 2 non-consecutive days this week.";
  const coolDown = "5 minutes easy walking and gentle stretching.";

  const focusLine = manage
    ? "Today's emphasis: steady movement you can repeat — consistency beats intensity."
    : "Today's emphasis: build the habit — finish feeling energised, not drained.";

  if (ctx.activity === "sedentary") {
    return {
      title: "Starter day plan",
      blocks: [
        { label: "Focus", text: focusLine },
        { label: "Block 1", text: "10-minute easy walk after a meal; optional 5-minute stretch." },
        { label: "Block 2", text: "Light household mobility: 5 minutes up/down stairs or marching in place." },
        { label: "Notes", text: "If anything feels sharp or wrong, stop and check with your clinician." },
      ],
    };
  }

  return {
    title: "Today's exercise plan",
    blocks: [
      { label: "Focus", text: focusLine },
      { label: "Warm-up", text: warmUp },
      { label: "Main", text: main },
      { label: "Strength (weekly)", text: strength },
      { label: "Cool-down", text: coolDown },
    ],
  };
}

/** Evidence blurbs for diet tag links (Explore my full plan) */
export const DIET_TOPIC_BLURBS = {
  Mediterranean:
    "Mediterranean-style eating emphasises vegetables, legumes, fish, olive oil, and whole grains — patterns linked to cardiometabolic and longevity benefits in large studies.",
  "Plant-forward":
    "Plant-forward means most of the plate is plants, with optional modest animal foods — flexible and sustainable for many people.",
  "Whole foods":
    "Whole foods are minimally processed — they tend to have more fibre and fewer added sugars and salts than ultra-processed options.",
  DASH:
    "DASH highlights vegetables, fruits, low-fat dairy, and limits sodium — often used for blood pressure–friendly eating patterns.",
  "Low glycaemic index":
    "Lower-GI carbohydrates usually raise blood glucose more gently — helpful for many people managing glucose swings.",
  "Low-FODMAP trial":
    "A short Low-FODMAP trial is sometimes used for IBS symptoms under guidance, followed by structured reintroduction.",
  "Low sodium":
    "Sodium adds up from breads, sauces, and restaurant meals — tasting less salty over time is common as your palate adjusts.",
  "Low saturated fat":
    "Swapping some saturated fats for olive oil, nuts, and fish can support heart-health goals for many people.",
};

export function blurbForDietTag(tag) {
  const key = Object.keys(DIET_TOPIC_BLURBS).find(
    (k) => tag.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(tag.toLowerCase()),
  );
  return key ? DIET_TOPIC_BLURBS[key] : `${tag}: evidence-based dietary patterns are highly individual — discuss changes with your care team.`;
}

/** Short framing line before bullet ideas (breakfast / lunch / dinner). */
function mealTimePointer(slot, healthJourney) {
  const manage = healthJourney === "manage";
  if (slot === "breakfast") {
    return manage
      ? "To start your day steadily and support what you’re managing, try one of these balanced ideas:"
      : "To fuel your morning and support your energy goals, try one of these balanced ideas:";
  }
  if (slot === "lunch") {
    return manage
      ? "For a midday meal that keeps portions predictable and satisfying, consider one of these:"
      : "For a satisfying midday meal that fits your plan, consider one of these options:";
  }
  if (slot === "dinner") {
    return manage
      ? "To round out the day without overdoing portions, pick one of these nourishing paths:"
      : "Wind down the day with something nourishing and aligned with your diet themes — pick one path:";
  }
  return "";
}

/** Turn meal prose into markdown bullets (split on semicolons). */
function mealIdeasToMarkdownBullets(text) {
  const t = String(text ?? "").trim();
  if (!t) return "";
  const parts = t.split(/\s*;\s*/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return `- ${parts[0]}`;
  return parts.map((p) => `- ${p}`).join("\n");
}

function wrapMainMealBody(slot, mealText, healthJourney) {
  if (slot === "snacks") return String(mealText ?? "").trim();
  const pointer = mealTimePointer(slot, healthJourney);
  const bullets = mealIdeasToMarkdownBullets(mealText);
  if (!bullets) return pointer;
  return `${pointer}\n\n${bullets}`;
}

/**
 * Yori-style copy for today’s eating plan (deterministic; uses algorithm outputs).
 * Returns Markdown for formatted display.
 * @param {{ age?: string, sex?: string, activity?: string }} [profile] — for illustrative kcal band
 * @param {string} [extraNotes] — user free text woven into output
 * @param {string} [calorieTarget] — optional user-entered daily kcal target (display only)
 * @param {number} [variationIndex=0] — rotate alternate meal ideas
 */
export function buildYoriStyleDietToday({
  plan,
  meals,
  healthJourney,
  foodLikes,
  dislikesList,
  diet,
  profile,
  extraNotes,
  calorieTarget,
  variationIndex = 0,
}) {
  const journey =
    healthJourney === "manage"
      ? "Because you’re focused on **managing existing conditions**, today’s outline sticks to steady portions and patterns you can repeat — small, sustainable shifts beat perfection."
      : "Because you’re focused on **prevention and long-term health**, today’s outline leans on plants, fibre, and minimally processed foods you can enjoy most days.";

  const lines = [
    "## Context",
    "",
    journey,
    "",
  ];

  if (plan.dietTags.length) {
    lines.push("## Diet themes from your plan", "", plan.dietTags.map((t) => `- ${t}`).join("\n"), "");
  }

  const v = Math.abs(Number(variationIndex) || 0) % (ALT_MEAL_SETS.length + 1);
  const useAlt = v > 0;
  const alt = ALT_MEAL_SETS[v - 1];
  const slotMeals = useAlt
    ? {
        breakfast: avoidDislikes(dislikesList, alt.breakfast),
        lunch: avoidDislikes(dislikesList, alt.lunch),
        dinner: avoidDislikes(dislikesList, alt.dinner),
        snacks: avoidDislikes(dislikesList, alt.snacks),
      }
    : {
        breakfast: meals.breakfast,
        lunch: meals.lunch,
        dinner: meals.dinner,
        snacks: meals.snacks,
      };

  lines.push(useAlt ? "## Today’s meals (fresh mix)" : "## Today’s meals", "");
  if (useAlt) {
    lines.push(
      "_Same goals as your plan — different ingredients so you can rotate without getting bored._",
      "",
    );
  }
  lines.push(
    "### Breakfast",
    wrapMainMealBody("breakfast", slotMeals.breakfast, healthJourney),
    "",
    "### Lunch",
    wrapMainMealBody("lunch", slotMeals.lunch, healthJourney),
    "",
    "### Dinner",
    wrapMainMealBody("dinner", slotMeals.dinner, healthJourney),
    "",
    "### Snacks",
    wrapMainMealBody("snacks", slotMeals.snacks, healthJourney),
    "",
    "## How this fits your plan",
    "",
    plan.dietNote.trim(),
    "",
  );

  if (diet === "processed") {
    lines.push(
      "## Tip",
      "",
      "Trimming **one ultra-processed meal per day** is often the single biggest upgrade — you don’t need to change everything at once.",
      "",
    );
  }

  if (foodLikes?.trim()) {
    lines.push("## Preferences", "", `Flavour direction: ${foodLikes.trim()}.`, "");
  }
  if (dislikesList.length) {
    lines.push("## Avoiding", "", dislikesList.map((d) => `- ${d}`).join("\n"), "");
  }

  const target = (calorieTarget || "").trim();
  const band = estimatedMaintenanceKcalRange(profile);
  const targetDigits = target.replace(/[^\d]/g, "");
  const targetLine = target
    ? `**Your target:** ~**${targetDigits || target} kcal/day** (you entered this — confirm with your clinician or dietitian if you use it for weight change).`
    : "**Your target:** *optional* — add a daily kcal goal in the box next to **Create eating plan** if you want it echoed here.";

  lines.push(
    "## Tracking & energy (approximate)",
    "",
    `- **Day total (food):** ~**${band.low.toLocaleString()}–${band.high.toLocaleString()} kcal** — illustrative band from your profile; use a food diary app for accuracy.`,
    `- ${targetLine}`,
    "- **Protein / fibre:** aim for **protein at each main meal** and **5+ different plants** over the day when you can.",
    "",
    "_Numbers are educational guesses, not prescriptions. Energy needs vary with genetics, medications, sleep, and stress._",
    "",
  );

  if (extraNotes?.trim()) {
    lines.push(
      "## What you asked for",
      "",
      extraNotes.trim(),
      "",
      "_We’ve kept your wording above — use **Ask Yori** in chat if you want this tailored further to labs, allergies, or culture._",
      "",
    );
  }

  return lines.join("\n").trim();
}

/**
 * Yori-style copy for today’s workout (deterministic).
 * Returns Markdown for formatted display.
 * @param {{ age?: string, sex?: string, activity?: string }} [profile]
 * @param {string} [extraNotes]
 * @param {number} [variationIndex=0]
 */
export function buildYoriStyleWorkoutToday({
  exerciseDay,
  plan,
  activity,
  healthJourney,
  profile,
  extraNotes,
  variationIndex = 0,
}) {
  const intro =
    healthJourney === "manage"
      ? "Today’s session matches your **exercise prescription** while staying conservative. **Stop** if you get chest pain, severe shortness of breath, dizziness, or joint pain that isn’t normal for you."
      : "Today’s session is **doable in one day**: enough stimulus to matter, with room to recover. Hydrate and warm up before you push pace.";

  const twist =
    WORKOUT_FOCUS_TWISTS[
      Math.abs(Number(variationIndex) || 0) % WORKOUT_FOCUS_TWISTS.length
    ];

  const blockMd = exerciseDay.blocks
    .map((b) => `### ${b.label}\n\n${b.text}`)
    .join("\n\n");

  const lines = [
    "## Overview",
    "",
    intro,
    "",
    twist,
    "",
    `## ${exerciseDay.title}`,
    "",
    blockMd,
    "",
    "## Your plan themes",
    "",
    plan.exTags.map((t) => `- ${t}`).join("\n"),
    "",
    "## Coaching note",
    "",
    plan.exNote.trim(),
    "",
  ];

  if (activity === "sedentary") {
    lines.push(
      "## Starting point",
      "",
      "You’re beginning from a lower baseline — that’s fine. Showing up, even briefly, still counts as progress.",
      "",
    );
  }
  if (activity === "active") {
    lines.push(
      "## Already active?",
      "",
      "Treat today as **quality and recovery**, not more volume for its own sake.",
      "",
    );
  }

  const band = estimatedMaintenanceKcalRange(profile);
  const burnLow = Math.round(band.low * 0.08);
  const burnHigh = Math.round(band.high * 0.18);
  lines.push(
    "## Session load & tracking (approximate)",
    "",
    "- **Active minutes:** ~**25–45** (depends how you spread blocks).",
    `- **Energy burn (this session):** ~**${burnLow}–${burnHigh} kcal** — very rough; a watch or chest strap estimates this better.`,
    "- **RPE target:** mostly **5–7 / 10** — conversational pace except short pushes you choose.",
    "",
    "_If you use heart-rate zones, stay mostly in **zone 2–3** unless your clinician advised otherwise._",
    "",
  );

  if (extraNotes?.trim()) {
    lines.push(
      "## What you asked for",
      "",
      extraNotes.trim(),
      "",
    );
  }

  return lines.join("\n").trim();
}
