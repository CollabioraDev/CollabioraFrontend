import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  Heart,
  Sparkles,
  Mail,
  Beaker,
  MapPin,
  Calendar,
  Send,
  CheckCircle,
  User,
  ListChecks,
  Info,
  ExternalLink,
  TrendingUp,
  Activity,
  Users,
  FileText,
  Loader2,
  Phone,
  Copy,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  X,
} from "lucide-react";
import Layout from "../../components/Layout.jsx";
import PageTutorial, {
  useTutorialCompleted,
  resetTutorialCompleted,
} from "../../components/PageTutorial.jsx";
import LocationInput from "../../components/LocationInput.jsx";
import Tooltip from "./TrialsTooltip.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import SmartSearchInput from "../../components/SmartSearchInput.jsx";
import CustomSelect from "../../components/ui/CustomSelect.jsx";
import { BorderBeam } from "@/components/ui/border-beam";
import AnimatedBackground from "../../components/ui/AnimatedBackground.jsx";
import { AuroraText } from "@/components/ui/aurora-text";
import FreeSearchesIndicator, {
  useFreeSearches,
} from "../../components/FreeSearchesIndicator.jsx";
import { autoCorrectQuery } from "../../utils/spellCorrection.js";
import apiFetch from "../../utils/api.js";
import {
  appendLocaleToSearchParams,
  getApiLocale,
} from "../../i18n/getApiLocale.js";
import { useTranslation } from "react-i18next";
import { parseEligibilityCriteria } from "../../utils/parseEligibilityCriteria.js";
import {
  getLocalRemainingSearches,
  setLocalSearchCount,
  MAX_FREE_SEARCHES,
} from "../../utils/searchLimit.js";
import { loadTutorialSampleTrials } from "../../utils/tutorialSampleData.js";
import {
  GUEST_BROWSE_MODE_ENABLED,
  PUBLICATIONS_AND_TRIALS_PAGE_SIZE,
} from "../../utils/guestBrowseMode.js";
import { recordTrialEngagement } from "../../utils/productAnalytics.js";
import { useNlmClinicalSuggestions } from "../../hooks/useNlmClinicalSuggestions.js";

/** Same pattern as ContactUs.jsx — opens Gmail compose in a new tab with prefilled fields. */
function buildGmailComposeUrl(toEmails, subject, body) {
  const to = encodeURIComponent(toEmails.filter(Boolean).join(","));
  return (
    "https://mail.google.com/mail/?view=cm&fs=1&to=" +
    to +
    "&su=" +
    encodeURIComponent(subject) +
    "&body=" +
    encodeURIComponent(body)
  );
}

/** Emails from trial contacts and site locations (e.g. collabiora / curated trials). */
function collectTrialContactEmails(trial) {
  if (!trial) return [];
  const out = [];
  const seen = new Set();
  for (const c of trial.contacts || []) {
    const e = typeof c?.email === "string" ? c.email.trim() : "";
    if (e && !seen.has(e.toLowerCase())) {
      seen.add(e.toLowerCase());
      out.push(e);
    }
  }
  for (const loc of trial.locations || []) {
    const e =
      typeof loc?.contactEmail === "string" ? loc.contactEmail.trim() : "";
    if (e && !seen.has(e.toLowerCase())) {
      seen.add(e.toLowerCase());
      out.push(e);
    }
  }
  return out;
}

