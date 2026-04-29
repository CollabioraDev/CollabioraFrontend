/**
 * Short “why for you” copy for Wellness UI tooltips (deterministic, education-only).
 *
 * Context shape: { plan, co: Set<string>, age, sex, goal, diet, activity, healthJourney }
 */

/**
 * @param {string} line
 * @param {object} ctx
 * @param {{ isManual?: boolean }} [opts]
 */
export function getWhyForSupplement(line, ctx, opts = {}) {
  if (opts.isManual) {
    return (
      "You added this yourself. Check interaction flags above if you take medications, " +
      "and confirm dose, form, and need with your clinician or pharmacist."
    );
  }

  const l = String(line).toLowerCase();
  const { co, age, sex, goal } = ctx;

  if (l.includes("alpha-lipoic"))
    return co.has("dm")
      ? "Often discussed alongside glucose management plans; evidence is mixed and products vary — your diabetes care team can say if it fits your regimen."
      : "Sometimes used in metabolic-health discussions; suitability depends on your full history and meds.";

  if (l.includes("ashwagandha"))
    return goal === "energy"
      ? "Grouped here because you prioritised energy; adaptogens aren’t right for everyone (e.g. pregnancy, thyroid meds) — ask before starting."
      : "Adaptogen sometimes used for stress and sleep; interactions exist — your clinician should approve.";

  if (l.includes("b-complex"))
    return co.has("neuro")
      ? "B vitamins are often reviewed when neurological health is a focus; dosing should match labs and diet, not guesswork."
      : goal === "energy"
        ? "B vitamins support energy metabolism; needs differ by diet and conditions — avoid mega-doses without guidance."
        : "Broad B-vitamin support may be discussed when intake or absorption is a concern.";

  if (l.includes("b12") || l.includes("vitamin b12"))
    return age === "older"
      ? "Absorption of B12 can decline with age; diet and meds matter — many people confirm status with blood tests before long-term use."
      : "B12 is important for nerves and blood cells; vegans and some medication users need it more — your clinician can interpret.";

  if (l.includes("calcium"))
    return co.has("osteo")
      ? "Bone-health plans often consider calcium with your fracture risk, vitamin D, and kidney function — food first when possible."
      : "Calcium needs depend on diet, age, and bone risk; too much from pills isn’t always better — discuss total intake.";

  if (l.includes("coq10"))
    return co.has("cvd")
      ? "Sometimes discussed with heart-health and statin therapy; not a substitute for prescribed treatments — review with your prescriber."
      : "CoQ10 is involved in cell energy production; relevance depends on medications and heart history.";

  if (l.includes("folate"))
    return sex === "f"
      ? "Folate matters for cell repair and is especially important if pregnancy is possible — many people use food plus a modest supplement per local guidance."
      : "Folate supports DNA synthesis and red blood cells; needs vary by diet and conditions.";

  if (l.includes("iron"))
    return sex === "f" && age !== "older"
      ? "Iron needs are higher with menstrual blood loss; too much iron is harmful — many clinicians check labs before advising supplements."
      : "Iron should match actual deficiency risk; excess iron is dangerous — confirm with testing when in doubt.";

  if (l.includes("k2") || l.includes("vitamin k2"))
    return co.has("osteo")
      ? "Vitamin K2 is sometimes discussed alongside calcium and bone health; it can interact with warfarin-type drugs — tell your clinician."
      : "Discussed in some bone and cardiovascular contexts; medication interactions matter.";

  if (l.includes("magnesium glycinate"))
    return age === "older"
      ? "A form often chosen for gentler digestion; still confirm kidney function and interactions with your clinician."
      : "Magnesium plays many roles (muscle, sleep, glucose); form and dose are individual.";

  if (l.includes("magnesium malate"))
    return goal === "energy"
      ? "Sometimes picked for energy and muscle comfort; kidney disease and meds change safety — ask your clinician."
      : "Magnesium supports muscles and nerves; product choice and dose should be personalised.";

  if (l.includes("magnesium 300") || l.includes("300-400"))
    return co.has("htn")
      ? "Magnesium is included because blood pressure management often overlaps with diet quality and electrolyte balance — dosing needs medical input."
      : "Magnesium may be discussed for blood pressure and muscle health; not everyone needs the same amount.";

  if (l.includes("magnesium"))
    return co.has("dm")
      ? "Magnesium is commonly reviewed in diabetes care plans because intake, losses, and meds can shift needs — confirm what’s right for you."
      : "Magnesium is involved in glucose regulation and many enzymes; deficiency and excess both matter.";

  if (l.includes("omega-3") && l.includes("dha") && !l.includes("epa"))
    return co.has("neuro")
      ? "DHA is highlighted for neurological health priorities; purity, dose, and bleeding risk with anticoagulants should be reviewed."
      : "Omega-3 fats support brain and heart health; fish intake plus supplements should fit your overall plan.";

  if (l.includes("omega-3"))
    return co.has("cvd")
      ? "EPA/DHA are often discussed for triglycerides and heart risk alongside diet; high doses need clinician oversight with blood thinners."
      : "Omega-3s support heart and metabolic health; food sources plus supplements are judged individually.";

  if (l.includes("vitamin d") || l.includes("vitamin d3"))
    return (
      "Vitamin D supports bones, muscles, and immunity; status varies with sun, diet, and absorption — many adults discuss testing and a modest dose with their clinician."
    );

  return (
    "This appeared from your Wellness rules plus anything you typed in. " +
    "Use it as a conversation starter with your healthcare provider, not a prescription."
  );
}

