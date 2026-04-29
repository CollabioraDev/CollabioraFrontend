import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Heart,
  Sparkles,
  FileText,
  BookOpen,
  Info,
  ExternalLink,
  Calendar,
  User,
  MapPin,
  TrendingUp,
  Loader2,
  ListChecks,
  AlertCircle,
  CheckCircle,
  X,
  Plus,
  ChevronDown,
} from "lucide-react";
import Layout from "../../components/Layout.jsx";
import PageTutorial, {
  useTutorialCompleted,
  resetTutorialCompleted,
} from "../../components/PageTutorial.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import Modal from "../../components/ui/Modal.jsx";
import CustomSelect from "../../components/ui/CustomSelect.jsx";
import AnimatedBackground from "../../components/ui/AnimatedBackground.jsx";
import { BorderBeam } from "@/components/ui/border-beam";
import { LinkPreview } from "@/components/ui/link-preview";
import { AuroraText } from "@/components/ui/aurora-text";
import SmartSearchInput from "../../components/SmartSearchInput.jsx";
import FreeSearchesIndicator, {
  useFreeSearches,
} from "../../components/FreeSearchesIndicator.jsx";
import apiFetch from "../../utils/api.js";
import {
  appendLocaleToSearchParams,
  getApiLocale,
} from "../../i18n/getApiLocale.js";
import { useTranslation } from "react-i18next";
import { autoCorrectQuery } from "../../utils/spellCorrection.js";
import { processKeywordInput } from "../../utils/keywordSplitter.js";
import { SMART_SUGGESTION_KEYWORDS } from "../../utils/smartSuggestions.js";
import icd11Dataset from "../../data/icd11Dataset.json";
import {
  buildCanonicalMapFromIcd11,
  buildCanonicalMapFromLabels,
  resolveToCanonical,
} from "../../utils/canonicalLabels.js";
import {
  getLocalRemainingSearches,
  setLocalSearchCount,
  MAX_FREE_SEARCHES,
} from "../../utils/searchLimit.js";
import { loadTutorialSamplePublications } from "../../utils/tutorialSampleData.js";
import {
  GUEST_BROWSE_MODE_ENABLED,
  PUBLICATIONS_AND_TRIALS_PAGE_SIZE,
} from "../../utils/guestBrowseMode.js";
import { useNlmClinicalSuggestions } from "../../hooks/useNlmClinicalSuggestions.js";
import ReactMarkdown from "react-markdown";

/** Stopwords to strip when turning a query into display keywords (matches backend). */
const DISPLAY_STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "not",
  "of",
  "in",
  "for",
  "to",
  "with",
  "on",
  "at",
  "by",
  "from",
  "what",
  "is",
  "are",
  "does",
  "do",
  "can",
  "could",
  "should",
  "would",
  "how",
  "why",
  "when",
  "where",
  "who",
  "vs",
  "versus",
  "about",
  "overall",
  "general",
  "getting",
  "good",
  "during",
  "that",
  "this",
  "than",
  "lead",
  "leads",
  "leading",
  "into",
]);

/**
 * Turn a free-text query into clean display keywords (e.g. "what are the risks that can lead to colorectal cancer" → ["risks", "colorectal", "cancer"]).
 */
function getCleanedKeywordsFromQuery(query) {
  if (!query || typeof query !== "string") return [];
  const tokens = query
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !DISPLAY_STOPWORDS.has(t));
  return [...new Set(tokens)];
}

/**
 * For display only: if the keyword looks like a full sentence, show cleaned terms instead.
 */
function getDisplayLabelForKeyword(keyword) {
  if (!keyword || keyword.length < 25) return keyword;
  const cleaned = getCleanedKeywordsFromQuery(keyword);
  return cleaned.length > 0 ? cleaned.join(", ") : keyword;
}

