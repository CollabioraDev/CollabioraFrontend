import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { broadcastEmailVerified } from "../utils/crossTabSync.js";

const logoUrl = import.meta.env.VITE_LOGO_URL || "https://res.cloudinary.com/dtgmjvfms/image/upload/logo_mh2rpv.png";

export default function VerifyEmail() {
  const { t } = useTranslation("common");
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("idle");
      return;
    }

    async function run() {
      setStatus("verifying");
      setMessage("");

      const minDelay = new Promise((resolve) => setTimeout(resolve, 1500));

      try {
        const decodedToken = decodeURIComponent(token);

        const fetchPromise = fetch(`${base}/api/auth/verify-email?token=${decodedToken}`);

        const [response] = await Promise.all([fetchPromise, minDelay]);

        const responseText = await response.text();
        let data;

        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("Failed to parse response:", parseError, responseText);
          setStatus("error");
          setMessage(t("auth.verifyEmail.invalidResponse"));
          return;
        }

        if (!response.ok) {
          if (data.code === "EXPIRED_TOKEN") {
            setStatus("error");
            setMessage(data.error || t("auth.verifyEmail.expired"));
          } else if (data.code === "INVALID_TOKEN") {
            setStatus("error");
            setMessage(data.error || t("auth.verifyEmail.invalidToken"));
          } else {
            setStatus("error");
            setMessage(data.error || t("auth.verifyEmail.failedGeneric"));
          }
          return;
        }

        if (data.alreadyVerified) {
          setStatus("success");
          setMessage(data.message || t("auth.verifyEmail.alreadyVerified"));

          const userData = JSON.parse(localStorage.getItem("user") || "{}");
          if (userData._id || userData.id) {
            userData.emailVerified = true;
            localStorage.setItem("user", JSON.stringify(userData));

            window.dispatchEvent(new Event("login"));

            broadcastEmailVerified(userData);
          }
          return;
        }

        setStatus("success");
        setMessage(data.message || t("auth.verifyEmail.success"));

        const userData = JSON.parse(localStorage.getItem("user") || "{}");
        if (userData._id || userData.id) {
          userData.emailVerified = true;
          localStorage.setItem("user", JSON.stringify(userData));

          window.dispatchEvent(new Event("login"));

          broadcastEmailVerified(userData);
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
        setMessage(t("auth.verifyEmail.errorGeneric"));
      }
    }

    run();
  }, [searchParams, base, t]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#D0C4E2] via-[#E8E0EF] to-[#F5F0FA] px-4 py-8">
      <div className="mb-8">
        <img
          src={logoUrl}
          alt={t("auth.verifyEmail.logoAlt")}
          className="h-16 w-auto"
        />
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        {status === "idle" && (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(47, 60, 150, 0.1)" }}
              >
                <Mail className="w-10 h-10" style={{ color: "#2F3C96" }} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: "#2F3C96" }}>
                {t("auth.verifyEmail.idleTitle")}
              </h1>
              <p className="text-gray-600">{t("auth.verifyEmail.idleBody")}</p>
            </div>
          </div>
        )}

        {status === "verifying" && (
          <div className="text-center space-y-6 py-8">
            <div className="flex justify-center">
              <Loader2 className="w-20 h-20 text-[#2F3C96] animate-spin" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: "#2F3C96" }}>
                {t("auth.verifyEmail.verifyingTitle")}
              </h1>
              <p className="text-gray-600">{t("auth.verifyEmail.verifyingBody")}</p>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="text-center space-y-6 py-4">
            <div className="flex justify-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
              >
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: "#2F3C96" }}>
                {t("auth.verifyEmail.successTitle")}
              </h1>
              <p className="text-gray-600 mb-4">
                {message || t("auth.verifyEmail.successBodyFallback")}
              </p>
              <p className="text-gray-600 text-sm">
                {t("auth.verifyEmail.successFooter")}
              </p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="text-center space-y-6 py-4">
            <div className="flex justify-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
              >
                <XCircle className="w-16 h-16 text-red-500" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: "#2F3C96" }}>
                {t("auth.verifyEmail.errorTitle")}
              </h1>
              <p className="text-gray-600 mb-4">
                {message || t("auth.verifyEmail.errorBodyFallback")}
              </p>
              <p className="text-sm text-gray-500">
                {t("auth.verifyEmail.errorFooter")}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600">
          {t("auth.verifyEmail.copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </div>
  );
}
