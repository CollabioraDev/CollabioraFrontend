const AGE_LABELS = {
  young: "18–35",
  mid: "36–55",
  older: "56+",
};

const SEX_LABELS = {
  f: "Female",
  m: "Male",
  other: "Other / prefer not to say",
};

const DIET_LABELS = {
  varied: "Varied",
  plantbased: "Plant-based",
  lowcarb: "Lower carb",
  processed: "Often ultra-processed",
  unsure: "Unsure",
};

const ACTIVITY_LABELS = {
  sedentary: "Sedentary",
  light: "Light",
  moderate: "Moderate",
  active: "Active",
};

const CO_LABELS = {
  none: "None",
  dm: "Type 2 diabetes / prediabetes",
  htn: "Hypertension",
  cvd: "Cardiovascular disease / high cholesterol",
  osteo: "Osteoporosis / low bone density",
  thyroid: "Thyroid condition",
  ibs: "GI / IBS",
  neuro: "Neurological condition",
};

export const OPEN_FLOATING_CHAT_WELLNESS_EVENT = "openFloatingChatWellness";

export function openFloatingChatWellness(detail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(OPEN_FLOATING_CHAT_WELLNESS_EVENT, {
      detail: {
        prompt: "",
        displayContent: "",
        autoSend: true,
        ...detail,
      },
    }),
  );
}

/** Short line shown in the chat bubble; full context is sent to Yori separately. */
export function wellnessDietTopicDisplay(title) {
  const t = String(title || "").trim() || "this topic";
  return `Explain “${t}” using my Wellness profile`;
}

export function wellnessExerciseTagDisplay(tag) {
  const t = String(tag || "").trim() || "this theme";
  return `Explain “${t}” in the context of my Wellness profile`;
}

export function wellnessImportantNoteDisplay() {
  return `Help me understand this note in the context of my Wellness profile`;
}

export function buildWellnessProfileBlock({
  age,
  sex,
  goal,
  coSelected,
  diet,
  activity,
  plan,
  healthJourney,
  focus,
  foodLikes,
  foodDislikes,
}) {
  const conditions =
    [...coSelected]
      .filter((c) => c !== "none")
      .map((id) => CO_LABELS[id] || id)
      .join(", ") || "none selected";

  const lines = [
    "[Wellness — page snapshot]",
    `Age band: ${AGE_LABELS[age] || age}`,
    `Sex (for iron/folate rules): ${SEX_LABELS[sex] || sex}`,
    `Health journey: ${healthJourney ?? ""}`,
    `Primary focus: ${focus ?? ""}`,
    `Goal used for rules: ${goal}`,
    `Conditions: ${conditions}`,
    `Current diet pattern: ${DIET_LABELS[diet] || diet}`,
    `Activity level: ${ACTIVITY_LABELS[activity] || activity}`,
    `Diet tags: ${plan.dietTags.join(", ")}`,
    `Exercise themes: ${plan.exTags.join(", ")}`,
  ];

  if (foodLikes?.trim()) lines.push(`Food likes: ${foodLikes.trim()}`);
  if (foodDislikes?.trim())
    lines.push(`Food dislikes (avoid): ${foodDislikes.trim()}`);

  return `${lines.join("\n")}\n`;
}

export function promptDietTopicDeeper({ profileBlock, title, body }) {
  return `${profileBlock}
Topic card: "${title}"

Short explainer shown on the page:
${body}

Give a deeper, practical explanation tailored to my snapshot above. Focus on everyday swaps, meal ideas that fit my diet pattern, what to log or discuss with my clinician if relevant, and one common misconception. Keep the tone supportive and clear.`;
}

export function promptExerciseTagDeeper({
  profileBlock,
  tag,
  exNote,
  activity,
}) {
  return `${profileBlock}
Exercise theme: "${tag}"

Plan note on the page: ${exNote}
Activity level I selected: ${ACTIVITY_LABELS[activity] || activity}

Explain why this theme matters for someone with my profile, how to progress safely week by week, and red flags or reasons to pause and ask a clinician.`;
}

export function promptImportantNoteDeeper({ profileBlock, caution }) {
  return `${profileBlock}
Important note from my snapshot:
${caution}

Explain what this means in plain language, what I should watch for day to day, and what to confirm with my doctor or pharmacist if unsure. Do not replace professional medical advice.`;
}
