import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import Button from "../components/ui/Button.jsx";
import { Loader2, Mail, ShieldOff } from "lucide-react";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

export default function EmailPreferences() {
  const query = useQuery();
  const navigate = useNavigate();
  const token = query.get("token") || "";
  const type = query.get("type") || "";

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [optedOut, setOptedOut] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!token || type !== "profile-reminder") {
        setError("This email preferences link is invalid or incomplete.");
        setLoading(false);
        return;
      }

      try {
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const res = await fetch(
          `${base}/api/email-preferences/profile-reminders?token=${encodeURIComponent(
            token,
          )}`,
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Invalid or expired link.");
        }
        setEmail(data.email || "");
        setOptedOut(!!data.profileReminderOptOut);
      } catch (err) {
        console.error("Email preferences load error:", err);
        setError(err.message || "Invalid or expired link.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, type]);

  async function handleUnsubscribe() {
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(
        `${base}/api/email-preferences/profile-reminders/unsubscribe`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update preferences.");
      }
      setOptedOut(true);
    } catch (err) {
      console.error("Email preferences unsubscribe error:", err);
      setError(err.message || "Failed to update preferences.");
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
              Email preferences
            </h1>
            <p className="text-xs text-slate-600">
              Manage reminders related to your Collabiora account.
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-10 text-slate-500 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading your preferences…</span>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            <p className="font-medium mb-1">We could not load this link.</p>
            <p>{error}</p>
            <div className="mt-3 flex justify-between items-center">
              <button
                type="button"
                className="text-[11px] text-slate-600 underline"
                onClick={() => navigate("/")}
              >
                Go back to Collabiora
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-xs text-slate-700">
              <p className="font-medium">
                Managing preferences for{" "}
                <span className="font-semibold text-brand-royal-blue">
                  {email || "your account"}
                </span>
              </p>
              <p className="mt-1">
                These settings only apply to profile completion reminder emails.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-4 flex items-start gap-3">
              <div className="mt-0.5">
                <ShieldOff className="w-4 h-4 text-brand-royal-blue" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">
                  Profile completion reminders
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Emails we send after you create an account but haven&apos;t
                  fully completed your profile yet (for both patients and
                  researchers).
                </p>
                <div className="mt-3">
                  {optedOut ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 border border-emerald-100">
                      You&apos;re currently unsubscribed from these reminders.
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
                      Stop sending these reminders
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