export default function Publications() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const [q, setQ] = useState("");
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
  const [userProfile, setUserProfile] = useState(null); // Track user profile
  /** Signed-in researchers see technical titles; everyone else uses patient-style (incl. guests when browse mode is on). */
  const researcherTitleMode = Boolean(
    isSignedIn && userProfile?.researcher !== undefined,
  );
  const [location, setLocation] = useState("");
  const [locationMode, setLocationMode] = useState("global"); // "current", "global", "custom"
  const [userLocation, setUserLocation] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false); // Start with loading false - no initial search
  const [favorites, setFavorites] = useState([]);
  const [favoritingItems, setFavoritingItems] = useState(new Set()); // Track items being favorited/unfavorited
  const { checkAndUseSearch, getRemainingSearches } = useFreeSearches();
  const [summaryModal, setSummaryModal] = useState({
    open: false,
    title: "",
    type: "",
    summary: "",
    loading: false,
  });
  const [detailsModal, setDetailsModal] = useState({
    open: false,
    publication: null,
    loading: false,
  });
  const [summaryPublication, setSummaryPublication] = useState(null);
  const [hasSimplifiedFurther, setHasSimplifiedFurther] = useState(false);
  const [simplifyTitles, setSimplifyTitles] = useState(false); // Researcher option: simplify titles like patient view (default off)
  const [simplifiedTitles, setSimplifiedTitles] = useState(new Map()); // Cache of simplified publication titles
  const [extractedSearchTerms, setExtractedSearchTerms] = useState([]); // 2–3 terms from backend (shown above results as "Searching for: ...")

  // Helper function to sort publications by match percentage (highest first)
  const sortPublicationsByMatch = (publications) => {
    return [...publications].sort((a, b) => {
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
      /\b(new|latest|recent)\s+(treatments?|studies|publications?|research|papers?)\b/,
      /\b(treatments?|studies|publications?|research|papers?)\s+(in|for|on)\s+.+\s+(new|latest|recent)\b/,
      /\b(new|latest|recent)\s+.+\s+(treatments?|studies|publications?|research|papers?)\b/,
      /\b(202[4-9]|20[3-9][0-9])\b/,
    ];
    const hasLatest = latestPatterns.some((re) => re.test(lower));
    if (!hasLatest) return { useRecent: false, cleanedQuery: query };
    let cleaned = query
      .replace(/\b(202[4-9]|20[3-9][0-9])\b/gi, "")
      .replace(
        /\b(new|latest|recent)\s+(treatments?|studies|publications?|research|papers?)\b/gi,
        "$2",
      )
      .replace(
        /\b(treatments?|studies|publications?|research|papers?)\s+(in|for|on)\s+(.+?)\s+(new|latest|recent)\b/gi,
        "$3",
      )
      .replace(
        /\b(new|latest|recent)\s+(.+?)\s+(treatments?|studies|publications?|research|papers?)\b/gi,
        "$2",
      )
      .replace(/\s+/g, " ")
      .trim();
    return { useRecent: true, cleanedQuery: cleaned || query };
  };

  // Search keywords state (chips/tags)
  const [searchKeywords, setSearchKeywords] = useState([]); // Keywords as chips below search bar
  const [autoSplitKeywords, setAutoSplitKeywords] = useState(() => {
    // Load from localStorage, default to true
    const saved = localStorage.getItem("autoSplitKeywords");
    return saved !== null ? JSON.parse(saved) : true;
  }); // Toggle for automatic keyword splitting

  // Advanced search state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [queryTerms, setQueryTerms] = useState([
    { field: "All Fields", term: "", operator: "AND" },
  ]);
  const [addedTerms, setAddedTerms] = useState([]); // Terms that have been added (confirmed)
  const [constructedQuery, setConstructedQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState([]);

  // Date filter state
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // Article type (publication type) filter - PubMed [pt] values
  const [articleType, setArticleType] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [publicationSources, setPublicationSources] = useState(null); // { sourcesUsed, sourceCounts } when search uses PubMed + OpenAlex
  const [lastSearchQuery, setLastSearchQuery] = useState(""); // Track last search query for pagination
  const [lastSearchParams, setLastSearchParams] = useState({}); // Store all search parameters for pagination

  // Essential PubMed field options (simplified list - removed MeSH, ISBN, publisher, book, volume, pagination, language)
  const fieldOptionsList = [
    "All Fields",
    "Author",
    "Title",
    "Title/Abstract",
    "Text Word",
    "Journal",
    "Publication Type",
    "Proximity Search",
  ];

  // Convert to format for CustomSelect
  const fieldOptions = fieldOptionsList.map((field) => ({
    value: field,
    label: field,
  }));

  // Operator options for CustomSelect
  const operatorOptions = [
    { value: "AND", label: "AND" },
    { value: "OR", label: "OR" },
    { value: "NOT", label: "NOT" },
  ];

  // Article type options for Advanced search - labels for UI, values are PubMed Publication Type [pt] terms
  const articleTypeOptions = [
    { value: "", label: "Any" },
    { value: "Journal Article", label: "Original Research Article" },
    { value: "Case Reports", label: "Case Study/Report" },
    { value: "Evaluation Study", label: "Methodology Paper" },
    { value: "Review", label: "Review Article" },
    { value: "Meta-Analysis", label: "Meta-Analysis" },
    { value: "Systematic Review", label: "Systematic Review" },
    { value: "Book/Book Chapter", label: "Book/Book Chapter" },
  ];

  // Field-specific help text and examples (removed MeSH, ISBN, publisher, book, volume, pagination, language)
  const fieldHelpText = {
    "All Fields": "Search across all fields. Example: 'cancer treatment'",
    Author:
      "Format: LastName FirstInitial (e.g., 'Smith J') or LastName FirstName. PubMed searches author names in this format.",
    Title: "Search in article titles only. Example: 'breast cancer diagnosis'",
    "Title/Abstract":
      "Search in both title and abstract. Example: 'diabetes management'",
    "Text Word":
      "Search in title, abstract, and other text fields. Example: 'immunotherapy'",
    Journal:
      "Journal name abbreviation or full name. Example: 'Nature' or 'JAMA'",
    "Publication Type":
      "Type of publication. Examples: 'Review', 'Clinical Trial', 'Case Reports', 'Meta-Analysis'",
    "Proximity Search":
      "Find terms within N words of each other. Format: 'term1 term2' with distance (e.g., 'cancer treatment ~5' finds terms within 5 words). Example: 'breast cancer ~3'",
  };

  /** NLM Clinical Tables — standardized labels, server-proxied. */
  const publicationNlm = useNlmClinicalSuggestions(q, {
    includeProcedures: true,
  });

  const publicationSuggestionTerms = useMemo(
    () => [...[userMedicalInterest].filter(Boolean)],
    [userMedicalInterest],
  );

  const publicationCanonicalMap = useMemo(() => {
    const map = buildCanonicalMapFromIcd11(icd11Dataset);
    const curated = buildCanonicalMapFromLabels([
      ...SMART_SUGGESTION_KEYWORDS,
      ...(userMedicalInterest ? [userMedicalInterest] : []),
    ]);
    for (const [key, label] of curated) {
      if (!map.has(key)) map.set(key, label);
    }
    return map;
  }, [userMedicalInterest]);

  // Tutorial: show for first-time visitors (not yet completed)
  const tutorialCompleted = useTutorialCompleted("publications");
  const [forceTutorial, setForceTutorial] = useState(false);
  const showTutorial = !tutorialCompleted || forceTutorial;
  const [tutorialSampleResults, setTutorialSampleResults] = useState([]);
  const [tutorialSampleLoading, setTutorialSampleLoading] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  const SEARCH_BUTTON_STEP = 3;
  const RESULTS_STEP = 4;
  const hasScrolledToResultsRef = React.useRef(false);

  useEffect(() => {
    if (showTutorial) hasScrolledToResultsRef.current = false;
  }, [showTutorial]);

  // Scroll results area into view (after they're in the DOM)
  const scrollToResultsOnce = useCallback(() => {
    if (hasScrolledToResultsRef.current) return;
    hasScrolledToResultsRef.current = true;
    const el = document.querySelector(
      "[data-tour='publications-results-area']",
    );
    if (el) {
      window.scrollBy({ top: 200, behavior: "smooth" });
    } else {
      window.scrollBy({ top: 200, behavior: "smooth" });
    }
  }, []);

  // Tutorial step change: auto-fill, load results, scroll (once only, after results render)
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
          loadTutorialSamplePublications()
            .then((sample) => {
              if (sample && sample.length > 0) {
                setTutorialSampleResults(sample);
                // Scroll after React has rendered the results
                requestAnimationFrame(() => {
                  setTimeout(() => scrollToResultsOnce(), 150);
                });
              }
            })
            .finally(() => setTutorialSampleLoading(false));
        } else {
          // Results already loaded (e.g. replaying tutorial), scroll now
          requestAnimationFrame(() => scrollToResultsOnce());
        }
      }
    },
    [tutorialSampleResults.length, scrollToResultsOnce],
  );

  // Tutorial step 3 "Search" button: only advance; sample loads in step 4 (handleTutorialStepChange)
  const onSearchAction = useCallback(() => {
    return Promise.resolve();
  }, []);

  const PUBLICATIONS_TUTORIAL_STEPS = useMemo(
    () => [
      {
        target: "[data-tour='publications-header']",
        title: t("publications.tutorialSteps.step1Title"),
        content: t("publications.tutorialSteps.step1Content"),
        placement: "bottom",
      },
      {
        target: "[data-tour='publications-search-bar']",
        title: t("publications.tutorialSteps.step2Title"),
        content: t("publications.tutorialSteps.step2Content"),
        placement: "bottom",
      },
      {
        target: "[data-tour='publications-keywords']",
        title: t("publications.tutorialSteps.step3Title"),
        content: t("publications.tutorialSteps.step3Content"),
        placement: "bottom",
      },
      {
        target: "[data-tour='publications-search-btn']",
        title: t("publications.tutorialSteps.step4Title"),
        content: t("publications.tutorialSteps.step4Content"),
        placement: "bottom",
        actionLabel: t("publications.search"),
        onAction: onSearchAction,
      },
      {
        target: "[data-tour='publications-results-area']",
        title: t("publications.tutorialSteps.step5Title"),
        content: t("publications.tutorialSteps.step5Content"),
        placement: "bottom",
      },
      {
        target: "[data-tour='publications-view-details-btn']",
        title: t("publications.tutorialSteps.step6Title"),
        content: t("publications.tutorialSteps.step6Content"),
        placement: "top",
      },
      {
        target: "[data-tour='publications-understand-btn']",
        title: t("publications.tutorialSteps.step7Title"),
        content: t("publications.tutorialSteps.step7Content"),
        placement: "top",
      },
      {
        target: "[data-tour='publications-favourites-btn']",
        title: t("publications.tutorialSteps.step8Title"),
        content: t("publications.tutorialSteps.step8Content"),
        placement: "top",
      },
      {
        target: "[data-tour='yori-chatbot']",
        title: t("publications.tutorialSteps.step9Title"),
        content: isSignedIn
          ? t("publications.tutorialSteps.step9ContentSignedIn")
          : t("publications.tutorialSteps.step9ContentGuest"),
        placement: "top",
        allowTargetClick: true,
        spotlightShape: "circle",
        spotlightPadding: 18,
      },
    ],
    [i18n.language, onSearchAction, isSignedIn, t],
  );

  // Advanced search functions
  const addQueryTerm = () => {
    // Only add a new term if the current term has content
    const lastTerm = queryTerms[queryTerms.length - 1];
    if (lastTerm && lastTerm.term.trim()) {
      // Add the current term to addedTerms (confirmed terms)
      setAddedTerms([...addedTerms, { ...lastTerm }]);
      // Build query with all added terms
      buildQueryFromAddedTerms([...addedTerms, { ...lastTerm }]);
      // Reset current term and add new empty term
      setQueryTerms([{ field: "All Fields", term: "", operator: "AND" }]);
    }
  };

  const removeQueryTerm = (index) => {
    if (queryTerms.length > 1) {
      setQueryTerms(queryTerms.filter((_, i) => i !== index));
    }
  };

  const updateQueryTerm = (index, field, value) => {
    const updated = [...queryTerms];
    updated[index] = { ...updated[index], [field]: value };
    setQueryTerms(updated);
    // Don't build query automatically - only when ADD is pressed
  };

  const buildQueryFromAddedTerms = (terms = addedTerms) => {
    const queryParts = terms
      .filter((t) => t.term.trim())
      .map((t) => {
        if (t.field === "All Fields") {
          // For "All Fields", check if it's a Google Scholar-style query or has minus signs
          let term = t.term.trim();
          // Auto-detect phrases (multiple words) and wrap in quotes
          if (
            term.includes(" ") &&
            !term.startsWith('"') &&
            !term.endsWith('"')
          ) {
            // Check if it contains operators - if so, don't wrap the whole thing
            if (!/\b(AND|OR|NOT)\b/i.test(term)) {
              term = `"${term}"`;
            }
          }
          return term;
        }

        // Handle Proximity Search
        if (t.field === "Proximity Search") {
          let termValue = t.term.trim();
          // Format: "term1 term2" ~N or term1 term2 ~N
          // Extract distance if provided
          const proximityMatch = termValue.match(/^(.+?)\s*~\s*(\d+)$/);
          if (proximityMatch) {
            const [, terms, distance] = proximityMatch;
            // Ensure terms are quoted
            let searchTerms = terms.trim();
            if (!searchTerms.startsWith('"') && !searchTerms.endsWith('"')) {
              searchTerms = `"${searchTerms}"`;
            }
            // PubMed proximity syntax: "terms"[TIAB:~N]
            return `${searchTerms}[TIAB:~${distance}]`;
          }
          // Default to proximity of 10 words if no distance specified
          let searchTerms = termValue.trim();
          if (!searchTerms.startsWith('"') && !searchTerms.endsWith('"')) {
            searchTerms = `"${searchTerms}"`;
          }
          return `${searchTerms}[TIAB:~10]`;
        }

        // Map field names to PubMed field tags (simplified essential fields)
        const fieldMap = {
          Author: "[AU]",
          Title: "[TI]",
          "Title/Abstract": "[TIAB]",
          "Text Word": "[TW]",
          Journal: "[TA]",
          "Publication Type": "[PT]",
        };
        const fieldTag = fieldMap[t.field] || `[${t.field}]`;
        let termValue = t.term.trim();

        // For Author field, format for better exact matching in PubMed
        if (t.field === "Author") {
          // PubMed author search works best with "LastName FirstInitial" or "LastName FirstName"
          // Wrap in quotes for exact phrase matching
          // Remove extra spaces and format properly
          termValue = termValue.replace(/\s+/g, " ").trim();
          // If it contains quotes already, don't add more
          if (!termValue.startsWith('"') && !termValue.endsWith('"')) {
            termValue = `"${termValue}"`;
          }
        } else {
          // For other fields, auto-detect phrases (multiple words) and wrap in quotes
          // This improves exact matching for multi-word terms
          if (
            termValue.includes(" ") &&
            !termValue.startsWith('"') &&
            !termValue.endsWith('"') &&
            !termValue.includes(" AND ") &&
            !termValue.includes(" OR ") &&
            !termValue.includes(" NOT ")
          ) {
            termValue = `"${termValue}"`;
          }
        }

        return `${termValue}${fieldTag}`;
      });

    if (queryParts.length === 0) {
      setConstructedQuery("");
      return;
    }

    // Combine with operators
    let query = queryParts[0];
    for (let i = 1; i < queryParts.length; i++) {
      const operator = terms[i].operator || "AND";
      query += ` ${operator} ${queryParts[i]}`;
    }
    setConstructedQuery(query);
  };

  const addToQuery = () => {
    buildQueryFromAddedTerms();
    if (constructedQuery) {
      setQ(constructedQuery);
      setShowAdvancedSearch(false);
    }
  };

  const executeAdvancedSearch = () => {
    // Check if there are any added terms or if current term should be added first
    const lastTerm = queryTerms[queryTerms.length - 1];
    let finalAddedTerms = [...addedTerms];

    // If current term has content, add it first
    if (lastTerm && lastTerm.term.trim()) {
      finalAddedTerms = [...addedTerms, { ...lastTerm }];
      setAddedTerms(finalAddedTerms);
      setQueryTerms([{ field: "All Fields", term: "", operator: "AND" }]);
    }

    buildQueryFromAddedTerms(finalAddedTerms);

    // Check if there are any valid terms, date filters, or article type before searching
    const hasSearchTerms = constructedQuery && finalAddedTerms.length > 0;
    const hasDateFilter = dateRange.start || dateRange.end;
    const hasArticleType = !!articleType;

    if (hasSearchTerms || hasDateFilter || hasArticleType) {
      // Use constructed query if available; article type [pt] will be appended in search()
      const searchQuery = constructedQuery || "";
      setQ(searchQuery);

      // Add to search history only if there are search terms
      if (hasSearchTerms) {
        const historyItem = {
          query: searchQuery,
          terms: finalAddedTerms,
          timestamp: new Date().toISOString(),
          results: results.length,
        };
        setSearchHistory([historyItem, ...searchHistory.slice(0, 9)]);
      }

      search(searchQuery);
      setShowAdvancedSearch(false); // Close modal after search
    } else {
      toast.error(
        "Please add at least one search term or select a date range before searching",
      );
    }
  };

  const clearQuery = () => {
    setQueryTerms([{ field: "All Fields", term: "", operator: "AND" }]);
    setAddedTerms([]);
    setConstructedQuery("");
    setQ("");
  };

  // Keyword chips management functions
  const addKeyword = (keyword) => {
    if (!keyword || !keyword.trim()) return;

    // Process the input - autocorrect and always split multi-word queries into separate keywords
    const { keywords, corrections } = processKeywordInput(
      keyword,
      publicationSuggestionTerms,
      true,
    );

    if (keywords.length === 0) return;

    const canonicalKeywords = keywords.map((kw) =>
      resolveToCanonical(kw, publicationCanonicalMap),
    );
    const newKeywords = canonicalKeywords.filter(
      (kw) => !searchKeywords.some((s) => s.toLowerCase() === kw.toLowerCase()),
    );

    if (newKeywords.length > 0) {
      setSearchKeywords([...searchKeywords, ...newKeywords]);
      setQ(""); // Clear the input after adding

      // Show feedback only for corrections (no notification for simple splitting)
      if (corrections.length > 0) {
        corrections.forEach((correction) => {
          toast.success(
            `Corrected "${correction.original}" to "${correction.corrected}"`,
            { duration: 2000 },
          );
        });
      } else if (
        newKeywords.length === 1 &&
        newKeywords[0].toLowerCase() !== keyword.trim().toLowerCase()
      ) {
        // Single keyword but it was corrected
        toast.success(`Corrected "${keyword.trim()}" to "${newKeywords[0]}"`, {
          duration: 2000,
        });
      }
    } else {
      // All keywords already exist
      if (keywords.length === 1) {
        toast.info(`"${keywords[0]}" is already added`, { duration: 1500 });
      } else {
        toast.info(`All keywords already added`, { duration: 1500 });
      }
    }
  };

  const removeKeyword = (keywordToRemove, expandedTermRemoved) => {
    if (!expandedTermRemoved || keywordToRemove.length <= 25) {
      setSearchKeywords((prev) => prev.filter((k) => k !== keywordToRemove));
      return;
    }
    const looksLikeQ =
      /^\s*(what|how|why|when|where|which|who|is|are|can|could|does|do|did|will|would|should|has|have|had)\b/i.test(
        keywordToRemove.trim(),
      ) || keywordToRemove.includes("?");
    if (!looksLikeQ) {
      setSearchKeywords((prev) => prev.filter((k) => k !== keywordToRemove));
      return;
    }
    const remaining = getCleanedKeywordsFromQuery(keywordToRemove).filter(
      (t) => t.toLowerCase() !== expandedTermRemoved.toLowerCase(),
    );
    setSearchKeywords((prev) =>
      prev.map((k) => (k === keywordToRemove ? remaining : [k])).flat(),
    );
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

  useEffect(() => {
    localStorage.setItem(
      "autoSplitKeywords",
      JSON.stringify(autoSplitKeywords),
    );
  }, [autoSplitKeywords]);

  const clearAllKeywords = () => {
    setSearchKeywords([]);
    setQ("");
  };

  // Get active advanced filters
  const getActiveAdvancedFilters = () => {
    const filters = [];

    // Date range filter
    if (dateRange.start || dateRange.end) {
      let dateLabel = "";
      if (dateRange.start && dateRange.end) {
        dateLabel = `${dateRange.start} to ${dateRange.end}`;
      } else if (dateRange.start) {
        dateLabel = `from ${dateRange.start}`;
      } else if (dateRange.end) {
        dateLabel = `until ${dateRange.end}`;
      }
      filters.push({ label: dateLabel, key: "dateRange" });
    }

    // Article type filter
    if (articleType) {
      const option = articleTypeOptions.find((o) => o.value === articleType);
      filters.push({
        label: option ? option.label : articleType,
        key: "articleType",
      });
    }

    // Added terms (advanced search terms)
    if (addedTerms.length > 0) {
      addedTerms.forEach((term, index) => {
        const fieldLabel = term.field === "All Fields" ? "" : `${term.field}: `;
        filters.push({
          label: `${fieldLabel}${term.term}`,
          key: `addedTerm-${index}`,
          termIndex: index,
        });
      });
    }

    return filters;
  };

  // Clear all advanced filters
  const clearAllAdvancedFilters = () => {
    setDateRange({ start: "", end: "" });
    setArticleType("");
    setAddedTerms([]);
    setQueryTerms([{ field: "All Fields", term: "", operator: "AND" }]);
    setConstructedQuery("");
  };

  // Trigger search (keywords are optional). Pass `typedLine` from Enter in SmartSearchInput
  // so the latest input is used even before React state flushes.
  const handleSearch = (typedLine, submitMeta = {}) => {
    // Tutorial: on step 3 do not load results; they load only after advancing to step 4
    if (showTutorial && tutorialStep === SEARCH_BUTTON_STEP) {
      return;
    }

    const line =
      typeof typedLine === "string" ? typedLine : (q ?? "");
    const selectedFromDropdown = submitMeta?.source === "suggestion";

    // Include current input: add cleaned keywords (e.g. "what are the risks..." → risks, colorectal, cancer) not the raw sentence
    let currentKeywords = [...searchKeywords];
    if (line.trim()) {
      const toAdd = selectedFromDropdown
        ? [line.trim()]
        : (() => {
            const { keywords: cleanedKeywords } = processKeywordInput(
              line,
              publicationSuggestionTerms,
              true,
            );
            return cleanedKeywords && cleanedKeywords.length > 0
              ? cleanedKeywords
              : [line.trim()];
          })();
      const newTerms = toAdd.filter(
        (kw) =>
          !currentKeywords.some((k) => k.toLowerCase() === kw.toLowerCase()),
      );
      currentKeywords = [...currentKeywords, ...newTerms];
      if (newTerms.length > 0) {
        setSearchKeywords(currentKeywords);
        setQ("");
      }
    }

    // Combine keywords for search
    const combinedQuery =
      currentKeywords.length > 0 ? currentKeywords.join(" ") : line.trim();
    search(combinedQuery);
  };

  // Remove auto-build - query only builds when ADD is pressed

  async function search(overrideQuery) {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token");
    const isUserSignedIn = userData && token;

    const appliedQuery = typeof overrideQuery === "string" ? overrideQuery : q;

    // For manual searches, combine enabled medical interests with search query
    let searchQuery = appliedQuery.trim();
    const enabledInterests = Array.from(enabledMedicalInterests).join(" ");
    if (enabledInterests && searchQuery) {
      // Combine enabled interests with search query
      searchQuery = `${enabledInterests} ${searchQuery}`;
    } else if (enabledInterests && !searchQuery) {
      // If no search query but medical interests are enabled, use just the enabled interests
      searchQuery = enabledInterests;
    }

    // Auto "last 6 months" + sort by date when user asks for latest/recent/new publications
    const { useRecent, cleanedQuery } = detectLatestOrRecentSearch(searchQuery);
    const queryForApi = useRecent && cleanedQuery ? cleanedQuery : searchQuery;
    // Append PubMed publication type [pt] filter if set
    let queryForApiFinal = queryForApi;
    if (articleType) {
      const ptFilter =
        articleType === "Book/Book Chapter"
          ? '("Books"[pt] OR "Book Chapter"[pt])'
          : `"${articleType}"[pt]`;
      queryForApiFinal = queryForApi
        ? `(${queryForApi}) AND ${ptFilter}`
        : ptFilter;
    }

    if (!String(queryForApiFinal || "").trim()) {
      toast.error(t("publications.enterSearchTerms"), { duration: 4000 });
      return;
    }

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
    setTutorialSampleResults([]); // Clear tutorial sample when running real search
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const params = new URLSearchParams();
    const user = userData;

    // Mark that initial load is complete when user performs search
    if (isInitialLoad) {
      setIsInitialLoad(false);
    }

    if (queryForApiFinal) params.set("q", queryForApiFinal);

    // Add date range parameters if set (format: YYYY/MM)
    // If useRecent, override with last 6 months (unless user explicitly set dateRange)
    if (useRecent && !dateRange.start && !dateRange.end) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const year = sixMonthsAgo.getFullYear();
      const month = String(sixMonthsAgo.getMonth() + 1).padStart(2, "0");
      params.set("mindate", `${year}/${month}`);
      params.set("recentMonths", "6");
      params.set("sortByDate", "true");
    } else {
      if (dateRange.start) {
        params.set("mindate", dateRange.start.replace(/-/g, "/"));
      }
      if (dateRange.end) {
        params.set("maxdate", dateRange.end.replace(/-/g, "/"));
      }
    }

    // Reset pagination for new searches
    params.set("page", "1");
    params.set("pageSize", String(PUBLICATIONS_AND_TRIALS_PAGE_SIZE));
    setCurrentPage(1);
    setLastSearchQuery(searchQuery);

    // Store search parameters for pagination
    setLastSearchParams({
      searchQuery,
      dateRange,
      articleType,
      locationMode,
      location,
      userLocation,
      useMedicalInterest,
      userMedicalInterest,
      userData,
      recentMonths: useRecent ? 6 : undefined,
      sortByDate: useRecent || undefined,
    });

    // Add user profile data for matching (only with a real session — otherwise API may load researcher profile and skip patient title simplification)
    if (
      isUserSignedIn &&
      (userData?._id || userData?.id)
    ) {
      params.set("userId", userData._id || userData.id);
    } else {
      // Send conditions/keywords from enabled medical interests
      const enabledInterests = Array.from(enabledMedicalInterests).join(" ");
      if (enabledInterests) {
        params.set("conditions", enabledInterests);
      }
    }

    appendLocaleToSearchParams(params);

    try {
      const response = await apiFetch(
        `/api/search/publications?${params.toString()}`,
      );

      // Handle case where apiFetch returns undefined (401 redirect)
      if (!response) {
        setLoading(false);
        return;
      }

      // Handle rate limit (429)
      if (response.status === 429) {
        const errorData = await response.json();
        toast.error(
          errorData.error ||
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

      const data = await response.json();
      const searchResults = data.results || [];

      // Set pagination data
      setTotalCount(data.totalCount || 0);
      const calculatedTotalPages = Math.ceil(
        (data.totalCount || 0) / PUBLICATIONS_AND_TRIALS_PAGE_SIZE,
      );
      setTotalPages(calculatedTotalPages);

      // Store search parameters for pagination
      setLastSearchParams({
        searchQuery,
        dateRange,
        locationMode,
        location,
        userLocation,
        useMedicalInterest,
        userMedicalInterest,
        userData,
        recentMonths: useRecent ? 6 : undefined,
        sortByDate: useRecent || undefined,
      });

      // Sort by matchPercentage in descending order (highest first)
      const sortedResults = sortPublicationsByMatch(searchResults);
      setResults(sortedResults);

      // Calculate total pages for server-side pagination
      const totalPages = Math.ceil(
        (data.totalCount || 0) / PUBLICATIONS_AND_TRIALS_PAGE_SIZE,
      );

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

      // Save search state to sessionStorage (including pagination)
      const searchState = {
        q: appliedQuery,
        location,
        locationMode,
        useMedicalInterest,
        userMedicalInterest,
        results: sortedResults,
        currentPage: 1,
        totalPages: calculatedTotalPages,
        totalCount: data.totalCount || 0,
        lastSearchParams: {
          searchQuery,
          dateRange,
          articleType,
          locationMode,
          location,
          userLocation,
          useMedicalInterest,
          userMedicalInterest,
          userData,
          recentMonths: useRecent ? 6 : undefined,
          sortByDate: useRecent || undefined,
        },
        isInitialLoad: false,
      };
      sessionStorage.setItem(
        "publications_search_state",
        JSON.stringify(searchState),
      );
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  // Navigate to specific page (server-side pagination)
  async function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage || loading)
      return;

    setLoading(true);
    setCurrentPage(page);

    const params = new URLSearchParams();
    const {
      searchQuery: savedQuery,
      dateRange: savedDateRange,
      articleType: savedArticleType,
      locationMode: savedLocationMode,
      location: savedLocation,
      userLocation: savedUserLocation,
      useMedicalInterest: savedUseMedicalInterest,
      userMedicalInterest: savedUserMedicalInterest,
      userData: savedUserData,
      recentMonths: savedRecentMonths,
      sortByDate: savedSortByDate,
    } = lastSearchParams;

    // Build search query
    let queryToUse = savedQuery || "";
    if (savedUseMedicalInterest && savedUserMedicalInterest && queryToUse) {
      queryToUse = `${savedUserMedicalInterest} ${queryToUse}`;
    } else if (
      savedUseMedicalInterest &&
      savedUserMedicalInterest &&
      !queryToUse
    ) {
      queryToUse = savedUserMedicalInterest;
    }
    // Append PubMed [pt] filter for article type if set
    if (savedArticleType) {
      const ptFilter =
        savedArticleType === "Book/Book Chapter"
          ? '("Books"[pt] OR "Book Chapter"[pt])'
          : `"${savedArticleType}"[pt]`;
      queryToUse = queryToUse ? `(${queryToUse}) AND ${ptFilter}` : ptFilter;
    }
    if (queryToUse) params.set("q", queryToUse);

    // Add date range parameters if set (format: YYYY/MM)
    // If recentMonths is set, use it instead of savedDateRange
    if (savedRecentMonths && !savedDateRange?.start && !savedDateRange?.end) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - savedRecentMonths);
      const year = sixMonthsAgo.getFullYear();
      const month = String(sixMonthsAgo.getMonth() + 1).padStart(2, "0");
      params.set("mindate", `${year}/${month}`);
      params.set("recentMonths", String(savedRecentMonths));
      params.set("sortByDate", "true");
    } else {
      if (savedDateRange?.start) {
        params.set("mindate", savedDateRange.start.replace(/-/g, "/"));
      }
      if (savedDateRange?.end) {
        params.set("maxdate", savedDateRange.end.replace(/-/g, "/"));
      }
    }
    if (savedSortByDate) params.set("sortByDate", "true");

    params.set("page", String(page));
    params.set("pageSize", String(PUBLICATIONS_AND_TRIALS_PAGE_SIZE));

    const tokenNow = localStorage.getItem("token");
    const sessionUser = JSON.parse(localStorage.getItem("user") || "{}");
    const isSessionSignedIn = Boolean(sessionUser && tokenNow);

    // Add user profile data for matching (only with a valid session)
    if (
      isSessionSignedIn &&
      (savedUserData?._id || savedUserData?.id)
    ) {
      params.set("userId", savedUserData._id || savedUserData.id);
    } else if (savedUseMedicalInterest && savedUserMedicalInterest) {
      params.set("conditions", savedUserMedicalInterest);
    }

    appendLocaleToSearchParams(params);

    try {
      const response = await apiFetch(
        `/api/search/publications?${params.toString()}`,
      );

      if (!response) {
        setLoading(false);
        return;
      }

      if (response.status === 429) {
        const errorData = await response.json();
        toast.error(
          errorData.error ||
            "You've used all your searches. Sign in to continue searching.",
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
      const sortedResults = sortPublicationsByMatch(searchResults);
      setResults(sortedResults);
      if (Array.isArray(data.searchKeywords))
        setExtractedSearchTerms(data.searchKeywords);

      // Save updated state to sessionStorage
      const searchState = {
        q: lastSearchQuery || "",
        location: lastSearchParams.location || "",
        locationMode: lastSearchParams.locationMode || "global",
        useMedicalInterest: lastSearchParams.useMedicalInterest || false,
        userMedicalInterest: lastSearchParams.userMedicalInterest || "",
        results: sortedResults,
        extractedSearchTerms: Array.isArray(data.searchKeywords)
          ? data.searchKeywords
          : [],
        currentPage: page,
        totalPages: calculatedTotalPages,
        totalCount: data.totalCount || 0,
        dateRange: lastSearchParams.dateRange || { start: "", end: "" },
        lastSearchParams,
        isInitialLoad: false,
      };
      sessionStorage.setItem(
        "publications_search_state",
        JSON.stringify(searchState),
      );

      // Scroll to top of results
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Page navigation error:", error);
      toast.error("Failed to load page");
      setLoading(false);
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
    // Append PubMed [pt] filter for article type if set
    if (articleType) {
      const ptFilter =
        articleType === "Book/Book Chapter"
          ? '("Books"[pt] OR "Book Chapter"[pt])'
          : `"${articleType}"[pt]`;
      searchQuery = searchQuery ? `(${searchQuery}) AND ${ptFilter}` : ptFilter;
    }

    if (!String(searchQuery || "").trim()) {
      toast.error(t("publications.enterSearchTerms"), { duration: 4000 });
      return;
    }

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

    setQ(filterValue);
    setIsInitialLoad(false); // Mark initial load as complete when user performs quick search
    setLoading(true);
    setTutorialSampleResults([]);
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const params = new URLSearchParams();
    const user = userData;

    params.set("q", searchQuery);

    // Add date range parameters if set (format: YYYY/MM)
    if (dateRange.start) {
      params.set("mindate", dateRange.start.replace(/-/g, "/"));
    }
    if (dateRange.end) {
      params.set("maxdate", dateRange.end.replace(/-/g, "/"));
    }

    // Reset pagination for new searches
    params.set("page", "1");
    params.set("pageSize", String(PUBLICATIONS_AND_TRIALS_PAGE_SIZE));
    setCurrentPage(1);
    setLastSearchQuery(filterValue);

    // Store search parameters for pagination
    setLastSearchParams({
      searchQuery: filterValue,
      dateRange,
      articleType,
      locationMode,
      location,
      userLocation,
      useMedicalInterest,
      userMedicalInterest,
      userData,
    });

    // Add user profile data for matching (only with a valid session)
    if (
      isUserSignedIn &&
      (userData?._id || userData?.id)
    ) {
      params.set("userId", userData._id || userData.id);
    } else {
      // Send conditions/keywords from enabled medical interests
      const enabledInterestsForParams = Array.from(
        enabledMedicalInterests,
      ).join(" ");
      if (enabledInterestsForParams) {
        params.set("conditions", enabledInterestsForParams);
      }
    }

    appendLocaleToSearchParams(params);

    apiFetch(`/api/search/publications?${params.toString()}`)
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
        return r.json();
      })
      .then((data) => {
        if (!data) return; // Skip if rate limited

        const searchResults = data.results || [];

        // Set pagination data
        setTotalCount(data.totalCount || 0);
        setPublicationSources(data.publicationSources || null);
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

        // Sort by matchPercentage in descending order (highest first)
        const sortedResults = sortPublicationsByMatch(searchResults);
        setResults(sortedResults);
        setExtractedSearchTerms(
          Array.isArray(data.searchKeywords) ? data.searchKeywords : [],
        );

        // Save search state to sessionStorage (including pagination)
        const searchState = {
          q: filterValue,
          location,
          locationMode,
          useMedicalInterest,
          userMedicalInterest,
          results: sortedResults,
          extractedSearchTerms: Array.isArray(data.searchKeywords)
            ? data.searchKeywords
            : [],
          currentPage: 1,
          totalPages: calculatedTotalPages,
          totalCount: data.totalCount || 0,
          publicationSources: data.publicationSources || null,
          dateRange,
          lastSearchParams: {
            searchQuery: filterValue,
            dateRange,
            articleType,
            locationMode,
            location,
            userLocation,
            useMedicalInterest,
            userMedicalInterest,
            userData,
          },
          isInitialLoad: false,
        };
        sessionStorage.setItem(
          "publications_search_state",
          JSON.stringify(searchState),
        );

        setLoading(false);
      })
      .catch((error) => {
        console.error("Search error:", error);
        setResults([]);
        setLoading(false);
      });
  }

  // Helper function to get unique key for favorite tracking
  const getFavoriteKey = (item) => {
    return `publication-${item.pmid || item.id || item._id}`;
  };

  async function favorite(item) {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to favorite items");
      return;
    }

    const favoriteKey = getFavoriteKey(item);

    // Prevent duplicate clicks
    if (favoritingItems.has(favoriteKey)) {
      return;
    }

    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const itemId = item.id || item.pmid;
    const isFavorited = favorites.some(
      (fav) =>
        fav.type === "publication" &&
        (fav.item?.id === itemId ||
          fav.item?._id === itemId ||
          fav.item?.pmid === itemId ||
          fav.item?.title === item.title),
    );

    // Optimistic UI update - update immediately
    const previousFavorites = [...favorites];
    let optimisticFavorites;

    if (isFavorited) {
      // Optimistically remove from favorites
      optimisticFavorites = favorites.filter((fav) => {
        if (fav.type !== "publication") return true;
        return !(
          fav.item?.id === itemId ||
          fav.item?._id === itemId ||
          fav.item?.pmid === itemId ||
          fav.item?.title === item.title
        );
      });
    } else {
      // Optimistically add to favorites
      optimisticFavorites = [
        ...favorites,
        {
          type: "publication",
          item: {
            ...item,
            id: itemId,
            _id: item._id || itemId,
            pmid: item.pmid || itemId,
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
          }?type=publication&id=${encodeURIComponent(itemId)}`,
          { method: "DELETE" },
        );
        toast.success("Removed from favorites");
      } else {
        // Store complete item information
        await fetch(`${base}/api/favorites/${user._id || user.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "publication",
            item: {
              ...item, // Store all item properties
              id: itemId,
              _id: item._id || itemId,
              pmid: item.pmid || itemId,
            },
          }),
        });
        toast.success("Added to favorites");
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

  // Mark publication as read
  async function markPublicationAsRead(pub) {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user?._id && !user?.id) return; // Only for signed-in users

    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const itemId = pub.pmid || pub.id || pub._id;
      if (!itemId) return;

      await fetch(`${base}/api/read/${user._id || user.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "publication",
          itemId: String(itemId),
        }),
      });

      // Update the publication in results to mark as read and maintain sort order
      setResults((prevResults) => {
        const updated = prevResults.map((p) =>
          (p.pmid || p.id || p._id) === itemId ? { ...p, isRead: true } : p,
        );
        return sortPublicationsByMatch(updated);
      });
    } catch (error) {
      console.error("Error marking publication as read:", error);
    }
  }

  async function openDetailsModal(pub) {
    // Mark as read when modal opens
    if (isSignedIn) {
      markPublicationAsRead(pub);
    }

    setDetailsModal({
      open: true,
      publication: pub, // Show basic info immediately
      loading: true,
    });

    // Fetch detailed publication information with simplified details from backend
    // Researchers: audience=researcher (technical terms, structured); Patients: plain language
    if (pub.pmid || pub.id || pub._id) {
      try {
        const pmid = pub.pmid || pub.id || pub._id;
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const audience = researcherTitleMode ? "researcher" : "patient";

        const response = await fetch(
          `${base}/api/search/publication/${pmid}/simplified?audience=${encodeURIComponent(audience)}&locale=${encodeURIComponent(getApiLocale())}`,
        );

        if (response.ok) {
          const data = await response.json();
          if (data.publication) {
            setDetailsModal({
              open: true,
              publication: { ...pub, ...data.publication },
              loading: false,
            });
            return;
          }
        }

        const fallbackResponse = await fetch(
          `${base}/api/search/publication/${pmid}/simplified?locale=${encodeURIComponent(getApiLocale())}`,
        );
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.publication) {
            setDetailsModal({
              open: true,
              publication: { ...pub, ...fallbackData.publication },
              loading: false,
            });
            return;
          }
        }
      } catch (error) {
        console.error("Error fetching detailed publication info:", error);
      }
    }

    // If fetch fails or no PMID, just use the publication we have
    setDetailsModal({
      open: true,
      publication: pub,
      loading: false,
    });
  }

  function closeDetailsModal() {
    setDetailsModal({
      open: false,
      publication: null,
      loading: false,
    });
  }

  async function generateSummary(item) {
    // For "Simplify": simplified for patients, technical for researchers
    const shouldSimplify = !researcherTitleMode;

    setSummaryPublication(item);
    setHasSimplifiedFurther(false);

    // Prefer simplified title in the Key Insights modal when available
    const title =
      simplifiedTitles.get(item.title) ||
      item.simplifiedTitle ||
      item.title ||
      t("publications.publicationFallbackTitle");
    const text = [
      item.title || "",
      item.journal || "",
      item.abstract || "",
      Array.isArray(item.authors)
        ? item.authors.join(", ")
        : item.authors || "",
      item.year || "",
    ]
      .filter(Boolean)
      .join(" ");

    setSummaryModal({
      open: true,
      title,
      type: "publication",
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
          type: "publication",
          simplify: shouldSimplify, // Simplify for patients, technical for researchers
          pmid: item.pmid || item.id, // When present, backend fetches full publication (same as publication-detail chatbot) for better key insights
          outputLocale: getApiLocale(),
        }),
      }).then((r) => r.json());

      setSummaryModal((prev) => ({
        ...prev,
        summary:
          res.summary ||
          (typeof res.summary === "object" && res.summary.structured
            ? res.summary
            : { structured: false, summary: t("publications.summaryUnavailable") }),
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

  async function simplifySummaryFurther() {
    if (researcherTitleMode || !summaryPublication) return;

    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

    setHasSimplifiedFurther(true);

    setSummaryModal((prev) => ({
      ...prev,
      loading: true,
    }));

    try {
      const res = await fetch(`${base}/api/ai/simplify-publication`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pmid: summaryPublication.pmid || summaryPublication.id,
          publication: {
            title: summaryPublication.title,
            journal: summaryPublication.journal,
            abstract: summaryPublication.abstract,
            fullAbstract: summaryPublication.fullAbstract,
            keywords: summaryPublication.keywords,
            authors: summaryPublication.authors,
            year: summaryPublication.year,
          },
          outputLocale: getApiLocale(),
        }),
      }).then((r) => r.json());

      setSummaryModal((prev) => ({
        ...prev,
        summary:
          res.summary ||
          (typeof res.summary === "object" && res.summary.structured
            ? res.summary
            : { structured: false, summary: t("publications.summaryUnavailable") }),
        loading: false,
      }));
    } catch (e) {
      console.error("Further simplification error:", e);
      setSummaryModal((prev) => ({
        ...prev,
        summary: t("publications.simplifyFurtherFailed"),
        loading: false,
      }));
    }
  }

  // Restore search state from sessionStorage on mount (for all users, signed in or not)
  useEffect(() => {
    const savedState = sessionStorage.getItem("publications_search_state");
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setQ(state.q || "");
        setLocation(state.location || "");
        setLocationMode(state.locationMode || "global");
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
              // Only include interests from saved set that are in current user's interests
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
        setResults(sortPublicationsByMatch(restoredResults));
        // Restore pagination state
        if (state.currentPage) setCurrentPage(state.currentPage);
        if (state.totalPages) setTotalPages(state.totalPages);
        if (state.totalCount) setTotalCount(state.totalCount);
        if (state.publicationSources)
          setPublicationSources(state.publicationSources);
        if (state.lastSearchParams) setLastSearchParams(state.lastSearchParams);
        if (state.dateRange) setDateRange(state.dateRange);
        if (state.lastSearchParams?.articleType !== undefined)
          setArticleType(state.lastSearchParams.articleType);
        setExtractedSearchTerms(
          Array.isArray(state.extractedSearchTerms)
            ? state.extractedSearchTerms
            : [],
        );
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
      setLocation("");
      setLocationMode("global");
      setUseMedicalInterest(true);
      setUserMedicalInterest("");
      setUserMedicalInterests([]);
      setEnabledMedicalInterests(new Set());
      setResults([]);
      setExtractedSearchTerms([]);
      setIsInitialLoad(true);
      setIsSignedIn(false);
      setUserProfile(null);
      setUserLocation(null);
      sessionStorage.removeItem("publications_search_state");
    };

    window.addEventListener("logout", handleLogout);
    return () => window.removeEventListener("logout", handleLogout);
  }, []);

  // Batch simplify publication titles when researcher enables "Simplify titles"
  useEffect(() => {
    if (!simplifyTitles || !researcherTitleMode || !results?.length) return;

    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const titlesToSimplify = results
      .map((pub) => pub.title)
      .filter((title) => title && title.length > 60);

    if (titlesToSimplify.length === 0) return;

    fetch(`${base}/api/ai/batch-simplify-titles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titles: titlesToSimplify }),
    })
      .then((res) => res.json())
      .then((data) => {
        const simplified = data.simplifiedTitles || [];
        setSimplifiedTitles((prev) => {
          const newMap = new Map(prev);
          titlesToSimplify.forEach((title, index) => {
            if (simplified[index]) newMap.set(title, simplified[index]);
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
          !sessionStorage.getItem("publications_search_state")
        ) {
          if (localStorage.getItem("useMedicalInterest") === null) {
            setUseMedicalInterest(false);
          }
        } else if (localStorage.getItem("useMedicalInterest") === null) {
          setUseMedicalInterest(false);
        }
        setIsSignedIn(false);
        return;
      }

      setIsSignedIn(true);

      // Only set location mode if not restored from sessionStorage
      const savedState = sessionStorage.getItem("publications_search_state");
      if (!savedState) {
        setLocationMode("global"); // Set to global by default
      }

      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      try {
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
              // Only include interests from saved set that are in current user's interests
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
        }

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
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUseMedicalInterest(false);
      }
    }

    fetchUserData();
  }, []);

  // Redirect non-researchers from /publications to /library so the URL matches the nav
  useEffect(() => {
    if (
      routeLocation.pathname === "/publications" &&
      user &&
      user.role !== "researcher"
    ) {
      navigate("/library", { replace: true });
    }
  }, [routeLocation.pathname, user, navigate]);

  return (
    <Layout>
      <PageTutorial
        pageId="publications"
        steps={PUBLICATIONS_TUTORIAL_STEPS}
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

        <div className="relative pt-25 px-4 md:px-8 mx-auto max-w-6xl pb-8">
          {/* Compact Header - tight so search bar sits higher */}
          <div
            className="text-center mb-3 animate-fade-in flex flex-col items-center gap-1"
            data-tour="publications-header"
          >
            <h1
              className="text-3xl md:text-5xl font-bold mb-1"
              style={{ color: "#2F3C96" }}
            >
              <AuroraText speed={2.5} colors={["#2F3C96"]}>
                {routeLocation.pathname === "/library"
                  ? t("nav.healthLibrary")
                  : t("nav.publications")}
              </AuroraText>
            </h1>
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={async () => {
                  resetTutorialCompleted("publications");
                  setForceTutorial(true);
                  setResults([]);
                  setSearchKeywords(["hypertension"]);
                  setExtractedSearchTerms(["hypertension"]);
                  setPublicationSources(null);
                  setTotalCount(0);
                  setTotalPages(0);
                  setCurrentPage(1);
                  setTutorialSampleResults([]);
                  sessionStorage.removeItem("publications_search_state");
                  setTutorialSampleLoading(true);
                  try {
                    const sample = await loadTutorialSamplePublications();
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
            <div className="mt-1 flex justify-center items-center w-full">
              <FreeSearchesIndicator user={user} centered={true} />
            </div>
          </div>

          {/* Search Bar - prominent, full-width, moved up */}
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

              {/* Full-width search row: longer search bar + actions (tour highlights this row only, not the whole card) */}
              <div
                className="flex flex-col sm:flex-row gap-3 w-full"
                data-tour="publications-search-bar"
              >
                <div className="flex-1 min-w-0 w-full">
                  <SmartSearchInput
                    value={q}
                    onChange={setQ}
                    onSubmit={handleSearch}
                    placeholder={t("publications.searchPlaceholder")}
                    extraTerms={publicationSuggestionTerms}
                    priorityExtraTerms={publicationNlm.terms}
                    remoteSuggestionsOnly
                    prioritySuggestionsLoading={publicationNlm.loading}
                    canonicalMap={publicationCanonicalMap}
                    className="w-full"
                    inputClassName="w-full min-w-0 py-2 px-3 text-sm rounded-lg border-slate-200 bg-slate-50/80 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] transition shadow-sm"
                  />
                </div>
                <div className="flex gap-2 shrink-0 sm:flex-nowrap">
                  <Button
                    data-tour="publications-advanced"
                    onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                    className={`bg-white text-slate-700 px-4 py-3 rounded-lg transition-all text-sm font-semibold flex items-center gap-1.5 border ${
                      dateRange.start || dateRange.end || articleType
                        ? "border-[#D0C4E2] shadow-[0_2px_8px_rgba(208,196,226,0.4)] hover:shadow-[0_4px_12px_rgba(208,196,226,0.5)]"
                        : "border-slate-200 shadow-[0_2px_8px_rgba(208,196,226,0.25)] hover:shadow-[0_4px_12px_rgba(208,196,226,0.35)] hover:border-[#D0C4E2]/60"
                    }`}
                  >
                    {(dateRange.start || dateRange.end || articleType) && (
                      <Calendar className="w-3.5 h-3.5" />
                    )}
                    {showAdvancedSearch
                      ? t("publications.hide")
                      : t("publications.advanced")}
                    {(dateRange.start || dateRange.end || articleType) && (
                      <span className="bg-[#D0C4E2]/20 text-[#2F3C96] px-1.5 py-0.5 rounded text-xs font-medium">
                        {t("publications.filters")}
                      </span>
                    )}
                  </Button>
                  <Button
                    data-tour="publications-search-btn"
                    onClick={handleSearch}
                    className="text-white px-5 py-3 rounded-lg shadow-md hover:shadow-lg transition-all text-sm font-semibold"
                    style={{ backgroundColor: "#2F3C96" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#252b73";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#2F3C96";
                    }}
                  >
                    {t("publications.search")}
                  </Button>
                </div>
              </div>

              {/* Keyword Chips Section - expand long question-like keywords into separate chips */}
              <div
                className="flex flex-col gap-2"
                data-tour="publications-keywords"
              >
                {(() => {
                  const looksLikeQuestion = (k) =>
                    k.length > 25 &&
                    (/^\s*(what|how|why|when|where|which|who|is|are|can|could|does|do|did|will|would|should|has|have|had)\b/i.test(
                      k.trim(),
                    ) ||
                      k.includes("?"));
                  const chipsToShow = searchKeywords.flatMap(
                    (keyword, index) => {
                      const pmcIdMatch = keyword.match(/^(PMC)?(\d+)$/i);
                      const pmidMatch = keyword.match(/^(\d+)$/);
                      if (pmcIdMatch?.[1])
                        return [
                          { display: `PMC: ${keyword}`, removeRef: keyword },
                        ];
                      if (pmidMatch)
                        return [
                          {
                            display: `PMID/PMC: ${keyword}`,
                            removeRef: keyword,
                          },
                        ];
                      if (looksLikeQuestion(keyword)) {
                        const terms = getCleanedKeywordsFromQuery(keyword);
                        if (terms.length > 0)
                          return terms.map((t) => ({
                            display: t,
                            removeRef: keyword,
                          }));
                      }
                      return [{ display: keyword, removeRef: keyword }];
                    },
                  );
                  return searchKeywords.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-slate-600">
                        {t("publications.keywordsCount", {
                          count: chipsToShow.length,
                        })}
                      </span>
                      {chipsToShow.map(({ display, removeRef }, idx) => (
                        <span
                          key={`${removeRef}-${display}-${idx}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 text-indigo-700 rounded-full text-xs font-medium shadow-sm hover:shadow transition-all group"
                        >
                          {display}
                          <button
                            onClick={() =>
                              removeKeyword(
                                removeRef,
                                removeRef !== display ? display : undefined,
                              )
                            }
                            className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                            aria-label={`Remove ${display}`}
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
                  ) : null;
                })()}
                {searchKeywords.length === 0 && (
                  <p className="text-xs text-slate-500 italic">
                    {t("publications.addKeywordsHint")}
                  </p>
                )}
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
                            if (filter.key === "dateRange") {
                              setDateRange({ start: "", end: "" });
                            } else if (filter.key === "articleType") {
                              setArticleType("");
                            } else if (filter.key.startsWith("addedTerm-")) {
                              const updated = addedTerms.filter(
                                (_, i) => i !== filter.termIndex,
                              );
                              setAddedTerms(updated);
                              buildQueryFromAddedTerms(updated);
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
            title={t("publications.advancedSearch")}
          >
            <div className="space-y-4">
              {/* Display added terms as chips - only show confirmed added terms */}
              {addedTerms.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-slate-600 mb-2">
                    {t("publications.addedTerms")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {addedTerms.map((term, index) => {
                      const prevTerm = index > 0 ? addedTerms[index - 1] : null;
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5 group hover:bg-indigo-100 transition-colors"
                        >
                          {prevTerm && (
                            <span className="text-xs font-medium text-indigo-700 mr-1">
                              {term.operator || "AND"}
                            </span>
                          )}
                          <span className="text-xs font-semibold text-indigo-700">
                            {term.field === "All Fields"
                              ? ""
                              : `${term.field} - `}
                          </span>
                          <span className="text-xs text-slate-700">
                            {term.term}
                          </span>
                          <button
                            onClick={() => {
                              const updated = addedTerms.filter(
                                (_, i) => i !== index,
                              );
                              setAddedTerms(updated);
                              buildQueryFromAddedTerms(updated);
                            }}
                            className="ml-1 p-0.5 hover:bg-indigo-200 rounded-full transition-colors"
                            title={t("publications.removeTerm")}
                          >
                            <X className="w-3 h-3 text-indigo-600" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add new term form */}
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">
                  {t("publications.addTermsToQuery")}
                </h3>
                <div className="space-y-3">
                  {queryTerms.map((term, index) => (
                    <div key={index}>
                      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                        {index > 0 && (
                          <div className="w-full sm:w-auto">
                            <CustomSelect
                              value={term.operator}
                              onChange={(value) =>
                                updateQueryTerm(index, "operator", value)
                              }
                              options={operatorOptions}
                              className="w-full sm:w-auto"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-[150px]">
                          <CustomSelect
                            value={term.field}
                            onChange={(value) =>
                              updateQueryTerm(index, "field", value)
                            }
                            options={fieldOptions}
                            placeholder={t("publications.selectField")}
                            className="w-full"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={term.term}
                            onChange={(e) =>
                              updateQueryTerm(index, "term", e.target.value)
                            }
                            onKeyPress={(e) => {
                              if (e.key === "Enter" && term.term.trim()) {
                                e.preventDefault();
                                addQueryTerm();
                                // Focus on the new term input if it exists
                                setTimeout(() => {
                                  const inputs =
                                    document.querySelectorAll(
                                      'input[type="text"]',
                                    );
                                  const lastInput = inputs[inputs.length - 1];
                                  if (lastInput) lastInput.focus();
                                }, 100);
                              }
                            }}
                            placeholder={
                              term.field === "Author"
                                ? t("publications.placeholderAuthor")
                                : term.field === "Publication Type"
                                  ? t("publications.placeholderPublicationType")
                                  : term.field === "Journal"
                                    ? t("publications.placeholderJournal")
                                    : t("publications.placeholderSearchTerm")
                            }
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                          />
                        </div>
                        <Button
                          onClick={() => addQueryTerm()}
                          disabled={!term.term.trim()}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          {t("publications.addButton")}
                        </Button>
                      </div>
                      {/* Help text below input box only - aligned with first input position */}
                      {term.field !== "All Fields" && (
                        <div className="mt-1 mb-2 ">
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {fieldHelpText[term.field]}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  {t("publications.publicationDateRange")}
                </h3>
                <div className="bg-gradient-to-br from-indigo-50 to-slate-50 rounded-lg p-4 border border-indigo-100">
                  {/* Date Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    {/* From Date */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <span>{t("publications.from")}</span>
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={
                            dateRange.start
                              ? dateRange.start.split("-")[1] || ""
                              : ""
                          }
                          onChange={(e) => {
                            const year = dateRange.start
                              ? dateRange.start.split("-")[0]
                              : new Date().getFullYear();
                            const newMonth = e.target.value;
                            if (newMonth && year) {
                              setDateRange((prev) => ({
                                ...prev,
                                start: `${year}-${newMonth}`,
                              }));
                            } else if (!newMonth && year) {
                              setDateRange((prev) => ({ ...prev, start: "" }));
                            }
                          }}
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 transition-all"
                        >
                          <option value="">{t("publications.selectMonth")}</option>
                          <option value="01">January</option>
                          <option value="02">February</option>
                          <option value="03">March</option>
                          <option value="04">April</option>
                          <option value="05">May</option>
                          <option value="06">June</option>
                          <option value="07">July</option>
                          <option value="08">August</option>
                          <option value="09">September</option>
                          <option value="10">October</option>
                          <option value="11">November</option>
                          <option value="12">December</option>
                        </select>
                        <select
                          value={
                            dateRange.start
                              ? dateRange.start.split("-")[0] || ""
                              : ""
                          }
                          onChange={(e) => {
                            const month = dateRange.start
                              ? dateRange.start.split("-")[1]
                              : "";
                            const newYear = e.target.value;
                            if (newYear && month) {
                              setDateRange((prev) => ({
                                ...prev,
                                start: `${newYear}-${month}`,
                              }));
                            } else if (newYear && !month) {
                              setDateRange((prev) => ({
                                ...prev,
                                start: `${newYear}-01`,
                              }));
                            } else {
                              setDateRange((prev) => ({ ...prev, start: "" }));
                            }
                          }}
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 transition-all"
                        >
                          <option value="">{t("publications.selectYear")}</option>
                          {Array.from({ length: 50 }, (_, i) => {
                            const year = new Date().getFullYear() - i;
                            return (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    {/* To Date */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <span>{t("publications.to")}</span>
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={
                            dateRange.end
                              ? dateRange.end.split("-")[1] || ""
                              : ""
                          }
                          onChange={(e) => {
                            const year = dateRange.end
                              ? dateRange.end.split("-")[0]
                              : new Date().getFullYear();
                            const newMonth = e.target.value;
                            if (newMonth && year) {
                              setDateRange((prev) => ({
                                ...prev,
                                end: `${year}-${newMonth}`,
                              }));
                            } else if (!newMonth && year) {
                              setDateRange((prev) => ({ ...prev, end: "" }));
                            }
                          }}
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 transition-all"
                        >
                          <option value="">{t("publications.selectMonth")}</option>
                          <option value="01">January</option>
                          <option value="02">February</option>
                          <option value="03">March</option>
                          <option value="04">April</option>
                          <option value="05">May</option>
                          <option value="06">June</option>
                          <option value="07">July</option>
                          <option value="08">August</option>
                          <option value="09">September</option>
                          <option value="10">October</option>
                          <option value="11">November</option>
                          <option value="12">December</option>
                        </select>
                        <select
                          value={
                            dateRange.end
                              ? dateRange.end.split("-")[0] || ""
                              : ""
                          }
                          onChange={(e) => {
                            const month = dateRange.end
                              ? dateRange.end.split("-")[1]
                              : "";
                            const newYear = e.target.value;
                            if (newYear && month) {
                              setDateRange((prev) => ({
                                ...prev,
                                end: `${newYear}-${month}`,
                              }));
                            } else if (newYear && !month) {
                              setDateRange((prev) => ({
                                ...prev,
                                end: `${newYear}-12`,
                              }));
                            } else {
                              setDateRange((prev) => ({ ...prev, end: "" }));
                            }
                          }}
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 transition-all"
                        >
                          <option value="">{t("publications.selectYear")}</option>
                          {Array.from({ length: 50 }, (_, i) => {
                            const year = new Date().getFullYear() - i;
                            return (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-xs font-medium text-slate-500">
                      {t("publications.quickSelect")}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setDateRange({
                          start: `${now.getFullYear()}-01`,
                          end: `${now.getFullYear()}-${String(
                            now.getMonth() + 1,
                          ).padStart(2, "0")}`,
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-white border border-slate-300 text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 shadow-sm hover:shadow"
                    >
                      {t("publications.thisYear")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setDateRange({
                          start: `${now.getFullYear() - 1}-${String(
                            now.getMonth() + 1,
                          ).padStart(2, "0")}`,
                          end: `${now.getFullYear()}-${String(
                            now.getMonth() + 1,
                          ).padStart(2, "0")}`,
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-white border border-slate-300 text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 shadow-sm hover:shadow"
                    >
                      {t("publications.lastYear")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setDateRange({
                          start: `${now.getFullYear() - 5}-${String(
                            now.getMonth() + 1,
                          ).padStart(2, "0")}`,
                          end: `${now.getFullYear()}-${String(
                            now.getMonth() + 1,
                          ).padStart(2, "0")}`,
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-white border border-slate-300 text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 shadow-sm hover:shadow"
                    >
                      {t("publications.last5Years")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setDateRange({
                          start: `${now.getFullYear() - 10}-${String(
                            now.getMonth() + 1,
                          ).padStart(2, "0")}`,
                          end: `${now.getFullYear()}-${String(
                            now.getMonth() + 1,
                          ).padStart(2, "0")}`,
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-white border border-slate-300 text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 shadow-sm hover:shadow"
                    >
                      {t("publications.last10Years")}
                    </button>
                    {(dateRange.start || dateRange.end) && (
                      <button
                        type="button"
                        onClick={() => setDateRange({ start: "", end: "" })}
                        className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200 hover:border-slate-400 flex items-center gap-1.5"
                      >
                        <X className="w-3 h-3" />
                        {t("publications.clear")}
                      </button>
                    )}
                  </div>

                  {/* Active Filter Display */}
                  {(dateRange.start || dateRange.end) && (
                    <div className="pt-3 border-t border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        <p className="text-xs text-indigo-700 font-medium">
                          <span className="text-slate-500">
                            {t("publications.activeFilter")}
                          </span>{" "}
                          {dateRange.start ? (
                            new Date(
                              dateRange.start + "-01",
                            ).toLocaleDateString("en-US", {
                              month: "long",
                              year: "numeric",
                            })
                          ) : (
                            <span className="text-slate-400">
                              {t("publications.any")}
                            </span>
                          )}
                          {" → "}
                          {dateRange.end ? (
                            new Date(dateRange.end + "-01").toLocaleDateString(
                              "en-US",
                              { month: "long", year: "numeric" },
                            )
                          ) : (
                            <span className="text-slate-400">
                              {t("publications.present")}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Type of Article (PubMed Publication Type) */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  {t("publications.typeOfArticle")}
                </h3>
                <p className="text-xs text-slate-500 mb-2">
                  {t("publications.typeOfArticleHint")}
                </p>
                <div className="bg-gradient-to-br from-indigo-50 to-slate-50 rounded-lg p-4 border border-indigo-100">
                  <select
                    value={articleType}
                    onChange={(e) => setArticleType(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 transition-all"
                  >
                    {articleTypeOptions.map((opt) => (
                      <option key={opt.value || "any"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {articleType && (
                    <p className="mt-2 text-xs text-indigo-700">
                      {t("publications.filterLabel")}{" "}
                      <strong>
                        {
                          articleTypeOptions.find(
                            (o) => o.value === articleType,
                          )?.label
                        }
                      </strong>{" "}
                      (PubMed: &quot;{articleType}&quot;[pt])
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Modal>

          {/* Results Area - wrapper for tour targeting */}
          <div data-tour="publications-results-area" className="min-h-[200px]">
            {/* Skeleton Loaders */}
            {loading && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-lg shadow-md border border-slate-200 animate-pulse"
                  >
                    <div className="p-5">
                      {/* Header Skeleton */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="h-6 w-28 bg-indigo-200 rounded-full"></div>
                        <div className="h-6 w-32 bg-slate-200 rounded-full"></div>
                      </div>

                      {/* Title Skeleton */}
                      <div className="mb-3 space-y-2">
                        <div className="h-5 bg-slate-200 rounded w-full"></div>
                        <div className="h-5 bg-slate-200 rounded w-4/5"></div>
                      </div>

                      {/* Info Skeleton */}
                      <div className="space-y-2 mb-3">
                        <div className="h-4 bg-slate-100 rounded w-full"></div>
                        <div className="h-4 bg-indigo-100 rounded w-2/3"></div>
                        <div className="h-4 bg-indigo-100 rounded w-3/4"></div>
                      </div>

                      {/* Abstract Button Skeleton */}
                      <div className="mb-3">
                        <div className="h-16 bg-indigo-50 rounded-lg"></div>
                      </div>

                      {/* Buttons Skeleton */}
                      <div className="flex gap-2">
                        <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
                        <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                      </div>

                      {/* Open Paper Button Skeleton */}
                      <div className="mt-3">
                        <div className="h-8 bg-indigo-100 rounded-lg"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Results Section - show tutorial sample or real results */}
            {!loading &&
              (results.length > 0 || tutorialSampleResults.length > 0) && (
                <>
                  {/* Source summary: PubMed + OpenAlex when combined search was used */}
                  {publicationSources?.sourcesUsed?.length > 0 &&
                    publicationSources?.sourceCounts && (
                      <div className="mb-3 text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-medium text-slate-600">
                          {t("publications.sources")}
                        </span>
                        {publicationSources.sourceCounts.pubmed > 0 && (
                          <span>
                            PubMed (
                            {publicationSources.sourceCounts.pubmed.toLocaleString()}
                            )
                          </span>
                        )}
                        {publicationSources.sourceCounts.openalex > 0 && (
                          <span>
                            OpenAlex (
                            {publicationSources.sourceCounts.openalex.toLocaleString()}
                            )
                          </span>
                        )}
                        {(publicationSources.sourceCounts.semantic_scholar ??
                          0) > 0 && (
                          <span>
                            Semantic Scholar (
                            {publicationSources.sourceCounts.semantic_scholar.toLocaleString()}
                            )
                          </span>
                        )}
                        {(publicationSources.sourceCounts.arxiv ?? 0) > 0 && (
                          <span>
                            arXiv (
                            {publicationSources.sourceCounts.arxiv.toLocaleString()}
                            )
                          </span>
                        )}
                        {(publicationSources.sourceCounts.openfda ?? 0) > 0 && (
                          <span>
                            OpenFDA (
                            {publicationSources.sourceCounts.openfda.toLocaleString()}
                            )
                          </span>
                        )}
                        {(publicationSources.sourceCounts.uspstf ?? 0) > 0 && (
                          <span>
                            USPSTF (
                            {publicationSources.sourceCounts.uspstf.toLocaleString()}
                            )
                          </span>
                        )}
                        {(publicationSources.sourceCounts.genereviews ?? 0) >
                          0 && (
                          <span>
                            GeneReviews (
                            {publicationSources.sourceCounts.genereviews.toLocaleString()}
                            )
                          </span>
                        )}
                        {(publicationSources.sourceCounts.medlineplus ?? 0) >
                          0 && (
                          <span>
                            MedlinePlus (
                            {publicationSources.sourceCounts.medlineplus.toLocaleString()}
                            )
                          </span>
                        )}
                      </div>
                    )}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(tutorialSampleResults.length > 0
                      ? tutorialSampleResults
                      : results
                    ).map((pub, cardIdx) => {
                        const itemId = pub.id || pub.pmid;
                        return (
                          <div
                            key={itemId}
                            className="bg-white rounded-xl shadow-sm border transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden flex flex-col h-full animate-fade-in"
                            style={{
                              borderColor: pub.isRead
                                ? "rgba(147, 51, 234, 0.4)" // Purple for read
                                : "rgba(59, 130, 246, 0.4)", // Blue for unread
                              animationDelay: `${cardIdx * 50}ms`,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow =
                                "0 10px 15px -3px rgba(47, 60, 150, 0.1), 0 4px 6px -2px rgba(47, 60, 150, 0.05)";
                              e.currentTarget.style.borderColor = pub.isRead
                                ? "rgba(147, 51, 234, 0.6)" // Darker purple on hover
                                : "rgba(59, 130, 246, 0.6)"; // Darker blue on hover
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow =
                                "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
                              e.currentTarget.style.borderColor = pub.isRead
                                ? "rgba(147, 51, 234, 0.4)" // Purple for read
                                : "rgba(59, 130, 246, 0.4)"; // Blue for unread
                            }}
                          >
                            <div className="p-5 flex flex-col flex-grow">
                              {/* Match Progress Bar */}
                              {pub.matchPercentage !== undefined && (
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
                                        {t("publications.matchPercent", {
                                          pct: pub.matchPercentage,
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
                                            {t("publications.matchRelevance")}
                                          </div>
                                          <div className="text-gray-300 leading-relaxed">
                                            {pub.matchExplanation ||
                                              t(
                                                "publications.matchExplanationDefault",
                                                { pct: pub.matchPercentage },
                                              )}
                                          </div>
                                          {/* Tooltip arrow */}
                                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  {/* Progress Bar */}
                                  <div
                                    className="w-full h-2.5 rounded-full overflow-hidden"
                                    style={{
                                      backgroundColor:
                                        "rgba(208, 196, 226, 0.3)",
                                    }}
                                  >
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{
                                        width: `${pub.matchPercentage}%`,
                                        background:
                                          "linear-gradient(90deg, #2F3C96, #253075)",
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              )}

                              {/* Publication Title */}
                              <div className="mb-4">
                                <h3
                                  className="text-lg font-bold mb-0 line-clamp-3 leading-snug flex items-start gap-2"
                                  style={{
                                    color: pub.isRead
                                      ? "#D0C4E2" // Light purple for read
                                      : "#2F3C96", // Default blue for unread
                                  }}
                                >
                                  {pub.isRead && (
                                    <CheckCircle
                                      className="w-4 h-4 mt-1 shrink-0"
                                      style={{ color: "#D0C4E2" }}
                                    />
                                  )}
                                  <span className="flex-1">
                                    {researcherTitleMode
                                      ? pub.title || t("publications.untitledPublication")
                                      : (simplifyTitles &&
                                          simplifiedTitles.get(pub.title)) ||
                                        pub.simplifiedTitle ||
                                        pub.title ||
                                        t("publications.untitledPublication")}
                                  </span>
                                </h3>
                              </div>

                              {/* Basic Info - Authors and Published Date */}
                              <div className="space-y-1.5 mb-4">
                                {pub.authors &&
                                  Array.isArray(pub.authors) &&
                                  pub.authors.length > 0 && (
                                    <div
                                      className="flex items-center text-sm"
                                      style={{ color: "#787878" }}
                                    >
                                      <User className="w-3.5 h-3.5 mr-2 shrink-0" />
                                      <span className="line-clamp-1">
                                        {pub.authors.join(", ")}
                                      </span>
                                    </div>
                                  )}
                                {(pub.year || pub.month) && (
                                  <div
                                    className="flex items-center text-sm"
                                    style={{ color: "#787878" }}
                                  >
                                    <Calendar className="w-3.5 h-3.5 mr-2 shrink-0" />
                                    <span>
                                      {pub.month && pub.month + " "}
                                      {pub.year || ""}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Abstract Preview */}
                              {pub.abstract && (
                                <div className="mb-4 flex-grow">
                                  <button
                                    {...(cardIdx === 0 && {
                                      "data-tour":
                                        "publications-view-details-btn",
                                    })}
                                    onClick={() => openDetailsModal(pub)}
                                    className="w-full text-left text-sm py-2 px-3 rounded-lg transition-all duration-200 border group"
                                    style={{
                                      backgroundColor:
                                        "rgba(208, 196, 226, 0.2)",
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
                                            {pub.abstract}
                                          </span>
                                        </div>
                                        <div
                                          className="mt-1.5 flex items-center gap-1 font-medium transition-all duration-200"
                                          style={{ color: "#2F3C96" }}
                                        >
                                          <span>
                                            {t("publications.viewFullDetails")}
                                          </span>
                                          <span className="inline-block group-hover:translate-x-0.5 transition-transform duration-200">
                                            →
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                </div>
                              )}

                              {/* Spacer for cards without abstract */}
                              {!pub.abstract && (
                                <div className="flex-grow"></div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex gap-2 mt-auto">
                                <button
                                  {...(cardIdx === 0 && {
                                    "data-tour": "publications-understand-btn",
                                  })}
                                  onClick={() => generateSummary(pub)}
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
                                  {t("publications.simplify")}
                                </button>

                                <button
                                  {...(cardIdx === 0 && {
                                    "data-tour": "publications-favourites-btn",
                                  })}
                                  onClick={() => favorite(pub)}
                                  disabled={favoritingItems.has(
                                    getFavoriteKey(pub),
                                  )}
                                  className={`p-2 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                    favorites.some(
                                      (fav) =>
                                        fav.type === "publication" &&
                                        (fav.item?.id === itemId ||
                                          fav.item?._id === itemId ||
                                          fav.item?.pmid === itemId),
                                    )
                                      ? "bg-red-50 border-red-200 text-red-500"
                                      : ""
                                  }`}
                                  style={
                                    !favorites.some(
                                      (fav) =>
                                        fav.type === "publication" &&
                                        (fav.item?.id === itemId ||
                                          fav.item?._id === itemId ||
                                          fav.item?.pmid === itemId),
                                    )
                                      ? {
                                          backgroundColor:
                                            "rgba(208, 196, 226, 0.2)",
                                          borderColor:
                                            "rgba(208, 196, 226, 0.3)",
                                          color: "#787878",
                                        }
                                      : {}
                                  }
                                  onMouseEnter={(e) => {
                                    const isFavorited = favorites.some(
                                      (fav) =>
                                        fav.type === "publication" &&
                                        (fav.item?.id === itemId ||
                                          fav.item?._id === itemId ||
                                          fav.item?.pmid === itemId),
                                    );
                                    if (
                                      !isFavorited &&
                                      !e.currentTarget.disabled
                                    ) {
                                      e.currentTarget.style.backgroundColor =
                                        "rgba(208, 196, 226, 0.3)";
                                      e.currentTarget.style.color = "#dc2626";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    const isFavorited = favorites.some(
                                      (fav) =>
                                        fav.type === "publication" &&
                                        (fav.item?.id === itemId ||
                                          fav.item?._id === itemId ||
                                          fav.item?.pmid === itemId),
                                    );
                                    if (!isFavorited) {
                                      e.currentTarget.style.backgroundColor =
                                        "rgba(208, 196, 226, 0.2)";
                                      e.currentTarget.style.color = "#787878";
                                    }
                                  }}
                                >
                                  {favoritingItems.has(getFavoriteKey(pub)) ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Heart
                                      className={`w-4 h-4 ${
                                        favorites.some(
                                          (fav) =>
                                            fav.type === "publication" &&
                                            (fav.item?.id === itemId ||
                                              fav.item?._id === itemId ||
                                              fav.item?.pmid === itemId),
                                        )
                                          ? "fill-current"
                                          : ""
                                      }`}
                                    />
                                  )}
                                </button>
                              </div>

                              {/* View Full Publication Button */}
                              {(pub.pmid || pub.id || pub._id) && (
                                <button
                                  onClick={() => {
                                    const publicationId =
                                      pub.pmid || pub.id || pub._id;
                                    const source = pub.source
                                      ? `?source=${encodeURIComponent(pub.source)}`
                                      : "";
                                    navigate(
                                      `/publication/${publicationId}${source}`,
                                    );
                                  }}
                                  className="flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-colors mt-3 w-full"
                                  style={{
                                    color: "#2F3C96",
                                    backgroundColor: "rgba(208, 196, 226, 0.2)",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      "rgba(208, 196, 226, 0.3)";
                                    e.currentTarget.style.color = "#253075";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      "rgba(208, 196, 226, 0.2)";
                                    e.currentTarget.style.color = "#2F3C96";
                                  }}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  {t("publications.viewFullPublication")}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}

            {/* Results Count and Pagination (guests and signed-in users) */}
            {!loading && results.length > 0 && (
              <div className="mt-6 flex flex-col items-center gap-4">
                {/* Results Count */}
                <div className="text-sm text-slate-600 flex flex-col items-center gap-1">
                  <span>
                    {t("publications.pageOf", {
                      current: currentPage,
                      total: totalPages.toLocaleString(),
                    })}{" "}
                    {t("publications.totalResults", {
                      count: totalCount.toLocaleString(),
                    })}
                    {(dateRange.start || dateRange.end) && (
                      <span className="text-slate-500">
                        {" "}
                        {t("publications.filteredByDate")}
                        {dateRange.start &&
                          dateRange.end &&
                          t("publications.dateRangeBoth", {
                            start: dateRange.start,
                            end: dateRange.end,
                          })}
                        {dateRange.start &&
                          !dateRange.end &&
                          t("publications.dateFromOnly", {
                            start: dateRange.start,
                          })}
                        {!dateRange.start &&
                          dateRange.end &&
                          t("publications.dateUntilOnly", {
                            end: dateRange.end,
                          })}
                      </span>
                    )}
                  </span>
                  {publicationSources?.sourceCounts &&
                    (publicationSources.sourceCounts.pubmed > 0 ||
                      publicationSources.sourceCounts.openalex > 0 ||
                      (publicationSources.sourceCounts.semantic_scholar ?? 0) >
                        0 ||
                      (publicationSources.sourceCounts.arxiv ?? 0) > 0 ||
                      (publicationSources.sourceCounts.openfda ?? 0) > 0 ||
                      (publicationSources.sourceCounts.uspstf ?? 0) > 0 ||
                      (publicationSources.sourceCounts.genereviews ?? 0) > 0 ||
                      (publicationSources.sourceCounts.medlineplus ?? 0) > 0) && (
                      <span className="text-xs text-slate-500">
                        {t("publications.fromSources")}{" "}
                        {[
                          publicationSources.sourceCounts.pubmed > 0 &&
                            `PubMed (${publicationSources.sourceCounts.pubmed.toLocaleString()})`,
                          publicationSources.sourceCounts.openalex > 0 &&
                            `OpenAlex (${publicationSources.sourceCounts.openalex.toLocaleString()})`,
                          (publicationSources.sourceCounts.semantic_scholar ??
                            0) > 0 &&
                            `Semantic Scholar (${publicationSources.sourceCounts.semantic_scholar.toLocaleString()})`,
                          (publicationSources.sourceCounts.arxiv ?? 0) > 0 &&
                            `arXiv (${publicationSources.sourceCounts.arxiv.toLocaleString()})`,
                          (publicationSources.sourceCounts.openfda ?? 0) > 0 &&
                            `OpenFDA (${publicationSources.sourceCounts.openfda.toLocaleString()})`,
                          (publicationSources.sourceCounts.uspstf ?? 0) > 0 &&
                            `USPSTF (${publicationSources.sourceCounts.uspstf.toLocaleString()})`,
                          (publicationSources.sourceCounts.genereviews ?? 0) >
                            0 &&
                            `GeneReviews (${publicationSources.sourceCounts.genereviews.toLocaleString()})`,
                          (publicationSources.sourceCounts.medlineplus ?? 0) >
                            0 &&
                            `MedlinePlus (${publicationSources.sourceCounts.medlineplus.toLocaleString()})`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
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
                <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 p-6 text-center shadow-lg">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-lg font-bold text-indigo-900">
                        {t("publications.wantMoreTitle")}
                      </h3>
                    </div>
                    <p className="text-sm text-indigo-700 max-w-md">
                      {t("publications.wantMoreBody", {
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
                </div>
              )}

            {/* Empty State */}
            {!loading && results.length === 0 && !isInitialLoad && (
              <div className="text-center py-12 bg-white rounded-lg shadow-md border border-slate-200 animate-fade-in">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-800 mb-1">
                  {t("publications.emptyTitle")}
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  {t("publications.emptyHint")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Details Modal */}
        <Modal
          isOpen={detailsModal.open}
          onClose={closeDetailsModal}
          title={t("publications.modalDetailsTitle")}
        >
          {detailsModal.loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2
                className="w-8 h-8 animate-spin"
                style={{ color: "#2F3C96" }}
              />
              <span className="ml-3 text-sm" style={{ color: "#787878" }}>
                {t("publications.loadingDetails")}
              </span>
            </div>
          ) : (
            detailsModal.publication && (
              <div className="flex flex-col h-full -mx-6 -my-6">
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto space-y-6 px-6 pt-6 pb-24">
                  {/* Header */}
                  <div
                    className="pb-4 border-b"
                    style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                  >
                    <h3
                      className="text-xl font-bold mb-3 leading-tight"
                      style={{ color: "#2F3C96" }}
                    >
                      {researcherTitleMode
                        ? detailsModal.publication.title
                        : detailsModal.publication.simplifiedDetails?.title ||
                          detailsModal.publication.simplifiedTitle ||
                          detailsModal.publication.title}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {detailsModal.publication.pmid && (
                        <span
                          className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md border"
                          style={{
                            backgroundColor: "rgba(47, 60, 150, 0.15)",
                            color: "#2F3C96",
                            borderColor: "rgba(47, 60, 150, 0.3)",
                          }}
                        >
                          <FileText className="w-3 h-3 mr-1.5" />
                          PMID: {detailsModal.publication.pmid}
                        </span>
                      )}
                      {detailsModal.publication.journal && (
                        <span
                          className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md border"
                          style={{
                            backgroundColor: "rgba(208, 196, 226, 0.2)",
                            color: "#787878",
                            borderColor: "rgba(208, 196, 226, 0.3)",
                          }}
                        >
                          <BookOpen className="w-3 h-3 mr-1.5" />
                          {detailsModal.publication.journal}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Abstract Section - Show simplified if available */}
                  {(detailsModal.publication.simplifiedDetails?.abstract ||
                    detailsModal.publication.abstract) && (
                    <div>
                      <div
                        className="rounded-xl p-5 border"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(208, 196, 226, 0.2), rgba(232, 224, 239, 0.2))",
                          borderColor: "rgba(208, 196, 226, 0.3)",
                        }}
                      >
                        <h4
                          className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                          style={{ color: "#2F3C96" }}
                        >
                          {t("publications.abstract")}
                        </h4>
                        <p
                          className="text-sm leading-relaxed whitespace-pre-wrap"
                          style={{ color: "#787878" }}
                        >
                          {detailsModal.publication.simplifiedDetails
                            ?.abstract || detailsModal.publication.abstract}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Methods Section - Show simplified if available */}
                  {detailsModal.publication.simplifiedDetails?.methods && (
                    <div>
                      <div
                        className="bg-white rounded-xl p-5 border shadow-sm"
                        style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                      >
                        <h4
                          className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                          style={{ color: "#2F3C96" }}
                        >
                          <ListChecks className="w-4 h-4" />
                          {t("publications.methods")}
                        </h4>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {detailsModal.publication.simplifiedDetails.methods}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Results Section - Show simplified if available */}
                  {detailsModal.publication.simplifiedDetails?.results && (
                    <div>
                      <div
                        className="bg-white rounded-xl p-5 border shadow-sm"
                        style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                      >
                        <h4
                          className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                          style={{ color: "#2F3C96" }}
                        >
                          <TrendingUp className="w-4 h-4" />
                          {t("publications.results")}
                        </h4>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {detailsModal.publication.simplifiedDetails.results}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Conclusion Section - Show simplified if available */}
                  {detailsModal.publication.simplifiedDetails?.conclusion && (
                    <div>
                      <div
                        className="bg-white rounded-xl p-5 border shadow-sm"
                        style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                      >
                        <h4
                          className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                          style={{ color: "#2F3C96" }}
                        >
                          <CheckCircle className="w-4 h-4" />
                          {t("publications.conclusion")}
                        </h4>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {
                            detailsModal.publication.simplifiedDetails
                              .conclusion
                          }
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Key Takeaways Section - Show simplified if available */}
                  {detailsModal.publication.simplifiedDetails?.keyTakeaways &&
                    detailsModal.publication.simplifiedDetails.keyTakeaways
                      .length > 0 && (
                      <div>
                        <div
                          className="bg-gradient-to-br rounded-xl p-5 border shadow-sm"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(232, 224, 239, 0.4), rgba(245, 242, 248, 0.6))",
                            borderColor: "rgba(208, 196, 226, 0.3)",
                          }}
                        >
                          <h4
                            className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                            style={{ color: "#2F3C96" }}
                          >
                            <AlertCircle className="w-4 h-4" />
                            {t("publications.keyTakeaways")}
                          </h4>
                          <ul className="space-y-2">
                            {detailsModal.publication.simplifiedDetails.keyTakeaways.map(
                              (takeaway, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-sm"
                                  style={{ color: "#787878" }}
                                >
                                  <span
                                    className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: "#2F3C96" }}
                                  ></span>
                                  <span>{takeaway}</span>
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      </div>
                    )}

                  {/* Authors Section */}
                  {detailsModal.publication.authors &&
                    Array.isArray(detailsModal.publication.authors) &&
                    detailsModal.publication.authors.length > 0 && (
                      <div>
                        <div
                          className="bg-white rounded-xl p-5 border shadow-sm"
                          style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                        >
                          <h4
                            className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                            style={{ color: "#2F3C96" }}
                          >
                            <User className="w-4 h-4" />
                            {t("publications.authors")}
                          </h4>
                          <p
                            className="text-sm leading-relaxed"
                            style={{ color: "#787878" }}
                          >
                            {detailsModal.publication.authors.join(", ")}
                          </p>
                          {detailsModal.publication.authors.length > 1 && (
                            <p
                              className="text-xs mt-2"
                              style={{ color: "#787878" }}
                            >
                              {t("publications.authorsCount", {
                                count: detailsModal.publication.authors.length,
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                  {/* Publication Metadata Cards */}
                  <div>
                    <div
                      className="bg-white rounded-xl p-5 border shadow-sm"
                      style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                    >
                      <h4
                        className="font-semibold mb-4 flex items-center gap-2 text-sm uppercase tracking-wide"
                        style={{ color: "#2F3C96" }}
                      >
                        <Calendar className="w-4 h-4" />
                        {t("publications.publicationInformation")}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Publication Date */}
                        {(detailsModal.publication.year ||
                          detailsModal.publication.month) && (
                          <div
                            className="rounded-lg p-3 border"
                            style={{
                              backgroundColor: "rgba(208, 196, 226, 0.1)",
                              borderColor: "rgba(208, 196, 226, 0.3)",
                            }}
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              <Calendar
                                className="w-3.5 h-3.5"
                                style={{ color: "#787878" }}
                              />
                              <span
                                className="text-xs font-medium uppercase tracking-wide"
                                style={{ color: "#787878" }}
                              >
                                {t("publications.published")}
                              </span>
                            </div>
                            <p
                              className="text-sm font-semibold"
                              style={{ color: "#2F3C96" }}
                            >
                              {detailsModal.publication.month
                                ? `${detailsModal.publication.month} `
                                : ""}
                              {detailsModal.publication.day
                                ? `${detailsModal.publication.day}, `
                                : ""}
                              {detailsModal.publication.year ||
                                t("publications.notAvailable")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Keywords Section */}
                  {detailsModal.publication.keywords &&
                    detailsModal.publication.keywords.length > 0 && (
                      <div>
                        <div
                          className="bg-white rounded-xl p-5 border shadow-sm"
                          style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                        >
                          <h4
                            className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                            style={{ color: "#2F3C96" }}
                          >
                            <TrendingUp className="w-4 h-4" />
                            {t("publications.keywords")}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {detailsModal.publication.keywords.map(
                              (keyword, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1.5 text-xs font-medium rounded-md border"
                                  style={{
                                    backgroundColor: "rgba(47, 60, 150, 0.15)",
                                    color: "#2F3C96",
                                    borderColor: "rgba(47, 60, 150, 0.3)",
                                  }}
                                >
                                  {keyword}
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Affiliations Section */}
                  {detailsModal.publication.affiliations &&
                    detailsModal.publication.affiliations.length > 0 && (
                      <div>
                        <div
                          className="bg-white rounded-xl p-5 border shadow-sm"
                          style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                        >
                          <h4
                            className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                            style={{ color: "#2F3C96" }}
                          >
                            <MapPin className="w-4 h-4" />
                            {t("publications.affiliation")}
                          </h4>
                          <p
                            className="text-sm leading-relaxed"
                            style={{ color: "#787878" }}
                          >
                            {detailsModal.publication.affiliations[0]}
                          </p>
                        </div>
                      </div>
                    )}

                  {/* Publication Types */}
                  {detailsModal.publication.publicationTypes &&
                    detailsModal.publication.publicationTypes.length > 0 && (
                      <div>
                        <div
                          className="bg-white rounded-xl p-5 border shadow-sm"
                          style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                        >
                          <h4
                            className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                            style={{ color: "#2F3C96" }}
                          >
                            <FileText className="w-4 h-4" />
                            {t("publications.publicationType")}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {detailsModal.publication.publicationTypes.map(
                              (type, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1.5 text-xs font-medium rounded-md border"
                                  style={{
                                    backgroundColor: "rgba(208, 196, 226, 0.2)",
                                    color: "#787878",
                                    borderColor: "rgba(208, 196, 226, 0.3)",
                                  }}
                                >
                                  {type}
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                </div>

                {/* Sticky Actions Footer */}
                <div
                  className="bottom-0 px-6 py-4 border-t bg-white/95 backdrop-blur-sm shadow-lg"
                  style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                >
                  <div className="flex flex-wrap gap-3">
                    {(detailsModal.publication.pmid ||
                      detailsModal.publication.id ||
                      detailsModal.publication._id) && (
                      <button
                        onClick={() => {
                          const publicationId =
                            detailsModal.publication.pmid ||
                            detailsModal.publication.id ||
                            detailsModal.publication._id;
                          closeDetailsModal();
                          navigate(`/publication/${publicationId}`);
                        }}
                        className="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
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
                        <ExternalLink className="w-4 h-4" />
                        {t("publications.viewFullPublication")}
                      </button>
                    )}
                    <button
                      onClick={() => favorite(detailsModal.publication)}
                      disabled={favoritingItems.has(
                        getFavoriteKey(detailsModal.publication),
                      )}
                      className="px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      style={
                        favorites.some(
                          (fav) =>
                            fav.type === "publication" &&
                            (fav.item?.id ===
                              (detailsModal.publication.id ||
                                detailsModal.publication.pmid) ||
                              fav.item?._id ===
                                (detailsModal.publication.id ||
                                  detailsModal.publication.pmid) ||
                              fav.item?.pmid ===
                                (detailsModal.publication.id ||
                                  detailsModal.publication.pmid)),
                        )
                          ? {
                              backgroundColor: "#fee2e2",
                              borderColor: "#fecaca",
                              color: "#dc2626",
                            }
                          : {
                              backgroundColor: "rgba(208, 196, 226, 0.2)",
                              borderColor: "rgba(208, 196, 226, 0.3)",
                              color: "#787878",
                            }
                      }
                      onMouseEnter={(e) => {
                        if (
                          !favorites.some(
                            (fav) =>
                              fav.type === "publication" &&
                              (fav.item?.id ===
                                (detailsModal.publication.id ||
                                  detailsModal.publication.pmid) ||
                                fav.item?._id ===
                                  (detailsModal.publication.id ||
                                    detailsModal.publication.pmid) ||
                                fav.item?.pmid ===
                                  (detailsModal.publication.id ||
                                    detailsModal.publication.pmid)),
                          )
                        ) {
                          e.currentTarget.style.backgroundColor =
                            "rgba(208, 196, 226, 0.3)";
                          e.currentTarget.style.color = "#2F3C96";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (
                          !favorites.some(
                            (fav) =>
                              fav.type === "publication" &&
                              (fav.item?.id ===
                                (detailsModal.publication.id ||
                                  detailsModal.publication.pmid) ||
                                fav.item?._id ===
                                  (detailsModal.publication.id ||
                                    detailsModal.publication.pmid) ||
                                fav.item?.pmid ===
                                  (detailsModal.publication.id ||
                                    detailsModal.publication.pmid)),
                          )
                        ) {
                          e.currentTarget.style.backgroundColor =
                            "rgba(208, 196, 226, 0.2)";
                          e.currentTarget.style.color = "#787878";
                        }
                      }}
                    >
                      {favoritingItems.has(
                        getFavoriteKey(detailsModal.publication),
                      ) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Heart
                          className={`w-4 h-4 ${
                            favorites.some(
                              (fav) =>
                                fav.type === "publication" &&
                                (fav.item?.id ===
                                  (detailsModal.publication.id ||
                                    detailsModal.publication.pmid) ||
                                  fav.item?._id ===
                                    (detailsModal.publication.id ||
                                      detailsModal.publication.pmid) ||
                                  fav.item?.pmid ===
                                    (detailsModal.publication.id ||
                                      detailsModal.publication.pmid)),
                            )
                              ? "fill-current"
                              : ""
                          }`}
                        />
                      )}
                      {favoritingItems.has(
                        getFavoriteKey(detailsModal.publication),
                      )
                        ? t("publications.processing")
                        : favorites.some(
                              (fav) =>
                                fav.type === "publication" &&
                                (fav.item?.id ===
                                  (detailsModal.publication.id ||
                                    detailsModal.publication.pmid) ||
                                  fav.item?._id ===
                                    (detailsModal.publication.id ||
                                      detailsModal.publication.pmid) ||
                                  fav.item?.pmid ===
                                    (detailsModal.publication.id ||
                                      detailsModal.publication.pmid)),
                            )
                          ? t("publications.removeFromFavorites")
                          : t("publications.addToFavorites")}
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </Modal>

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
            setSummaryPublication(null);
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
              <div className="flex items-center justify-between">
                <span
                  className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: "rgba(232, 224, 239, 0.8)",
                    color: "#2F3C96",
                  }}
                >
                  {t("publications.researchPublication")}
                </span>
                {!researcherTitleMode &&
                  summaryModal.type === "publication" &&
                  !summaryModal.loading &&
                  summaryPublication &&
                  !hasSimplifiedFurther && (
                    <button
                      type="button"
                      onClick={simplifySummaryFurther}
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
                <div className="mb-4" style={{ color: "#2F3C96" }}>
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
            ) : summaryModal.type === "publication" &&
              summaryModal.summary &&
              typeof summaryModal.summary === "object" &&
              summaryModal.summary.structured ? (
              // Structured Publication Summary with Visual Aids
              <div className="space-y-5 py-2">
                {/* Core Message - Most Important First */}
                {summaryModal.summary.coreMessage && (
                  <div
                    className="rounded-xl p-5 border-2 shadow-sm"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(232, 224, 239, 0.6), rgba(245, 242, 248, 0.8))",
                      borderColor: "rgba(208, 196, 226, 0.6)",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h5
                          className="font-bold text-base mb-2"
                          style={{ color: "#2F3C96" }}
                        >
                          {t("publications.keyFinding")}
                        </h5>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#253075" }}
                        >
                          {summaryModal.summary.coreMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* What Section */}
                {summaryModal.summary.what && (
                  <div
                    className="bg-white rounded-lg p-4 border-l-4 shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderLeftColor: "#2F3C96" }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "rgba(232, 224, 239, 0.6)" }}
                      >
                        <FileText
                          className="w-4 h-4"
                          style={{ color: "#2F3C96" }}
                        />
                      </div>
                      <div className="flex-1">
                        <h5
                          className="font-semibold text-sm mb-2 flex items-center gap-2"
                          style={{ color: "#2F3C96" }}
                        >
                          <span
                            className="w-6 h-6 text-white rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: "#2F3C96" }}
                          >
                            1
                          </span>
                          {t("publications.whatStudyAbout")}
                        </h5>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {summaryModal.summary.what}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Why Section */}
                {summaryModal.summary.why && (
                  <div
                    className="bg-white rounded-lg p-4 border-l-4 shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderLeftColor: "#D0C4E2" }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "rgba(232, 224, 239, 0.6)" }}
                      >
                        <Heart
                          className="w-4 h-4"
                          style={{ color: "#2F3C96" }}
                        />
                      </div>
                      <div className="flex-1">
                        <h5
                          className="font-semibold text-sm mb-2 flex items-center gap-2"
                          style={{ color: "#2F3C96" }}
                        >
                          <span
                            className="w-6 h-6 text-white rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: "#D0C4E2" }}
                          >
                            2
                          </span>
                          {t("publications.whyResearchMatters")}
                        </h5>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {summaryModal.summary.why}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* How Section */}
                {summaryModal.summary.how && (
                  <div
                    className="bg-white rounded-lg p-4 border-l-4 shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderLeftColor: "#253075" }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "rgba(232, 224, 239, 0.6)" }}
                      >
                        <ListChecks
                          className="w-4 h-4"
                          style={{ color: "#2F3C96" }}
                        />
                      </div>
                      <div className="flex-1">
                        <h5
                          className="font-semibold text-sm mb-2 flex items-center gap-2"
                          style={{ color: "#2F3C96" }}
                        >
                          <span
                            className="w-6 h-6 text-white rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: "#253075" }}
                          >
                            3
                          </span>
                          {t("publications.howTheyDidStudy")}
                        </h5>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {summaryModal.summary.how}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* So What Section */}
                {summaryModal.summary.soWhat && (
                  <div
                    className="bg-white rounded-lg p-4 border-l-4 shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderLeftColor: "#474F97" }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "rgba(232, 224, 239, 0.6)" }}
                      >
                        <TrendingUp
                          className="w-4 h-4"
                          style={{ color: "#2F3C96" }}
                        />
                      </div>
                      <div className="flex-1">
                        <h5
                          className="font-semibold text-sm mb-2 flex items-center gap-2"
                          style={{ color: "#2F3C96" }}
                        >
                          <span
                            className="w-6 h-6 text-white rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: "#474F97" }}
                          >
                            4
                          </span>
                          {t("publications.soWhatMeans")}
                        </h5>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {summaryModal.summary.soWhat}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Key Takeaway */}
                {summaryModal.summary.keyTakeaway && (
                  <div
                    className="rounded-xl p-4 border-2 shadow-sm"
                    style={{
                      backgroundColor: "rgba(232, 224, 239, 0.3)",
                      borderColor: "rgba(208, 196, 226, 0.6)",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "#2F3C96" }}
                      >
                        <AlertCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h5
                          className="font-bold text-sm mb-2"
                          style={{ color: "#2F3C96" }}
                        >
                          {t("publications.rememberThis")}
                        </h5>
                        <p
                          className="text-sm leading-relaxed font-medium"
                          style={{ color: "#253075" }}
                        >
                          {summaryModal.summary.keyTakeaway}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Key insights as markdown (Yori-style) or plain fallback
              <div className="py-2 min-h-0 overflow-hidden">
                {summaryModal.type === "publication" &&
                (() => {
                  const raw =
                    typeof summaryModal.summary === "object"
                      ? summaryModal.summary?.summary
                      : summaryModal.summary;
                  return typeof raw === "string" && raw.trim().length > 0;
                })() ? (
                  <div className="key-insights-markdown text-sm leading-relaxed break-words overflow-x-hidden">
                    <ReactMarkdown
                      components={{
                        h2: ({ children }) => (
                          <h2
                            className="font-bold text-base mt-4 mb-2 first:mt-0"
                            style={{ color: "#2F3C96" }}
                          >
                            {children}
                          </h2>
                        ),
                        strong: ({ children }) => (
                          <strong style={{ color: "#253075" }}>
                            {children}
                          </strong>
                        ),
                        p: ({ children }) => (
                          <p className="mb-2" style={{ color: "#787878" }}>
                            {children}
                          </p>
                        ),
                        ul: ({ children }) => (
                          <ul
                            className="list-disc pl-5 mb-2 space-y-1"
                            style={{ color: "#787878" }}
                          >
                            {children}
                          </ul>
                        ),
                        li: ({ children }) => (
                          <li className="text-sm leading-relaxed">
                            {children}
                          </li>
                        ),
                      }}
                    >
                      {typeof summaryModal.summary === "object"
                        ? String(summaryModal.summary?.summary ?? "")
                        : String(summaryModal.summary ?? "")}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p
                    className="text-sm leading-relaxed whitespace-pre-wrap break-words"
                    style={{ color: "#787878" }}
                  >
                    {typeof summaryModal.summary === "object"
                      ? summaryModal.summary?.summary ||
                        t("publications.summaryUnavailable")
                      : summaryModal.summary ||
                        t("publications.summaryUnavailable")}
                  </p>
                )}
              </div>
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
