import React, { useCallback, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "./ui/Modal.jsx";
import apiFetch from "../utils/api.js";

const EXPERIENCE_TO_RATING = {
  excellent: "excellent",
  good: "good",
  fair: "average",
  poor: "poor",
  "very-frustrating": "poor",
};

const Q1 = [
  { value: "patient", label: "Patient" },
  { value: "researcher", label: "Researcher" },
  { value: "both", label: "Both" },
  { value: "other", label: "Other" },
];

const Q2 = [
  { value: "ask-question", label: "Ask a research question" },
  { value: "explore-research", label: "Explore new research" },
  { value: "connect", label: "Connect with researchers / patients" },
  { value: "clinical-trials", label: "Look for clinical trials" },
  { value: "share-work", label: "Share my work" },
  { value: "browsing", label: "Just browsing" },
];

const Q3 = [
  { value: "excellent", label: "Excellent", starCount: 5 },
  { value: "good", label: "Good", starCount: 4 },
  { value: "fair", label: "Fair", starCount: 3 },
  { value: "poor", label: "Poor", starCount: 2 },
  { value: "very-frustrating", label: "Very frustrating", starCount: 1 },
];

const Q4 = [
  { value: "yes-easy", label: "Yes, easily" },
  { value: "yes-effort", label: "Yes, but it took effort" },
  { value: "not-completely", label: "Not completely" },
  { value: "no", label: "No" },
];

const Q5 = [
  { value: "research-explanations", label: "Research explanations" },
  { value: "trial-access", label: "Clinical trial access" },
  { value: "expert-responses", label: "Expert responses" },
  { value: "community", label: "Community discussions" },
  { value: "discovery", label: "Discovery / following others" },
  { value: "transparency", label: "Transparency of research" },
  { value: "not-sure", label: "Not sure yet" },
];

const Q6 = [
  { value: "navigation", label: "Navigation" },
  { value: "research-language", label: "Understanding research language" },
  { value: "posting-interacting", label: "Posting or interacting" },
  { value: "finding-experts", label: "Finding experts" },
  { value: "trial-search", label: "Trial search" },
  { value: "nothing-confusing", label: "Nothing was confusing" },
  { value: "other", label: "Other" },
];

function PurpleStars({ count }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 text-[#2F3C96]" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <svg
          key={i}
          className="h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </span>
  );
}

function labelFrom(options, value) {
  if (!value) return "—";
  const hit = options.find((o) => o.value === value);
  return hit ? hit.label : value;
}

function labelsFrom(options, values) {
  if (!values?.length) return "—";
  return values
    .map((v) => {
      const hit = options.find((o) => o.value === v);
      return hit ? hit.label : v;
    })
    .join("; ");
}

function ChipToggle({ selected, onToggle, label, prefix, className = "" }) {
  return (
    <button
      type="button"
      onClick={() => onToggle()}
      aria-pressed={selected}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-all duration-200 sm:px-3.5 sm:py-2.5 ${className} ${
        selected
          ? "border-[#2F3C96] bg-[#E8D5FF]/90 text-[#1e2a6e] shadow-sm"
          : "border-slate-200/90 bg-white/90 text-slate-700 hover:border-[#2F3C96]/40 hover:bg-[#f7f4fc]"
      }`}
    >
      {prefix != null && prefix !== false && (
        <span className="shrink-0 leading-none">{prefix}</span>
      )}
      <span>{label}</span>
    </button>
  );
}

function initialForm() {
  return {
    role: "",
    purposes: [],
    experience: "",
    found: "",
    mostValuable: [],
    confusing: [],
    returnLikelihood: null,
    improvement: "",
  };
}

function buildGuestSurveyBody(form, location) {
  const expLabel = Q3.find((o) => o.value === form.experience);
  const lines = [
    "Collabiora — research communication survey (signed out)",
    "",
    `1. I am a: ${labelFrom(Q1, form.role)}`,
    `2. What brought you here: ${labelsFrom(Q2, form.purposes)}`,
    `3. Experience today: ${
      expLabel ? `${expLabel.starCount}/5 stars — ${expLabel.label}` : form.experience || "—"
    }`,
    `4. Found what you looked for: ${labelFrom(Q4, form.found)}`,
    `5. Most valuable: ${labelsFrom(Q5, form.mostValuable)}`,
    `6. Confusing or difficult: ${labelsFrom(Q6, form.confusing)}`,
    `7. Likelihood to return (0–10): ${form.returnLikelihood ?? "—"}`,
    `8. One thing to improve: ${(form.improvement || "").trim() || "—"}`,
    "",
    `Page: ${location.pathname}`,
  ];
  return lines.join("\n");
}

const feedbackModalTitle = (
  <>
    <span>Help us improve collabiora</span>
    <svg
      className="h-5 w-5 shrink-0 text-[#2F3C96]"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  </>
);

export default function CollabioraSurveyFeedback() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);

  const reset = useCallback(() => setForm(initialForm()), []);

  const readUserId = () => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      return u?._id || u?.id || null;
    } catch {
      return null;
    }
  };

  const toggleMulti = (field, value) => {
    setForm((prev) => {
      const set = new Set(prev[field]);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return { ...prev, [field]: [...set] };
    });
  };

  const canSubmit =
    Boolean(form.role) && Boolean(form.experience) && EXPERIENCE_TO_RATING[form.experience];

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Please choose who you are and how today felt (use the stars).");
      return;
    }

    const rating = EXPERIENCE_TO_RATING[form.experience];
    setSubmitting(true);
    try {
      const uid = readUserId();
      if (uid) {
        const res = await apiFetch("/api/feedback", {
          method: "POST",
          body: JSON.stringify({
            userId: uid,
            rating,
            role: form.role,
            purposes: form.purposes,
            experience: form.experience,
            found: form.found || null,
            mostValuable: form.mostValuable,
            confusing: form.confusing,
            returnLikelihood:
              form.returnLikelihood === null || form.returnLikelihood === undefined
                ? null
                : Number(form.returnLikelihood),
            improvement: form.improvement.trim(),
            pageUrl: typeof window !== "undefined" ? window.location.href : "",
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Could not send feedback");
        }
      } else {
        const res = await apiFetch("/api/page-feedback", {
          method: "POST",
          body: JSON.stringify({
            feedback: buildGuestSurveyBody(form, location),
            pagePath: location.pathname || "/",
            pageUrl: typeof window !== "undefined" ? window.location.href : "",
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Could not send feedback");
        }
      }

      toast.success("Thank you, your feedback helps Collabiora grow.");
      setOpen(false);
      reset();
    } catch (e) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const sectionTitle = (text) => (
    <h3 className="mt-6 first:mt-0 text-sm font-bold text-[#2F3C96]">{text}</h3>
  );

  return (
    <>
      <div className="fixed left-0 top-1/2 z-[90] -translate-y-1/2 pointer-events-none [&>*]:pointer-events-auto">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex h-[3.75rem] w-[3.75rem] flex-col items-center justify-center gap-1 rounded-r-xl border border-l-0 border-[#2F3C96]/35 bg-gradient-to-b from-[#E8E0EF] to-white p-2 shadow-[4px_0_20px_-8px_rgba(47,60,150,0.35)] transition-transform duration-200 hover:translate-x-0.5 sm:h-16 sm:w-16 sm:rounded-r-2xl"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Open feedback survey"
        >
          <MessageSquare
            className="h-3.5 w-3.5 shrink-0 text-[#2F3C96] sm:h-4 sm:w-4"
            strokeWidth={2}
            aria-hidden
          />
          <span className="whitespace-nowrap text-[9px] font-bold uppercase tracking-tight text-[#2F3C96] sm:text-[11px]">
            Feedback
          </span>
        </button>
      </div>

      <Modal
        isOpen={open}
        onClose={() => {
          setOpen(false);
        }}
        title={feedbackModalTitle}
        maxWidthClassName="max-w-2xl sm:max-w-3xl"
        performance
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Maybe later
            </button>
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
              className="rounded-xl bg-gradient-to-r from-[#2F3C96] to-[#474F97] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Send feedback"}
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          This survey takes less than one minute. Choose what fits you.
        </p>

        {sectionTitle("1. I am a")}
        <div className="mt-2 flex flex-wrap gap-2">
          {Q1.map((o) => (
            <ChipToggle
              key={o.value}
              selected={form.role === o.value}
              onToggle={() =>
                setForm((p) => ({ ...p, role: p.role === o.value ? "" : o.value }))
              }
              label={o.label}
            />
          ))}
        </div>

        {sectionTitle("2. What brought you to Collabiora today?")}
        <p className="mb-2 text-xs text-slate-500">Choose any that apply.</p>
        <div className="flex flex-wrap gap-2">
          {Q2.map((o) => (
            <ChipToggle
              key={o.value}
              selected={form.purposes.includes(o.value)}
              onToggle={() => toggleMulti("purposes", o.value)}
              label={o.label}
            />
          ))}
        </div>

        {sectionTitle("3. Was your experience today?")}
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {Q3.map((o) => (
            <ChipToggle
              key={o.value}
              selected={form.experience === o.value}
              onToggle={() =>
                setForm((p) => ({
                  ...p,
                  experience: p.experience === o.value ? "" : o.value,
                }))
              }
              prefix={<PurpleStars count={o.starCount} />}
              label={o.label}
            />
          ))}
        </div>

        {sectionTitle("4. Did you find what you were looking for?")}
        <div className="mt-2 flex flex-wrap gap-2">
          {Q4.map((o) => (
            <ChipToggle
              key={o.value}
              selected={form.found === o.value}
              onToggle={() =>
                setForm((p) => ({ ...p, found: p.found === o.value ? "" : o.value }))
              }
              label={o.label}
            />
          ))}
        </div>

        {sectionTitle("5. What felt most valuable?")}
        <p className="mb-2 text-xs text-slate-500">Choose any that apply.</p>
        <div className="flex flex-wrap gap-2">
          {Q5.map((o) => (
            <ChipToggle
              key={o.value}
              selected={form.mostValuable.includes(o.value)}
              onToggle={() => toggleMulti("mostValuable", o.value)}
              label={o.label}
            />
          ))}
        </div>

        {sectionTitle("6. What felt confusing or difficult?")}
        <p className="mb-2 text-xs text-slate-500">Choose any that apply.</p>
        <div className="flex flex-wrap gap-2">
          {Q6.map((o) => (
            <ChipToggle
              key={o.value}
              selected={form.confusing.includes(o.value)}
              onToggle={() => toggleMulti("confusing", o.value)}
              label={o.label}
            />
          ))}
        </div>

        {sectionTitle("7. How likely are you to return to Collabiora?")}
        <p className="mb-2 text-xs text-slate-500">
          0 = not likely at all · 10 = extremely likely
        </p>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {Array.from({ length: 11 }, (_, n) => (
            <button
              key={n}
              type="button"
              aria-pressed={form.returnLikelihood === n}
              onClick={() =>
                setForm((p) => ({
                  ...p,
                  returnLikelihood: p.returnLikelihood === n ? null : n,
                }))
              }
              className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-bold transition-all sm:h-10 sm:w-10 ${
                form.returnLikelihood === n
                  ? "border-[#2F3C96] bg-[#2F3C96] text-white shadow-md"
                  : "border-slate-200 bg-white text-slate-700 hover:border-[#2F3C96]/45"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {sectionTitle("8. (Optional) What is ONE thing we could improve?")}
        <textarea
          value={form.improvement}
          onChange={(e) => setForm((p) => ({ ...p, improvement: e.target.value }))}
          rows={3}
          maxLength={2000}
          placeholder="A sentence or two is perfect…"
          className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2F3C96] focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20"
        />
      </Modal>
    </>
  );
}
