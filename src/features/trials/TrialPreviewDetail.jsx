import { useState } from "react";
import {
  FileText,
  Activity,
  Info,
  ListChecks,
  Users,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Beaker,
  Mail,
  Pencil,
} from "lucide-react";
import { Section } from "./CurateTrialsSection.jsx";
import { editFieldClass } from "./curateTrialsConstants.js";
import {
  getStatusColor,
  parseContactsLines,
  splitCriteria,
} from "./curateTrialsUtils.js";
export function TrialPreviewDetail({ t, onPatch }) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState({
    studyPurpose: false,
    whatHappens: false,
    risksAndBenefits: false,
    eligibility: false,
    conditions: false,
    contacts: false,
    keywords: false,
  });
  const keywords = t.previewKeywords || t.searchKeywords || [];
  const criteria = t.eligibility?.criteria || "";
  const { inclusion, exclusion } = splitCriteria(criteria);
  const hasInclusion = Boolean(t.inclusionCriteria || inclusion);
  const hasExclusion = Boolean(t.exclusionCriteria || exclusion);
  const incText = t.inclusionCriteria || inclusion;
  const excText = t.exclusionCriteria || exclusion;

  const contactsLine = (t.contacts || [])
    .map((c) => [c.name, c.email, c.role].filter(Boolean).join(" | "))
    .join("\n");

  function patch(partial) {
    if (typeof onPatch === "function") onPatch(partial);
  }

  function toggleEdit(sectionKey) {
    setEditing((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  }

  function sectionEditAction(sectionKey, label = "Edit") {
    if (typeof onPatch !== "function") return null;
    return (
      <button
        type="button"
        onClick={() => toggleEdit(sectionKey)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
        {editing[sectionKey] ? `Done ${label.toLowerCase()}` : label}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Card header â€” always visible */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex text-xs font-medium px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
              Site listing
            </span>
            {t.status && (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(t.status)}`}
              >
                {t.status.replace(/_/g, " ")}
              </span>
            )}
            {t.phase && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-50 text-slate-600 border-slate-200">
                {t.phase.replace(/PHASE(\d)/i, "Phase $1")}
              </span>
            )}
            {t.externalStudyCode && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                {t.externalStudyCode}
              </span>
            )}
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="flex items-start gap-2">
          <Beaker
            className="w-5 h-5 mt-0.5 shrink-0"
            style={{ color: "#2F3C96" }}
          />
          <h3
            className="text-lg font-bold leading-snug"
            style={{ color: "#2F3C96" }}
          >
            {t.title || t.displayTitle}
          </h3>
        </div>

        {t._warnings?.length > 0 && (
          <p className="text-xs text-amber-700 mt-2 bg-amber-50 rounded px-2 py-1 border border-amber-200">
            {t._warnings.join(" Â· ")}
          </p>
        )}
      </div>

      {/* Expandable detail body */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
          {/* Study Purpose */}
          {(t.studyPurpose || t.description) && (
            <Section
              icon={FileText}
              title="Study Purpose"
              actions={sectionEditAction("studyPurpose")}
              gradient={{
                bg: "linear-gradient(135deg, rgba(232,233,242,1), rgba(245,242,248,1))",
                border: "rgba(163,167,203,1)",
              }}
            >
              {editing.studyPurpose ? (
                <textarea
                  rows={4}
                  className={`${editFieldClass} resize-y font-mono text-xs`}
                  value={t.studyPurpose || t.description || ""}
                  onChange={(e) => patch({ studyPurpose: e.target.value })}
                />
              ) : (
                <p
                  className="text-sm leading-relaxed whitespace-pre-line"
                  style={{ color: "#787878" }}
                >
                  {t.studyPurpose || t.description}
                </p>
              )}
            </Section>
          )}

          {/* What Happens */}
          {t.whatHappens && (
            <Section
              icon={Activity}
              title="What Happens"
              actions={sectionEditAction("whatHappens")}
              gradient={{
                bg: "linear-gradient(135deg, rgba(245,242,248,1), rgba(232,224,239,1))",
                border: "#D0C4E2",
              }}
            >
              {editing.whatHappens ? (
                <textarea
                  rows={4}
                  className={`${editFieldClass} resize-y font-mono text-xs`}
                  value={t.whatHappens || ""}
                  onChange={(e) => patch({ whatHappens: e.target.value })}
                />
              ) : (
                <p
                  className="text-sm leading-relaxed whitespace-pre-line"
                  style={{ color: "#787878" }}
                >
                  {t.whatHappens}
                </p>
              )}
            </Section>
          )}

          {/* Risks & Benefits */}
          {t.risksAndBenefits && (
            <Section
              icon={Info}
              title="Potential Risks & Benefits"
              actions={sectionEditAction("risksAndBenefits")}
              gradient={{
                bg: "linear-gradient(135deg, rgba(254,249,239,1), rgba(254,243,226,1))",
                border: "rgba(253,230,138,0.6)",
              }}
            >
              {editing.risksAndBenefits ? (
                <textarea
                  rows={3}
                  className={`${editFieldClass} resize-y font-mono text-xs`}
                  value={t.risksAndBenefits || ""}
                  onChange={(e) => patch({ risksAndBenefits: e.target.value })}
                />
              ) : (
                <p
                  className="text-sm leading-relaxed whitespace-pre-line"
                  style={{ color: "#787878" }}
                >
                  {t.risksAndBenefits}
                </p>
              )}
            </Section>
          )}

          {/* Who Can Join â€” eligibility overview + inc/exc */}
          {(t.whoCanJoin || hasInclusion || hasExclusion) && (
            <Section
              icon={ListChecks}
              title="Who Can Join (Eligibility)"
              actions={sectionEditAction("eligibility")}
              gradient={{
                bg: "linear-gradient(135deg, rgba(245,242,248,1), rgba(232,224,239,1))",
                border: "#D0C4E2",
              }}
            >
              {editing.eligibility && (
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3 mb-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Gender
                      </label>
                      <input
                        className={editFieldClass}
                        placeholder="e.g. All genders"
                        value={t.eligibility?.gender || ""}
                        onChange={(e) =>
                          patch({
                            eligibility: {
                              ...(t.eligibility || {}),
                              gender: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Min age
                      </label>
                      <input
                        className={editFieldClass}
                        placeholder="e.g. 40 Years"
                        value={t.eligibility?.minimumAge || ""}
                        onChange={(e) =>
                          patch({
                            eligibility: {
                              ...(t.eligibility || {}),
                              minimumAge: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Max age
                      </label>
                      <input
                        className={editFieldClass}
                        placeholder="e.g. 80 Years"
                        value={t.eligibility?.maximumAge || ""}
                        onChange={(e) =>
                          patch({
                            eligibility: {
                              ...(t.eligibility || {}),
                              maximumAge: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Who can join (free text)
                    </label>
                    <textarea
                      rows={3}
                      className={`${editFieldClass} resize-y font-mono text-xs`}
                      value={t.whoCanJoin || ""}
                      onChange={(e) => patch({ whoCanJoin: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Inclusion criteria
                    </label>
                    <textarea
                      rows={4}
                      className={`${editFieldClass} resize-y font-mono text-xs`}
                      value={t.inclusionCriteria || incText || ""}
                      onChange={(e) =>
                        patch({ inclusionCriteria: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Exclusion criteria
                    </label>
                    <textarea
                      rows={4}
                      className={`${editFieldClass} resize-y font-mono text-xs`}
                      value={t.exclusionCriteria || excText || ""}
                      onChange={(e) =>
                        patch({ exclusionCriteria: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}
              {/* Quick stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div
                  className="bg-white rounded-lg p-3 border shadow-sm"
                  style={{ borderColor: "rgba(232,224,239,1)" }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Users className="w-4 h-4" style={{ color: "#2F3C96" }} />
                    <span
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "#787878" }}
                    >
                      Gender
                    </span>
                  </div>
                  <p className="text-sm font-bold" style={{ color: "#2F3C96" }}>
                    {t.eligibility?.gender || "All"}
                  </p>
                </div>
                <div
                  className="bg-white rounded-lg p-3 border shadow-sm"
                  style={{ borderColor: "rgba(232,224,239,1)" }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Calendar
                      className="w-4 h-4"
                      style={{ color: "#2F3C96" }}
                    />
                    <span
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "#787878" }}
                    >
                      Age Range
                    </span>
                  </div>
                  <p className="text-sm font-bold" style={{ color: "#2F3C96" }}>
                    {t.eligibility?.minimumAge && t.eligibility?.maximumAge
                      ? `${t.eligibility.minimumAge} â€“ ${t.eligibility.maximumAge}`
                      : t.eligibility?.minimumAge ||
                        t.eligibility?.maximumAge ||
                        "N/A"}
                  </p>
                </div>
                <div
                  className="bg-white rounded-lg p-3 border shadow-sm"
                  style={{ borderColor: "rgba(232,224,239,1)" }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <CheckCircle
                      className="w-4 h-4"
                      style={{ color: "#2F3C96" }}
                    />
                    <span
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "#787878" }}
                    >
                      Enrollment
                    </span>
                  </div>
                  <p className="text-sm font-bold" style={{ color: "#2F3C96" }}>
                    {t.status === "RECRUITING"
                      ? "Open"
                      : (t.status || "N/A").replace(/_/g, " ")}
                  </p>
                </div>
              </div>

              {/* Raw who-can-join text if no structured inc/exc */}
              {t.whoCanJoin && !hasInclusion && (
                <div
                  className="bg-white rounded-lg p-4 border mb-3"
                  style={{ borderColor: "rgba(232,224,239,1)" }}
                >
                  <p
                    className="text-sm leading-relaxed whitespace-pre-line"
                    style={{ color: "#787878" }}
                  >
                    {t.whoCanJoin}
                  </p>
                </div>
              )}

              {/* Inclusion */}
              {hasInclusion && (
                <div className="mb-3">
                  <h5
                    className="font-semibold mb-2 flex items-center gap-2 text-sm"
                    style={{ color: "#2F3C96" }}
                  >
                    <Info className="w-4 h-4" style={{ color: "#2F3C96" }} />
                    Required criteria to participate
                  </h5>
                  <div
                    className="bg-white rounded-lg p-4 border overflow-y-auto"
                    style={{
                      borderColor: "rgba(232,224,239,1)",
                      maxHeight: "200px",
                    }}
                  >
                    <p
                      className="text-sm leading-relaxed whitespace-pre-line"
                      style={{ color: "#787878" }}
                    >
                      {incText}
                    </p>
                  </div>
                </div>
              )}

              {/* Exclusion */}
              {hasExclusion && (
                <div>
                  <h5
                    className="font-semibold mb-2 flex items-center gap-2 text-sm"
                    style={{ color: "#2F3C96" }}
                  >
                    <Info className="w-4 h-4" style={{ color: "#2F3C96" }} />
                    Criteria that might exclude you
                  </h5>
                  <div
                    className="bg-white rounded-lg p-4 border overflow-y-auto"
                    style={{
                      borderColor: "rgba(232,224,239,1)",
                      maxHeight: "200px",
                    }}
                  >
                    <p
                      className="text-sm leading-relaxed whitespace-pre-line"
                      style={{ color: "#787878" }}
                    >
                      {excText}
                    </p>
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Conditions */}
          {t.conditions?.length > 0 && (
            <Section
              icon={Activity}
              title="Conditions"
              actions={sectionEditAction("conditions")}
              gradient={{
                bg: "linear-gradient(135deg, rgba(232,233,242,1), rgba(245,242,248,1))",
                border: "rgba(163,167,203,1)",
              }}
            >
              {editing.conditions && (
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Conditions (comma-separated)
                  </label>
                  <textarea
                    rows={2}
                    className={`${editFieldClass} resize-y font-mono text-xs`}
                    value={(t.conditions || []).join(", ")}
                    onChange={(e) =>
                      patch({
                        conditions: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {t.conditions.map((c, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-white text-sm font-medium rounded-lg border"
                    style={{ color: "#2F3C96", borderColor: "#D0C4E2" }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Contacts */}
          {t.contacts?.length > 0 && (
            <Section
              icon={Mail}
              title="Contact Information"
              actions={sectionEditAction("contacts")}
            >
              {editing.contacts && (
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Contacts (one per line:{" "}
                    <span className="font-mono">Name | email | role</span>)
                  </label>
                  <textarea
                    rows={4}
                    className={`${editFieldClass} resize-y font-mono text-xs`}
                    placeholder="Dr. Smith | pi@mednet.ucla.edu | Principal Investigator"
                    value={contactsLine}
                    onChange={(e) =>
                      patch({ contacts: parseContactsLines(e.target.value) })
                    }
                  />
                </div>
              )}
              <div className="space-y-3">
                {t.contacts.map((c, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg p-4 border shadow-sm"
                    style={{ borderColor: "rgba(232,232,232,1)" }}
                  >
                    {c.name && (
                      <p
                        className="font-bold text-sm mb-1"
                        style={{ color: "#2F3C96" }}
                      >
                        {c.name}
                      </p>
                    )}
                    {c.role && (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mb-2"
                        style={{
                          color: "#2F3C96",
                          borderColor: "#D0C4E2",
                          backgroundColor: "rgba(208,196,226,0.15)",
                        }}
                      >
                        {c.role}
                      </span>
                    )}
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="flex items-center gap-2 text-sm font-medium transition-colors"
                        style={{ color: "#2F3C96" }}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        {c.email}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Keywords */}
          {keywords.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Search keywords ({keywords.length})
                </h5>
                {sectionEditAction("keywords")}
              </div>
              {editing.keywords && (
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Search keywords (comma-separated)
                  </label>
                  <textarea
                    rows={2}
                    className={`${editFieldClass} resize-y font-mono text-xs`}
                    value={(t.searchKeywords || t.previewKeywords || []).join(
                      ", ",
                    )}
                    onChange={(e) => {
                      const kws = e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      patch({ searchKeywords: kws, previewKeywords: kws });
                    }}
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-full border font-medium"
                    style={{
                      backgroundColor: "rgba(208,196,226,0.2)",
                      color: "#2F3C96",
                      borderColor: "rgba(208,196,226,0.6)",
                    }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