/**
 * @param {'breakfast'|'lunch'|'dinner'|'snacks'} slot
 * @param {object} ctx
 */
export function getWhyForMealSlot(slot, ctx) {
  const { plan, co, healthJourney } = ctx;
  const dm = co.has("dm");
  const neuro = co.has("neuro");
  const tags = plan.dietTags.join(" ").toLowerCase();
  const lowFodmap = tags.includes("fodmap") || tags.includes("low-fodmap");
  const manage = healthJourney === "manage";

  const themes = plan.dietTags.length
    ? `Your plan themes (${plan.dietTags.slice(0, 3).join(", ")}) steer food choices.`
    : "Your selected conditions and goals steer these ideas.";

  if (slot === "breakfast") {
    if (dm)
      return `Balanced protein and fibre at breakfast helps blunt glucose rises after waking — aligned with your diabetes/prediabetes focus. ${themes}`;
    if (neuro)
      return `Steady energy and brain-supporting fats (e.g. nuts, berries) match a neurological wellness focus. ${themes}`;
    return `Aim for fibre + protein to reduce mid-morning crashes and support steady appetite. ${themes}`;
  }

  if (slot === "lunch") {
    if (lowFodmap)
      return `Lunch uses a lower-FODMAP template to reduce common IBS triggers while you learn your personal tolerance. ${themes}`;
    if (dm)
      return `Vegetables, legumes or lean protein, and olive oil support post-meal glucose control — central to your plan. ${themes}`;
    return `Mediterranean-style bowls emphasise plants and healthy fats — consistent with your diet approach. ${themes}`;
  }

  if (slot === "dinner") {
    if (dm)
      return `Evening meals that pair protein, high-fibre carbs, and non-starchy veg help overnight glucose stability. ${themes}`;
    return `Lighter sauces, herbs, and modest sodium fit heart-health and general prevention goals. ${themes}`;
  }

  if (slot === "snacks") {
    if (dm)
      return `Snacks pair carbs with protein/fat to reduce spikes — useful when ${manage ? "managing" : "optimising"} glucose day to day. ${themes}`;
    return `Portion-aware snacks bridge hunger without ultra-processed defaults. ${themes}`;
  }

  return themes;
}

/**
 * @param {string} tag
 * @param {WellnessWhyContext} ctx
 */
export function getWhyForDietTag(tag, ctx) {
  const { co, goal, plan } = ctx;
  const t = tag.toLowerCase();

  let hook = "";
  if (co.has("dm") && (t.includes("glycaemic") || t.includes("carb") || t.includes("mediterranean")))
    hook = "Because you’re working on glucose-friendly eating, ";
  else if (co.has("htn") && (t.includes("dash") || t.includes("sodium")))
    hook = "Because blood pressure is part of your profile, ";
  else if (co.has("cvd") && (t.includes("mediterranean") || t.includes("fat") || t.includes("dash")))
    hook = "Because cardiovascular wellness is in focus, ";
  else if (co.has("ibs") && t.includes("fodmap"))
    hook = "Because digestive comfort is a priority, ";
  else if (goal === "weight")
    hook = "Because sustainable weight change favours patterns you can repeat, ";
  else if (goal === "energy")
    hook = "Because steady energy usually tracks with fibre and fewer glucose swings, ";
  else hook = "From your profile, ";

  if (t.includes("mediterranean"))
    return `${hook}this pattern stacks vegetables, legumes, olive oil, and fish — widely studied for cardiometabolic benefits.`;
  if (t.includes("dash"))
    return `${hook}DASH-style eating emphasises produce, low-fat dairy, and sodium awareness — often used for blood pressure–friendly meals.`;
  if (t.includes("glycaemic") || t.includes("low gi"))
    return `${hook}lower-GI carbs tend to raise glucose more gently — helpful when monitoring post-meal sugars.`;
  if (t.includes("fodmap"))
    return `${hook}a short, guided low-FODMAP phase can clarify triggers; reintroduction is essential so nutrition stays broad long term.`;
  if (t.includes("sodium"))
    return `${hook}most sodium hides in breads, sauces, and meals out — small cuts often matter more than the salt shaker.`;
  if (t.includes("protein"))
    return `${hook}higher-protein meals can improve satiety and support lean mass while you adjust calories gradually.`;
  if (t.includes("deficit"))
    return `${hook}a modest calorie deficit paired with protein and plants is easier to sustain than extreme restriction.`;
  if (t.includes("plant"))
    return `${hook}plant-forward plates increase fibre and polyphenols — flexible and compatible with many cultural foods.`;
  if (t.includes("whole"))
    return `${hook}whole foods usually deliver more fibre and fewer ultra-processed additives — a strong default for prevention.`;
  if (t.includes("anti-inflammatory"))
    return `${hook}this nudges oils, fish, plants, and fewer fried ultra-processed items — aligned with steady energy goals.`;

  return `${hook}this tag matches the diet branch chosen from your conditions and goals: ${plan.dietNote.slice(0, 120)}${plan.dietNote.length > 120 ? "…" : ""}`;
}

