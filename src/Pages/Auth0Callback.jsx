import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth0 } from "@auth0/auth0-react";
import { motion } from "framer-motion";
import Layout from "../components/Layout.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";
import { getGuestDeviceIdHeaders } from "../utils/api.js";
import { consumePostAuthRedirect } from "../utils/postAuthRedirect.js";

/**
 * Auth0 Callback Page
 *
 * This page handles the redirect after Auth0 authentication.
 * It syncs the Auth0 user with our backend database and sets up the session.
 */
export default function Auth0Callback() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth0();
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    async function syncUserWithBackend() {
      if (isLoading) return;

      if (!isAuthenticated || !user) {
        // Not authenticated, redirect to sign in
        navigate("/signin");
        return;
      }

      setSyncing(true);

      try {
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

        // Clear any old pending account data from previous incomplete sign-in
        // (This ensures a fresh start for each OAuth flow)
        const oldPendingAccount = localStorage.getItem("auth0_pending_account");
        if (oldPendingAccount) {
          // Only clear if this is a different Auth0 user
          try {
            const oldAccount = JSON.parse(oldPendingAccount);
            if (oldAccount.auth0Id !== user.sub) {
              localStorage.removeItem("auth0_pending_account");
            }
          } catch {
            // If parsing fails, clear it anyway
            localStorage.removeItem("auth0_pending_account");
          }
        }

        // Check localStorage for pending onboarding data (set when user starts OAuth from onboarding page)
        const pendingOnboarding = localStorage.getItem(
          "auth0_pending_onboarding"
        );
        let onboardingData = null;

        if (pendingOnboarding) {
          try {
            onboardingData = JSON.parse(pendingOnboarding);
            localStorage.removeItem("auth0_pending_onboarding");
          } catch (e) {
            console.error("Failed to parse pending onboarding data:", e);
          }
        }

        // Sync user with backend
        const res = await fetch(`${base}/api/auth/oauth-sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getGuestDeviceIdHeaders(),
          },
          credentials: "include",
          body: JSON.stringify({
            auth0Id: user.sub,
            email: user.email,
            name: user.name || user.nickname || user.email?.split("@")[0],
            picture: user.picture,
            emailVerified: user.email_verified,
            provider: user.sub?.split("|")[0], // google-oauth2, windowslive, etc.
            // Include onboarding data if present
            ...(onboardingData && {
              role: onboardingData.role,
              preferredLanguage: onboardingData.preferredLanguage,
              conditions: onboardingData.conditions,
              location: onboardingData.location,
              gender: onboardingData.gender,
              profession: onboardingData.profession,
              academicRank: onboardingData.academicRank,
              primarySpecialty: onboardingData.primarySpecialty,
              subspecialties: onboardingData.subspecialties,
              researchInterests: onboardingData.researchInterests,
              educationHistory: onboardingData.educationEntries,
              skills: onboardingData.skills,
              orcid: onboardingData.orcid,
            }),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || t("auth.auth0Callback.syncFailed"));
        }

        // ─── STEP A: Create account if brand-new user (no DB record yet) ───
        if (data.needsProfileCompletion && data.isNewUser) {
          const pendingAuth0Data = data.auth0User || {
            auth0Id: user.sub,
            email: user.email,
            name: user.name || user.nickname || user.email?.split("@")[0],
            picture: user.picture,
            emailVerified: user.email_verified,
            provider: user.sub?.split("|")[0],
          };

          const completeRes = await fetch(`${base}/api/auth/complete-oauth-profile`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...getGuestDeviceIdHeaders(),
            },
            body: JSON.stringify({
              role: onboardingData?.role || "patient",
              auth0Id: pendingAuth0Data.auth0Id,
              email: pendingAuth0Data.email,
              name: pendingAuth0Data.name,
              picture: pendingAuth0Data.picture,
              emailVerified: pendingAuth0Data.emailVerified,
              provider: pendingAuth0Data.provider,
            }),
          });

          const completeData = await completeRes.json();
          if (!completeRes.ok) {
            throw new Error(
              completeData.error || t("auth.auth0Callback.oauthFailed"),
            );
          }

          if (completeData.token) {
            localStorage.setItem("token", completeData.token);
          }
          if (completeData.user) {
            const userData = { ...completeData.user };
            userData.emailVerified = false;
            localStorage.setItem("user", JSON.stringify(userData));
          }

          console.log("[Auth0Callback] Brand-new user created → onboarding step 4");
          navigate("/onboarding?oauth=true");
          return;
        }

        // ─── STEP B: Admin shortcut ───
        if (data.isAdmin && data.token) {
          localStorage.setItem("adminToken", data.token);
          if (user?.email) localStorage.setItem("adminEmail", user.email);
          navigate("/admin/dashboard");
          return;
        }

        // ─── STEP C: Store token & user in localStorage ───
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        let storedUserData = null;
        if (data.user) {
          storedUserData = { ...data.user };
          if (!storedUserData.emailVerified) {
            storedUserData.emailVerified = false;
          }
          localStorage.setItem("user", JSON.stringify(storedUserData));
        }

        // ─── STEP D: Decide where to send the user ───
        const userObj = storedUserData || data.user || {};

        console.log("[Auth0Callback] Routing decision:", {
          isNewUser: data.isNewUser,
          emailVerified: userObj.emailVerified,
          role: userObj.role,
          medicalInterests: userObj.medicalInterests,
        });

        // D1: NEW user → always go to onboarding
        if (data.isNewUser) {
          console.log("[Auth0Callback] New user → onboarding step 4");
          navigate("/onboarding?oauth=true");
          return;
        }

        // D2: Existing user who has NOT completed onboarding (no profile data)
        const hasCompletedOnboarding =
          (userObj.medicalInterests && userObj.medicalInterests.length > 0) ||
          (userObj.conditions && userObj.conditions.length > 0) ||
          (userObj.specialties && userObj.specialties.length > 0);

        if (!hasCompletedOnboarding) {
          console.log("[Auth0Callback] Existing user, onboarding incomplete → step 4");
          navigate("/onboarding?oauth=true");
          return;
        }

        // D3: Existing user, completed onboarding — go to dashboard (whether verified or not)
        if (!userObj.emailVerified) {
          try {
            const verifyRes = await fetch(`${base}/api/auth/send-verification-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.token}`,
              },
            });
            if (verifyRes.ok) {
              const verifyData = await verifyRes.json();
              if (verifyData.otpExpiresAt) {
                localStorage.setItem(`otp_expiry_${userObj.email}`, verifyData.otpExpiresAt);
              }
            }
          } catch (e) {
            console.error("Failed to send verification email:", e);
          }
          console.log("[Auth0Callback] Onboarding done, email unverified → dashboard (verify later)");
        } else {
          console.log("[Auth0Callback] Fully onboarded + verified → dashboard");
        }
        window.dispatchEvent(new Event("login"));
        const redirect = consumePostAuthRedirect();
        if (redirect?.path && redirect.path.startsWith("/")) {
          const url = redirect.proIntent
            ? `${redirect.path}${redirect.path.includes("?") ? "&" : "?"}proIntent=1`
            : redirect.path;
          navigate(url);
          return;
        }
        navigate("/yori");
      } catch (e) {
        console.error("OAuth sync error:", e);
        setError(e.message || t("auth.auth0Callback.signInFailed"));
        setSyncing(false);
      }
    }

    syncUserWithBackend();
  }, [isAuthenticated, isLoading, user, navigate, t]);

  return (
    <Layout>
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackground />

        <div className="flex justify-center items-center min-h-screen px-4 py-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <div
              className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border p-6 text-center"
              style={{
                borderColor: "#D0C4E2",
                boxShadow: "0 20px 60px rgba(208, 196, 226, 0.25)",
                backgroundColor: "rgba(255, 255, 255, 0.98)",
              }}
            >
              {error ? (
                <>
                  <div
                    className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
                  >
                    <svg
                      className="w-8 h-8"
                      style={{ color: "#DC2626" }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                  <h2
                    className="text-xl font-bold mb-2"
                    style={{ color: "#DC2626" }}
                  >
                    {t("auth.auth0Callback.authFailed")}
                  </h2>
                  <p className="text-sm mb-4" style={{ color: "#787878" }}>
                    {error}
                  </p>
                  <button
                    onClick={() => navigate("/signin")}
                    className="px-6 py-2 rounded-lg font-semibold text-sm transition-all"
                    style={{
                      backgroundColor: "#2F3C96",
                      color: "#FFFFFF",
                    }}
                  >
                    {t("auth.auth0Callback.backToSignIn")}
                  </button>
                </>
              ) : (
                <>
                  {/* Loading spinner */}
                  <div className="w-16 h-16 mx-auto mb-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-16 h-16 rounded-full border-4"
                      style={{
                        borderColor: "rgba(208, 196, 226, 0.3)",
                        borderTopColor: "#2F3C96",
                      }}
                    />
                  </div>
                  <h2
                    className="text-xl font-bold mb-2"
                    style={{ color: "#2F3C96" }}
                  >
                    {syncing
                      ? t("auth.auth0Callback.settingUp")
                      : t("auth.auth0Callback.authenticating")}
                  </h2>
                  <p className="text-sm" style={{ color: "#787878" }}>
                    {t("auth.auth0Callback.pleaseWait")}
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
