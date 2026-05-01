import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation, Trans } from "react-i18next";
import { Loader2, Pencil, Beaker, RefreshCw } from "lucide-react";
import Layout from "../../components/Layout.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { TrialPreviewDetail } from "./TrialPreviewDetail.jsx";
import {
  applyTrialPatch,
  buildEligibilityCriteriaFromParts,
  getStatusColor,
} from "./curateTrialsUtils.js";
import { base } from "./curateTrialsConstants.js";

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
  const { t } = useTranslation("common");
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
      if (!res.ok) throw new Error(data.error || t("curatedTrialsManage.loadFailed"));
      setTrials(data.trials || []);
    } catch (e) {
      console.error(e);
      toast.error(e.message || t("curatedTrialsManage.loadFailed"));
      setTrials([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

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
      toast.error(t("curatedTrialsManage.titleRequired"));
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
      if (!res.ok) throw new Error(data.error || t("curateTrials.saveFailed"));
      toast.success(t("curatedTrialsManage.savedToast"));
      setTrials((prev) =>
        prev.map((x) => (x.mongoId === data.trial.mongoId ? data.trial : x)),
      );
      setEditOpen(false);
      setDraft(null);
    } catch (e) {
      console.error(e);
      toast.error(e.message || t("curateTrials.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="rounded-2xl border border-indigo-100/80 bg-gradient-to-r from-indigo-50 to-purple-50 p-5 shadow-sm mb-6 mt-18">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
            <h1 className="text-2xl font-bold text-[#2F3C96]">
              {t("curatedTrialsManage.pageTitle")}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              <Trans
                i18nKey="curatedTrialsManage.pageIntro"
                components={{
                  addLink: (
                    <Link
                      to="/add-trials"
                      className="text-indigo-600 font-medium underline"
                    />
                  ),
                  trialsLink: (
                    <Link to="/trials" className="text-indigo-600 underline" />
                  ),
                }}
              />
            </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                onClick={() => load()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2F3C96] hover:bg-[#253075] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                {t("curatedTrialsManage.refresh")}
              </Button>
              <Link
                to="/add-trials?tab=template"
                className="inline-flex items-center rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
              >
                {t("curatedTrialsManage.structuredTemplate")}
              </Link>
              <Link
                to="/add-trials"
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#2F3C96] hover:bg-slate-50 hover:border-indigo-200 transition-colors"
              >
                {t("curatedTrialsManage.addTrials")}
              </Link>
              <Link
                to="/trials"
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {t("curatedTrialsManage.trialsSearch")}
              </Link>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-[#2F3C96]" />
          </div>
        )}

        {!loading && trials.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center">
            <p className="text-slate-600 mb-2">{t("curatedTrialsManage.empty")}</p>
            <Link
              to="/add-trials"
              className="text-indigo-600 font-medium underline"
            >
              {t("curatedTrialsManage.pasteLink")}
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
                  className="bg-white rounded-xl shadow-sm border border-indigo-100 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-md overflow-hidden flex flex-col h-full"
                >
                  <div className="p-5 flex flex-col flex-grow">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="inline-flex text-xs font-medium px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
                        {t("curatedTrialsManage.siteListing")}
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
                          {String(trial.phase).replace(
                            /PHASE(\d)/i,
                            "Phase $1",
                          )}
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
                        {trial.title || t("curatedTrialsManage.untitled")}
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
                      <Button
                        onClick={() => openEdit(trial)}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#2F3C96] hover:bg-[#253075] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                        {t("curatedTrialsManage.viewEdit")}
                      </Button>
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
          title={draft ? t("curatedTrialsManage.editTitle") : ""}
        >
          {draft && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                {t("curatedTrialsManage.editHint")}
              </p>
              <TrialPreviewDetail
                t={draft}
                onPatch={(patch) => setDraft((d) => patchDraft(d, patch))}
                showMetadataFields
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="ghost"
                  onClick={closeEdit}
                  disabled={saving}
                  className="border border-slate-200"
                >
                  {t("ui.cancel")}
                </Button>
                <Button
                  onClick={saveEdit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2F3C96] hover:bg-[#253075] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {t("curatedTrialsManage.saveChanges")}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
}
