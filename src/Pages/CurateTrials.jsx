import React, { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ClipboardPaste,
  Loader2,
  Save,
  Sparkles,
  FileText,
  ListChecks,
  Activity,
  Info,
  Mail,
  Users,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Beaker,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";

const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

const PLACEHOLDER = `NEULARK — NEU-411 (LRRK2 Inhibitor, Phase 2)

NEU-411-PD201 Recruiting Phase 2

📋 Study Purpose

This study tests whether NEU-411 can safely slow the progression of early Parkinson's disease...

⚕ What Happens
...

📌 Key Eligibility Criteria

Inclusion:
• Levodopa-naïve OR on stable MAO-B inhibitor only

Exclusion:
• Currently on levodopa or dopamine agonists

✅ Who Can Join

GENDER All genders AGE RANGE 40 – 80 ENROLLMENT Enrolling

✉ Contact Information

Principal Investigator: Dr. Jeff Bronstein, MD, PhD
Email: example@mednet.ucla.edu`;

function getStatusColor(status) {
  const s = (status || "").toUpperCase();
  if (s === "RECRUITING") return "bg-green-100 text-green-800 border-green-200";
  if (s === "NOT_YET_RECRUITING") return "bg-amber-100 text-amber-800 border-amber-200";
  if (s === "ACTIVE_NOT_RECRUITING") return "bg-blue-100 text-blue-800 border-blue-200";
  if (s === "COMPLETED") return "bg-slate-100 text-slate-700 border-slate-300";
  if (s === "TERMINATED" || s === "WITHDRAWN") return "bg-red-100 text-red-800 border-red-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

/** Merge preview edits into a trial object; nested `eligibility` is shallow-merged */
function applyTrialPatch(prev, patch) {
  if (!prev || !patch) return prev;
  const next = { ...prev, ...patch };
  if (patch.eligibility && typeof patch.eligibility === "object") {
    next.eligibility = { ...(prev.eligibility || {}), ...patch.eligibility };
  }
  return next;
}

function buildEligibilityCriteriaFromParts(t) {
  const inc = (t.inclusionCriteria || "").trim();
  const exc = (t.exclusionCriteria || "").trim();
  const parts = [];
  if (inc) parts.push(`Inclusion:\n${inc}`);
  if (exc) parts.push(`Exclusion:\n${exc}`);
  return parts.join("\n\n");
}

function parseContactsLines(text) {
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

function splitCriteria(text) {
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
      exclusion = afterInc.slice(excIdx).replace(/^\s*Exclusion\s*:\s*/i, "").trim();
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

function Section({ icon: Icon, title, children, gradient }) {
  return (
    <div
      className="rounded-xl p-5 border shadow-sm"
      style={
        gradient
          ? { background: gradient.bg, borderColor: gradient.border }
          : { background: "#F5F5F5", borderColor: "rgba(232,232,232,1)" }
      }
    >
      <h4
        className="font-bold mb-3 flex items-center gap-2 text-base"
        style={{ color: "#2F3C96" }}
      >
        <Icon className="w-5 h-5 shrink-0" style={{ color: "#2F3C96" }} />
        {title}
      </h4>
      {children}
    </div>
  );
}

const editFieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400";

function TrialPreviewDetail({ t, onPatch }) {
  const [expanded, setExpanded] = useState(true);
  const [editOpen, setEditOpen] = useState(true);
  const keywords = t.previewKeywords || t.searchKeywords || [];
  const criteria = t.eligibility?.criteria || "";
  const { inclusion, exclusion } = splitCriteria(criteria);
  const hasInclusion = Boolean(t.inclusionCriteria || inclusion);
  const hasExclusion = Boolean(t.exclusionCriteria || exclusion);
  const incText = t.inclusionCriteria || inclusion;
  const excText = t.exclusionCriteria || exclusion;

  const kwLine = (t.searchKeywords || t.previewKeywords || []).join(", ");
  const condLine = (t.conditions || []).join(", ");
  const contactsLine = (t.contacts || [])
    .map((c) =>
      [c.name, c.email, c.role].filter(Boolean).join(" | "),
    )
    .join("\n");

  function patch(partial) {
    if (typeof onPatch === "function") onPatch(partial);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Card header — always visible */}
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
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-start gap-2">
          <Beaker className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#2F3C96" }} />
          <h3
            className="text-lg font-bold leading-snug"
            style={{ color: "#2F3C96" }}
          >
            {t.title || t.displayTitle}
          </h3>
        </div>

        {t._warnings?.length > 0 && (
          <p className="text-xs text-amber-700 mt-2 bg-amber-50 rounded px-2 py-1 border border-amber-200">
            {t._warnings.join(" · ")}
          </p>
        )}
      </div>

      {/* Expandable detail body */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
          {typeof onPatch === "function" && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 overflow-hidden">
              <button
                type="button"
                onClick={() => setEditOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-indigo-50/80 transition-colors"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-[#2F3C96]">
                  <Pencil className="w-4 h-4 shrink-0" />
                  Edit parsed fields
                </span>
                {editOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>
              {editOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-indigo-100/80">
                  <p className="text-xs text-slate-600 pt-3">
                    Fix anything the parser got wrong. Changes apply to this preview and to what gets saved.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Title</label>
                    <input
                      className={editFieldClass}
                      value={t.title || ""}
                      onChange={(e) => patch({ title: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
                      <input
                        className={editFieldClass}
                        placeholder="e.g. RECRUITING"
                        value={t.status || ""}
                        onChange={(e) => patch({ status: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Phase</label>
                      <input
                        className={editFieldClass}
                        placeholder="e.g. PHASE2"
                        value={t.phase || ""}
                        onChange={(e) => patch({ phase: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Study code</label>
                      <input
                        className={editFieldClass}
                        value={t.externalStudyCode || ""}
                        onChange={(e) => patch({ externalStudyCode: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Principal investigator</label>
                    <input
                      className={editFieldClass}
                      value={t.principalInvestigator || ""}
                      onChange={(e) => patch({ principalInvestigator: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Gender</label>
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
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Min age</label>
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
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Max age</label>
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
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Study purpose</label>
                    <textarea
                      rows={4}
                      className={`${editFieldClass} resize-y font-mono text-xs`}
                      value={t.studyPurpose || ""}
                      onChange={(e) => patch({ studyPurpose: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">What happens</label>
                    <textarea
                      rows={4}
                      className={`${editFieldClass} resize-y font-mono text-xs`}
                      value={t.whatHappens || ""}
                      onChange={(e) => patch({ whatHappens: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Risks &amp; benefits</label>
                    <textarea
                      rows={3}
                      className={`${editFieldClass} resize-y font-mono text-xs`}
                      value={t.risksAndBenefits || ""}
                      onChange={(e) => patch({ risksAndBenefits: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Who can join (free text)</label>
                    <textarea
                      rows={3}
                      className={`${editFieldClass} resize-y font-mono text-xs`}
                      value={t.whoCanJoin || ""}
                      onChange={(e) => patch({ whoCanJoin: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Inclusion criteria</label>
                    <textarea
                      rows={4}
                      className={`${editFieldClass} resize-y font-mono text-xs`}
                      value={t.inclusionCriteria || ""}
                      onChange={(e) => patch({ inclusionCriteria: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Exclusion criteria</label>
                    <textarea
                      rows={4}
                      className={`${editFieldClass} resize-y font-mono text-xs`}
                      value={t.exclusionCriteria || ""}
                      onChange={(e) => patch({ exclusionCriteria: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Short description (card / search)</label>
                    <textarea
                      rows={3}
                      className={`${editFieldClass} resize-y font-mono text-xs`}
                      value={t.description || ""}
                      onChange={(e) => patch({ description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Conditions (comma-separated)</label>
                    <textarea
                      rows={2}
                      className={`${editFieldClass} resize-y font-mono text-xs`}
                      value={condLine}
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
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Search keywords (comma-separated)</label>
                    <textarea
                      rows={2}
                      className={`${editFieldClass} resize-y font-mono text-xs`}
                      value={kwLine}
                      onChange={(e) => {
                        const kws = e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean);
                        patch({ searchKeywords: kws, previewKeywords: kws });
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Contacts (one per line:{" "}
                      <span className="font-mono">Name | email | role</span>)
                    </label>
                    <textarea
                      rows={4}
                      className={`${editFieldClass} resize-y font-mono text-xs`}
                      placeholder="Dr. Smith | pi@mednet.ucla.edu | Principal Investigator"
                      value={contactsLine}
                      onChange={(e) => patch({ contacts: parseContactsLines(e.target.value) })}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Study Purpose */}
          {(t.studyPurpose || t.description) && (
            <Section
              icon={FileText}
              title="Study Purpose"
              gradient={{
                bg: "linear-gradient(135deg, rgba(232,233,242,1), rgba(245,242,248,1))",
                border: "rgba(163,167,203,1)",
              }}
            >
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "#787878" }}>
                {t.studyPurpose || t.description}
              </p>
            </Section>
          )}

          {/* What Happens */}
          {t.whatHappens && (
            <Section
              icon={Activity}
              title="What Happens"
              gradient={{
                bg: "linear-gradient(135deg, rgba(245,242,248,1), rgba(232,224,239,1))",
                border: "#D0C4E2",
              }}
            >
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "#787878" }}>
                {t.whatHappens}
              </p>
            </Section>
          )}

          {/* Risks & Benefits */}
          {t.risksAndBenefits && (
            <Section
              icon={Info}
              title="Potential Risks & Benefits"
              gradient={{
                bg: "linear-gradient(135deg, rgba(254,249,239,1), rgba(254,243,226,1))",
                border: "rgba(253,230,138,0.6)",
              }}
            >
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "#787878" }}>
                {t.risksAndBenefits}
              </p>
            </Section>
          )}

          {/* Who Can Join — eligibility overview + inc/exc */}
          {(t.whoCanJoin || hasInclusion || hasExclusion) && (
            <Section
              icon={ListChecks}
              title="Who Can Join (Eligibility)"
              gradient={{
                bg: "linear-gradient(135deg, rgba(245,242,248,1), rgba(232,224,239,1))",
                border: "#D0C4E2",
              }}
            >
              {/* Quick stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div
                  className="bg-white rounded-lg p-3 border shadow-sm"
                  style={{ borderColor: "rgba(232,224,239,1)" }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Users className="w-4 h-4" style={{ color: "#2F3C96" }} />
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#787878" }}>
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
                    <Calendar className="w-4 h-4" style={{ color: "#2F3C96" }} />
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#787878" }}>
                      Age Range
                    </span>
                  </div>
                  <p className="text-sm font-bold" style={{ color: "#2F3C96" }}>
                    {t.eligibility?.minimumAge && t.eligibility?.maximumAge
                      ? `${t.eligibility.minimumAge} – ${t.eligibility.maximumAge}`
                      : t.eligibility?.minimumAge || t.eligibility?.maximumAge || "N/A"}
                  </p>
                </div>
                <div
                  className="bg-white rounded-lg p-3 border shadow-sm"
                  style={{ borderColor: "rgba(232,224,239,1)" }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <CheckCircle className="w-4 h-4" style={{ color: "#2F3C96" }} />
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#787878" }}>
                      Enrollment
                    </span>
                  </div>
                  <p className="text-sm font-bold" style={{ color: "#2F3C96" }}>
                    {t.status === "RECRUITING" ? "Open" : (t.status || "N/A").replace(/_/g, " ")}
                  </p>
                </div>
              </div>

              {/* Raw who-can-join text if no structured inc/exc */}
              {t.whoCanJoin && !hasInclusion && (
                <div
                  className="bg-white rounded-lg p-4 border mb-3"
                  style={{ borderColor: "rgba(232,224,239,1)" }}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "#787878" }}>
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
                    style={{ borderColor: "rgba(232,224,239,1)", maxHeight: "200px" }}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "#787878" }}>
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
                    style={{ borderColor: "rgba(232,224,239,1)", maxHeight: "200px" }}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "#787878" }}>
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
              gradient={{
                bg: "linear-gradient(135deg, rgba(232,233,242,1), rgba(245,242,248,1))",
                border: "rgba(163,167,203,1)",
              }}
            >
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
            <Section icon={Mail} title="Contact Information">
              <div className="space-y-3">
                {t.contacts.map((c, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg p-4 border shadow-sm"
                    style={{ borderColor: "rgba(232,232,232,1)" }}
                  >
                    {c.name && (
                      <p className="font-bold text-sm mb-1" style={{ color: "#2F3C96" }}>
                        {c.name}
                      </p>
                    )}
                    {c.role && (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mb-2"
                        style={{ color: "#2F3C96", borderColor: "#D0C4E2", backgroundColor: "rgba(208,196,226,0.15)" }}
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
              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Search keywords ({keywords.length})
              </h5>
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

let nextId = 1;
function makeSlot() {
  return { id: nextId++, text: "", parsed: null, errors: [], loading: false };
}

export default function CurateTrials() {
  const [slots, setSlots] = useState(() => [makeSlot()]);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const updateSlotText = useCallback((id, text) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, text, parsed: null, errors: [] } : s)),
    );
  }, []);

  const removeSlot = useCallback((id) => {
    setSlots((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  }, []);

  const addSlot = useCallback(() => {
    setSlots((prev) => [...prev, makeSlot()]);
  }, []);

  const updateParsedTrial = useCallback((slotId, trialIndex, patch) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const parsed = [...(s.parsed || [])];
        const cur = parsed[trialIndex];
        if (!cur) return s;
        let merged = applyTrialPatch(cur, patch);
        if (patch.inclusionCriteria !== undefined || patch.exclusionCriteria !== undefined) {
          merged = applyTrialPatch(merged, {
            eligibility: {
              ...(merged.eligibility || {}),
              criteria: buildEligibilityCriteriaFromParts(merged),
            },
          });
        }
        parsed[trialIndex] = merged;
        return { ...s, parsed };
      }),
    );
  }, []);

  async function previewSlot(id) {
    const slot = slots.find((s) => s.id === id);
    if (!slot?.text.trim()) {
      toast.error("Paste trial text first");
      return;
    }
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, loading: true, errors: [] } : s)));
    try {
      const res = await fetch(`${base}/api/curated-trials/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: slot.text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview failed");
      const trials = data.trials || [];
      const errors = data.errors || [];
      if (trials.length === 0) {
        toast.error("No trials parsed — check section headers");
      } else {
        toast.success(`Parsed ${trials.length} trial(s)`);
      }
      setSlots((prev) =>
        prev.map((s) => (s.id === id ? { ...s, loading: false, parsed: trials, errors } : s)),
      );
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Preview failed");
      setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, loading: false } : s)));
    }
  }

  async function previewAll() {
    const filled = slots.filter((s) => s.text.trim());
    if (!filled.length) {
      toast.error("Paste trial text in at least one slot");
      return;
    }
    await Promise.all(filled.map((s) => previewSlot(s.id)));
  }

  function stripPreviewFields(t) {
    const { previewKeywords: _pk, _warnings: _w, __v, ...rest } = t;
    return rest;
  }

  const allParsed = slots.flatMap((s) => s.parsed || []);

  async function saveBulk() {
    if (!allParsed.length) {
      toast.error("Nothing to save — run preview first");
      return;
    }
    setSaving(true);
    try {
      const trials = allParsed.map(stripPreviewFields);
      const res = await fetch(`${base}/api/curated-trials/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trials }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success(`Saved ${data.count} trial(s)`);
      setConfirmOpen(false);
      setSlots([makeSlot()]);
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const anyLoading = slots.some((s) => s.loading);
  const anyParsed = allParsed.length > 0;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#2F3C96]">
              Add site-listed trials
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Paste one trial per slot. Preview to check parsing and keywords,
              then save all to the database. Listings appear under{" "}
              <strong>University of California, Los Angeles</strong> on the{" "}
              <Link to="/trials" className="text-indigo-600 underline">
                Trials
              </Link>{" "}
              page.
            </p>
          </div>
          <Link
            to="/trials"
            className="text-sm font-medium text-[#2F3C96] hover:underline shrink-0"
          >
            ← Back to Trials
          </Link>
        </div>

        {/* Per-trial slots */}
        <div className="space-y-4 mb-4">
          {slots.map((slot, slotIdx) => (
            <div
              key={slot.id}
              className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              {/* Slot header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                <span className="text-xs font-semibold text-slate-600">
                  Trial {slotIdx + 1}
                  {slot.parsed?.length > 0 && (
                    <span className="ml-2 text-emerald-600">✓ parsed</span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => previewSlot(slot.id)}
                    disabled={slot.loading || !slot.text.trim()}
                    className="h-7 px-3 text-xs inline-flex items-center gap-1.5 bg-[#2F3C96] hover:bg-[#253075] text-white"
                  >
                    {slot.loading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    Preview
                  </Button>
                  {slots.length > 1 && (
                    <button
                      onClick={() => removeSlot(slot.id)}
                      className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      title="Remove slot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Textarea */}
              <div className="p-3">
                <textarea
                  value={slot.text}
                  onChange={(e) => updateSlotText(slot.id, e.target.value)}
                  rows={10}
                  placeholder={PLACEHOLDER}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
                />
              </div>

              {/* Slot errors */}
              {slot.errors?.length > 0 && (
                <div className="mx-3 mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {slot.errors.map((e, i) => (
                    <div key={i}>⚠ {e.message}</div>
                  ))}
                </div>
              )}

              {/* Slot preview */}
              {slot.parsed?.length > 0 && (
                <div className="px-3 pb-4 space-y-3 border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Preview
                  </p>
                  {slot.parsed.map((t, idx) => (
                    <TrialPreviewDetail
                      key={idx}
                      t={t}
                      onPatch={(patch) => updateParsedTrial(slot.id, idx, patch)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add another slot */}
        <button
          onClick={addSlot}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-medium text-slate-500 hover:border-indigo-300 hover:text-[#2F3C96] transition-colors mb-8"
        >
          <Plus className="w-4 h-4" />
          Add another trial
        </button>

        {/* Global actions */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={previewAll}
            disabled={anyLoading}
            className="inline-flex items-center gap-2 bg-[#2F3C96] hover:bg-[#253075] text-white"
          >
            {anyLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Preview all
          </Button>
          {anyParsed && (
            <Button
              onClick={() => setConfirmOpen(true)}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Save className="w-4 h-4" />
              Save {allParsed.length} trial{allParsed.length !== 1 ? "s" : ""} to database
            </Button>
          )}
        </div>

        {/* Confirm modal */}
        <Modal
          isOpen={confirmOpen}
          onClose={() => !saving && setConfirmOpen(false)}
          title="Save site-listed trials"
        >
          <p className="text-sm text-slate-600 mb-4">
            This will save <strong>{allParsed.length}</strong> trial record(s) for
            UCLA. Existing entries with the same study code will be updated.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={saving}
              className="border border-slate-200"
            >
              Cancel
            </Button>
            <Button
              onClick={saveBulk}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ClipboardPaste className="w-4 h-4" />
              )}
              Confirm save
            </Button>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
