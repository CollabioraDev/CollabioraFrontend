"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Heart,
  User,
  Building2,
  MapPin,
  GraduationCap,
  ExternalLink,
  Info,
  Mail,
  LinkIcon,
  Award,
  Briefcase,
  Calendar,
  BookOpen,
  Loader2,
  ChevronDown,
  TrendingUp,
  Sparkles,
  UserPlus,
  Clock,
  MessageCircle,
  AlertCircle,
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import PageTutorial, {
  useTutorialCompleted,
  resetTutorialCompleted,
} from "../components/PageTutorial.jsx";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";
import { BorderBeam } from "@/components/ui/border-beam";
import { AuroraText } from "@/components/ui/aurora-text";
import SmartSearchInput from "../components/SmartSearchInput.jsx";
import LocationInput from "../components/LocationInput.jsx";
import FreeSearchesIndicator, {
  useFreeSearches,
} from "../components/FreeSearchesIndicator.jsx";
import apiFetch from "../utils/api.js";
import {
  getLocalRemainingSearches,
  setLocalSearchCount,
  MAX_FREE_SEARCHES,
} from "../utils/searchLimit.js";
import { SMART_SUGGESTION_KEYWORDS } from "../utils/smartSuggestions.js";
import {
  buildMeshIndex,
  getMeshSliceForQuery,
} from "../utils/meshSearchIndex.js";
import icd11Dataset from "../data/icd11Dataset.json";
import meshSearchTerms from "../data/meshSearchTerms.json";
import {
  buildCanonicalMapFromIcd11,
  buildCanonicalMapFromLabels,
  resolveToCanonical,
} from "../utils/canonicalLabels.js";
import { loadTutorialSampleExperts } from "../utils/tutorialSampleData.js";

