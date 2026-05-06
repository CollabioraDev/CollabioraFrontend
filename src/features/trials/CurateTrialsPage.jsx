import React, { useState, useCallback, useEffect, useMemo } from "react";
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
  Copy,
  Building2,
  Upload,
  FileText,
  ShieldAlert,
  Lock,
  ArrowLeft,
} from "lucide-react";
import Layout from "../../components/Layout.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import CustomSelect from "../../components/ui/CustomSelect.jsx";
import {
  base,
  PLACEHOLDER,
  PASTE_FORMAT_EXAMPLE,
} from "./curateTrialsConstants.js";
import {
  applyTrialPatch,
  buildEligibilityCriteriaFromParts,
  createEmptyTemplateTrial,
} from "./curateTrialsUtils.js";
import { TrialPreviewDetail } from "./TrialPreviewDetail.jsx";

let nextId = 1;
function makeSlot(source = "paste") {
  return { id: nextId++, text: "", parsed: null, errors: [], loading: false, source };
}

export default function CurateTrials() {
  const { t } = useTranslation("common");
  const [searchParams, setSearchParams] = useSearchParams();
  const curateTab =
    searchParams.get("tab") === "upload"
      ? "upload"
      : searchParams.get("tab") === "paste"
        ? "paste"
        : "template";

  function setCurateTab(next) {
    const token = searchParams.get("token");
    const newParams = {};
    if (token) newParams.token = token;
    if (next !== "template") newParams.tab = next;
    setSearchParams(newParams);
  }

  const [templateHelpOpen, setTemplateHelpOpen] = useState(false);

  const [slots, setSlots] = useState(() => [makeSlot()]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [templateDraft, setTemplateDraft] = useState(createEmptyTemplateTrial);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateConfirmOpen, setTemplateConfirmOpen] = useState(false);
  const [curateInstitutionKey, setCurateInstitutionKey] = useState("");
  const [dynamicInstitutions, setDynamicInstitutions] = useState([]);
  const [tokenInstitution, setTokenInstitution] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setIsAccessDenied(true);
      return;
    }

    if (token) {
      async function validateToken() {
        setTokenLoading(true);
        try {
          const res = await fetch(`${base}/api/curated-trials/institution-by-token/${token}`);
          const data = await res.json();
          if (res.ok && data.institution) {
            setTokenInstitution(data.institution);
            setCurateInstitutionKey(data.institution.key);
            setIsAccessDenied(false);
          } else {
            // If a token is present but invalid, block access entirely (even for admins)
            // to prevent accidental uploads with a broken link
            setIsAccessDenied(true);
          }
        } catch (e) {
          console.error(e);
          setIsAccessDenied(true);
        } finally {
          setTokenLoading(false);
        }
      }
      validateToken();
    } else {
      // If no token but is admin, ensure access is NOT denied
      setIsAccessDenied(false);
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchList() {
      try {
        const res = await fetch(`${base}/api/curated-trials/institutions`);
        if (!res.ok) throw new Error("Failed to fetch institutions");
        const data = await res.json();
        setDynamicInstitutions(data.institutions || []);
      } catch (e) {
        console.error("fetch institutions", e);
      }
    }
    fetchList();
  }, []);

  const institutionOptions = useMemo(() => {
    return dynamicInstitutions.map((inst) => ({
      value: inst.key,
      label: inst.displayName,
    }));
  }, [dynamicInstitutions]);

  const currentInstitutionName = useMemo(() => {
    if (tokenInstitution) return tokenInstitution.displayName;
    const found = dynamicInstitutions.find((i) => i.key === curateInstitutionKey);
    return found ? found.displayName : "selected institution";
  }, [tokenInstitution, dynamicInstitutions, curateInstitutionKey]);

  const copyTrialFormatSample = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(PASTE_FORMAT_EXAMPLE);
      toast.success(t("curateTrials.formatCopied"));
    } catch (e) {
      console.error(e);
      toast.error(t("curateTrials.formatCopyFailed"));
    }
  }, [t]);

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

  const removeParsedTrial = useCallback((slotId, trialIndex) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const parsed = (s.parsed || []).filter((_, i) => i !== trialIndex);
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

  const activeSlots = slots.filter((s) => s.source === (curateTab === "upload" ? "file" : "paste"));
  const allParsed = activeSlots.flatMap((s) => s.parsed || []);

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

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    try {
      const res = await fetch(`${base}/api/curated-trials/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("curateTrials.uploadFailed"));

      const newTrials = data.trials || [];
      const errors = data.errors || [];

      if (newTrials.length === 0 && errors.length > 0) {
        toast.error(errors[0].message || t("curateTrials.uploadFailed"));
      } else if (newTrials.length > 0) {
        toast.success(t("curateTrials.parsedCount", { count: newTrials.length }));
        
        // Add each extracted trial as a new slot with parsed data
        const newSlots = newTrials.map(trial => ({
          ...makeSlot("file"),
          text: `Extracted from ${trial._fileName || "file"}`,
          parsed: [trial],
          loading: false
        }));

        setSlots(prev => {
          // Remove empty initial slot if it's the only one
          const filtered = prev.filter(s => s.text.trim() || s.parsed);
          return [...filtered, ...newSlots];
        });
      }

      if (errors.length > 0) {
        console.warn("Extraction warnings/errors:", errors);
        errors.forEach(err => toast.error(`${err.fileName}: ${err.message}`, { duration: 5000 }));
      }
    } catch (e) {
      console.error(e);
      toast.error(e.message || t("curateTrials.uploadFailed"));
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = "";
    }
  }

  const anyLoading = slots.some((s) => s.loading) || uploading;
  const anyParsed = allParsed.length > 0;

  if (isAccessDenied) {
    return (
      <Layout>
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12 text-center">
          <div className="mb-6 rounded-full bg-rose-50 p-6 ring-8 ring-rose-50/50">
            <ShieldAlert className="h-12 w-12 text-rose-600" />
          </div>
          <h1 className="mb-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {t("curateTrials.accessRestrictedTitle", "Secure Upload Required")}
          </h1>
          <p className="mb-8 max-w-md text-base leading-relaxed text-slate-600">
            {t("curateTrials.accessRestrictedBody", "Direct access to this page is restricted. Please use the unique secure link provided to your institution to upload clinical trials.")}
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("ui.backToHome", "Back to Home")}
            </Link>
          </div>
          <div className="mt-12 flex items-center gap-2 text-xs font-medium text-slate-400">
            <Lock className="h-3 w-3" />
            <span>Collabiora Secure Protocol Active</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full min-h-full bg-gradient-to-b from-slate-100/40 via-indigo-50/25 to-slate-100/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16 sm:pb-20">
        {/* Page header */}
        <div className="rounded-2xl border border-indigo-200/50 bg-gradient-to-br from-indigo-50/95 via-white to-violet-50/80 p-6 sm:p-7 shadow-md shadow-indigo-100/30 ring-1 ring-indigo-100/40 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2F3C96]">
              {t("curateTrials.pageTitle")}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1.5 leading-relaxed max-w-xl">
              {t("curateTrials.pageSubtitle")}
            </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                to={searchParams.get("token") ? `/add-trials/manage?token=${searchParams.get("token")}` : "/add-trials/manage"}
                className="inline-flex items-center rounded-lg border border-indigo-200 bg-white/90 px-3 py-2 text-sm font-medium text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50 transition-colors shadow-sm"
              >
                {t("curateTrials.viewSaved")}
              </Link>
              <Link
                to="/trials"
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
              >
                {t("curateTrials.backToTrials")}
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 p-1.5 rounded-xl bg-slate-100/80 border border-slate-200/80 shadow-sm ring-1 ring-slate-200/30">
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
            onClick={() => setCurateTab("upload")}
            className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              curateTab === "upload"
                ? "bg-white text-[#2F3C96] shadow-sm border border-indigo-100"
                : "text-slate-600 hover:bg-white/60"
            }`}
          >
            <Upload className="w-4 h-4 shrink-0" />
            {t("curateTrials.tabUpload", "Upload File")}
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
            {t("curateTrials.tabTemplate", "Template")}
          </button>
        </div>

        <div
          className="mb-6 rounded-2xl border border-indigo-200/55 bg-gradient-to-br from-white via-indigo-50/25 to-slate-50/80 px-4 py-4 sm:px-5 sm:py-4 shadow-sm shadow-indigo-100/20 ring-1 ring-indigo-100/40"
          role="group"
          aria-labelledby="curate-institution-label"
        >
          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:gap-5">
            <div className="flex items-center gap-3 sm:min-w-0 sm:max-w-[11rem]">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100/90 text-[#2F3C96] shadow-inner ring-1 ring-indigo-200/60"
                aria-hidden
              >
                <Building2 className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <label
                id="curate-institution-label"
                className="text-sm font-semibold text-slate-800 leading-snug"
              >
                {t("curateTrials.institutionLabel", "Institution")}
              </label>
            </div>
            <div className="w-full min-w-0 sm:flex-1 sm:max-w-2xl">
              {tokenLoading ? (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Validating link...
                </div>
              ) : tokenInstitution ? (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-sm font-semibold text-[#2F3C96] shadow-sm">
                  <Building2 className="w-4 h-4" />
                  {tokenInstitution.displayName}
                  <span className="ml-auto text-[10px] bg-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block">
                    Locked via Secure Link
                  </span>
                </div>
              ) : (
                <CustomSelect
                  value={curateInstitutionKey}
                  onChange={setCurateInstitutionKey}
                  options={institutionOptions}
                  disabled={saving}
                  className="w-full [&>div]:min-h-11 [&>div]:rounded-xl [&>div]:px-3.5 [&>div]:py-2.5 [&>div]:text-sm [&>div]:font-medium [&>div]:text-[#2F3C96] [&>div]:shadow-sm"
                  placeholder={t("curateTrials.institutionPlaceholder", "Select Institution")}
                />
              )}
            </div>
          </div>
        </div>

        {curateTab === "upload" && (
          <div className="space-y-6">
            <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/20 p-8 text-center transition-all hover:bg-indigo-50/40">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <Upload className="h-7 w-7" />
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-slate-800">
                  {t("curateTrials.uploadTitle", "Upload Trial Documents")}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {t("curateTrials.uploadSubtitle", "Support for Word (.docx), PDF, and Excel files")}
                </p>
              </div>
              <div className="mt-6">
                <input
                  type="file"
                  id="trial-upload"
                  className="hidden"
                  accept=".docx,.pdf,.xlsx,.xls,.csv"
                  multiple
                  disabled={uploading}
                  onChange={handleFileUpload}
                />
                <label
                  htmlFor="trial-upload"
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-md transition-all ${
                    uploading ? "bg-slate-400 cursor-not-allowed" : "bg-[#2F3C96] hover:bg-[#253075]"
                  }`}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  {uploading ? t("curateTrials.uploading", "Uploading...") : t("curateTrials.selectFiles", "Select Files")}
                </label>
              </div>
            </div>

            {/* Reusing the preview slots for uploaded content */}
            {anyParsed && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    {t("curateTrials.extractedTrials", "Extracted Trials")}
                  </h2>
                  {allParsed.length > 0 && (
                    <span className="text-xs font-medium text-slate-400">
                      {allParsed.length} trial{allParsed.length !== 1 ? "s" : ""} detected
                    </span>
                  )}
                </div>

                {activeSlots.map((slot) => (
                  (slot.parsed || []).map((trial, trialIdx) => (
                    <TrialPreviewDetail
                      key={`${slot.id}-${trialIdx}`}
                      t={trial}
                      showAllSections={true}
                      showMetadataFields={true}
                      onPatch={(patch) =>
                        updateParsedTrial(slot.id, trialIdx, patch)
                      }
                      onRemove={() => removeParsedTrial(slot.id, trialIdx)}
                    />
                  ))
                ))}
                
                <div className="flex justify-end pt-4">
                   <Button
                    onClick={() => setConfirmOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all"
                  >
                    <Save className="w-4 h-4" />
                    {t("curateTrials.saveAllToDb", {
                      count: allParsed.length,
                      defaultValue: `Save All Extracted Trials (${allParsed.length})`
                    })}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {curateTab === "paste" && (
          <>

        {/* Per-trial slots */}
        <div className="space-y-4 mb-4">
          {activeSlots.map((slot, slotIdx) => (
            <div
              key={slot.id}
              className="rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-200/40 ring-1 ring-slate-100/80 overflow-hidden"
            >
              {/* Slot header */}
              <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-indigo-50/50">
                <span className="text-xs font-semibold text-slate-600">
                  {t("curateTrials.trialSlot", { index: slotIdx + 1 })}
                  {slot.parsed?.length > 0 && (
                    <span className="ml-2 text-emerald-600">
                      {t("curateTrials.parsedBadge")}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Button
                    onClick={() => previewSlot(slot.id)}
                    disabled={slot.loading || !slot.text.trim()}
                    className="h-8 px-3 text-xs inline-flex items-center gap-1.5 rounded-lg bg-[#2F3C96] hover:bg-[#253075] text-white font-semibold shadow-sm hover:shadow-md transition-all"
                  >
                    {slot.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    {t("curateTrials.preview")}
                  </Button>
                  <button
                    type="button"
                    onClick={copyTrialFormatSample}
                    className="h-8 px-2.5 sm:px-3 text-xs inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white font-medium text-slate-600 hover:text-[#2F3C96] hover:border-indigo-200 hover:bg-indigo-50/80 transition-colors"
                    title={t("curateTrials.copyTrialFormatShort")}
                  >
                    <Copy className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">
                      {t("curateTrials.copyFormatShortLabel")}
                    </span>
                  </button>
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
              <div className="p-4 sm:p-5 pt-2 sm:pt-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 block">
                  {t("curateTrials.pasteFieldLabel")}
                </label>
                <textarea
                  value={slot.text}
                  onChange={(e) => updateSlotText(slot.id, e.target.value)}
                  rows={11}
                  placeholder={PLACEHOLDER}
                  className="w-full min-h-[220px] rounded-xl border border-slate-200/90 bg-slate-50/90 px-3.5 py-3 text-sm font-mono text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-400/80 focus:border-indigo-300/80 resize-y shadow-inner"
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
                      showAllSections={true}
                      showMetadataFields={true}
                      onPatch={(patch) =>
                        updateParsedTrial(slot.id, idx, patch)
                      }
                      onRemove={() => removeParsedTrial(slot.id, idx)}
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

          </>
        )}

        {/* Confirm modal for Save All (both tabs) */}
        <Modal
          isOpen={confirmOpen}
          onClose={() => !saving && setConfirmOpen(false)}
          title={t("curateTrials.confirmSaveTitle")}
          footer={
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl"
              >
                {t("ui.cancel")}
              </Button>
              <Button
                onClick={saveBulk}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-2 px-5 py-2 shadow-sm shadow-emerald-200/50 rounded-xl font-semibold"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ClipboardPaste className="w-4 h-4" />
                )}
                {t("curateTrials.confirmSave")}
              </Button>
            </div>
          }
        >
          <p className="text-sm text-slate-600">
            {t("curateTrials.confirmSaveBody", { 
              count: allParsed.length,
              institution: currentInstitutionName 
            })}
          </p>
        </Modal>

        {curateTab === "template" && (
          <div className="space-y-4 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setTemplateDraft(createEmptyTemplateTrial())}
                disabled={saving}
                className="border border-slate-200 rounded-xl"
              >
                {t("curateTrials.resetTemplate")}
              </Button>
              <Button
                type="button"
                onClick={() => setTemplateModalOpen(true)}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#2F3C96] hover:bg-indigo-50"
              >
                <FileEdit className="w-4 h-4" />
                {t("curateTrials.editTrial")}
              </Button>
              <Button
                type="button"
                onClick={() => setTemplateConfirmOpen(true)}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2F3C96] hover:bg-[#253075] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
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
          footer={
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setTemplateModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl"
              >
                {t("curateTrials.close")}
              </Button>
              <Button
                onClick={() => {
                  setTemplateModalOpen(false);
                  setTemplateConfirmOpen(true);
                }}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-[#2F3C96] hover:bg-[#253075] text-white px-5 py-2 shadow-sm shadow-indigo-200/50 rounded-xl font-semibold"
              >
                <Save className="w-4 h-4" />
                {t("curateTrials.saveTrialEllipsis")}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500">{t("curateTrials.editModalHint")}</p>
            <TrialPreviewDetail
              t={templateDraft}
              onPatch={patchTemplateDraft}
              showAllSections
              showMetadataFields
            />
          </div>
        </Modal>

        <Modal
          isOpen={templateConfirmOpen}
          onClose={() => !saving && setTemplateConfirmOpen(false)}
          title={t("curateTrials.confirmSingleTitle")}
          footer={
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setTemplateConfirmOpen(false)}
                disabled={saving}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl"
              >
                {t("ui.cancel")}
              </Button>
              <Button
                onClick={saveTemplateTrial}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-2 px-5 py-2 shadow-sm shadow-emerald-200/50 rounded-xl font-semibold"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ClipboardPaste className="w-4 h-4" />
                )}
                {t("curateTrials.confirmSave")}
              </Button>
            </div>
          }
        >
          <p className="text-sm text-slate-600">
            {t("curateTrials.confirmSingleBody", {
              institution: currentInstitutionName
            })}
          </p>
        </Modal>
        </div>
      </div>
    </Layout>
  );
}