/**
 * @param {string} tag
 * @param {object} ctx
 */
export function getWhyForExerciseTag(tag, ctx) {
  const { co, goal, age, plan } = ctx;
  const t = tag.toLowerCase();

  if (t.includes("cardiac") || t.includes("rehab")) {
    return (
      "Supervised, moderate work is prioritised when cardiovascular disease is selected — " +
      "safety and clearance come first."
    );
  }
  if (t.includes("resistance") || t.includes("strength")) {
    return co.has("dm")
      ? "Strength training improves insulin sensitivity and supports glucose control alongside aerobic work."
      : "Muscle maintenance supports metabolism, bone health, and healthy ageing — especially with your selected goals.";
  }
  if (t.includes("post-meal") || t.includes("walk")) {
    return co.has("dm")
      ? "Short walks after eating are one of the most practical ways to blunt post-meal glucose excursions."
      : "Walking breaks add movement without needing a gym — helpful for energy and recovery.";
  }
  if (t.includes("hiit")) {
    return goal === "weight"
      ? "HIIT can improve fitness efficiently for some people; it should match your baseline and any cardiac issues."
      : "Higher-intensity intervals can be time-efficient; suitability depends on joints, heart history, and recovery.";
  }
  if (t.includes("balance") || t.includes("coordination")) {
    return co.has("neuro") || age === "older"
      ? "Balance and coordination reduce fall risk and support confidence with movement — matched to your profile."
      : "Balance work complements cardio and strength for long-term mobility.";
  }
  if (t.includes("weight-bearing") || t.includes("impact")) {
    return co.has("osteo")
      ? "Controlled impact and resistance stimulate bone; intensity should suit fracture risk and joint comfort."
      : "Weight-bearing movement supports bone and muscle — intensity should match your joints and fitness.";
  }
  if (t.includes("aerobic") || t.includes("min moderate") || t.includes("150"))
    return "Regular moderate cardio supports heart, mood, and metabolic health — volume is tuned to age and conditions in your plan.";

  return `This theme comes from your exercise plan: ${plan.exNote.slice(0, 140)}${plan.exNote.length > 140 ? "…" : ""}`;
}

/**
 * @param {{ label: string, text: string }} block
 * @param {object} ctx
 * @param {string} exerciseTitle
 */
export function getWhyForExerciseBlock(block, ctx, exerciseTitle) {
  const { activity, healthJourney } = ctx;
  const label = block.label.toLowerCase();

  if (label.includes("focus"))
    return healthJourney === "manage"
      ? "Sets expectations: repeatability and symptom awareness matter more than chasing exhaustion."
      : "Keeps the session realistic so you can stay consistent — the main driver of results.";

  if (label.includes("warm"))
    return "Prepares heart rate, joints, and tissues to reduce injury risk before harder work.";

  if (label.includes("main"))
    return ctx.co.has("cvd")
      ? "Stays in a conversational-intensity zone appropriate when cardiovascular concerns are selected."
      : "Delivers the bulk of cardiometabolic benefit for the day at a sustainable effort.";

  if (label.includes("strength"))
    return "Strength complements cardio for glucose, bones, and function — spread across the week, not only today.";

  if (label.includes("cool"))
    return "Gradual recovery helps heart rate settle and may reduce next-day soreness.";

  if (label.includes("block 1") || label.includes("block 2"))
    return activity === "sedentary"
      ? "Small, repeatable doses of movement build the habit without overwhelming a low baseline."
      : "Adds structured movement chunks so the day feels achievable.";

  if (label.includes("notes") || label.includes("note"))
    return "Safety first: new pain, chest symptoms, or unusual breathlessness warrant stopping and medical advice.";

  return `Part of “${exerciseTitle}”: ${block.text.slice(0, 100)}${block.text.length > 100 ? "…" : ""}`;
}