export default function Experts() {
  const navigate = useNavigate();
  const initialFetchDone = useRef(false); // Track if initial fetch has been performed
  const [researchArea, setResearchArea] = useState("");
  const [diseaseOfInterest, setDiseaseOfInterest] = useState("");
  const [location, setLocation] = useState("");
  const [locationMode, setLocationMode] = useState("global"); // "current", "global", "custom"
  const [userLocation, setUserLocation] = useState(null);
  const [useMedicalInterest, setUseMedicalInterest] = useState(() => {
    // Load from localStorage, default to false if not set
    const saved = localStorage.getItem("useMedicalInterest");
    return saved !== null ? JSON.parse(saved) : false;
  }); // Toggle for using medical interest
  const [userMedicalInterest, setUserMedicalInterest] = useState(""); // User's medical interest
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Track if it's the initial load
  const [isOnPlatform, setIsOnPlatform] = useState(false); // Track if on platform is selected (default: false, unchecked shows global)
  const [isSignedIn, setIsSignedIn] = useState(false); // Track if user is signed in
  const [user, setUser] = useState(null); // Track user state
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false); // Start with loading false - no initial search
  const [favorites, setFavorites] = useState([]);
  const [favoritingItems, setFavoritingItems] = useState(new Set()); // Track items being favorited/unfavorited
  const { checkAndUseSearch, getRemainingSearches } = useFreeSearches();
  const [publications, setPublications] = useState({}); // Map of expert name/id to publications array
  const [loadingPublications, setLoadingPublications] = useState({}); // Map of expert name/id to loading state
  const [expandedCards, setExpandedCards] = useState({}); // Map of expert name/id to expanded state
  const [detailsModal, setDetailsModal] = useState({
    open: false,
    expert: null,
  });
  const [connectionRequestModal, setConnectionRequestModal] = useState({
    open: false,
    message: "",
    expert: null,
  });
  const [connectionRequestStatus, setConnectionRequestStatus] = useState({});
  const [viewMode, setViewMode] = useState("explore"); // "explore" or "find"
  const [findExpertName, setFindExpertName] = useState("");
  const [findExpertResults, setFindExpertResults] = useState([]);
  const [findExpertLoading, setFindExpertLoading] = useState(false);
  const [findExpertHasSearched, setFindExpertHasSearched] = useState(false);

  // Pagination state for deterministic (global) experts
  const [globalPage, setGlobalPage] = useState(1);
  const [globalHasMore, setGlobalHasMore] = useState(false);
  const [globalTotalFound, setGlobalTotalFound] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastSearchParamsRef = useRef(null); // Store last search params for "Load More"

  const tutorialCompleted = useTutorialCompleted("experts");
  const [forceTutorial, setForceTutorial] = useState(false);
  const showTutorial = !tutorialCompleted || forceTutorial;
  const [tutorialSampleResults, setTutorialSampleResults] = useState([]);
  const [tutorialSampleLoading, setTutorialSampleLoading] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const RESULTS_STEP = 5;
  const hasScrolledToResultsRef = useRef(false);

  useEffect(() => {
    if (showTutorial) hasScrolledToResultsRef.current = false;
  }, [showTutorial]);

  const scrollToResultsOnce = useCallback(() => {
    if (hasScrolledToResultsRef.current) return;
    hasScrolledToResultsRef.current = true;
    window.scrollTo({ top: 100, behavior: "smooth" });
  }, []);

  const handleTutorialStepChange = useCallback(
    (stepIndex) => {
      setTutorialStep(stepIndex);
      if (stepIndex === RESULTS_STEP) {
        if (tutorialSampleResults.length === 0) {
          setTutorialSampleLoading(true);
          loadTutorialSampleExperts()
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

  // Determine if user is a researcher to show "Collaborators" instead of "Experts"
  const isResearcher = user?.role === "researcher";
  const expertLabel = isResearcher ? "Collaborator" : "Expert";
  const expertsLabel = isResearcher ? "Collaborators" : "Health Experts";

  const getCitationCount = (expert) => {
    const metricsCitations = expert?.metrics?.totalCitations;
    if (typeof metricsCitations === "number") return metricsCitations;
    if (typeof metricsCitations === "string") {
      const parsed = Number(metricsCitations);
      if (!Number.isNaN(parsed)) return parsed;
    }

    const direct = expert?.realCitationCount ?? expert?.totalCitations;
    if (typeof direct === "number") return direct;
    if (typeof direct === "string") {
      const parsed = Number(direct);
      if (!Number.isNaN(parsed)) return parsed;
    }

    return 0;
  };

  const sortExpertsByCitations = (list) => {
    return [...list].sort((a, b) => {
      const aCitations = getCitationCount(a);
      const bCitations = getCitationCount(b);
      if (bCitations !== aCitations) return bCitations - aCitations;

      const aMatch = a.matchPercentage ?? -1;
      const bMatch = b.matchPercentage ?? -1;
      return bMatch - aMatch;
    });
  };

  // Common medical conditions (same as onboarding)
  const commonConditions = [
    "Diabetes",
    "Hypertension",
    "Heart Disease",
    "Prostate Cancer",
    "Breast Cancer",
    "Lung Cancer",
    "Asthma",
    "Arthritis",
    "Depression",
    "Anxiety",
    "Chronic Pain",
    "Migraine",
    "Obesity",
    "High Cholesterol",
    "Thyroid Disorder",
    "Sleep Apnea",
    "COPD",
    "Epilepsy",
    "Parkinson's Disease",
    "Alzheimer's Disease",
    "Multiple Sclerosis",
    "Crohn's Disease",
    "IBD",
    "Osteoporosis",
    "Fibromyalgia",
    "Lupus",
    "Rheumatoid Arthritis",
  ];

  // Extract terms from ICD11 dataset for suggestions (same as onboarding)
  const icd11Suggestions = useMemo(() => {
    const termsSet = new Set();

    if (Array.isArray(icd11Dataset)) {
      icd11Dataset.forEach((item) => {
        // Add display_name
        if (item.display_name && typeof item.display_name === "string") {
          const displayName = item.display_name.trim();
          if (displayName) {
            termsSet.add(displayName);
          }
        }

        // Add patient_terms, but filter out ICD code patterns
        if (Array.isArray(item.patient_terms)) {
          item.patient_terms.forEach((term) => {
            if (typeof term === "string") {
              const trimmedTerm = term.trim();
              if (!trimmedTerm) return;

              // Filter out terms containing ICD code patterns
              const lowerTerm = trimmedTerm.toLowerCase();
              // Check for patterns like "icd11 code aa00", "icd code aa00", "icd aa00", "icd11 aa00"
              const hasIcdPattern =
                lowerTerm.includes("icd11 code") ||
                lowerTerm.includes("icd code") ||
                /icd11\s+[a-z]{2}[0-9]{2}/i.test(trimmedTerm) || // "icd11 aa00"
                /icd\s+[a-z]{2}[0-9]{2}/i.test(trimmedTerm); // "icd aa00", "icd ba20"

              if (!hasIcdPattern) {
                termsSet.add(trimmedTerm);
              }
            }
          });
        }
      });
    }

    return Array.from(termsSet);
  }, []);

  // MeSH index: search by first (and first-two) letter so we only pass a small slice per keystroke
  const meshIndex = useMemo(
    () => buildMeshIndex(Array.isArray(meshSearchTerms) ? meshSearchTerms : []),
    [],
  );

  // Condition field: MeSH slice for current input + fixed terms (keeps pool small, typing fast)
  const diseaseSuggestionTerms = useMemo(() => {
    const meshSlice = getMeshSliceForQuery(meshIndex, diseaseOfInterest);
    return [
      ...meshSlice,
      userMedicalInterest,
      ...commonConditions,
      ...SMART_SUGGESTION_KEYWORDS,
      ...icd11Suggestions,
    ].filter(Boolean);
  }, [meshIndex, diseaseOfInterest, userMedicalInterest, icd11Suggestions]);

  // Expertise field: MeSH slice for current input + smart keywords
  const expertSuggestionTerms = useMemo(() => {
    const meshSlice = getMeshSliceForQuery(meshIndex, researchArea);
    return [...meshSlice, ...SMART_SUGGESTION_KEYWORDS].filter(Boolean);
  }, [meshIndex, researchArea]);

  const expertsDiseaseCanonicalMap = useMemo(() => {
    const map = buildCanonicalMapFromIcd11(icd11Dataset);
    const curated = buildCanonicalMapFromLabels([
      ...commonConditions,
      ...SMART_SUGGESTION_KEYWORDS,
      ...(userMedicalInterest ? [userMedicalInterest] : []),
    ]);
    for (const [key, label] of curated) {
      if (!map.has(key)) map.set(key, label);
    }
    return map;
  }, [userMedicalInterest]);

  const expertsExpertiseCanonicalMap = useMemo(
    () => buildCanonicalMapFromLabels(SMART_SUGGESTION_KEYWORDS),
    [],
  );

  // Save useMedicalInterest to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(
      "useMedicalInterest",
      JSON.stringify(useMedicalInterest),
    );
  }, [useMedicalInterest]);

  async function search(overrides = {}) {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token");
    const isUserSignedIn = userData && token;

    // Check free searches for non-signed-in users (pre-check)
    if (!isUserSignedIn) {
      const canSearch = await checkAndUseSearch();
      if (!canSearch) {
        toast.error(
          "You've used all your searches. Sign in to continue searching.",
          { duration: 4000 },
        );
        return;
      }
    }

    setLoading(true);
    setResults([]);
    setTutorialSampleResults([]);
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const params = new URLSearchParams();
    const user = userData;
    const nextResearchArea =
      overrides.researchArea !== undefined
        ? overrides.researchArea
        : researchArea;
    const nextDiseaseOfInterest =
      overrides.diseaseOfInterest !== undefined
        ? overrides.diseaseOfInterest
        : diseaseOfInterest;

    // Mark that initial load is complete when user performs search
    if (isInitialLoad) {
      setIsInitialLoad(false);
    }

    // For manual searches, use medical interest if enabled
    let currentResearchArea = nextResearchArea.trim();
    let currentDiseaseOfInterest = nextDiseaseOfInterest.trim();

    // If medical interest is enabled and no disease of interest is set, use medical interest
    if (
      useMedicalInterest &&
      userMedicalInterest &&
      !currentDiseaseOfInterest
    ) {
      currentDiseaseOfInterest = userMedicalInterest;
    }

    // Determine which sources to search
    // If on platform is checked, search platform; otherwise search global
    const sourcesToSearch = isOnPlatform ? ["platform"] : ["global"];

    // Parse "City, State/Province, Country" into structured object
    const parseLocationToObject = (locStr) => {
      if (!locStr || !locStr.trim()) return null;
      const parts = locStr
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length === 1)
        return { city: null, state: null, country: parts[0] };
      if (parts.length === 2)
        return { city: parts[0], state: null, country: parts[1] };
      return { city: parts[0], state: parts[1], country: parts[2] };
    };

    // Helper function to build params for a specific source
    const buildParamsForSource = (source) => {
      const sourceParams = new URLSearchParams();
      let locationStr = null;
      let parsedUserLocation = null;

      if (locationMode === "current" && userLocation) {
        locationStr = [
          userLocation.city,
          userLocation.state,
          userLocation.country,
        ]
          .filter(Boolean)
          .join(", ");
        parsedUserLocation = userLocation;
      } else if (locationMode === "custom" && location.trim()) {
        locationStr = location.trim();
        parsedUserLocation = parseLocationToObject(locationStr);
      }

      if (source === "platform") {
        // Platform experts query structure
        if (currentResearchArea) {
          sourceParams.set("researchArea", currentResearchArea);
        }
        if (currentDiseaseOfInterest) {
          sourceParams.set("diseaseOfInterest", currentDiseaseOfInterest);
        }
        if (locationStr) {
          sourceParams.set("location", locationStr);
        }

        // Add user profile data for matching
        if (userData?._id || userData?.id) {
          sourceParams.set("userId", userData._id || userData.id);
        } else if (currentDiseaseOfInterest || locationStr) {
          if (currentDiseaseOfInterest) {
            sourceParams.set("conditions", currentDiseaseOfInterest);
          }
          if (parsedUserLocation) {
            sourceParams.set(
              "userLocation",
              JSON.stringify(parsedUserLocation),
            );
          }
        }
      } else {
        // Global experts query structure
        const searchQueryParts = [];

        if (currentResearchArea) {
          searchQueryParts.push(currentResearchArea);
        }

        if (currentDiseaseOfInterest) {
          if (searchQueryParts.length > 0) {
            searchQueryParts.push(`in ${currentDiseaseOfInterest}`);
          } else {
            searchQueryParts.push(currentDiseaseOfInterest);
          }
        }

        // For deterministic endpoint, location is passed as separate parameter
        // Don't include location in the query string itself
        if (locationStr) {
          sourceParams.set("location", locationStr);
          // OLD: searchQueryParts.push(`in ${locationStr}`); // Removed - causes Gemini to treat location as topic
        } else if (locationMode === "global") {
          // For global search, no location parameter needed
        }

        const searchQuery = searchQueryParts.join(" ");
        if (searchQuery) sourceParams.set("q", searchQuery);

        // Pagination: page 1 for fresh searches, pageSize 5
        sourceParams.set("page", "1");
        sourceParams.set("pageSize", "5");

        // Add user profile data for matching
        if (userData?._id || userData?.id) {
          sourceParams.set("userId", userData._id || userData.id);
        } else if (currentDiseaseOfInterest || locationStr) {
          if (currentDiseaseOfInterest) {
            sourceParams.set("conditions", currentDiseaseOfInterest);
          }
          if (parsedUserLocation) {
            sourceParams.set(
              "userLocation",
              JSON.stringify(parsedUserLocation),
            );
          }
        }
      }

      return sourceParams;
    };

    // Reset pagination state for fresh search
    setGlobalPage(1);
    setGlobalHasMore(false);
    setGlobalTotalFound(0);

    // Fetch from all selected sources in parallel
    try {
      const fetchPromises = sourcesToSearch.map(async (source) => {
        const endpoint =
          source === "platform"
            ? "/api/search/experts/platform"
            : "/api/search/experts/deterministic"; // Use deterministic endpoint for global search
        const sourceParams = buildParamsForSource(source);

        // Store the global search params for "Load More" pagination
        if (source === "global") {
          lastSearchParamsRef.current = {
            endpoint: "/api/search/experts/deterministic",
            baseParams: new URLSearchParams(sourceParams.toString()),
          };
        }

        const response = await apiFetch(
          `${endpoint}?${sourceParams.toString()}`,
        );

        // Handle case where apiFetch returns undefined (401 redirect)
        if (!response) {
          return { results: [], error: null, source };
        }

        // Handle rate limit (429)
        if (response.status === 429) {
          const errorData = await response.json();
          return {
            results: [],
            error: errorData.error || "Rate limit exceeded",
            source,
          };
        }

        const data = await response.json();

        if (!response.ok) {
          return {
            results: [],
            error: data.error || "Failed to search experts",
            source,
          };
        }

        return {
          results: data.results || [],
          error: null,
          remaining: data.remaining,
          hasMore: data.hasMore || false,
          totalFound: data.totalFound || 0,
          source,
        };
      });

      // Wait for all fetches to complete
      const allResults = await Promise.all(fetchPromises);

      const combinedResults = [];
      const seenExperts = new Set();
      let backendRemaining = null;

      for (const result of allResults) {
        if (result.remaining !== undefined) backendRemaining = result.remaining;
        if (result.error && result.error.includes("Rate limit")) {
          toast.error(
            result.error ||
              "You've used all your searches. Sign in to continue searching.",
            { duration: 4000 },
          );
          setLoading(false);
          const remaining = getLocalRemainingSearches();
          window.dispatchEvent(
            new CustomEvent("freeSearchUsed", { detail: { remaining } }),
          );
          return;
        }

        if (result.error) {
          toast.error(result.error);
          continue;
        }

        // Track pagination state from deterministic (global) results
        if (result.source === "global") {
          setGlobalHasMore(result.hasMore || false);
          setGlobalTotalFound(result.totalFound || 0);
        }

        // Add results, avoiding duplicates
        for (const expert of result.results || []) {
          const expertKey =
            expert.name || expert.orcid || expert.id || expert._id;
          if (expertKey && !seenExperts.has(expertKey)) {
            seenExperts.add(expertKey);
            // Tag each expert with its source
            combinedResults.push({ ...expert, _source: result.source });
          }
        }
      }

      // Guest: sync with backend response
      if (!isUserSignedIn && backendRemaining !== null) {
        const remaining = backendRemaining;
        setLocalSearchCount(MAX_FREE_SEARCHES - remaining);

        if (remaining === 0) {
          toast(
            "You've used all your searches. Sign in for unlimited searches.",
            { duration: 5000, icon: "🔒" },
          );
        } else {
          toast.success(
            `Search successful! ${remaining} search${
              remaining !== 1 ? "es" : ""
            } remaining.`,
            { duration: 3000 },
          );
        }
        window.dispatchEvent(
          new CustomEvent("freeSearchUsed", { detail: { remaining } }),
        );
      }

      const sortedResults = sortExpertsByCitations(combinedResults);
      setResults(sortedResults);

      // Save search state to sessionStorage
      const searchState = {
        researchArea: nextResearchArea,
        diseaseOfInterest: nextDiseaseOfInterest,
        location,
        locationMode,
        useMedicalInterest,
        userMedicalInterest,
        isOnPlatform,
        results: sortedResults,
        isInitialLoad: false,
      };
      sessionStorage.setItem(
        "experts_search_state",
        JSON.stringify(searchState),
      );

      if (sortedResults.length === 0) {
        toast.error(
          `No ${expertsLabel.toLowerCase()} found. Try adjusting your search criteria.`,
        );
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
      toast.error(
        `Failed to search ${expertsLabel.toLowerCase()}. Please try again later.`,
      );
    } finally {
      setLoading(false);
    }
  }

  async function searchExpertByName() {
    if (!findExpertName.trim()) return;

    setFindExpertHasSearched(true);
    setFindExpertLoading(true);
    setFindExpertResults([]);

    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

      // Call backend API that searches OpenAlex and Semantic Scholar
      const response = await fetch(
        `${base}/api/search/experts/by-name?name=${encodeURIComponent(findExpertName.trim())}`,
      );

      if (!response.ok) {
        throw new Error("Failed to search for expert");
      }

      const data = await response.json();

      // Results are already sorted by citation count from backend
      setFindExpertResults(data.results || []);

      if ((data.results || []).length === 0) {
        toast.error(`No researchers found with the name "${findExpertName}"`);
      } else {
        toast.success(
          `Found ${data.results.length} researcher${data.results.length !== 1 ? "s" : ""}`,
        );
      }
    } catch (error) {
      console.error("Find expert error:", error);
      toast.error("Failed to search for expert. Please try again.");
      setFindExpertResults([]);
    } finally {
      setFindExpertLoading(false);
    }
  }

  // Load more global experts (next page) - only fetches deterministic endpoint
  async function loadMoreExperts() {
    if (!lastSearchParamsRef.current || !globalHasMore || loadingMore) return;

    const nextPage = globalPage + 1;
    setLoadingMore(true);

    try {
      const { endpoint, baseParams } = lastSearchParamsRef.current;
      const params = new URLSearchParams(baseParams.toString());
      params.set("page", String(nextPage));
      params.set("pageSize", "5");

      const response = await apiFetch(`${endpoint}?${params.toString()}`);
      if (!response) {
        setLoadingMore(false);
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to load more experts");
        setLoadingMore(false);
        return;
      }

      const newExperts = (data.results || []).map((expert) => ({
        ...expert,
        _source: "global",
      }));

      // Deduplicate against existing results
      const existingNames = new Set(results.map((r) => r.name));
      const uniqueNew = newExperts.filter(
        (e) => e.name && !existingNames.has(e.name),
      );

      if (uniqueNew.length > 0) {
        setResults((prev) => [...prev, ...uniqueNew]); // Keep backend order; do not re-sort on load more
      }

      setGlobalPage(nextPage);
      setGlobalHasMore(data.hasMore || false);
      setGlobalTotalFound(data.totalFound || 0);
    } catch (error) {
      console.error("Error loading more experts:", error);
      toast.error("Failed to load more experts. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function quickSearch(filterValue) {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token");
    const isUserSignedIn = userData && token;

    // Check free searches for non-signed-in users (pre-check)
    if (!isUserSignedIn) {
      const canSearch = await checkAndUseSearch();
      if (!canSearch) {
        toast.error(
          "You've used all your searches. Sign in to continue searching.",
          { duration: 4000 },
        );
        return;
      }
    }

    setResearchArea(filterValue);
    setDiseaseOfInterest("");
    setIsInitialLoad(false); // Mark initial load as complete when user performs quick search
    setLoading(true);
    setResults([]);
    setTimeout(async () => {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const userData = JSON.parse(localStorage.getItem("user") || "{}");

      // Determine which sources to search
      // If on platform is checked, search platform; otherwise search global
      const sourcesToSearch = isOnPlatform ? ["platform"] : ["global"];

      // Parse "City, State/Province, Country" into structured object
      const parseLocationToObject = (locStr) => {
        if (!locStr || !locStr.trim()) return null;
        const parts = locStr
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        if (parts.length === 1)
          return { city: null, state: null, country: parts[0] };
        if (parts.length === 2)
          return { city: parts[0], state: null, country: parts[1] };
        return { city: parts[0], state: parts[1], country: parts[2] };
      };

      // Helper function to build params for a specific source
      const buildParamsForSource = (source) => {
        const sourceParams = new URLSearchParams();
        let locationStr = null;
        let parsedUserLocation = null;

        if (locationMode === "current" && userLocation) {
          locationStr = [
            userLocation.city,
            userLocation.state,
            userLocation.country,
          ]
            .filter(Boolean)
            .join(", ");
          parsedUserLocation = userLocation;
        } else if (locationMode === "custom" && location.trim()) {
          locationStr = location.trim();
          parsedUserLocation = parseLocationToObject(locationStr);
        }

        if (source === "platform") {
          sourceParams.set("researchArea", filterValue);
          if (locationStr) {
            sourceParams.set("location", locationStr);
          }

          if (userData?._id || userData?.id) {
            sourceParams.set("userId", userData._id || userData.id);
          } else if (parsedUserLocation) {
            sourceParams.set(
              "userLocation",
              JSON.stringify(parsedUserLocation),
            );
          }
        } else {
          const searchQueryParts = [filterValue];
          if (locationStr) {
            sourceParams.set("location", locationStr);
          } else if (locationMode === "global") {
            // For global search, no location parameter needed
          }

          const searchQuery = searchQueryParts.join(" ");
          if (searchQuery) sourceParams.set("q", searchQuery);

          sourceParams.set("page", "1");
          sourceParams.set("pageSize", "5");

          if (userData?._id || userData?.id) {
            sourceParams.set("userId", userData._id || userData.id);
          } else if (parsedUserLocation) {
            sourceParams.set(
              "userLocation",
              JSON.stringify(parsedUserLocation),
            );
          }
        }

        return sourceParams;
      };

      // Reset pagination state for fresh search
      setGlobalPage(1);
      setGlobalHasMore(false);
      setGlobalTotalFound(0);

      // Fetch from all selected sources in parallel
      try {
        const fetchPromises = sourcesToSearch.map(async (source) => {
          const endpoint =
            source === "platform"
              ? "/api/search/experts/platform"
              : "/api/search/experts/deterministic"; // Use deterministic endpoint for global search
          const sourceParams = buildParamsForSource(source);

          // Store the global search params for "Load More" pagination
          if (source === "global") {
            lastSearchParamsRef.current = {
              endpoint: "/api/search/experts/deterministic",
              baseParams: new URLSearchParams(sourceParams.toString()),
            };
          }

          const response = await apiFetch(
            `${endpoint}?${sourceParams.toString()}`,
          );

          if (!response) {
            return { results: [], error: null, source };
          }

          if (response.status === 429) {
            const errorData = await response.json();
            return {
              results: [],
              error: errorData.error || "Rate limit exceeded",
              source,
            };
          }

          const data = await response.json();

          if (!response.ok) {
            return {
              results: [],
              error: data.error || "Failed to search experts",
              source,
            };
          }

          return {
            results: data.results || [],
            error: null,
            remaining: data.remaining,
            hasMore: data.hasMore || false,
            totalFound: data.totalFound || 0,
            source,
          };
        });

        const allResults = await Promise.all(fetchPromises);

        const combinedResults = [];
        const seenExperts = new Set();
        let backendRemaining = null;

        for (const result of allResults) {
          if (result.remaining !== undefined)
            backendRemaining = result.remaining;
          if (result.error && result.error.includes("Rate limit")) {
            toast.error(
              result.error ||
                "You've used all your searches. Sign in to continue searching.",
              { duration: 4000 },
            );
            setLoading(false);
            const remaining = getLocalRemainingSearches();
            window.dispatchEvent(
              new CustomEvent("freeSearchUsed", { detail: { remaining } }),
            );
            return;
          }

          if (result.error) {
            toast.error(result.error);
            continue;
          }

          // Track pagination state from deterministic (global) results
          if (result.source === "global") {
            setGlobalHasMore(result.hasMore || false);
            setGlobalTotalFound(result.totalFound || 0);
          }

          for (const expert of result.results || []) {
            const expertKey =
              expert.name || expert.orcid || expert.id || expert._id;
            if (expertKey && !seenExperts.has(expertKey)) {
              seenExperts.add(expertKey);
              // Tag each expert with its source
              combinedResults.push({ ...expert, _source: result.source });
            }
          }
        }

        // Guest: sync with backend response
        if (!isUserSignedIn && backendRemaining !== null) {
          const remaining = backendRemaining;

          if (remaining === 0) {
            toast(
              "You've used all your searches. Sign in for unlimited searches.",
              { duration: 5000, icon: "🔒" },
            );
          } else {
            toast.success(
              `Search successful! ${remaining} search${
                remaining !== 1 ? "es" : ""
              } remaining.`,
              { duration: 3000 },
            );
          }
          setLocalSearchCount(MAX_FREE_SEARCHES - remaining);
          window.dispatchEvent(
            new CustomEvent("freeSearchUsed", { detail: { remaining } }),
          );
        }

        const sortedResults = sortExpertsByCitations(combinedResults);
        setResults(sortedResults);

        const searchState = {
          researchArea: filterValue,
          diseaseOfInterest: "",
          location,
          locationMode,
          useMedicalInterest,
          userMedicalInterest,
          isOnPlatform,
          results: sortedResults,
          isInitialLoad: false,
        };
        sessionStorage.setItem(
          "experts_search_state",
          JSON.stringify(searchState),
        );
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
        toast.error(
          `Failed to search ${expertsLabel.toLowerCase()}. Please try again later.`,
        );
      } finally {
        setLoading(false);
      }
    }, 100);
  }

  function toggleCardExpansion(expert) {
    const expertId = expert.name || expert.id || expert._id;
    if (!expertId) return;

    const isExpanded = expandedCards[expertId];

    // If expanding, fetch publications if not already loaded
    if (!isExpanded && !publications[expertId]) {
      fetchPublications(expert);
    }

    setExpandedCards((prev) => ({
      ...prev,
      [expertId]: !isExpanded,
    }));
  }

  async function fetchPublications(expert) {
    const expertId = expert.name || expert.id || expert._id;
    if (!expertId) return;

    // Check if already loaded
    if (publications[expertId]) {
      return;
    }

    setLoadingPublications((prev) => ({ ...prev, [expertId]: true }));

    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    try {
      const response = await fetch(
        `${base}/api/search/expert/publications?author=${encodeURIComponent(
          expert.name,
        )}`,
      );
      const data = await response.json();

      setPublications((prev) => ({
        ...prev,
        [expertId]: data.publications || [],
      }));

      if (data.publications && data.publications.length === 0) {
        toast.error("No publications found for this researcher");
      }
    } catch (error) {
      console.error("Error fetching publications:", error);
      toast.error("Failed to fetch publications");
      setPublications((prev) => ({
        ...prev,
        [expertId]: [],
      }));
    } finally {
      setLoadingPublications((prev) => ({ ...prev, [expertId]: false }));
    }
  }

  // Helper function to get unique key for favorite tracking
  const getFavoriteKey = (item) => {
    return `expert-${item.name || item.orcid || item.id || item._id}`;
  };

  async function favorite(item) {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token");
    if (!userData?._id && !userData?.id) {
      toast.error("Please sign in to favorite items");
      return;
    }

    const favoriteKey = getFavoriteKey(item);

    // Prevent duplicate clicks
    if (favoritingItems.has(favoriteKey)) {
      return;
    }

    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    // For experts, use exact name as the primary identifier
    const itemId = item.name || item.id || item._id;

    const isFavorited = favorites.some((fav) => {
      if (fav.type !== "expert") return false;
      // Check by exact name match (primary identifier)
      if (item.name && fav.item?.name) {
        return fav.item.name === item.name;
      }
      // Fallback: check by id
      if (fav.item?.id === itemId || fav.item?._id === itemId) {
        return true;
      }
      return false;
    });

    // Optimistic UI update - update immediately
    const previousFavorites = [...favorites];
    let optimisticFavorites;

    if (isFavorited) {
      // Optimistically remove from favorites
      optimisticFavorites = favorites.filter((fav) => {
        if (fav.type !== "expert") return true;
        // Check by exact name match (primary identifier)
        if (item.name && fav.item?.name) {
          return fav.item.name !== item.name;
        }
        // Fallback: check by id
        return !(fav.item?.id === itemId || fav.item?._id === itemId);
      });
    } else {
      // Optimistically add to favorites
      const itemToStore = {
        ...item,
        id: itemId,
        _id: item._id || itemId,
      };

      if (item.name) {
        itemToStore.name = item.name;
      }
      if (item.orcid) {
        itemToStore.orcid = item.orcid;
      }

      optimisticFavorites = [
        ...favorites,
        {
          type: "expert",
          item: itemToStore,
          _id: `temp-${Date.now()}`,
        },
      ];
    }

    // Update UI immediately
    setFavorites(optimisticFavorites);
    setFavoritingItems((prev) => new Set(prev).add(favoriteKey));

    try {
      if (isFavorited) {
        // Find the actual favorite to get its stored ID
        const foundFavorite = previousFavorites.find((fav) => {
          if (fav.type !== "expert") return false;

          // Check by exact name match (primary identifier)
          if (item.name && fav.item?.name) {
            return fav.item.name === item.name;
          }

          // Fallback: check by id
          if (fav.item?.id === itemId || fav.item?._id === itemId) {
            return true;
          }

          return false;
        });

        // Use the stored name or id from the favorite, or fallback to itemId
        let deleteId =
          foundFavorite?.item?.name ||
          foundFavorite?.item?.id ||
          foundFavorite?.item?._id ||
          item.name ||
          item.id ||
          item._id;

        const deleteResponse = await fetch(
          `${base}/api/favorites/${
            userData._id || userData.id
          }?type=expert&id=${encodeURIComponent(deleteId)}`,
          {
            method: "DELETE",
          },
        );

        if (!deleteResponse.ok) {
          throw new Error("Failed to delete favorite");
        }

        toast.success("Removed from favorites");
      } else {
        // Store complete item information
        const itemToStore = {
          ...item, // Store all item properties
          id: itemId,
          _id: item._id || itemId,
        };

        // Ensure name is stored as the primary identifier
        if (item.name) {
          itemToStore.name = item.name;
        }

        // Also store orcid if available (for reference, but not used for matching)
        if (item.orcid) {
          itemToStore.orcid = item.orcid;
        }

        const addResponse = await fetch(
          `${base}/api/favorites/${userData._id || userData.id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "expert",
              item: itemToStore,
            }),
          },
        );

        if (!addResponse.ok) {
          throw new Error("Failed to add favorite");
        }

        toast.success("Added to favorites");
      }

      // Refresh favorites from backend - wait a bit to ensure backend has processed
      await new Promise((resolve) => setTimeout(resolve, 100));
      const favResponse = await fetch(
        `${base}/api/favorites/${userData._id || userData.id}`,
      );

      if (favResponse.ok) {
        const favData = await favResponse.json();
        setFavorites(favData.items || []);
      } else {
        throw new Error("Failed to refresh favorites");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      // Revert optimistic update on error
      setFavorites(previousFavorites);
      toast.error("Failed to update favorites");
    } finally {
      // Remove from loading set
      setFavoritingItems((prev) => {
        const next = new Set(prev);
        next.delete(favoriteKey);
        return next;
      });
    }
  }

  async function sendConnectionRequest() {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (!userData?._id && !userData?.id) {
      toast.error("Please sign in to send connection requests");
      return;
    }
    if (userData.role !== "researcher") {
      toast.error("Only researchers can send connection requests");
      return;
    }
    const expert = connectionRequestModal.expert;
    const expertUserId = expert?.userId || expert?._id || expert?.id;
    if (!expertUserId) return;

    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    try {
      const response = await fetch(`${base}/api/connection-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterId: userData._id || userData.id,
          receiverId: expertUserId,
          message: connectionRequestModal.message || "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send connection request");
      }

      toast.success("Connection request sent successfully!");
      setConnectionRequestModal({ open: false, message: "", expert: null });
      setConnectionRequestStatus((prev) => ({
        ...prev,
        [expertUserId]: {
          hasRequest: true,
          isConnected: false,
          status: "pending",
          isRequester: true,
        },
      }));
    } catch (error) {
      console.error("Error sending connection request:", error);
      toast.error(error.message || "Failed to send connection request");
    }
  }

  // Fetch connection status for platform experts when results change
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (userData?.role !== "researcher" || !(userData?._id || userData?.id))
      return;
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const currentUserId = userData._id || userData.id;
    const platformExperts = (results || []).filter(
      (expert) =>
        expert._source === "platform" &&
        (expert.userId || expert._id || expert.id),
    );
    platformExperts.forEach((expert) => {
      const expertUserId = expert.userId || expert._id || expert.id;
      if (!expertUserId || expertUserId === currentUserId) return;
      fetch(
        `${base}/api/connection-requests/${currentUserId}/${expertUserId}/status`,
      )
        .then((r) => r.json())
        .then((connData) => {
          setConnectionRequestStatus((prev) => ({
            ...prev,
            [expertUserId]: {
              hasRequest: connData.hasRequest || false,
              isConnected: connData.isConnected || false,
              status: connData.status || null,
              isRequester: connData.isRequester || false,
            },
          }));
        })
        .catch(() => {});
    });
  }, [results]);

  // Load favorites on mount
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token");
    if (userData?._id && token) {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      fetch(`${base}/api/favorites/${userData._id || userData.id}`)
        .then((r) => r.json())
        .then((data) => setFavorites(data.items || []))
        .catch((err) => console.error("Error loading favorites:", err));
    }
  }, []);

  function openDetailsModal(expert) {
    setDetailsModal({
      open: true,
      expert: expert,
    });
  }

  function closeDetailsModal() {
    setDetailsModal({
      open: false,
      expert: null,
    });
  }

  // Restore search state from sessionStorage on mount (for all users, signed in or not)
  useEffect(() => {
    const savedState = sessionStorage.getItem("experts_search_state");
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setResearchArea(state.researchArea || "");
        setDiseaseOfInterest(state.diseaseOfInterest || "");
        setLocation(state.location || "");
        setLocationMode(state.locationMode || "global");
        // useMedicalInterest is loaded from localStorage in useState initializer
        // Only override if localStorage doesn't have it
        if (localStorage.getItem("useMedicalInterest") === null) {
          setUseMedicalInterest(
            state.useMedicalInterest !== undefined
              ? state.useMedicalInterest
              : false,
          );
        }
        setUserMedicalInterest(state.userMedicalInterest || "");
        // Handle both old format (expertSource) and new format (expertSources) and new boolean format (isOnPlatform)
        if (state.isOnPlatform !== undefined) {
          setIsOnPlatform(state.isOnPlatform);
        } else if (state.expertSources) {
          // Convert old object format to new boolean format
          setIsOnPlatform(state.expertSources.platform !== false);
        } else if (state.expertSource) {
          // Convert old string format to new boolean format
          setIsOnPlatform(state.expertSource === "platform");
        }
        setResults(state.results || []);
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
      setResearchArea("");
      setDiseaseOfInterest("");
      setLocation("");
      setLocationMode("global");
      setUseMedicalInterest(true);
      setUserMedicalInterest("");
      setIsOnPlatform(true);
      setResults([]);
      setIsInitialLoad(true);
      setIsSignedIn(false);
      setUserLocation(null);
      initialFetchDone.current = false; // Reset the fetch flag
      sessionStorage.removeItem("experts_search_state");
    };

    window.addEventListener("logout", handleLogout);
    return () => window.removeEventListener("logout", handleLogout);
  }, []);

  // Check for guest info or URL parameters, then fetch user profile
  useEffect(() => {
    // Skip if we've already done the initial fetch
    if (initialFetchDone.current) return;

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

    // If URL has a query, set it as research area
    if (urlQuery) {
      setResearchArea(urlQuery);
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
          setDiseaseOfInterest(condition);
          setUserMedicalInterest(condition);
          setUseMedicalInterest(true);
        }
      }

      if (!isUserSignedIn && (guestLocation || parsedGuestInfo?.location)) {
        const loc = guestLocation || parsedGuestInfo?.location;
        if (loc) {
          setLocation(loc);
          setLocationMode("custom");
        }
      }

      if (!userData?._id && !userData?.id) {
        // If guest has info and no saved state, use it
        if (
          (guestCondition || parsedGuestInfo?.condition) &&
          !sessionStorage.getItem("experts_search_state")
        ) {
          if (localStorage.getItem("useMedicalInterest") === null) {
            setUseMedicalInterest(false);
          }
        } else if (localStorage.getItem("useMedicalInterest") === null) {
          setUseMedicalInterest(false);
        }
        setIsSignedIn(false);
        initialFetchDone.current = true; // Mark as done even if no user
        return;
      }

      setIsSignedIn(true);

      // Only set location mode if not restored from sessionStorage
      const savedState = sessionStorage.getItem("experts_search_state");
      if (!savedState) {
        setLocationMode("global"); // Set to global by default
      }

      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      try {
        // Fetch profile for location
        const response = await fetch(
          `${base}/api/profile/${userData._id || userData.id}`,
        );
        const data = await response.json();
        if (data.profile) {
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
          const medicalInterest = userData.medicalInterests[0];
          setUserMedicalInterest(medicalInterest); // Use first medical interest

          // Don't auto-search - user must manually search
          // Respect localStorage state if available; default is unchecked
          if (localStorage.getItem("useMedicalInterest") === null) {
            setUseMedicalInterest(false);
          }
        } else {
          setUseMedicalInterest(false);
        }

        initialFetchDone.current = true; // Mark as done after successful fetch
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUseMedicalInterest(false);
        initialFetchDone.current = true; // Mark as done even on error
      }
    }

    fetchUserData();
  }, []);

  // Update disease of interest when toggle changes (only for manual searches)
  useEffect(() => {
    if (
      !isInitialLoad &&
      useMedicalInterest &&
      userMedicalInterest &&
      !diseaseOfInterest
    ) {
      setDiseaseOfInterest(userMedicalInterest);
    } else if (
      !useMedicalInterest &&
      diseaseOfInterest === userMedicalInterest
    ) {
      setDiseaseOfInterest("");
    }
  }, [useMedicalInterest, userMedicalInterest, isInitialLoad]);

  const EXPERTS_TUTORIAL_STEPS = useMemo(
    () => [
      {
        target: "[data-tour='experts-header']",
        title: `Explore ${expertsLabel}`,
        content: `Hi! I'm Yori. This is where you find and connect with medical researchers. Let me show you the key features.`,
        placement: "bottom",
      },
      {
        target: "[data-tour='experts-tabs']",
        title: "Explore or Find",
        content:
          "Use Explore to search by condition and expertise. Use Find an Expert to search for a researcher by name.",
        placement: "bottom",
      },
      {
        target: "[data-tour='experts-on-platform']",
        title: "On platform vs global",
        content:
          "When **On platform** is checked, you see researchers who are on Collabiora. Uncheck it to search global experts from other sources.",
        placement: "bottom",
      },
      {
        target: "[data-tour='experts-search-bar']",
        title: "Search for experts",
        content:
          "Enter a condition and the expertise you're looking for. You can filter by location. Your medical interest can be used to pre-fill the condition.",
        placement: "bottom",
      },
      {
        target: "[data-tour='experts-search-btn']",
        title: "Run your search",
        content:
          "Click Search to find matching researchers. Results show citation metrics and you can expand a card to see publications and actions.",
        placement: "bottom",
      },
      {
        target: "[data-tour='experts-results-area']",
        title: "Your results",
        content:
          "Matching experts appear here. Expand a card to view their profile, publications, and send a connection request (researchers only).",
        placement: "bottom",
      },
      {
        target: "[data-tour='experts-match-badge']",
        title: "Why this ranking?",
        content:
          "Each expert gets a match score based on your search. The bar and explanation show how well they fit your condition and expertise.",
        placement: "bottom",
      },
      {
        target: "[data-tour='experts-view-profile-btn']",
        title: "View profile",
        content:
          "Open the full expert profile to see their research, publications, and how to get in touch.",
        placement: "top",
      },
      {
        target: "[data-tour='experts-favourites-btn']",
        title: "Save to favourites",
        content:
          "Save experts you're interested in so you can find them easily later.",
        placement: "left",
      },
      {
        target: "[data-tour='yori-chatbot']",
        title: "Meet Yori!",
        content: isSignedIn
          ? "That's me! You can always click the helper in the bottom-right corner to ask questions about experts, trials, or research."
          : "That's me! Sign in and use the helper in the bottom-right corner to get personalized help with experts, trials, and research.",
        placement: "top",
        allowTargetClick: true,
        spotlightShape: "circle",
        spotlightPadding: 18,
      },
    ],
    [expertsLabel, isSignedIn],
  );

  return (
    <Layout>
      <PageTutorial
        pageId="experts"
        steps={EXPERTS_TUTORIAL_STEPS}
        enabled={showTutorial}
        onStepChange={handleTutorialStepChange}
        onComplete={() => {
          setForceTutorial(false);
          // Keep tutorial sample experts visible; they clear only when user runs a real search
        }}
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 relative overflow-hidden">
        <AnimatedBackground />

        <div className="relative pt-24 px-4 md:px-8 mx-auto max-w-6xl pb-8 ">
          {/* Compact Header */}
          <div
            className="text-center mb-6 animate-fade-in"
            data-tour="experts-header"
          >
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-[#2F3C96] via-[#474F97] to-[#D0C4E2] bg-clip-text text-transparent mb-1">
              <AuroraText
                speed={2.5}
                colors={["#2F3C96"]}
              >
                {expertsLabel}
              </AuroraText>
            </h1>
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  resetTutorialCompleted("experts");
                  setForceTutorial(true);
                  loadTutorialSampleExperts().then((sample) => {
                    if (sample?.length) setTutorialSampleResults(sample);
                  });
                }}
                className="inline-flex items-center gap-1 text-xs text-[#2F3C96] hover:text-[#474F97] font-medium hover:underline"
                title="Show tutorial again"
              >
                <Info className="w-3.5 h-3.5" />
                Tutorial
              </button>
            </div>
            {/* Free Searches Indicator */}
            <div className="mt-3 flex justify-center items-center w-full">
              <FreeSearchesIndicator user={user} centered={true} />
            </div>
          </div>

          {/* Explore / Find an Expert Tabs */}
          <div className="max-w-4xl mx-auto mb-6" data-tour="experts-tabs">
            <div className="flex items-center gap-0 border-b border-[#E8E8E8] bg-white rounded-t-lg">
              <button
                onClick={() => setViewMode("explore")}
                className={`px-6 py-3 font-semibold text-sm transition-all relative ${
                  viewMode === "explore"
                    ? "text-[#2F3C96] border-b-2 border-[#2F3C96]"
                    : "text-[#787878] hover:text-[#484848]"
                }`}
              >
                Explore
              </button>
              <button
                onClick={() => setViewMode("find")}
                className={`px-6 py-3 font-semibold text-sm transition-all relative ${
                  viewMode === "find"
                    ? "text-[#2F3C96] border-b-2 border-[#2F3C96]"
                    : "text-[#787878] hover:text-[#484848]"
                }`}
              >
                Find an Expert
              </button>
            </div>
          </div>

          {/* Search Bar - Explore Mode */}
          {viewMode === "explore" && (
            <div
              className="bg-white rounded-xl shadow-lg p-5 mb-4 border border-slate-200 animate-fade-in"
              data-tour="experts-search-bar"
            >
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
                {/* Main Search Inputs */}
                <div className="flex flex-col md:flex-row gap-2">
                  <SmartSearchInput
                    value={diseaseOfInterest}
                    onChange={setDiseaseOfInterest}
                    onSubmit={(value) =>
                      search({
                        diseaseOfInterest: resolveToCanonical(
                          value,
                          expertsDiseaseCanonicalMap,
                        ),
                      })
                    }
                    placeholder="Condition of Interest"
                    extraTerms={diseaseSuggestionTerms}
                    canonicalMap={expertsDiseaseCanonicalMap}
                    className="flex-1"
                    autoSubmitOnSelect={false}
                  />
                  <SmartSearchInput
                    value={researchArea}
                    onChange={setResearchArea}
                    onSubmit={(value) =>
                      search({
                        researchArea: resolveToCanonical(
                          value,
                          expertsExpertiseCanonicalMap,
                        ),
                      })
                    }
                    placeholder="What expertise are you looking for?"
                    extraTerms={expertSuggestionTerms}
                    canonicalMap={expertsExpertiseCanonicalMap}
                    className="flex-1"
                    autoSubmitOnSelect={false}
                  />
                  <Button
                    onClick={search}
                    className="text-white px-5 py-2 rounded-lg shadow-md hover:shadow-lg transition-all text-sm font-semibold"
                    style={{ backgroundColor: "#2F3C96" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#252b73";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#2F3C96";
                    }}
                    data-tour="experts-search-btn"
                  >
                    Search
                  </Button>
                </div>

                {/* Medical Interest Toggle */}
                {userMedicalInterest && (
                  <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                    <input
                      type="checkbox"
                      id="useMedicalInterest"
                      checked={useMedicalInterest}
                      onChange={(e) => {
                        setUseMedicalInterest(e.target.checked);
                        if (e.target.checked) {
                          // Only set to medical interest if field is empty or already matches
                          if (
                            !diseaseOfInterest ||
                            diseaseOfInterest === userMedicalInterest
                          ) {
                            setDiseaseOfInterest(userMedicalInterest);
                          }
                        } else {
                          // Only clear if the current value matches the medical interest
                          // Preserve user's explicitly entered condition
                          if (diseaseOfInterest === userMedicalInterest) {
                            setDiseaseOfInterest("");
                          }
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <label
                      htmlFor="useMedicalInterest"
                      className="text-xs text-slate-700 flex-1 cursor-pointer"
                    >
                      <span className="font-medium">
                        Using your medical interest:
                      </span>{" "}
                      <span className="text-indigo-700 font-semibold">
                        {userMedicalInterest}
                      </span>
                    </label>
                  </div>
                )}

                {/* Location Options: Near Me | Global | Custom */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-700">
                      Location:
                    </span>
                    {userLocation && (
                      <button
                        onClick={() => {
                          setLocationMode("current");
                          setLocation("");
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                          locationMode === "current"
                            ? "shadow-md border border-[#D0C4E2]"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                        style={
                          locationMode === "current"
                            ? { backgroundColor: "#D0C4E2", color: "#2F3C96" }
                            : undefined
                        }
                      >
                        <MapPin className="w-3 h-3" />
                        Near Me
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setLocationMode("global");
                        setLocation("");
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                        locationMode === "global"
                          ? "shadow-md border border-[#D0C4E2]"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                      style={
                        locationMode === "global"
                          ? { backgroundColor: "#D0C4E2", color: "#2F3C96" }
                          : undefined
                      }
                    >
                      Global
                    </button>
                    <button
                      onClick={() => {
                        setLocationMode("custom");
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                        locationMode === "custom"
                          ? "shadow-md border border-[#D0C4E2]"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                      style={
                        locationMode === "custom"
                          ? { backgroundColor: "#D0C4E2", color: "#2F3C96" }
                          : undefined
                      }
                    >
                      Custom
                    </button>
                  </div>

                  {locationMode === "custom" && (
                    <LocationInput
                      value={location}
                      onChange={setLocation}
                      placeholder="e.g. City, State/Province, Country"
                      className="w-full"
                      inputClassName="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-900 placeholder-slate-400"
                    />
                  )}
                </div>

                {/* Expert Source Toggle */}
                <div
                  className="flex flex-col gap-2"
                  data-tour="experts-on-platform"
                >
                  <span className="text-xs font-medium text-slate-700">
                    {expertsLabel} Source:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={isOnPlatform}
                        onChange={(e) => {
                          setIsOnPlatform(e.target.checked);
                        }}
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 focus:ring-2"
                      />
                      <span className="text-xs text-slate-700 font-medium">
                        On Platform
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Find an Expert Search Bar */}
          {viewMode === "find" && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-4 border border-slate-200 animate-fade-in">
              <BorderBeam
                duration={10}
                size={100}
                className="from-transparent via-[#2F3C96] to-transparent"
              />
              <div className="space-y-4">
                <div>
                  <label
                    className="block text-sm font-semibold mb-2"
                    style={{ color: "#2F3C96" }}
                  >
                    Search by Researcher Name
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={findExpertName}
                      onChange={(e) => {
                        setFindExpertName(e.target.value);
                        if (!e.target.value.trim())
                          setFindExpertHasSearched(false);
                      }}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && findExpertName.trim()) {
                          searchExpertByName();
                        }
                      }}
                      placeholder="e.g. John Smith, Maria Garcia"
                      className="flex-1 px-4 py-2.5 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                      style={{
                        borderColor: "#E8E8E8",
                        color: "#2F3C96",
                        "--tw-ring-color": "#D0C4E2",
                      }}
                    />
                    <Button
                      onClick={searchExpertByName}
                      disabled={!findExpertName.trim() || findExpertLoading}
                      className="text-white px-6 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "#2F3C96" }}
                      onMouseEnter={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.backgroundColor = "#252b73";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#2F3C96";
                      }}
                    >
                      {findExpertLoading ? (
                        <Loader2 className="w-4 h-4 spinner" />
                      ) : (
                        "Search"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs mt-2" style={{ color: "#787878" }}>
                    Search for researchers by name to find experts and view
                    their citation metrics.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Results Area - wrapper for tour targeting */}
          <div data-tour="experts-results-area" className="min-h-[200px]">
            {/* Skeleton Loaders - Explore */}
            {viewMode === "explore" && (loading || tutorialSampleLoading) && (
              <div className="flex flex-col gap-4">
                {[...Array(5)].map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-lg shadow-md border border-slate-200 animate-pulse"
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-200 to-slate-200 rounded-lg shrink-0"></div>
                        <div className="flex-1">
                          <div className="h-5 bg-slate-200 rounded w-60 mb-2"></div>
                          <div className="h-3 bg-slate-200 rounded w-40 mb-3"></div>
                          <div className="space-y-2 mb-3">
                            <div className="h-3 bg-slate-200 rounded w-full"></div>
                            <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                          </div>
                          <div className="h-20 bg-slate-100 rounded mb-3"></div>
                          <div className="flex flex-wrap gap-2">
                            <div className="h-6 w-20 bg-slate-100 rounded-md"></div>
                            <div className="h-6 w-24 bg-slate-100 rounded-md"></div>
                            <div className="h-6 w-18 bg-slate-100 rounded-md"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Skeleton Loaders - Find an Expert */}
            {viewMode === "find" && findExpertLoading && (
              <div className="flex flex-col gap-4">
                {[...Array(5)].map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-lg shadow-md border border-slate-200 animate-pulse p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-indigo-200 to-slate-200 rounded-lg shrink-0"></div>
                      <div className="flex-1">
                        <div className="h-5 bg-slate-200 rounded w-48 mb-2"></div>
                        <div className="h-3 bg-slate-200 rounded w-32 mb-3"></div>
                        <div className="h-3 bg-slate-200 rounded w-40 mb-2"></div>
                        <div className="flex gap-2">
                          <div className="h-6 w-24 bg-slate-100 rounded-md"></div>
                          <div className="h-6 w-28 bg-slate-100 rounded-md"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Results Section - Explore Mode */}
            {viewMode === "explore" &&
            !loading &&
            !tutorialSampleLoading &&
            (results.length > 0 || tutorialSampleResults.length > 0) ? (
              <div className="flex flex-col gap-4">
                {(tutorialSampleResults.length > 0
                  ? tutorialSampleResults
                  : results
                )
                  .slice(0, isSignedIn ? undefined : 3)
                  .map((expert, cardIdx) => {
                    const isFirstCard = cardIdx === 0;
                    // Use name as the primary identifier
                    const itemId = expert.name || expert.id || expert._id;
                    const expertId = expert.name || expert.id || expert._id;
                    const isExpanded = expandedCards[expertId];
                    const expertPublications = publications[expertId] || [];
                    const isLoadingPubs = loadingPublications[expertId];

                    // Check if expert is favorited by exact name match
                    const isExpertFavorited = favorites.some((fav) => {
                      if (fav.type !== "expert") return false;

                      // Check by exact name match (primary identifier)
                      if (expert.name && fav.item?.name) {
                        return fav.item.name === expert.name;
                      }

                      // Fallback: check by id
                      if (fav.item?.id === itemId || fav.item?._id === itemId) {
                        return true;
                      }

                      return false;
                    });

                    return (
                      <div
                        key={itemId}
                        className={`rounded-xl shadow-sm border transition-all duration-300 cursor-pointer group overflow-hidden transform hover:-translate-y-0.5 animate-fade-in ${
                          isExpanded
                            ? "bg-white shadow-lg border-indigo-300 ring-1 ring-indigo-200 ring-opacity-50"
                            : "bg-white border-slate-200 hover:shadow-lg hover:border-indigo-300"
                        }`}
                        style={{ animationDelay: `${cardIdx * 50}ms` }}
                        onClick={() => toggleCardExpansion(expert)}
                      >
                        <div className="p-5">
                          {/* Match Badge Banner */}
                          {expert.matchPercentage !== undefined && (
                            <div
                              className="mb-4"
                              {...(isFirstCard
                                ? { "data-tour": "experts-match-badge" }
                                : {})}
                            >
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
                                    {expert.matchPercentage}% Match
                                  </span>
                                </div>
                                {expert.matchExplanation && (
                                  <span
                                    className="text-xs truncate flex-1 ml-1.5 max-w-[150px] sm:max-w-none"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    {expert.matchExplanation}
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
                                    width: `${expert.matchPercentage}%`,
                                    background:
                                      "linear-gradient(90deg, #2F3C96, #253075)",
                                  }}
                                ></div>
                              </div>
                            </div>
                          )}

                          <div className="flex items-start gap-4">
                            {/* Avatar */}
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0 transition-all duration-300 group-hover:shadow-lg">
                              {expert.name?.charAt(0)?.toUpperCase() || "E"}
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 min-w-0">
                              {/* Header */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <User className="w-4 h-4 text-indigo-600" />
                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                                      {expertLabel}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <h3 className="text-base font-bold text-slate-900">
                                      {expert.name || `Unknown ${expertLabel}`}
                                    </h3>
                                    {expert.scores && (
                                      <div className="relative group/tip inline-flex">
                                        <div className="p-0.5 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-help">
                                          <Info className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="absolute left-0 top-full mt-1 z-50 invisible opacity-0 group-hover/tip:visible group-hover/tip:opacity-100 transition-all duration-200 pointer-events-none">
                                          <div className="bg-slate-900 text-white text-xs rounded-lg py-3 px-4 shadow-xl w-96 max-w-[90vw] leading-relaxed">
                                            {(() => {
                                              const s = expert.scores;
                                              const strengths = [];

                                              // Build dynamic strengths list based on scores
                                              if (s.citations >= 0.7) {
                                                strengths.push(
                                                  "Influential research cited by the scientific community",
                                                );
                                              }
                                              if (s.works >= 0.6) {
                                                strengths.push(
                                                  "Consistent work in this research area",
                                                );
                                              }
                                              if (s.recency >= 0.6) {
                                                strengths.push(
                                                  "Recent publications in the last few years",
                                                );
                                              }
                                              if (s.fieldRelevance >= 0.7) {
                                                strengths.push(
                                                  "Close relevance to your search topic",
                                                );
                                              }
                                              if (
                                                s.location >= 0.8 &&
                                                expert.affiliation
                                              ) {
                                                // Extract city name from affiliation if possible, otherwise use location
                                                const cityMatch =
                                                  expert.affiliation.match(
                                                    /(Toronto|Vancouver|Montreal|Calgary|Ottawa|Edmonton|Winnipeg|Quebec|Hamilton|London)/i,
                                                  );
                                                const cityName = cityMatch
                                                  ? cityMatch[1]
                                                  : expert.location ||
                                                    "research";
                                                strengths.push(
                                                  `Affiliation with leading ${cityName} research centers`,
                                                );
                                              }

                                              // Fallback if no specific strengths identified
                                              if (strengths.length === 0) {
                                                strengths.push(
                                                  "Strong publication record",
                                                );
                                                strengths.push(
                                                  "Relevant research contributions",
                                                );
                                              }

                                              return (
                                                <div className="space-y-2">
                                                  <p className="font-semibold text-indigo-300 mb-2">
                                                    Why this ranking?
                                                  </p>
                                                  <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                                                    {strengths.map(
                                                      (strength, idx) => (
                                                        <li
                                                          key={idx}
                                                          className="text-xs"
                                                        >
                                                          {strength}
                                                        </li>
                                                      ),
                                                    )}
                                                  </ul>
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {expert.orcid && (
                                    <p className="text-xs text-indigo-600 mt-0.5">
                                      ORCID: {expert.orcid}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      favorite(expert);
                                    }}
                                    disabled={favoritingItems.has(
                                      getFavoriteKey(expert),
                                    )}
                                    {...(isFirstCard && {
                                      "data-tour": "experts-favourites-btn",
                                    })}
                                    className={`p-2 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                                      isExpertFavorited
                                        ? "bg-red-50 text-red-500 hover:bg-red-100"
                                        : "text-slate-400 hover:bg-slate-100 hover:text-red-500"
                                    }`}
                                    title={
                                      isExpertFavorited
                                        ? "Remove from favorites"
                                        : "Add to favorites"
                                    }
                                  >
                                    {favoritingItems.has(
                                      getFavoriteKey(expert),
                                    ) ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Heart
                                        className={`w-4 h-4 transition-all duration-300 ${
                                          isExpertFavorited
                                            ? "fill-current"
                                            : ""
                                        }`}
                                      />
                                    )}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleCardExpansion(expert);
                                    }}
                                    className={`p-2 rounded-lg transition-all duration-300 ${
                                      isExpanded
                                        ? "bg-indigo-100 text-indigo-600"
                                        : "text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                                    }`}
                                  >
                                    <ChevronDown
                                      className={`w-4 h-4 transition-transform duration-500 ${
                                        isExpanded ? "rotate-180" : ""
                                      }`}
                                    />
                                  </button>
                                </div>
                              </div>

                              {/* Basic Info */}
                              <div className="space-y-1 mb-3">
                                {expert.currentPosition && (
                                  <p className="text-xs text-slate-700 line-clamp-1">
                                    {expert.currentPosition}
                                  </p>
                                )}
                                {!expert.currentPosition &&
                                  expert.affiliation && (
                                    <p className="text-xs text-slate-700 line-clamp-1">
                                      {expert.affiliation}
                                    </p>
                                  )}
                                {expert.location && (
                                  <div className="flex items-center text-xs text-slate-600">
                                    <MapPin className="w-3 h-3 mr-1.5 shrink-0" />
                                    <span>{expert.location}</span>
                                  </div>
                                )}
                                {/* Biography */}
                                {expert.biography && (
                                  <p className="text-xs text-slate-700 mt-2 line-clamp-2">
                                    {expert.biography}
                                  </p>
                                )}
                                {/* Metrics Badges (from deterministic/global results) */}
                                {expert.metrics && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {expert.metrics.totalPublications > 0 && (
                                      <div className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-xs font-medium">
                                        <BookOpen className="w-3 h-3" />
                                        <span>
                                          {expert.metrics.totalPublications.toLocaleString()}{" "}
                                          publications
                                        </span>
                                      </div>
                                    )}
                                    {expert.metrics.totalCitations > 0 && (
                                      <div className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-xs font-medium">
                                        <TrendingUp className="w-3 h-3" />
                                        <span>
                                          {expert.metrics.totalCitations.toLocaleString()}{" "}
                                          citations
                                        </span>
                                      </div>
                                    )}
                                    {expert.metrics.hIndex > 0 && (
                                      <div className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-xs font-medium">
                                        <Award className="w-3 h-3" />
                                        <span>
                                          h-index: {expert.metrics.hIndex}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {/* Research Interests */}
                                {expert.researchInterests &&
                                  Array.isArray(expert.researchInterests) &&
                                  expert.researchInterests.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {expert.researchInterests
                                        .slice(0, 3)
                                        .map((interest, idx) => (
                                          <span
                                            key={idx}
                                            className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full"
                                          >
                                            {interest}
                                          </span>
                                        ))}
                                      {expert.researchInterests.length > 3 && (
                                        <span className="text-xs text-slate-600">
                                          +{expert.researchInterests.length - 3}{" "}
                                          more
                                        </span>
                                      )}
                                    </div>
                                  )}
                              </div>

                              {/* Expanded Publications Section */}
                              <div
                                className={`overflow-hidden transition-all duration-500 ease-in-out ${
                                  isExpanded
                                    ? "max-h-[500px] opacity-100 mt-3"
                                    : "max-h-0 opacity-0 mt-0"
                                }`}
                              >
                                <div className="pt-3 border-t border-slate-200">
                                  {isLoadingPubs ? (
                                    <div className="flex items-center justify-center py-4">
                                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                      <span className="ml-2 text-sm text-slate-600">
                                        Loading publications...
                                      </span>
                                    </div>
                                  ) : expertPublications.length > 0 ? (
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2 mb-2">
                                        <BookOpen className="w-4 h-4 text-indigo-600" />
                                        <h4 className="text-sm font-semibold text-indigo-700">
                                          Top Publications
                                        </h4>
                                      </div>
                                      <div className="flex flex-col gap-2">
                                        {expertPublications
                                          .slice(0, 2)
                                          .map((pub, idx) => (
                                            <div
                                              key={idx}
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              className="bg-indigo-50 rounded-lg p-3 border border-indigo-200 hover:border-indigo-300 hover:shadow-sm transition-all duration-300"
                                            >
                                              <a
                                                href={pub.link || "#"}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block"
                                              >
                                                <h5 className="text-sm font-semibold text-slate-900 line-clamp-2 mb-2 hover:text-indigo-600 transition-colors">
                                                  {pub.title}
                                                </h5>
                                                <div className="flex items-center gap-3 text-xs text-slate-600">
                                                  {pub.year && (
                                                    <span className="font-medium text-indigo-600">
                                                      {pub.year}
                                                    </span>
                                                  )}
                                                  {pub.citations > 0 && (
                                                    <span>
                                                      {pub.citations}{" "}
                                                      {pub.citations === 1
                                                        ? "citation"
                                                        : "citations"}
                                                    </span>
                                                  )}
                                                </div>
                                              </a>
                                            </div>
                                          ))}
                                      </div>
                                      {expertPublications.length > 2 && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openDetailsModal(expert);
                                          }}
                                          className="w-full text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-indigo-50"
                                        >
                                          View all {expertPublications.length}{" "}
                                          publications
                                          <ExternalLink className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-center py-4">
                                      <BookOpen className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                                      <p className="text-sm text-slate-500">
                                        No publications found
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-100">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const params = new URLSearchParams();
                                    params.set("name", expert.name || "");
                                    if (expert.affiliation)
                                      params.set(
                                        "affiliation",
                                        expert.affiliation,
                                      );
                                    if (expert.location)
                                      params.set("location", expert.location);
                                    if (expert.orcid)
                                      params.set("orcid", expert.orcid);
                                    if (expert.verification?.openAlexId) {
                                      params.set(
                                        "openAlexId",
                                        expert.verification.openAlexId,
                                      );
                                    }
                                    if (expert.biography)
                                      params.set("biography", expert.biography);
                                    if (
                                      expert.researchInterests &&
                                      Array.isArray(expert.researchInterests)
                                    ) {
                                      params.set(
                                        "researchInterests",
                                        JSON.stringify(
                                          expert.researchInterests,
                                        ),
                                      );
                                    }

                                    // Open profile in new tab so experts list stays on this page
                                    let path;
                                    if (expert._source === "platform") {
                                      const expertUserId =
                                        expert.userId ||
                                        expert._id ||
                                        expert.id;
                                      path = expertUserId
                                        ? `/collabiora-expert/profile/${expertUserId}?${params.toString()}`
                                        : `/expert/profile?${params.toString()}`;
                                    } else {
                                      path = `/expert/profile?${params.toString()}`;
                                    }
                                    window.open(
                                      path,
                                      "_blank",
                                      "noopener,noreferrer",
                                    );
                                  }}
                                  {...(isFirstCard && {
                                    "data-tour": "experts-view-profile-btn",
                                  })}
                                  className="flex-1 flex items-center justify-center gap-2 py-2 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
                                  style={{
                                    background:
                                      "linear-gradient(135deg, #2F3C96, #253075)",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.background =
                                      "linear-gradient(135deg, #253075, #1C2454)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.background =
                                      "linear-gradient(135deg, #2F3C96, #253075)";
                                  }}
                                >
                                  <User className="w-4 h-4" />
                                  View Profile
                                </button>
                                {/* Connect button - researchers only, on-platform experts */}
                                {expert._source === "platform" &&
                                  user?.role === "researcher" &&
                                  (expert.userId || expert._id || expert.id) &&
                                  (() => {
                                    const expertUserId =
                                      expert.userId || expert._id || expert.id;
                                    const cStatus =
                                      connectionRequestStatus[expertUserId] ||
                                      {};
                                    if (cStatus.isConnected) {
                                      return (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(
                                              `/collabiora-expert/profile/${expertUserId}`,
                                              "_blank",
                                              "noopener,noreferrer",
                                            );
                                          }}
                                          className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg transition-colors bg-emerald-600 hover:bg-emerald-700 text-white"
                                        >
                                          <MessageCircle className="w-3.5 h-3.5" />
                                          Message
                                        </button>
                                      );
                                    }
                                    if (cStatus.status === "pending") {
                                      return (
                                        <button
                                          disabled
                                          className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg bg-slate-200 text-slate-600 cursor-not-allowed"
                                        >
                                          <Clock className="w-3.5 h-3.5" />
                                          {cStatus.isRequester
                                            ? "Request Sent"
                                            : "Pending"}
                                        </button>
                                      );
                                    }
                                    if (cStatus.status === "rejected") {
                                      return (
                                        <button
                                          disabled
                                          className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg bg-red-100 text-red-600 cursor-not-allowed"
                                        >
                                          <AlertCircle className="w-3.5 h-3.5" />
                                          Rejected
                                        </button>
                                      );
                                    }
                                    return (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConnectionRequestModal({
                                            open: true,
                                            message: "",
                                            expert,
                                          });
                                        }}
                                        className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg transition-colors border-2 border-[#2F3C96] text-[#2F3C96] hover:bg-[#2F3C96]/5"
                                      >
                                        <UserPlus className="w-3.5 h-3.5" />
                                        Connect
                                      </button>
                                    );
                                  })()}
                                {expert.email && (
                                  <a
                                    href={`mailto:${expert.email}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toast.success(
                                        "Message sent successfully!",
                                      );
                                    }}
                                    className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg transition-colors"
                                    style={{
                                      color: "#2F3C96",
                                      backgroundColor:
                                        "rgba(208, 196, 226, 0.2)",
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
                                    <Mail className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                {expert.orcidUrl && (
                                  <a
                                    href={expert.orcidUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg transition-colors"
                                    style={{
                                      color: "#2F3C96",
                                      backgroundColor:
                                        "rgba(208, 196, 226, 0.2)",
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
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDetailsModal(expert);
                                  }}
                                  className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg transition-colors"
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
                                  <Info className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {/* Load More Button - for signed-in users with more global results */}
                {isSignedIn && globalHasMore && !loadingMore && (
                  <div className="flex flex-col items-center gap-2 mt-6">
                    <button
                      onClick={loadMoreExperts}
                      className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-indigo-200 text-indigo-700 rounded-xl font-semibold text-sm hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-300 shadow-sm hover:shadow-md"
                    >
                      <ChevronDown className="w-4 h-4" />
                      Load More {expertsLabel}
                    </button>
                    <p className="text-xs text-slate-500">
                      Showing {results.length} of {globalTotalFound}{" "}
                      {expertsLabel.toLowerCase()} found
                    </p>
                  </div>
                )}

                {/* Loading More Indicator */}
                {loadingMore && (
                  <div className="flex items-center justify-center gap-3 mt-6 py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                    <span className="text-sm text-slate-600 font-medium">
                      Loading more {expertsLabel.toLowerCase()}...
                    </span>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Sign Up Message for More Results */}
          {!loading &&
            results.length > 0 &&
            !isSignedIn &&
            results.length > 3 && (
              <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 p-6 text-center shadow-lg">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-indigo-900">
                      Want to see more {expertsLabel.toLowerCase()}?
                    </h3>
                  </div>
                  <p className="text-sm text-indigo-700 max-w-md">
                    Sign up for free to view all{" "}
                    {globalTotalFound > 0 ? globalTotalFound : results.length}{" "}
                    matching {expertsLabel.toLowerCase()} and get personalized
                    recommendations based on your medical interests.
                  </p>
                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() => navigate("/signin")}
                      className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => navigate("/onboarding")}
                      className="px-6 py-2.5 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-all border-2 border-indigo-200 hover:border-indigo-300"
                    >
                      Sign Up
                    </button>
                  </div>
                </div>
              </div>
            )}

          {/* Find an Expert Results */}
          {viewMode === "find" &&
            !findExpertLoading &&
            findExpertResults.length > 0 && (
              <div className="flex flex-col gap-4">
                {findExpertResults.map((expert, cardIdx) => {
                  const itemId = expert.name || expert.id || expert._id;
                  const expertId = expert.name || expert.id || expert._id;
                  const isExpanded = expandedCards[expertId];
                  const expertPublications = publications[expertId] || [];
                  const isLoadingPubs = loadingPublications[expertId];

                  // Check if expert is favorited by exact name match
                  const isExpertFavorited = favorites.some((fav) => {
                    if (fav.type !== "expert") return false;

                    // Check by exact name match (primary identifier)
                    if (expert.name && fav.item?.name) {
                      return fav.item.name === expert.name;
                    }

                    // Fallback: check by id
                    if (fav.item?.id === itemId || fav.item?._id === itemId) {
                      return true;
                    }

                    return false;
                  });

                  return (
                    <div
                      key={itemId}
                      className={`rounded-xl shadow-sm border transition-all duration-300 cursor-pointer group overflow-hidden transform hover:-translate-y-0.5 animate-fade-in ${
                        isExpanded
                          ? "bg-white shadow-lg border-indigo-300 ring-1 ring-indigo-200 ring-opacity-50"
                          : "bg-white border-slate-200 hover:shadow-lg hover:border-indigo-300"
                      }`}
                      style={{ animationDelay: `${cardIdx * 50}ms` }}
                      onClick={() => toggleCardExpansion(expert)}
                    >
                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0 transition-all duration-300 group-hover:shadow-lg">
                            {expert.name?.charAt(0)?.toUpperCase() || "E"}
                          </div>

                          {/* Main Content */}
                          <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <User className="w-4 h-4 text-indigo-600" />
                                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                                    {expertLabel}
                                  </span>
                                </div>
                                <h3 className="text-base font-bold text-slate-900 mb-1">
                                  {expert.name || `Unknown ${expertLabel}`}
                                </h3>
                                {expert.orcid && (
                                  <p className="text-xs text-indigo-600 mt-0.5">
                                    ORCID: {expert.orcid}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    favorite(expert);
                                  }}
                                  disabled={favoritingItems.has(
                                    getFavoriteKey(expert),
                                  )}
                                  className={`p-2 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    isExpertFavorited
                                      ? "bg-red-50 text-red-500 hover:bg-red-100"
                                      : "text-slate-400 hover:bg-slate-100 hover:text-red-500"
                                  }`}
                                  title={
                                    isExpertFavorited
                                      ? "Remove from favorites"
                                      : "Add to favorites"
                                  }
                                >
                                  {favoritingItems.has(
                                    getFavoriteKey(expert),
                                  ) ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Heart
                                      className={`w-4 h-4 transition-all duration-300 ${
                                        isExpertFavorited ? "fill-current" : ""
                                      }`}
                                    />
                                  )}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCardExpansion(expert);
                                  }}
                                  className={`p-2 rounded-lg transition-all duration-300 ${
                                    isExpanded
                                      ? "bg-indigo-100 text-indigo-600"
                                      : "text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                                  }`}
                                >
                                  <ChevronDown
                                    className={`w-4 h-4 transition-transform duration-500 ${
                                      isExpanded ? "rotate-180" : ""
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>

                            {/* Basic Info */}
                            <div className="space-y-1 mb-3">
                              {expert.institution && (
                                <div className="flex items-center text-xs text-slate-700">
                                  <Building2 className="w-3 h-3 mr-1.5 shrink-0" />
                                  <span className="line-clamp-1">
                                    {expert.institution}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Citation Metrics */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              {expert.citationCount !== undefined && (
                                <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-xs font-medium">
                                  <TrendingUp className="w-3.5 h-3.5" />
                                  <span>
                                    {expert.citationCount.toLocaleString()}{" "}
                                    citations
                                  </span>
                                </div>
                              )}
                              {expert.hIndex !== undefined && (
                                <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium">
                                  <Award className="w-3.5 h-3.5" />
                                  <span>h-index: {expert.hIndex}</span>
                                </div>
                              )}
                              {expert.worksCount !== undefined &&
                                expert.worksCount > 0 && (
                                  <div className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-medium">
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span>
                                      {expert.worksCount.toLocaleString()} works
                                    </span>
                                  </div>
                                )}
                            </div>

                            {/* Research Topics */}
                            {expert.topics &&
                              Array.isArray(expert.topics) &&
                              expert.topics.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {expert.topics
                                    .slice(0, 5)
                                    .map((topic, idx) => (
                                      <span
                                        key={idx}
                                        className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full"
                                      >
                                        {topic}
                                      </span>
                                    ))}
                                  {expert.topics.length > 5 && (
                                    <span className="text-xs text-slate-600">
                                      +{expert.topics.length - 5} more
                                    </span>
                                  )}
                                </div>
                              )}

                            {/* Expanded Publications Section */}
                            <div
                              className={`overflow-hidden transition-all duration-500 ease-in-out ${
                                isExpanded
                                  ? "max-h-[500px] opacity-100 mt-3"
                                  : "max-h-0 opacity-0 mt-0"
                              }`}
                            >
                              <div className="pt-3 border-t border-slate-200">
                                {isLoadingPubs ? (
                                  <div className="flex items-center justify-center py-4">
                                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                    <span className="ml-2 text-sm text-slate-600">
                                      Loading publications...
                                    </span>
                                  </div>
                                ) : expertPublications.length > 0 ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                      <BookOpen className="w-4 h-4 text-indigo-600" />
                                      <h4 className="text-sm font-semibold text-indigo-700">
                                        Top Publications
                                      </h4>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      {expertPublications
                                        .slice(0, 2)
                                        .map((pub, idx) => (
                                          <div
                                            key={idx}
                                            onClick={(e) => e.stopPropagation()}
                                            className="bg-indigo-50 rounded-lg p-3 border border-indigo-200 hover:border-indigo-300 hover:shadow-sm transition-all duration-300"
                                          >
                                            <a
                                              href={pub.link || "#"}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="block"
                                            >
                                              <h5 className="text-sm font-semibold text-slate-900 line-clamp-2 mb-2 hover:text-indigo-600 transition-colors">
                                                {pub.title}
                                              </h5>
                                              <div className="flex items-center gap-3 text-xs text-slate-600">
                                                {pub.year && (
                                                  <span className="font-medium text-indigo-600">
                                                    {pub.year}
                                                  </span>
                                                )}
                                                {pub.citations > 0 && (
                                                  <span>
                                                    {pub.citations}{" "}
                                                    {pub.citations === 1
                                                      ? "citation"
                                                      : "citations"}
                                                  </span>
                                                )}
                                              </div>
                                            </a>
                                          </div>
                                        ))}
                                    </div>
                                    {expertPublications.length > 2 && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openDetailsModal(expert);
                                        }}
                                        className="w-full text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-indigo-50"
                                      >
                                        View all {expertPublications.length}{" "}
                                        publications
                                        <ExternalLink className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center py-4">
                                    <BookOpen className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm text-slate-500">
                                      No publications found
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-100">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const params = new URLSearchParams();
                                  params.set("name", expert.name || "");
                                  if (expert.institution)
                                    params.set(
                                      "affiliation",
                                      expert.institution,
                                    );
                                  if (expert.orcid)
                                    params.set("orcid", expert.orcid);
                                  if (
                                    expert.topics &&
                                    Array.isArray(expert.topics)
                                  ) {
                                    params.set(
                                      "researchInterests",
                                      JSON.stringify(expert.topics),
                                    );
                                  }

                                  // Open profile in new tab so experts list stays on this page
                                  window.open(
                                    `/expert/profile?${params.toString()}`,
                                    "_blank",
                                    "noopener,noreferrer",
                                  );
                                }}
                                className="flex-1 flex items-center justify-center gap-2 py-2 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
                                style={{
                                  background:
                                    "linear-gradient(135deg, #2F3C96, #253075)",
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.background =
                                    "linear-gradient(135deg, #253075, #1C2454)";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.background =
                                    "linear-gradient(135deg, #2F3C96, #253075)";
                                }}
                              >
                                <User className="w-4 h-4" />
                                View Profile
                              </button>
                              {expert.orcid && (
                                <a
                                  href={`https://orcid.org/${expert.orcid}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center justify-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-all"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  ORCID
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          {/* Empty State - Find an Expert (only after user clicks Search) */}
          {viewMode === "find" &&
            !findExpertLoading &&
            findExpertResults.length === 0 &&
            findExpertHasSearched && (
              <div className="text-center py-12 bg-white rounded-lg shadow-md border border-slate-200">
                <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-800 mb-1">
                  No Researchers Found
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  No researchers found with the name "{findExpertName}". Try a
                  different spelling or name variation.
                </p>
              </div>
            )}

          {/* Empty State - Explore Mode */}
          {viewMode === "explore" &&
          !loading &&
          !isInitialLoad &&
          results.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md border border-slate-200 animate-fade-in">
              <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-800 mb-1">
                No {expertsLabel} Found
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Try adjusting your search criteria or browse different
                categories.
              </p>
            </div>
          ) : null}
        </div>

        {/* Connection Request Modal (for researchers connecting with on-platform experts) */}
        <Modal
          isOpen={connectionRequestModal.open}
          onClose={() =>
            setConnectionRequestModal({
              open: false,
              message: "",
              expert: null,
            })
          }
          title="Send Connection Request"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Send a connection request to collaborate with{" "}
              {connectionRequestModal.expert?.name || "this researcher"}.
            </p>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Message (optional)
              </label>
              <textarea
                value={connectionRequestModal.message}
                onChange={(e) =>
                  setConnectionRequestModal({
                    ...connectionRequestModal,
                    message: e.target.value,
                  })
                }
                rows={3}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Add a personal message to your connection request..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={sendConnectionRequest}
                className="flex-1 px-4 py-2.5 bg-[#2F3C96] text-white rounded-lg font-semibold hover:bg-[#253075] transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Send Connection Request
              </button>
              <button
                onClick={() =>
                  setConnectionRequestModal({
                    open: false,
                    message: "",
                    expert: null,
                  })
                }
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>

        {/* Expert Details Modal */}
        <Modal
          isOpen={detailsModal.open}
          onClose={closeDetailsModal}
          title={`${expertLabel} Details`}
        >
          {detailsModal.expert && (
            <div className="space-y-6">
              {/* Header */}
              <div className="pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md transform hover:scale-110 transition-transform duration-300">
                    {detailsModal.expert.name?.charAt(0)?.toUpperCase() || "E"}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 text-lg">
                      {detailsModal.expert.name || `Unknown ${expertLabel}`}
                    </h4>
                    {detailsModal.expert.orcid && (
                      <p className="text-sm text-indigo-600">
                        ORCID: {detailsModal.expert.orcid}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Current Position */}
              {detailsModal.expert.currentPosition && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    Current Position
                  </h4>
                  <p className="text-sm text-slate-700">
                    {detailsModal.expert.currentPosition}
                  </p>
                </div>
              )}

              {/* Affiliation */}
              {detailsModal.expert.affiliation && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    Affiliation
                  </h4>
                  {/* Show all institutions when available */}
                  {detailsModal.expert.allInstitutions &&
                  detailsModal.expert.allInstitutions.length > 1 ? (
                    <ul className="space-y-1">
                      {detailsModal.expert.allInstitutions.map((inst, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-slate-700 flex items-start gap-1.5"
                        >
                          <span className="text-indigo-400 mt-0.5">•</span>
                          {inst}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-700">
                      {detailsModal.expert.affiliation}
                    </p>
                  )}
                </div>
              )}

              {/* Education */}
              {detailsModal.expert.education && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    Education
                  </h4>
                  <p className="text-sm text-slate-700">
                    {detailsModal.expert.education}
                  </p>
                </div>
              )}

              {/* Age & Experience */}
              {(detailsModal.expert.age ||
                detailsModal.expert.yearsOfExperience) && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    Age & Experience
                  </h4>
                  <div className="text-sm text-slate-700 space-y-1">
                    {detailsModal.expert.age && (
                      <p>
                        <strong>Age:</strong> {detailsModal.expert.age}
                      </p>
                    )}
                    {detailsModal.expert.yearsOfExperience && (
                      <p>
                        <strong>Experience:</strong>{" "}
                        {detailsModal.expert.yearsOfExperience}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Location */}
              {detailsModal.expert.location && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    Location
                  </h4>
                  <p className="text-sm text-slate-700">
                    {detailsModal.expert.location}
                  </p>
                </div>
              )}

              {/* Biography */}
              {detailsModal.expert.biography && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-600" />
                    Biography
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {detailsModal.expert.biography}
                  </p>
                </div>
              )}

              {/* Specialties */}
              {detailsModal.expert.specialties &&
                Array.isArray(detailsModal.expert.specialties) &&
                detailsModal.expert.specialties.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      Specialties
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {detailsModal.expert.specialties.map((specialty, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Research Interests */}
              {detailsModal.expert.researchInterests &&
                Array.isArray(detailsModal.expert.researchInterests) &&
                detailsModal.expert.researchInterests.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      Research Interests
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {detailsModal.expert.researchInterests.map(
                        (interest, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full"
                          >
                            {interest}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}

              {/* Achievements */}
              {detailsModal.expert.achievements && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-600" />
                    Achievements
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {detailsModal.expert.achievements}
                  </p>
                </div>
              )}

              {/* Publications */}
              {(() => {
                const expertId =
                  detailsModal.expert.name ||
                  detailsModal.expert.id ||
                  detailsModal.expert._id;
                const expertPublications = publications[expertId] || [];
                const isLoadingPubs = loadingPublications[expertId];

                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                        Publications
                      </h4>
                      {expertPublications.length === 0 && (
                        <button
                          onClick={() => fetchPublications(detailsModal.expert)}
                          disabled={isLoadingPubs}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-semibold text-sm hover:from-indigo-700 hover:to-indigo-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-md disabled:hover:from-indigo-600 disabled:hover:to-indigo-700"
                        >
                          {isLoadingPubs ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Loading Publications...</span>
                            </>
                          ) : (
                            <>
                              <BookOpen className="w-4 h-4" />
                              <span>Load Publications</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    {isLoadingPubs && expertPublications.length === 0 && (
                      <div className="text-sm text-slate-600 italic">
                        Loading publications...
                      </div>
                    )}
                    {expertPublications.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {expertPublications.map((pub, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 hover:border-indigo-300 hover:shadow-md transition-all duration-300"
                          >
                            <a
                              href={pub.link || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-medium text-slate-900 hover:text-indigo-600 transition-colors block mb-1"
                            >
                              {pub.title}
                            </a>
                            {pub.snippet && (
                              <p className="text-xs text-slate-700 mt-1 line-clamp-2">
                                {pub.snippet}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-600">
                              {pub.year && <span>{pub.year}</span>}
                              {pub.citations > 0 && (
                                <span>• {pub.citations} citations</span>
                              )}
                              {pub.publication && (
                                <span className="text-slate-600">
                                  • {pub.publication}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : !isLoadingPubs ? (
                      <p className="text-sm text-slate-600 italic">
                        Click "Load Publications" to fetch top
                        publications.{" "}
                      </p>
                    ) : null}
                  </div>
                );
              })()}

              {/* Contact Information */}
              <div>
                <h4 className="font-semibold text-slate-800 mb-2">
                  Contact Information
                </h4>
                <div className="space-y-2">
                  {detailsModal.expert.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Mail className="w-4 h-4" />
                      <a
                        href={`mailto:${detailsModal.expert.email}`}
                        onClick={() =>
                          toast.success("Message sent successfully!")
                        }
                        className="hover:text-indigo-600 transition-colors"
                      >
                        {detailsModal.expert.email}
                      </a>
                    </div>
                  )}
                  {detailsModal.expert.orcidUrl && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <LinkIcon className="w-4 h-4" />
                      <a
                        href={detailsModal.expert.orcidUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-indigo-600 transition-colors"
                      >
                        View ORCID Profile
                      </a>
                    </div>
                  )}
                  {!detailsModal.expert.email && (
                    <p className="text-xs text-slate-600 italic">
                      Email not publicly available
                    </p>
                  )}
                </div>
              </div>

              {/* External Links */}
              {detailsModal.expert.orcidUrl && (
                <div>
                  <a
                    href={detailsModal.expert.orcidUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 text-sm text-white font-medium bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all duration-300"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Full ORCID Profile
                  </a>
                </div>
              )}
            </div>
          )}
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
