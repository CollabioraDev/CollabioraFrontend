/** Default object for the structured template (same fields as parsed curated trials). */
export function createEmptyTemplateTrial() {
  return {
    institutionKey: "ucla",
    title: "",
    externalStudyCode: "",
    status: "RECRUITING",
    phase: "",
    studyPurpose: "",
    whatHappens: "",
    risksAndBenefits: "",
    whoCanJoin: "",
    eligibility: {
      gender: "",
      minimumAge: "",
      maximumAge: "",
      criteria: "",
    },
    inclusionCriteria: "",
    exclusionCriteria: "",
    contacts: [],
    searchKeywords: [],
    previewKeywords: [],
    conditions: [],
  };
}

export function getStatusColor(status) {
  const s = (status || "").toUpperCase();
  if (s === "RECRUITING") return "bg-green-100 text-green-800 border-green-200";
  if (s === "NOT_YET_RECRUITING")
    return "bg-amber-100 text-amber-800 border-amber-200";
  if (s === "ACTIVE_NOT_RECRUITING")
    return "bg-blue-100 text-blue-800 border-blue-200";
  if (s === "COMPLETED") return "bg-slate-100 text-slate-700 border-slate-300";
  if (s === "TERMINATED" || s === "WITHDRAWN")
    return "bg-red-100 text-red-800 border-red-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

/** Merge preview edits into a trial object; nested `eligibility` is shallow-merged */
export function applyTrialPatch(prev, patch) {
  if (!prev || !patch) return prev;
  const next = { ...prev, ...patch };
  if (patch.eligibility && typeof patch.eligibility === "object") {
    next.eligibility = { ...(prev.eligibility || {}), ...patch.eligibility };
  }
  return next;
}

export function buildEligibilityCriteriaFromParts(t) {
  const inc = (t.inclusionCriteria || "").trim();
  const exc = (t.exclusionCriteria || "").trim();
  const parts = [];
  if (inc) parts.push(`Inclusion:\n${inc}`);
  if (exc) parts.push(`Exclusion:\n${exc}`);
  return parts.join("\n\n");
}

export function parseContactsLines(text) {
  if (!text || !String(text).trim()) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((s) => s.trim());
      return {
        name: parts[0] || "",
        email: parts[1] || "",
        role: parts[2] || "",
      };
    })
    .filter((c) => c.name || c.email);
}

export function splitCriteria(text) {
  if (!text) return { inclusion: "", exclusion: "" };
  const incParts = text.split(/\bInclusion\s*:/i);
  const excParts = text.split(/\bExclusion\s*:/i);
  let inclusion = "";
  let exclusion = "";
  if (incParts.length > 1) {
    const afterInc = incParts.slice(1).join("Inclusion:");
    const excIdx = afterInc.search(/\bExclusion\s*:/i);
    if (excIdx >= 0) {
      inclusion = afterInc.slice(0, excIdx).trim();
      exclusion = afterInc
        .slice(excIdx)
        .replace(/^\s*Exclusion\s*:\s*/i, "")
        .trim();
    } else {
      inclusion = afterInc.trim();
    }
  }
  if (!exclusion && excParts.length > 1) {
    exclusion = excParts.slice(1).join("Exclusion:").trim();
  }
  if (!inclusion && !exclusion) inclusion = text.trim();
  return { inclusion, exclusion };
}