export default function Trials() {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("RECRUITING"); // Default to RECRUITING
  const [location, setLocation] = useState("");
  const [locationMode, setLocationMode] = useState("global"); // "current", "global", "custom"
  const [userLocation, setUserLocation] = useState(null);
  const [useMedicalInterest, setUseMedicalInterest] = useState(() => {
    // Load from localStorage, default to false if not set
    const saved = localStorage.getItem("useMedicalInterest");
    return saved !== null ? JSON.parse(saved) : false;
  }); // Toggle for using medical interest (backward compatibility)
  const [userMedicalInterest, setUserMedicalInterest] = useState(""); // User's medical interest (combined string for backward compatibility)
  const [userMedicalInterests, setUserMedicalInterests] = useState([]); // All user's medical interests as array
  const [enabledMedicalInterests, setEnabledMedicalInterests] = useState(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem("enabledMedicalInterests");
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch (e) {
        /* ignore parse errors */
      }
    }
    return new Set();
  }); // Set of enabled medical interests
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Track if it's the initial load
  const [isSignedIn, setIsSignedIn] = useState(false); // Track if user is signed in
  const [user, setUser] = useState(null); // Track user state
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false); // Start with loading false - no initial search
  const [favorites, setFavorites] = useState([]);
  const [favoritingItems, setFavoritingItems] = useState(new Set()); // Track items being favorited/unfavorited
  const { checkAndUseSearch, getRemainingSearches } = useFreeSearches();
  const [userProfile, setUserProfile] = useState(null); // Track user profile
  /** Signed-in researchers see technical titles; everyone else uses patient-style (incl. guests when browse mode is on). */
  const researcherTitleMode = Boolean(
    isSignedIn && userProfile?.researcher !== undefined,
  );
  const [summaryModal, setSummaryModal] = useState({
    open: false,
    title: "",
    type: "",
    summary: "",
    loading: false,
  });
  const [summaryTrial, setSummaryTrial] = useState(null);
  const [hasSimplifiedFurther, setHasSimplifiedFurther] = useState(false);
  const [detailsModal, setDetailsModal] = useState({
    open: false,
    trial: null,
    loading: false,
    generatedMessage: "",
    generating: false,
    copied: false,
  });
  const [contactModal, setContactModal] = useState({
    open: false,
    trial: null,
    message: "",
    sent: false,
    generating: false,
  });
  const [contactInfoModal, setContactInfoModal] = useState({
    open: false,
    trial: null,
    loading: false,
    generatedMessage: "",
    generating: false,
    copied: false,
  });
  const [contactStepsModal, setContactStepsModal] = useState({
    open: false,
    trial: null,
    currentStep: 1,
    generatedEmail: "",
    generating: false,
    copied: false,
  });
  const [simplifyTitles, setSimplifyTitles] = useState(false); // Researcher option: simplify titles like patient view (default off)
  const [simplifiedTrialSummaries, setSimplifiedTrialSummaries] = useState(
    new Map(),
  ); // Cache of simplified trial titles
  const [claimingPi, setClaimingPi] = useState(false);

  // Helper function to sort trials by match percentage (highest first)
  const sortTrialsByMatch = (trials) => {
    return [...trials].sort((a, b) => {
      const aMatch = a.matchPercentage ?? -1;
      const bMatch = b.matchPercentage ?? -1;
      return bMatch - aMatch; // Descending order (highest first)
    });
  };

  // Detect "latest/recent/new treatments/studies" → auto last 6 months + sort by date; clean query so relevance filter doesn't require "2026"/"new"
  const detectLatestOrRecentSearch = (query) => {
    if (!query || typeof query !== "string")
      return { useRecent: false, cleanedQuery: query };
    const lower = query.toLowerCase().trim();
    const latestPatterns = [
      /\b(new|latest|recent)\s+(treatments?|studies|trials?|therapy|therapies)\b/,
      /\b(treatments?|studies|trials?)\s+(in|for)\s+.+\s+(new|latest|recent)\b/,
      /\b(new|latest|recent)\s+.+\s+(treatments?|studies|trials?)\b/,
      /\b(202[4-9]|20[3-9][0-9])\b/,
    ];
    const hasLatest = latestPatterns.some((re) => re.test(lower));
    if (!hasLatest) return { useRecent: false, cleanedQuery: query };
    let cleaned = query
      .replace(/\b(202[4-9]|20[3-9][0-9])\b/gi, "")
      .replace(
        /\b(new|latest|recent)\s+(treatments?|studies|trials?|therapy|therapies)\b/gi,
        "$2",
      )
      .replace(
        /\b(treatments?|studies|trials?|therapy|therapies)\s+(in|for)\s+(.+?)\s+(new|latest|recent)\b/gi,
        "$3",
      )
      .replace(
        /\b(new|latest|recent)\s+(.+?)\s+(treatments?|studies|trials?|therapy|therapies)\b/gi,
        "$2",
      )
      .replace(/\s+/g, " ")
      .trim();
    return { useRecent: true, cleanedQuery: cleaned || query };
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [lastSearchQuery, setLastSearchQuery] = useState(""); // Track last search query for pagination
  const [lastSearchParams, setLastSearchParams] = useState({}); // Store all search parameters for pagination

  // Search keywords state (chips/tags)
  const [searchKeywords, setSearchKeywords] = useState([]); // Keywords as chips below search bar

  // Advanced search state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [eligibilitySex, setEligibilitySex] = useState("All"); // "All", "Female", "Male"
  const [eligibilityAge, setEligibilityAge] = useState(""); // "Child", "Adult", "Older adult", or custom range
  const [ageRange, setAgeRange] = useState({ min: "", max: "" }); // For manual age range
  const [phase, setPhase] = useState(""); // Phase filter: "PHASE1", "PHASE2", "PHASE3", "PHASE4", or ""
  const [institution, setInstitution] = useState("");
  const [otherTerms, setOtherTerms] = useState(""); // Other search terms
  const [intervention, setIntervention] = useState(""); // Intervention/treatment

  const tutorialCompleted = useTutorialCompleted("trials");
  const [forceTutorial, setForceTutorial] = useState(false);
  const showTutorial = !tutorialCompleted || forceTutorial;
  const [tutorialSampleResults, setTutorialSampleResults] = useState([]);
  const [tutorialSampleLoading, setTutorialSampleLoading] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const SEARCH_BUTTON_STEP = 3;
  const RESULTS_STEP = 4;
  const hasScrolledToResultsRef = useRef(false);

  useEffect(() => {
    if (showTutorial) hasScrolledToResultsRef.current = false;
  }, [showTutorial]);

  const scrollToResultsOnce = useCallback(() => {
    if (hasScrolledToResultsRef.current) return;
    hasScrolledToResultsRef.current = true;
    const el = document.querySelector("[data-tour='trials-results-area']");
    if (el) window.scrollBy({ top: 200, behavior: "smooth" });
    else window.scrollBy({ top: 200, behavior: "smooth" });
  }, []);

  const handleTutorialStepChange = useCallback(
    (stepIndex) => {
      setTutorialStep(stepIndex);
      if (stepIndex === 2) {
        setSearchKeywords((prev) =>
          prev.length === 0 ? ["hypertension"] : prev,
        );
      }
      if (stepIndex === RESULTS_STEP) {
        if (tutorialSampleResults.length === 0) {
          setTutorialSampleLoading(true);
          loadTutorialSampleTrials()
            .then((sample) => {
              if (sample && sample.length > 0) {
                setTutorialSampleResults(sample);
                requestAnimationFrame(() => {
                  setTimeout(() => scrollToResultsOnce(), 150);
                });
              }
            })
            .finally(() => setTutorialSampleLoading(false));
        } else {
          requestAnimationFrame(() => scrollToResultsOnce());
        }
      }
    },
    [tutorialSampleResults.length, scrollToResultsOnce],
  );

  const quickFilters = useMemo(
    () => [
      {
        labelEn: "Recruiting",
        value: "RECRUITING",
        icon: "👥",
      },
      { labelEn: "Phase 3", value: "PHASE3", icon: "🔬" },
      { labelEn: "Cancer", value: "cancer", icon: "🩺" },
      { labelEn: "Diabetes", value: "diabetes", icon: "💊" },
      { labelEn: "Cardiology", value: "cardiology", icon: "❤️" },
      { labelEn: "Neurology", value: "neurology", icon: "🧠" },
    ],
    [],
  );

  const trialSuggestionTerms = useMemo(
    () =>
      [
        ...quickFilters.map((filter) => filter.labelEn),
        ...quickFilters.map((filter) => filter.value),
        userMedicalInterest,
      ].filter(Boolean),
    [quickFilters, userMedicalInterest],
  );

  const trialsNlm = useNlmClinicalSuggestions(q, {
    includeProcedures: true,
  });

  const statusOptionsList = [
    "RECRUITING",
    "NOT_YET_RECRUITING",
    "ACTIVE_NOT_RECRUITING",
    "COMPLETED",
    "SUSPENDED",
    "TERMINATED",
    "WITHDRAWN",
  ];

  // Convert to format for CustomSelect
  const statusOptions = useMemo(
    () => [
      { value: "", label: t("trials.allStatuses") },
      ...statusOptionsList.map((st) => ({
        value: st,
        label: t(`trials.statusLabels.${st}`, {
          defaultValue: st.replace(/_/g, " "),
        }),
      })),
    ],
    [t, i18n.language],
  );

  const INSTITUTION_UCLA = "University of California, Los Angeles";
  const institutionOptions = useMemo(
    () => [
      { value: "", label: t("trials.allInstitutions") },
      { value: INSTITUTION_UCLA, label: INSTITUTION_UCLA },
    ],
    [t, i18n.language],
  );

  /** Tracks prior institution for proactive UCLA search; synced in effect below. */
  const prevInstitutionRef = useRef("");
  /** Skip one auto-search when UCLA is rehydrated from session (not a user toggle). */
  const suppressUclaAutoSearchFromSessionRef = useRef(false);

  // Keyword chips management functions
  const addKeyword = (keyword) => {
    // Auto-correct the keyword before adding
    const correctedKeyword = autoCorrectQuery(
      keyword.trim(),
      trialSuggestionTerms,
    );
    const trimmedKeyword = correctedKeyword.trim();
    if (trimmedKeyword && !searchKeywords.includes(trimmedKeyword)) {
      setSearchKeywords([...searchKeywords, trimmedKeyword]);
      setQ(""); // Clear the input after adding
      // Show a toast if correction was made
      if (correctedKeyword.toLowerCase() !== keyword.trim().toLowerCase()) {
        toast.success(
          t("trials.correctedTo", {
            from: keyword.trim(),
            to: correctedKeyword,
          }),
          { duration: 2000 },
        );
      }
    }
  };

  const removeKeyword = (keywordToRemove) => {
    setSearchKeywords(searchKeywords.filter((k) => k !== keywordToRemove));
  };

  // Remove a medical interest
  const removeMedicalInterest = (interestToRemove) => {
    const updated = userMedicalInterests.filter(
      (interest) => interest !== interestToRemove,
    );
    setUserMedicalInterests(updated);
    // Remove from enabled set
    setEnabledMedicalInterests((prev) => {
      const newSet = new Set(prev);
      newSet.delete(interestToRemove);
      return newSet;
    });
    // Update combined string
    setUserMedicalInterest(updated.join(" "));
  };

  // Toggle individual medical interest
  const toggleMedicalInterest = (interest) => {
    setEnabledMedicalInterests((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(interest)) {
        newSet.delete(interest);
      } else {
        newSet.add(interest);
      }
      // Update combined string with only enabled interests
      const enabledArray = Array.from(newSet);
      setUserMedicalInterest(enabledArray.join(" "));
      return newSet;
    });
  };

  // Save medical interest state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(
      "useMedicalInterest",
      JSON.stringify(useMedicalInterest),
    );
  }, [useMedicalInterest]);

  useEffect(() => {
    localStorage.setItem(
      "enabledMedicalInterests",
      JSON.stringify(Array.from(enabledMedicalInterests)),
    );
  }, [enabledMedicalInterests]);

  const clearAllKeywords = () => {
    setSearchKeywords([]);
    setQ("");
  };

  // Get active advanced filters
  const getActiveAdvancedFilters = () => {
    const filters = [];
    const sexLabel = (s) =>
      s === "Female"
        ? t("trials.sexFemale")
        : s === "Male"
          ? t("trials.sexMale")
          : s;
    const agePresetLabel = (a) =>
      a === "Child"
        ? t("trials.ageChild")
        : a === "Adult"
          ? t("trials.ageAdult")
          : a === "Older adult"
            ? t("trials.ageOlder")
            : a;
    if (eligibilitySex && eligibilitySex !== "All") {
      filters.push({ label: sexLabel(eligibilitySex), key: "sex" });
    }
    if (eligibilityAge) {
      if (eligibilityAge === "custom" && (ageRange.min || ageRange.max)) {
        filters.push({
          label: `${ageRange.min || "?"}-${ageRange.max || "?"} years`,
          key: "age",
        });
      } else if (eligibilityAge !== "custom") {
        filters.push({
          label: agePresetLabel(eligibilityAge),
          key: "age",
        });
      }
    }
    if (phase) {
      const phaseLabels = {
        PHASE1: t("trials.phase1"),
        PHASE2: t("trials.phase2"),
        PHASE3: t("trials.phase3"),
        PHASE4: t("trials.phase4"),
      };
      filters.push({
        label: phaseLabels[phase] || phase,
        key: "phase",
      });
    }
    if (otherTerms && otherTerms.trim()) {
      filters.push({ label: otherTerms, key: "otherTerms" });
    }
    if (intervention && intervention.trim()) {
      filters.push({
        label: intervention,
        key: "intervention",
      });
    }
    return filters;
  };

  // Clear all advanced filters
  const clearAllAdvancedFilters = () => {
    setEligibilitySex("All");
    setEligibilityAge("");
    setAgeRange({ min: "", max: "" });
    setPhase("");
    setInstitution("");
    setOtherTerms("");
    setIntervention("");
  };

  // Trigger search (keywords are optional). Pass `typedLine` from Enter in SmartSearchInput.
  const handleSearch = (typedLine) => {
    const line =
      typeof typedLine === "string" ? typedLine : (q ?? "");

    let currentKeywords = [...searchKeywords];
    if (line.trim() && !currentKeywords.includes(line.trim())) {
      currentKeywords = [...currentKeywords, line.trim()];
      setSearchKeywords(currentKeywords);
      setQ(""); // Clear search bar after adding to keywords
    }

    const combinedQuery =
      currentKeywords.length > 0 ? currentKeywords.join(" ") : line.trim();
    setSearchKeywords(currentKeywords);
    search(combinedQuery);
  };

  async function search(overrideQuery) {
    if (showTutorial && tutorialStep === SEARCH_BUTTON_STEP) return;
    setTutorialSampleResults([]); // Clear tutorial sample when running real search
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token");
    const isUserSignedIn = userData && token;

    const appliedQuery = typeof overrideQuery === "string" ? overrideQuery : q;

    // For manual searches, combine enabled medical interests with search query.
    // Exception: if this is an institution-only search (no typed terms), do not
    // auto-inject interests since that can over-constrain backend relevance filters.
    let searchQuery = appliedQuery.trim();
    const enabledInterests = Array.from(enabledMedicalInterests).join(" ");
    const hasUserTypedTerms =
      !!searchQuery || !!otherTerms.trim() || !!intervention.trim();
    const institutionStr = (institution || "").trim();
    const isUclaInstitution =
      /ucla/i.test(institutionStr) ||
      /university of california,?\s*los angeles/i.test(institutionStr);
    const shouldInjectEnabledInterests =
      hasUserTypedTerms || !institutionStr || isUclaInstitution;
    if (enabledInterests && searchQuery && shouldInjectEnabledInterests) {
      // Combine enabled interests with search query
      searchQuery = `${enabledInterests} ${searchQuery}`;
    } else if (
      enabledInterests &&
      !searchQuery &&
      shouldInjectEnabledInterests
    ) {
      // If no search query but medical interests are enabled, use just the enabled interests
      searchQuery = enabledInterests;
    }

    // Combine search query with advanced filters
    let finalQuery = searchQuery;

    // Add other terms if provided
    if (otherTerms.trim()) {
      finalQuery = finalQuery
        ? `${finalQuery} ${otherTerms.trim()}`
        : otherTerms.trim();
    }

    // Add intervention if provided
    if (intervention.trim()) {
      finalQuery = finalQuery
        ? `${finalQuery} ${intervention.trim()}`
        : intervention.trim();
    }

    const { useRecent, cleanedQuery } = detectLatestOrRecentSearch(finalQuery);
    const queryForApi = useRecent && cleanedQuery ? cleanedQuery : finalQuery;

    if (!String(queryForApi || "").trim() && !institutionStr) {
      toast.error(t("trials.enterSearchTerms"), { duration: 4000 });
      return;
    }

    // Check free searches for non-signed-in users (pre-check)
    if (!isUserSignedIn) {
      const canSearch = await checkAndUseSearch();
      if (!canSearch) {
        toast.error(
          t("toasts.searchLimitSignIn"),
          { duration: 4000 },
        );
        return;
      }
    }

    setLoading(true);
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const params = new URLSearchParams();
    const user = userData;

    // Mark that initial load is complete when user performs search
    if (isInitialLoad) {
      setIsInitialLoad(false);
    }

    if (queryForApi) params.set("q", queryForApi);
    if (status) params.set("status", status);
    if (useRecent) {
      params.set("recentMonths", "6");
      params.set("sortByDate", "true");
    }

    // Add phase filter
    if (phase) {
      params.set("phase", phase);
    }
    if (institution) {
      params.set("institution", institution);
    }

    // Add advanced eligibility filters
    if (eligibilitySex && eligibilitySex !== "All") {
      params.set("eligibilitySex", eligibilitySex);
    }

    if (eligibilityAge) {
      if (eligibilityAge === "Child") {
        params.set("eligibilityAgeMin", "0");
        params.set("eligibilityAgeMax", "17");
      } else if (eligibilityAge === "Adult") {
        params.set("eligibilityAgeMin", "18");
        params.set("eligibilityAgeMax", "64");
      } else if (eligibilityAge === "Older adult") {
        params.set("eligibilityAgeMin", "65");
      } else if (eligibilityAge === "custom") {
        // Use manual age range
        if (ageRange.min) params.set("eligibilityAgeMin", ageRange.min);
        if (ageRange.max) params.set("eligibilityAgeMax", ageRange.max);
      }
    }

    // Reset pagination for new searches
    params.set("page", "1");
    params.set("pageSize", String(PUBLICATIONS_AND_TRIALS_PAGE_SIZE));
    setCurrentPage(1);
    setLastSearchQuery(finalQuery);

    // Store search parameters for pagination (including searchKeywords to keep them separate)
    setLastSearchParams({
      finalQuery,
      searchKeywords: searchKeywords, // Store keywords array separately
      status,
      phase,
      institution,
      eligibilitySex,
      eligibilityAge,
      ageRange,
      locationMode,
      location,
      userLocation,
      useMedicalInterest,
      userMedicalInterest,
      user,
      recentMonths: useRecent ? 6 : undefined,
      sortByDate: useRecent || undefined,
    });

    // Add location parameter (use only country)
    if (locationMode === "current" && userLocation) {
      // Use only country for location filtering
      if (userLocation.country) {
        params.set("location", userLocation.country);
      }
    } else if (locationMode === "custom" && location.trim()) {
      // For custom location, use as-is (user can enter country)
      params.set("location", location.trim());
    }
    // "global" mode doesn't send location parameter

    // Add user profile data for matching (only with a valid session)
    if (isUserSignedIn && (user?._id || user?.id)) {
      params.set("userId", user._id || user.id);
    } else {
      // Send conditions/keywords ONLY from enabled medical interests (not all interests)
      // This ensures that if medical interests are not selected, they're not included
      const enabledInterests = Array.from(enabledMedicalInterests).join(" ");
      if (enabledInterests && enabledInterests.trim()) {
        // Only send if there are actually enabled interests
        params.set("conditions", enabledInterests.trim());
      }
      // Send location if available
      if (locationMode === "current" && userLocation) {
        params.set("userLocation", JSON.stringify(userLocation));
      } else if (locationMode === "custom" && location.trim()) {
        params.set(
          "userLocation",
          JSON.stringify({ country: location.trim() }),
        );
      }
    }

    appendLocaleToSearchParams(params);

    try {
      const response = await apiFetch(
        `/api/search/trials?${params.toString()}`,
      );

      // Handle case where apiFetch returns undefined (401 redirect)
      if (!response) {
        setLoading(false);
        return;
      }

      // Handle rate limit (429) - rare now that we use local storage
      if (response.status === 429) {
        const errorData = await response.json();
        toast.error(
          errorData.error ||
            t("toasts.searchLimitShort"),
          { duration: 4000 },
        );
        setLoading(false);
        const remaining = getLocalRemainingSearches();
        window.dispatchEvent(
          new CustomEvent("freeSearchUsed", { detail: { remaining } }),
        );
        return;
      }

      const data = await response.json();
      const searchResults = data.results || [];

      // Set pagination data
      setTotalCount(data.totalCount || 0);
      const calculatedTotalPages = Math.ceil(
        (data.totalCount || 0) / PUBLICATIONS_AND_TRIALS_PAGE_SIZE,
      );
      setTotalPages(calculatedTotalPages);

      // Sort by matchPercentage in descending order (highest first)
      const sortedResults = sortTrialsByMatch(searchResults);
      setResults(sortedResults);

      // Guest: sync with backend response (skip UI when guest browse experiment = unlimited)
      if (
        !GUEST_BROWSE_MODE_ENABLED &&
        !isUserSignedIn &&
        data.remaining !== undefined
      ) {
        const remaining = data.remaining;
        setLocalSearchCount(MAX_FREE_SEARCHES - remaining);

        if (remaining === 0) {
          toast(
            t("toasts.searchLimitSignInUnlimited"),
            { duration: 5000, icon: "🔒" },
          );
        } else {
          toast.success(
            t("trials.guestSearchSuccess", { count: remaining }),
            { duration: 3000 },
          );
        }
        window.dispatchEvent(
          new CustomEvent("freeSearchUsed", { detail: { remaining } }),
        );
      }

      // Save search state to sessionStorage (including pagination)
      // Keep search bar empty and keywords as separate chips
      const searchState = {
        q: "", // Keep search bar empty - keywords are stored separately in searchKeywords
        searchKeywords: searchKeywords, // Save keywords array separately
        status,
        location,
        locationMode,
        institution,
        useMedicalInterest,
        userMedicalInterest,
        results: sortedResults,
        currentPage: 1,
        totalPages: calculatedTotalPages,
        totalCount: data.totalCount || 0,
        lastSearchParams: {
          finalQuery,
          searchKeywords: searchKeywords, // Include keywords in lastSearchParams
          status,
          phase,
          institution,
          eligibilitySex,
          eligibilityAge,
          ageRange,
          locationMode,
          location,
          userLocation,
          useMedicalInterest,
          userMedicalInterest,
          user,
          recentMonths: useRecent ? 6 : undefined,
          sortByDate: useRecent || undefined,
        },
        isInitialLoad: false,
      };
      sessionStorage.setItem(
        "trials_search_state",
        JSON.stringify(searchState),
      );
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  // Selecting UCLA after "All institutions" runs search immediately (loading via search()).
  useEffect(() => {
    if (suppressUclaAutoSearchFromSessionRef.current) {
      if (institution === INSTITUTION_UCLA) {
        suppressUclaAutoSearchFromSessionRef.current = false;
        prevInstitutionRef.current = institution;
        return;
      }
      // Restore wrote UCLA but state not updated yet — wait for next run.
      return;
    }
    const prev = prevInstitutionRef.current;
    prevInstitutionRef.current = institution;
    if (institution === INSTITUTION_UCLA && prev === "") {
      void search();
    }
    // search() closes over latest filters; institution is already updated this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only react to institution
  }, [institution]);

  // Navigate to specific page (server-side pagination)
  async function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage || loading)
      return;

    setLoading(true);
    setCurrentPage(page);

    const params = new URLSearchParams();
    const {
      finalQuery: savedQuery,
      searchKeywords: savedSearchKeywords, // Get saved keywords array
      status: savedStatus,
      phase: savedPhase,
      institution: savedInstitution,
      eligibilitySex: savedEligibilitySex,
      eligibilityAge: savedEligibilityAge,
      ageRange: savedAgeRange,
      locationMode: savedLocationMode,
      location: savedLocation,
      userLocation: savedUserLocation,
      useMedicalInterest: savedUseMedicalInterest,
      userMedicalInterest: savedUserMedicalInterest,
      user: savedUser,
      recentMonths: savedRecentMonths,
      sortByDate: savedSortByDate,
    } = lastSearchParams;

    // Use saved keywords array if available, otherwise reconstruct from saved query
    // This ensures keywords stay separate and don't appear as one combined string
    let queryToUse = "";
    if (
      savedSearchKeywords &&
      Array.isArray(savedSearchKeywords) &&
      savedSearchKeywords.length > 0
    ) {
      // Use the saved keywords array - reconstruct query from keywords
      queryToUse = savedSearchKeywords.join(" ");
      // Restore searchKeywords state so chips display correctly
      setSearchKeywords(savedSearchKeywords);
      setQ(""); // Clear the search bar input
    } else {
      // Fallback to saved query string (for backward compatibility)
      queryToUse = savedQuery || lastSearchQuery || "";
      // IMPORTANT: Don't split the query by spaces - keep it as-is
      // If searchKeywords wasn't saved, we can't reliably reconstruct it
      // Just use the combined query for the API call but keep search bar empty
      if (queryToUse) {
        // Keep search bar empty - we don't have the original keyword structure
        setQ("");
        // Don't try to split - we can't know where one multi-word keyword ends and another begins
        // The user will need to re-enter keywords if they want them as separate chips
        setSearchKeywords([]);
      }
    }

    if (queryToUse) params.set("q", queryToUse);
    if (savedStatus || status) params.set("status", savedStatus || status);

    // Add phase filter
    if (savedPhase || phase) {
      params.set("phase", savedPhase || phase);
    }
    const currentInstitution = savedInstitution || institution;
    if (currentInstitution) {
      params.set("institution", currentInstitution);
    }

    // Add advanced eligibility filters
    const currentEligibilitySex = savedEligibilitySex || eligibilitySex;
    if (currentEligibilitySex && currentEligibilitySex !== "All") {
      params.set("eligibilitySex", currentEligibilitySex);
    }

    const currentEligibilityAge = savedEligibilityAge || eligibilityAge;
    const currentAgeRange = savedAgeRange || ageRange;
    if (currentEligibilityAge) {
      if (currentEligibilityAge === "Child") {
        params.set("eligibilityAgeMin", "0");
        params.set("eligibilityAgeMax", "17");
      } else if (currentEligibilityAge === "Adult") {
        params.set("eligibilityAgeMin", "18");
        params.set("eligibilityAgeMax", "64");
      } else if (currentEligibilityAge === "Older adult") {
        params.set("eligibilityAgeMin", "65");
      } else if (currentEligibilityAge === "custom") {
        if (currentAgeRange?.min)
          params.set("eligibilityAgeMin", currentAgeRange.min);
        if (currentAgeRange?.max)
          params.set("eligibilityAgeMax", currentAgeRange.max);
      }
    }

    params.set("page", String(page));
    params.set("pageSize", String(PUBLICATIONS_AND_TRIALS_PAGE_SIZE));
    if (savedRecentMonths)
      params.set("recentMonths", String(savedRecentMonths));
    if (savedSortByDate) params.set("sortByDate", "true");

    const tokenNow = localStorage.getItem("token");
    const sessionUser = JSON.parse(localStorage.getItem("user") || "{}");
    const isSessionSignedIn = Boolean(sessionUser && tokenNow);

    // Add location parameter
    const currentLocationMode = savedLocationMode || locationMode;
    const currentUserLocation = savedUserLocation || userLocation;
    const currentLocation = savedLocation || location;
    if (currentLocationMode === "current" && currentUserLocation) {
      if (currentUserLocation.country) {
        params.set("location", currentUserLocation.country);
      }
    } else if (currentLocationMode === "custom" && currentLocation?.trim()) {
      params.set("location", currentLocation.trim());
    }

    // Add user profile data for matching (only with a valid session)
    const currentUser = savedUser || user;
    if (
      isSessionSignedIn &&
      (currentUser?._id || currentUser?.id)
    ) {
      params.set("userId", currentUser._id || currentUser.id);
    } else {
      // Use enabled medical interests (from current state or saved state)
      // Get enabled interests from current state if available, otherwise use saved
      const currentEnabledInterests = Array.from(enabledMedicalInterests);
      const enabledInterestsStr =
        currentEnabledInterests.length > 0
          ? currentEnabledInterests.join(" ")
          : savedUserMedicalInterest || userMedicalInterest || "";

      // Only send conditions if there are actually enabled interests
      if (enabledInterestsStr && enabledInterestsStr.trim()) {
        params.set("conditions", enabledInterestsStr.trim());
      }

      if (currentLocationMode === "current" && currentUserLocation) {
        params.set("userLocation", JSON.stringify(currentUserLocation));
      } else if (currentLocationMode === "custom" && currentLocation?.trim()) {
        params.set(
          "userLocation",
          JSON.stringify({ country: currentLocation.trim() }),
        );
      }
    }

    appendLocaleToSearchParams(params);

    try {
      const response = await apiFetch(
        `/api/search/trials?${params.toString()}`,
      );

      if (!response) {
        setLoading(false);
        return;
      }

      if (response.status === 429) {
        const errorData = await response.json();
        toast.error(
          errorData.error ||
            t("toasts.searchLimitSignIn"),
          { duration: 4000 },
        );
        setLoading(false);
        return;
      }

      const data = await response.json();
      const searchResults = data.results || [];

      // Set pagination data
      setTotalCount(data.totalCount || 0);
      const calculatedTotalPages = Math.ceil(
        (data.totalCount || 0) / PUBLICATIONS_AND_TRIALS_PAGE_SIZE,
      );
      setTotalPages(calculatedTotalPages);

      // Sort by matchPercentage in descending order (highest first)
      const sortedResults = sortTrialsByMatch(searchResults);
      setResults(sortedResults);

      // Save updated state to sessionStorage
      const searchState = {
        q: "", // Keep search bar empty, keywords are in searchKeywords array
        searchKeywords: savedSearchKeywords || searchKeywords || [], // Save keywords array
        status: savedStatus || status || "",
        location: currentLocation || "",
        locationMode: currentLocationMode || "global",
        useMedicalInterest:
          savedUseMedicalInterest || useMedicalInterest || false,
        userMedicalInterest:
          savedUserMedicalInterest || userMedicalInterest || "",
        results: sortedResults,
        currentPage: page,
        totalPages: calculatedTotalPages,
        totalCount: data.totalCount || 0,
        phase: savedPhase || phase,
        institution: currentInstitution || "",
        eligibilitySex: currentEligibilitySex,
        eligibilityAge: currentEligibilityAge,
        ageRange: currentAgeRange,
        lastSearchParams: {
          finalQuery: queryToUse,
          searchKeywords: savedSearchKeywords || searchKeywords || [], // Include keywords in lastSearchParams
          status: savedStatus || status,
          phase: savedPhase || phase,
          institution: currentInstitution || "",
          eligibilitySex: currentEligibilitySex,
          eligibilityAge: currentEligibilityAge,
          ageRange: currentAgeRange,
          locationMode: currentLocationMode,
          location: currentLocation,
          userLocation: currentUserLocation,
          useMedicalInterest: savedUseMedicalInterest || useMedicalInterest,
          userMedicalInterest: savedUserMedicalInterest || userMedicalInterest,
          user: currentUser,
          recentMonths: savedRecentMonths,
          sortByDate: savedSortByDate,
        },
        isInitialLoad: false,
      };
      sessionStorage.setItem(
        "trials_search_state",
        JSON.stringify(searchState),
      );

      // Scroll to top of results
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Page navigation error:", error);
      toast.error(t("toasts.pageLoadFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function quickSearch(filterValue) {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token");
    const isUserSignedIn = userData && token;

    // Combine enabled medical interests with quick search
    let searchQuery = filterValue;
    const enabledInterests = Array.from(enabledMedicalInterests).join(" ");
    if (enabledInterests) {
      searchQuery = `${enabledInterests} ${filterValue}`;
    }

    const institutionStr = (institution || "").trim();
    if (!String(searchQuery || "").trim() && !institutionStr) {
      toast.error(t("trials.enterSearchTerms"), { duration: 4000 });
      return;
    }

    // Check free searches for non-signed-in users (pre-check)
    if (!isUserSignedIn) {
      const canSearch = await checkAndUseSearch();
      if (!canSearch) {
        toast.error(
          t("toasts.searchLimitSignIn"),
          { duration: 4000 },
        );
        return;
      }
    }

    setQ(filterValue);
    setIsInitialLoad(false); // Mark initial load as complete when user performs quick search
    setLoading(true);
    setTimeout(() => {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const params = new URLSearchParams();
      const user = userData;

      params.set("q", searchQuery);

      // Reset pagination for new searches
      params.set("page", "1");
      params.set("pageSize", String(PUBLICATIONS_AND_TRIALS_PAGE_SIZE));
      setCurrentPage(1);
      setLastSearchQuery(searchQuery);

      // Store search parameters for pagination
      setLastSearchParams({
        finalQuery: searchQuery,
        status,
        phase,
        institution,
        eligibilitySex,
        eligibilityAge,
        ageRange,
        locationMode,
        location,
        userLocation,
        useMedicalInterest,
        userMedicalInterest,
        user,
      });

      // Add location parameter (use only country)
      if (locationMode === "current" && userLocation) {
        // Use only country for location filtering
        if (userLocation.country) {
          params.set("location", userLocation.country);
        }
      } else if (locationMode === "custom" && location.trim()) {
        // For custom location, use as-is (user can enter country)
        params.set("location", location.trim());
      }
      if (institution) {
        params.set("institution", institution);
      }

      // Add user profile data for matching (only with a valid session)
      if (isUserSignedIn && (user?._id || user?.id)) {
        params.set("userId", user._id || user.id);
      } else {
        // Send conditions/keywords from enabled medical interests
        const enabledInterests = Array.from(enabledMedicalInterests).join(" ");
        if (enabledInterests) {
          params.set("conditions", enabledInterests);
        }
        if (locationMode === "current" && userLocation) {
          params.set("userLocation", JSON.stringify(userLocation));
        } else if (locationMode === "custom" && location.trim()) {
          params.set(
            "userLocation",
            JSON.stringify({ country: location.trim() }),
          );
        }
      }

      appendLocaleToSearchParams(params);

      apiFetch(`/api/search/trials?${params.toString()}`)
        .then(async (r) => {
          // Handle case where apiFetch returns undefined (401 redirect)
          if (!r) {
            setLoading(false);
            return;
          }

          // Handle rate limit (429)
          if (r.status === 429) {
            const errorData = await r.json();
            toast.error(
              errorData.error ||
                t("toasts.searchLimitShort"),
              { duration: 4000 },
            );
            setLoading(false);
            const remaining = getLocalRemainingSearches();
            window.dispatchEvent(
              new CustomEvent("freeSearchUsed", { detail: { remaining } }),
            );
            return;
          }
          return r.json();
        })
        .then((data) => {
          if (!data) return; // Skip if rate limited

          const searchResults = data.results || [];

          // Set pagination data
          setTotalCount(data.totalCount || 0);
          const calculatedTotalPages = Math.ceil(
        (data.totalCount || 0) / PUBLICATIONS_AND_TRIALS_PAGE_SIZE,
      );
          setTotalPages(calculatedTotalPages);

          // Guest: sync with backend response (skip UI when guest browse experiment = unlimited)
          if (
            !GUEST_BROWSE_MODE_ENABLED &&
            !isUserSignedIn &&
            data.remaining !== undefined
          ) {
            const remaining = data.remaining;
            setLocalSearchCount(MAX_FREE_SEARCHES - remaining);

            if (remaining === 0) {
              toast(
                t("toasts.searchLimitSignInUnlimited"),
                { duration: 5000, icon: "🔒" },
              );
            } else {
              toast.success(
                t("trials.guestSearchSuccess", { count: remaining }),
                { duration: 3000 },
              );
            }
            window.dispatchEvent(
              new CustomEvent("freeSearchUsed", { detail: { remaining } }),
            );
          }

          // Sort by matchPercentage in descending order (highest first)
          const sortedResults = sortTrialsByMatch(searchResults);
          setResults(sortedResults);

          // Save search state to sessionStorage (including pagination)
          const searchState = {
            q: filterValue,
            status: "",
            location,
            locationMode,
            institution,
            useMedicalInterest,
            userMedicalInterest,
            results: sortedResults,
            currentPage: 1,
            totalPages: calculatedTotalPages,
            totalCount: data.totalCount || 0,
            lastSearchParams: {
              finalQuery: searchQuery,
              status: "",
              phase,
              institution,
              eligibilitySex,
              eligibilityAge,
              ageRange,
              locationMode,
              location,
              userLocation,
              useMedicalInterest,
              userMedicalInterest,
              user: userData,
            },
            isInitialLoad: false,
          };
          sessionStorage.setItem(
            "trials_search_state",
            JSON.stringify(searchState),
          );

          setLoading(false);
        })
        .catch((error) => {
          console.error("Search error:", error);
          setResults([]);
          setLoading(false);
        });
    }, 100);
  }

  // Helper function to get unique key for favorite tracking
  const getFavoriteKey = (item) => {
    return `trial-${item.id || item._id}`;
  };

  async function favorite(item) {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user?._id && !user?.id) {
      toast.error(t("toasts.signInRequiredFavorites"));
      return;
    }

    const favoriteKey = getFavoriteKey(item);

    // Prevent duplicate clicks
    if (favoritingItems.has(favoriteKey)) {
      return;
    }

    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const itemId = item.id || item._id;
    const isFavorited = favorites.some(
      (fav) =>
        fav.type === "trial" &&
        (fav.item?.id === itemId ||
          fav.item?._id === itemId ||
          fav.item?.title === item.title),
    );

    // Optimistic UI update - update immediately
    const previousFavorites = [...favorites];
    let optimisticFavorites;

    if (isFavorited) {
      // Optimistically remove from favorites
      optimisticFavorites = favorites.filter((fav) => {
        if (fav.type !== "trial") return true;
        return !(
          fav.item?.id === itemId ||
          fav.item?._id === itemId ||
          fav.item?.title === item.title
        );
      });
    } else {
      // Optimistically add to favorites
      optimisticFavorites = [
        ...favorites,
        {
          type: "trial",
          item: {
            ...item,
            id: itemId,
            _id: item._id || itemId,
          },
          _id: `temp-${Date.now()}`,
        },
      ];
    }

    // Update UI immediately
    setFavorites(optimisticFavorites);
    setFavoritingItems((prev) => new Set(prev).add(favoriteKey));

    try {
      if (isFavorited) {
        await fetch(
          `${base}/api/favorites/${
            user._id || user.id
          }?type=trial&id=${encodeURIComponent(itemId)}`,
          { method: "DELETE" },
        );
        toast.success(t("toasts.favoritesRemoved"));
      } else {
        // Store complete item information
        await fetch(`${base}/api/favorites/${user._id || user.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "trial",
            item: {
              ...item, // Store all item properties
              id: itemId,
              _id: item._id || itemId,
            },
          }),
        });
        toast.success(t("toasts.favoritesAdded"));
      }

      // Refresh favorites from backend
      const favResponse = await fetch(
        `${base}/api/favorites/${user._id || user.id}`,
      );
      const favData = await favResponse.json();
      setFavorites(favData.items || []);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      // Revert optimistic update on error
      setFavorites(previousFavorites);
      toast.error(t("toasts.favoritesFailed"));
    } finally {
      // Remove from loading set
      setFavoritingItems((prev) => {
        const next = new Set(prev);
        next.delete(favoriteKey);
        return next;
      });
    }
  }

  // Load favorites on mount
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user?._id || user?.id) {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      fetch(`${base}/api/favorites/${user._id || user.id}`)
        .then((r) => r.json())
        .then((data) => setFavorites(data.items || []))
        .catch((err) => console.error("Error loading favorites:", err));
    }
  }, []);

  async function generateSummary(item) {
    // For "Simplify": simplified for patients, technical for researchers (same first-level key insights style as Publications for patients)
    const shouldSimplify = !researcherTitleMode;

    const title = item.title || t("trials.fallbackTitle");
    const text = [
      item.title || "",
      item.status || "",
      item.phase || "",
      item.conditions?.join(", ") || "",
      item.description || "",
      item.eligibility?.criteria || "",
    ]
      .filter(Boolean)
      .join(" ");

    setSummaryTrial(item);
    setHasSimplifiedFurther(false);
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
          simplify: shouldSimplify, // Simplify for patients, technical for researchers
          // Pass full trial object for structured summary (like Patient Dashboard)
          trial: item,
          outputLocale: getApiLocale(),
        }),
      }).then((r) => r.json());

      setSummaryModal((prev) => ({
        ...prev,
        summary:
          res.summary ||
          (typeof res.summary === "object" && res.summary.structured
            ? res.summary
            : {
                structured: false,
                summary: t("publications.summaryUnavailable"),
              }),
        loading: false,
      }));
    } catch (e) {
      console.error("Summary generation error:", e);
      setSummaryModal((prev) => ({
        ...prev,
        summary: t("publications.summaryFailed"),
        loading: false,
      }));
    }
  }

  async function simplifyTrialFurther() {
    if (!summaryTrial) return;
    setSummaryModal((prev) => ({ ...prev, loading: true }));

    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    try {
      const r = await fetch(`${base}/api/ai/simplify-trial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trial: summaryTrial }),
      });
      const res = await r.json();

      if (!r.ok || res.error) {
        setSummaryModal((prev) => ({
          ...prev,
          summary: {
            structured: false,
            summary:
              res.error || t("publications.simplifyFurtherFailed"),
          },
          loading: false,
        }));
        return;
      }

      const summary =
        res.summary && typeof res.summary === "object" && res.summary.structured
          ? res.summary
          : {
              structured: false,
              summary:
                res.summary?.summary || t("publications.summaryUnavailable"),
            };

      setHasSimplifiedFurther(true);
      setSummaryModal((prev) => ({
        ...prev,
        summary,
        loading: false,
      }));
    } catch (e) {
      console.error("Trial simplify further error:", e);
      setSummaryModal((prev) => ({
        ...prev,
        summary: {
          structured: false,
          summary: t("publications.simplifyFurtherFailed"),
        },
        loading: false,
      }));
    }
  }

  // Mark trial as read
  async function markTrialAsRead(trial) {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user?._id && !user?.id) return; // Only for signed-in users

    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const itemId = trial.id || trial._id;
      if (!itemId) return;

      await fetch(`${base}/api/read/${user._id || user.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "trial",
          itemId: itemId,
        }),
      });

      // Update the trial in results to mark as read
      setResults((prevResults) =>
        prevResults.map((row) =>
          (row.id || row._id) === itemId ? { ...row, isRead: true } : row,
        ),
      );
    } catch (error) {
      console.error("Error marking trial as read:", error);
    }
  }

  function getTrialSourceLabel(trialRow) {
    const src = trialRow?.sourceRegistry;
    if (src === "clinicaltrials.gov") return t("trials.registryClinicalTrialsGov");
    if (src === "isrctn") return t("trials.registryIsrctn");
    if (src === "eu-ctr") return t("trials.registryEuCtr");
    if (src === "ctis") return t("trials.registryEuCtis");
    if (src === "cura-link") return t("trials.registryCollabiora");
    return src || "Unknown";
  }

  function resolveExternalTrialUrl(trial) {
    if (!trial) return null;
    if (trial.clinicalTrialsGovUrl) return trial.clinicalTrialsGovUrl;
    if (trial.isrctnUrl) return trial.isrctnUrl;
    if (trial.euCtrUrl) return trial.euCtrUrl;

    const id = (trial.id || trial._id || "").trim();
    if (!id) return null;
    if (trial.sourceRegistry === "clinicaltrials.gov") {
      return `https://clinicaltrials.gov/study/${encodeURIComponent(id)}`;
    }
    if (trial.sourceRegistry === "isrctn") {
      const normalized = id.toUpperCase().replace(/^ISRCTN/i, "");
      return `https://www.isrctn.com/ISRCTN${normalized}`;
    }
    if (trial.sourceRegistry === "ctis") {
      return `https://euclinicaltrials.eu/search-for-clinical-trials/?lang=en&EUCT=${encodeURIComponent(
        id,
      )}`;
    }
    return null;
  }

  function getRenderableConditions(trial) {
    const raw = Array.isArray(trial?.conditions) ? trial.conditions : [];
    return raw
      .map((condition) => {
        if (typeof condition === "string") return condition;
        if (condition && typeof condition === "object") {
          if (typeof condition.name === "string") return condition.name;
          if (typeof condition.condition === "string")
            return condition.condition;
        }
        return "";
      })
      .map((condition) => condition.trim())
      .filter((condition) => condition && condition !== "[object Object]");
  }

  function getCuratedTrialMongoId(trial) {
    const raw = trial?.id || trial?._id;
    if (!raw) return null;
    const s = String(raw);
    return s.startsWith("cura-") ? s.slice(5) : null;
  }

  async function claimCuratedPiAsMe(trial) {
    const mongoId = getCuratedTrialMongoId(trial);
    if (!mongoId) {
      toast.error(t("trials.toastIdentifyTrial"));
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error(t("trials.toastSignIn"));
      return;
    }
    setClaimingPi(true);
    try {
      const res = await apiFetch(`/api/curated-trials/${mongoId}/claim-pi`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Claim failed");
      }
      toast.success(t("trials.toastTrialLinked"));
      setDetailsModal((prev) => {
        if (!prev.trial) return prev;
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        const uid = String(u._id || u.id);
        const selfEntry = {
          userId: uid,
          displayName: u.username || "You",
          handle: u.handle || null,
          picture: u.picture || null,
          profilePath: `/collabiora-expert/profile/${uid}`,
          claimed: true,
          matchReason: "claimed",
          matchedEmail: u.email,
        };
        const pis = [...(prev.trial.piOnPlatform || [])];
        const idx = pis.findIndex((p) => p.userId === uid);
        if (idx >= 0) {
          pis[idx] = { ...pis[idx], ...selfEntry, claimed: true };
        } else {
          pis.push(selfEntry);
        }
        return {
          ...prev,
          trial: {
            ...prev.trial,
            viewerPiClaim: { linked: true, claimed: true, canClaim: false },
            piOnPlatform: pis,
          },
        };
      });
    } catch (e) {
      toast.error(e.message || t("trials.toastLinkTrialFailed"));
    } finally {
      setClaimingPi(false);
    }
  }

  async function openDetailsModal(trial) {
    // Mark as read when modal opens
    if (isSignedIn) {
      markTrialAsRead(trial);
    }

    setDetailsModal({
      open: true,
      trial: trial, // Show basic info immediately
      loading: true,
      generatedMessage: "",
      generating: false,
      copied: false,
    });

    // Fetch detailed trial information with simplified details from backend
    // Researchers: audience=researcher (technical terms, structured); Patients: plain language
    if (trial.id || trial._id) {
      try {
        const nctId = trial.id || trial._id;
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const audience = researcherTitleMode ? "researcher" : "patient";
        const sourceParam = encodeURIComponent(
          trial.sourceRegistry || "clinicaltrials.gov",
        );

        const response = await fetch(
          `${base}/api/search/trial/${nctId}/simplified?audience=${encodeURIComponent(audience)}&source=${sourceParam}&locale=${encodeURIComponent(getApiLocale())}`,
        );

        if (response.ok) {
          const data = await response.json();
          if (data.trial) {
            const mergedTrial = {
              ...trial,
              ...data.trial,
              simplifiedTitle:
                trial.simplifiedTitle ||
                data.trial.simplifiedDetails?.title ||
                data.trial.simplifiedTitle,
            };
            setDetailsModal({
              open: true,
              trial: mergedTrial,
              loading: false,
              generatedMessage: "",
              generating: false,
              copied: false,
            });
            return;
          }
        }

        const fallbackResponse = await fetch(
          `${base}/api/search/trial/${nctId}/simplified?source=${sourceParam}&locale=${encodeURIComponent(getApiLocale())}`,
        );
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.trial) {
            // Preserve simplifiedTitle from card if it exists
            const mergedTrial = {
              ...trial,
              ...fallbackData.trial,
              simplifiedTitle:
                trial.simplifiedTitle || fallbackData.trial.simplifiedTitle,
            };
            setDetailsModal({
              open: true,
              trial: mergedTrial,
              loading: false,
              generatedMessage: "",
              generating: false,
              copied: false,
            });
            return;
          }
        }
      } catch (error) {
        console.error("Error fetching detailed trial info:", error);
      }
    }

    // If fetch fails or no NCT ID, just use the trial we have
    setDetailsModal({
      open: true,
      trial: trial,
      loading: false,
      generatedMessage: "",
      generating: false,
      copied: false,
    });
  }

  function closeDetailsModal() {
    setDetailsModal({
      open: false,
      trial: null,
      loading: false,
      generatedMessage: "",
      generating: false,
      copied: false,
    });
  }

  async function generateTrialDetailsMessage() {
    if (!detailsModal.trial) return;

    // Check if user is signed in
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (!userData?._id && !userData?.id) {
      toast.error(t("trials.toastSignInMessage"));
      return;
    }

    setDetailsModal((prev) => ({ ...prev, generating: true }));

    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const userName = userData?.username || userData?.name || "User";
      const userLocationData = userLocation || null;

      const response = await fetch(`${base}/api/ai/generate-trial-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName,
          userLocation: userLocationData,
          trial: detailsModal.trial,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate message");
      }

      const data = await response.json();
      setDetailsModal((prev) => ({
        ...prev,
        generatedMessage: data.message || "",
        generating: false,
      }));
    } catch (error) {
      console.error("Error generating message:", error);
      toast.error(t("trials.toastMessageFailed"));
      setDetailsModal((prev) => ({ ...prev, generating: false }));
    }
  }

  function copyTrialDetailsMessage() {
    if (detailsModal.generatedMessage) {
      navigator.clipboard.writeText(detailsModal.generatedMessage);
      setDetailsModal((prev) => ({ ...prev, copied: true }));
      toast.success(t("trials.toastMessageCopied"));
      setTimeout(() => {
        setDetailsModal((prev) => ({ ...prev, copied: false }));
      }, 2000);
    }
  }

  function openContactModal(trial) {
    setContactModal({
      open: true,
      trial,
      message: "",
      sent: false,
      generating: false,
    });
  }

  async function openContactInfoModal(trial) {
    recordTrialEngagement("contact_modal");
    setContactInfoModal({
      open: true,
      trial: trial, // Show basic info immediately
      loading: true,
      generatedMessage: "",
      generating: false,
      copied: false,
    });

    // Fetch detailed trial information from backend
    if (trial.id || trial._id) {
      try {
        const nctId = trial.id || trial._id;
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const sourceParam = encodeURIComponent(
          trial.sourceRegistry || "clinicaltrials.gov",
        );
        const response = await fetch(
          `${base}/api/search/trial/${nctId}?source=${sourceParam}`,
        );

        if (response.ok) {
          const data = await response.json();
          if (data.trial) {
            // Merge detailed info with existing trial data
            setContactInfoModal({
              open: true,
              trial: { ...trial, ...data.trial },
              loading: false,
              generatedMessage: "",
              generating: false,
              copied: false,
            });
            return;
          }
        }
      } catch (error) {
        console.error("Error fetching detailed trial info:", error);
      }
    }

    // If fetch fails or no NCT ID, just use the trial we have
    setContactInfoModal({
      open: true,
      trial: trial,
      loading: false,
      generatedMessage: "",
      generating: false,
      copied: false,
    });
  }

  function closeContactInfoModal() {
    setContactInfoModal({
      open: false,
      trial: null,
      loading: false,
      generatedMessage: "",
      generating: false,
      copied: false,
    });
  }

  async function generateContactMessage() {
    if (!contactInfoModal.trial) return;

    // Check if user is signed in
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (!userData?._id && !userData?.id) {
      toast.error(t("trials.toastSignInMessage"));
      return;
    }

    setContactInfoModal((prev) => ({ ...prev, generating: true }));

    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const userName = userData?.username || userData?.name || "User";
      const userLocationData = userLocation || null;

      const response = await fetch(`${base}/api/ai/generate-trial-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName,
          userLocation: userLocationData,
          trial: contactInfoModal.trial,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate message");
      }

      const data = await response.json();
      setContactInfoModal((prev) => ({
        ...prev,
        generatedMessage: data.message || "",
        generating: false,
      }));
    } catch (error) {
      console.error("Error generating message:", error);
      toast.error(t("trials.toastMessageFailed"));
      setContactInfoModal((prev) => ({ ...prev, generating: false }));
    }
  }

  function copyGeneratedMessage() {
    if (contactInfoModal.generatedMessage) {
      recordTrialEngagement("email_click");
      navigator.clipboard.writeText(contactInfoModal.generatedMessage);
      setContactInfoModal((prev) => ({ ...prev, copied: true }));
      toast.success(t("trials.toastMessageCopied"));
      setTimeout(() => {
        setContactInfoModal((prev) => ({ ...prev, copied: false }));
      }, 2000);
    }
  }

  function closeContactStepsModal() {
    setContactStepsModal({
      open: false,
      trial: null,
      currentStep: 1,
      generatedEmail: "",
      generating: false,
      copied: false,
    });
  }

  function nextStep() {
    setContactStepsModal((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 4),
    }));
  }

  function prevStep() {
    setContactStepsModal((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1),
    }));
  }

  async function generateContactEmail() {
    if (!contactStepsModal.trial) return;

    // Check if user is signed in
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (!userData?._id && !userData?.id) {
      toast.error(t("trials.toastSignInEmail"));
      return;
    }

    setContactStepsModal((prev) => ({ ...prev, generating: true }));

    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const userName = userData?.username || userData?.name || "User";
      const userLocationData = userLocation || null;

      const response = await fetch(`${base}/api/ai/generate-trial-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName,
          userLocation: userLocationData,
          trial: contactStepsModal.trial,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate email");
      }

      const data = await response.json();
      setContactStepsModal((prev) => ({
        ...prev,
        generatedEmail: data.message || "",
        generating: false,
      }));
    } catch (error) {
      console.error("Error generating email:", error);
      toast.error(t("trials.toastEmailFailed"));
      setContactStepsModal((prev) => ({ ...prev, generating: false }));
    }
  }

  function copyGeneratedEmail() {
    if (contactStepsModal.generatedEmail) {
      recordTrialEngagement("email_click");
      navigator.clipboard.writeText(contactStepsModal.generatedEmail);
      setContactStepsModal((prev) => ({ ...prev, copied: true }));
      toast.success(t("trials.toastEmailCopied"));
      setTimeout(() => {
        setContactStepsModal((prev) => ({ ...prev, copied: false }));
      }, 2000);
    }
  }

  /** Step 3 (after draft): Gmail compose like ContactUs + copy To / Subject / body to clipboard. */
  function openGmailComposeTrialModerator() {
    if (!contactStepsModal.trial) return;
    const emails = collectTrialContactEmails(contactStepsModal.trial);
    if (emails.length === 0) {
      toast.error(t("trials.toastNoEmail"));
      return;
    }
    const draft = (contactStepsModal.generatedEmail || "").trim();
    if (!draft) {
      toast.error(t("trials.toastDraftFirst"));
      return;
    }

    const subject = `Interest in Clinical Trial: ${contactStepsModal.trial.title}`;
    const gmailUrl = buildGmailComposeUrl(emails, subject, draft);
    const clipboardText = `To: ${emails.join(", ")}\n\nSubject: ${subject}\n\n${draft}`;

    const openGmail = () =>
      window.open(gmailUrl, "_blank", "noopener,noreferrer");

    recordTrialEngagement("email_click");
    navigator.clipboard
      .writeText(clipboardText)
      .then(() => {
        toast.success(t("trials.toastEmailAppOpened"));
        openGmail();
      })
      .catch(() => {
        toast.error(t("trials.toastClipboardFailed"));
        openGmail();
      });
  }

  async function generateMessage() {
    if (!contactModal.trial) return;

    // Check if user is signed in
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user?._id && !user?.id) {
      toast.error(t("trials.toastSignInMessage"));
      return;
    }

    setContactModal((prev) => ({ ...prev, generating: true }));

    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const userName = user?.username || user?.name || "User";
      const userLocationData = userLocation || null;

      const response = await fetch(`${base}/api/ai/generate-trial-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName,
          userLocation: userLocationData,
          trial: contactModal.trial,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate message");
      }

      const data = await response.json();
      setContactModal((prev) => ({
        ...prev,
        message: data.message || "",
        generating: false,
      }));
    } catch (error) {
      console.error("Error generating message:", error);
      toast.error(t("trials.toastMessageFailed"));
      setContactModal((prev) => ({ ...prev, generating: false }));
    }
  }

  function handleSendMessage() {
    if (!contactModal.message.trim()) return;
    toast.success(t("trials.toastMessageSent"));
    setContactModal((prev) => ({ ...prev, sent: true, generating: false }));
    setTimeout(() => {
      setContactModal({
        open: false,
        trial: null,
        message: "",
        sent: false,
        generating: false,
      });
    }, 2000);
  }

  function openEmail(trial) {
    const subject = encodeURIComponent(
      `Interest in Clinical Trial: ${trial.title}`,
    );
    const afterTitle =
      trial.sourceRegistry === "cura-link"
        ? `\n\nStatus: ${trial.status}`
        : `\n\nTrial ID: ${trial.id || trial._id || "N/A"}\nStatus: ${trial.status}`;
    const body = encodeURIComponent(
      `Dear Clinical Trial Team,\n\nI am interested in learning more about the clinical trial: ${trial.title}${afterTitle}\n\nPlease provide more information about participation requirements and next steps.\n\nThank you.\n\nBest regards,`,
    );
    const email = trial.contacts?.[0]?.email || "contact@clinicaltrials.gov";
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
  }

  function getStatusColor(status) {
    const statusColors = {
      RECRUITING: "bg-green-100 text-green-800 border-green-200",
      NOT_YET_RECRUITING: "bg-blue-100 text-blue-800 border-blue-200",
      ACTIVE_NOT_RECRUITING: "bg-yellow-100 text-yellow-800 border-yellow-200",
      COMPLETED: "bg-gray-100 text-gray-800 border-gray-200",
      SUSPENDED: "bg-yellow-100 text-yellow-800 border-yellow-200",
      TERMINATED: "bg-red-100 text-red-800 border-red-200",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  }

  // Restore search state from sessionStorage on mount (for all users, signed in or not)
  useEffect(() => {
    const savedState = sessionStorage.getItem("trials_search_state");
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        // Restore search keywords array separately (keep keywords as chips, not in search bar)
        if (
          state.searchKeywords &&
          Array.isArray(state.searchKeywords) &&
          state.searchKeywords.length > 0
        ) {
          setSearchKeywords(state.searchKeywords);
          setQ(""); // Keep search bar empty, keywords show as chips
        } else {
          // Fallback: if we have q but no searchKeywords, don't try to split it
          // We can't reliably split multi-word phrases like "chronic fatigue syndrome" into separate keywords
          // Just keep search bar empty and keywords empty - user can re-enter if needed
          setQ("");
          setSearchKeywords([]);
        }

        setStatus(state.status || "RECRUITING"); // Default to RECRUITING
        setLocation(
          typeof state.location === "string"
            ? state.location
            : state.location &&
                typeof state.location === "object" &&
                (state.location.city || state.location.country)
              ? [
                  state.location.city,
                  state.location.state,
                  state.location.country,
                ]
                  .filter(Boolean)
                  .join(", ")
              : "",
        );
        setLocationMode(state.locationMode || "global");
        {
          const restoredInst =
            typeof state.institution === "string" ? state.institution : "";
          setInstitution(restoredInst);
          if (restoredInst === INSTITUTION_UCLA) {
            suppressUclaAutoSearchFromSessionRef.current = true;
          }
        }
        // useMedicalInterest is loaded from localStorage in useState initializer
        // Only override if sessionStorage has it and localStorage doesn't
        if (localStorage.getItem("useMedicalInterest") === null) {
          setUseMedicalInterest(
            state.useMedicalInterest !== undefined
              ? state.useMedicalInterest
              : false,
          );
        }
        setUserMedicalInterest(state.userMedicalInterest || "");
        // Derive array from string for backward compatibility
        if (state.userMedicalInterest) {
          const interests = state.userMedicalInterest
            .split(" ")
            .filter(Boolean);
          setUserMedicalInterests(interests);
          // Restore enabled interests from localStorage if available
          const savedEnabled = localStorage.getItem("enabledMedicalInterests");
          if (savedEnabled) {
            try {
              const savedSet = new Set(JSON.parse(savedEnabled));
              const validEnabled = new Set(
                interests.filter((i) => savedSet.has(i)),
              );
              setEnabledMedicalInterests(validEnabled);
              setUserMedicalInterest(Array.from(validEnabled).join(" "));
            } catch (e) {
              // If parsing fails, keep all available but none enabled
              setEnabledMedicalInterests(new Set());
              setUserMedicalInterest("");
            }
          } else {
            // No saved enabled interests; keep all available but disabled by default
            setEnabledMedicalInterests(new Set());
            setUserMedicalInterest("");
          }
        } else {
          setUserMedicalInterests([]);
          setEnabledMedicalInterests(new Set());
        }
        // Sort results by match percentage when restoring from sessionStorage
        const restoredResults = state.results || [];
        setResults(sortTrialsByMatch(restoredResults));
        // Restore pagination state
        if (state.currentPage) setCurrentPage(state.currentPage);
        if (state.totalPages) setTotalPages(state.totalPages);
        if (state.totalCount) setTotalCount(state.totalCount);
        if (state.lastSearchParams) setLastSearchParams(state.lastSearchParams);
        if (state.phase) setPhase(state.phase);
        if (state.eligibilitySex) setEligibilitySex(state.eligibilitySex);
        if (state.eligibilityAge) setEligibilityAge(state.eligibilityAge);
        if (state.ageRange) setAgeRange(state.ageRange);
        setIsInitialLoad(
          state.isInitialLoad !== undefined ? state.isInitialLoad : false,
        );
      } catch (error) {
        console.error("Error restoring search state:", error);
      }
    }
  }, []);

  // Listen for logout events and reset state
  useEffect(() => {
    const handleLogout = () => {
      // Reset all state to initial values
      setQ("");
      setStatus("");
      setLocation("");
      setLocationMode("global");
      setInstitution("");
      setUseMedicalInterest(true);
      setUserMedicalInterest("");
      setUserMedicalInterests([]);
      setEnabledMedicalInterests(new Set());
      setResults([]);
      setIsInitialLoad(true);
      setIsSignedIn(false);
      setUserProfile(null);
      setUserLocation(null);
      sessionStorage.removeItem("trials_search_state");
    };

    window.addEventListener("logout", handleLogout);
    return () => window.removeEventListener("logout", handleLogout);
  }, []);

  // Batch simplify trial titles when researcher enables "Simplify titles"
  useEffect(() => {
    if (!simplifyTitles || !researcherTitleMode || !results?.length) return;

    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const trialsToSimplify = results.filter(
      (trial) => trial.title && trial.title.length > 60,
    );

    if (trialsToSimplify.length === 0) return;

    fetch(`${base}/api/ai/batch-simplify-trial-summaries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trials: trialsToSimplify }),
    })
      .then((res) => res.json())
      .then((data) => {
        const simplified = data.simplifiedSummaries || [];
        setSimplifiedTrialSummaries((prev) => {
          const newMap = new Map(prev);
          trialsToSimplify.forEach((trial, index) => {
            if (simplified[index]) newMap.set(trial.title, simplified[index]);
          });
          return newMap;
        });
      })
      .catch(() => {});

    return () => {};
  }, [simplifyTitles, results, researcherTitleMode]);

  // Check for guest info or URL parameters, then fetch user profile
  useEffect(() => {
    // Check URL parameters first (from Explore page search)
    const urlParams = new URLSearchParams(window.location.search);
    const urlQuery = urlParams.get("q");
    const guestCondition = urlParams.get("guestCondition");
    const guestLocation = urlParams.get("guestLocation");

    // Check localStorage for guest info
    const guestInfo = localStorage.getItem("guest_user_info");
    let parsedGuestInfo = null;
    if (guestInfo) {
      try {
        parsedGuestInfo = JSON.parse(guestInfo);
      } catch (e) {
        console.error("Error parsing guest info:", e);
      }
    }

    // If URL has a query, set it
    if (urlQuery) {
      setQ(urlQuery);
    }

    async function fetchUserData() {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const token = localStorage.getItem("token");
      const isUserSignedIn = userData && token;

      setUser(userData && token ? userData : null);

      // Use guest info from URL params or localStorage (only if not signed in)
      if (!isUserSignedIn && (guestCondition || parsedGuestInfo?.condition)) {
        const condition = guestCondition || parsedGuestInfo?.condition;
        if (condition) {
          setUserMedicalInterests([condition]);
          setEnabledMedicalInterests(new Set([condition]));
          setUserMedicalInterest(condition);
          setUseMedicalInterest(true);
        }
      }

      if (!isUserSignedIn && (guestLocation || parsedGuestInfo?.location)) {
        const raw = guestLocation || parsedGuestInfo?.location;
        const locStr =
          typeof raw === "string"
            ? raw
            : raw && typeof raw === "object"
              ? [raw.city, raw.state, raw.country].filter(Boolean).join(", ")
              : "";
        if (locStr) {
          setLocation(locStr);
          setLocationMode("custom");
        }
      }

      if (!userData?._id && !userData?.id) {
        // If guest has info and no saved state, use it
        if (
          (guestCondition || parsedGuestInfo?.condition) &&
          !sessionStorage.getItem("trials_search_state")
        ) {
          if (localStorage.getItem("useMedicalInterest") === null) {
            setUseMedicalInterest(false);
          }
        } else if (localStorage.getItem("useMedicalInterest") === null) {
          setUseMedicalInterest(false);
        }
        setIsSignedIn(false);
        // Don't auto-search - user must manually trigger search
        return;
      }

      setIsSignedIn(true);

      // Only set location mode if not restored from sessionStorage
      const savedState = sessionStorage.getItem("trials_search_state");
      if (!savedState) {
        setLocationMode("global"); // Set to global by default
      }

      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      try {
        // Fetch profile for location and user type
        const response = await fetch(
          `${base}/api/profile/${userData._id || userData.id}`,
        );
        const data = await response.json();
        if (data.profile) {
          setUserProfile(data.profile);
          const profileLocation =
            data.profile.patient?.location || data.profile.researcher?.location;
          if (
            profileLocation &&
            (profileLocation.city || profileLocation.country)
          ) {
            setUserLocation(profileLocation);
          }
        }

        // Get medical interests from user object
        if (
          userData.medicalInterests &&
          Array.isArray(userData.medicalInterests) &&
          userData.medicalInterests.length > 0
        ) {
          // Store all medical interests
          setUserMedicalInterests(userData.medicalInterests);
          // Restore enabled interests from localStorage if available
          const savedEnabled = localStorage.getItem("enabledMedicalInterests");
          if (savedEnabled) {
            try {
              const savedSet = new Set(JSON.parse(savedEnabled));
              const validEnabled = new Set(
                userData.medicalInterests.filter((i) => savedSet.has(i)),
              );
              setEnabledMedicalInterests(validEnabled);
              setUserMedicalInterest(Array.from(validEnabled).join(" "));
            } catch (e) {
              // If parsing fails, fall back to all interests available but none enabled
              setEnabledMedicalInterests(new Set());
              setUserMedicalInterest("");
            }
          } else {
            // No saved enabled interests; keep all medical interests available but disabled by default
            setEnabledMedicalInterests(new Set());
            setUserMedicalInterest("");
          }
          // Don't auto-search - user must manually trigger search
        } else {
          setUserMedicalInterests([]);
          setEnabledMedicalInterests(new Set());
          setUseMedicalInterest(false);
          // Don't auto-search - user must manually trigger search
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUseMedicalInterest(false);
      }
    }

    fetchUserData();
  }, []);

  const TRIALS_TUTORIAL_STEPS = useMemo(
    () => [
      {
        target: "[data-tour='trials-header']",
        title: t("trials.tutorialSteps.step1Title"),
        content: t("trials.tutorialSteps.step1Content"),
        placement: "bottom",
      },
      {
        target: "[data-tour='trials-search-bar']",
        title: t("trials.tutorialSteps.step2Title"),
        content: t("trials.tutorialSteps.step2Content"),
        placement: "bottom",
      },
      {
        target: "[data-tour='trials-keywords']",
        title: t("trials.tutorialSteps.step3Title"),
        content: t("trials.tutorialSteps.step3Content"),
        placement: "bottom",
      },
      {
        target: "[data-tour='trials-search-btn']",
        title: t("trials.tutorialSteps.step4Title"),
        content: t("trials.tutorialSteps.step4Content"),
        placement: "bottom",
      },
      {
        target: "[data-tour='trials-results-area']",
        title: t("trials.tutorialSteps.step5Title"),
        content: t("trials.tutorialSteps.step5Content"),
        placement: "bottom",
      },
      {
        target: "[data-tour='trials-view-details-btn']",
        title: t("trials.tutorialSteps.step6Title"),
        content: t("trials.tutorialSteps.step6Content"),
        placement: "top",
      },
      {
        target: "[data-tour='trials-understand-btn']",
        title: t("trials.tutorialSteps.step7Title"),
        content: t("trials.tutorialSteps.step7Content"),
        placement: "top",
      },
      {
        target: "[data-tour='trials-favourites-btn']",
        title: t("trials.tutorialSteps.step8Title"),
        content: t("trials.tutorialSteps.step8Content"),
        placement: "top",
      },
      {
        target: "[data-tour='trials-contact-btn']",
        title: t("trials.tutorialSteps.step9Title"),
        content: t("trials.tutorialSteps.step9Content"),
        placement: "top",
      },
      {
        target: "[data-tour='yori-chatbot']",
        title: t("trials.tutorialSteps.step10Title"),
        content: isSignedIn
          ? t("trials.tutorialSteps.step10ContentSignedIn")
          : t("trials.tutorialSteps.step10ContentGuest"),
        placement: "top",
        allowTargetClick: true,
        spotlightShape: "circle",
        spotlightPadding: 18,
      },
    ],
    [isSignedIn, t, i18n.language],
  );

  return (
    <Layout>
      <PageTutorial
        pageId="trials"
        steps={TRIALS_TUTORIAL_STEPS}
        enabled={showTutorial}
        onStepChange={handleTutorialStepChange}
        onComplete={() => {
          setForceTutorial(false);
          setTutorialStep(0);
          hasScrolledToResultsRef.current = false;
          setSearchKeywords((prev) => prev.filter((k) => k !== "hypertension"));
        }}
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 relative overflow-hidden">
        <AnimatedBackground />

        <div className="relative pt-24 px-4 md:px-8 mx-auto max-w-6xl pb-8">
          {/* Compact Header */}
          <div
            className="text-center mb-6 animate-fade-in"
            data-tour="trials-header"
          >
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 bg-clip-text text-transparent mb-1">
              <AuroraText speed={2.5} colors={["#2F3C96"]}>
                {user?.role === "researcher"
                  ? t("nav.clinicalTrials")
                  : t("nav.newTreatments")}
              </AuroraText>
            </h1>
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={async () => {
                  resetTutorialCompleted("trials");
                  setForceTutorial(true);
                  setResults([]);
                  setSearchKeywords(["hypertension"]);
                  setTutorialSampleResults([]);
                  setTotalCount(0);
                  setTotalPages(0);
                  setCurrentPage(1);
                  sessionStorage.removeItem("trials_search_state");
                  setTutorialSampleLoading(true);
                  try {
                    const sample = await loadTutorialSampleTrials();
                    if (sample && sample.length > 0) {
                      setTutorialSampleResults(sample);
                    }
                  } finally {
                    setTutorialSampleLoading(false);
                  }
                }}
                className="inline-flex items-center gap-1 text-xs text-[#2F3C96] hover:text-[#474F97] font-medium hover:underline"
                title={t("publications.showTutorialAgain")}
              >
                <Info className="w-3.5 h-3.5" />
                {t("publications.tutorial")}
              </button>
            </div>
            {/* Free Searches Indicator */}
            <div className="mt-3 flex justify-center items-center w-full">
              <FreeSearchesIndicator user={user} centered={true} />
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-xl shadow-lg p-5 mb-4 border border-slate-200 animate-fade-in">
            <BorderBeam
              duration={10}
              size={100}
              className="from-transparent via-[#2F3C96] to-transparent"
            />
            <BorderBeam
              duration={10}
              size={300}
              borderWidth={3}
              className="from-transparent via-[#D0C4E2] to-transparent"
            />
            <div className="flex flex-col gap-3">
              {/* Medical Interest Toggle */}
              {userMedicalInterests.length > 0 && (
                <div className="flex flex-col gap-2 p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-700 font-medium">
                      {userMedicalInterests.length > 1
                        ? t("publications.yourMedicalInterests")
                        : t("publications.yourMedicalInterest")}
                    </span>
                    {q && enabledMedicalInterests.size > 0 && (
                      <span className="text-xs text-slate-600">
                        {t("publications.enabledInterestsHint")}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {userMedicalInterests.map((interest, index) => {
                      const isEnabled = enabledMedicalInterests.has(interest);
                      return (
                        <span
                          key={`${interest}-${index}`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm transition-all group ${
                            isEnabled
                              ? "bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-300 text-indigo-800 hover:shadow"
                              : "bg-slate-100 border border-slate-300 text-slate-600 opacity-60"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleMedicalInterest(interest);
                            }}
                            className="w-3 h-3 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                            aria-label={`Toggle ${interest}`}
                          />
                          {interest}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div
                className="flex flex-col md:flex-row gap-2"
                data-tour="trials-search-bar"
              >
                <SmartSearchInput
                  value={q}
                  onChange={setQ}
                  onSubmit={handleSearch}
                  placeholder={t("publications.searchPlaceholder")}
                  extraTerms={trialSuggestionTerms}
                  priorityExtraTerms={trialsNlm.terms}
                  remoteSuggestionsOnly
                  prioritySuggestionsLoading={trialsNlm.loading}
                  className="flex-1"
                />
                <CustomSelect
                  value={status}
                  onChange={(value) => setStatus(value)}
                  options={statusOptions}
                  placeholder={t("trials.selectStatusPlaceholder")}
                  className="w-full sm:w-auto"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                    className={`bg-white text-slate-700 px-4 py-2 rounded-lg transition-all text-sm font-semibold border ${
                      getActiveAdvancedFilters().length > 0
                        ? "border-[#D0C4E2] shadow-[0_2px_8px_rgba(208,196,226,0.4)] hover:shadow-[0_4px_12px_rgba(208,196,226,0.5)]"
                        : "border-slate-200 shadow-[0_2px_8px_rgba(208,196,226,0.25)] hover:shadow-[0_4px_12px_rgba(208,196,226,0.35)] hover:border-[#D0C4E2]/60"
                    }`}
                  >
                    {showAdvancedSearch
                      ? t("publications.hide")
                      : t("publications.advanced")}
                    {getActiveAdvancedFilters().length > 0 && (
                      <span className="ml-1.5 bg-[#D0C4E2]/20 text-[#2F3C96] px-1.5 py-0.5 rounded text-xs font-medium">
                        {t("publications.filters")}
                      </span>
                    )}
                  </Button>
                  <Button
                    onClick={handleSearch}
                    className="text-white px-5 py-2 rounded-lg shadow-md hover:shadow-lg transition-all text-sm font-semibold"
                    style={{ backgroundColor: "#2F3C96" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#252b73";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#2F3C96";
                    }}
                    data-tour="trials-search-btn"
                  >
                    {t("publications.search")}
                  </Button>
                </div>
              </div>

              {/* Keyword Chips Section */}
              <div className="flex flex-col gap-2" data-tour="trials-keywords">
                {searchKeywords.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-600">
                      {t("publications.keywordsCount", {
                        count: searchKeywords.length,
                      })}
                    </span>
                    {searchKeywords.map((keyword, index) => (
                      <span
                        key={`${keyword}-${index}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 text-indigo-700 rounded-full text-xs font-medium shadow-sm hover:shadow transition-all group"
                      >
                        {keyword}
                        <button
                          onClick={() => removeKeyword(keyword)}
                          className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                          aria-label={`Remove ${keyword}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <button
                      onClick={clearAllKeywords}
                      className="text-xs text-slate-500 hover:text-red-600 transition-colors underline underline-offset-2"
                    >
                      {t("publications.clearAll")}
                    </button>
                  </div>
                )}
                {searchKeywords.length === 0 && <></>}
              </div>

              {/* Advanced Filters Applied Section */}
              {getActiveAdvancedFilters().length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-600">
                      {t("publications.filtersApplied")}
                    </span>
                    {getActiveAdvancedFilters().map((filter, index) => (
                      <span
                        key={`${filter.key}-${index}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 text-purple-700 rounded-full text-xs font-medium shadow-sm hover:shadow transition-all group"
                      >
                        {filter.label}
                        <button
                          onClick={() => {
                            if (filter.key === "sex") {
                              setEligibilitySex("All");
                            } else if (filter.key === "age") {
                              setEligibilityAge("");
                              setAgeRange({ min: "", max: "" });
                            } else if (filter.key === "phase") {
                              setPhase("");
                            } else if (filter.key === "otherTerms") {
                              setOtherTerms("");
                            } else if (filter.key === "intervention") {
                              setIntervention("");
                            }
                          }}
                          className="hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                          aria-label={`Remove ${filter.label}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <button
                      onClick={clearAllAdvancedFilters}
                      className="text-xs text-slate-500 hover:text-red-600 transition-colors underline underline-offset-2"
                    >
                      {t("publications.clearAll")}
                    </button>
                  </div>
                </div>
              )}

              {/* Location + Institution: institution flush right on wide layouts */}
              <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2">
                <div className="flex flex-wrap items-center gap-2 min-w-0 shrink-0">
                  <span className="text-xs font-medium text-[#2F3C96] shrink-0">
                    {t("trials.locationLabel")}
                  </span>
                  {userLocation && (
                    <button
                      type="button"
                      aria-pressed={locationMode === "current"}
                      aria-label={t("trials.useProfileLocationAria")}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (locationMode === "current") {
                          setLocationMode("global");
                          setLocation("");
                        } else {
                          setLocationMode("current");
                          setLocation("");
                        }
                      }}
                      className={`h-9 shrink-0 inline-flex items-center justify-center gap-1 rounded-lg border px-3 text-xs font-medium text-[#2F3C96] transition-colors ${
                        locationMode === "current"
                          ? "border-[#D0C4E2] bg-[#D0C4E2]"
                          : "border-[#E8E8E8] bg-white hover:bg-slate-50"
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      {t("trials.nearMe")}
                    </button>
                  )}
                  <LocationInput
                    value={locationMode === "current" ? "" : location}
                    onChange={(v) => {
                      setLocation(v);
                      if (v.trim()) {
                        setLocationMode("custom");
                      } else {
                        setLocationMode("global");
                      }
                    }}
                    placeholder={t("trials.locationPlaceholder")}
                    className="w-[9rem] sm:w-44 shrink-0 max-w-[11rem]"
                    inputClassName="!h-9 !min-h-9 !py-0 !rounded-lg !text-xs border border-[#E8E8E8] bg-white pl-9 pr-3 text-[#2F3C96] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D0C4E2] focus:border-[#D0C4E2] box-border leading-none"
                  />
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <span className="text-xs font-medium text-[#2F3C96] shrink-0">
                    {t("trials.institutionLabel")}
                  </span>
                  <CustomSelect
                    value={institution}
                    onChange={(v) => setInstitution(v)}
                    options={institutionOptions}
                    placeholder={t("trials.allInstitutions")}
                    variant="location"
                    className="w-56 min-w-[10rem] sm:w-72"
                    maxDropdownHeight={320}
                  />
                </div>
              </div>

              {/* Simplify titles checkbox - researchers only */}
              {researcherTitleMode && (
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simplifyTitles}
                      onChange={(e) => setSimplifyTitles(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      {t("publications.simplifyTitles")}
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Search Modal */}
          <Modal
            isOpen={showAdvancedSearch}
            onClose={() => setShowAdvancedSearch(false)}
            title={t("trials.advancedSearchTitle")}
          >
            <div className="space-y-6">
              {/* Eligibility Criteria Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-4">
                  {t("trials.eligibilityCriteriaSection")}
                </h3>

                {/* Sex Filter */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    {t("trials.sex")}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { v: "All", lab: t("trials.sexAll") },
                      { v: "Female", lab: t("trials.sexFemale") },
                      { v: "Male", lab: t("trials.sexMale") },
                    ].map((sex) => (
                      <button
                        key={sex.v}
                        type="button"
                        onClick={() => setEligibilitySex(sex.v)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          eligibilitySex === sex.v
                            ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {sex.lab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Age Filter */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    {t("trials.age")}
                  </label>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      {[
                        {
                          label: t("trials.ageChild"),
                          value: "Child",
                        },
                        {
                          label: t("trials.ageAdult"),
                          value: "Adult",
                        },
                        {
                          label: t("trials.ageOlder"),
                          value: "Older adult",
                        },
                      ].map((age) => (
                        <button
                          key={age.value}
                          onClick={() => {
                            setEligibilityAge(age.value);
                            setAgeRange({ min: "", max: "" });
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            eligibilityAge === age.value
                              ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {age.label}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setEligibilityAge("custom");
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          eligibilityAge === "custom"
                            ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {t("trials.manualAgeRange")}
                      </button>
                    </div>

                    {/* Manual Age Range Input */}
                    {eligibilityAge === "custom" && (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="number"
                          value={ageRange.min}
                          onChange={(e) =>
                            setAgeRange({ ...ageRange, min: e.target.value })
                          }
                          placeholder={t("trials.minAgePlaceholder")}
                          className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <span className="text-slate-600">-</span>
                        <input
                          type="number"
                          value={ageRange.max}
                          onChange={(e) =>
                            setAgeRange({ ...ageRange, max: e.target.value })
                          }
                          placeholder={t("trials.maxAgePlaceholder")}
                          className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Phase Filter */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  {t("trials.phase")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: t("trials.phase1"), value: "PHASE1" },
                    { label: t("trials.phase2"), value: "PHASE2" },
                    { label: t("trials.phase3"), value: "PHASE3" },
                    { label: t("trials.phase4"), value: "PHASE4" },
                  ].map((phaseOption) => (
                    <button
                      key={phaseOption.value}
                      onClick={() =>
                        setPhase(
                          phase === phaseOption.value ? "" : phaseOption.value,
                        )
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        phase === phaseOption.value
                          ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {phaseOption.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Other Terms */}
              <div>
                <label className="flex text-xs font-medium text-slate-700 mb-2 items-center gap-2">
                  {t("trials.otherTerms")}
                  <Tooltip content={t("trials.otherTermsTooltip")} />
                </label>
                <input
                  type="text"
                  value={otherTerms}
                  onChange={(e) => setOtherTerms(e.target.value)}
                  placeholder={t("trials.otherTermsPlaceholder")}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Intervention/Treatment */}
              <div>
                <label className="flex text-xs font-medium text-slate-700 mb-2 items-center gap-2">
                  {t("trials.interventionTreatmentHeading")}
                  <Tooltip content={t("trials.interventionTooltip")} />
                </label>
                <input
                  type="text"
                  value={intervention}
                  onChange={(e) => setIntervention(e.target.value)}
                  placeholder={t("trials.interventionPlaceholder")}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2 border-t border-slate-200">
                <Button
                  onClick={() => {
                    search();
                    setShowAdvancedSearch(false);
                  }}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-6 py-2 rounded-lg text-sm font-medium"
                >
                  {t("publications.search")}
                </Button>
                <Button
                  onClick={() => {
                    setEligibilitySex("All");
                    setEligibilityAge("");
                    setAgeRange({ min: "", max: "" });
                    setPhase("");
                    setInstitution("");
                    setOtherTerms("");
                    setIntervention("");
                  }}
                  className="bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  {t("publications.clear")}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Results Area - wrapper for tour targeting */}
          <div data-tour="trials-results-area" className="min-h-[200px]">
            {/* Skeleton Loaders */}
            {(loading || tutorialSampleLoading) && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-lg shadow-md border border-slate-200 animate-pulse"
                  >
                    <div className="p-5">
                      {/* Header Skeleton */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="h-6 w-24 bg-indigo-200 rounded-full"></div>
                        <div className="h-6 w-28 bg-slate-200 rounded-full"></div>
                      </div>

                      {/* Title Skeleton */}
                      <div className="mb-3 space-y-2">
                        <div className="h-5 bg-slate-200 rounded w-full"></div>
                        <div className="h-5 bg-slate-200 rounded w-4/5"></div>
                      </div>

                      {/* Info Skeleton */}
                      <div className="space-y-2 mb-3">
                        <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                        <div className="h-4 bg-indigo-100 rounded w-1/2"></div>
                      </div>

                      {/* Description Button Skeleton */}
                      <div className="mb-3">
                        <div className="h-12 bg-indigo-50 rounded-lg"></div>
                      </div>

                      {/* Buttons Skeleton */}
                      <div className="flex gap-2 mt-4">
                        <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
                        <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                      </div>

                      {/* Contact Buttons Skeleton */}
                      <div className="flex gap-2 mt-3">
                        <div className="flex-1 h-8 bg-indigo-100 rounded-lg"></div>
                        <div className="flex-1 h-8 bg-slate-100 rounded-lg"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Results - show tutorial sample or real results */}
            {!loading &&
              (results.length > 0 || tutorialSampleResults.length > 0) && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(tutorialSampleResults.length > 0
                    ? tutorialSampleResults
                    : results
                  ).map((trial, cardIdx) => {
                      const itemId = trial.id || trial._id;
                      const isFirstCard = cardIdx === 0;
                      return (
                        <div
                          key={itemId}
                          className="bg-white rounded-xl shadow-sm border transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden flex flex-col h-full animate-fade-in"
                          style={{
                            borderColor: trial.isRead
                              ? "rgba(147, 51, 234, 0.4)" // Purple for read
                              : "rgba(59, 130, 246, 0.4)", // Blue for unread
                            animationDelay: `${cardIdx * 50}ms`,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow =
                              "0 10px 15px -3px rgba(47, 60, 150, 0.1), 0 4px 6px -2px rgba(47, 60, 150, 0.05)";
                            e.currentTarget.style.borderColor = trial.isRead
                              ? "rgba(147, 51, 234, 0.6)" // Darker purple on hover
                              : "rgba(59, 130, 246, 0.6)"; // Darker blue on hover
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow =
                              "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
                            e.currentTarget.style.borderColor = trial.isRead
                              ? "rgba(147, 51, 234, 0.4)" // Purple for read
                              : "rgba(59, 130, 246, 0.4)"; // Blue for unread
                          }}
                        >
                          <div className="p-5 flex flex-col flex-grow">
                            {/* Match Progress Bar */}
                            {trial.matchPercentage !== undefined && (
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <TrendingUp
                                      className="w-4 h-4"
                                      style={{ color: "#2F3C96" }}
                                    />
                                    <span
                                      className="text-sm font-bold"
                                      style={{ color: "#2F3C96" }}
                                    >
                                      {t("trials.matchPercent", {
                                        pct: trial.matchPercentage,
                                      })}
                                    </span>
                                    {/* Info Icon with Tooltip */}
                                    <div className="relative group">
                                      <Info
                                        className="w-4 h-4 cursor-help transition-opacity hover:opacity-70"
                                        style={{ color: "#2F3C96" }}
                                      />
                                      {/* Tooltip */}
                                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                                        <div className="font-semibold mb-1">
                                          {t("trials.matchRelevance")}
                                        </div>
                                        <div className="text-gray-300 leading-relaxed">
                                          {trial.matchExplanation ||
                                            t("trials.matchExplanationDefault", {
                                              pct: trial.matchPercentage,
                                            })}
                                        </div>
                                        {/* Tooltip arrow */}
                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                                      </div>
                                    </div>
                                  </div>
                                  {trial.status && (
                                    <span
                                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                        trial.status,
                                      )}`}
                                    >
                                      {t(`trials.statusLabels.${trial.status}`, {
                                        defaultValue: trial.status.replace(
                                          /_/g,
                                          " ",
                                        ),
                                      })}
                                    </span>
                                  )}
                                </div>
                                {/* Progress Bar */}
                                <div
                                  className="w-full h-2.5 rounded-full overflow-hidden"
                                  style={{
                                    backgroundColor: "rgba(208, 196, 226, 0.3)",
                                  }}
                                >
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${trial.matchPercentage}%`,
                                      background:
                                        "linear-gradient(90deg, #2F3C96, #253075)",
                                    }}
                                  ></div>
                                </div>
                              </div>
                            )}

                            {/* Trial Title */}
                            <div className="mb-4">
                              <h3
                                className="text-lg font-bold mb-0 line-clamp-3 leading-snug flex items-start gap-2"
                                style={{
                                  color: trial.isRead
                                    ? "#D0C4E2" // Light purple for read
                                    : "#2F3C96", // Default blue for unread
                                }}
                              >
                                {trial.isRead && (
                                  <CheckCircle
                                    className="w-4 h-4 mt-1 shrink-0"
                                    style={{ color: "#D0C4E2" }}
                                  />
                                )}
                                <span className="flex-1">
                                  {researcherTitleMode
                                    ? trial.title || t("trials.untitledTrial")
                                    : (simplifyTitles &&
                                        simplifiedTrialSummaries.get(
                                          trial.title,
                                        )) ||
                                      trial.simplifiedTitle ||
                                      trial.title ||
                                      t("trials.untitledTrial")}
                                </span>
                              </h3>
                              {trial.sourceRegistry === "cura-link" &&
                                trial.piOnPlatform?.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                                    <span
                                      className="text-xs font-medium"
                                      style={{ color: "#787878" }}
                                    >
                                      {t("trials.piOnPlatform")}
                                    </span>
                                    {trial.piOnPlatform
                                      .slice(0, 3)
                                      .map((pi) => (
                                        <Link
                                          key={pi.userId}
                                          to={pi.profilePath}
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-xs font-semibold underline-offset-2 hover:underline"
                                          style={{ color: "#2F3C96" }}
                                        >
                                          {pi.displayName}
                                        </Link>
                                      ))}
                                  </div>
                                )}
                            </div>

                            {/* Description/Details Preview */}
                            {(trial.description ||
                              trial.conditionDescription) && (
                              <div className="mb-4 flex-grow">
                                <button
                                  onClick={() => openDetailsModal(trial)}
                                  {...(isFirstCard && {
                                    "data-tour": "trials-view-details-btn",
                                  })}
                                  className="w-full text-left text-sm py-2 px-3 rounded-lg transition-all duration-200 border group"
                                  style={{
                                    backgroundColor: "rgba(208, 196, 226, 0.2)",
                                    borderColor: "rgba(47, 60, 150, 0.2)",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      "rgba(208, 196, 226, 0.3)";
                                    e.currentTarget.style.borderColor =
                                      "rgba(47, 60, 150, 0.3)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      "rgba(208, 196, 226, 0.2)";
                                    e.currentTarget.style.borderColor =
                                      "rgba(47, 60, 150, 0.2)";
                                  }}
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div
                                        className="transition-colors duration-200"
                                        style={{ color: "#787878" }}
                                      >
                                        <span className="line-clamp-2">
                                          {trial.description ||
                                            trial.conditionDescription ||
                                            t("trials.viewDetailsPlaceholder")}
                                        </span>
                                      </div>
                                      <div
                                        className="mt-1.5 flex items-center gap-1 font-medium transition-all duration-200"
                                        style={{ color: "#2F3C96" }}
                                      >
                                        <span>{t("trials.readMoreDetails")}</span>
                                        <span className="inline-block group-hover:translate-x-0.5 transition-transform duration-200">
                                          →
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              </div>
                            )}

                            {/* Spacer for trials without description */}
                            {!trial.description &&
                              !trial.conditionDescription && (
                                <div className="flex-grow"></div>
                              )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 mt-auto">
                              <button
                                onClick={() => generateSummary(trial)}
                                {...(isFirstCard && {
                                  "data-tour": "trials-understand-btn",
                                })}
                                className="flex-1 flex items-center justify-center gap-2 py-2 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
                                style={{
                                  background:
                                    "linear-gradient(135deg, #2F3C96, #253075)",
                                }}
                                onMouseEnter={(e) => {
                                  if (!e.target.disabled) {
                                    e.target.style.background =
                                      "linear-gradient(135deg, #253075, #1C2454)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!e.target.disabled) {
                                    e.target.style.background =
                                      "linear-gradient(135deg, #2F3C96, #253075)";
                                  }
                                }}
                              >
                                {t("publications.simplify")}
                              </button>
                              <button
                                onClick={() => favorite(trial)}
                                disabled={favoritingItems.has(
                                  getFavoriteKey(trial),
                                )}
                                {...(isFirstCard && {
                                  "data-tour": "trials-favourites-btn",
                                })}
                                className={`p-2 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                  favorites.some(
                                    (fav) =>
                                      fav.type === "trial" &&
                                      (fav.item?.id === itemId ||
                                        fav.item?._id === itemId),
                                  )
                                    ? "bg-red-50 border-red-200 text-red-500"
                                    : ""
                                }`}
                                style={
                                  !favorites.some(
                                    (fav) =>
                                      fav.type === "trial" &&
                                      (fav.item?.id === itemId ||
                                        fav.item?._id === itemId),
                                  )
                                    ? {
                                        backgroundColor:
                                          "rgba(208, 196, 226, 0.2)",
                                        borderColor: "rgba(208, 196, 226, 0.3)",
                                        color: "#787878",
                                      }
                                    : {}
                                }
                                onMouseEnter={(e) => {
                                  if (
                                    !favorites.some(
                                      (fav) =>
                                        fav.type === "trial" &&
                                        (fav.item?.id === itemId ||
                                          fav.item?._id === itemId),
                                    ) &&
                                    !e.currentTarget.disabled
                                  ) {
                                    e.currentTarget.style.backgroundColor =
                                      "rgba(208, 196, 226, 0.3)";
                                    e.currentTarget.style.color = "#dc2626";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (
                                    !favorites.some(
                                      (fav) =>
                                        fav.type === "trial" &&
                                        (fav.item?.id === itemId ||
                                          fav.item?._id === itemId),
                                    )
                                  ) {
                                    e.currentTarget.style.backgroundColor =
                                      "rgba(208, 196, 226, 0.2)";
                                    e.currentTarget.style.color = "#787878";
                                  }
                                }}
                              >
                                {favoritingItems.has(getFavoriteKey(trial)) ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Heart
                                    className={`w-4 h-4 ${
                                      favorites.some(
                                        (fav) =>
                                          fav.type === "trial" &&
                                          (fav.item?.id === itemId ||
                                            fav.item?._id === itemId),
                                      )
                                        ? "fill-current"
                                        : ""
                                    }`}
                                  />
                                )}
                              </button>
                            </div>

                            {/* View Contact Information Button */}
                            <button
                              onClick={() => openContactInfoModal(trial)}
                              {...(isFirstCard && {
                                "data-tour": "trials-contact-btn",
                              })}
                              className="flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-colors mt-3 w-full"
                              style={{
                                color: "#2F3C96",
                                backgroundColor: "rgba(208, 196, 226, 0.2)",
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor =
                                  "rgba(208, 196, 226, 0.3)";
                                e.target.style.color = "#253075";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor =
                                  "rgba(208, 196, 226, 0.2)";
                                e.target.style.color = "#2F3C96";
                              }}
                            >
                              {t("trials.viewContactInformation")}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
          </div>

          {/* Results Count and Pagination (guests and signed-in users) */}
          {!loading && results.length > 0 && (
            <div className="mt-6 flex flex-col items-center gap-4">
              {/* Results Count */}
              <div className="text-sm text-slate-600">
                {t("publications.pageOf", {
                  current: currentPage,
                  total: totalPages.toLocaleString(),
                })}{" "}
                {t("trials.totalResultsInline", {
                  count: totalCount.toLocaleString(),
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    className="px-4 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-50 hover:border-indigo-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("publications.previous")}
                  </button>

                  {/* Page Numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        disabled={loading}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          currentPage === pageNum
                            ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                            : "bg-white border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="px-2 text-indigo-700">...</span>
                      <button
                        onClick={() => goToPage(totalPages)}
                        disabled={loading}
                        className="px-4 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-50 hover:border-indigo-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                    className="px-4 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-50 hover:border-indigo-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("publications.next")}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Sign Up Message for More Results */}
          {!loading &&
            results.length > 0 &&
            !isSignedIn &&
            !GUEST_BROWSE_MODE_ENABLED &&
            totalCount > PUBLICATIONS_AND_TRIALS_PAGE_SIZE && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 p-6 text-center shadow-lg"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-indigo-900">
                      {t("trials.wantMoreTrialsTitle")}
                    </h3>
                  </div>
                  <p className="text-sm text-indigo-700 max-w-md">
                    {t("trials.wantMoreTrialsBody", {
                      count: totalCount || results.length,
                    })}
                  </p>
                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() => navigate("/signin")}
                      className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg"
                    >
                      {t("auth.signIn")}
                    </button>
                    <button
                      onClick={() => navigate("/onboarding")}
                      className="px-6 py-2.5 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-all border-2 border-indigo-200 hover:border-indigo-300"
                    >
                      {t("publications.signUp")}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          {/* Empty State */}
          {!loading && results.length === 0 && !isInitialLoad && (
            <div className="text-center py-12 bg-white rounded-lg shadow-md border border-slate-200 animate-fade-in">
              <Beaker className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-800 mb-1">
                {t("trials.emptyTitle")}
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                {t("trials.emptyHint")}
              </p>
            </div>
          )}
        </div>

        {/* Summary Modal */}
        <Modal
          isOpen={summaryModal.open}
          onClose={() => {
            setSummaryModal({
              open: false,
              title: "",
              type: "",
              summary: "",
              loading: false,
            });
            setSummaryTrial(null);
            setHasSimplifiedFurther(false);
          }}
          title={t("publications.keyInsights")}
        >
          <div className="space-y-4">
            <div
              className="pb-4 border-b"
              style={{ borderColor: "rgba(208, 196, 226, 0.5)" }}
            >
              <div className="mb-2">
                <h4 className="font-bold text-lg" style={{ color: "#2F3C96" }}>
                  {summaryModal.title}
                </h4>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span
                  className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: "rgba(232, 224, 239, 0.8)",
                    color: "#2F3C96",
                  }}
                >
                  {t("trials.clinicalTrialBadge")}
                </span>
                {!researcherTitleMode &&
                  summaryModal.type === "trial" &&
                  !summaryModal.loading &&
                  summaryTrial &&
                  !hasSimplifiedFurther && (
                    <button
                      type="button"
                      onClick={simplifyTrialFurther}
                      className="inline-block px-3 py-1 rounded-full text-xs font-semibold border border-indigo-300 shadow-sm hover:shadow-md transition-all cursor-pointer"
                      style={{
                        backgroundColor: "rgba(232, 224, 239, 0.9)",
                        color: "#2F3C96",
                      }}
                    >
                      {t("publications.simplifyFurther")}
                    </button>
                  )}
              </div>
            </div>
            {summaryModal.loading ? (
              <div className="space-y-4 py-4">
                <div
                  className="flex items-center gap-2 mb-4"
                  style={{ color: "#2F3C96" }}
                >
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  <span className="text-sm font-medium">
                    {t("publications.preparingKeyInsights")}
                  </span>
                </div>
                <div className="animate-pulse space-y-3">
                  <div
                    className="h-4 rounded"
                    style={{ backgroundColor: "rgba(232, 224, 239, 0.5)" }}
                  ></div>
                  <div
                    className="h-4 rounded w-5/6"
                    style={{ backgroundColor: "rgba(232, 224, 239, 0.5)" }}
                  ></div>
                  <div
                    className="h-4 rounded w-4/6"
                    style={{ backgroundColor: "rgba(232, 224, 239, 0.5)" }}
                  ></div>
                  <div
                    className="h-4 rounded w-full mt-2"
                    style={{ backgroundColor: "rgba(232, 224, 239, 0.5)" }}
                  ></div>
                  <div
                    className="h-4 rounded w-5/6"
                    style={{ backgroundColor: "rgba(232, 224, 239, 0.5)" }}
                  ></div>
                  <div
                    className="h-4 rounded w-3/4"
                    style={{ backgroundColor: "rgba(232, 224, 239, 0.5)" }}
                  ></div>
                </div>
              </div>
            ) : summaryModal.type === "trial" &&
              summaryModal.summary &&
              typeof summaryModal.summary === "object" &&
              summaryModal.summary.structured ? (
              // Structured Trial Summary (like Patient Dashboard)
              <div className="space-y-4">
                {/* General Summary */}
                {summaryModal.summary.generalSummary && (
                  <div
                    className="bg-white rounded-lg p-4 border-l-4 shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderLeftColor: "#2F3C96" }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "rgba(232, 224, 239, 0.6)" }}
                      >
                        <Info
                          className="w-4 h-4"
                          style={{ color: "#2F3C96" }}
                        />
                      </div>
                      <div className="flex-1">
                        <h5
                          className="font-semibold text-sm mb-2"
                          style={{ color: "#2F3C96" }}
                        >
                          {t("trials.overview")}
                        </h5>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {summaryModal.summary.generalSummary}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* What Happens (Procedures, Schedule, Treatments) */}
                {summaryModal.summary.procedures && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-green-100">
                        <Activity className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h5
                          className="font-semibold text-sm mb-2 flex items-center gap-2"
                          style={{ color: "#2F3C96" }}
                        >
                          <span className="w-6 h-6 text-white rounded-full flex items-center justify-center text-xs font-bold bg-green-500">
                            1
                          </span>
                          {t("trials.whatHappens")}
                        </h5>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {summaryModal.summary.procedures}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Potential Risks and Benefits */}
                {summaryModal.summary.risksBenefits && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-amber-100">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h5
                          className="font-semibold text-sm mb-2 flex items-center gap-2"
                          style={{ color: "#2F3C96" }}
                        >
                          <span className="w-6 h-6 text-white rounded-full flex items-center justify-center text-xs font-bold bg-amber-500">
                            2
                          </span>
                          {t("trials.risksBenefits")}
                        </h5>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {summaryModal.summary.risksBenefits}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* What Participants Need to Do */}
                {summaryModal.summary.participantRequirements && (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-purple-100">
                        <CheckCircle className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h5
                          className="font-semibold text-sm mb-2 flex items-center gap-2"
                          style={{ color: "#2F3C96" }}
                        >
                          <span className="w-6 h-6 text-white rounded-full flex items-center justify-center text-xs font-bold bg-purple-500">
                            3
                          </span>
                          {t("trials.participantRequirements")}
                        </h5>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {summaryModal.summary.participantRequirements}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Fallback for non-structured summaries (old format)
              <div className="py-2">
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: "#787878" }}
                >
                  {typeof summaryModal.summary === "object"
                    ? summaryModal.summary.summary ||
                      t("publications.summaryUnavailable")
                    : summaryModal.summary ||
                      t("publications.summaryUnavailable")}
                </p>
              </div>
            )}
          </div>
        </Modal>

        {/* Details Modal */}
        <Modal
          isOpen={detailsModal.open}
          onClose={closeDetailsModal}
          title={t("trials.modalDetailsTitle")}
        >
          {detailsModal.loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2
                className="w-8 h-8 animate-spin"
                style={{ color: "#2F3C96" }}
              />
              <span className="ml-3 text-sm" style={{ color: "#787878" }}>
                {t("trials.loadingDetails")}
              </span>
            </div>
          ) : detailsModal.trial ? (
            <div className="flex flex-col h-full -mx-6 -my-6">
              <div className="space-y-6 flex-1 overflow-y-auto px-6 pt-6 pb-24">
                {/* Header */}
                <div
                  className="pb-4 border-b sticky top-0 bg-white z-10 -mt-6 pt-6 -mx-6 px-6"
                  style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Beaker className="w-5 h-5" style={{ color: "#2F3C96" }} />
                    <h4
                      className="font-bold text-lg"
                      style={{ color: "#2F3C96" }}
                    >
                      {researcherTitleMode
                        ? detailsModal.trial.title
                        : detailsModal.trial.simplifiedTitle ||
                          detailsModal.trial.simplifiedDetails?.title ||
                          detailsModal.trial.title}
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {detailsModal.trial.sourceRegistry !== "cura-link" && (
                      <span
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border"
                        style={{
                          backgroundColor: "rgba(209, 211, 229, 1)",
                          color: "#253075",
                          borderColor: "rgba(163, 167, 203, 1)",
                        }}
                      >
                        {detailsModal.trial._id ||
                          detailsModal.trial.id ||
                          "N/A"}
                      </span>
                    )}
                    {detailsModal.trial.status && (
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          detailsModal.trial.status,
                        )}`}
                      >
                        {t(
                          `trials.statusLabels.${detailsModal.trial.status}`,
                          {
                            defaultValue:
                              detailsModal.trial.status.replace(/_/g, " "),
                          },
                        )}
                      </span>
                    )}
                    {detailsModal.trial.phase && (
                      <span
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border"
                        style={{
                          backgroundColor: "#F5F5F5",
                          color: "#787878",
                          borderColor: "rgba(232, 232, 232, 1)",
                        }}
                      >
                        {t("trialDetails.phaseLabel", {
                          phase: detailsModal.trial.phase,
                        })}
                      </span>
                    )}
                    {detailsModal.trial.sourceRegistry && (
                      <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border bg-slate-50 text-slate-600 border-slate-200">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        {getTrialSourceLabel(detailsModal.trial)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Principal investigator — UCLA curated trials */}
                {detailsModal.trial.sourceRegistry === "cura-link" &&
                  (detailsModal.trial.principalInvestigator ||
                    (detailsModal.trial.piOnPlatform &&
                      detailsModal.trial.piOnPlatform.length > 0) ||
                    detailsModal.trial.viewerPiClaim?.canClaim ||
                    detailsModal.trial.viewerPiClaim?.claimed) && (
                    <div
                      className="rounded-xl p-5 border shadow-sm mt-6"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(245, 242, 248, 1), rgba(232, 233, 242, 1))",
                        borderColor: "#D0C4E2",
                      }}
                    >
                      <h4
                        className="font-bold mb-3 flex items-center gap-2 text-base"
                        style={{ color: "#2F3C96" }}
                      >
                        <User
                          className="w-5 h-5"
                          style={{ color: "#2F3C96" }}
                        />
                        {t("trials.principalInvestigator")}
                      </h4>
                      {detailsModal.trial.principalInvestigator && (
                        <p
                          className="text-sm leading-relaxed whitespace-pre-line mb-3"
                          style={{ color: "#787878" }}
                        >
                          {detailsModal.trial.principalInvestigator}
                        </p>
                      )}
                      {detailsModal.trial.piOnPlatform &&
                        detailsModal.trial.piOnPlatform.length > 0 && (
                          <div className="space-y-2">
                            <p
                              className="text-xs font-semibold uppercase tracking-wide"
                              style={{ color: "#787878" }}
                            >
                              {t("trials.onCollabiora")}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {detailsModal.trial.piOnPlatform.map((pi) => (
                                <Link
                                  key={pi.userId}
                                  to={pi.profilePath}
                                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors bg-white hover:bg-indigo-50"
                                  style={{
                                    color: "#2F3C96",
                                    borderColor: "#D0C4E2",
                                  }}
                                >
                                  {pi.picture ? (
                                    <img
                                      src={pi.picture}
                                      alt=""
                                      className="w-7 h-7 rounded-full object-cover"
                                    />
                                  ) : (
                                    <User className="w-4 h-4 shrink-0" />
                                  )}
                                  <span>{pi.displayName}</span>
                                  {pi.claimed && (
                                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                      {t("trials.verifiedBadge")}
                                    </span>
                                  )}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      {researcherTitleMode &&
                        detailsModal.trial.viewerPiClaim?.canClaim && (
                          <button
                            type="button"
                            disabled={claimingPi}
                            onClick={() =>
                              claimCuratedPiAsMe(detailsModal.trial)
                            }
                            className="mt-4 w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60"
                            style={{ backgroundColor: "#2F3C96" }}
                          >
                            {claimingPi
                              ? t("trials.linking")
                              : t("trials.claimPiButton")}
                          </button>
                        )}
                      {researcherTitleMode &&
                        detailsModal.trial.viewerPiClaim?.linked &&
                        detailsModal.trial.viewerPiClaim?.claimed && (
                          <p
                            className="mt-3 text-sm font-medium"
                            style={{ color: "#059669" }}
                          >
                            {t("trials.linkedToProfile")}
                          </p>
                        )}
                    </div>
                  )}

                {/* 1. Study Purpose */}
                {(detailsModal.trial.simplifiedDetails?.studyPurpose ||
                  detailsModal.trial.description ||
                  detailsModal.trial.conditionDescription) && (
                  <div
                    className="bg-gradient-to-br rounded-xl p-5 mt-10 border shadow-sm"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(232, 233, 242, 1), rgba(245, 242, 248, 1))",
                      borderColor: "rgba(163, 167, 203, 1)",
                    }}
                  >
                    <h4
                      className="font-bold mb-3 flex items-center gap-2 text-base"
                      style={{ color: "#2F3C96" }}
                    >
                      <FileText
                        className="w-5 h-5"
                        style={{ color: "#2F3C96" }}
                      />
                      {t("trials.studyPurpose")}
                    </h4>
                    <p
                      className="text-sm leading-relaxed whitespace-pre-line"
                      style={{ color: "#787878" }}
                    >
                      {detailsModal.trial.simplifiedDetails?.studyPurpose ||
                        detailsModal.trial.description ||
                        detailsModal.trial.conditionDescription}
                    </p>
                  </div>
                )}

                {/* 2. Who Can Join (Eligibility) */}
                {(detailsModal.trial.simplifiedDetails?.eligibilityCriteria ||
                  detailsModal.trial.eligibility) && (
                  <div
                    className="bg-gradient-to-br rounded-xl p-5 border shadow-sm"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(245, 242, 248, 1), rgba(232, 224, 239, 1))",
                      borderColor: "#D0C4E2",
                    }}
                  >
                    <h4
                      className="font-bold mb-4 flex items-center gap-2 text-base"
                      style={{ color: "#2F3C96" }}
                    >
                      <ListChecks
                        className="w-5 h-5"
                        style={{ color: "#2F3C96" }}
                      />
                      {t("trials.whoCanJoin")}
                    </h4>

                    {/* Show simplified summary if available */}
                    {detailsModal.trial.simplifiedDetails?.eligibilityCriteria
                      ?.summary && (
                      <div
                        className="bg-white rounded-lg p-4 border mb-4"
                        style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                      >
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {
                            detailsModal.trial.simplifiedDetails
                              .eligibilityCriteria.summary
                          }
                        </p>
                      </div>
                    )}

                    {/* Quick Eligibility Info Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      {/* Gender */}
                      <div
                        className="bg-white rounded-lg p-3 border shadow-sm"
                        style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Users
                            className="w-4 h-4"
                            style={{ color: "#2F3C96" }}
                          />
                          <span
                            className="text-xs font-semibold uppercase tracking-wide"
                            style={{ color: "#787878" }}
                          >
                            Gender
                          </span>
                        </div>
                        <p
                          className="text-sm font-bold"
                          style={{ color: "#2F3C96" }}
                        >
                          {detailsModal.trial.simplifiedDetails
                            ?.eligibilityCriteria?.gender ||
                            detailsModal.trial.eligibility?.gender ||
                            "All"}
                        </p>
                      </div>

                      {/* Age Range */}
                      <div
                        className="bg-white rounded-lg p-3 border shadow-sm"
                        style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Calendar
                            className="w-4 h-4"
                            style={{ color: "#2F3C96" }}
                          />
                          <span
                            className="text-xs font-semibold uppercase tracking-wide"
                            style={{ color: "#787878" }}
                          >
                            Age Range
                          </span>
                        </div>
                        <p
                          className="text-sm font-bold"
                          style={{ color: "#2F3C96" }}
                        >
                          {detailsModal.trial.simplifiedDetails
                            ?.eligibilityCriteria?.ageRange ||
                            (detailsModal.trial.eligibility?.minimumAge !==
                              "Not specified" &&
                            detailsModal.trial.eligibility?.minimumAge
                              ? detailsModal.trial.eligibility.minimumAge
                              : "N/A") +
                              " - " +
                              (detailsModal.trial.eligibility?.maximumAge !==
                                "Not specified" &&
                              detailsModal.trial.eligibility?.maximumAge
                                ? detailsModal.trial.eligibility.maximumAge
                                : "N/A")}
                        </p>
                      </div>

                      {/* Healthy Volunteers */}
                      <div
                        className="bg-white rounded-lg p-3 border shadow-sm"
                        style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <CheckCircle
                            className="w-4 h-4"
                            style={{ color: "#2F3C96" }}
                          />
                          <span
                            className="text-xs font-semibold uppercase tracking-wide"
                            style={{ color: "#787878" }}
                          >
                            Volunteers
                          </span>
                        </div>
                        <p
                          className="text-sm font-bold"
                          style={{ color: "#2F3C96" }}
                        >
                          {detailsModal.trial.simplifiedDetails
                            ?.eligibilityCriteria?.volunteers ||
                            detailsModal.trial.eligibility?.healthyVolunteers ||
                            "Unknown"}
                        </p>
                      </div>
                    </div>

                    {/* Detailed Eligibility Criteria - Show simplified if available */}
                    {(detailsModal.trial.simplifiedDetails?.eligibilityCriteria
                      ?.detailedCriteria ||
                      (detailsModal.trial.eligibility?.criteria &&
                        detailsModal.trial.eligibility.criteria !==
                          "Not specified")) &&
                      (() => {
                        const criteriaText =
                          detailsModal.trial.simplifiedDetails
                            ?.eligibilityCriteria?.detailedCriteria ||
                          detailsModal.trial.eligibility.criteria;
                        const { inclusion, exclusion, hasBoth } =
                          parseEligibilityCriteria(criteriaText);

                        return (
                          <div
                            className="mt-4 pt-4 border-t"
                            style={{ borderColor: "#D0C4E2" }}
                          >
                            {/* Inclusion Criteria */}
                            {hasBoth && inclusion && (
                              <div className="mb-4">
                                <h5
                                  className="font-semibold mb-3 flex items-center gap-2 text-sm"
                                  style={{ color: "#2F3C96" }}
                                >
                                  <Info
                                    className="w-4 h-4"
                                    style={{ color: "#2F3C96" }}
                                  />
                                  Required criteria to participate in study
                                </h5>
                                <div
                                  className="bg-white rounded-lg p-4 border overflow-y-auto"
                                  style={{
                                    borderColor: "rgba(232, 224, 239, 1)",
                                    maxHeight: "200px",
                                  }}
                                >
                                  <p
                                    className="text-sm leading-relaxed whitespace-pre-line"
                                    style={{ color: "#787878" }}
                                  >
                                    {inclusion}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Exclusion Criteria */}
                            {hasBoth && exclusion && (
                              <div>
                                <h5
                                  className="font-semibold mb-3 flex items-center gap-2 text-sm"
                                  style={{ color: "#2F3C96" }}
                                >
                                  <Info
                                    className="w-4 h-4"
                                    style={{ color: "#2F3C96" }}
                                  />
                                  Criteria that might exclude you from the study
                                </h5>
                                <div
                                  className="bg-white rounded-lg p-4 border overflow-y-auto"
                                  style={{
                                    borderColor: "rgba(232, 224, 239, 1)",
                                    maxHeight: "200px",
                                  }}
                                >
                                  <p
                                    className="text-sm leading-relaxed whitespace-pre-line"
                                    style={{ color: "#787878" }}
                                  >
                                    {exclusion}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Fallback: If no split was found, show as single section */}
                            {!hasBoth && inclusion && (
                              <div>
                                <h5
                                  className="font-semibold mb-3 flex items-center gap-2 text-sm"
                                  style={{ color: "#2F3C96" }}
                                >
                                  <Info
                                    className="w-4 h-4"
                                    style={{ color: "#2F3C96" }}
                                  />
                                  Required criteria to participate in study
                                </h5>
                                <div
                                  className="bg-white rounded-lg p-4 border overflow-y-auto"
                                  style={{
                                    borderColor: "rgba(232, 224, 239, 1)",
                                    maxHeight: "200px",
                                  }}
                                >
                                  <p
                                    className="text-sm leading-relaxed whitespace-pre-line"
                                    style={{ color: "#787878" }}
                                  >
                                    {inclusion}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                    {/* Study Population Description */}
                    {detailsModal.trial.eligibility?.population && (
                      <div
                        className="mt-4 pt-4 border-t"
                        style={{ borderColor: "#D0C4E2" }}
                      >
                        <h5
                          className="font-semibold mb-3 flex items-center gap-2 text-sm"
                          style={{ color: "#2F3C96" }}
                        >
                          <Users
                            className="w-4 h-4"
                            style={{ color: "#2F3C96" }}
                          />
                          Study Population
                        </h5>
                        <div
                          className="bg-white rounded-lg p-4 border"
                          style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                        >
                          <p
                            className="text-sm leading-relaxed whitespace-pre-line"
                            style={{ color: "#787878" }}
                          >
                            {detailsModal.trial.eligibility.population}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Conditions Studied - Show simplified if available */}
                {detailsModal.trial.sourceRegistry !== "isrctn" &&
                  (detailsModal.trial.simplifiedDetails?.conditionsStudied ||
                    getRenderableConditions(detailsModal.trial).length > 0) && (
                    <div
                      className="bg-gradient-to-br rounded-xl p-5 border shadow-sm"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(232, 233, 242, 1), rgba(245, 242, 248, 1))",
                        borderColor: "rgba(163, 167, 203, 1)",
                      }}
                    >
                      <h4
                        className="font-bold mb-3 flex items-center gap-2 text-base"
                        style={{ color: "#2F3C96" }}
                      >
                        <Activity
                          className="w-5 h-5"
                          style={{ color: "#2F3C96" }}
                        />
                        Conditions Studied
                      </h4>
                      {detailsModal.trial.simplifiedDetails
                        ?.conditionsStudied ? (
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {(() => {
                            const c =
                              detailsModal.trial.simplifiedDetails
                                .conditionsStudied;
                            if (typeof c === "string") return c;
                            if (Array.isArray(c)) return c.join(", ");
                            return "";
                          })()}
                        </p>
                      ) : getRenderableConditions(detailsModal.trial).length >
                        0 ? (
                        <div className="flex flex-wrap gap-2">
                          {getRenderableConditions(detailsModal.trial).map(
                            (condition, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1.5 bg-white text-sm font-medium rounded-lg border"
                                style={{
                                  color: "#2F3C96",
                                  borderColor: "#D0C4E2",
                                }}
                              >
                                {condition}
                              </span>
                            ),
                          )}
                        </div>
                      ) : (
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          Not specified
                        </p>
                      )}
                    </div>
                  )}

                {/* What to Expect - Show if simplified details available */}
                {detailsModal.trial.simplifiedDetails?.whatToExpect && (
                  <div
                    className="bg-gradient-to-br rounded-xl p-5 border shadow-sm"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(245, 242, 248, 1), rgba(232, 224, 239, 1))",
                      borderColor: "#D0C4E2",
                    }}
                  >
                    <h4
                      className="font-bold mb-3 flex items-center gap-2 text-base"
                      style={{ color: "#2F3C96" }}
                    >
                      <Info className="w-5 h-5" style={{ color: "#2F3C96" }} />
                      What to Expect
                    </h4>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "#787878" }}
                    >
                      {detailsModal.trial.simplifiedDetails.whatToExpect}
                    </p>
                  </div>
                )}

                {/* 3. Contact Information — contacts and/or site location emails (curated / collabiora) */}
                {collectTrialContactEmails(detailsModal.trial).length > 0 && (
                  <div
                    className="bg-gradient-to-br rounded-xl p-5 border shadow-sm"
                    style={{
                      background: "linear-gradient(135deg, #F5F5F5, #F5F5F5)",
                      borderColor: "rgba(232, 232, 232, 1)",
                    }}
                  >
                    <h4
                      className="font-bold mb-4 flex items-center gap-2 text-base"
                      style={{ color: "#2F3C96" }}
                    >
                      <Mail className="w-5 h-5" style={{ color: "#787878" }} />
                      Contact Information
                    </h4>
                    <div className="space-y-3">
                      {detailsModal.trial.contacts?.some((c) =>
                        c?.email?.trim(),
                      )
                        ? detailsModal.trial.contacts.map((contact, i) => (
                            <div
                              key={i}
                              className="bg-white rounded-lg p-4 border shadow-sm"
                              style={{ borderColor: "rgba(232, 232, 232, 1)" }}
                            >
                              {contact.name && (
                                <div
                                  className="font-bold mb-3 text-base flex items-center gap-2"
                                  style={{ color: "#2F3C96" }}
                                >
                                  <User
                                    className="w-4 h-4"
                                    style={{ color: "#787878" }}
                                  />
                                  {contact.name}
                                </div>
                              )}
                              {contact.role && (
                                <div className="mb-2">
                                  <span
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                                    style={{
                                      color: "#2F3C96",
                                      borderColor: "#D0C4E2",
                                      backgroundColor:
                                        "rgba(208, 196, 226, 0.15)",
                                    }}
                                  >
                                    {contact.role}
                                  </span>
                                </div>
                              )}
                              <div className="space-y-2">
                                {contact.email && (
                                  <a
                                    href={`mailto:${contact.email}`}
                                    className="flex items-center gap-2 text-sm font-medium transition-colors"
                                    style={{ color: "#2F3C96" }}
                                    onMouseEnter={(e) =>
                                      (e.target.style.color = "#253075")
                                    }
                                    onMouseLeave={(e) =>
                                      (e.target.style.color = "#2F3C96")
                                    }
                                  >
                                    <Mail className="w-4 h-4" />
                                    {contact.email}
                                  </a>
                                )}
                                {contact.phone && (
                                  <div
                                    className="flex items-center gap-2 text-sm"
                                    style={{ color: "#787878" }}
                                  >
                                    <span style={{ color: "#2F3C96" }}>📞</span>
                                    <a
                                      href={`tel:${contact.phone}`}
                                      className="transition-colors"
                                      style={{ color: "#787878" }}
                                      onMouseEnter={(e) =>
                                        (e.target.style.color = "#2F3C96")
                                      }
                                      onMouseLeave={(e) =>
                                        (e.target.style.color = "#787878")
                                      }
                                    >
                                      {contact.phone}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        : (detailsModal.trial.locations || [])
                            .filter((loc) => loc?.contactEmail?.trim())
                            .map((loc, idx) => (
                              <div
                                key={`loc-email-${idx}`}
                                className="bg-white rounded-lg p-4 border shadow-sm"
                                style={{
                                  borderColor: "rgba(232, 232, 232, 1)",
                                }}
                              >
                                {loc.facility && (
                                  <div
                                    className="font-bold mb-3 text-base flex items-center gap-2"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    <MapPin
                                      className="w-4 h-4"
                                      style={{ color: "#787878" }}
                                    />
                                    {loc.facility}
                                  </div>
                                )}
                                <div className="space-y-2">
                                  <a
                                    href={`mailto:${loc.contactEmail}`}
                                    className="flex items-center gap-2 text-sm font-medium transition-colors"
                                    style={{ color: "#2F3C96" }}
                                    onMouseEnter={(e) =>
                                      (e.target.style.color = "#253075")
                                    }
                                    onMouseLeave={(e) =>
                                      (e.target.style.color = "#2F3C96")
                                    }
                                  >
                                    <Mail className="w-4 h-4" />
                                    {loc.contactEmail}
                                  </a>
                                </div>
                              </div>
                            ))}
                    </div>
                  </div>
                )}

                {/* Generated Message Section */}
                {detailsModal.generatedMessage && (
                  <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-indigo-900">
                        Generated Message
                      </label>
                      <button
                        onClick={copyTrialDetailsMessage}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition-all"
                      >
                        {detailsModal.copied ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-indigo-100">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {detailsModal.generatedMessage}
                      </p>
                    </div>
                  </div>
                )}

                {/* Help me contact Trial Moderator — any contact or site location email (incl. curated) */}
                {collectTrialContactEmails(detailsModal.trial).length > 0 && (
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        setContactStepsModal({
                          open: true,
                          trial: detailsModal.trial,
                          currentStep: 1,
                          generatedEmail: "",
                          generating: false,
                          copied: false,
                        });
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all w-full"
                      style={{
                        color: "#2F3C96",
                        backgroundColor: "rgba(208, 196, 226, 0.2)",
                        border: "1px solid rgba(208, 196, 226, 0.3)",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor =
                          "rgba(208, 196, 226, 0.3)";
                        e.target.style.color = "#253075";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor =
                          "rgba(208, 196, 226, 0.2)";
                        e.target.style.color = "#2F3C96";
                      }}
                    >
                      <Info className="w-4 h-4" />
                      Help me contact Trial Moderator
                    </button>
                  </div>
                )}

                {/* Additional Information */}
                <div
                  className="space-y-4 pt-4 border-t"
                  style={{ borderColor: "rgba(232, 232, 232, 1)" }}
                >
                  {/* Conditions */}
                  {detailsModal.trial.sourceRegistry !== "isrctn" &&
                    getRenderableConditions(detailsModal.trial).length > 0 && (
                      <div
                        className="rounded-xl p-4 border"
                        style={{
                          backgroundColor: "rgba(245, 242, 248, 1)",
                          borderColor: "#D0C4E2",
                        }}
                      >
                        <h4
                          className="font-bold mb-3 flex items-center gap-2 text-sm"
                          style={{ color: "#2F3C96" }}
                        >
                          <Activity
                            className="w-4 h-4"
                            style={{ color: "#2F3C96" }}
                          />
                          Conditions Studied
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {getRenderableConditions(detailsModal.trial).map(
                            (condition, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1.5 bg-white text-sm font-medium rounded-lg border shadow-sm"
                                style={{
                                  color: "#2F3C96",
                                  borderColor: "#D0C4E2",
                                }}
                              >
                                {condition}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  {/* Location */}
                  {detailsModal.trial.locations &&
                  detailsModal.trial.locations.length > 0 ? (
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                      <h4
                        className="font-bold mb-3 flex items-center gap-2 text-sm"
                        style={{ color: "#2F3C96" }}
                      >
                        <MapPin className="w-4 h-4 text-green-600" />
                        Trial Locations ({detailsModal.trial.locations.length})
                      </h4>
                      <div className="space-y-2">
                        {detailsModal.trial.locations
                          .slice(0, 3)
                          .map((loc, idx) => (
                            <div
                              key={idx}
                              className="text-sm"
                              style={{ color: "#787878" }}
                            >
                              {loc.facility && (
                                <span
                                  className="font-semibold"
                                  style={{ color: "#2F3C96" }}
                                >
                                  {loc.facility}:{" "}
                                </span>
                              )}
                              {loc.fullAddress || loc.address}
                            </div>
                          ))}
                        {detailsModal.trial.locations.length > 3 && (
                          <div
                            className="text-xs italic"
                            style={{ color: "#787878" }}
                          >
                            + {detailsModal.trial.locations.length - 3} more
                            location(s)
                          </div>
                        )}
                      </div>
                    </div>
                  ) : detailsModal.trial.location &&
                    detailsModal.trial.location !== "Not specified" ? (
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                      <h4
                        className="font-bold mb-3 flex items-center gap-2 text-sm"
                        style={{ color: "#2F3C96" }}
                      >
                        <MapPin className="w-4 h-4 text-green-600" />
                        Trial Locations
                      </h4>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "#787878" }}
                      >
                        {detailsModal.trial.location}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Source Registry + Sticky Footer with Actions */}
              <div
                className="bottom-0 px-6 pb-6 pt-4 border-t bg-white/95 backdrop-blur-sm shadow-lg"
                style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
              >
                <div className="flex flex-col gap-2">
                  {detailsModal.trial && (
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Source registry
                      </span>
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                        style={{
                          borderColor: "#D0C4E2",
                          color: "#2F3C96",
                          backgroundColor: "rgba(208, 196, 226, 0.1)",
                        }}
                      >
                        {(() => {
                          return getTrialSourceLabel(detailsModal.trial);
                        })()}
                      </span>
                    </div>
                  )}
                  {detailsModal.trial.sourceRegistry !== "cura-link" && (
                    <button
                      onClick={() => {
                        const trial = detailsModal.trial;
                        if (!trial) return;
                        const externalUrl = resolveExternalTrialUrl(trial);
                        // #region agent log
                        fetch(
                          "http://127.0.0.1:7242/ingest/f1b3fc61-8c8f-48bb-889f-dd932b9156c8",
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              runId: "ctis-debug-frontend-1",
                              hypothesisId: "H4",
                              location: "Trials.jsx:DETAILS_MODAL_OPEN",
                              message:
                                "User opened full trial from details modal",
                              data: {
                                id: trial.id || trial._id || null,
                                sourceRegistry: trial.sourceRegistry || null,
                                hasClinicalTrialsGovUrl:
                                  !!trial.clinicalTrialsGovUrl,
                                hasIsrctnUrl: !!trial.isrctnUrl,
                                hasEuCtrUrl: !!trial.euCtrUrl,
                              },
                              timestamp: Date.now(),
                            }),
                          },
                        ).catch(() => {});
                        // #endregion agent log
                        if (externalUrl) {
                          window.open(
                            externalUrl,
                            "_blank",
                            "noopener,noreferrer",
                          );
                        } else {
                          const innerId = trial.id || trial._id;
                          if (innerId) {
                            closeDetailsModal();
                            navigate(`/trial/${innerId}`);
                          }
                        }
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all w-full"
                      style={{
                        color: "#FFFFFF",
                        backgroundColor: "#2F3C96",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#253075";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#2F3C96";
                      }}
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Full Trial
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </Modal>

        {/* Contact Information Modal */}
        <Modal
          isOpen={contactInfoModal.open}
          onClose={closeContactInfoModal}
          title={t("trials.contactInformationTitle")}
        >
          <div className="space-y-4">
            {contactInfoModal.loading ? (
              <div className="text-center py-8">
                <Loader2
                  className="w-8 h-8 animate-spin mx-auto mb-4"
                  style={{ color: "#2F3C96" }}
                />
                <p className="text-sm" style={{ color: "#787878" }}>
                  Loading contact information...
                </p>
              </div>
            ) : contactInfoModal.trial ? (
              <>
                <div className="pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-bold text-slate-900 text-lg">
                      {contactInfoModal.trial?.title || "Trial"}
                    </h4>
                  </div>
                </div>

                {contactInfoModal.trial.contacts?.some((c) =>
                  c?.email?.trim(),
                ) ? (
                  <div className="space-y-4">
                    {contactInfoModal.trial.contacts.map((contact, i) => (
                      <div
                        key={i}
                        className="bg-gray-50 rounded-lg p-4 border"
                        style={{ borderColor: "rgba(232, 232, 232, 1)" }}
                      >
                        {contact.name && (
                          <div
                            className="font-bold mb-3 text-base flex items-center gap-2"
                            style={{ color: "#2F3C96" }}
                          >
                            <User
                              className="w-4 h-4"
                              style={{ color: "#787878" }}
                            />
                            {contact.name}
                          </div>
                        )}
                        {contact.role && (
                          <div className="mb-2">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                              style={{
                                color: "#2F3C96",
                                borderColor: "#D0C4E2",
                                backgroundColor: "rgba(208, 196, 226, 0.15)",
                              }}
                            >
                              {contact.role}
                            </span>
                          </div>
                        )}
                        <div className="space-y-2">
                          {contact.email && (
                            <a
                              href={`mailto:${contact.email}`}
                              className="flex items-center gap-2 text-sm font-medium transition-colors"
                              style={{ color: "#2F3C96" }}
                              onMouseEnter={(e) =>
                                (e.target.style.color = "#253075")
                              }
                              onMouseLeave={(e) =>
                                (e.target.style.color = "#2F3C96")
                              }
                            >
                              <Mail className="w-4 h-4" />
                              {contact.email}
                            </a>
                          )}
                          {contact.phone && (
                            <div
                              className="flex items-center gap-2 text-sm"
                              style={{ color: "#787878" }}
                            >
                              <Phone
                                className="w-4 h-4"
                                style={{ color: "#2F3C96" }}
                              />
                              <a
                                href={`tel:${contact.phone}`}
                                className="transition-colors"
                                style={{ color: "#787878" }}
                                onMouseEnter={(e) =>
                                  (e.target.style.color = "#2F3C96")
                                }
                                onMouseLeave={(e) =>
                                  (e.target.style.color = "#787878")
                                }
                              >
                                {contact.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : collectTrialContactEmails(contactInfoModal.trial).length >
                  0 ? (
                  <div className="space-y-4">
                    {(contactInfoModal.trial.locations || [])
                      .filter((loc) => loc?.contactEmail?.trim())
                      .map((loc, idx) => (
                        <div
                          key={`cinfo-loc-${idx}`}
                          className="bg-gray-50 rounded-lg p-4 border"
                          style={{ borderColor: "rgba(232, 232, 232, 1)" }}
                        >
                          {loc.facility && (
                            <div
                              className="font-bold mb-3 text-base flex items-center gap-2"
                              style={{ color: "#2F3C96" }}
                            >
                              <MapPin
                                className="w-4 h-4"
                                style={{ color: "#787878" }}
                              />
                              {loc.facility}
                            </div>
                          )}
                          <a
                            href={`mailto:${loc.contactEmail}`}
                            className="flex items-center gap-2 text-sm font-medium transition-colors"
                            style={{ color: "#2F3C96" }}
                            onMouseEnter={(e) =>
                              (e.target.style.color = "#253075")
                            }
                            onMouseLeave={(e) =>
                              (e.target.style.color = "#2F3C96")
                            }
                          >
                            <Mail className="w-4 h-4" />
                            {loc.contactEmail}
                          </a>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Info className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600">
                      No contact information available for this trial.
                    </p>
                    {contactInfoModal.trial &&
                      resolveExternalTrialUrl(contactInfoModal.trial) && (
                        <button
                          onClick={() =>
                            window.open(
                              resolveExternalTrialUrl(contactInfoModal.trial),
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
                          style={{
                            color: "#2F3C96",
                            borderColor: "#D0C4E2",
                            backgroundColor: "rgba(208, 196, 226, 0.12)",
                          }}
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open Official Registry Contact Page
                        </button>
                      )}
                  </div>
                )}

                {/* Generated Message Section */}
                {contactInfoModal.generatedMessage && (
                  <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-indigo-900">
                        Generated Message
                      </label>
                      <button
                        onClick={copyGeneratedMessage}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition-all"
                      >
                        {contactInfoModal.copied ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-indigo-100">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {contactInfoModal.generatedMessage}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  {collectTrialContactEmails(contactInfoModal.trial).length >
                    0 && (
                    <button
                      onClick={() => {
                        setContactStepsModal({
                          open: true,
                          trial: contactInfoModal.trial,
                          currentStep: 1,
                          generatedEmail: "",
                          generating: false,
                          copied: false,
                        });
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all"
                      style={{
                        color: "#2F3C96",
                        backgroundColor: "rgba(208, 196, 226, 0.2)",
                        border: "1px solid rgba(208, 196, 226, 0.3)",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor =
                          "rgba(208, 196, 226, 0.3)";
                        e.target.style.color = "#253075";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor =
                          "rgba(208, 196, 226, 0.2)";
                        e.target.style.color = "#2F3C96";
                      }}
                    >
                      <Info className="w-4 h-4" />
                      Help me contact Trial Moderator
                    </button>
                  )}
                  <button
                    onClick={closeContactInfoModal}
                    className={`${
                      collectTrialContactEmails(contactInfoModal.trial).length >
                      0
                        ? "flex-1"
                        : "w-full"
                    } px-6 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl transition-all`}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </Modal>

        {/* Contact Moderator Modal */}
        <Modal
          isOpen={contactModal.open}
          onClose={() => {
            if (!contactModal.sent) {
              setContactModal({
                open: false,
                trial: null,
                message: "",
                sent: false,
                generating: false,
              });
            }
          }}
          title={t("trials.contactModeratorTitle")}
        >
          <div className="space-y-4">
            {contactModal.sent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-green-700 mb-2">
                  Message Sent!
                </h3>
                <p className="text-gray-600">
                  Your message has been sent to the moderator. They will get
                  back to you soon.
                </p>
              </div>
            ) : (
              <>
                <div className="pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Beaker className="w-5 h-5 text-indigo-600" />
                    <h4 className="font-bold text-slate-900 text-lg">
                      {contactModal.trial?.title || "Trial"}
                    </h4>
                  </div>
                  {contactModal.trial?.sourceRegistry !== "cura-link" && (
                    <p className="text-sm text-slate-600">
                      Trial ID:{" "}
                      {contactModal.trial?.id ||
                        contactModal.trial?._id ||
                        "N/A"}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Your Message
                    </label>
                    {isSignedIn && (
                      <button
                        onClick={generateMessage}
                        disabled={contactModal.generating}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {contactModal.generating ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            Generate Message
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <textarea
                    value={contactModal.message}
                    onChange={(e) =>
                      setContactModal({
                        ...contactModal,
                        message: e.target.value,
                      })
                    }
                    placeholder={
                      isSignedIn
                        ? "Write your message to the moderator here... or click 'Generate Message' to create one automatically"
                        : "Write your message to the moderator here... (Sign in to use AI message generation)"
                    }
                    rows="6"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-900 placeholder-slate-400 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleSendMessage}
                    disabled={!contactModal.message.trim()}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4 inline mr-2" />
                    Send Message
                  </Button>
                  <Button
                    onClick={() =>
                      setContactModal({
                        open: false,
                        trial: null,
                        message: "",
                        sent: false,
                        generating: false,
                      })
                    }
                    className="px-6 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>

        {/* Contact Steps Modal */}
        <Modal
          isOpen={contactStepsModal.open}
          onClose={closeContactStepsModal}
          title={t("trials.helpContactModerator")}
        >
          <div className="space-y-6">
            {contactStepsModal.trial && (
              <>
                {/* Trial Info Header */}
                <div className="pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-bold text-slate-900 text-base">
                      {contactStepsModal.trial?.title || "Trial"}
                    </h4>
                  </div>
                  {contactStepsModal.trial?.sourceRegistry !== "cura-link" && (
                    <p className="text-xs text-slate-600 mb-3">
                      Trial ID:{" "}
                      {contactStepsModal.trial?.id ||
                        contactStepsModal.trial?._id ||
                        "N/A"}
                    </p>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={prevStep}
                      disabled={contactStepsModal.currentStep === 1}
                      className="px-3 py-1.5 text-xs border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {contactStepsModal.currentStep < 4 ? (
                      <button
                        onClick={nextStep}
                        className="flex-1 px-4 py-1.5 text-xs rounded-lg transition-all text-white"
                        style={{ backgroundColor: "#2F3C96" }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "#253075";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "#2F3C96";
                        }}
                      >
                        Next Step
                      </button>
                    ) : (
                      <button
                        onClick={closeContactStepsModal}
                        className="flex-1 px-4 py-1.5 text-xs rounded-lg transition-all text-white"
                        style={{ backgroundColor: "#2F3C96" }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "#253075";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "#2F3C96";
                        }}
                      >
                        Done
                      </button>
                    )}
                  </div>
                </div>

                {/* Timeline Steps */}
                <div className="relative">
                  {/* Timeline Line */}
                  <div
                    className="absolute left-5 top-0 bottom-0 w-0.5"
                    style={{ backgroundColor: "rgba(208, 196, 226, 0.3)" }}
                  />

                  {/* Step 1: Check Eligibility */}
                  <div className="relative flex gap-3 pb-6">
                    <div
                      className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        contactStepsModal.currentStep >= 1
                          ? "bg-indigo-100 border-indigo-600"
                          : "bg-gray-100 border-gray-300"
                      }`}
                    >
                      {contactStepsModal.currentStep > 1 ? (
                        <CheckCircle2
                          className="w-5 h-5"
                          style={{ color: "#2F3C96" }}
                        />
                      ) : (
                        <ListChecks
                          className="w-5 h-5"
                          style={{
                            color:
                              contactStepsModal.currentStep === 1
                                ? "#2F3C96"
                                : "#787878",
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <h3
                        className={`font-bold text-sm mb-1.5 ${
                          contactStepsModal.currentStep === 1
                            ? "text-indigo-900"
                            : "text-slate-700"
                        }`}
                      >
                        Step 1: Check Your Eligibility
                      </h3>
                      {contactStepsModal.currentStep === 1 && (
                        <div className="space-y-2 mt-2">
                          {contactStepsModal.trial.eligibility ? (
                            <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                {contactStepsModal.trial.eligibility.gender && (
                                  <div>
                                    <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                                      Gender
                                    </span>
                                    <p className="text-xs font-semibold text-indigo-900 mt-0.5">
                                      {
                                        contactStepsModal.trial.eligibility
                                          .gender
                                      }
                                    </p>
                                  </div>
                                )}
                                {contactStepsModal.trial.eligibility
                                  .minimumAge && (
                                  <div>
                                    <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                                      Minimum Age
                                    </span>
                                    <p className="text-xs font-semibold text-indigo-900 mt-0.5">
                                      {
                                        contactStepsModal.trial.eligibility
                                          .minimumAge
                                      }
                                    </p>
                                  </div>
                                )}
                                {contactStepsModal.trial.eligibility
                                  .maximumAge && (
                                  <div>
                                    <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                                      Maximum Age
                                    </span>
                                    <p className="text-xs font-semibold text-indigo-900 mt-0.5">
                                      {
                                        contactStepsModal.trial.eligibility
                                          .maximumAge
                                      }
                                    </p>
                                  </div>
                                )}
                              </div>
                              {contactStepsModal.trial.eligibility.criteria &&
                                contactStepsModal.trial.eligibility.criteria !==
                                  "Not specified" && (
                                  <div className="mt-2">
                                    <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide block mb-1.5">
                                      Detailed Criteria
                                    </span>
                                    <p className="text-xs text-slate-700 whitespace-pre-line bg-white rounded p-2 border border-indigo-100">
                                      {
                                        contactStepsModal.trial.eligibility
                                          .criteria
                                      }
                                    </p>
                                  </div>
                                )}
                            </div>
                          ) : (
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <p className="text-xs text-gray-600">
                                Eligibility criteria not available. Please
                                review the trial details or contact the trial
                                team directly.
                              </p>
                            </div>
                          )}
                          <p className="text-xs text-slate-600">
                            Review the eligibility criteria above to ensure you
                            meet the requirements before proceeding.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Contact Information */}
                  <div className="relative flex gap-3 pb-6">
                    <div
                      className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        contactStepsModal.currentStep >= 2
                          ? "bg-indigo-100 border-indigo-600"
                          : "bg-gray-100 border-gray-300"
                      }`}
                    >
                      {contactStepsModal.currentStep > 2 ? (
                        <CheckCircle2
                          className="w-5 h-5"
                          style={{ color: "#2F3C96" }}
                        />
                      ) : (
                        <Mail
                          className="w-5 h-5"
                          style={{
                            color:
                              contactStepsModal.currentStep === 2
                                ? "#2F3C96"
                                : "#787878",
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <h3
                        className={`font-bold text-sm mb-1.5 ${
                          contactStepsModal.currentStep === 2
                            ? "text-indigo-900"
                            : "text-slate-700"
                        }`}
                      >
                        Step 2: Get Contact Information
                      </h3>
                      {contactStepsModal.currentStep === 2 && (
                        <div className="space-y-2 mt-2">
                          {contactStepsModal.trial.contacts &&
                          contactStepsModal.trial.contacts.length > 0 ? (
                            <div className="space-y-2">
                              {contactStepsModal.trial.contacts.map(
                                (contact, i) => (
                                  <div
                                    key={i}
                                    className="bg-indigo-50 rounded-lg p-3 border border-indigo-200"
                                  >
                                    {contact.name && (
                                      <div className="font-bold mb-2 text-sm flex items-center gap-2 text-indigo-900">
                                        <User className="w-3.5 h-3.5" />
                                        {contact.name}
                                      </div>
                                    )}
                                    <div className="space-y-1.5">
                                      {contact.email && (
                                        <a
                                          href={`mailto:${contact.email}`}
                                          className="flex items-center gap-2 text-xs font-medium transition-colors text-indigo-700 hover:text-indigo-900"
                                        >
                                          <Mail className="w-3.5 h-3.5" />
                                          {contact.email}
                                        </a>
                                      )}
                                      {contact.phone && (
                                        <div className="flex items-center gap-2 text-xs text-slate-700">
                                          <Phone
                                            className="w-3.5 h-3.5"
                                            style={{ color: "#2F3C96" }}
                                          />
                                          <a
                                            href={`tel:${contact.phone}`}
                                            className="transition-colors hover:text-indigo-700"
                                          >
                                            {contact.phone}
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          ) : collectTrialContactEmails(contactStepsModal.trial)
                              .length > 0 ? (
                            <div className="space-y-2">
                              {(contactStepsModal.trial.locations || [])
                                .filter((loc) => loc?.contactEmail?.trim())
                                .map((loc, idx) => (
                                  <div
                                    key={`step2-loc-${idx}`}
                                    className="bg-indigo-50 rounded-lg p-3 border border-indigo-200"
                                  >
                                    {loc.facility && (
                                      <div className="font-bold mb-2 text-sm flex items-center gap-2 text-indigo-900">
                                        <MapPin className="w-3.5 h-3.5" />
                                        {loc.facility}
                                      </div>
                                    )}
                                    <a
                                      href={`mailto:${loc.contactEmail}`}
                                      className="flex items-center gap-2 text-xs font-medium transition-colors text-indigo-700 hover:text-indigo-900"
                                    >
                                      <Mail className="w-3.5 h-3.5" />
                                      {loc.contactEmail}
                                    </a>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <p className="text-xs text-gray-600">
                                Contact information not available for this
                                trial. Please visit the trial's official page
                                for contact details.
                              </p>
                            </div>
                          )}
                          <p className="text-xs text-slate-600">
                            Save this contact information. You'll need it to
                            send your inquiry email.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Generate Email */}
                  <div className="relative flex gap-3 pb-6">
                    <div
                      className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        contactStepsModal.currentStep >= 3
                          ? "bg-indigo-100 border-indigo-600"
                          : "bg-gray-100 border-gray-300"
                      }`}
                    >
                      {contactStepsModal.currentStep > 3 ? (
                        <CheckCircle2
                          className="w-5 h-5"
                          style={{ color: "#2F3C96" }}
                        />
                      ) : (
                        <Sparkles
                          className="w-5 h-5"
                          style={{
                            color:
                              contactStepsModal.currentStep === 3
                                ? "#2F3C96"
                                : "#787878",
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <h3
                        className={`font-bold text-sm mb-1.5 ${
                          contactStepsModal.currentStep >= 3
                            ? "text-indigo-900"
                            : "text-slate-700"
                        }`}
                      >
                        Step 3: Draft Your Email
                      </h3>
                      {contactStepsModal.currentStep >= 3 && (
                        <div className="space-y-2 mt-2">
                          {contactStepsModal.currentStep === 3 &&
                          !contactStepsModal.generatedEmail ? (
                            <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                              <p className="text-xs text-slate-700 mb-3">
                                Click the button below to generate a
                                professional email draft for contacting the
                                trial moderator.
                              </p>
                              <button
                                onClick={generateContactEmail}
                                disabled={contactStepsModal.generating}
                                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full"
                                style={{
                                  color: "#2F3C96",
                                  backgroundColor: "rgba(208, 196, 226, 0.2)",
                                  border: "1px solid rgba(208, 196, 226, 0.3)",
                                }}
                                onMouseEnter={(e) => {
                                  if (!contactStepsModal.generating) {
                                    e.target.style.backgroundColor =
                                      "rgba(208, 196, 226, 0.3)";
                                    e.target.style.color = "#253075";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!contactStepsModal.generating) {
                                    e.target.style.backgroundColor =
                                      "rgba(208, 196, 226, 0.2)";
                                    e.target.style.color = "#2F3C96";
                                  }
                                }}
                              >
                                {contactStepsModal.generating ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Generating Email...
                                  </>
                                ) : (
                                  <>Generate Email Draft</>
                                )}
                              </button>
                            </div>
                          ) : null}
                          {contactStepsModal.generatedEmail ? (
                            <div className="space-y-2">
                              <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                                <div className="flex items-center justify-between mb-1.5 gap-2">
                                  <label className="text-xs font-semibold text-indigo-900">
                                    Generated Email Draft
                                  </label>
                                  <div className="flex flex-wrap gap-2 justify-end">
                                    <button
                                      type="button"
                                      onClick={openGmailComposeTrialModerator}
                                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border transition-all text-white border-indigo-600 hover:opacity-95"
                                      style={{
                                        backgroundColor: "#2F3C96",
                                      }}
                                    >
                                      <Mail className="w-3 h-3" />
                                      Open in email app
                                      <ExternalLink className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={copyGeneratedEmail}
                                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white hover:bg-indigo-100 text-indigo-700 rounded border border-indigo-200 transition-all"
                                    >
                                      {contactStepsModal.copied ? (
                                        <>
                                          <CheckCircle2 className="w-3 h-3" />
                                          Copied!
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          Copy draft
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <div className="bg-white rounded-lg p-2 border border-indigo-100">
                                  <p className="text-xs text-slate-700 whitespace-pre-wrap">
                                    {contactStepsModal.generatedEmail}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 4: Follow Up */}
                  <div className="relative flex gap-3">
                    <div
                      className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        contactStepsModal.currentStep >= 4
                          ? "bg-indigo-100 border-indigo-600"
                          : "bg-gray-100 border-gray-300"
                      }`}
                    >
                      {contactStepsModal.currentStep === 4 ? (
                        <CheckCircle2
                          className="w-5 h-5"
                          style={{ color: "#2F3C96" }}
                        />
                      ) : (
                        <CheckCircle
                          className="w-5 h-5"
                          style={{
                            color:
                              contactStepsModal.currentStep === 4
                                ? "#2F3C96"
                                : "#787878",
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3
                        className={`font-bold text-sm mb-1.5 ${
                          contactStepsModal.currentStep === 4
                            ? "text-indigo-900"
                            : "text-slate-700"
                        }`}
                      >
                        Step 4: Follow Up
                      </h3>
                      {contactStepsModal.currentStep === 4 && (
                        <div className="space-y-2 mt-2">
                          <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                            <h4 className="font-semibold text-xs text-indigo-900 mb-2">
                              Important Follow-Up Tips:
                            </h4>
                            <ul className="space-y-1.5 text-xs text-slate-700">
                              <li className="flex items-start gap-2">
                                <CheckCircle2
                                  className="w-3.5 h-3.5 mt-0.5 shrink-0"
                                  style={{ color: "#2F3C96" }}
                                />
                                <span>
                                  <strong>Wait 1-2 weeks</strong> before
                                  following up if you don't receive a response
                                </span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle2
                                  className="w-3.5 h-3.5 mt-0.5 shrink-0"
                                  style={{ color: "#2F3C96" }}
                                />
                                <span>
                                  <strong>Keep your follow-up brief</strong> -
                                  reference your original inquiry and express
                                  continued interest
                                </span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle2
                                  className="w-3.5 h-3.5 mt-0.5 shrink-0"
                                  style={{ color: "#2F3C96" }}
                                />
                                <span>
                                  <strong>Be patient</strong> - trial
                                  coordinators receive many inquiries and may
                                  take time to respond
                                </span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle2
                                  className="w-3.5 h-3.5 mt-0.5 shrink-0"
                                  style={{ color: "#2F3C96" }}
                                />
                                <span>
                                  <strong>Consider calling</strong> if you have
                                  the phone number and haven't received a
                                  response after 2 weeks
                                </span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle2
                                  className="w-3.5 h-3.5 mt-0.5 shrink-0"
                                  style={{ color: "#2F3C96" }}
                                />
                                <span>
                                  <strong>Keep records</strong> of all
                                  communications for your reference
                                </span>
                              </li>
                            </ul>
                          </div>
                          <p className="text-xs text-slate-600">
                            Following up shows your continued interest and can
                            help ensure your inquiry doesn't get overlooked.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </Modal>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </Layout>
  );
}
