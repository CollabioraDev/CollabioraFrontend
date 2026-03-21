import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2, Pencil, Beaker, RefreshCw } from "lucide-react";
import Layout from "../components/Layout.jsx";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";
import {
  TrialPreviewDetail,
  applyTrialPatch,
  buildEligibilityCriteriaFromParts,
  getStatusColor,
} from "./CurateTrials.jsx";

const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

const SAVE_KEYS = [
  "institutionKey",
  "externalStudyCode",
  "displayTitle",
  "shortTitle",
  "interventionLabel",
  "studyPurpose",
  "whatHappens",
  "risksAndBenefits",
  "whoCanJoin",
  "inclusionCriteria",
  "exclusionCriteria",
  "contactBlock",
  "contacts",
  "principalInvestigator",
  "title",
  "description",
  "status",
  "phase",
  "conditions",
  "searchKeywords",
  "eligibility",
  "locations",
];

function buildSavePayload(t) {
  const o = {};
  for (const k of SAVE_KEYS) {
    if (t[k] !== undefined) o[k] = t[k];
  }
  return o;
}

function patchDraft(prev, patch) {
  let merged = applyTrialPatch(prev, patch);
  if (
    patch.inclusionCriteria !== undefined ||
    patch.exclusionCriteria !== undefined
  ) {
    merged = applyTrialPatch(merged, {
      eligibility: {
        ...(merged.eligibility || {}),
        criteria: buildEligibilityCriteriaFromParts(merged),
      },
    });
  }
  return merged;
}

export default function CuratedTrialsManage() {
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${base}/api/curated-trials`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load trials");
      setTrials(data.trials || []);
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Failed to load");
      setTrials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openEdit(t) {
    setDraft({ ...t });
    setEditOpen(true);
  }

  function closeEdit() {
    if (saving) return;
    setEditOpen(false);
    setDraft(null);
  }

  async function saveEdit() {
    if (!draft?.mongoId) return;
    if (!String(draft.title || "").trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const body = buildSavePayload(draft);
      const res = await fetch(`${base}/api/curated-trials/${draft.mongoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success("Curated trial saved");
      setTrials((prev) =>
        prev.map((x) =>
          x.mongoId === data.trial.mongoId ? data.trial : x,
        ),
      );
      setEditOpen(false);
      setDraft(null);
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#2F3C96]">
              Manage site-listed trials
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              View and edit trials you added via{" "}
              <Link
                to="/curate-trials"
                className="text-indigo-600 font-medium underline"
              >
                Add site-listed trials
              </Link>
              . Updates apply to how they appear on the{" "}
              <Link to="/trials" className="text-indigo-600 underline">
                Trials
              </Link>{" "}
              page (UCLA).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#2F3C96] hover:underline disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <Link
              to="/curate-trials"
              className="text-sm font-medium text-[#2F3C96] hover:underline"
            >
              Add trials
            </Link>
            <Link
              to="/trials"
              className="text-sm font-medium text-slate-500 hover:underline"
            >
              ← Trials search
            </Link>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-[#2F3C96]" />
          </div>
        )}

        {!loading && trials.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center">
            <p className="text-slate-600 mb-2">No curated trials saved yet.</p>
            <Link
              to="/curate-trials"
              className="text-indigo-600 font-medium underline"
            >
              Paste and save trials
            </Link>
          </div>
        )}

        {!loading && trials.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trials.map((trial) => {
              const itemId = trial.mongoId || trial.id;
              return (
                <div
                  key={itemId}
                  className="bg-white rounded-xl shadow-sm border transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden flex flex-col h-full"
                  style={{
                    borderColor: "rgba(59, 130, 246, 0.35)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 10px 15px -3px rgba(47, 60, 150, 0.1), 0 4px 6px -2px rgba(47, 60, 150, 0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
                  }}
                >
                  <div className="p-5 flex flex-col flex-grow">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="inline-flex text-xs font-medium px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
                        Site listing
                      </span>
                      {trial.status && (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                            trial.status,
                          )}`}
                        >
                          {String(trial.status).replace(/_/g, " ")}
                        </span>
                      )}
                      {trial.phase && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-50 text-slate-600 border-slate-200">
                          {String(trial.phase).replace(/PHASE(\d)/i, "Phase $1")}
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-2 mb-3">
                      <Beaker
                        className="w-5 h-5 mt-0.5 shrink-0"
                        style={{ color: "#2F3C96" }}
                      />
                      <h3
                        className="text-lg font-bold leading-snug line-clamp-3"
                        style={{ color: "#2F3C96" }}
                      >
                        {trial.title || "Untitled"}
                      </h3>
                    </div>

                    {trial.curatedExternalStudyCode && (
                      <p className="text-xs font-mono text-indigo-700 mb-2">
                        {trial.curatedExternalStudyCode}
                      </p>
                    )}

                    {(trial.description || trial.conditionDescription) && (
                      <div className="mb-4 flex-grow">
                        <p
                          className="text-sm line-clamp-3 leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {trial.description || trial.conditionDescription}
                        </p>
                      </div>
                    )}

                    {!trial.description && !trial.conditionDescription && (
                      <div className="flex-grow" />
                    )}

                    <div className="flex gap-2 mt-auto">
                      <button
                        type="button"
                        onClick={() => openEdit(trial)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
                        style={{
                          background:
                            "linear-gradient(135deg, #2F3C96, #253075)",
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                        View & edit
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Modal
          isOpen={editOpen && !!draft}
          onClose={closeEdit}
          maxWidthClassName="max-w-3xl"
          title={draft ? "Edit curated trial" : ""}
        >
          {draft && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Adjust any fields below, then save. Changes replace the stored
                record for this listing.
              </p>
              <TrialPreviewDetail
                t={draft}
                onPatch={(patch) => setDraft((d) => patchDraft(d, patch))}
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="ghost"
                  onClick={closeEdit}
                  disabled={saving}
                  className="border border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveEdit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  Save curated trial
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
}
