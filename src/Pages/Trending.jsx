"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Users,
  Beaker,
  MessageCircle,
  FileText,
  ChevronRight,
  Loader2,
  MapPin,
  Heart,
  MessageSquare,
  Eye,
  ThumbsUp,
  Calendar,
  CheckCircle,
  Info,
  Sparkles,
  X,
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";
import { AuroraText } from "@/components/ui/aurora-text";
import Modal from "../components/ui/Modal.jsx";
import apiFetch from "../utils/api.js";
import { getSimplifiedTitle } from "../utils/titleSimplifier.js";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

const SECTIONS = [
  { id: "experts", label: "Trending Experts", icon: Users },
  { id: "trials", label: "Trending Trials", icon: Beaker },
  { id: "communities", label: "Trending Communities", icon: MessageCircle },
  { id: "posts", label: "Trending Posts", icon: FileText },
];

export default function Trending() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("experts");
  const [expertsActive, setExpertsActive] = useState([]);
  const [newlyRecruitingTrials, setNewlyRecruitingTrials] = useState([]);
  const [trendingForums, setTrendingForums] = useState([]);
  const [trendingDiscussions, setTrendingDiscussions] = useState([]);
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [loadingExperts, setLoadingExperts] = useState(false);
  const [loadingTrials, setLoadingTrials] = useState(false);
  const [loadingForums, setLoadingForums] = useState(false);
  const [loadingDiscussions, setLoadingDiscussions] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [favoritingItems, setFavoritingItems] = useState(new Set());
  const [summaryModal, setSummaryModal] = useState({
    open: false,
    title: "",
    type: "",
    summary: "",
    loading: false,
  });
  const [simplifiedTitles, setSimplifiedTitles] = useState({});

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load user and favorites
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(userData && localStorage.getItem("token") ? userData : null);
    loadFavorites();
    loadUserProfile();
  }, []);

  async function loadUserProfile() {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (!userData?._id && !userData?.id) return;

    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${base}/api/profile/${userData._id || userData.id}`);
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data.profile);
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  }

  async function loadFavorites() {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (!userData?._id && !userData?.id) return;

    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${base}/api/favorite/all/${userData._id || userData.id}`);
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites || []);
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
    }
  }

  const getFavoriteKey = (item) => {
    return `trial-${item.id || item._id || item.nctId || item.nct_id}`;
  };

  async function favorite(item) {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (!userData?._id && !userData?.id) {
      toast.error("Please sign in to favorite items");
      return;
    }

    const favoriteKey = getFavoriteKey(item);
    if (favoritingItems.has(favoriteKey)) return;

    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const itemId = item.id || item._id || item.nctId || item.nct_id;
    const isFavorited = favorites.some(
      (fav) =>
        fav.type === "trial" &&
        (fav.item?.id === itemId ||
          fav.item?._id === itemId ||
          fav.item?.nctId === itemId ||
          fav.item?.title === item.title)
    );

    const previousFavorites = [...favorites];
    let optimisticFavorites;

    if (isFavorited) {
      optimisticFavorites = favorites.filter((fav) => {
        if (fav.type !== "trial") return true;
        return !(
          fav.item?.id === itemId ||
          fav.item?._id === itemId ||
          fav.item?.nctId === itemId ||
          fav.item?.title === item.title
        );
      });
    } else {
      optimisticFavorites = [
        ...favorites,
        {
          type: "trial",
          item: { ...item, _id: itemId, id: itemId },
        },
      ];
    }

    setFavorites(optimisticFavorites);
    setFavoritingItems((prev) => new Set(prev).add(favoriteKey));

    try {
      const res = await fetch(`${base}/api/favorite/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userData._id || userData.id,
          type: "trial",
          item: { ...item, _id: itemId, id: itemId },
        }),
      });

      if (!res.ok) throw new Error("Failed to toggle favorite");

      const data = await res.json();
      toast.success(data.message || (isFavorited ? "Removed from favorites" : "Added to favorites"));
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setFavorites(previousFavorites);
      toast.error("Failed to update favorites");
    } finally {
      setFavoritingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(favoriteKey);
        return newSet;
      });
    }
  }

  async function generateSummary(item) {
    const isPatient = userProfile?.patient !== undefined;
    const isResearcher = userProfile?.researcher !== undefined;
    const shouldSimplify = isPatient || (!isPatient && !isResearcher);

    const title = item.title || item.brief_title || "Clinical Trial";
    const text = [
      item.title || item.brief_title || "",
      item.status || "",
      item.phase || "",
      item.conditions?.join(", ") || "",
      item.description || "",
      item.eligibility?.criteria || "",
    ]
      .filter(Boolean)
      .join(" ");

    setSummaryModal({
      open: true,
      title,
      type: "trial",
      summary: "",
      loading: true,
    });

    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    try {
      const res = await fetch(`${base}/api/ai/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          type: "trial",
          simplify: shouldSimplify,
          trial: item,
        }),
      }).then((r) => r.json());

      setSummaryModal((prev) => ({
        ...prev,
        summary:
          res.summary ||
          (typeof res.summary === "object" && res.summary.structured
            ? res.summary
            : { structured: false, summary: "Summary unavailable" }),
        loading: false,
      }));
    } catch (e) {
      console.error("Error generating summary:", e);
      setSummaryModal((prev) => ({
        ...prev,
        summary: { structured: false, summary: "Failed to generate summary. Please try again." },
        loading: false,
      }));
    }
  }

  // Load all sections on mount (cached backend responses are fast)
  useEffect(() => {
    let cancelled = false;
    setLoadingExperts(true);
    apiFetch("/api/trending/experts")
      .then((res) => res?.ok && res.json())
      .then((json) => {
        if (!cancelled && json?.expertsActive) setExpertsActive(json.expertsActive);
      })
      .catch((err) => console.error("Trending experts fetch error:", err))
      .finally(() => {
        if (!cancelled) setLoadingExperts(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    
    async function fetchTrials() {
      setLoadingTrials(true);
      
      try {
        let userInterest = "";
        
        // Get medical interest from user data (stored in localStorage)
        if (user) {
          userInterest = user.medicalInterests?.[0] || "";
        }
        
        const apiUrl = userInterest 
          ? `/api/trending/trials?interest=${encodeURIComponent(userInterest)}`
          : "/api/trending/trials";
        
        const res = await apiFetch(apiUrl);
        const json = await res.json();
        
        if (!cancelled && json?.newlyRecruitingTrials) {
          setNewlyRecruitingTrials(json.newlyRecruitingTrials);
          
          // Simplify titles for trials
          const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
          const titlePromises = json.newlyRecruitingTrials.map(async (trial) => {
            const trialId = trial.nctId || trial.nct_id || trial.id || trial._id;
            const originalTitle = trial.title || trial.brief_title || "";
            if (originalTitle && originalTitle.length > 60) {
              const simplified = await getSimplifiedTitle(originalTitle, base);
              return { id: trialId, title: simplified };
            }
            return { id: trialId, title: originalTitle };
          });
          
          const simplifiedResults = await Promise.all(titlePromises);
          const titlesMap = {};
          simplifiedResults.forEach(({ id, title }) => {
            titlesMap[id] = title;
          });
          setSimplifiedTitles((prev) => ({ ...prev, ...titlesMap }));
        }
      } catch (err) {
        console.error("Trending trials fetch error:", err);
      } finally {
        if (!cancelled) setLoadingTrials(false);
      }
    }
    
    fetchTrials();
    
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    setLoadingForums(true);
    apiFetch("/api/trending/forums")
      .then((res) => res?.ok && res.json())
      .then((json) => {
        if (!cancelled && json?.trendingForums)
          setTrendingForums(json.trendingForums);
      })
      .catch((err) => console.error("Trending forums fetch error:", err))
      .finally(() => {
        if (!cancelled) setLoadingForums(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingDiscussions(true);
    apiFetch("/api/trending/discussions")
      .then((res) => res?.ok && res.json())
      .then((json) => {
        if (!cancelled && json?.trendingDiscussions)
          setTrendingDiscussions(json.trendingDiscussions);
      })
      .catch((err) => console.error("Trending discussions fetch error:", err))
      .finally(() => {
        if (!cancelled) setLoadingDiscussions(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingPosts(true);
    apiFetch("/api/trending/posts")
      .then((res) => res?.ok && res.json())
      .then((json) => {
        if (!cancelled && json?.trendingPosts)
          setTrendingPosts(json.trendingPosts);
      })
      .catch((err) => console.error("Trending posts fetch error:", err))
      .finally(() => {
        if (!cancelled) setLoadingPosts(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const trimText = (text, maxLen = 120) => {
    if (!text || typeof text !== "string") return "";
    return text.length <= maxLen ? text : text.slice(0, maxLen).trim() + "…";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };

  const getStatusColor = (status) => {
    const statusUpper = status?.toUpperCase() || "";
    if (statusUpper === "RECRUITING") return "bg-green-50 text-green-700 border-green-200";
    if (statusUpper === "ACTIVE_NOT_RECRUITING") return "bg-yellow-50 text-yellow-700 border-yellow-200";
    if (statusUpper === "COMPLETED") return "bg-gray-50 text-gray-700 border-gray-200";
    if (statusUpper === "ENROLLING_BY_INVITATION") return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const getSectionData = () => {
    switch (activeSection) {
      case "experts":
        return { data: expertsActive, loading: loadingExperts };
      case "trials":
        return { data: newlyRecruitingTrials, loading: loadingTrials };
      case "communities":
        return { data: trendingForums, loading: loadingForums };
      case "posts":
        return { data: trendingPosts, loading: loadingPosts };
      default:
        return { data: [], loading: false };
    }
  };

  const { data: currentData, loading: currentLoading } = getSectionData();

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 relative overflow-hidden">
        <AnimatedBackground />

        <div className="relative pt-24 px-4 md:px-8 mx-auto max-w-6xl pb-16">
          {/* Header with AuroraText */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 bg-clip-text text-transparent mb-1">
              <AuroraText
                speed={2.5}
                colors={["#2F3C96", "#474F97", "#757BB1", "#B8A5D5", "#D0C4E2"]}
              >
                What's Trending
              </AuroraText>
            </h1>
            <p className="text-sm text-slate-600">
              Discover what's hot in research, trials, and community discussions
            </p>
          </div>

          {/* Modern Tab Bar */}
          <div className="bg-white rounded-xl shadow-lg p-2 mb-8 border border-slate-200 animate-fade-in">
            <div className="flex items-center gap-2 overflow-x-auto">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex items-center gap-2.5 px-5 sm:px-8 py-3.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                      isActive ? "shadow-md" : "hover:bg-gray-50"
                    }`}
                    style={
                      isActive
                        ? {
                            background: "linear-gradient(135deg, #2F3C96, #474F97)",
                            color: "#fff",
                          }
                        : { color: "#787878" }
                    }
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="hidden sm:inline">{section.label}</span>
                    <span className="sm:hidden">{section.label.split(" ")[1]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Area - Section based */}
          <AnimatePresence mode="wait">
            {currentLoading ? (
              <motion.div
                key="loading"
                variants={fadeIn}
                initial="hidden"
                animate="show"
                exit="exit"
                className="flex flex-col items-center justify-center py-24 gap-5"
              >
                <Loader2 className="w-12 h-12 animate-spin" style={{ color: "#2F3C96" }} />
                <p className="text-lg font-medium" style={{ color: "#787878" }}>
                  Loading {SECTIONS.find((s) => s.id === activeSection)?.label.toLowerCase()}...
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={activeSection}
                variants={fadeIn}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                {/* Experts Section */}
                {activeSection === "experts" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-2xl font-bold mb-1" style={{ color: "#2F3C96" }}>
                          Trending Experts
                        </h2>
                        <p className="text-sm" style={{ color: "#787878" }}>
                          On-platform researchers actively contributing to discussions
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate("/experts")}
                        className="text-sm font-medium flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 hover:bg-gray-50 transition-all bg-white"
                        style={{ color: "#474F97", borderColor: "#D0C4E2" }}
                      >
                        View all experts <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    {expertsActive.length === 0 ? (
                      <div
                        className="rounded-2xl border-2 p-16 text-center bg-white/80"
                        style={{ borderColor: "#E8E0EF" }}
                      >
                        <Users className="w-16 h-16 mx-auto mb-4" style={{ color: "#D0C4E2" }} />
                        <p className="text-lg font-semibold mb-2" style={{ color: "#2F3C96" }}>
                          No active experts yet
                        </p>
                        <p className="text-sm" style={{ color: "#787878" }}>
                          Join discussions to see experts here
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {expertsActive.map((expert) => (
                          <motion.div
                            key={expert._id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className="rounded-2xl border-2 p-6 bg-white shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                            style={{ borderColor: "#E8E0EF" }}
                            onClick={() => navigate(`/collabiora-expert/profile/${expert._id}`)}
                          >
                            <div className="flex items-start gap-4 mb-4">
                              <div
                                className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 text-white font-bold text-2xl group-hover:scale-105 transition-transform shadow-md"
                                style={{ background: "linear-gradient(135deg, #2F3C96, #B8A5D5)" }}
                              >
                                {(() => {
                                  if (!expert.name) return "E";
                                  const name = expert.name.trim();
                                  // Remove titles like Dr., Prof., Mr., Ms., etc.
                                  const nameWithoutTitle = name.replace(/^(Dr\.?|Prof\.?|Mr\.?|Ms\.?|Mrs\.?|Miss)\s+/i, "");
                                  return nameWithoutTitle.charAt(0).toUpperCase();
                                })()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-lg mb-1 truncate" style={{ color: "#2F3C96" }}>
                                  {expert.name || "Researcher"}
                                </p>
                                {expert.affiliation && (
                                  <p className="text-sm line-clamp-2 mb-2" style={{ color: "#787878" }}>
                                    {expert.affiliation}
                                  </p>
                                )}
                                {expert.location && (
                                  <p className="text-xs flex items-center gap-1.5 mb-2" style={{ color: "#787878" }}>
                                    <MapPin className="w-4 h-4" />
                                    {expert.location}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {/* Contributions */}
                            {expert.contributionCount > 0 && (
                              <div
                                className="mb-4 py-2.5 px-3 rounded-xl flex items-center justify-between"
                                style={{ backgroundColor: "#F5F2F8" }}
                              >
                                <span className="text-sm font-medium" style={{ color: "#474F97" }}>
                                  Platform Contributions
                                </span>
                                <span className="text-base font-bold" style={{ color: "#2F3C96" }}>
                                  {expert.contributionCount}
                                </span>
                              </div>
                            )}

                            {/* Specialties/Interests */}
                            {(expert.specialties?.length || expert.interests?.length) > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {(expert.specialties || expert.interests || []).slice(0, 3).map((s) => (
                                  <span
                                    key={s}
                                    className="text-xs px-3 py-1.5 rounded-full font-medium"
                                    style={{ backgroundColor: "#F5F2F8", color: "#474F97" }}
                                  >
                                    {s}
                                  </span>
                                ))}
                                {(expert.specialties?.length || expert.interests?.length || 0) > 3 && (
                                  <span className="text-xs px-3 py-1.5 font-medium" style={{ color: "#787878" }}>
                                    +{(expert.specialties?.length || expert.interests?.length || 0) - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Trials Section - Styled like Trials.jsx */}
                {activeSection === "trials" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-2xl font-bold mb-1" style={{ color: "#2F3C96" }}>
                          Trending Trials
                        </h2>
                        <p className="text-sm" style={{ color: "#787878" }}>
                          Newly recruiting clinical trials across all conditions
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate("/trials")}
                        className="text-sm font-medium flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 hover:bg-gray-50 transition-all bg-white"
                        style={{ color: "#474F97", borderColor: "#D0C4E2" }}
                      >
                        View all trials <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    {newlyRecruitingTrials.length === 0 ? (
                      <div
                        className="rounded-2xl border-2 p-16 text-center bg-white/80"
                        style={{ borderColor: "#E8E0EF" }}
                      >
                        <Beaker className="w-16 h-16 mx-auto mb-4" style={{ color: "#D0C4E2" }} />
                        <p className="text-lg font-semibold mb-2" style={{ color: "#2F3C96" }}>
                          No newly recruiting trials
                        </p>
                        <p className="text-sm" style={{ color: "#787878" }}>
                          Check back soon for new opportunities
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {newlyRecruitingTrials.map((trial, cardIdx) => {
                          const nctId = trial.nctId || trial.nct_id || trial.id || trial._id;
                          const itemId = nctId;
                          const originalTitle = trial.title || trial.brief_title || "Clinical trial";
                          const title = simplifiedTitles[nctId] || originalTitle;
                          return (
                            <motion.div
                              key={nctId || title}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3 }}
                              className="rounded-xl shadow-sm border transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden flex flex-col h-full bg-white animate-fade-in"
                              style={{
                                borderColor: "rgba(59, 130, 246, 0.4)",
                                animationDelay: `${cardIdx * 50}ms`,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow =
                                  "0 10px 15px -3px rgba(47, 60, 150, 0.1), 0 4px 6px -2px rgba(47, 60, 150, 0.05)";
                                e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.6)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
                                e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.4)";
                              }}
                            >
                              <div className="p-5 flex flex-col flex-grow">
                                {/* Status & Phase */}
                                <div className="flex items-center justify-between mb-4">
                                  {trial.status && (
                                    <span
                                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                        trial.status
                                      )}`}
                                    >
                                      {trial.status.replace(/_/g, " ")}
                                    </span>
                                  )}
                                  {trial.phase && (
                                    <span
                                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                                      style={{ backgroundColor: "rgba(208, 196, 226, 0.3)", color: "#474F97" }}
                                    >
                                      {trial.phase}
                                    </span>
                                  )}
                                </div>

                                {/* Trial Title */}
                                <div className="mb-4">
                                  <h3
                                    className="text-lg font-bold mb-0 line-clamp-3 leading-snug"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    {title}
                                  </h3>
                                </div>

                                {/* Description Preview */}
                                {(trial.description || trial.conditionDescription) && (
                                  <div className="mb-4 flex-grow">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (nctId) navigate(`/trial/${nctId}`);
                                      }}
                                      className="w-full text-left text-sm py-2 px-3 rounded-lg transition-all duration-200 border group"
                                      style={{
                                        backgroundColor: "rgba(208, 196, 226, 0.2)",
                                        borderColor: "rgba(47, 60, 150, 0.2)",
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "rgba(208, 196, 226, 0.3)";
                                        e.currentTarget.style.borderColor = "rgba(47, 60, 150, 0.3)";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "rgba(208, 196, 226, 0.2)";
                                        e.currentTarget.style.borderColor = "rgba(47, 60, 150, 0.2)";
                                      }}
                                    >
                                      <div className="flex items-start gap-2">
                                        <Info
                                          className="w-4 h-4 mt-0.5 shrink-0 transition-colors duration-200"
                                          style={{ color: "#2F3C96" }}
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div
                                            className="transition-colors duration-200"
                                            style={{ color: "#787878" }}
                                          >
                                            <span className="line-clamp-2">
                                              {trial.description || trial.conditionDescription || "View details for more information"}
                                            </span>
                                          </div>
                                          <div
                                            className="mt-1.5 flex items-center gap-1 font-medium transition-all duration-200"
                                            style={{ color: "#2F3C96" }}
                                          >
                                            <span>Read more details</span>
                                            <span className="inline-block group-hover:translate-x-0.5 transition-transform duration-200">
                                              →
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </button>
                                  </div>
                                )}

                                {/* Spacer */}
                                {!trial.description && !trial.conditionDescription && <div className="flex-grow"></div>}

                                {/* Action Buttons */}
                                <div className="flex gap-2 mt-auto">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      generateSummary(trial);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
                                    style={{
                                      background: "linear-gradient(135deg, #2F3C96, #253075)",
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = "linear-gradient(135deg, #253075, #1C2454)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = "linear-gradient(135deg, #2F3C96, #253075)";
                                    }}
                                  >
                                    <Sparkles className="w-4 h-4" />
                                    Simplify
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      favorite(trial);
                                    }}
                                    disabled={favoritingItems.has(getFavoriteKey(trial))}
                                    className={`p-2 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                      favorites.some(
                                        (fav) =>
                                          fav.type === "trial" &&
                                          (fav.item?.id === itemId || fav.item?._id === itemId || fav.item?.nctId === itemId)
                                      )
                                        ? "bg-red-50 border-red-200 text-red-500"
                                        : ""
                                    }`}
                                    style={
                                      !favorites.some(
                                        (fav) =>
                                          fav.type === "trial" &&
                                          (fav.item?.id === itemId || fav.item?._id === itemId || fav.item?.nctId === itemId)
                                      )
                                        ? {
                                            backgroundColor: "rgba(208, 196, 226, 0.2)",
                                            borderColor: "rgba(47, 60, 150, 0.2)",
                                            color: "#2F3C96",
                                          }
                                        : {}
                                    }
                                    onMouseEnter={(e) => {
                                      if (
                                        !favorites.some(
                                          (fav) =>
                                            fav.type === "trial" &&
                                            (fav.item?.id === itemId || fav.item?._id === itemId || fav.item?.nctId === itemId)
                                        )
                                      ) {
                                        e.currentTarget.style.backgroundColor = "rgba(208, 196, 226, 0.3)";
                                        e.currentTarget.style.borderColor = "rgba(47, 60, 150, 0.3)";
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (
                                        !favorites.some(
                                          (fav) =>
                                            fav.type === "trial" &&
                                            (fav.item?.id === itemId || fav.item?._id === itemId || fav.item?.nctId === itemId)
                                        )
                                      ) {
                                        e.currentTarget.style.backgroundColor = "rgba(208, 196, 226, 0.2)";
                                        e.currentTarget.style.borderColor = "rgba(47, 60, 150, 0.2)";
                                      }
                                    }}
                                  >
                                    <Heart
                                      className="w-4 h-4"
                                      fill={
                                        favorites.some(
                                          (fav) =>
                                            fav.type === "trial" &&
                                            (fav.item?.id === itemId || fav.item?._id === itemId || fav.item?.nctId === itemId)
                                        )
                                          ? "currentColor"
                                          : "none"
                                      }
                                    />
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Communities Section + Discussions Below */}
                {activeSection === "communities" && (
                  <div className="space-y-10">
                    {/* Communities */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h2 className="text-2xl font-bold mb-1" style={{ color: "#2F3C96" }}>
                            Trending Communities
                          </h2>
                          <p className="text-sm" style={{ color: "#787878" }}>
                            Most active community forums with the highest engagement
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate("/forums")}
                          className="text-sm font-medium flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 hover:bg-gray-50 transition-all bg-white"
                          style={{ color: "#474F97", borderColor: "#D0C4E2" }}
                        >
                          View all forums <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      {loadingForums ? (
                        <div className="flex justify-center py-12">
                          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#2F3C96" }} />
                        </div>
                      ) : trendingForums.length === 0 ? (
                        <div
                          className="rounded-2xl border-2 p-16 text-center bg-white/80"
                          style={{ borderColor: "#E8E0EF" }}
                        >
                          <MessageCircle className="w-16 h-16 mx-auto mb-4" style={{ color: "#D0C4E2" }} />
                          <p className="text-lg font-semibold mb-2" style={{ color: "#2F3C96" }}>
                            No communities yet
                          </p>
                          <p className="text-sm" style={{ color: "#787878" }}>
                            Communities will appear here
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                          {trendingForums.map((forum) => (
                            <motion.div
                              key={forum._id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3 }}
                              className="rounded-2xl border-2 p-6 bg-white shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                              style={{ borderColor: forum.color ? `${forum.color}30` : "#E8E0EF" }}
                              onClick={() => navigate(`/forums/community/${forum._id}`)}
                            >
                              <div
                                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-5 group-hover:scale-105 transition-transform shadow-md"
                                style={{
                                  backgroundColor: forum.color ? `${forum.color}20` : "#F5F2F8",
                                  color: forum.color || "#2F3C96",
                                }}
                              >
                                {forum.icon || "💬"}
                              </div>
                              <p className="font-bold text-lg mb-2 truncate" style={{ color: "#2F3C96" }}>
                                {forum.name}
                              </p>
                              {forum.description && (
                                <p className="text-sm line-clamp-2 mb-4" style={{ color: "#787878" }}>
                                  {forum.description}
                                </p>
                              )}
                              <div
                                className="flex items-center gap-4 text-xs pt-3 border-t"
                                style={{ color: "#787878", borderColor: "#F5F5F5" }}
                              >
                                <span className="flex items-center gap-1.5 font-semibold">
                                  <MessageSquare className="w-4 h-4" />
                                  {forum.threadCount ?? 0}
                                </span>
                                <span className="flex items-center gap-1.5 font-semibold">
                                  <Users className="w-4 h-4" />
                                  {forum.memberCount ?? 0}
                                </span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Trending Discussions (below communities) */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h2 className="text-2xl font-bold mb-1" style={{ color: "#2F3C96" }}>
                            Trending Discussions
                          </h2>
                          <p className="text-sm" style={{ color: "#787878" }}>
                            Top 3 most viewed forum threads
                          </p>
                        </div>
                      </div>
                      {loadingDiscussions ? (
                        <div className="flex justify-center py-12">
                          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#2F3C96" }} />
                        </div>
                      ) : trendingDiscussions.length === 0 ? (
                        <div
                          className="rounded-2xl border-2 p-16 text-center bg-white/80"
                          style={{ borderColor: "#E8E0EF" }}
                        >
                          <MessageCircle className="w-16 h-16 mx-auto mb-4" style={{ color: "#D0C4E2" }} />
                          <p className="text-lg font-semibold mb-2" style={{ color: "#2F3C96" }}>
                            No discussions yet
                          </p>
                          <p className="text-sm" style={{ color: "#787878" }}>
                            Start a discussion in a community
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          {trendingDiscussions.map((thread, idx) => (
                            <motion.div
                              key={thread._id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: idx * 0.1 }}
                              className="rounded-2xl border-2 p-6 bg-white shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                              style={{ borderColor: "#E8E0EF" }}
                              onClick={() => navigate(`/forums/community/${thread.community?._id || thread.community?.slug}`)}
                            >
                              <div className="flex items-start gap-5">
                                {/* Rank Badge */}
                                <div
                                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 shadow-md"
                                  style={{
                                    background: "linear-gradient(135deg, #2F3C96, #B8A5D5)",
                                    color: "#fff",
                                  }}
                                >
                                  #{idx + 1}
                                </div>

                                <div className="flex-1 min-w-0">
                                  {/* Title */}
                                  <h3
                                    className="text-lg font-bold mb-2 line-clamp-2 group-hover:underline"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    {thread.title}
                                  </h3>

                                  {/* Body Preview */}
                                  {thread.body && (
                                    <p className="text-sm mb-3 line-clamp-2" style={{ color: "#787878" }}>
                                      {thread.body}
                                    </p>
                                  )}

                                  {/* Meta Info */}
                                  <div className="flex items-center gap-4 flex-wrap text-xs">
                                    <span className="font-semibold" style={{ color: "#474F97" }}>
                                      {thread.author?.username || "User"}
                                    </span>
                                    {thread.community?.name && (
                                      <>
                                        <span style={{ color: "#D0C4E2" }}>·</span>
                                        <span className="font-medium" style={{ color: "#474F97" }}>
                                          {thread.community.name}
                                        </span>
                                      </>
                                    )}
                                    <span style={{ color: "#D0C4E2" }}>·</span>
                                    <span className="flex items-center gap-1.5" style={{ color: "#787878" }}>
                                      <Eye className="w-4 h-4" />
                                      <span className="font-medium">{thread.viewCount || 0} views</span>
                                    </span>
                                    <span className="flex items-center gap-1.5" style={{ color: "#787878" }}>
                                      <MessageSquare className="w-4 h-4" />
                                      <span className="font-medium">{thread.replyCount || 0}</span>
                                    </span>
                                    <span className="flex items-center gap-1.5" style={{ color: "#787878" }}>
                                      <ThumbsUp className="w-4 h-4" />
                                      <span className="font-medium">{thread.voteScore || 0}</span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Posts Section */}
                {activeSection === "posts" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-2xl font-bold mb-1" style={{ color: "#2F3C96" }}>
                          Trending Posts
                        </h2>
                        <p className="text-sm" style={{ color: "#787878" }}>
                          Most liked community posts from across the platform
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate("/forums")}
                        className="text-sm font-medium flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 hover:bg-gray-50 transition-all bg-white"
                        style={{ color: "#474F97", borderColor: "#D0C4E2" }}
                      >
                        Go to forums <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    {trendingPosts.length === 0 ? (
                      <div
                        className="rounded-2xl border-2 p-16 text-center bg-white/80"
                        style={{ borderColor: "#E8E0EF" }}
                      >
                        <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: "#D0C4E2" }} />
                        <p className="text-lg font-semibold mb-2" style={{ color: "#2F3C96" }}>
                          No trending posts yet
                        </p>
                        <p className="text-sm" style={{ color: "#787878" }}>
                          Join a community to see posts here
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {trendingPosts.map((post) => {
                          const imageAttachment = post.attachments?.find((att) => att.type === "image");
                          return (
                            <motion.div
                              key={post._id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3 }}
                              className="rounded-2xl border-2 bg-white shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col"
                              style={{ borderColor: "#E8E0EF" }}
                            >
                              {/* Image if exists */}
                              {imageAttachment && (
                                <div className="w-full h-48 overflow-hidden">
                                  <img
                                    src={imageAttachment.url}
                                    alt="Post attachment"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              
                              <div className="p-6 flex flex-col flex-grow">
                                <p className="text-sm line-clamp-4 mb-5 leading-relaxed" style={{ color: "#484848" }}>
                                  {post.content}
                                </p>
                                <div className="space-y-3 mt-auto">
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="font-semibold" style={{ color: "#2F3C96" }}>
                                      {post.author?.username || "User"}
                                    </span>
                                    {post.community?.name && (
                                      <>
                                        <span style={{ color: "#D0C4E2" }}>·</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (post.community?.slug || post.community?._id)
                                              navigate(`/forums/community/${post.community?.slug || post.community?._id}`);
                                          }}
                                          className="hover:underline font-medium"
                                          style={{ color: "#474F97" }}
                                        >
                                          {post.community.name}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                  <div
                                    className="flex items-center gap-4 text-xs pt-3 border-t"
                                    style={{ color: "#787878", borderColor: "#F5F5F5" }}
                                  >
                                    <span className="flex items-center gap-1.5 font-semibold">
                                      <Heart className="w-4 h-4" />
                                      <span>{post.likeCount ?? 0}</span>
                                    </span>
                                    <span className="flex items-center gap-1.5 font-semibold">
                                      <MessageSquare className="w-4 h-4" />
                                      <span>{post.replyCount ?? 0}</span>
                                    </span>
                                    {post.createdAt && (
                                      <>
                                        <span style={{ color: "#D0C4E2" }}>·</span>
                                        <span className="flex items-center gap-1.5">
                                          <Calendar className="w-4 h-4" />
                                          {formatDate(post.createdAt)}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Summary Modal */}
      <Modal
        open={summaryModal.open}
        onClose={() => setSummaryModal({ open: false, title: "", type: "", summary: "", loading: false })}
        title={summaryModal.title}
      >
        <div className="p-6">
          {summaryModal.loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
              <p className="text-slate-600 font-medium">Generating summary...</p>
            </div>
          ) : typeof summaryModal.summary === "object" && summaryModal.summary.structured ? (
            <div className="space-y-6">
              {summaryModal.summary.what && (
                <div>
                  <h3 className="text-lg font-bold text-indigo-900 mb-2 flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    What is this trial?
                  </h3>
                  <p className="text-slate-700 leading-relaxed">{summaryModal.summary.what}</p>
                </div>
              )}
              {summaryModal.summary.who && (
                <div>
                  <h3 className="text-lg font-bold text-indigo-900 mb-2 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Who can participate?
                  </h3>
                  <p className="text-slate-700 leading-relaxed">{summaryModal.summary.who}</p>
                </div>
              )}
              {summaryModal.summary.what_happens && (
                <div>
                  <h3 className="text-lg font-bold text-indigo-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    What happens in the trial?
                  </h3>
                  <p className="text-slate-700 leading-relaxed">{summaryModal.summary.what_happens}</p>
                </div>
              )}
              {summaryModal.summary.why_matters && (
                <div>
                  <h3 className="text-lg font-bold text-indigo-900 mb-2 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Why does it matter?
                  </h3>
                  <p className="text-slate-700 leading-relaxed">{summaryModal.summary.why_matters}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
              {summaryModal.summary?.summary || summaryModal.summary || "No summary available"}
            </div>
          )}
        </div>
      </Modal>
    </Layout>
  );
}
