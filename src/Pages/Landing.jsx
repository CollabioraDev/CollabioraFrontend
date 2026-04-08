"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ArrowRight,
  CheckCircle2,
  Search,
  Sparkles,
  BookOpen,
  User,
  LogIn,
  MessageSquare,
  UserPlus,
  Lock,
  FileText,
  Smartphone,
  X,
} from "lucide-react";
import AnimatedBackground from "../components/ui/AnimatedBackground";
import TrustedNetworksMarquee from "../components/TrustedNetworksMarquee";
import StatsSection from "../components/StatsSection";
import GetStartedSection from "../components/GetStartedSection";
import HowItWorks from "../components/ui/HowItWorks";
import HowItWorksMobile from "../components/ui/how-it-works-mobile";
import Footer from "../components/Footer";
import { AuroraText } from "@/components/ui/aurora-text";
import { ShinyButton } from "@/components/ui/shiny-button";
import GlobalSearch from "../components/GlobalSearch";
import { ChevronDown } from "lucide-react";
import Button from "../components/ui/Button";
import { getDisplayName } from "../utils/researcherDisplayName";
import { GUEST_BROWSE_MODE_ENABLED } from "../utils/guestBrowseMode.js";

export default function Landing() {
  const { t } = useTranslation("common");
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [userStats, setUserStats] = useState({
    forumsParticipated: 0,
    peopleFollowed: 0,
    communityPosts: 0,
    communitiesJoined: 0,
  });
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIphoneAddModal, setShowIphoneAddModal] = useState(false);
  const [showAndroidInstructions, setShowAndroidInstructions] = useState(false);
  const navigate = useNavigate();

  // Prefetch the two primary CTA chunks during idle time so they are
  // already cached by the time the user clicks "Get Started" or "Sign In".
  useEffect(() => {
    const prefetch = () => {
      // These live in the same Pages/ directory as Landing.jsx
      import("./OnboardingNew.jsx").catch(() => {});
      import("./SignIn.jsx").catch(() => {});
      if (GUEST_BROWSE_MODE_ENABLED) {
        import("./YoriGuestLandingPage.jsx").catch(() => {});
      }
    };
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(prefetch, { timeout: 2000 });
      return () => cancelIdleCallback(id);
    } else {
      const t = setTimeout(prefetch, 1500);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    setMounted(true);

    const updateUser = () => {
      const userData = JSON.parse(localStorage.getItem("user") || "null");
      const token = localStorage.getItem("token");
      if (userData && token) {
        setUser(userData);
      } else {
        setUser(null);
      }
    };

    updateUser();

    const handleLogin = () => updateUser();
    const handleLogout = () => setUser(null);
    const handleStorageChange = (e) => {
      if (e.key === "user" || e.key === "token") updateUser();
    };

    window.addEventListener("login", handleLogin);
    window.addEventListener("logout", handleLogout);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("login", handleLogin);
      window.removeEventListener("logout", handleLogout);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Detect standalone (PWA already installed / running as app)
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsStandalone(standalone);
  }, []);

  const isIOS = () =>
    /iPhone|iPad|iPod/i.test(
      typeof navigator !== "undefined" ? navigator.userAgent : "",
    );
  const isChromeAndroid = () =>
    /Android/i.test(navigator.userAgent) &&
    /Chrome\/[.0-9]* Mobile/.test(navigator.userAgent);

  const showAddToHomeButton =
    mounted && isMobile && !isStandalone && (isIOS() || isChromeAndroid());

  const handleAddToHomeClick = async () => {
    if (isIOS()) {
      setShowIphoneAddModal(true);
      return;
    }
    const prompt = window.__deferredPrompt;
    if (prompt) {
      prompt.prompt();
      await prompt.userChoice;
      window.__deferredPrompt = null;
    } else {
      setShowAndroidInstructions(true);
    }
  };

  // Fetch real user stats when logged in
  useEffect(() => {
    const userId = user?._id || user?.id;
    if (!userId) {
      setUserStats({
        forumsParticipated: 0,
        peopleFollowed: 0,
        communityPosts: 0,
        communitiesJoined: 0,
      });
      return;
    }
    const base = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
    fetch(`${base}/api/profile/${userId}/landing-stats`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        setUserStats({
          forumsParticipated: data.forumsParticipated ?? 0,
          peopleFollowed: data.peopleFollowed ?? 0,
          communityPosts: data.communityPosts ?? 0,
          communitiesJoined: data.communitiesJoined ?? 0,
        });
      })
      .catch(() =>
        setUserStats({
          forumsParticipated: 0,
          peopleFollowed: 0,
          communityPosts: 0,
          communitiesJoined: 0,
        }),
      );
  }, [user?._id, user?.id]);

  const displayName = user?.name || user?.username || "there";
  const firstName = displayName.split(" ")[0];
  const landingWelcomeName =
    user?.role === "researcher" ? getDisplayName(user, "there") : firstName;

  const getDashboardPath = () => {
    if (!user) return "/dashboard/patient";
    return `/dashboard/${user.role || "patient"}`;
  };

  const handleDashboardClick = () => navigate(getDashboardPath());

  const communitiesJoinedDisplay =
    userStats.communitiesJoined && userStats.communitiesJoined > 0
      ? userStats.communitiesJoined
      : userStats.forumsParticipated || 0;

  return (
    <div className="relative min-h-screen ui-fade-in">
      {/* Animated Background */}
      <AnimatedBackground isMobile={isMobile} />

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center px-4 sm:px-6 pt-24 sm:pt-20 sm:pb-10 md:pt-28 md:pb-16 overflow-hidden min-h-[calc(80vh)]">
        <div className="max-w-3xl relative z-10 w-full mx-auto flex flex-col items-center text-center gap-6 sm:gap-8">
          {/* Headline + Yori peeking beside copy */}
          <div className="flex w-full justify-center px-1 sm:px-2">
            <div className="relative inline-flex items-center justify-center min-h-[3.5rem] sm:min-h-[4.5rem] md:min-h-[5.25rem]">
              <img
                src="/Yorisidepeak.webp"
                alt=""
                aria-hidden
                fetchPriority="high"
                decoding="async"
                className="pointer-events-none select-none absolute start-0 top-1/2 z-0 h-[3rem] w-auto sm:h-[3.75rem] md:h-[4.5rem] -translate-y-1/2 -translate-x-[8%] sm:-translate-x-[5%] object-contain object-left drop-shadow-[0_8px_20px_rgba(47,60,150,0.22)]"
              />
              <h1
                className="relative z-10 ps-[2.65rem] sm:ps-[3.35rem] md:ps-16 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.12] tracking-tight text-balance"
                style={{ color: "#2F3C96" }}
              >
                {t("landing.heroTitle")}
              </h1>
            </div>
          </div>

          {!user ? (
            <>
              <button
                type="button"
                onClick={() =>
                  GUEST_BROWSE_MODE_ENABLED
                    ? navigate("/home")
                    : navigate("/onboarding")
                }
                className="min-w-[min(100%,18rem)] px-12 sm:px-14 py-4 sm:py-[1.125rem] rounded-full text-lg sm:text-xl font-bold  shadow-sm transition-[transform,box-shadow,opacity] hover:opacity-[0.96] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2F3C96]"
                style={{ backgroundColor: "#2F3C96", color: "#FFFFFF" }}
              >
                {t("landing.getStarted")}
              </button>
              <p
                className="w-full max-w-md px-2 text-sm sm:text-[15px] md:text-base font-semibold leading-snug text-balance text-center"
                style={{ color: "#474F96" }}
              >
                {t("landing.bullet1")}
              </p>
            </>
          ) : (
            <div
              className="w-full max-w-md flex flex-col gap-5 p-6 rounded-2xl border-2 text-left"
              style={{
                borderColor: "#D0C4E2",
                backgroundColor: "rgba(245, 242, 248, 0.95)",
              }}
            >
              <p
                className="text-xl font-extrabold text-center"
                style={{ color: "#2F3C96" }}
              >
                {t("landing.welcomeBack", { name: landingWelcomeName })}
              </p>

              <button
                type="button"
                onClick={handleDashboardClick}
                className="w-full py-4 rounded-xl font-bold text-[15px] uppercase tracking-wider transition-all active:scale-[0.98] shadow-[0_4px_0_0_#1c2459] hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-[0_0px_0_0_#1c2459] flex items-center justify-center gap-2"
                style={{ backgroundColor: "#2F3C96", color: "#FFFFFF" }}
              >
                <LayoutDashboard className="w-5 h-5" />
                {t("landing.goToDashboard")}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/70 rounded-xl border border-[#D0C4E2] flex flex-col items-center text-center">
                  <UserPlus
                    className="w-5 h-5 mb-1"
                    style={{ color: "#2F3C96" }}
                  />
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider mb-1"
                    style={{ color: "#474F96" }}
                  >
                    {t("landing.statFollowing")}
                  </span>
                  <span
                    className="text-xl font-extrabold"
                    style={{ color: "#2F3C96" }}
                  >
                    {userStats.peopleFollowed}
                  </span>
                </div>
                <div className="p-3 bg-white/70 rounded-xl border border-[#D0C4E2] flex flex-col items-center text-center">
                  <MessageSquare
                    className="w-5 h-5 mb-1"
                    style={{ color: "#2F3C96" }}
                  />
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider mb-1"
                    style={{ color: "#474F96" }}
                  >
                    {t("landing.statCommunities")}
                  </span>
                  <span
                    className="text-xl font-extrabold"
                    style={{ color: "#2F3C96" }}
                  >
                    {communitiesJoinedDisplay}
                  </span>
                </div>
              </div>
            </div>
          )}

          {showAddToHomeButton && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={handleAddToHomeClick}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: "rgba(245, 242, 248, 0.9)",
                  borderColor: "#D0C4E2",
                  color: "#2F3C96",
                }}
              >
                <Smartphone className="w-4 h-4" />
                {t("landing.addToHome")}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Trusted Research Networks Marquee */}
      <div className={isMobile ? "py-8" : ""}>
        <TrustedNetworksMarquee />
      </div>
      <StatsSection />
      {/* Get Started Section */}
      <GetStartedSection />

      {/* How It Works Section */}
      <div className={isMobile ? "py-8" : ""}>
        {isMobile ? <HowItWorksMobile /> : <HowItWorks />}
      </div>

      {/* Android Add to Home Screen fallback (when native prompt not available) */}
      <AnimatePresence>
        {showAndroidInstructions && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
            onClick={() => setShowAndroidInstructions(false)}
            role="dialog"
            aria-modal="true"
          >
            <Motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border-2"
              style={{ borderColor: "#D0C4E2" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                className="text-lg font-bold mb-2"
                style={{ color: "#2F3C96" }}
              >
                {t("landing.addToHomeTitle")}
              </h3>
              <p className="text-sm mb-4" style={{ color: "#787878" }}>
                <Trans
                  i18nKey="landing.addToHomeChrome"
                  components={{
                    s1: <strong />,
                    s2: <strong />,
                  }}
                />
              </p>
              <button
                type="button"
                onClick={() => setShowAndroidInstructions(false)}
                className="w-full py-3 rounded-xl font-semibold text-white"
                style={{ backgroundColor: "#2F3C96" }}
              >
                {t("landing.gotIt")}
              </button>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* iPhone Add to Home Screen steps modal */}
      <AnimatePresence>
        {showIphoneAddModal && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
            onClick={() => setShowIphoneAddModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-to-home-title"
          >
            <Motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full max-h-[90vh] overflow-hidden border-2"
              style={{ borderColor: "#D0C4E2" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="p-4 border-b flex items-center justify-between"
                style={{ borderColor: "#E8E0EF" }}
              >
                <h2
                  id="add-to-home-title"
                  className="text-lg font-bold"
                  style={{ color: "#2F3C96" }}
                >
                  Add collabiora to Home Screen
                </h2>
                <button
                  type="button"
                  onClick={() => setShowIphoneAddModal(false)}
                  className="p-2 rounded-lg hover:bg-[#F5F2F8] transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" style={{ color: "#2F3C96" }} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[calc(90vh-4rem)] space-y-6">
                <p className="text-sm" style={{ color: "#787878" }}>
                  Follow these steps to install the app on your iPhone or iPad
                  for quick access:
                </p>

                {[
                  {
                    img: "/1stStepIphone.png",
                    step: 1,
                    title: "Tap the Share button",
                    description:
                      "In Safari, tap the Share icon (square with an arrow pointing up) at the bottom of the screen.",
                  },
                  {
                    img: "/2ndStepIphone.png",
                    step: 2,
                    title: "Add to Home Screen",
                    description:
                      "Scroll down in the share menu and tap “Add to Home Screen”.",
                  },
                  {
                    img: "/3rdStepIphone.png",
                    step: 3,
                    title: "Confirm",
                    description:
                      "Tap “Add” in the top right corner. The app icon will appear on your home screen.",
                  },
                ].map(({ img, step, title, description }) => (
                  <div key={step} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{ backgroundColor: "#2F3C96" }}
                      >
                        {step}
                      </span>
                      <h3
                        className="font-semibold"
                        style={{ color: "#2F3C96" }}
                      >
                        {title}
                      </h3>
                    </div>
                    <img
                      src={img}
                      alt={`Step ${step}: ${title}`}
                      className="w-full rounded-xl border shadow-sm"
                      style={{ borderColor: "#E8E0EF" }}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "#787878" }}
                    >
                      {description}
                    </p>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setShowIphoneAddModal(false)}
                  className="w-full py-3 rounded-xl font-semibold text-white"
                  style={{ backgroundColor: "#2F3C96" }}
                >
                  Got it
                </button>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes gradient-slow {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .animate-gradient-slow {
          background-size: 300% 300%;
          animation: gradient-slow 8s ease infinite;
        }
      `}</style>

      <Footer />
    </div>
  );
}
