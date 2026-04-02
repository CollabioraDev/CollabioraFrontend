import React, { useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
  ClipboardPaste,
  Loader2,
  Save,
  Plus,
  Trash2,
  LayoutList,
  FileEdit,
  Info,
} from "lucide-react";
import Layout from "../../components/Layout.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import {
  base,
  PLACEHOLDER,
  CURATE_INSTITUTION_OPTIONS,
} from "./curateTrialsConstants.js";
import {
  applyTrialPatch,
  buildEligibilityCriteriaFromParts,
  createEmptyTemplateTrial,
} from "./curateTrialsUtils.js";
import { TrialPreviewDetail } from "./TrialPreviewDetail.jsx";

let nextId = 1;
function makeSlot() {
  return { id: nextId++, text: "", parsed: null, errors: [], loading: false };
}

export default function CurateTrials() {
  const { t } = useTranslation("common");
  const [searchParams, setSearchParams] = useSearchParams();
  const curateTab =
    searchParams.get("tab") === "paste" ? "paste" : "template";

  function setCurateTab(next) {
    if (next === "paste") setSearchParams({ tab: "paste" });
    else setSearchParams({});
  }

  const [templateHelpOpen, setTemplateHelpOpen] = useState(false);

  const [slots, setSlots] = useState(() => [makeSlot()]);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [templateDraft, setTemplateDraft] = useState(createEmptyTemplateTrial);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateConfirmOpen, setTemplateConfirmOpen] = useState(false);
  const [curateInstitutionKey, setCurateInstitutionKey] = useState("ucla");

  const patchTemplateDraft = useCallback((patch) => {
    setTemplateDraft((prev) => {
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
    });
  }, []);

  const updateSlotText = useCallback((id, text) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, text, parsed: null, errors: [] } : s,
      ),
    );
  }, []);

  const removeSlot = useCallback((id) => {
    setSlots((prev) =>
      prev.length > 1 ? prev.filter((s) => s.id !== id) : prev,
    );
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
        parsed[trialIndex] = merged;
        return { ...s, parsed };
      }),
    );
  }, []);

  async function previewSlot(id) {
    const slot = slots.find((s) => s.id === id);
    if (!slot?.text.trim()) {
      toast.error(t("curateTrials.pasteFirst"));
      return;
    }
    setSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, loading: true, errors: [] } : s)),
    );
    try {
      const res = await fetch(`${base}/api/curated-trials/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: slot.text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("curateTrials.previewFailed"));
      const trials = data.trials || [];
      const errors = data.errors || [];
      if (trials.length === 0) {
        toast.error(t("curateTrials.noTrialsParsed"));
      } else {
        toast.success(t("curateTrials.parsedCount", { count: trials.length }));
      }
      setSlots((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, loading: false, parsed: trials, errors } : s,
        ),
      );
    } catch (e) {
      console.error(e);
      toast.error(e.message || t("curateTrials.previewFailed"));
      setSlots((prev) =>
        prev.map((s) => (s.id === id ? { ...s, loading: false } : s)),
      );
    }
  }

  async function previewAll() {
    const filled = slots.filter((s) => s.text.trim());
    if (!filled.length) {
      toast.error(t("curateTrials.pasteAtLeastOne"));
      return;
    }
    await Promise.all(filled.map((s) => previewSlot(s.id)));
  }

  function stripPreviewFields(trial) {
    const { previewKeywords: _pk, _warnings: _w, __v, ...rest } = trial;
    return rest;
  }

  function finalizeTrialForSave(trial) {
    const merged = applyTrialPatch(trial, {
      eligibility: {
        ...(trial.eligibility || {}),
        criteria: buildEligibilityCriteriaFromParts(trial),
      },
    });
    return stripPreviewFields(merged);
  }

  const allParsed = slots.flatMap((s) => s.parsed || []);

  async function saveBulk() {
    if (!allParsed.length) {
      toast.error(t("curateTrials.nothingToSave"));
      return;
    }
    setSaving(true);
    try {
      const trials = allParsed.map((trial) => ({
        ...finalizeTrialForSave(trial),
        institutionKey: curateInstitutionKey,
      }));
      const res = await fetch(`${base}/api/curated-trials/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trials }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("curateTrials.saveFailed"));
      toast.success(t("curateTrials.savedCount", { count: data.count }));
      setConfirmOpen(false);
      setSlots([makeSlot()]);
    } catch (e) {
      console.error(e);
      toast.error(e.message || t("curateTrials.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function saveTemplateTrial() {
    const finalized = finalizeTrialForSave(templateDraft);
    if (!String(finalized.title || "").trim()) {
      toast.error(t("curateTrials.titleRequired"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${base}/api/curated-trials/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trials: [{ ...finalized, institutionKey: curateInstitutionKey }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("curateTrials.saveFailed"));
      toast.success(
        t("curateTrials.savedCount", { count: data.count || 1 }),
      );
      setTemplateConfirmOpen(false);
      setTemplateModalOpen(false);
      setTemplateDraft(createEmptyTemplateTrial());
    } catch (e) {
      console.error(e);
      toast.error(e.message || t("curateTrials.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  const anyLoading = slots.some((s) => s.loading);
  const anyParsed = allParsed.length > 0;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="rounded-2xl border border-indigo-100/80 bg-gradient-to-r from-indigo-50 to-purple-50 p-5 shadow-sm mb-6 ">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
            <h1 className="text-2xl font-bold text-[#2F3C96]">
              {t("curateTrials.pageTitle")}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {t("curateTrials.pageSubtitle")}
            </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                to="/curate-trials/manage"
                className="inline-flex items-center rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                {t("curateTrials.viewSaved")}
              </Link>
              <Link
                to="/trials"
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {t("curateTrials.backToTrials")}
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 p-1 rounded-xl bg-slate-100/80 border border-slate-200">
          <button
            type="button"
            onClick={() => setCurateTab("paste")}
            className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              curateTab === "paste"
                ? "bg-white text-[#2F3C96] shadow-sm border border-indigo-100"
                : "text-slate-600 hover:bg-white/60"
            }`}
          >
            <LayoutList className="w-4 h-4 shrink-0" />
            {t("curateTrials.tabPaste")}
          </button>
          <button
            type="button"
            onClick={() => setCurateTab("template")}
            className={`flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              curateTab === "template"
                ? "bg-white text-[#2F3C96] shadow-sm border border-indigo-100"
                : "text-slate-600 hover:bg-white/60"
            }`}
          >
            <FileEdit className="w-4 h-4 shrink-0" />
            {t("curateTrials.tabTemplate")}
          </button>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <label
            htmlFor="curate-institution"
            className="text-sm font-semibold text-slate-700 shrink-0"
          >
            {t("curateTrials.institutionLabel")}
          </label>
          <select
            id="curate-institution"
            value={curateInstitutionKey}
            onChange={(e) => setCurateInstitutionKey(e.target.value)}
            disabled={saving}
            className="w-full sm:max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {CURATE_INSTITUTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {curateTab === "paste" && (
          <>
        {/* Per-trial slots */}
        <div className="space-y-4 mb-4">
          {slots.map((slot, slotIdx) => (
            <div
              key={slot.id}
              className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              {/* Slot header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/40">
                <span className="text-xs font-semibold text-slate-600">
                  {t("curateTrials.trialSlot", { index: slotIdx + 1 })}
                  {slot.parsed?.length > 0 && (
                    <span className="ml-2 text-emerald-600">
                      {t("curateTrials.parsedBadge")}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => previewSlot(slot.id)}
                    disabled={slot.loading || !slot.text.trim()}
                    className="h-8 px-3 text-xs inline-flex items-center gap-1.5 rounded-lg bg-[#2F3C96] hover:bg-[#253075] text-white font-semibold shadow-sm hover:shadow-md transition-all"
                  >
                    {slot.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    {t("curateTrials.preview")}
                  </Button>
                  {slots.length > 1 && (
                    <button
                      onClick={() => removeSlot(slot.id)}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-500 transition-colors"
                      title={t("curateTrials.removeSlotTitle")}
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
                    {t("curateTrials.previewSection")}
                  </p>
                  {slot.parsed.map((trialRow, idx) => (
                    <TrialPreviewDetail
                      key={idx}
                      t={trialRow}
                      onPatch={(patch) =>
                        updateParsedTrial(slot.id, idx, patch)
                      }
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
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200/70 bg-indigo-50/30 py-3 text-sm font-medium text-slate-600 hover:border-indigo-300 hover:text-[#2F3C96] hover:bg-indigo-50/50 transition-colors mb-8"
        >
          <Plus className="w-4 h-4" />
          {t("curateTrials.addAnotherTrial")}
        </button>

        {/* Global actions */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={previewAll}
            disabled={anyLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2F3C96] hover:bg-[#253075] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all"
          >
            {anyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {t("curateTrials.previewAll")}
          </Button>
          {anyParsed && (
            <Button
              onClick={() => setConfirmOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#2F3C96] hover:bg-slate-50 hover:border-indigo-200 shadow-sm hover:shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              {t("curateTrials.saveToDb", { count: allParsed.length })}
            </Button>
          )}
        </div>

        {/* Confirm modal */}
        <Modal
          isOpen={confirmOpen}
          onClose={() => !saving && setConfirmOpen(false)}
          title={t("curateTrials.confirmSaveTitle")}
        >
          <p className="text-sm text-slate-600 mb-4">
            {t("curateTrials.confirmSaveBody", { count: allParsed.length })}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={saving}
              className="border border-slate-200"
            >
              {t("ui.cancel")}
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
              {t("curateTrials.confirmSave")}
            </Button>
          </div>
        </Modal>
          </>
        )}

        {curateTab === "template" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setTemplateDraft(createEmptyTemplateTrial())}
                disabled={saving}
                className="border border-slate-200"
              >
                {t("curateTrials.resetTemplate")}
              </Button>
              <Button
                type="button"
                onClick={() => setTemplateModalOpen(true)}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#2F3C96] hover:bg-indigo-50"
              >
                <FileEdit className="w-4 h-4" />
                {t("curateTrials.editTrial")}
              </Button>
              <Button
                type="button"
                onClick={() => setTemplateConfirmOpen(true)}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2F3C96] hover:bg-[#253075] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
              >
                <Save className="w-4 h-4" />
                {t("curateTrials.saveTrial")}
              </Button>
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {t("curateTrials.livePreview")}
                </p>
                <button
                  type="button"
                  onClick={() => setTemplateHelpOpen((o) => !o)}
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-indigo-600 transition-colors ${
                    templateHelpOpen
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-indigo-200 bg-white hover:bg-indigo-50"
                  }`}
                  aria-expanded={templateHelpOpen}
                  aria-label={t("curateTrials.templateHelpAria")}
                  title={t("curateTrials.templateHelpAria")}
                >
                  <Info className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              {templateHelpOpen && (
                <div
                  className="rounded-xl border border-indigo-100 bg-slate-50/90 px-4 py-3 text-sm text-slate-700"
                  dangerouslySetInnerHTML={{
                    __html: t("curateTrials.templateHelpBody"),
                  }}
                />
              )}
            </div>
            <TrialPreviewDetail
              t={templateDraft}
              onPatch={patchTemplateDraft}
              showAllSections
              showMetadataFields
            />
          </div>
        )}

        <Modal
          isOpen={templateModalOpen}
          onClose={() => !saving && setTemplateModalOpen(false)}
          maxWidthClassName="max-w-3xl"
          title={t("curateTrials.editModalTitle")}
        >
          <div className="space-y-3 max-h-[min(78vh,720px)] overflow-y-auto pr-1">
            <p className="text-xs text-slate-500">{t("curateTrials.editModalHint")}</p>
            <TrialPreviewDetail
              t={templateDraft}
              onPatch={patchTemplateDraft}
              showAllSections
              showMetadataFields
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 mt-2 border-t border-slate-100">
            <Button
              variant="ghost"
              onClick={() => setTemplateModalOpen(false)}
              disabled={saving}
              className="border border-slate-200"
            >
              {t("curateTrials.close")}
            </Button>
            <Button
              onClick={() => {
                setTemplateModalOpen(false);
                setTemplateConfirmOpen(true);
              }}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2F3C96] hover:bg-[#253075] px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Save className="w-4 h-4" />
              {t("curateTrials.saveTrialEllipsis")}
            </Button>
          </div>
        </Modal>

        <Modal
          isOpen={templateConfirmOpen}
          onClose={() => !saving && setTemplateConfirmOpen(false)}
          title={t("curateTrials.confirmSingleTitle")}
        >
          <p className="text-sm text-slate-600 mb-4">
            {t("curateTrials.confirmSingleBody")}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setTemplateConfirmOpen(false)}
              disabled={saving}
              className="border border-slate-200"
            >
              {t("ui.cancel")}
            </Button>
            <Button
              onClick={saveTemplateTrial}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ClipboardPaste className="w-4 h-4" />
              )}
              {t("curateTrials.confirmSave")}
            </Button>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
