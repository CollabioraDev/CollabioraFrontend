"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  Beaker,
  BookOpen,
  Users,
  Lock,
  CheckCircle2,
  Star,
  Loader2,
  FileText,
  Lightbulb,
  ClipboardList,
} from "lucide-react";
import AnimatedBackground from "../components/ui/AnimatedBackground";
import apiFetch from "../utils/api.js";
import {
  getLocalRemainingSearches,
  setLocalSearchCount,
  MAX_FREE_SEARCHES,
} from "../utils/searchLimit.js";

const FREE_SEARCHES_TOTAL = 6;

const getCategoryCards = (user) => [
  {
    id: "publications",
    title: user?.role === "researcher" ? "Publications" : "Health Library",
    icon: BookOpen,
    path: user?.role === "researcher" ? "/publications" : "/library",
    color: "#474F97",
    gradient: "linear-gradient(135deg, #474F97, #6B73B8)",
    description: "Discover research papers and scientific articles. Search by topic, author, or keywords to find relevant studies.",
    stats: "Thousands of peer‑reviewed papers",
  },
  {
    id: "trials",
    title: user?.role === "researcher" ? "Clinical Trials" : "New Treatments",
    icon: Beaker,
    path: "/trials",
    color: "#2F3C96",
    gradient: "linear-gradient(135deg, #2F3C96, #4A56C8)",
    description: "Browse active clinical trials and research studies. Find opportunities to participate in groundbreaking medical research.",
    stats: "Active studies across all conditions",
  },
  {
    id: "experts",
    title: user?.role === "researcher" ? "Collaborators" : "Health Experts",
    icon: Users,
    path: "/experts",
    color: "#6B5B95",
    gradient: "linear-gradient(135deg, #6B5B95, #B8A5D5)",
    description: "Connect with researchers and medical experts. Explore profiles, publications, and collaboration opportunities.",
    stats: "Leading researchers and specialists",
  },
];

const features = [
  {
    icon: FileText,
    title: "Summaries",
    description: "Get concise, easy‑to‑read summaries of complex publications and trials.",
  },
  {
    icon: Lightbulb,
    title: "Key Insights",
    description: "Extract main findings, methodology, and conclusions at a glance.",
  },
  {
    icon: ClipboardList,
    title: "Full Details",
    description: "Access complete information—eligibility criteria, outcomes, authors, and more.",
  },
];

