import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ChevronDown, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  mergeCollabioraProIntoStoredUser,
  useCollabioraPro,
} from "../utils/collabioraPro.js";
import apiFetch from "../utils/api.js";
import AnimatedBackground from "../components/ui/AnimatedBackground";
import Footer from "../components/Footer";

const ROYAL = "#2F3C96";
const PURPLE = "#D0C4E2";
const SURFACE = "#F5F2F8";
const MUTED = "#787878";
/** Light pink surface (matches site e.g. FAQ cards / AnimatedBackground tints) */
const TICK_BG = "#F5F2F8";

function FeatureIcon({ included }) {
  return (
    <span
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
      style={{
        backgroundColor: included ? TICK_BG : "rgba(120, 120, 120, 0.12)",
        color: included ? ROYAL : "#9ca3af",
        border: included ? `1px solid ${PURPLE}99` : undefined,
      }}
      aria-hidden
    >
      {included ? (
        <Check className="h-4 w-4 stroke-[2.5]" />
      ) : (
        <X className="h-3.5 w-3.5 opacity-70" />
      )}
    </span>
  );
}

function PlanCard({
  badge,
  badgeStyle,
  title,
  priceLine,
  priceSub,
  description,
  features,
  highlight,
  action,
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border p-6 sm:p-7 shadow-sm transition-shadow ${
        highlight ? "border-2" : "border"
      }`}
      style={{
        backgroundColor: SURFACE,
        borderColor: highlight ? ROYAL : `${PURPLE}99`,
        boxShadow: highlight
          ? "0 12px 40px -12px rgba(47, 60, 150, 0.18)"
          : undefined,
      }}
    >
      <span
        className="mb-4 inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold"
        style={badgeStyle}
      >
        {badge}
      </span>
      <h2 className="text-2xl font-bold tracking-tight" style={{ color: ROYAL }}>
        {title}
      </h2>
      <div className="mt-2 flex flex-wrap items-baseline gap-2">
        <span className="text-3xl font-bold" style={{ color: ROYAL }}>
          {priceLine}
        </span>
        {priceSub ? (
          <span className="text-sm font-medium" style={{ color: MUTED }}>
            {priceSub}
          </span>
        ) : null}
      </div>
      {description ? (
        <p className="mt-3 text-sm leading-relaxed" style={{ color: MUTED }}>
          {description}
        </p>
      ) : null}
      <div
        className="my-5 h-px w-full"
        style={{ backgroundColor: `${PURPLE}80` }}
      />
      <ul className="flex flex-col gap-3">
        {features.map((f) => (
          <li key={f.label} className="flex gap-3 text-sm">
            <FeatureIcon included={f.included} />
            <span style={{ color: f.included ? "#374151" : MUTED }}>{f.label}</span>
          </li>
        ))}
      </ul>
      {action ? <div className="mt-auto pt-6">{action}</div> : null}
    </div>
  );
}

function CellDash() {
  return (
    <span className="text-lg font-light tabular-nums" style={{ color: "#c4c4c4" }}>
      —
    </span>
  );
}

function CellCheck({ children, sub }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 text-center">
      <span
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: TICK_BG,
          border: `1px solid ${PURPLE}99`,
        }}
      >
        <Check className="h-4 w-4" style={{ color: ROYAL }} strokeWidth={2.5} />
      </span>
      {children ? (
        <span className="text-xs font-semibold leading-tight" style={{ color: ROYAL }}>
          {children}
        </span>
      ) : null}
      {sub ? (
        <span className="text-[11px] font-medium leading-tight" style={{ color: ROYAL }}>
          {sub}
        </span>
      ) : null}
    </div>
  );
}

export default function Plans() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPro = useCollabioraPro();
  const [isMobile, setIsMobile] = useState(false);
  const [proModalOpen, setProModalOpen] = useState(false);
  const [proCode, setProCode] = useState("");
  const [redeemSubmitting, setRedeemSubmitting] = useState(false);

  const syncAccount = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const [account, setAccount] = useState(() => syncAccount());

  useEffect(() => {
    const onAuth = () => setAccount(syncAccount());
    window.addEventListener("login", onAuth);
    window.addEventListener("logout", onAuth);
    window.addEventListener("userUpdated", onAuth);
    return () => {
      window.removeEventListener("login", onAuth);
      window.removeEventListener("logout", onAuth);
      window.removeEventListener("userUpdated", onAuth);
    };
  }, [syncAccount]);

  useEffect(() => {
    if (searchParams.get("proIntent") === "1") {
      setProModalOpen(true);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("proIntent");
          return next;
        },
        { replace: true },
      );
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const browseFeatures = [
    { label: "Search publications, clinical trials & experts", included: true },
    { label: "Read Yori's plain-language health summaries", included: true },
    { label: "Personalized dashboard", included: false },
    { label: "Forums & researcher messaging", included: false },
    { label: "Diet, exercise & supplement guidance", included: false },
  ];

  const memberFeatures = [
    { label: "Everything in Browse", included: true },
    { label: "Personalized dashboard for one condition", included: true },
    { label: "Recommended readings, trials & experts", included: true },
    { label: "Community forums & researcher messaging", included: true },
    { label: "Comorbid conditions & medications", included: false },
    { label: "Diet, exercise & supplement guidance", included: false },
  ];

  const premiumFeatures = [
    { label: "Everything in Member", included: true },
    { label: "Personalized diet & exercise guidance", included: true },
    { label: "Supplement recommendations", included: true },
    { label: "All conditions & comorbidities tracked", included: true },
    { label: "Medication-aware recommendations", included: true },
    { label: "Trials & experts matched to your full profile", included: true },
  ];

  return (
    <div className="relative min-h-screen flex flex-col">
      <AnimatedBackground isMobile={isMobile} />

      <section className="relative z-10 flex flex-1 flex-col px-4 pb-16 pt-20 sm:px-6 sm:pt-24 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <motion.div
            initial={isMobile ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={isMobile ? { duration: 0 } : { duration: 0.5 }}
            className="mb-12 text-center"
          >
            <h1
              className="mx-auto max-w-3xl text-3xl font-bold leading-tight sm:text-4xl"
              style={{ color: ROYAL }}
            >
              Choose how you want to explore collabiora.
            </h1>
            <div
              className="mx-auto mt-4 h-1 w-20 rounded-full"
              style={{
                background: `linear-gradient(90deg, transparent, ${PURPLE}, ${ROYAL}, ${PURPLE}, transparent)`,
              }}
            />
            {isPro ? (
              <p
                className="mx-auto mt-6 max-w-xl rounded-xl border px-4 py-3 text-center text-sm font-semibold"
                style={{
                  borderColor: PURPLE,
                  backgroundColor: "rgba(255,255,255,0.9)",
                  color: ROYAL,
                }}
              >
                {t("plans.proActiveBadge")}
              </p>
            ) : null}
          </motion.div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
            <PlanCard
              badge="No account needed"
              badgeStyle={{
                backgroundColor: "#fff",
                color: "#111",
                border: "1px solid #e5e7eb",
              }}
              title="Browse"
              priceLine="Free"
              priceSub="forever"
              description=""
              features={browseFeatures}
              action={
                <Link
                  to="/explore"
                  className="block rounded-xl px-5 py-3.5 text-center text-sm font-semibold text-white transition hover:opacity-95"
                  style={{ backgroundColor: ROYAL }}
                >
                  Browse now
                </Link>
              }
            />
            <PlanCard
              badge="Free account"
              badgeStyle={{
                backgroundColor: "#ede9f7",
                color: ROYAL,
                border: `1px solid ${PURPLE}`,
              }}
              title="Member"
              priceLine="Free"
              priceSub="forever"
              description=""
              features={memberFeatures}
              action={
                <Link
                  to="/signin"
                  className="block rounded-xl px-5 py-3.5 text-center text-sm font-semibold text-white transition hover:opacity-95"
                  style={{ backgroundColor: ROYAL }}
                >
                  Sign up free
                </Link>
              }
            />
            <PlanCard
              badge="Most complete"
              badgeStyle={{
                backgroundColor: ROYAL,
                color: "#fff",
              }}
              title="Premium"
              priceLine="$14.99"
              priceSub="/ month"
              description=""
              features={premiumFeatures}
              highlight
              action={
                <button
                  type="button"
                  onClick={() => {
                    const u = account;
                    const loggedIn = Boolean(u && (u._id || u.id));
                    if (!loggedIn) {
                      navigate("/onboarding?fromPro=1");
                      return;
                    }
                    setProModalOpen(true);
                  }}
                  className="block w-full rounded-xl border-2 bg-white px-5 py-3.5 text-center text-sm font-semibold transition hover:bg-[#F5F2F8]"
                  style={{ borderColor: PURPLE, color: ROYAL }}
                >
                  Get Premium
                </button>
              }
            />
          </div>

          {/* Full comparison table */}
          <div id="full-feature-comparison" className="mt-16 scroll-mt-24">
            <h2
              className="mb-6 text-left text-sm font-semibold uppercase tracking-wider"
              style={{ color: MUTED }}
            >
              Full feature comparison
            </h2>
            <div
              className="overflow-x-auto rounded-2xl border shadow-sm"
              style={{ borderColor: PURPLE, backgroundColor: "rgba(255,255,255,0.85)" }}
            >
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${PURPLE}` }}>
                    <th
                      className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide sm:px-6"
                      style={{ color: MUTED }}
                    >
                      Feature
                    </th>
                    <th
                      className="px-3 py-4 text-center text-xs font-bold sm:px-4"
                      style={{ color: ROYAL }}
                    >
                      Browse
                    </th>
                    <th
                      className="px-3 py-4 text-center text-xs font-bold sm:px-4"
                      style={{ color: ROYAL }}
                    >
                      Member
                    </th>
                    <th
                      className="px-3 py-4 text-center text-xs font-bold sm:px-4"
                      style={{ color: ROYAL }}
                    >
                      Premium
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ backgroundColor: SURFACE }}>
                    <td
                      colSpan={4}
                      className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide sm:px-6"
                      style={{ color: ROYAL }}
                    >
                      Search &amp; discovery
                    </td>
                  </tr>
                  {[
                    "Search publications, trials & experts",
                    "Plain-language Yori summaries",
                  ].map((label, i) => (
                    <tr
                      key={label}
                      style={{
                        borderBottom: `1px solid ${PURPLE}66`,
                        backgroundColor: i % 2 === 0 ? "rgba(245, 242, 248, 0.5)" : "#fff",
                      }}
                    >
                      <td className="px-4 py-3.5 text-left sm:px-6" style={{ color: "#374151" }}>
                        {label}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <CellCheck />
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <CellCheck />
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <CellCheck />
                      </td>
                    </tr>
                  ))}

                  <tr style={{ backgroundColor: SURFACE }}>
                    <td
                      colSpan={4}
                      className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide sm:px-6"
                      style={{ color: ROYAL }}
                    >
                      Personalization
                    </td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${PURPLE}66`, backgroundColor: "#fff" }}>
                    <td className="px-4 py-3.5 sm:px-6" style={{ color: "#374151" }}>
                      Personalized dashboard
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <CellDash />
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <CellCheck />
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <CellCheck />
                    </td>
                  </tr>
                  <tr
                    style={{
                      borderBottom: `1px solid ${PURPLE}66`,
                      backgroundColor: "rgba(245, 242, 248, 0.5)",
                    }}
                  >
                    <td className="px-4 py-3.5 sm:px-6" style={{ color: "#374151" }}>
                      Conditions covered
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <CellDash />
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className="text-sm font-semibold" style={{ color: "#7c3aed" }}>
                        1 condition
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className="text-sm font-semibold" style={{ color: ROYAL }}>
                        ✓ Unlimited
                      </span>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${PURPLE}66`, backgroundColor: "#fff" }}>
                    <td className="px-4 py-3.5 sm:px-6" style={{ color: "#374151" }}>
                      Medication input &amp; awareness
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <CellDash />
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <CellDash />
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <CellCheck />
                    </td>
                  </tr>
                  <tr
                    style={{
                      borderBottom: `1px solid ${PURPLE}66`,
                      backgroundColor: "rgba(245, 242, 248, 0.5)",
                    }}
                  >
                    <td className="px-4 py-3.5 sm:px-6" style={{ color: "#374151" }}>
                      Recommended readings
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <CellDash />
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <CellCheck />
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <CellCheck />
                    </td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${PURPLE}66`, backgroundColor: "#fff" }}>
                    <td className="px-4 py-3.5 sm:px-6" style={{ color: "#374151" }}>
                      Matched clinical trials
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <CellDash />
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <CellCheck />
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <CellCheck sub="Full profile match" />
                    </td>
                  </tr>
                  <tr
                    style={{
                      borderBottom: `1px solid ${PURPLE}66`,
                      backgroundColor: "rgba(245, 242, 248, 0.5)",
                    }}
                  >
                    <td className="px-4 py-3.5 sm:px-6" style={{ color: "#374151" }}>
                      Expert recommendations
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <CellDash />
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <CellCheck />
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <CellCheck sub="Full profile match" />
                    </td>
                  </tr>

                  <tr style={{ backgroundColor: SURFACE }}>
                    <td
                      colSpan={4}
                      className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide sm:px-6"
                      style={{ color: ROYAL }}
                    >
                      Lifestyle guidance
                    </td>
                  </tr>
                  {["Diet recommendations", "Exercise guidance", "Supplement recommendations"].map(
                    (label, i) => (
                      <tr
                        key={label}
                        style={{
                          borderBottom: `1px solid ${PURPLE}66`,
                          backgroundColor: i % 2 === 0 ? "#fff" : "rgba(245, 242, 248, 0.5)",
                        }}
                      >
                        <td className="px-4 py-3.5 sm:px-6" style={{ color: "#374151" }}>
                          {label}
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <CellDash />
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <CellDash />
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <CellCheck />
                        </td>
                      </tr>
                    ),
                  )}

                  <tr style={{ backgroundColor: SURFACE }}>
                    <td
                      colSpan={4}
                      className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide sm:px-6"
                      style={{ color: ROYAL }}
                    >
                      Community &amp; research
                    </td>
                  </tr>
                  {["Community forums", "Message researchers directly"].map((label, i) => (
                    <tr
                      key={label}
                      style={{
                        borderBottom: `1px solid ${PURPLE}66`,
                        backgroundColor: i % 2 === 0 ? "rgba(245, 242, 248, 0.5)" : "#fff",
                      }}
                    >
                      <td className="px-4 py-3.5 sm:px-6" style={{ color: "#374151" }}>
                        {label}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <CellDash />
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <CellCheck />
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <CellCheck />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex justify-center">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full border"
                style={{ borderColor: PURPLE, color: ROYAL }}
                aria-hidden
              >
                <ChevronDown className="h-5 w-5" />
              </div>
            </div>

            <p
              className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed"
              style={{ color: MUTED }}
            >
              Patients always access collabiora for free. Premium is optional and
              never required to connect with your community. Questions?{" "}
              <Link to="/yori" className="font-semibold underline-offset-2 hover:underline" style={{ color: ROYAL }}>
                Chat with Yori
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {proModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="plans-pro-modal-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl"
            style={{ borderColor: PURPLE }}
          >
            <h2
              id="plans-pro-modal-title"
              className="text-lg font-bold"
              style={{ color: ROYAL }}
            >
              {t("plans.proModalTitle")}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{t("plans.proModalBody")}</p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("plans.proCodeLabel")}
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={proCode}
              onChange={(e) => setProCode(e.target.value)}
              placeholder={t("plans.proCodePlaceholder")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-[#2F3C96] focus:outline-none focus:ring-1 focus:ring-[#2F3C96]/30"
            />
            <div className="mt-6 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setProModalOpen(false);
                  setProCode("");
                }}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                {t("plans.proCancel")}
              </button>
              <button
                type="button"
                disabled={redeemSubmitting}
                onClick={async () => {
                  setRedeemSubmitting(true);
                  try {
                    const res = await apiFetch("/api/collabiora-pro/redeem-code", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ code: proCode.trim() }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok || !data.ok || !data.user) {
                      toast.error(
                        data?.error || t("plans.proUnlockInvalid"),
                      );
                      return;
                    }
                    mergeCollabioraProIntoStoredUser(data.user);
                    toast.success(t("plans.proUnlockSuccess"));
                    setProModalOpen(false);
                    setProCode("");
                    navigate("/wellness");
                  } catch {
                    toast.error(t("plans.proUnlockInvalid"));
                  } finally {
                    setRedeemSubmitting(false);
                  }
                }}
                className="rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: ROYAL }}
              >
                {t("plans.proSubmit")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}
