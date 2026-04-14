"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Search,
  User,
  LogIn,
  MessageSquare,
  UserPlus,
  Lock,
  FileText,
  Smartphone,
  X,
  ChevronDown,
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
import Button from "../components/ui/Button";
import { getDisplayName } from "../utils/researcherDisplayName";
import { GUEST_BROWSE_MODE_ENABLED } from "../utils/guestBrowseMode.js";

const heroDescriptorList = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.11, delayChildren: 0.18 },
  },
};

const heroDescriptorItem = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 420, damping: 32 },
  },
};

const HERO_FEATURE_ROWS = [
  {
    headingKey: "landing.heroFeatureHeading1",
    descKey: "landing.heroFeatureDesc1",
  },
  {
    headingKey: "landing.heroFeatureHeading2",
    descKey: "landing.heroFeatureDesc2",
  },
  {
    headingKey: "landing.heroFeatureHeading3",
    descKey: "landing.heroFeatureDesc3",
  },
];

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
  /** Mobile hero feature accordion: which rows are expanded (independent toggles). */
  const [heroFeaturesOpen, setHeroFeaturesOpen] = useState([true, false, false]);
  const navigate = useNavigate();

  const toggleHeroFeature = (idx) => {
    setHeroFeaturesOpen((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

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
      <section className="relative flex flex-col items-center justify-center px-4 sm:px-6 pt-20 sm:pt-20 sm:pb-10 md:pt-28 md:pb-16 overflow-x-hidden min-h-[min(80vh,44rem)] sm:min-h-[calc(80vh)]">
        <div className="max-w-6xl relative z-10 w-full mx-auto flex flex-col items-stretch gap-8 sm:gap-10 lg:gap-12 pt-6 sm:pt-10">
          <div className="flex flex-col lg:flex-row lg:items-stretch lg:justify-between gap-8 sm:gap-10 lg:gap-6 xl:gap-10 w-full px-0 sm:px-2">
            {/* Left: badge, headline, CTAs */}
            <div className="flex-1 min-w-0 flex flex-col items-center lg:items-start text-center lg:text-left">
              <div className="relative w-full max-w-full flex justify-center lg:justify-start">
                <div className="relative inline-flex w-full max-w-full flex-col items-center lg:items-start justify-center min-h-0 md:min-h-[5rem] lg:min-h-[6rem]">
                  <img
                    src="/Yorisidepeak.webp"
                    alt=""
                    aria-hidden
                    fetchPriority="high"
                    decoding="async"
                    className="pointer-events-none select-none absolute start-0 top-[42%] z-0 hidden h-[3.5rem] w-auto md:block md:h-[4rem] -translate-y-1/2 -translate-x-[5%] object-contain object-left drop-shadow-[0_8px_20px_rgba(47,60,150,0.2)]"
                  />
                  <h1 className="relative z-10 w-full max-w-full min-w-0 md:ps-[3.75rem] lg:ps-14 flex flex-col items-center lg:items-start font-extrabold leading-[1.1] md:leading-[1.06] tracking-tight gap-1 sm:gap-1.5 text-[clamp(1.45rem,calc(0.65rem+4vw),3.65rem)] sm:text-5xl md:text-6xl lg:text-[3.35rem] xl:text-[3.75rem] text-balance">
                    <span
                      className="block max-w-full break-words md:whitespace-nowrap"
                      style={{ color: "#2F3C96" }}
                    >
                      {t("landing.heroTitleLine1")}
                    </span>
                    <span className="block max-w-full break-words text-brand-purple-400 md:whitespace-nowrap">
                      {t("landing.heroTitleLine2")}
                    </span>
                    <span
                      className="block max-w-full break-words md:whitespace-nowrap"
                      style={{ color: "#2F3C96" }}
                    >
                      {t("landing.heroTitleLine3")}
                    </span>
                    <span
                      className="block max-w-full break-words md:whitespace-nowrap"
                      style={{ color: "#2F3C96" }}
                    >
                      {t("landing.heroTitleLine4")}
                    </span>
                  </h1>
                </div>
              </div>

              {!user && (
                <div className="mt-6 sm:mt-8 flex w-full max-w-full min-w-0 flex-col items-stretch sm:flex-row sm:flex-wrap sm:items-center justify-center gap-3 sm:gap-4 lg:justify-start lg:max-w-xl px-0 ps-0 md:ps-[3.75rem] lg:ps-14">
                  <button
                    type="button"
                    onClick={() => {
                      if (GUEST_BROWSE_MODE_ENABLED) {
                        try {
                          sessionStorage.setItem(
                            "collabiora_show_yori_tutorial",
                            "1",
                          );
                        } catch {
                          /* ignore */
                        }
                        navigate("/home");
                      } else {
                        navigate("/onboarding");
                      }
                    }}
                    className="w-full min-h-[3rem] sm:min-h-[3.25rem] rounded-full border-2 bg-white/95 px-6 sm:px-8 py-3 sm:py-3.5 text-[0.95rem] sm:text-base md:text-lg font-bold shadow-sm transition-[transform,box-shadow,opacity] hover:bg-white active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2F3C96] sm:w-auto sm:shrink-0"
                    style={{
                      borderColor: "#D0C4E2",
                      color: "#2F3C96",
                    }}
                  >
                    {t("landing.getStarted")}
                  </button>
                </div>
              )}
            </div>

            <div
              className="lg:hidden h-px w-full max-w-sm mx-auto shrink-0 my-1 bg-gradient-to-r from-transparent via-[#c4b8e0]/95 to-transparent"
              aria-hidden
            />
            <div
              className="hidden lg:block w-px shrink-0 self-stretch min-h-[17rem] bg-gradient-to-b from-transparent via-[#c8bddc] to-transparent"
              aria-hidden
            />

            {/* Right: feature blocks — collapsible on small screens, static on lg+ */}
            <div className="flex-1 min-w-0 w-full lg:max-w-lg flex flex-col justify-center px-0.5 sm:px-0">
              <div
                className="lg:hidden w-full max-w-md mx-auto flex flex-col gap-2"
                role="region"
                aria-label={t("landing.heroDescriptorsAria")}
              >
                {HERO_FEATURE_ROWS.map(({ headingKey, descKey }, idx) => {
                  const isOpen = heroFeaturesOpen[idx];
                  const panelId = `landing-hero-feature-panel-${idx}`;
                  const headerId = `landing-hero-feature-header-${idx}`;
                  return (
                    <div
                      key={headingKey}
                      className="rounded-2xl border-2 overflow-hidden bg-white/90 shadow-sm"
                      style={{ borderColor: "#D0C4E2" }}
                    >
                      <button
                        type="button"
                        id={headerId}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => toggleHeroFeature(idx)}
                        className="w-full flex items-center justify-between gap-3 py-3.5 px-4 text-left min-h-[3rem] active:bg-[#F5F2F8]/80 transition-colors"
                      >
                        <span className="font-bold text-[#2F3C96] text-[0.95rem] leading-snug pr-1">
                          {t(headingKey)}
                        </span>
                        <ChevronDown
                          className={`w-5 h-5 shrink-0 transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                          style={{ color: "#474F96" }}
                          aria-hidden
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <Motion.div
                            id={panelId}
                            aria-labelledby={headerId}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                            className="overflow-hidden border-t"
                            style={{ borderColor: "#E8E0EF" }}
                          >
                            <p className="px-4 py-3 text-sm leading-relaxed text-[#5c6488]">
                              {t(descKey)}
                            </p>
                          </Motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              <Motion.div
                role="group"
                aria-label={t("landing.heroDescriptorsAria")}
                className="hidden lg:flex w-full flex-col gap-10 xl:gap-12"
                variants={heroDescriptorList}
                initial="hidden"
                animate={mounted ? "show" : "hidden"}
              >
                {HERO_FEATURE_ROWS.map(({ headingKey, descKey }) => (
                  <Motion.div
                    key={headingKey}
                    variants={heroDescriptorItem}
                    className="flex flex-col items-center text-center lg:items-start lg:text-left"
                  >
                    <p className="mb-2 text-lg sm:text-xl font-bold leading-snug text-[#2F3C96]">
                      {t(headingKey)}
                    </p>
                    <p className="max-w-md text-sm leading-relaxed text-[#5c6488]">
                      {t(descKey)}
                    </p>
                  </Motion.div>
                ))}
              </Motion.div>
            </div>
          </div>

          {user && (
            <div className="w-full flex justify-center pt-2">
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
      <TrustedNetworksMarquee />
      <StatsSection />
      {/* Get Started Section */}
      <GetStartedSection />

      {/* How It Works Section */}
      <div
        id="how-it-works"
        className={`scroll-mt-24 ${isMobile ? "py-8" : ""}`}
      >
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
