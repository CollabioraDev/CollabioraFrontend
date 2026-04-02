import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout.jsx";
import Button from "../components/ui/Button.jsx";
import { Loader2, Mail, ShieldOff } from "lucide-react";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

export default function EmailPreferences() {
  const { t } = useTranslation("common");
  const query = useQuery();
  const navigate = useNavigate();
  const token = query.get("token") || "";
  const type = query.get("type") || "";
  const action = query.get("action") || "";
  const endpointType =
    type === "profile-reminder" ? "profile-reminders" : "weekly-mailer";

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [optedOut, setOptedOut] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const allowedTypes = ["profile-reminder", "weekly-mailer"];
      if (!token || !allowedTypes.includes(type)) {
        setError(t("emailPreferences.invalidLink"));
        setLoading(false);
        return;
      }

      try {
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

        if (action === "unsubscribe") {
          setSaving(true);
          const unsubRes = await fetch(
            `${base}/api/email-preferences/${endpointType}/unsubscribe`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            },
          );
          const unsubData = await unsubRes.json();
          if (!unsubRes.ok) {
            throw new Error(unsubData.error || t("emailPreferences.updateFailed"));
          }
          setOptedOut(true);
          setEmail(unsubData.email || "");
          setError("");
          return;
        }

        const res = await fetch(
          `${base}/api/email-preferences/${endpointType}?token=${encodeURIComponent(
            token,
          )}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t("emailPreferences.invalidOrExpired"));

        setEmail(data.email || "");
        setOptedOut(!!data.profileReminderOptOut || !!data.weeklyMailerOptOut);
      } catch (err) {
        console.error("Email preferences load error:", err);
        setError(err.message || t("emailPreferences.invalidOrExpired"));
      } finally {
        setLoading(false);
        setSaving(false);
      }
    }
    load();
  }, [token, type, action, endpointType, t]);

  async function handleUnsubscribe() {
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(
        `${base}/api/email-preferences/${endpointType}/unsubscribe`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t("emailPreferences.updateFailed"));
      }
      setOptedOut(true);
    } catch (err) {
      console.error("Email preferences unsubscribe error:", err);
      setError(err.message || t("emailPreferences.updateFailed"));
    } finally {
      setSaving(false);
    }
  }

  const baseContent = (
    <div className="w-full max-w-lg mx-auto py-10">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl px-6 py-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-purple-100 flex items-center justify-center">
            <Mail className="w-5 h-5 text-brand-royal-blue" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-brand-royal-blue">
              {t("emailPreferences.title")}
            </h1>
            <p className="text-xs text-slate-600">
              {t("emailPreferences.subtitle")}
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-10 text-slate-500 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{t("emailPreferences.loading")}</span>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            <p className="font-medium mb-1">{t("emailPreferences.loadErrorTitle")}</p>
            <p>{error}</p>
            <div className="mt-3 flex justify-between items-center">
              <button
                type="button"
                className="text-[11px] text-slate-600 underline"
                onClick={() => navigate("/")}
              >
                {t("emailPreferences.backHome")}
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-xs text-slate-700">
              <p className="font-medium">
                {t("emailPreferences.managingFor")}{" "}
                <span className="font-semibold text-brand-royal-blue">
                  {email || t("emailPreferences.yourAccount")}
                </span>
              </p>
              <p className="mt-1">
                {type === "weekly-mailer"
                  ? t("emailPreferences.weeklyDigestOnly")
                  : t("emailPreferences.profileReminderOnly")}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-4 flex items-start gap-3">
              <div className="mt-0.5">
                <ShieldOff className="w-4 h-4 text-brand-royal-blue" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">
                  {t("emailPreferences.remindersTitle")}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {t("emailPreferences.remindersBody")}
                </p>
                <div className="mt-3">
                  {optedOut ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 border border-emerald-100">
                      {t("emailPreferences.unsubscribedBadge")}
                    </span>
                  ) : (
                    <Button
                      disabled={saving}
                      onClick={handleUnsubscribe}
                      className="inline-flex items-center gap-1 text-xs"
                    >
                      {saving && (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      )}
                      {type === "weekly-mailer"
                        ? t("emailPreferences.unsubscribeWeekly")
                        : t("emailPreferences.unsubscribeReminders")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return <Layout>{baseContent}</Layout>;
}
