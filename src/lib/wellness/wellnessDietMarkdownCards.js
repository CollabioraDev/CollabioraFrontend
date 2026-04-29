/**
 * Split Yori / template diet markdown so "Today's meals" can render as separate cards.
 * Expects ## Today's meals (optional suffix) then ### Breakfast / Lunch / Dinner / Snacks.
 */

const TODAY_MEALS_H2 = /^##\s+Today['\u2019]?s meals/i;

/**
 * Insert a blank line before the first markdown list after a non-list line so the
 * lead-in renders as its own paragraph (CommonMark / react-markdown).
 */
export function normalizeMealMarkdownListSpacing(markdown) {
  const lines = String(markdown ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n");
  const out = [];
  function isListLine(line) {
    return /^\s*([-*+]|(?:\d+)[.)])\s+/.test(line);
  }
  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i];
    const next = lines[i + 1];
    out.push(cur);
    if (next === undefined) continue;
    if (cur.trim() === "") continue;
    if (isListLine(cur)) continue;
    if (!isListLine(next)) continue;
    if (out[out.length - 1] === "") continue;
    out.push("");
  }
  return out.join("\n").trimEnd();
}

/**
 * After a line ending with ":", turn following non-blank, non-list lines into bullets
 * until a blank line (handles models that omit "- " before each idea).
 */
export function normalizeColonLeadInLinesToBullets(markdown) {
  const lines = String(markdown ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n");
  const out = [...lines];
  for (let i = 0; i < out.length - 1; i++) {
    const curTrim = out[i].trim();
    if (!curTrim || /^\s*[-*+]\s/.test(out[i]) || /^\s*\d+\.\s/.test(out[i]))
      continue;
    if (!/:\s*$/.test(curTrim)) continue;
    let j = i + 1;
    if (j < out.length && out[j].trim() === "") continue;
    while (j < out.length && out[j].trim() !== "") {
      const L = out[j];
      if (/^\s*[-*+]\s/.test(L) || /^\s*\d+\.\s/.test(L)) break;
      if (/^\s*#/.test(L)) break;
      if (L.trim() !== "" && !/^\s*-\s/.test(L)) {
        out[j] = L.replace(/^(\s*)(\S)/, "$1- $2");
      }
      j++;
    }
  }
  return out.join("\n");
}

/** Normalize meal-slot markdown for reliable react-markdown output. */
export function normalizeMealCardMarkdown(markdown) {
  let t = String(markdown ?? "").trim();
  if (!t) return t;
  t = normalizeColonLeadInLinesToBullets(t);
  t = normalizeMealMarkdownListSpacing(t);
  return t.trim();
}

function isH2Only(line) {
  return /^##\s/.test(line) && !/^###\s/.test(line);
}

/**
 * Replace the markdown body under `### {Slot}` (first occurrence) while keeping the heading.
 * @param {string} fullMarkdown
 * @param {"breakfast"|"lunch"|"dinner"|"snacks"} slot
 * @param {string} newBody
 * @returns {string}
 */
export function replaceMealBodyInDietMarkdown(fullMarkdown, slot, newBody) {
  if (!fullMarkdown || typeof fullMarkdown !== "string") return fullMarkdown;
  const lines = fullMarkdown.split(/\r?\n/);
  const out = [];
  let i = 0;
  let replaced = false;
  const slotLc = String(slot).toLowerCase();

  while (i < lines.length) {
    const line = lines[i];
    const mealTitle = mealSlotFromH3(line);
    const matches =
      mealTitle &&
      (mealTitle === "Snacks"
        ? slotLc === "snacks"
        : mealTitle.toLowerCase() === slotLc);

    if (matches) {
      out.push(line);
      i++;
      while (i < lines.length) {
        const next = lines[i];
        if (mealSlotFromH3(next) || isH2Only(next)) break;
        i++;
      }
      const trimmed = normalizeMealCardMarkdown(String(newBody ?? ""));
      if (trimmed) {
        out.push(...trimmed.split("\n"));
      } else {
        out.push("_No ideas generated — try again._");
      }
      replaced = true;
      continue;
    }
    out.push(line);
    i++;
  }
  return replaced ? out.join("\n") : fullMarkdown;
}

/**
 * @param {string} line
 * @returns {"Breakfast"|"Lunch"|"Dinner"|"Snacks"|null}
 */
function mealSlotFromH3(line) {
  const m = line.match(/^###\s*(Breakfast|Lunch|Dinner|Snacks?)\s*$/i);
  if (!m) return null;
  if (/^snacks?$/i.test(m[1])) return "Snacks";
  const w = m[1];
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

/**
 * @param {string} markdown
 * @returns {null | {
 *   beforeMarkdown: string,
 *   mealsIntroMarkdown: string,
 *   meals: { slot: string, title: string, body: string }[],
 *   afterMarkdown: string,
 * }}
 */
export function splitDietPlanForMealCards(markdown) {
  if (!markdown || typeof markdown !== "string") return null;
  const lines = markdown.split(/\r?\n/);
  let anchor = -1;
  for (let i = 0; i < lines.length; i++) {
    if (TODAY_MEALS_H2.test(lines[i])) {
      anchor = i;
      break;
    }
  }
  if (anchor === -1) return null;

  let end = lines.length;
  for (let i = anchor + 1; i < lines.length; i++) {
    if (isH2Only(lines[i])) {
      end = i;
      break;
    }
  }

  const beforeLines = lines.slice(0, anchor);
  const mealSectionLines = lines.slice(anchor + 1, end);
  const afterLines = lines.slice(end);

  const meals = [];
  const intro = [];
  let i = 0;
  while (i < mealSectionLines.length) {
    const slot = mealSlotFromH3(mealSectionLines[i]);
    if (slot) break;
    intro.push(mealSectionLines[i]);
    i++;
  }

  while (i < mealSectionLines.length) {
    const slot = mealSlotFromH3(mealSectionLines[i]);
    if (!slot) {
      intro.push(mealSectionLines[i]);
      i++;
      continue;
    }
    i++;
    const body = [];
    while (i < mealSectionLines.length && !mealSlotFromH3(mealSectionLines[i])) {
      body.push(mealSectionLines[i]);
      i++;
    }
    meals.push({
      slot: slot.toLowerCase(),
      title: slot,
      body: body.join("\n").trim(),
    });
  }

  if (meals.length === 0) return null;

  return {
    beforeMarkdown: beforeLines.join("\n").trimEnd(),
    mealsIntroMarkdown: intro.join("\n").trim(),
    meals,
    afterMarkdown: afterLines.join("\n").trimStart(),
  };
}