export default function Explore() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const localRemaining = getLocalRemainingSearches();
  const [freeSearches, setFreeSearches] = useState(
    localRemaining !== null ? localRemaining : FREE_SEARCHES_TOTAL
  );
  const [loadingSearches, setLoadingSearches] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if user is signed in
    const userData = JSON.parse(localStorage.getItem("user") || "null");
    const token = localStorage.getItem("token");
    // Only show user as logged in if email is verified
    if (userData && token && userData.emailVerified) {
      setUser(userData);
    } else {
      setUser(null);
    }

    // Guest limit: sync with backend (deviceId-based, lenient)
    if (userData && token && userData.emailVerified) {
      setFreeSearches(null);
      setLoadingSearches(false);
    } else {
      const fetchRemaining = async () => {
        try {
          const response = await apiFetch("/api/search/remaining");
          if (response?.ok) {
            const data = await response.json();
            if (data.unlimited) {
              setFreeSearches(null);
            } else {
              const remaining = data.remaining ?? FREE_SEARCHES_TOTAL;
              setFreeSearches(remaining);
              if (data.remaining !== undefined) {
                setLocalSearchCount(MAX_FREE_SEARCHES - remaining);
              }
            }
          } else {
            setFreeSearches(getLocalRemainingSearches());
          }
        } catch (e) {
          setFreeSearches(getLocalRemainingSearches());
        } finally {
          setLoadingSearches(false);
        }
      };
      fetchRemaining();
    }

    // Check mobile view
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Listen for free search updates (only update when search is made)
    const handleFreeSearchUsed = (event) => {
      if (event.detail && event.detail.remaining !== undefined) {
        const remaining = event.detail.remaining;
        setFreeSearches(remaining);
        setLocalSearchCount(MAX_FREE_SEARCHES - remaining);
      } else {
        setFreeSearches(getLocalRemainingSearches());
      }
    };

    window.addEventListener("freeSearchUsed", handleFreeSearchUsed);

    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("freeSearchUsed", handleFreeSearchUsed);
    };
  }, []);

  // Listen for login events
  useEffect(() => {
    const handleLogin = async () => {
      const userData = JSON.parse(localStorage.getItem("user") || "null");
      const token = localStorage.getItem("token");
      // Only show user as logged in if email is verified
      if (userData && token && userData.emailVerified) {
        setUser(userData);
      } else {
        setUser(null);
      }
      // Update free searches (will be unlimited for signed-in users)
      if (userData && token && userData.emailVerified) {
        setFreeSearches(null);
        setLoadingSearches(false);
      } else {
        // Guest: fetch from backend
        try {
          const response = await apiFetch("/api/search/remaining");
          if (response?.ok) {
            const data = await response.json();
            const remaining = data.remaining ?? FREE_SEARCHES_TOTAL;
            setFreeSearches(remaining);
            setLocalSearchCount(MAX_FREE_SEARCHES - remaining);
          } else {
            setFreeSearches(getLocalRemainingSearches());
          }
        } catch (e) {
          setFreeSearches(getLocalRemainingSearches());
        } finally {
          setLoadingSearches(false);
        }
      }
    };

    window.addEventListener("login", handleLogin);
    return () => window.removeEventListener("login", handleLogin);
  }, []);

  const benefits = [
    "Unlimited searches",
    "Personalized recommendations",
    "Save favorites",
    "Connect with experts",
    "Track your research",
    "Priority support",
  ];

  return (
    <div className="relative min-h-screen">
      {/* Animated Background */}
      <AnimatedBackground isMobile={isMobile} />

      {/* Main Content */}
      <section className="relative flex flex-col items-center justify-center px-4 sm:px-6 pt-24 sm:pt-28 pb-12 sm:pb-16 overflow-hidden">
        <div className="max-w-4xl relative z-10 w-full">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8"
          >
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 leading-tight"
              style={{ color: "#2F3C96" }}
            >
              Explore Healthcare Research
            </h1>
            <p
              className="text-base sm:text-lg mb-6"
              style={{ color: "#787878" }}
            >
              Browse publications, clinical trials, and connect with experts. No sign-up required to start!
            </p>
          </motion.div>

          {/* Free Searches Badge */}
          {!user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex justify-center mb-6"
            >
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 shadow-md"
                style={{
                  backgroundColor: "#F5F2F8",
                  borderColor: "#D0C4E2",
                }}
              >
                {loadingSearches ? (
                  <>
                    <Loader2
                      className="w-4 h-4 animate-spin"
                      style={{ color: "#2F3C96" }}
                    />
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "#2F3C96" }}
                    >
                      Loading...
                    </span>
                  </>
                ) : freeSearches !== null ? (
                  <>
                    <Sparkles
                      className="w-4 h-4"
                      style={{ color: "#2F3C96" }}
                    />
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "#2F3C96" }}
                    >
                      {freeSearches} search{freeSearches !== 1 ? "es" : ""}{" "}
                      remaining
                    </span>
                  </>
                ) : null}
              </div>
            </motion.div>
          )}

          {/* Category Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-10"
          >
            {getCategoryCards(user).map((card, idx) => {
              const Icon = card.icon;
              return (
                <motion.button
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * idx }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(card.path)}
                  className="group text-left bg-white rounded-xl shadow-lg border-2 p-6 relative overflow-hidden transition-all duration-300 hover:shadow-xl"
                  style={{
                    borderColor: "#D0C4E2",
                  }}
                >
                  <div
                    className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-xl group-hover:opacity-20 transition-opacity"
                    style={{ background: card.gradient }}
                  />
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 relative"
                    style={{ backgroundColor: `${card.color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: card.color }} />
                  </div>
                  <h3
                    className="text-lg font-bold mb-2"
                    style={{ color: "#2F3C96" }}
                  >
                    {card.title}
                  </h3>
                  <p
                    className="text-sm mb-3 leading-relaxed"
                    style={{ color: "#787878" }}
                  >
                    {card.description}
                  </p>
                  <p
                    className="text-xs font-medium mb-4"
                    style={{ color: card.color }}
                  >
                    {card.stats}
                  </p>
                  <span
                    className="inline-flex items-center gap-1.5 text-sm font-semibold"
                    style={{ color: card.color }}
                  >
                    Explore
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="rounded-xl p-6 sm:p-8 border-2 relative overflow-hidden"
            style={{
              backgroundColor: "rgba(245, 242, 248, 0.95)",
              borderColor: "#D0C4E2",
            }}
          >
            <div
              className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 blur-2xl"
              style={{
                background: "linear-gradient(to bottom right, #2F3C96, #B8A5D5)",
              }}
            />
            <h2
              className="text-xl sm:text-2xl font-bold mb-6 relative"
              style={{ color: "#2F3C96" }}
            >
              What You Can Do
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
              {features.map((feature, idx) => {
                const FeatureIcon = feature.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 + idx * 0.1 }}
                    className="flex flex-col items-start"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                      style={{ backgroundColor: "#FFFFFF", color: "#2F3C96" }}
                    >
                      <FeatureIcon className="w-5 h-5" />
                    </div>
                    <h3
                      className="font-semibold text-base mb-1"
                      style={{ color: "#2F3C96" }}
                    >
                      {feature.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "#787878" }}
                    >
                      {feature.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Sign In Encouragement - Enhanced - Only show when searches are exhausted */}
          {!user && freeSearches === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-10 rounded-xl p-6 sm:p-8 border-2 relative overflow-hidden"
              style={{
                backgroundColor: "rgba(245, 242, 248, 0.95)",
                borderColor: "#D0C4E2",
              }}
            >
              {/* Decorative gradient overlay */}
              <div
                className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl"
                style={{
                  background: `linear-gradient(to bottom right, #2F3C96, #B8A5D5)`,
                }}
              ></div>

              <div className="relative flex flex-col sm:flex-row items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: "#FFFFFF" }}
                    >
                      <Lock className="w-5 h-5" style={{ color: "#2F3C96" }} />
                    </div>
                    <h2
                      className="text-xl sm:text-2xl font-bold"
                      style={{ color: "#2F3C96" }}
                    >
                      Unlock Unlimited Access
                    </h2>
                  </div>
                  <p
                    className="text-sm sm:text-base mb-4"
                    style={{ color: "#787878" }}
                  >
                    Sign in to get personalized recommendations, save your
                    favorites, and connect with experts in your field.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {benefits.map((benefit, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-sm"
                        style={{ color: "#2F3C96" }}
                      >
                        <CheckCircle2
                          className="w-4 h-4 shrink-0"
                          style={{ color: "#D0C4E2" }}
                        />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate("/signin")}
                      className="px-6 py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 text-white transition-all duration-300 shadow-md hover:shadow-lg"
                      style={{
                        background: `linear-gradient(to right, #2F3C96, #474F97)`,
                      }}
                    >
                      Sign In Now
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate("/onboarding")}
                      className="px-6 py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 border-2"
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#2F3C96",
                        color: "#2F3C96",
                      }}
                    >
                      Create Account
                      <Star className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
                <div
                  className="p-4 rounded-lg relative"
                  style={{ backgroundColor: "#FFFFFF" }}
                >
                  <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                    FREE
                  </div>
                  <Lock
                    className="w-16 h-16 sm:w-20 sm:h-20"
                    style={{ color: "#D0C4E2" }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
