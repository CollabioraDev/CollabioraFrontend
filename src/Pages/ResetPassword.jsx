import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import Layout from "../components/Layout.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import AnimatedBackgroundDiff from "../components/ui/AnimatedBackgroundDiff.jsx";
import { Eye, EyeOff, Lock, CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function ResetPassword() {
  const { t } = useTranslation("common");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenValid(false);
      return;
    }

    async function verifyToken() {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      try {
        const res = await fetch(`${base}/api/auth/reset-password/${token}`);
        const data = await res.json();

        if (res.ok && data.valid) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          toast.error(data.error || t("auth.resetPassword.toastExpired"));
        }
      } catch (error) {
        console.error("Token verification error:", error);
        setTokenValid(false);
        toast.error(t("auth.resetPassword.toastVerifyFailed"));
      } finally {
        setVerifying(false);
      }
    }

    verifyToken();
  }, [token, t]);

  function validatePassword(password) {
    if (password.length < 6) {
      return t("auth.resetPassword.toastPasswordMin");
    }
    return null;
  }

  async function handleResetPassword() {
    if (!newPassword || !confirmPassword) {
      toast.error(t("auth.resetPassword.toastFillAll"));
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t("auth.resetPassword.toastMismatch"));
      return;
    }

    if (!token) {
      toast.error(t("auth.resetPassword.toastInvalidToken"));
      return;
    }

    setLoading(true);
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

    try {
      const res = await fetch(`${base}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t("auth.resetPassword.toastResetFailed"));
        setLoading(false);
        return;
      }

      setSuccess(true);
      toast.success(t("auth.resetPassword.toastResetSuccess"));

      setTimeout(() => {
        navigate("/signin");
      }, 3000);
    } catch (e) {
      console.error("Reset password error:", e);
      toast.error(t("auth.resetPassword.toastResetGenericFail"));
      setLoading(false);
    }
  }

  if (verifying) {
    return (
      <Layout>
        <div className="relative min-h-screen overflow-hidden">
          <AnimatedBackgroundDiff />
          <div className="flex justify-center items-center min-h-screen px-4 py-6 relative z-10">
            <div
              className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border p-5 sm:p-6 space-y-4 text-center"
              style={{
                borderColor: "#D0C4E2",
                boxShadow: "0 20px 60px rgba(208, 196, 226, 0.25)",
                backgroundColor: "rgba(255, 255, 255, 0.98)",
              }}
            >
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2F3C96] mx-auto"></div>
              <p style={{ color: "#787878" }}>{t("auth.resetPassword.verifying")}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!tokenValid) {
    return (
      <Layout>
        <div className="relative min-h-screen overflow-hidden">
          <AnimatedBackgroundDiff />
          <div className="flex justify-center items-center min-h-screen px-4 py-6 relative z-10">
            <div
              className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border p-5 sm:p-6 space-y-4 text-center"
              style={{
                borderColor: "#D0C4E2",
                boxShadow: "0 20px 60px rgba(208, 196, 226, 0.25)",
                backgroundColor: "rgba(255, 255, 255, 0.98)",
              }}
            >
              <div className="flex justify-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
                >
                  <XCircle className="w-8 h-8" style={{ color: "#ef4444" }} />
                </div>
              </div>
              <h2 className="text-lg font-bold" style={{ color: "#2F3C96" }}>
                {t("auth.resetPassword.expiredTitle")}
              </h2>
              <p className="text-xs" style={{ color: "#787878" }}>
                {t("auth.resetPassword.expiredBody")}
              </p>
              <Button
                onClick={() => navigate("/forgot-password")}
                className="w-full rounded-lg py-2 font-semibold text-sm transition-all transform hover:scale-[1.02]"
                style={{
                  backgroundColor: "#2F3C96",
                  color: "#FFFFFF",
                }}
              >
                {t("auth.resetPassword.requestNewLink")}
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (success) {
    return (
      <Layout>
        <div className="relative min-h-screen overflow-hidden">
          <AnimatedBackgroundDiff />
          <div className="flex justify-center items-center min-h-screen px-4 py-6 relative z-10">
            <div
              className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border p-5 sm:p-6 space-y-4 text-center"
              style={{
                borderColor: "#D0C4E2",
                boxShadow: "0 20px 60px rgba(208, 196, 226, 0.25)",
                backgroundColor: "rgba(255, 255, 255, 0.98)",
              }}
            >
              <div className="flex justify-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
                >
                  <CheckCircle2
                    className="w-8 h-8"
                    style={{ color: "#10b981" }}
                  />
                </div>
              </div>
              <h2 className="text-lg font-bold" style={{ color: "#2F3C96" }}>
                {t("auth.resetPassword.successTitle")}
              </h2>
              <p className="text-xs" style={{ color: "#787878" }}>
                {t("auth.resetPassword.successBody")}
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackgroundDiff />

        <div className="flex justify-center items-center min-h-screen px-4 py-6 relative z-10">
          <div
            className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border p-5 sm:p-6 space-y-4 transition-all duration-300"
            style={{
              borderColor: "#D0C4E2",
              boxShadow: "0 20px 60px rgba(208, 196, 226, 0.25)",
              backgroundColor: "rgba(255, 255, 255, 0.98)",
            }}
          >
            <div className="text-center space-y-1.5">
              <h1
                className="text-xl font-bold tracking-tight"
                style={{ color: "#2F3C96" }}
              >
                {t("auth.resetPassword.pageTitle")}
              </h1>
              <p className="text-xs font-medium" style={{ color: "#787878" }}>
                {t("auth.resetPassword.pageSubtitle")}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  className="text-xs font-semibold mb-1.5 block"
                  style={{ color: "#2F3C96" }}
                >
                  {t("auth.resetPassword.newPassword")}
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: "#787878" }}
                  />
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    placeholder={t("auth.resetPassword.newPasswordPlaceholder")}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleResetPassword()
                    }
                    className="w-full py-2 pl-10 pr-10 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all"
                    style={{
                      borderColor: "#E8E8E8",
                      color: "#2F3C96",
                      backgroundColor: "#FFFFFF",
                      "--tw-ring-color": "#D0C4E2",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((p) => !p)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors hover:bg-black/5"
                    style={{ color: "#787878" }}
                    aria-label={
                      showNewPassword
                        ? t("auth.resetPassword.hidePassword")
                        : t("auth.resetPassword.showPassword")
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs mt-1" style={{ color: "#787878" }}>
                  {t("auth.resetPassword.passwordHint")}
                </p>
              </div>

              <div>
                <label
                  className="text-xs font-semibold mb-1.5 block"
                  style={{ color: "#2F3C96" }}
                >
                  {t("auth.resetPassword.confirmPassword")}
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: "#787878" }}
                  />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={t("auth.resetPassword.confirmPasswordPlaceholder")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleResetPassword()
                    }
                    className="w-full py-2 pl-10 pr-10 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all"
                    style={{
                      borderColor: "#E8E8E8",
                      color: "#2F3C96",
                      backgroundColor: "#FFFFFF",
                      "--tw-ring-color": "#D0C4E2",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors hover:bg-black/5"
                    style={{ color: "#787878" }}
                    aria-label={
                      showConfirmPassword
                        ? t("auth.resetPassword.hidePassword")
                        : t("auth.resetPassword.showPassword")
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full rounded-lg py-2 font-semibold text-sm transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                style={{
                  backgroundColor: "#2F3C96",
                  color: "#FFFFFF",
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = "#474F97";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(208, 196, 226, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#2F3C96";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {loading
                  ? t("auth.resetPassword.resetting")
                  : t("auth.resetPassword.submitButton")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
