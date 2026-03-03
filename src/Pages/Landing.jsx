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
  Star,
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

  useEffect(() => {
    setMounted(true);

    const updateUser = () => {
      const userData = JSON.parse(localStorage.getItem("user") || "null");
      const token = localStorage.getItem("token");
      // Only show user as logged in if email is verified
      if (userData && token && userData.emailVerified) {
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
    <div className="relative min-h-screen">
      {/* Animated Background */}
      <AnimatedBackground isMobile={isMobile} />

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center px-4 sm:px-6 pt-16 sm:pt-20 md:pt-35 pb-12 sm:pb-10 md:pb-18 overflow-hidden">
        <div className="max-w-6xl relative z-10 w-full">
          {/* Hero Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-10 items-center">
            {/* Left Section - Main Message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              {/* Next-Generation Badge - Hidden on mobile */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mb-3 sm:mb-4 hidden sm:block"
              >
                <div
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border-2 shadow-md"
                  style={{
                    backgroundColor: "#F5F2F8",
                    borderColor: "#D0C4E2",
                  }}
                >
                  <motion.div
                    animate={{
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 2,
                      ease: "easeInOut", // Optimized easing
                    }}
                    style={{
                      willChange: "transform",
                      transform: "translateZ(0)", // GPU acceleration
                    }}
                  >
                    <Star
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                      style={{ color: "#2F3C96" }}
                      fill="#2F3C96"
                    />
                  </motion.div>
                  <span
                    className="text-[10px] sm:text-xs font-semibold"
                    style={{ color: "#2F3C96" }}
                  >
                    Next-Generation Healthcare Platform
                  </span>
                </div>
              </motion.div>

              {/* Main Heading */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-3xl sm:text-5xl md:text-6xl lg:text-6xl font-extrabold leading-[1.15] mb-4 sm:mb-6 tracking-tight sm:pt-0 pt-10"
              >
                <div className="mb-1 sm:mb-2">
                  <AuroraText speed={2.5} colors={["#2F3C96"]}>
                    Health Research
                  </AuroraText>
                </div>
                <div>
                  <AuroraText
                    speed={2.5}
                    colors={["#2F3C96"]}
                  >
                    Made Simple
                  </AuroraText>
                </div>
              </motion.h1>

              {/* Simplified Value Props - Collapsible on Mobile - Only show if user is not signed in */}
              {!user && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="mb-4 sm:mb-6"
                >
                  {isMobile ? (
                    <>
                      <button
                        onClick={() => setIsBulletsExpanded(!isBulletsExpanded)}
                        className="flex items-center justify-between w-full mb-2"
                        style={{ color: "#2F3C96" }}
                      >
                        <span className="text-sm font-semibold">
                          Key Features
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            isBulletsExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {isBulletsExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2"
                        >
                          {[
                            "Find clinical trials tailored to your needs",
                            "Connect with researchers and experts",
                            "Connect and collaborate in well-moderated forums",
                          ].map((text, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: idx * 0.1 }}
                              className="flex items-center gap-2"
                            >
                              <div
                                className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                                style={{ backgroundColor: "#E8E0EF" }}
                              >
                                <CheckCircle2
                                  className="w-3 h-3"
                                  style={{ color: "#2F3C96" }}
                                />
                              </div>
                              <span
                                className="text-xs font-medium leading-tight"
                                style={{ color: "#2F3C96" }}
                              >
                                {text}
                              </span>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-2.5">
                      {[
                        "Find clinical trials tailored to your needs",
                        "Connect with researchers and experts",
                        "Connect and collaborate in well-moderated forums",
                      ].map((text, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.6, delay: 0.4 + idx * 0.1 }}
                          className="flex items-center gap-2.5"
                        >
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: "#E8E0EF" }}
                          >
                            <CheckCircle2
                              className="w-3.5 h-3.5"
                              style={{ color: "#2F3C96" }}
                            />
                          </div>
                          <span
                            className="text-sm font-medium leading-tight"
                            style={{ color: "#2F3C96" }}
                          >
                            {text}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Welcome for signed-in users */}
              {user && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="space-y-4"
                >
                  {/* Welcome Message */}
                  <div
                    className="p-4 rounded-xl border-2"
                    style={{
                      backgroundColor: "rgba(245, 242, 248, 0.6)",
                      borderColor: "#D0C4E2",
                    }}
                  >
                    <p
                      className="text-base font-semibold mb-3"
                      style={{ color: "#2F3C96" }}
                    >
                      Welcome Back,{" "}
                      <AuroraText
                        colors={[
                          "#D0C4E2",
                          "#2F3C96",
                          "#B8A5D5",
                          "#474F97",
                          "#E8E0EF",
                        ]}
                      >
                        {user?.name || user?.username || "User"}!
                      </AuroraText>
                    </p>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                      {/* People Followed */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.6 }}
                        className="p-3 rounded-lg border"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.7)",
                          borderColor: "#D0C4E2",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <UserPlus
                            className="w-4 h-4"
                            style={{ color: "#2F3C96" }}
                          />
                          <span
                            className="text-xs font-semibold"
                            style={{ color: "#2F3C96" }}
                          >
                            People Followed
                          </span>
                        </div>
                        <p
                          className="text-xl font-bold"
                          style={{ color: "#2F3C96" }}
                        >
                          {userStats.peopleFollowed}
                        </p>
                      </motion.div>

                      {/* Community Posts */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.7 }}
                        className="p-3 rounded-lg border"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.7)",
                          borderColor: "#D0C4E2",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <FileText
                            className="w-4 h-4"
                            style={{ color: "#2F3C96" }}
                          />
                          <span
                            className="text-xs font-semibold"
                            style={{ color: "#2F3C96" }}
                          >
                            Community Posts
                          </span>
                        </div>
                        <p
                          className="text-xl font-bold"
                          style={{ color: "#2F3C96" }}
                        >
                          {userStats.communityPosts}
                        </p>
                      </motion.div>

                      {/* Communities Joined */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.8 }}
                        className="p-3 rounded-lg border col-span-2 sm:col-span-1"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.7)",
                          borderColor: "#D0C4E2",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare
                            className="w-4 h-4"
                            style={{ color: "#2F3C96" }}
                          />
                          <span
                            className="text-xs font-semibold"
                            style={{ color: "#2F3C96" }}
                          >
                            Communities Joined
                          </span>
                        </div>
                        <p
                          className="text-xl font-bold"
                          style={{ color: "#2F3C96" }}
                        >
                          {communitiesJoinedDisplay}
                        </p>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Right Section - Get Started */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div
                className="rounded-2xl sm:rounded-3xl pt-5 sm:pt-6 px-6 sm:px-6 md:px-8 pb-6 sm:pb-7 md:pb-8 border-2 sm:shadow-2xl overflow-hidden text-center"
                style={{
                  backgroundColor: isMobile
                    ? "transparent"
                    : "rgba(245, 242, 248, 0.95)",
                  borderColor: isMobile ? "transparent" : "#D0C4E2",
                }}
              >
                {/* Eyebrow / kicker */}

                {/* Headline - only for non-logged-in users */}
                {!user && (
                  <motion.h3
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="text-lg sm:text-2xl font-extrabold mb-2"
                    style={{ color: "#2F3C96" }}
                  >
                    Join the Platform
                  </motion.h3>
                )}

                {/* Supporting description */}
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="text-xs sm:text-sm leading-relaxed mb-4 max-w-sm mx-auto"
                  style={{ color: "#787878" }}
                >
                  Access verified health information and participate in
                  cutting-edge research tailored to your health journey.
                </motion.p>

                {/* CTA */}
                <div>
                  {user ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.5 }}
                    >
                      <ShinyButton
                        onClick={handleDashboardClick}
                        className="group relative w-full px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                        style={{
                          backgroundColor: "#D0C4E2",
                          color: "#2F3C96",
                          borderWidth: "0px",
                        }}
                      >
                        <div className="relative z-10 flex items-center justify-center gap-2">
                          <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="font-bold text-sm sm:text-base">
                            Go to Your Dashboard
                          </span>
                          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                      </ShinyButton>
                    </motion.div>
                  ) : (
                    <>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                      >
                        <ShinyButton
                          onClick={() => navigate("/onboarding")}
                          className="group relative w-full px-5 sm:px-6 py-4 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                          style={{
                            backgroundColor: "#D0C4E2",
                            color: "#2F3C96",
                            borderWidth: "0px",
                          }}
                        >
                          <div className="relative z-10 flex items-center justify-center gap-2">
                            <span className="font-bold text-base">
                              Get Started
                            </span>
                            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-1" />
                          </div>
                        </ShinyButton>
                        <p
                          className="mt-1.5 text-[11px] sm:text-xs text-center"
                          style={{ color: "#787878", opacity: 0.9 }}
                        >
                          Create your free account
                        </p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.55 }}
                      >
                        <ShinyButton
                          onClick={() => navigate("/explore")}
                          className="group relative w-full mt-3 px-5 sm:px-6 py-4 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                          style={{
                            backgroundColor: "#474F96",
                            borderWidth: "0px",
                          }}
                        >
                          <div className="relative z-10 flex items-center justify-center gap-2" style={{ color: "#FFFFFF" }}>
                            <span className="font-bold text-base">Explore</span>
                            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-1" />
                          </div>
                        </ShinyButton>
                        <p
                          className="mt-1.5 text-[11px] sm:text-xs text-center"
                          style={{ color: "#787878", opacity: 0.9 }}
                        >
                          No account required
                        </p>
                      </motion.div>
                    </>
                  )}

                  {/* Add to Home Screen - mobile only, when not already installed */}
                  {showAddToHomeButton && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 flex justify-center"
                    >
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
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
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
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
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
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
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
                  Add Collabiora to Home Screen
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

      <style jsx>{`
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
