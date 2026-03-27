"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ArrowRight,
  CheckCircle2,
  Search,
  Sparkles,
  BookOpen,
  Beaker,
  User,
  LogIn,
  MessageSquare,
  UserPlus,
  Lock,
  FileText,
  Smartphone,
  X,
  Heart,
  Users,
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

export default function Landing() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [credits, setCredits] = useState(Math.floor(Math.random() * 50) + 1); // Random number between 1-50
  const [isBulletsExpanded, setIsBulletsExpanded] = useState(false);
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
      <section className="relative flex flex-col items-center justify-center px-4 sm:px-6 pt-24  sm:pt-20 sm:pb-10 md:pt-28 md:pb-16 overflow-hidden min-h-[calc(80vh)]">
        <div className="max-w-5xl relative z-10 w-full mx-auto flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-10 lg:gap-20">
          {/* ── LEFT: Headline + bullets ── */}
          <div className="flex-1 flex flex-col justify-center items-center lg:items-start w-full">
            <div className="max-w-xl w-full text-center lg:text-left space-y-8">
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.15] tracking-tight"
                style={{ color: "#2F3C96" }}
              >
                Empower Your
                <br />
                Health Decisions
              </h1>

              <ul className="hidden md:flex space-y-6 flex-col items-center lg:items-start">
                {[
                  {
                    text: "Learn more about you and your loved one's health",
                    icon: <Heart className="w-4 h-4" />,
                  },
                  {
                    text: "Learn and participate in latest treatments",
                    icon: <Beaker className="w-4 h-4" />,
                  },
                  {
                    text: "Connect with others who are experiencing the same",
                    icon: <Users className="w-4 h-4" />,
                  },
                ].map(({ text, icon }, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-4 text-left w-full"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                      style={{ backgroundColor: "#E8E0EF", color: "#2F3C96" }}
                    >
                      {icon}
                    </div>
                    <span
                      className="text-[16px] md:text-lg font-bold md:whitespace-nowrap"
                      style={{ color: "#474F96" }}
                    >
                      {text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── Vertical Separator (desktop only) ── */}
          <div className="hidden lg:block flex-shrink-0 self-stretch">
            <div
              className="w-px h-full mx-auto"
              style={{
                background:
                  "linear-gradient(to bottom, transparent, #D0C4E2 25%, #D0C4E2 75%, transparent)",
                minHeight: 200,
              }}
            />
          </div>

          {/* ── RIGHT: Hero illustration + CTAs ── */}
          <div className="flex-shrink-0 w-full max-w-[320px] lg:max-w-[380px] flex flex-col justify-center gap-6 items-center lg:items-end">
            {/* Hero illustration — centered on mobile, right-aligned on desktop */}
            <div className="w-full max-w-[280px] lg:max-w-[320px] flex justify-center lg:justify-end lg:mr-7 ">
              <img
                src="/hero-bg.webp"
                alt="Connect with healthcare and research"
                width={1536}
                height={1024}
                fetchPriority="high"
                decoding="async"
                className="w-full h-auto max-h-[240px] md:max-h-[280px] lg:max-h-[320px] object-contain object-center"
              />
            </div>
            {!user ? (
              <div className="flex flex-col gap-4 w-full">
                {/* Primary — solid box button */}
                <button
                  onClick={() => navigate("/onboarding")}
                  className="w-full py-4 rounded-lg font-bold text-[15px] uppercase tracking-wider border border-[#1c2459] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2F3C96] hover:opacity-90"
                  style={{ backgroundColor: "#2F3C96", color: "#FFFFFF" }}
                >
                  Get Started
                </button>

                {/* Secondary — outlined box button */}
                <button
                  onClick={() => navigate("/signin")}
                  className="w-full py-4 rounded-lg font-bold text-[15px] uppercase tracking-wider border-2 border-[#D0C4E2] bg-white transition-colors hover:bg-[#F5F2F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#D0C4E2]"
                  style={{
                    borderColor: "#D0C4E2",
                    color: "#2F3C96",
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  I already have an account
                </button>
              </div>
            ) : (
              <div
                className="flex flex-col gap-5 w-full p-6 rounded-2xl border-2"
                style={{
                  borderColor: "#D0C4E2",
                  backgroundColor: "rgba(245, 242, 248, 0.95)",
                }}
              >
                <p
                  className="text-xl font-extrabold text-center lg:text-left"
                  style={{ color: "#2F3C96" }}
                >
                  Welcome back, {landingWelcomeName}!
                </p>

                <button
                  onClick={handleDashboardClick}
                  className="w-full py-4 rounded-xl font-bold text-[15px] uppercase tracking-wider transition-all active:scale-[0.98] shadow-[0_4px_0_0_#1c2459] hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-[0_0px_0_0_#1c2459] flex items-center justify-center gap-2"
                  style={{ backgroundColor: "#2F3C96", color: "#FFFFFF" }}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Go to Dashboard
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
                      Following
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
                      Communities
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

            {/* Add to Home Screen - mobile only */}
            {showAddToHomeButton && (
              <div className="flex justify-center lg:justify-start">
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
                  Add to Home Screen
                </button>
              </div>
            )}
          </div>
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
            onClick={() => setShowAndroidInstructions(false)}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
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
                Add to Home Screen
              </h3>
              <p className="text-sm mb-4" style={{ color: "#787878" }}>
                Open the Chrome menu (⋮) in the top right, then tap{" "}
                <strong>“Add to Home screen”</strong> or{" "}
                <strong>“Install app”</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowAndroidInstructions(false)}
                className="w-full py-3 rounded-xl font-semibold text-white"
                style={{ backgroundColor: "#2F3C96" }}
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iPhone Add to Home Screen steps modal */}
      <AnimatePresence>
        {showIphoneAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
            onClick={() => setShowIphoneAddModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-to-home-title"
          >
            <motion.div
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
            </motion.div>
          </motion.div>
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
