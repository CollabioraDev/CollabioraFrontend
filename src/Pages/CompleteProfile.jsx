import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth0 } from "@auth0/auth0-react";
import { motion } from "framer-motion";
import Layout from "../components/Layout.jsx";
import Button from "../components/ui/Button.jsx";
import AnimatedBackgroundDiff from "../components/ui/AnimatedBackgroundDiff.jsx";
import { User, Microscope } from "lucide-react";
import { getGuestDeviceIdHeaders } from "../utils/api.js";

/**
 * Complete Profile Page
 * 
 * Shown to new OAuth users who need to select their role
 * after signing in with Google/Outlook for the first time.
 */
export default function CompleteProfile() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth0();
  const [selectedRole, setSelectedRole] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading) {
      // Check if we have pending Auth0 account or authenticated user
      const pendingAuth0Account = localStorage.getItem("auth0_pending_account");
      const token = localStorage.getItem("token");
      
      // If not authenticated and no pending account, redirect to sign in
      if (!isAuthenticated && !pendingAuth0Account && !token) {
        navigate("/signin");
        return;
      }
      
      // If authenticated but no pending account, that's fine (existing user completing profile)
      // If not authenticated but have pending account, that's fine (new user from sign-in)
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Cleanup: If user navigates away without completing profile, clear pending account
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only clear if they haven't selected a role yet
      if (!selectedRole && !saving) {
        localStorage.removeItem("auth0_pending_account");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [selectedRole, saving]);

  async function handleRoleSelect(role) {
    setSelectedRole(role);
    setSaving(true);
    setError("");

    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const token = localStorage.getItem("token");
      
      // Check if we have pending Auth0 account info (sign-in flow)
      const pendingAuth0Account = localStorage.getItem("auth0_pending_account");
      let auth0Data = null;
      
      if (pendingAuth0Account) {
        try {
          auth0Data = JSON.parse(pendingAuth0Account);
          localStorage.removeItem("auth0_pending_account");
        } catch (e) {
          console.error("Failed to parse pending Auth0 account:", e);
        }
      }

      // Prepare request body
      const requestBody = { role };
      
      // If we have Auth0 data (sign-in flow, account not created yet), include it
      if (auth0Data) {
        requestBody.auth0Id = auth0Data.auth0Id;
        requestBody.email = auth0Data.email;
        requestBody.name = auth0Data.name;
        requestBody.picture = auth0Data.picture;
        requestBody.emailVerified = auth0Data.emailVerified;
        requestBody.provider = auth0Data.provider;
      }

      // Complete profile (and create account if needed)
      const res = await fetch(`${base}/api/auth/complete-oauth-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getGuestDeviceIdHeaders(),
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("auth.completeProfile.errorCompleteFailed"));
      }

      // Store token and user data (account was just created or updated)
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        window.dispatchEvent(new Event("login"));
      }

      // Redirect to appropriate onboarding flow for more details
      if (role === "patient") {
        // Redirect to patient onboarding step 1 (name will be pre-filled from Auth0)
        navigate("/onboarding?step=1&oauth=true");
      } else {
        // Redirect to researcher onboarding step 1 (name will be pre-filled from Auth0)
        navigate("/onboarding?step=1&oauth=true");
      }
    } catch (e) {
      console.error("Profile completion error:", e);
      setError(e.message || t("auth.completeProfile.errorSaveFailed"));
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-4"
            style={{
              borderColor: "rgba(208, 196, 226, 0.3)",
              borderTopColor: "#2F3C96",
            }}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackgroundDiff />

        <div className="flex justify-center items-center min-h-screen px-4 py-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-lg"
          >
            <div
              className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border p-6"
              style={{
                borderColor: "#D0C4E2",
                boxShadow: "0 20px 60px rgba(208, 196, 226, 0.25)",
                backgroundColor: "rgba(255, 255, 255, 0.98)",
              }}
            >
              {/* Welcome Header */}
              <div className="text-center mb-6">
                {user?.picture && (
                  <img
                    src={user.picture}
                    alt=""
                    className="w-16 h-16 rounded-full mx-auto mb-3 border-2"
                    style={{ borderColor: "#D0C4E2" }}
                  />
                )}
                <h1
                  className="text-xl font-bold mb-1"
                  style={{ color: "#2F3C96" }}
                >
                  {t("auth.completeProfile.welcome", {
                    name: user?.name || user?.email?.split("@")[0],
                  })}
                </h1>
                <p className="text-sm" style={{ color: "#787878" }}>
                  {t("auth.completeProfile.subtitle")}
                </p>
              </div>

              {/* Role Selection */}
              <div className="space-y-3">
                <motion.button
                  onClick={() => !saving && handleRoleSelect("patient")}
                  disabled={saving}
                  whileHover={{ scale: saving ? 1 : 1.02 }}
                  whileTap={{ scale: saving ? 1 : 0.98 }}
                  className="w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 disabled:opacity-50"
                  style={{
                    borderColor:
                      selectedRole === "patient" ? "#2F3C96" : "#D0C4E2",
                    backgroundColor:
                      selectedRole === "patient"
                        ? "rgba(47, 60, 150, 0.05)"
                        : "transparent",
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "rgba(208, 196, 226, 0.2)" }}
                  >
                    <User size={24} style={{ color: "#2F3C96" }} />
                  </div>
                  <div className="text-left flex-1">
                    <h3
                      className="font-semibold text-sm"
                      style={{ color: "#2F3C96" }}
                    >
                      {t("auth.completeProfile.patientTitle")}
                    </h3>
                    <p className="text-xs" style={{ color: "#787878" }}>
                      {t("auth.completeProfile.patientDesc")}
                    </p>
                  </div>
                  {selectedRole === "patient" && saving && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-5 h-5 rounded-full border-2"
                      style={{
                        borderColor: "rgba(47, 60, 150, 0.3)",
                        borderTopColor: "#2F3C96",
                      }}
                    />
                  )}
                </motion.button>

                <motion.button
                  onClick={() => !saving && handleRoleSelect("researcher")}
                  disabled={saving}
                  whileHover={{ scale: saving ? 1 : 1.02 }}
                  whileTap={{ scale: saving ? 1 : 0.98 }}
                  className="w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 disabled:opacity-50"
                  style={{
                    borderColor:
                      selectedRole === "researcher" ? "#2F3C96" : "#D0C4E2",
                    backgroundColor:
                      selectedRole === "researcher"
                        ? "rgba(47, 60, 150, 0.05)"
                        : "transparent",
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "rgba(208, 196, 226, 0.2)" }}
                  >
                    <Microscope size={24} style={{ color: "#2F3C96" }} />
                  </div>
                  <div className="text-left flex-1">
                    <h3
                      className="font-semibold text-sm"
                      style={{ color: "#2F3C96" }}
                    >
                      {t("auth.completeProfile.researcherTitle")}
                    </h3>
                    <p className="text-xs" style={{ color: "#787878" }}>
                      {t("auth.completeProfile.researcherDesc")}
                    </p>
                  </div>
                  {selectedRole === "researcher" && saving && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-5 h-5 rounded-full border-2"
                      style={{
                        borderColor: "rgba(47, 60, 150, 0.3)",
                        borderTopColor: "#2F3C96",
                      }}
                    />
                  )}
                </motion.button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 rounded-lg border text-center"
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    borderColor: "rgba(239, 68, 68, 0.3)",
                    color: "#DC2626",
                  }}
                >
                  <p className="text-xs">{error}</p>
                </motion.div>
              )}

              <p
                className="text-xs text-center mt-4"
                style={{ color: "#787878", opacity: 0.7 }}
              >
                {t("auth.completeProfile.footerHint")}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}

