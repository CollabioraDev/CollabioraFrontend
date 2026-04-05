"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, LogIn, ArrowRight, Loader2 } from "lucide-react";
import {
  getLocalRemainingSearches,
  setLocalSearchCount,
  resetLocalSearchCount,
  MAX_FREE_SEARCHES,
} from "../utils/searchLimit.js";
import { GUEST_BROWSE_MODE_ENABLED } from "../utils/guestBrowseMode.js";
import apiFetch from "../utils/api.js";

const FREE_SEARCHES_POPUP_KEY = "free_searches_popup_shown";

export default function FreeSearchesIndicator({ user, onSearch, centered = false }) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname || "";
  const isDiscoveryPage =
    path === "/explore" ||
    path.startsWith("/explore/") ||
    path === "/publications" ||
    path.startsWith("/publications") ||
    path === "/library" ||
    path.startsWith("/library") ||
    path === "/trials" ||
    path.startsWith("/trials") ||
    path === "/experts" ||
    path.startsWith("/experts");
  const localRemaining = getLocalRemainingSearches();
  const [freeSearches, setFreeSearches] = useState(localRemaining);
  const [loadingSearches, setLoadingSearches] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (user) {
      resetLocalSearchCount();
      setShowPopup(false);
      setFreeSearches(null);
      return;
    }

    if (GUEST_BROWSE_MODE_ENABLED) {
      resetLocalSearchCount();
      setFreeSearches(null);
      setLoadingSearches(false);
      return;
    }

    let cancelled = false;
    setLoadingSearches(true);

    (async () => {
      try {
        const response = await apiFetch("/api/search/remaining");
        if (cancelled) return;
        if (response?.ok) {
          const data = await response.json();
          if (data.unlimited) {
            setFreeSearches(null);
          } else {
            const remaining = data.remaining ?? MAX_FREE_SEARCHES;
            setFreeSearches(remaining);
            setLocalSearchCount(MAX_FREE_SEARCHES - remaining);
          }
        } else {
          setFreeSearches(getLocalRemainingSearches());
        }
      } catch (e) {
        if (!cancelled) setFreeSearches(getLocalRemainingSearches());
      } finally {
        if (!cancelled) setLoadingSearches(false);
      }
    })();

    const popupShown = localStorage.getItem(FREE_SEARCHES_POPUP_KEY);
    if (!popupShown && !isDiscoveryPage) {
      setShowPopup(true);
      localStorage.setItem(FREE_SEARCHES_POPUP_KEY, "true");
    }

    // Listen for custom event for same-tab updates (only update when search is made)
    const handleFreeSearchUsed = (event) => {
      if (GUEST_BROWSE_MODE_ENABLED) {
        setFreeSearches(null);
        return;
      }
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
      cancelled = true;
      window.removeEventListener("freeSearchUsed", handleFreeSearchUsed);
    };
  }, [user]);

  useEffect(() => {
    const handleLogin = async () => {
      setShowPopup(false);
      const userData = JSON.parse(localStorage.getItem("user") || "null");
      const token = localStorage.getItem("token");
      if (userData && token) {
        resetLocalSearchCount();
        setFreeSearches(null);
        setLoadingSearches(false);
      } else if (GUEST_BROWSE_MODE_ENABLED) {
        setFreeSearches(null);
      } else {
        try {
          const response = await apiFetch("/api/search/remaining");
          if (response?.ok) {
            const data = await response.json();
            const remaining = data.remaining ?? MAX_FREE_SEARCHES;
            setFreeSearches(remaining);
            setLocalSearchCount(MAX_FREE_SEARCHES - remaining);
          } else {
            setFreeSearches(getLocalRemainingSearches());
          }
        } catch (e) {
          setFreeSearches(getLocalRemainingSearches());
        }
      }
    };

    window.addEventListener("login", handleLogin);
    return () => window.removeEventListener("login", handleLogin);
  }, []);

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  if (user) {
    return null; // Don't show for signed-in users
  }

  if (GUEST_BROWSE_MODE_ENABLED) {
    return null; // Guest browse: unlimited searches, no count / "Unlimited" pill
  }

  return (
    <>
      {/* Persistent Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={centered ? "relative z-40" : "fixed top-24 right-4 z-40 sm:right-6"}
      >
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 shadow-lg backdrop-blur-sm"
          style={{
            backgroundColor: "rgba(245, 242, 248, 0.95)",
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
                {t("freeSearches.loading")}
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 shrink-0" style={{ color: "#2F3C96" }} />
              <span
                className="text-sm font-semibold"
                style={{ color: "#2F3C96" }}
              >
                {freeSearches !== null ? (
                  t(
                    freeSearches === 1
                      ? "freeSearches.remainingOne"
                      : "freeSearches.remainingMany",
                    { count: freeSearches },
                  )
                ) : (
                  t("freeSearches.unlimited")
                )}
              </span>
            </>
          )}
        </div>
      </motion.div>

      {/* Popup Modal - never show on Explore, Publications, Trials, or Experts */}
      <AnimatePresence>
        {showPopup && !isDiscoveryPage && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClosePopup}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            {/* Popup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
            >
              <div
                className="rounded-2xl p-6 border-2 shadow-2xl"
                style={{
                  backgroundColor: "#FFFFFF",
                  borderColor: "#D0C4E2",
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: "#F5F2F8" }}
                    >
                      <Sparkles
                        className="w-5 h-5"
                        style={{ color: "#2F3C96" }}
                      />
                    </div>
                    <div>
                      <h3
                        className="text-xl font-bold"
                        style={{ color: "#2F3C96" }}
                      >
                        {t("freeSearches.popupTitle")}
                      </h3>
                      <p className="text-sm mt-1" style={{ color: "#787878" }}>
                        {loadingSearches ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {t("freeSearches.popupLoading")}
                          </span>
                        ) : freeSearches !== null ? (
                          t("freeSearches.popupCount", { count: freeSearches })
                        ) : (
                          t("freeSearches.unlimited")
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClosePopup}
                    className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                    style={{ color: "#787878" }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p
                  className="text-sm mb-4 leading-relaxed"
                  style={{ color: "#787878" }}
                >
                  {t("freeSearches.popupBody")}
                </p>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClosePopup}
                    className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm border-2 transition-all"
                    style={{
                      backgroundColor: "#F5F2F8",
                      borderColor: "#D0C4E2",
                      color: "#2F3C96",
                    }}
                  >
                    {t("freeSearches.startExploring")}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      handleClosePopup();
                      navigate("/signin");
                    }}
                    className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 text-white transition-all"
                    style={{
                      background: `linear-gradient(to right, #2F3C96, #474F97)`,
                    }}
                  >
                    {t("freeSearches.signIn")}
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Export function to check and get remaining free searches
export function useFreeSearches() {
  const [freeSearches, setFreeSearches] = useState(() => {
    if (GUEST_BROWSE_MODE_ENABLED) {
      return null;
    }
    return getLocalRemainingSearches();
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const token = localStorage.getItem("token");

    // Signed-in users have unlimited searches
    if (user && token) {
      resetLocalSearchCount();
      setFreeSearches(null);
      return;
    }

    if (GUEST_BROWSE_MODE_ENABLED) {
      resetLocalSearchCount();
      setFreeSearches(null);
      return;
    }

    const updateFreeSearches = async (event) => {
      if (GUEST_BROWSE_MODE_ENABLED) {
        setFreeSearches(null);
        return;
      }
      if (event && event.detail && event.detail.remaining !== undefined) {
        const remaining = event.detail.remaining;
        setFreeSearches(remaining);
        setLocalSearchCount(MAX_FREE_SEARCHES - remaining);
        return;
      }
      setFreeSearches(getLocalRemainingSearches());
    };

    // Initial load from local storage
    updateFreeSearches();

    // Listen for updates
    window.addEventListener("freeSearchUsed", updateFreeSearches);
    return () => {
      window.removeEventListener("freeSearchUsed", updateFreeSearches);
    };
  }, []);

  const checkAndUseSearch = async () => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const token = localStorage.getItem("token");

    // Signed-in users can search freely
    if (user && token) {
      return true;
    }

    if (GUEST_BROWSE_MODE_ENABLED) {
      return true;
    }

    // Check local first (fast), backend enforces
    const localRemaining = getLocalRemainingSearches();
    if (localRemaining <= 0) return false;
    try {
      const response = await apiFetch("/api/search/remaining");
      if (response?.ok) {
        const data = await response.json();
        if (data.unlimited) return true;
        return (data.remaining ?? 0) > 0;
      }
    } catch (e) {
      /* fallback to local */
    }
    return localRemaining > 0;
  };

  const getRemainingSearches = async () => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const token = localStorage.getItem("token");

    // Signed-in users have unlimited searches
    if (user && token) {
      return null;
    }

    if (GUEST_BROWSE_MODE_ENABLED) {
      return null;
    }

    // Return local value only (no background sync/polling)
    return getLocalRemainingSearches();
  };

  return { freeSearches, checkAndUseSearch, getRemainingSearches };
}
