import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Users,
  FileText,
  Beaker,
  Star,
  MessageCircle,
  User,
  Sparkles,
  Info,
  Calendar,
  ExternalLink,
  BookOpen,
  Heart,
  MapPin,
  Link as LinkIcon,
  Calendar as CalendarIcon,
  MoreVertical,
  UserPlus,
  Check,
  Send,
  Briefcase,
  Building2,
  Mail,
  Phone,
  Filter,
  Plus,
  Edit3,
  MessageSquare,
  TrendingUp,
  Flame,
  Clock,
  AlertCircle,
  Activity,
  ListChecks,
  CheckCircle,
  GraduationCap,
  Award,
  Loader2,
  Bell,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle2,
  RefreshCw,
  X,
  CheckSquare,
  Square,
  Trash2,
  Tag,
  Eye,
  HelpCircle,
} from "lucide-react";
import Modal from "../components/ui/Modal";
import { MultiStepLoader } from "../components/ui/multi-step-loader";
import { useProfile } from "../contexts/ProfileContext.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";
import { getSimplifiedTitle } from "../utils/titleSimplifier.js";
import ScrollToTop from "../components/ui/ScrollToTop.jsx";
import VerifyEmailModal from "../components/VerifyEmailModal.jsx";
import { listenForMessages } from "../utils/crossTabSync.js";
import { parseEligibilityCriteria } from "../utils/parseEligibilityCriteria.js";
import { pdf } from "@react-pdf/renderer";
import PDFReportDocument from "../components/PDFReportDocument.jsx";
import PageTutorial, {
  useTutorialCompleted,
  resetTutorialCompleted,
} from "../components/PageTutorial.jsx";
import SmartSearchInput from "../components/SmartSearchInput.jsx";
import icd11Dataset from "../data/icd11Dataset.json";

export default function DashboardPatient() {
  const [data, setData] = useState({
    trials: [],
    publications: [],
    experts: [], // Collabiora Experts (from recommendations)
  });
  const [globalExperts, setGlobalExperts] = useState([]); // Global Experts (from external search, loaded on initial page load)
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Determine if user is a researcher to show "Collaborators" instead of "Experts"
  const isResearcher = user?.role === "researcher";
  const expertLabel = isResearcher ? "Collaborator" : "Expert";
  const expertsLabel = isResearcher ? "Collaborators" : "Health Experts";
  const [isFirstLoad, setIsFirstLoad] = useState(true); // Track if this is the first load (cache miss)
  const [summaryModal, setSummaryModal] = useState({
    open: false,
    title: "",
    type: "",
    summary: "",
    loading: false,
  });
  const [summaryPublication, setSummaryPublication] = useState(null);
  const [summaryTrial, setSummaryTrial] = useState(null);
  const [hasSimplifiedFurther, setHasSimplifiedFurther] = useState(false);
  const [trialDetailsModal, setTrialDetailsModal] = useState({
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
  const [publicationDetailsModal, setPublicationDetailsModal] = useState({
    open: false,
    publication: null,
    loading: false,
  });
  const [expertModal, setExpertModal] = useState({
    open: false,
    expert: null,
  });
  const [globalExpertDetailsModal, setGlobalExpertDetailsModal] = useState({
    open: false,
    expert: null,
    onPlatformProfile: null,
    loadingOnPlatformProfile: false,
  });
  const [globalExpertPublications, setGlobalExpertPublications] = useState({}); // Map of expert name/id to publications array
  const [loadingGlobalExpertPublications, setLoadingGlobalExpertPublications] =
    useState({}); // Map of expert name/id to loading state
  const [expandedGlobalCards, setExpandedGlobalCards] = useState({}); // Map of expert id to expanded state (Experts-style cards)
  const [messageModal, setMessageModal] = useState({
    open: false,
    expert: null,
    body: "",
  });
  const [followingStatus, setFollowingStatus] = useState({});
  const [favorites, setFavorites] = useState([]);
  const [selectedFavoriteItems, setSelectedFavoriteItems] = useState({
    publications: [],
    trials: [],
    experts: [],
  });
  const [selectedCategory, setSelectedCategory] = useState("publications"); // "publications", "trials", "experts", "forums", "favorites"
  const [userProfile, setUserProfile] = useState(null);
  const [forumsCategories, setForumsCategories] = useState([]);
  const [forumThreads, setForumThreads] = useState({}); // Map of categoryId to threads array
  const [recommendedCommunities, setRecommendedCommunities] = useState([]);
  const [loadingRecommendedCommunities, setLoadingRecommendedCommunities] =
    useState(false);
  const [trialFilter, setTrialFilter] = useState("RECRUITING"); // Status filter for trials - default to RECRUITING
  const [publicationSort, setPublicationSort] = useState("relevance"); // Sort option for publications
  const [showCollabioraExperts, setShowCollabioraExperts] = useState(false); // Toggle for On-Platform Experts (collapsed by default)
  const [showGlobalExperts, setShowGlobalExperts] = useState(true); // Toggle for Global Experts (expanded by default)
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [loadingFiltered, setLoadingFiltered] = useState(false);
  const [favoritingItems, setFavoritingItems] = useState(new Set()); // Track items being favorited/unfavorited
  const [isMedicalConditionsExpanded, setIsMedicalConditionsExpanded] =
    useState(false); // For mobile Medical Conditions dropdown
  const [simplifiedTitles, setSimplifiedTitles] = useState(new Map()); // Cache of simplified publication titles
  const [simplifiedTrialSummaries, setSimplifiedTrialSummaries] = useState(
    new Map(),
  ); // Cache of simplified trial summaries
  const [sendingVerificationEmail, setSendingVerificationEmail] =
    useState(false);
  const [verifyEmailModalOpen, setVerifyEmailModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [conditionsDraft, setConditionsDraft] = useState([]);
  const [primaryIndicesDraft, setPrimaryIndicesDraft] = useState([]); // up to 2 indices for search query
  const [newConditionInput, setNewConditionInput] = useState("");
  const [savingConditions, setSavingConditions] = useState(false);
  const [editConditionsModalOpen, setEditConditionsModalOpen] = useState(false);

  // ICD-11 suggestion terms for conditions (same dataset as Publications.jsx)
  const icd11SuggestionTerms = useMemo(() => {
    const termsSet = new Set();
    if (Array.isArray(icd11Dataset)) {
      icd11Dataset.forEach((item) => {
        if (item.display_name && typeof item.display_name === "string") {
          termsSet.add(item.display_name.trim());
        }
        if (Array.isArray(item.patient_terms)) {
          item.patient_terms.forEach((term) => {
            if (typeof term !== "string") return;
            const t = term.trim();
            if (!t) return;
            const lower = t.toLowerCase();
            const hasIcd =
              lower.includes("icd11 code") ||
              lower.includes("icd code") ||
              /icd11\s+[a-z]{2}[0-9]{2}/i.test(t) ||
              /icd\s+[a-z]{2}[0-9]{2}/i.test(t);
            if (!hasIcd) termsSet.add(t);
          });
        }
      });
    }
    return Array.from(termsSet);
  }, []);

  // Filter publications: hide those about death, pregnancy, pediatric/kids unless user's condition explicitly mentions that topic
  const SENSITIVE_TOPIC_TERMS = [
    "death",
    "pregnant",
    "pregnancy",
    "pediatric",
    "pediatrics",
    "kids",
    "child",
    "children",
  ];
  const filteredPublications = useMemo(() => {
    const list = data.publications || [];
    if (list.length === 0) return list;
    const userConditionsRaw =
      userProfile?.patient?.conditions || user?.medicalInterests || [];
    const userConditionsStr = (Array.isArray(userConditionsRaw)
      ? userConditionsRaw
      : [userConditionsRaw]
    )
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return list.filter((p) => {
      const titleStr = [p.title, p.simplifiedTitle, p.Title]
        .filter(Boolean)
        .join(" ");
      const title = titleStr.toLowerCase();
      const conditionsStr = Array.isArray(p.conditions)
        ? p.conditions.join(" ").toLowerCase()
        : (p.conditions || (p.condition && [p.condition].join(" ")) || "").toLowerCase();
      const meshStr = Array.isArray(p.meshTerms)
        ? p.meshTerms.join(" ").toLowerCase()
        : (p.meshTerms || "").toLowerCase();
      const abstractSnippet = (p.abstract || "").slice(0, 500).toLowerCase();
      const publicationText = `${title} ${conditionsStr} ${meshStr} ${abstractSnippet}`;
      const sensitiveTermsInPublication = SENSITIVE_TOPIC_TERMS.filter((term) =>
        publicationText.includes(term),
      );
      if (sensitiveTermsInPublication.length === 0) return true;
      // Only show if user's conditions explicitly mention every sensitive topic in this publication
      const userAlsoMentionsAll = sensitiveTermsInPublication.every((term) =>
        userConditionsStr.includes(term),
      );
      return userAlsoMentionsAll;
    });
  }, [
    data.publications,
    userProfile?.patient?.conditions,
    user?.medicalInterests,
  ]);

  const [refreshingSection, setRefreshingSection] = useState(null); // "trials" | "publications" | "experts" — active section loading
  const [refreshingSectionsBg, setRefreshingSectionsBg] = useState(new Set()); // background sections loading
  const [favoritesReportModal, setFavoritesReportModal] = useState({
    open: false,
    loading: false,
    report: null,
  });
  const navigate = useNavigate();
  const location = useLocation();
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const { updateProfileSignature, markDataFetched, generateProfileSignature } =
    useProfile();

  // Dashboard tutorial (Yori's tour) - show only first time or when user clicks "View tutorial"
  const dashboardTutorialCompleted = useTutorialCompleted("dashboard");
  const [forceShowTutorial, setForceShowTutorial] = useState(false);
  const showDashboardTutorial =
    (forceShowTutorial || !dashboardTutorialCompleted) &&
    !loading &&
    user != null;

  // Step indices for tab switching and scroll-into-view
  const DASHBOARD_TUTORIAL_STEP_PUBLICATION_CARD = 3;
  const DASHBOARD_TUTORIAL_STEP_FAVOURITES = 7;
  const DASHBOARD_TUTORIAL_STEP_YORI = 9;

  const DASHBOARD_TOUR_SELECTORS = [
    "[data-tour='dashboard-welcome']",
    "[data-tour='dashboard-recommendations']",
    "[data-tour='dashboard-conditions-bar']",
    "[data-tour='dashboard-publication-view-details']",
    "[data-tour='nav-explore']",
    "[data-tour='nav-forums']",
    "[data-tour='dashboard-tabs']",
    "[data-tour='dashboard-tab-favorites']",
    "[data-tour='dashboard-favorites-generate-summary']",
    "[data-tour='yori-chatbot']",
  ];

  const handleDashboardTutorialStepChange = useCallback((stepIndex) => {
    if (stepIndex === DASHBOARD_TUTORIAL_STEP_FAVOURITES) {
      setSelectedCategory("favorites");
    } else if (stepIndex === DASHBOARD_TUTORIAL_STEP_PUBLICATION_CARD) {
      setSelectedCategory("publications");
      requestAnimationFrame(() => {
        setTimeout(() => {
          const el = document.querySelector(
            "[data-tour='dashboard-publication-view-details']",
          );
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 80);
      });
    }
    // When moving from navbar to in-page steps, scroll target into view so the highlight is visible
    const stepsNeedingScroll = [6, 7, 8, 9];
    if (stepsNeedingScroll.includes(stepIndex)) {
      const selector =
        DASHBOARD_TOUR_SELECTORS[stepIndex] || "[data-tour='dashboard-tabs']";
      requestAnimationFrame(() => {
        setTimeout(() => {
          const el = document.querySelector(selector);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 80);
      });
    }
  }, []);

  const DASHBOARD_TUTORIAL_STEPS = useMemo(
    () => [
      {
        target: "[data-tour='dashboard-welcome']",
        title: "This is your Dashboard",
        content:
          "Hi! I'm Yori. Welcome to your personal dashboard. Here you'll see your profile and quick access to everything that matters for your health journey.",
        placement: "bottom",
      },
      {
        target: "[data-tour='dashboard-recommendations']",
        title: "Personalized recommendations",
        content:
          "Your personalized recommendations appear here—trials, publications, and experts tailored to your conditions and interests. You can edit your medical conditions and refresh the dashboard to get new results.",
        placement: "bottom",
      },
      {
        target: "[data-tour='dashboard-conditions-bar']",
        title: "Edit conditions & refresh",
        content:
          "Edit your medical conditions here to personalize your feed. Use Refresh to fetch new recommendations based on your updated profile.",
        placement: "bottom",
      },
      {
        target: "[data-tour='dashboard-publication-view-details']",
        title: "View details for a card",
        content:
          "In the publications section, use 'View full details' or 'Understand this Paper' on any card to read more. This opens the full abstract and key takeaways.",
        placement: "top",
      },
      {
        target: "[data-tour='nav-explore']",
        title: "Explore tab in the navbar",
        content:
          "Use the Explore menu in the navbar to search new treatments, health library, and health experts from one place. It's your gateway to discovering new research.",
        placement: "bottom",
      },
      {
        target: "[data-tour='nav-forums']",
        title: "Forums and Discovery",
        content:
          "Forums lets you join community discussions. Discovery is the next link to the right in the navbarm it shows a feed of activity and content across the platform.",
        placement: "bottom",
      },
      {
        target: "[data-tour='dashboard-tabs']",
        title: "Dashboard tabs",
        content:
          "Switch between Health Library, New Treatments, Health Experts, Forums, and Favourites to see recommendations in each category. Your saved items are in Favourites.",
        placement: "bottom",
      },
      {
        target: "[data-tour='dashboard-tab-favorites']",
        title: "Favourites tab",
        content:
          "Open Favourites to see your saved new treatments, health library items, and health experts. You can generate a summary report from your selection.",
        placement: "bottom",
      },
      {
        target: "[data-tour='dashboard-favorites-generate-summary']",
        title: "Generating a summary",
        content:
          "Select items from your favourites, then click Generate summary to create a personalized report. You can export it as PDF to share with your care team.",
        placement: "top",
      },
      {
        target: "[data-tour='yori-chatbot']",
        title: "Meet Yori!",
        content:
          "That's me! Click anytime to ask questions about trials, publications, or your dashboard. I'm here to help you navigate your health research journey.",
        placement: "left",
      },
    ],
    [],
  );

  async function generateFavoritesSummaryReport() {
    const totalSelected =
      (selectedFavoriteItems.experts?.length || 0) +
      (selectedFavoriteItems.publications?.length || 0) +
      (selectedFavoriteItems.trials?.length || 0);

    if (totalSelected === 0) {
      toast.error("Please select at least one item to generate a report");
      return;
    }

    setFavoritesReportModal({ open: true, loading: true, report: null });

    try {
      let patientName = "Not specified";
      if (userProfile?.patient?.name) {
        patientName = userProfile.patient.name;
      } else if (user?.username) {
        patientName = user.username;
      } else if (user?.name) {
        patientName = user.name;
      } else if (user?.firstName && user?.lastName) {
        patientName = `${user.firstName} ${user.lastName}`.trim();
      }

      const patientContext = {
        name: patientName,
        condition:
          userProfile?.patient?.conditions?.[0] ||
          user?.medicalInterests?.[0] ||
          "Not specified",
        location: userProfile?.patient?.location
          ? `${userProfile.patient.location.city || ""}${
              userProfile.patient.location.city &&
              userProfile.patient.location.country
                ? ", "
                : ""
            }${userProfile.patient.location.country || ""}`.trim()
          : "Not specified",
        keyConcerns: userProfile?.patient?.concerns || [],
        interests: user?.medicalInterests || [],
      };

      const itemsToSend = {
        experts: (selectedFavoriteItems.experts || []).map((fav) => fav.item),
        publications: (selectedFavoriteItems.publications || []).map(
          (fav) => fav.item,
        ),
        trials: (selectedFavoriteItems.trials || []).map((fav) => fav.item),
      };

      const response = await fetch(`${base}/api/ai/generate-summary-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedItems: itemsToSend,
          patientContext,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const data = await response.json();
      setFavoritesReportModal({
        open: true,
        loading: false,
        report: data.report,
      });
    } catch (error) {
      console.error("Error generating favorites summary report:", error);
      toast.error("Failed to generate summary report. Please try again.");
      setFavoritesReportModal({ open: false, loading: false, report: null });
    }
  }

  async function exportFavoritesSummaryToPDF() {
    if (!favoritesReportModal.report) {
      toast.error("No report to export");
      return;
    }

    try {
      toast.loading("Generating PDF...", { id: "favorites-pdf-generation" });

      const patientName =
        favoritesReportModal.report?.patientContext?.name || "Patient";
      const fileName = `Collabiora-Summary-Report-${patientName.replace(
        /\s+/g,
        "-",
      )}-${new Date().toISOString().split("T")[0]}.pdf`;

      const pdfInstance = pdf(
        <PDFReportDocument
          report={favoritesReportModal.report}
          patientFacingLabels
        />,
      );
      const blob = await pdfInstance.toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("PDF generated successfully!", {
        id: "favorites-pdf-generation",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(`Failed to generate PDF: ${error.message}`, {
        id: "favorites-pdf-generation",
      });
    }
  }

  function toggleFavoriteSelection(favorite) {
    const type =
      favorite.type === "collaborator"
        ? "expert"
        : favorite.type === "expert"
          ? "expert"
          : favorite.type;
    if (type !== "expert" && type !== "publication" && type !== "trial") {
      return;
    }

    setSelectedFavoriteItems((prev) => {
      const key = type + "s";
      const items = prev[key] || [];
      const isSelected = items.some(
        (item) =>
          item._id === favorite._id || item.item?.id === favorite.item?.id,
      );

      if (isSelected) {
        return {
          ...prev,
          [key]: items.filter(
            (item) =>
              item._id !== favorite._id && item.item?.id !== favorite.item?.id,
          ),
        };
      }
      return {
        ...prev,
        [key]: [...items, favorite],
      };
    });
  }

  function isFavoriteSelected(favorite) {
    const type =
      favorite.type === "collaborator"
        ? "expert"
        : favorite.type === "expert"
          ? "expert"
          : favorite.type;
    if (type !== "expert" && type !== "publication" && type !== "trial") {
      return false;
    }
    const items = selectedFavoriteItems[type + "s"] || [];
    return items.some(
      (item) =>
        item._id === favorite._id || item.item?.id === favorite.item?.id,
    );
  }

  function clearFavoriteSelections() {
    setSelectedFavoriteItems({
      experts: [],
      publications: [],
      trials: [],
    });
  }

  const statusOptions = [
    "RECRUITING",
    "NOT_YET_RECRUITING",
    "ACTIVE_NOT_RECRUITING",
    "COMPLETED",
    "SUSPENDED",
    "TERMINATED",
    "WITHDRAWN",
  ];

  const sortOptions = [
    { value: "relevance", label: "Relevance" },
    { value: "year_desc", label: "Year (Newest First)" },
    { value: "year_asc", label: "Year (Oldest First)" },
    { value: "title_asc", label: "Title (A-Z)" },
    { value: "title_desc", label: "Title (Z-A)" },
  ];

  function selectCommunitiesForConditions(communities, conditions) {
    const list = Array.isArray(communities) ? communities : [];
    if (list.length === 0) return [];

    const normalizedConditions = (Array.isArray(conditions) ? conditions : [])
      .map((c) =>
        String(c || "")
          .toLowerCase()
          .trim(),
      )
      .filter(Boolean);

    return list
      .map((community) => {
        const name = String(community.name || "").toLowerCase();
        const description = String(community.description || "").toLowerCase();
        let score = 0;

        normalizedConditions.forEach((cond) => {
          if (!cond) return;
          if (name.includes(cond)) score += 3;
          if (description.includes(cond)) score += 2;
        });

        return { ...community, _matchScore: score };
      })
      .sort((a, b) => {
        const scoreDiff = (b._matchScore || 0) - (a._matchScore || 0);
        if (scoreDiff !== 0) return scoreDiff;
        const membersA = a.memberCount ?? 0;
        const membersB = b.memberCount ?? 0;
        return membersB - membersA;
      });
  }

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");

    // Redirect to sign in if user is not logged in
    if (!userData?._id && !userData?.id) {
      toast.error("Please sign in first");
      navigate("/signin");
      return;
    }

    // Allow unverified users to use dashboard; they can verify from profile / banner
    setUser(userData);
    setImageError(false); // Reset image error when user changes
    setLoading(true);

    // Listen for login events to refresh user data (same tab)
    const handleLoginEvent = () => {
      const updatedUser = JSON.parse(localStorage.getItem("user") || "{}");
      setUser(updatedUser);
    };
    window.addEventListener("login", handleLoginEvent);

    // Listen for cross-tab messages (email verification, user updates)
    const cleanupCrossTab = listenForMessages((type, data) => {
      if (type === "email-verified" || type === "user-updated") {
        const updatedUser =
          data.user || JSON.parse(localStorage.getItem("user") || "{}");
        setUser(updatedUser);
        // Also trigger login event for other listeners
        window.dispatchEvent(new Event("login"));
        if (type === "email-verified") {
          toast.success(
            "Email verified successfully! (Updated from another tab)",
          );
        }
      }
    });

    // Function to check email verification status from backend
    const checkEmailVerificationStatus = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch(`${base}/api/auth/check-email-status`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

          // If email verification status changed, update user state
          if (
            currentUser.emailVerified !== data.emailVerified &&
            data.emailVerified
          ) {
            currentUser.emailVerified = true;
            localStorage.setItem("user", JSON.stringify(currentUser));
            setUser(currentUser);
            window.dispatchEvent(new Event("login"));
            toast.success(
              "Email verified successfully! (Updated from another device)",
            );

            // Stop polling once verified
            if (emailCheckInterval) {
              clearInterval(emailCheckInterval);
              emailCheckInterval = null;
            }
          }
        }
      } catch (error) {
        // Silently fail - don't show errors for background checks
        console.error("Error checking email verification status:", error);
      }
    };

    // Check email verification status periodically if not verified
    let emailCheckInterval = null;
    if (userData && !userData.emailVerified) {
      // Check immediately
      checkEmailVerificationStatus();

      // Then check every 30 seconds
      emailCheckInterval = setInterval(() => {
        checkEmailVerificationStatus();
      }, 30000); // 30 seconds
    }

    // Check email verification status when page regains focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        if (currentUser && !currentUser.emailVerified) {
          checkEmailVerificationStatus();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (userData?._id || userData?.id) {
      // Check if this is the first load in this session
      const firstLoadKey = `dashboard_patient_first_load_${
        userData._id || userData.id
      }`;
      const hasLoadedBefore = sessionStorage.getItem(firstLoadKey) === "true";

      // Set isFirstLoad based on whether user has loaded dashboard before in this session
      setIsFirstLoad(!hasLoadedBefore);

      // Fetch data in parallel for faster load; limit global experts to 6
      const GLOBAL_EXPERTS_LIMIT = 6;
      const fetchData = async () => {
        const startTime = Date.now();
        const userId = userData._id || userData.id;
        let isCacheHit = false;

        try {
          // Use same trials pipeline as Trials.jsx: fetch trials via /api/search/trials (userId + profile-derived q/location)
          const trialsParams = new URLSearchParams();
          trialsParams.set("userId", userId);
          trialsParams.set("status", "RECRUITING");
          trialsParams.set("recentMonths", "3");
          trialsParams.set("page", "1");
          trialsParams.set("pageSize", "9");

          const [
            recsResponse,
            favResponse,
            forumsResponse,
            profileResponse,
            trialsResponse,
          ] = await Promise.all([
            fetch(`${base}/api/recommendations/${userId}`),
            fetch(`${base}/api/favorites/${userId}`),
            fetch(`${base}/api/forums/categories`),
            fetch(`${base}/api/profile/${userId}`),
            fetch(`${base}/api/search/trials?${trialsParams.toString()}`),
          ]);

          const responseTime = Date.now() - startTime;
          isCacheHit = responseTime < 300;

          // Process recommendations (main content)
          if (!recsResponse.ok) {
            const errorText = await recsResponse
              .text()
              .catch(() => "Unknown error");
            console.error(
              "Error fetching recommendations:",
              recsResponse.status,
              errorText,
            );
            toast.error("Failed to load recommendations");
            setData({ trials: [], publications: [], experts: [] });
            setGlobalExperts([]);
          } else {
            const fetchedData = await recsResponse.json();
            // Prefer trials from same pipeline as Trials.jsx (/api/search/trials); fallback to recommendations trials
            let trialsList = fetchedData.trials || [];
            if (trialsResponse?.ok) {
              try {
                const trialsData = await trialsResponse.json();
                if (trialsData.results && Array.isArray(trialsData.results)) {
                  trialsList = trialsData.results;
                }
              } catch (e) {
                console.warn(
                  "Dashboard: could not use search/trials response, using recommendations trials",
                  e,
                );
              }
            }
            const sortedData = {
              trials: (trialsList || []).sort((a, b) => {
                const matchA = a.matchPercentage ?? 0;
                const matchB = b.matchPercentage ?? 0;
                return matchB - matchA;
              }),
              publications: (fetchedData.publications || []).sort((a, b) => {
                const matchA = a.matchPercentage ?? 0;
                const matchB = b.matchPercentage ?? 0;
                return matchB - matchA;
              }),
              experts: (fetchedData.experts || []).sort((a, b) => {
                const matchA = a.matchPercentage ?? 0;
                const matchB = b.matchPercentage ?? 0;
                return matchB - matchA;
              }),
            };
            setData(sortedData);

            // Global experts are already computed on the backend using the
            // deterministic experts pipeline + profile-based matching.
            // Just sort and store the top N from the recommendations response.
            const sortedGlobalExperts = (fetchedData.globalExperts || [])
              .sort((a, b) => {
                const matchA = a.matchPercentage ?? 0;
                const matchB = b.matchPercentage ?? 0;
                return matchB - matchA;
              })
              .slice(0, GLOBAL_EXPERTS_LIMIT);
            setGlobalExperts(sortedGlobalExperts);

            // Deferred: batch simplify (non-blocking)
            if (sortedData.publications?.length > 0) {
              const publicationTitles = sortedData.publications
                .map((pub) => pub.title)
                .filter((title) => title && title.length > 60);
              if (publicationTitles.length > 0) {
                fetch(`${base}/api/ai/batch-simplify-titles`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ titles: publicationTitles }),
                })
                  .then((res) => res.json())
                  .then((data) => {
                    const simplifiedTitles = data.simplifiedTitles || [];
                    setSimplifiedTitles((prev) => {
                      const newMap = new Map(prev);
                      publicationTitles.forEach((title, index) => {
                        if (simplifiedTitles[index])
                          newMap.set(title, simplifiedTitles[index]);
                      });
                      return newMap;
                    });
                  })
                  .catch((e) =>
                    console.error("Error batch simplifying titles:", e),
                  );
              }
            }
            if (sortedData.trials?.length > 0) {
              const trialsToSimplify = sortedData.trials.filter(
                (trial) => trial.title && trial.title.length > 60,
              );
              if (trialsToSimplify.length > 0) {
                fetch(`${base}/api/ai/batch-simplify-trial-summaries`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ trials: trialsToSimplify }),
                })
                  .then((res) => res.json())
                  .then((data) => {
                    const simplifiedSummaries = data.simplifiedSummaries || [];
                    setSimplifiedTrialSummaries((prev) => {
                      const newMap = new Map(prev);
                      trialsToSimplify.forEach((trial, index) => {
                        if (simplifiedSummaries[index])
                          newMap.set(trial.title, simplifiedSummaries[index]);
                      });
                      return newMap;
                    });
                  })
                  .catch((e) =>
                    console.error(
                      "Error batch simplifying trial summaries:",
                      e,
                    ),
                  );
              }
            }
          }

          // Process favorites (batch simplify deferred, non-blocking)
          try {
            if (favResponse.ok) {
              const favData = await favResponse.json();
              const favItems = favData.items || [];
              setFavorites(favItems);

              const favoritePublicationTitles = favItems
                .filter(
                  (fav) =>
                    fav.type === "publication" &&
                    fav.item?.title &&
                    fav.item.title.length > 60,
                )
                .map((fav) => fav.item.title);
              if (favoritePublicationTitles.length > 0) {
                fetch(`${base}/api/ai/batch-simplify-titles`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    titles: favoritePublicationTitles,
                  }),
                })
                  .then((res) => res.json())
                  .then((data) => {
                    const simplifiedTitles = data.simplifiedTitles || [];
                    setSimplifiedTitles((prev) => {
                      const newMap = new Map(prev);
                      favoritePublicationTitles.forEach((title, index) => {
                        if (simplifiedTitles[index])
                          newMap.set(title, simplifiedTitles[index]);
                      });
                      return newMap;
                    });
                  })
                  .catch((e) =>
                    console.error(
                      "Error batch simplifying favorite titles:",
                      e,
                    ),
                  );
              }

              const favoriteTrials = favItems.filter(
                (fav) =>
                  fav.type === "trial" &&
                  fav.item?.title &&
                  fav.item.title.length > 60,
              );
              if (favoriteTrials.length > 0) {
                const favoriteTrialObjects = favoriteTrials.map(
                  (fav) => fav.item,
                );
                fetch(`${base}/api/ai/batch-simplify-trial-summaries`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ trials: favoriteTrialObjects }),
                })
                  .then((res) => res.json())
                  .then((data) => {
                    const simplifiedSummaries = data.simplifiedSummaries || [];
                    setSimplifiedTrialSummaries((prev) => {
                      const newMap = new Map(prev);
                      favoriteTrials.forEach((fav, index) => {
                        if (simplifiedSummaries[index])
                          newMap.set(
                            fav.item.title,
                            simplifiedSummaries[index],
                          );
                      });
                      return newMap;
                    });
                  })
                  .catch((e) =>
                    console.error(
                      "Error batch simplifying favorite trial summaries:",
                      e,
                    ),
                  );
              }
            }
          } catch (error) {
            console.error("Error fetching favorites:", error);
          }

          // Process forums
          try {
            if (forumsResponse.ok) {
              const forumsData = await forumsResponse.json();
              setForumsCategories(forumsData.categories || []);
            }
          } catch (error) {
            console.error("Error fetching forums categories:", error);
          }

          // Process profile
          try {
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              const profile = profileData.profile || null;
              setUserProfile(profile);
              if (profile) {
                const conditions =
                  profile.patient?.conditions ||
                  profile.researcher?.interests ||
                  [];
                const location =
                  profile.patient?.location || profile.researcher?.location;
                updateProfileSignature(conditions, location);
                markDataFetched(generateProfileSignature(conditions, location));

                // Profile completeness check is handled by ProfileGuard in App.jsx
              }
            }
          } catch (error) {
            console.error("Error fetching profile:", error);
          }
        } catch (error) {
          console.error("Error fetching dashboard data:", error);
          toast.error("Failed to load dashboard data");
          setData({ trials: [], publications: [], experts: [] });
          setGlobalExperts([]);
        }

        const totalElapsedTime = Date.now() - startTime;

        // Mark that user has loaded dashboard before in this session
        if (!hasLoadedBefore) {
          sessionStorage.setItem(firstLoadKey, "true");
        }

        // Only apply minimum loading time for cache misses (first load)
        // Cache hits should load instantly without skeleton loaders
        if (isCacheHit) {
          // Cache hit - load immediately, no skeleton needed
          setLoading(false);
        } else {
          // Cache miss - apply minimum loading time for smooth UX
          // For first load, use longer delay for multi-step loader
          // For subsequent loads, use shorter delay for simple spinner
          const minLoadingTime = !hasLoadedBefore ? 1500 : 800; // 1.5s for first load, 0.8s for subsequent
          const maxLoadingTime = !hasLoadedBefore ? 2000 : 1200; // 2s for first load, 1.2s for subsequent
          const randomDelay =
            Math.random() * (maxLoadingTime - minLoadingTime) + minLoadingTime;

          if (totalElapsedTime < randomDelay) {
            const remainingTime = randomDelay - totalElapsedTime;
            setTimeout(() => {
              setLoading(false);
            }, remainingTime);
          } else {
            setLoading(false);
          }
        }
      };

      fetchData();
    } else {
      // No user, don't show multi-step loader
      setIsFirstLoad(false);
      // Still show loading for smooth transition
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    }

    // Cleanup event listeners
    return () => {
      window.removeEventListener("login", handleLoginEvent);
      cleanupCrossTab();
      if (emailCheckInterval) {
        clearInterval(emailCheckInterval);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  async function generateSummary(item, type) {
    let text = "";
    let title = "";
    if (type === "trial") {
      title =
        simplifiedTrialSummaries.get(item.title) ||
        item.simplifiedTitle ||
        item.title ||
        "Clinical Trial";
      text = [
        item.title || "",
        item.status || "",
        item.phase || "",
        item.description || "",
        item.conditionDescription || "",
        Array.isArray(item.conditions)
          ? item.conditions.join(", ")
          : item.conditions || "",
        item.eligibility?.criteria || "",
      ]
        .filter(Boolean)
        .join(" ");
    } else {
      title =
        simplifiedTitles.get(item.title) ||
        item.simplifiedTitle ||
        item.title ||
        "Publication";
      text = [
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
    }

    if (type === "publication") {
      setSummaryPublication(item);
      setSummaryTrial(null);
      setHasSimplifiedFurther(false);
    } else {
      setSummaryPublication(null);
      setSummaryTrial(item);
      setHasSimplifiedFurther(false);
    }

    setSummaryModal({
      open: true,
      title,
      type,
      summary: "",
      loading: true,
    });

    try {
      const res = await fetch(`${base}/api/ai/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          type,
          simplify: true, // Always simplify for patient view (same as Publications for patients)
          // For publications: pass pmid so backend fetches full publication and returns same first-level key insights as Publications.jsx
          ...(type === "publication" && {
            pmid: item.pmid || item.id,
          }),
          // Pass full trial object for structured summary
          ...(type === "trial" && { trial: item }),
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
      console.error("Summary generation error:", e);
      setSummaryModal((prev) => ({
        ...prev,
        summary: "Failed to generate summary. Please try again.",
        loading: false,
      }));
    }
  }

  async function simplifySummaryFurther() {
    if (!summaryPublication) return;

    setHasSimplifiedFurther(true);
    setSummaryModal((prev) => ({ ...prev, loading: true }));

    try {
      const res = await fetch(`${base}/api/ai/simplify-publication`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pmid:
            summaryPublication.pmid ||
            summaryPublication.id ||
            summaryPublication._id,
          publication: {
            title: summaryPublication.title,
            journal: summaryPublication.journal,
            abstract: summaryPublication.abstract,
            fullAbstract: summaryPublication.fullAbstract,
            keywords: summaryPublication.keywords,
            authors: summaryPublication.authors,
            year: summaryPublication.year,
          },
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
      console.error("Further simplification error:", e);
      setSummaryModal((prev) => ({
        ...prev,
        summary: "Failed to simplify further. Please try again.",
        loading: false,
      }));
    }
  }

  async function simplifyTrialFurther() {
    if (!summaryTrial) return;

    setSummaryModal((prev) => ({ ...prev, loading: true }));

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
              res.error || "Failed to simplify further. Please try again.",
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
              summary: res.summary?.summary || "Summary unavailable",
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
          summary: "Failed to simplify further. Please try again.",
        },
        loading: false,
      }));
    }
  }

  function closeModal() {
    setSummaryModal({
      open: false,
      title: "",
      type: "",
      summary: "",
      loading: false,
    });
    setSummaryPublication(null);
    setSummaryTrial(null);
    setHasSimplifiedFurther(false);
  }

  async function openTrialDetailsModal(trial) {
    setTrialDetailsModal({
      open: true,
      trial: trial, // Show basic info immediately
      loading: true,
      generatedMessage: "",
      generating: false,
      copied: false,
    });

    // Fetch detailed trial information with simplified details from backend
    if (trial.id || trial._id) {
      try {
        const nctId = trial.id || trial._id;
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

        // Fetch simplified trial details
        const response = await fetch(
          `${base}/api/search/trial/${nctId}/simplified`,
        );

        if (response.ok) {
          const data = await response.json();
          if (data.trial) {
            // Merge detailed info with existing trial data
            setTrialDetailsModal({
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

        // Fallback: try regular endpoint if simplified fails
        const fallbackResponse = await fetch(
          `${base}/api/search/trial/${nctId}`,
        );
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.trial) {
            setTrialDetailsModal({
              open: true,
              trial: { ...trial, ...fallbackData.trial },
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
    setTrialDetailsModal({
      open: true,
      trial: trial,
      loading: false,
      generatedMessage: "",
      generating: false,
      copied: false,
    });
  }

  function closeTrialDetailsModal() {
    setTrialDetailsModal({
      open: false,
      trial: null,
      loading: false,
      generatedMessage: "",
      generating: false,
      copied: false,
    });
  }

  async function generateTrialDetailsMessage() {
    if (!trialDetailsModal.trial) return;

    setTrialDetailsModal((prev) => ({ ...prev, generating: true }));

    try {
      const userName = user?.username || "Patient";
      const userLocation =
        userProfile?.patient?.location ||
        userProfile?.researcher?.location ||
        null;

      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const response = await fetch(`${base}/api/ai/generate-trial-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName,
          userLocation,
          trial: trialDetailsModal.trial,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate message");
      }

      const data = await response.json();
      setTrialDetailsModal((prev) => ({
        ...prev,
        generatedMessage: data.message || "",
        generating: false,
      }));
      toast.success("Message generated successfully!");
    } catch (error) {
      console.error("Error generating message:", error);
      toast.error("Failed to generate message. Please try again.");
      setTrialDetailsModal((prev) => ({ ...prev, generating: false }));
    }
  }

  function copyTrialDetailsMessage() {
    if (trialDetailsModal.generatedMessage) {
      navigator.clipboard.writeText(trialDetailsModal.generatedMessage);
      setTrialDetailsModal((prev) => ({ ...prev, copied: true }));
      toast.success("Message copied to clipboard!");
      setTimeout(() => {
        setTrialDetailsModal((prev) => ({ ...prev, copied: false }));
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
        const response = await fetch(`${base}/api/search/trial/${nctId}`);

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
      toast.error("Please sign in to generate an email");
      return;
    }

    setContactStepsModal((prev) => ({ ...prev, generating: true }));

    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const userName = userData?.username || userData?.name || "User";
      const userLocationData =
        userProfile?.patient?.location ||
        userProfile?.researcher?.location ||
        null;

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
      toast.error("Failed to generate email. Please try again.");
      setContactStepsModal((prev) => ({ ...prev, generating: false }));
    }
  }

  function copyGeneratedEmail() {
    if (contactStepsModal.generatedEmail) {
      navigator.clipboard.writeText(contactStepsModal.generatedEmail);
      setContactStepsModal((prev) => ({ ...prev, copied: true }));
      toast.success("Email copied to clipboard!");
      setTimeout(() => {
        setContactStepsModal((prev) => ({ ...prev, copied: false }));
      }, 2000);
    }
  }

  function openEmailClient() {
    if (!contactStepsModal.trial) return;
    const contact = contactStepsModal.trial.contacts?.[0];
    if (!contact?.email) {
      toast.error("No email address available");
      return;
    }

    const subject = encodeURIComponent(
      `Interest in Clinical Trial: ${contactStepsModal.trial.title}`,
    );
    const body = encodeURIComponent(contactStepsModal.generatedEmail || "");
    window.open(
      `mailto:${contact.email}?subject=${subject}&body=${body}`,
      "_blank",
    );
  }

  async function generateContactMessage() {
    if (!contactInfoModal.trial) return;

    setContactInfoModal((prev) => ({ ...prev, generating: true }));

    try {
      const userName = user?.username || "Patient";
      const userLocation =
        userProfile?.patient?.location ||
        userProfile?.researcher?.location ||
        null;

      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const response = await fetch(`${base}/api/ai/generate-trial-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName,
          userLocation,
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
      toast.success("Message generated successfully!");
    } catch (error) {
      console.error("Error generating message:", error);
      toast.error("Failed to generate message. Please try again.");
      setContactInfoModal((prev) => ({ ...prev, generating: false }));
    }
  }

  function copyGeneratedMessage() {
    if (contactInfoModal.generatedMessage) {
      navigator.clipboard.writeText(contactInfoModal.generatedMessage);
      setContactInfoModal((prev) => ({ ...prev, copied: true }));
      toast.success("Message copied to clipboard!");
      setTimeout(() => {
        setContactInfoModal((prev) => ({ ...prev, copied: false }));
      }, 2000);
    }
  }

  async function generateMessage() {
    if (!contactModal.trial) return;

    setContactModal((prev) => ({ ...prev, generating: true }));

    try {
      const userName = user?.username || "Patient";
      const userLocation =
        userProfile?.patient?.location ||
        userProfile?.researcher?.location ||
        null;

      const response = await fetch(`${base}/api/ai/generate-trial-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName,
          userLocation,
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
      toast.success("Message generated successfully!");
    } catch (error) {
      console.error("Error generating message:", error);
      toast.error("Failed to generate message. Please try again.");
      setContactModal((prev) => ({ ...prev, generating: false }));
    }
  }

  function handleSendMessage() {
    if (!contactModal.message.trim()) return;
    toast.success("Message sent successfully!");
    setContactModal((prev) => ({ ...prev, sent: true }));
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

  async function openPublicationDetailsModal(pub) {
    setPublicationDetailsModal({
      open: true,
      publication: pub,
      loading: true,
    });

    if (pub.pmid || pub.id || pub._id) {
      try {
        // Prefer PMID for URL so backend uses fast PubMed path; pass source to avoid wrong-provider fetch (lag)
        const id = String(pub.pmid || pub.id || pub._id);
        const source = pub.source || "pubmed";
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const sourceParam = `source=${encodeURIComponent(source)}`;

        const response = await fetch(
          `${base}/api/search/publication/${id}/simplified?${sourceParam}`,
        );

        if (response.ok) {
          const data = await response.json();
          if (data.publication) {
            setPublicationDetailsModal({
              open: true,
              publication: { ...pub, ...data.publication },
              loading: false,
            });
            return;
          }
        }

        const fallbackResponse = await fetch(
          `${base}/api/search/publication/${id}?${sourceParam}`,
        );
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.publication) {
            setPublicationDetailsModal({
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

    setPublicationDetailsModal({
      open: true,
      publication: pub,
      loading: false,
    });
  }

  function closePublicationDetailsModal() {
    setPublicationDetailsModal({
      open: false,
      publication: null,
      loading: false,
    });
  }

  async function openGlobalExpertDetailsModal(expert) {
    const isOnPlatform = !!(expert?._id || expert?.userId);
    setGlobalExpertDetailsModal({
      open: true,
      expert,
      onPlatformProfile: null,
      loadingOnPlatformProfile: isOnPlatform,
    });
    if (expert && !isOnPlatform) fetchGlobalExpertPublications(expert);
    if (expert && isOnPlatform) {
      try {
        const userId = expert._id || expert.userId;
        const res = await fetch(`${base}/api/profile/${userId}`);
        const data = await res.json();
        setGlobalExpertDetailsModal((prev) => ({
          ...prev,
          onPlatformProfile: data.profile ?? null,
          loadingOnPlatformProfile: false,
        }));
      } catch (err) {
        console.error("Failed to fetch on-platform expert profile:", err);
        toast.error("Could not load expert profile");
        setGlobalExpertDetailsModal((prev) => ({
          ...prev,
          loadingOnPlatformProfile: false,
        }));
      }
    }
  }

  function closeGlobalExpertDetailsModal() {
    setGlobalExpertDetailsModal({
      open: false,
      expert: null,
      onPlatformProfile: null,
      loadingOnPlatformProfile: false,
    });
  }

  async function fetchGlobalExpertPublications(expert) {
    const expertId = expert.name || expert.id || expert._id;
    if (!expertId) return;

    // Check if already loaded
    if (globalExpertPublications[expertId]) {
      return;
    }

    setLoadingGlobalExpertPublications((prev) => ({
      ...prev,
      [expertId]: true,
    }));

    try {
      const response = await fetch(
        `${base}/api/search/expert/publications?author=${encodeURIComponent(
          expert.name,
        )}`,
      );
      const data = await response.json();

      setGlobalExpertPublications((prev) => ({
        ...prev,
        [expertId]: data.publications || [],
      }));

      if (data.publications && data.publications.length === 0) {
        toast.error("No publications found for this researcher");
      }
    } catch (error) {
      console.error("Error fetching publications:", error);
      toast.error("Failed to fetch publications");
      setGlobalExpertPublications((prev) => ({
        ...prev,
        [expertId]: [],
      }));
    } finally {
      setLoadingGlobalExpertPublications((prev) => ({
        ...prev,
        [expertId]: false,
      }));
    }
  }

  function toggleGlobalExpertCard(expert) {
    const expertId = expert.name || expert.id || expert._id;
    if (!expertId) return;
    setExpandedGlobalCards((prev) => ({
      ...prev,
      [expertId]: !prev[expertId],
    }));
    if (!expandedGlobalCards[expertId]) {
      fetchGlobalExpertPublications(expert);
    }
  }

  // Helper function to get unique key for favorite tracking
  const getFavoriteKey = (type, itemId, item) => {
    if (type === "expert") {
      return `${type}-${
        item.name || item.orcid || item.id || item._id || itemId
      }`;
    } else if (type === "publication") {
      return `${type}-${item.pmid || item.id || item._id || itemId}`;
    } else if (type === "thread" || type === "forum") {
      return `${type}-${item.id || item._id || itemId}`;
    } else {
      return `${type}-${item.id || item._id || itemId}`;
    }
  };

  async function toggleFavorite(type, itemId, item) {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to favourite items");
      return;
    }

    const favoriteKey = getFavoriteKey(type, itemId, item);

    // Prevent duplicate clicks
    if (favoritingItems.has(favoriteKey)) {
      return;
    }

    // For experts, use name as the primary identifier (consistent with Experts.jsx)
    let checkId = itemId;
    if (type === "expert") {
      checkId =
        item.name || item.orcid || item.id || item._id || item.userId || itemId;
    } else if (type === "publication") {
      checkId = item.pmid || item.id || item._id || itemId;
    } else if (type === "trial") {
      checkId = item.id || item._id || itemId;
    } else if (type === "thread" || type === "forum") {
      checkId = item._id || item.id || itemId;
    }

    // Check if favorited - for experts, prioritize name matching
    const isFavorited = favorites.some((fav) => {
      // For thread/forum types, allow matching between both types
      if (
        (type === "thread" || type === "forum") &&
        (fav.type === "thread" || fav.type === "forum")
      ) {
        return (
          fav.item?.id === checkId ||
          fav.item?._id === checkId ||
          fav.item?.threadId === checkId
        );
      }
      if (fav.type !== type) return false;

      // For experts, check by exact name match first (primary identifier)
      if (type === "expert") {
        if (item.name && fav.item?.name) {
          return fav.item.name === item.name;
        }
        // Fallback: check by id
        if (
          fav.item?.id === checkId ||
          fav.item?._id === checkId ||
          fav.item?.orcid === checkId
        ) {
          return true;
        }
        return false;
      }

      // For publications, check by title or id
      if (type === "publication") {
        return (
          fav.item?.id === checkId ||
          fav.item?._id === checkId ||
          fav.item?.pmid === checkId ||
          (item.title && fav.item?.title === item.title)
        );
      }

      // For trials, check by title or id
      if (type === "trial") {
        return (
          fav.item?.id === checkId ||
          fav.item?._id === checkId ||
          (item.title && fav.item?.title === item.title)
        );
      }

      // For threads/forums, check by id
      if (type === "thread" || type === "forum") {
        return (
          fav.item?.id === checkId ||
          fav.item?._id === checkId ||
          fav.item?.threadId === checkId
        );
      }

      return false;
    });

    // Optimistic UI update - update immediately
    const previousFavorites = [...favorites];
    let optimisticFavorites;

    if (isFavorited) {
      // Optimistically remove from favorites
      optimisticFavorites = favorites.filter((fav) => {
        // For thread/forum types, allow matching between both types
        if (
          (type === "thread" || type === "forum") &&
          (fav.type === "thread" || fav.type === "forum")
        ) {
          return !(
            fav.item?.id === checkId ||
            fav.item?._id === checkId ||
            fav.item?.threadId === checkId
          );
        }
        if (fav.type !== type) return true;

        if (type === "expert") {
          if (item.name && fav.item?.name) {
            return fav.item.name !== item.name;
          }
          return !(
            fav.item?.id === checkId ||
            fav.item?._id === checkId ||
            fav.item?.orcid === checkId
          );
        } else if (type === "publication") {
          return !(
            fav.item?.id === checkId ||
            fav.item?._id === checkId ||
            fav.item?.pmid === checkId ||
            (item.title && fav.item?.title === item.title)
          );
        } else if (type === "trial") {
          return !(
            fav.item?.id === checkId ||
            fav.item?._id === checkId ||
            (item.title && fav.item?.title === item.title)
          );
        }
        return true;
      });
    } else {
      // Optimistically add to favorites
      const itemToStore = {
        ...item,
        id: checkId,
        _id: item._id || checkId,
      };

      if (type === "expert" && item.name) {
        itemToStore.name = item.name;
      }
      if (type === "expert" && item.orcid) {
        itemToStore.orcid = item.orcid;
      }
      if (type === "publication" && item.pmid) {
        itemToStore.pmid = item.pmid;
      }

      // Use "thread" as the type for forum favorites (consistent with backend)
      const favoriteType =
        type === "forum" || type === "thread" ? "thread" : type;

      optimisticFavorites = [
        ...favorites,
        {
          type: favoriteType,
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
        let deleteId = checkId;
        if (type === "expert") {
          const foundFavorite = previousFavorites.find((fav) => {
            if (fav.type !== "expert") return false;

            // Check by exact name match (primary identifier)
            if (item.name && fav.item?.name) {
              return fav.item.name === item.name;
            }

            // Fallback: check by id
            if (
              fav.item?.id === checkId ||
              fav.item?._id === checkId ||
              fav.item?.orcid === checkId
            ) {
              return true;
            }

            return false;
          });

          // Use the stored name or id from the favorite, or fallback to checkId
          deleteId =
            foundFavorite?.item?.name ||
            foundFavorite?.item?.id ||
            foundFavorite?.item?._id ||
            item.name ||
            item.id ||
            item._id;
        }

        // Use "thread" as the type for forum favorites (consistent with backend)
        const deleteType =
          type === "forum" || type === "thread" ? "thread" : type;

        await fetch(
          `${base}/api/favorites/${
            user._id || user.id
          }?type=${deleteType}&id=${encodeURIComponent(deleteId)}`,
          { method: "DELETE" },
        );
        toast.success("Removed from favourites");
      } else {
        // Store complete item information
        const itemToStore = {
          ...item, // Store all item properties
          id: checkId,
          _id: item._id || checkId,
        };

        // For experts, ensure name is stored as the primary identifier
        if (type === "expert") {
          if (item.name) {
            itemToStore.name = item.name;
          }
          // Also store orcid if available (for reference, but not used for matching)
          if (item.orcid) {
            itemToStore.orcid = item.orcid;
          }
        }

        // For publications, store pmid
        if (type === "publication" && item.pmid) {
          itemToStore.pmid = item.pmid;
        }

        // Use "thread" as the type for forum favorites (consistent with backend)
        const favoriteType =
          type === "forum" || type === "thread" ? "thread" : type;

        await fetch(`${base}/api/favorites/${user._id || user.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: favoriteType,
            item: itemToStore,
          }),
        });
        toast.success("Added to favourites");
      }

      // Refresh favorites from backend - wait a bit to ensure backend has processed
      await new Promise((resolve) => setTimeout(resolve, 100));
      const favResponse = await fetch(
        `${base}/api/favorites/${user._id || user.id}`,
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
      toast.error("Failed to update favourites");
    } finally {
      // Remove from loading set
      setFavoritingItems((prev) => {
        const next = new Set(prev);
        next.delete(favoriteKey);
        return next;
      });
    }
  }

  /** Remove a favorite from the Favourites section (dashboard). */
  async function removeFavoriteFromDashboard(fav) {
    if (!fav || (!user?._id && !user?.id)) return;
    let itemId;
    const type =
      fav.type === "thread" || fav.type === "forum" ? "thread" : fav.type;
    if (fav.type === "publication") {
      itemId = fav.item?.pmid || fav.item?.id || fav.item?._id;
    } else if (fav.type === "trial") {
      itemId = fav.item?.id || fav.item?._id;
    } else if (fav.type === "expert" || fav.type === "collaborator") {
      itemId =
        fav.item?.orcid || fav.item?.id || fav.item?._id || fav.item?.name;
    } else if (fav.type === "thread" || fav.type === "forum") {
      itemId = fav.item?.threadId || fav.item?.id || fav.item?._id;
    } else {
      itemId = fav.item?.id || fav.item?._id || fav.item?.pmid;
    }
    if (!itemId) return;
    const previousFavorites = [...favorites];
    setFavorites((prev) =>
      prev.filter((f) => {
        if (f._id === fav._id) return false;
        const fType = f.type === "forum" ? "thread" : f.type;
        if (fType !== type) return true;
        let fId;
        if (f.type === "publication")
          fId = f.item?.pmid || f.item?.id || f.item?._id;
        else if (f.type === "expert" || f.type === "collaborator")
          fId = f.item?.orcid || f.item?.id || f.item?._id || f.item?.name;
        else if (f.type === "thread" || f.type === "forum")
          fId = f.item?.threadId || f.item?.id || f.item?._id;
        else fId = f.item?.id || f.item?._id;
        return fId !== itemId;
      }),
    );
    try {
      await fetch(
        `${base}/api/favorites/${user._id || user.id}?type=${type}&id=${encodeURIComponent(itemId)}`,
        { method: "DELETE" },
      );
      toast.success("Removed from favourites");
      const res = await fetch(`${base}/api/favorites/${user._id || user.id}`);
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.items || []);
      }
    } catch (err) {
      console.error("Error removing favorite:", err);
      setFavorites(previousFavorites);
      toast.error("Failed to remove from favourites");
    }
  }

  async function checkFollowStatus(expertId) {
    if (!user?._id && !user?.id) return false;
    try {
      const response = await fetch(
        `${base}/api/insights/${user._id || user.id}/following/${expertId}`,
      );
      const data = await response.json();
      return data.isFollowing;
    } catch (error) {
      console.error("Error checking follow status:", error);
      return false;
    }
  }

  async function toggleFollow(expertId, expertRole = "researcher") {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to follow experts");
      return;
    }

    const isFollowing = await checkFollowStatus(expertId);

    try {
      if (isFollowing) {
        await fetch(`${base}/api/follow`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            followerId: user._id || user.id,
            followingId: expertId,
          }),
        });
        toast.success("Unfollowed successfully");
      } else {
        await fetch(`${base}/api/follow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            followerId: user._id || user.id,
            followingId: expertId,
            followerRole: user.role,
            followingRole: expertRole,
          }),
        });
        toast.success("Connected successfully!");
      }

      setFollowingStatus((prev) => ({
        ...prev,
        [expertId]: !isFollowing,
      }));
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast.error("Failed to update follow status");
    }
  }

  async function sendMessage() {
    if (!messageModal.body.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (!user?._id && !user?.id) {
      toast.error("Please sign in to send messages");
      return;
    }

    try {
      const expertId =
        messageModal.expert?._id ||
        messageModal.expert?.userId ||
        messageModal.expert?.id;
      const response = await fetch(`${base}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user._id || user.id,
          receiverId: expertId,
          senderRole: user.role,
          receiverRole: "researcher",
          body: messageModal.body,
        }),
      });

      if (response.ok) {
        toast.success("Message sent successfully!");
        setMessageModal({ open: false, expert: null, body: "" });
      } else {
        toast.error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
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

  // Load follow status when expert modal opens
  useEffect(() => {
    if (expertModal.expert && expertModal.open) {
      const expertId =
        expertModal.expert._id ||
        expertModal.expert.userId ||
        expertModal.expert.id;
      checkFollowStatus(expertId).then((isFollowing) => {
        setFollowingStatus((prev) => ({
          ...prev,
          [expertId]: isFollowing,
        }));
      });
    }
  }, [expertModal]);

  // Fetch filtered trials when filter changes
  async function fetchFilteredTrials() {
    if (!user?._id && !user?.id) return;
    if (selectedCategory !== "trials") return;

    setLoadingFiltered(true);
    try {
      const params = new URLSearchParams();
      const userDisease =
        user?.medicalInterests?.[0] ||
        userProfile?.patient?.conditions?.[0] ||
        "oncology";
      params.set("q", userDisease);
      // Only set status parameter if trialFilter is set (empty string means "all")
      if (trialFilter) {
        params.set("status", trialFilter);
      }
      // Dashboard trials: only from last 3 months (same as recommendations)
      params.set("recentMonths", "3");

      // Add location (country only for trials)
      if (userLocation?.country) {
        params.set("location", userLocation.country);
      }

      // Add userId to calculate match percentages
      params.set("userId", user._id || user.id);

      const response = await fetch(
        `${base}/api/search/trials?${params.toString()}`,
      );
      if (response.ok) {
        const fetchedData = await response.json();
        // Sort by match percentage (descending)
        const sortedTrials = (fetchedData.results || []).sort((a, b) => {
          const matchA = a.matchPercentage ?? 0;
          const matchB = b.matchPercentage ?? 0;
          return matchB - matchA;
        });
        setData((prev) => ({
          ...prev,
          trials: sortedTrials,
        }));
      } else {
        // Handle non-ok responses
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `Server error: ${response.status}` };
        }
        console.error(
          "Error fetching filtered trials:",
          response.status,
          errorData,
        );
        // Only show error toast if it's not a search limit error (handled by the API)
        if (response.status !== 429) {
          toast.error(errorData.error || "Failed to load filtered trials");
        }
      }
    } catch (error) {
      console.error("Error fetching filtered trials:", error);
      // Only show error if it's a network error, not if it's already handled
      if (error.name !== "AbortError") {
        toast.error("Failed to load filtered trials");
      }
    } finally {
      setLoadingFiltered(false);
    }
  }

  function openEditConditionsModal() {
    const conds =
      userProfile?.patient?.conditions || user?.medicalInterests || [];
    setConditionsDraft(conds);
    const indices = userProfile?.patient?.primaryConditionIndices;
    if (
      Array.isArray(indices) &&
      indices.length >= 1 &&
      indices.length <= 2 &&
      conds.length > 0
    ) {
      const valid = indices.filter(
        (i) => Number.isInteger(i) && i >= 0 && i < conds.length,
      );
      setPrimaryIndicesDraft(valid.slice(0, 2));
    } else if (conds.length === 1) {
      setPrimaryIndicesDraft([0]);
    } else if (conds.length >= 2) {
      setPrimaryIndicesDraft([0, 1]);
    } else {
      setPrimaryIndicesDraft([]);
    }
    setNewConditionInput("");
    setEditConditionsModalOpen(true);
  }

  // Sync conditions draft from profile when profile loads/updates (only when modal is closed)
  useEffect(() => {
    if (editConditionsModalOpen) return;
    const conds =
      userProfile?.patient?.conditions || user?.medicalInterests || [];
    setConditionsDraft(conds);
    const indices = userProfile?.patient?.primaryConditionIndices;
    if (
      Array.isArray(indices) &&
      indices.length >= 1 &&
      indices.length <= 2 &&
      conds.length > 0
    ) {
      const valid = indices.filter(
        (i) => Number.isInteger(i) && i >= 0 && i < conds.length,
      );
      setPrimaryIndicesDraft(valid.slice(0, 2));
    } else if (conds.length === 1) {
      setPrimaryIndicesDraft([0]);
    } else if (conds.length >= 2) {
      setPrimaryIndicesDraft([0, 1]);
    } else {
      setPrimaryIndicesDraft([]);
    }
  }, [
    editConditionsModalOpen,
    userProfile?.patient?.conditions,
    userProfile?.patient?.primaryConditionIndices,
    user?.medicalInterests,
  ]);

  function togglePrimaryIndex(index) {
    setPrimaryIndicesDraft((prev) => {
      const has = prev.includes(index);
      if (has) return prev.filter((i) => i !== index);
      if (prev.length >= 2) return [prev[1], index];
      return [...prev, index].sort((a, b) => a - b);
    });
  }

  function removeCondition(index) {
    setConditionsDraft((prev) => prev.filter((_, i) => i !== index));
    setPrimaryIndicesDraft((prev) =>
      prev
        .map((i) => (i > index ? i - 1 : i === index ? -1 : i))
        .filter((i) => i >= 0)
        .slice(0, 2),
    );
  }

  function addCondition(value) {
    const v = value.trim();
    if (!v) return;
    setConditionsDraft((prev) => [...prev, v]);
    setNewConditionInput("");
    setPrimaryIndicesDraft((prev) => {
      if (prev.length >= 2) return prev;
      return [...prev, conditionsDraft.length].sort((a, b) => a - b);
    });
  }

  async function saveConditions() {
    const userId = user?._id || user?.id;
    if (!userId) return;
    setSavingConditions(true);
    try {
      const res = await fetch(
        `${base}/api/profile/${userId}/patient-conditions`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conditions: conditionsDraft,
            primaryConditionIndices:
              conditionsDraft.length === 0
                ? []
                : conditionsDraft.length === 1
                  ? [0]
                  : primaryIndicesDraft.slice(0, 2),
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }
      const { profile: updatedProfile } = await res.json();
      if (updatedProfile) setUserProfile(updatedProfile);
      else
        setUserProfile((p) => ({
          ...p,
          patient: {
            ...p?.patient,
            conditions: conditionsDraft,
            primaryConditionIndices: primaryIndicesDraft,
          },
        }));
      setEditConditionsModalOpen(false);
      toast.success("Conditions updated");
    } catch (e) {
      toast.error(e.message || "Failed to save conditions");
    } finally {
      setSavingConditions(false);
    }
  }

  // Refresh recommendations by section: active section first, then other two in background (per conditions).
  // Always refreshes trials, publications, experts; uses current tab as "active" only if it's one of those.
  async function refreshRecommendationsBySection() {
    const userId = user?._id || user?.id;
    if (!userId) return;
    const sectionTypes = ["trials", "publications", "experts"];
    const active = sectionTypes.includes(selectedCategory)
      ? selectedCategory
      : "publications";

    try {
      await fetch(`${base}/api/recommendations/cache/${userId}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.warn("Could not clear recommendations cache", e);
    }

    setRefreshingSection(active);
    const otherSections = ["trials", "publications", "experts"].filter(
      (s) => s !== active,
    );
    setRefreshingSectionsBg(new Set(otherSections));

    const fetchSection = async (type) => {
      const res = await fetch(
        `${base}/api/recommendations/${userId}/section?type=${type}`,
      );
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    };

    try {
      const activeData = await fetchSection(active);
      if (active === "trials" && activeData.trials) {
        setData((prev) => ({ ...prev, trials: activeData.trials }));
      } else if (active === "publications" && activeData.publications) {
        setData((prev) => ({
          ...prev,
          publications: activeData.publications,
        }));
      } else if (active === "experts") {
        setData((prev) => ({
          ...prev,
          experts: activeData.experts || prev.experts,
        }));
        setGlobalExperts(activeData.globalExperts || []);
      }
    } catch (err) {
      console.error("Error refreshing active section:", err);
      toast.error("Failed to refresh " + active);
    } finally {
      setRefreshingSection(null);
    }

    otherSections.forEach((type) => {
      fetchSection(type)
        .then((sectionData) => {
          if (type === "trials" && sectionData.trials) {
            setData((prev) => ({ ...prev, trials: sectionData.trials }));
          } else if (type === "publications" && sectionData.publications) {
            setData((prev) => ({
              ...prev,
              publications: sectionData.publications,
            }));
          } else if (type === "experts") {
            setData((prev) => ({
              ...prev,
              experts: sectionData.experts || prev.experts,
            }));
            setGlobalExperts(sectionData.globalExperts || []);
          }
        })
        .catch((e) => console.error("Background refresh " + type, e))
        .finally(() => {
          setRefreshingSectionsBg((prev) => {
            const next = new Set(prev);
            next.delete(type);
            return next;
          });
        });
    });
  }

  // Sort publications client-side
  function sortPublications(publications, sortBy) {
    const sorted = [...publications];
    switch (sortBy) {
      case "year_desc":
        return sorted.sort((a, b) => (b.year || 0) - (a.year || 0));
      case "year_asc":
        return sorted.sort((a, b) => (a.year || 0) - (b.year || 0));
      case "title_asc":
        return sorted.sort((a, b) =>
          (a.title || "").localeCompare(b.title || ""),
        );
      case "title_desc":
        return sorted.sort((a, b) =>
          (b.title || "").localeCompare(a.title || ""),
        );
      default:
        // relevance - sort by match percentage (descending), then keep original order
        return sorted.sort((a, b) => {
          const matchA = a.matchPercentage ?? 0;
          const matchB = b.matchPercentage ?? 0;
          return matchB - matchA;
        });
    }
  }

  // Sort items by match percentage (descending)
  function sortByMatchPercentage(items) {
    return [...items].sort((a, b) => {
      const matchA = a.matchPercentage ?? 0;
      const matchB = b.matchPercentage ?? 0;
      return matchB - matchA;
    });
  }

  // Note: fetchGlobalExperts removed - globalExperts are now loaded on initial page load
  // from the recommendations endpoint and cached on the backend

  // Reset filters when switching categories
  useEffect(() => {
    if (selectedCategory !== "trials") {
      setTrialFilter("");
    }
    if (selectedCategory !== "publications") {
      setPublicationSort("relevance");
    }
  }, [selectedCategory]);

  // Fetch forum threads when forums category is selected
  useEffect(() => {
    if (selectedCategory === "forums" && forumsCategories.length > 0) {
      const fetchForumThreads = async () => {
        const threadsMap = {};
        const forumsWithThreads = forumsCategories.filter(
          (category) => (category.threadCount || 0) >= 2,
        );

        // Fetch threads for each category (limit to 3 most recent per category)
        for (const category of forumsWithThreads) {
          try {
            const response = await fetch(
              `${base}/api/forums/threads?categoryId=${category._id}`,
            );
            if (response.ok) {
              const data = await response.json();
              threadsMap[category._id] = (data.threads || []).slice(0, 3); // Get top 3 threads
            }
          } catch (error) {
            console.error(
              `Error fetching threads for category ${category._id}:`,
              error,
            );
          }
        }
        setForumThreads(threadsMap);
      };

      fetchForumThreads();
    }
  }, [selectedCategory, forumsCategories, base]);

  // Load a small set of condition-matched communities for the Forums section
  useEffect(() => {
    if (selectedCategory !== "forums") return;
    const userId = user?._id || user?.id;
    if (!userId) return;

    const conditions =
      userProfile?.patient?.conditions || user?.medicalInterests || [];

    const loadCommunitiesForDashboard = async () => {
      setLoadingRecommendedCommunities(true);
      try {
        const params = new URLSearchParams();
        params.set("userId", userId);
        params.set("type", "patient");
        const response = await fetch(
          `${base}/api/communities?${params.toString()}`,
        );
        if (!response.ok) throw new Error("Failed to fetch communities");
        const data = await response.json();
        const allCommunities = Array.isArray(data.communities)
          ? data.communities
          : [];
        const ranked = selectCommunitiesForConditions(
          allCommunities,
          conditions,
        );
        setRecommendedCommunities(ranked.slice(0, 4));
      } catch (error) {
        console.error("Error loading recommended communities:", error);
        setRecommendedCommunities([]);
      } finally {
        setLoadingRecommendedCommunities(false);
      }
    };

    loadCommunitiesForDashboard();
  }, [
    selectedCategory,
    user?._id,
    user?.id,
    userProfile?.patient?.conditions,
    base,
  ]);

  // Note: Removed lazy loading for globalExperts - they are now loaded on initial page load
  // from the recommendations endpoint, improving load times when switching categories

  // Loading states for multi-step loader (only shown on first load)
  const loadingStates = [
    { text: "Searching clinical trials..." },
    { text: "Gathering research publications..." },
    { text: "Finding relevant experts..." },
    { text: "Preparing your dashboard..." },
  ];

  // Skeleton loader for subsequent loads — matches new layout (profile card, tabs, conditions bar, content)
  function SimpleLoader() {
    return (
      <div className="min-h-screen relative">
        <AnimatedBackground />
        <div className="px-4 sm:px-6 md:px-8 lg:px-12 mx-auto max-w-7xl pt-14 pb-12 relative rounded-t-3xl">
          {/* Profile card skeleton — matches rounded-2xl bg-white/90 backdrop-blur-sm border border-indigo-100/70 */}
          <div className="mt-8 mb-8">
            <div className="rounded-2xl bg-white/90 backdrop-blur-sm border border-indigo-100/70 shadow-[0_10px_40px_rgba(15,23,42,0.06)] w-full mt-8">
              <div className="flex items-center justify-between gap-4 p-5 sm:p-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className="w-12 h-12 rounded-full animate-pulse shrink-0"
                    style={{ backgroundColor: "rgba(47, 60, 150, 0.2)" }}
                  />
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <div
                      className="h-5 w-40 sm:w-64 rounded animate-pulse"
                      style={{ backgroundColor: "rgba(47, 60, 150, 0.15)" }}
                    />
                    <div className="flex gap-2">
                      <div
                        className="h-6 w-24 rounded-full animate-pulse"
                        style={{ backgroundColor: "rgba(47, 60, 150, 0.12)" }}
                      />
                      <div
                        className="h-6 w-28 rounded-full animate-pulse hidden sm:block"
                        style={{ backgroundColor: "rgba(47, 60, 150, 0.12)" }}
                      />
                    </div>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-3 shrink-0">
                  <div
                    className="h-10 w-24 rounded-xl animate-pulse"
                    style={{ backgroundColor: "rgba(47, 60, 150, 0.12)" }}
                  />
                  <div
                    className="h-10 w-28 rounded-xl animate-pulse"
                    style={{ backgroundColor: "rgba(47, 60, 150, 0.12)" }}
                  />
                </div>
                <div
                  className="sm:hidden w-10 h-10 rounded-lg animate-pulse shrink-0"
                  style={{ backgroundColor: "rgba(47, 60, 150, 0.15)" }}
                />
              </div>
            </div>
          </div>

          {/* Category tabs skeleton — border-b, mobile grid 2 cols, desktop underline */}
          <div className="mt-4 sm:mt-6 mb-4 sm:mb-8">
            <div className="mb-4 sm:mb-8 border-b border-indigo-100/70 pb-2 sm:pb-3">
              <div className="grid grid-cols-2 sm:hidden gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-10 sm:h-14 rounded-xl animate-pulse"
                    style={{ backgroundColor: "rgba(47, 60, 150, 0.08)" }}
                  />
                ))}
              </div>
              <div className="hidden sm:flex items-center gap-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-9 w-20 rounded animate-pulse"
                    style={{ backgroundColor: "rgba(47, 60, 150, 0.1)" }}
                  />
                ))}
              </div>
            </div>

            {/* Medical Conditions bar skeleton */}
            <div className="rounded-2xl bg-white/90 backdrop-blur-sm border border-indigo-100/70 shadow-[0_10px_40px_rgba(15,23,42,0.04)] p-3 sm:p-4 mb-6 sm:mb-10 flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
              <div className="space-y-2">
                <div
                  className="h-4 w-36 rounded animate-pulse"
                  style={{ backgroundColor: "rgba(47, 60, 150, 0.12)" }}
                />
                <div
                  className="h-3 w-48 rounded animate-pulse"
                  style={{ backgroundColor: "rgba(47, 60, 150, 0.08)" }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-20 rounded-full animate-pulse"
                    style={{ backgroundColor: "rgba(47, 60, 150, 0.1)" }}
                  />
                ))}
              </div>
            </div>

            {/* Main content skeleton — card grid */}
            <div className="rounded-2xl bg-white/90 backdrop-blur-sm border border-indigo-100/70 shadow-[0_10px_40px_rgba(15,23,42,0.04)] p-4 sm:p-6 md:p-8">
              <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                <div
                  className="h-7 w-48 rounded-lg animate-pulse"
                  style={{ backgroundColor: "rgba(47, 60, 150, 0.1)" }}
                />
                <div className="flex gap-2">
                  <div
                    className="h-9 w-24 rounded-lg animate-pulse"
                    style={{ backgroundColor: "rgba(47, 60, 150, 0.08)" }}
                  />
                  <div
                    className="h-9 w-28 rounded-lg animate-pulse"
                    style={{ backgroundColor: "rgba(47, 60, 150, 0.08)" }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-indigo-100/50 overflow-hidden bg-white/80"
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className="h-4 w-20 rounded-full animate-pulse"
                          style={{ backgroundColor: "rgba(47, 60, 150, 0.12)" }}
                        />
                        <div
                          className="h-5 w-14 rounded-full animate-pulse"
                          style={{ backgroundColor: "rgba(47, 60, 150, 0.12)" }}
                        />
                      </div>
                      <div
                        className="w-full h-2.5 rounded-full animate-pulse mb-4"
                        style={{ backgroundColor: "rgba(208, 196, 226, 0.3)" }}
                      />
                      <div
                        className="h-5 w-full rounded-lg animate-pulse mb-2"
                        style={{ backgroundColor: "rgba(47, 60, 150, 0.1)" }}
                      />
                      <div
                        className="h-5 w-3/4 rounded-lg animate-pulse mb-4"
                        style={{ backgroundColor: "rgba(47, 60, 150, 0.08)" }}
                      />
                      <div className="space-y-2 mb-4">
                        <div
                          className="h-4 w-full rounded animate-pulse"
                          style={{ backgroundColor: "rgba(47, 60, 150, 0.08)" }}
                        />
                        <div
                          className="h-4 w-2/3 rounded animate-pulse"
                          style={{ backgroundColor: "rgba(47, 60, 150, 0.08)" }}
                        />
                      </div>
                      <div
                        className="h-14 w-full rounded-lg animate-pulse mb-4"
                        style={{ backgroundColor: "rgba(208, 196, 226, 0.2)" }}
                      />
                      <div className="flex gap-2">
                        <div
                          className="h-9 flex-1 rounded-lg animate-pulse"
                          style={{ backgroundColor: "rgba(47, 60, 150, 0.15)" }}
                        />
                        <div
                          className="h-9 w-9 rounded-lg animate-pulse"
                          style={{ backgroundColor: "rgba(47, 60, 150, 0.08)" }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show multi-step loader for first load (cache miss), simple spinner for cache hits
  if (loading) {
    if (isFirstLoad) {
      return (
        <MultiStepLoader
          loadingStates={loadingStates}
          loading={loading}
          duration={1700}
          loop={false}
        />
      );
    } else {
      return <SimpleLoader />;
    }
  }

  const getCategoryLabel = (category) => {
    switch (category) {
      case "publications":
        return "Health Library";
      case "trials":
        return "New Treatments";
      case "experts":
        return expertsLabel;
      case "forums":
        return "Forums";
      case "favorites":
        return "Favourites";
      case "meetings":
        return "Meetings";
      default:
        return "";
    }
  };

  // Prioritize userProfile over user object from localStorage for display
  const userDisease =
    userProfile?.patient?.conditions?.[0] ||
    user?.medicalInterests?.[0] ||
    "Not specified";
  const userConditions =
    userProfile?.patient?.conditions || user?.medicalInterests || [];
  const primaryConditionIndicesDisplay = (() => {
    const indices = userProfile?.patient?.primaryConditionIndices;
    if (
      Array.isArray(indices) &&
      indices.length >= 1 &&
      indices.every(
        (i) => Number.isInteger(i) && i >= 0 && i < userConditions.length,
      )
    ) {
      return indices.slice(0, 2);
    }
    if (userConditions.length === 1) return [0];
    if (userConditions.length >= 2) return [0, 1];
    return [];
  })();
  const userLocation =
    userProfile?.patient?.location || userProfile?.researcher?.location || null;
  const locationText = userLocation
    ? `${userLocation.city || ""}${
        userLocation.city && userLocation.country ? ", " : ""
      }${userLocation.country || ""}`.trim() || "Not specified"
    : "Not specified";

  return (
    <div className="min-h-scren relative ">
      <PageTutorial
        pageId="dashboard"
        steps={DASHBOARD_TUTORIAL_STEPS}
        enabled={showDashboardTutorial}
        onStepChange={handleDashboardTutorialStepChange}
        onComplete={() => setForceShowTutorial(false)}
      />
      <style>{`
        .category-button-hover:hover:not(:active) {
          background-color: rgba(255, 255, 255, 0.8) !important;
          border-color: rgba(47, 60, 150, 0.3) !important;
        }
      `}</style>
      <AnimatedBackground />
      <div className="px-4 sm:px-6 md:px-8 lg:px-12 mx-auto max-w-7xl pt-14 pb-12 relative rounded-t-3xl bg-[#F7F8FC] sm:bg-transparent">
        {/* Main Content Section - Block-based layout */}
        <div className="mt-6 mb-8">
          {/* Category blocks - clear cards for easy navigation (compact on mobile) */}
          <div
            className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-4 pt-4 sm:pt-8 mb-4 sm:mb-8"
            data-tour="dashboard-tabs"
          >
            {[
              { key: "publications", label: "Health Library", icon: FileText },
              { key: "trials", label: "New Treatments", icon: Beaker },
              { key: "experts", label: expertsLabel, icon: Users },
              { key: "forums", label: "Forums", icon: MessageCircle },
              { key: "favorites", label: "Favourites", icon: Star },
              { key: "meetings", label: "Meetings", icon: Calendar },
            ].map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategory === category.key;
              const isSectionLoading =
                ["trials", "publications", "experts"].includes(category.key) &&
                (refreshingSection === category.key ||
                  refreshingSectionsBg.has(category.key));
              return (
                <button
                  key={category.key}
                  type="button"
                  onClick={() =>
                    !isSectionLoading && setSelectedCategory(category.key)
                  }
                  disabled={isSectionLoading}
                  className={`group flex flex-col items-start gap-1.5 sm:gap-3 p-3 sm:p-5 rounded-xl sm:rounded-2xl border-2 text-left transition-all duration-200 active:scale-[0.98] ${
                    isSelected
                      ? "bg-[#2F3C96] border-[#2F3C96] shadow-lg shadow-[#2F3C96]/20 text-white"
                      : "bg-white border-indigo-100/80 hover:border-[#2F3C96]/50 hover:shadow-md text-slate-700"
                  } ${isSectionLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                  {...(category.key === "publications"
                    ? { "data-tour": "dashboard-tab-publications" }
                    : category.key === "favorites"
                      ? { "data-tour": "dashboard-tab-favorites" }
                      : {})}
                >
                  <span
                    className={`flex items-center justify-center w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl shrink-0 ${
                      isSelected ? "bg-white/20" : "bg-indigo-50"
                    }`}
                  >
                    {isSectionLoading ? (
                      <Loader2
                        className="w-5 h-5 sm:w-6 sm:h-6 animate-spin shrink-0"
                        style={{ color: isSelected ? "white" : "#2F3C96" }}
                      />
                    ) : (
                      <Icon
                        className="w-5 h-5 sm:w-6 sm:h-6 shrink-0"
                        style={{ color: isSelected ? "white" : "#2F3C96" }}
                      />
                    )}
                  </span>
                  <div className="min-w-0 w-full">
                    <span className="block text-xs sm:text-sm font-bold truncate">
                      {category.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Medical Conditions - compact block (desktop) */}
          <div
            className="hidden sm:flex rounded-2xl bg-white border-2 border-indigo-100/70 shadow-sm p-4 mb-8 items-center justify-between gap-4 flex-wrap"
            data-tour="dashboard-conditions-bar"
          >
            <div>
              <span
                className="block text-sm font-semibold"
                style={{ color: "#2F3C96" }}
              >
                Medical Conditions
              </span>
            </div>
            <div className="flex flex-1 min-w-0 flex-wrap items-center gap-2">
              {userConditions.length > 0 ? (
                userConditions.map((c, i) => {
                  const isSelected = primaryConditionIndicesDisplay.includes(i);
                  return (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border shadow-sm"
                      style={{
                        backgroundColor: isSelected
                          ? "rgba(47, 60, 150, 0.15)"
                          : "rgba(255, 255, 255, 0.9)",
                        borderColor: isSelected
                          ? "rgba(47, 60, 150, 0.5)"
                          : "rgba(47, 60, 150, 0.25)",
                        color: "#2F3C96",
                      }}
                    >
                      {isSelected && (
                        <CheckCircle2
                          className="w-4 h-4 shrink-0"
                          style={{ color: "#2F3C96" }}
                          aria-label="Used for search"
                        />
                      )}
                      <span>{c}</span>
                    </span>
                  );
                })
              ) : (
                <span
                  className="text-sm font-medium"
                  style={{ color: "#2F3C96" }}
                >
                  Complete your profile first to see personalized
                  recommendations.
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={openEditConditionsModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white border transition-colors hover:opacity-90"
                style={{
                  backgroundColor: "#2F3C96",
                  borderColor: "#2F3C96",
                }}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (refreshingSection || refreshingSectionsBg.size > 0)
                    return;
                  refreshRecommendationsBySection();
                }}
                disabled={!!refreshingSection || refreshingSectionsBg.size > 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border text-[#2F3C96] bg-white/90 transition-all duration-200 select-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:bg-indigo-50/80 hover:shadow-sm active:scale-[0.98] disabled:hover:bg-white/90 disabled:hover:shadow-none disabled:active:scale-100"
                style={{
                  borderColor: "#2F3C96",
                }}
                title="Refresh trials, publications and experts based on your conditions"
              >
                {refreshingSection || refreshingSectionsBg.size > 0 ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const total =
                    (selectedFavoriteItems.experts?.length || 0) +
                    (selectedFavoriteItems.publications?.length || 0) +
                    (selectedFavoriteItems.trials?.length || 0);
                  if (total === 0) {
                    setSelectedCategory("favorites");
                    toast.error(
                      "Select items from Favourites to include in your report, then try again.",
                    );
                    return;
                  }
                  generateFavoritesSummaryReport();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all hover:opacity-90 active:scale-[0.98]"
                style={{
                  backgroundColor: "#D0C4E2",
                  color: "#2F3C96",
                  borderColor: "rgba(47, 60, 150, 0.4)",
                }}
                title="Generate a PDF summary of your saved items to share with your doctor"
              >
                <FileText className="w-3.5 h-3.5" />
                Generate Summary Report
              </button>
            </div>
          </div>

          {/* Edit Medical Conditions Modal */}
          {editConditionsModalOpen && (
            <Modal
              isOpen={editConditionsModalOpen}
              onClose={() =>
                !savingConditions && setEditConditionsModalOpen(false)
              }
              title="Edit Medical Conditions"
            >
              <div className="space-y-5 max-w-md">
                <p className="text-sm text-slate-600">
                  Add or remove conditions. Choose up to two to use for
                  personalized search—tap the checkmark to select.
                </p>
                <div className="flex flex-wrap gap-2">
                  {conditionsDraft.length === 0 && (
                    <span className="text-sm text-slate-400 italic">
                      No conditions yet. Add one below.
                    </span>
                  )}
                  {conditionsDraft.map((c, i) => (
                    <span
                      key={`${i}-${c}`}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors"
                      style={{
                        backgroundColor: primaryIndicesDraft.includes(i)
                          ? "rgba(47, 60, 150, 0.12)"
                          : "rgba(208, 196, 226, 0.25)",
                        borderColor: primaryIndicesDraft.includes(i)
                          ? "rgba(47, 60, 150, 0.45)"
                          : "rgba(47, 60, 150, 0.25)",
                        color: "#2F3C96",
                      }}
                    >
                      {conditionsDraft.length > 1 && (
                        <button
                          type="button"
                          onClick={() => togglePrimaryIndex(i)}
                          className="p-0.5 rounded-md hover:bg-black/10 flex items-center shrink-0"
                          title={
                            primaryIndicesDraft.includes(i)
                              ? "Used for search (click to deselect)"
                              : "Use for search (max 2)"
                          }
                        >
                          {primaryIndicesDraft.includes(i) ? (
                            <CheckCircle2
                              className="w-5 h-5 shrink-0"
                              style={{ color: "#2F3C96" }}
                            />
                          ) : (
                            <span
                              className="w-5 h-5 rounded-full border-2 inline-block shrink-0"
                              style={{ borderColor: "#2F3C96" }}
                            />
                          )}
                        </button>
                      )}
                      <span className="font-medium">{c}</span>
                      <button
                        type="button"
                        onClick={() => removeCondition(i)}
                        className="p-1 rounded-md hover:bg-black/10 text-slate-500 hover:text-slate-700"
                        aria-label="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0">
                    <SmartSearchInput
                      value={newConditionInput}
                      onChange={setNewConditionInput}
                      onSubmit={(term) => {
                        const v = (term || "").trim();
                        if (v) {
                          addCondition(v);
                          setNewConditionInput("");
                        }
                      }}
                      extraTerms={icd11SuggestionTerms}
                      maxSuggestions={10}
                      placeholder="Search or select a condition (ICD-11)..."
                      autoSubmitOnSelect={true}
                      inputClassName="rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(47,60,150,0.35)] w-full px-3 py-2.5"
                      className="w-full"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const v = newConditionInput.trim();
                      if (v) {
                        addCondition(v);
                        setNewConditionInput("");
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium border shrink-0 transition-colors hover:opacity-90"
                    style={{
                      color: "#2F3C96",
                      borderColor: "rgba(47, 60, 150, 0.4)",
                      backgroundColor: "rgba(208, 196, 226, 0.4)",
                    }}
                  >
                    Add
                  </button>
                </div>
                {conditionsDraft.length > 1 && (
                  <p className="text-xs text-slate-500">
                    Selected conditions (with checkmark) are used for trials,
                    publications, and experts. Save then Refresh on the
                    dashboard to update results.
                  </p>
                )}
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEditConditionsModalOpen(false)}
                    disabled={savingConditions}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveConditions}
                    disabled={savingConditions}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-70 transition-opacity"
                    style={{ backgroundColor: "#2F3C96" }}
                  >
                    {savingConditions ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    Save changes
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {/* Main content block - single card for recommendations */}
          <div
            className="rounded-2xl bg-white border-2 border-indigo-100/70 shadow-sm overflow-hidden p-4 sm:p-6 md:p-8"
            data-tour="dashboard-recommendations"
          >
            <div className="mb-4 sm:mb-6">
              <h2
                className="text-xl font-bold mb-0.5 sm:mb-2 sm:text-2xl lg:text-3xl"
                style={{
                  background: "linear-gradient(135deg, #2F3C96, #253075)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                <span className="sm:hidden">Personalized For You</span>
                <span className="hidden sm:inline">
                  Your Personalized Recommendations
                </span>
              </h2>
            </div>

            {/* Mobile only: Medical Conditions as dropdown – block style (compact) */}
            <div className="sm:hidden rounded-xl bg-slate-50/80 border border-indigo-100/70 overflow-hidden mb-4">
              <button
                type="button"
                onClick={() =>
                  setIsMedicalConditionsExpanded(!isMedicalConditionsExpanded)
                }
                className="w-full flex items-center justify-between gap-2 p-3 text-left"
                style={{ color: "#2F3C96" }}
              >
                <div className="space-y-0.5 min-w-0">
                  <span className="block text-xs font-semibold">
                    Medical Conditions
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    {isMedicalConditionsExpanded
                      ? "Tap to collapse"
                      : userConditions.length > 0
                        ? `${userConditions.length} condition${userConditions.length !== 1 ? "s" : ""} · Tap to view details`
                        : "Complete your profile first"}
                  </span>
                </div>
                {isMedicalConditionsExpanded ? (
                  <ChevronUp className="w-4 h-4 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 shrink-0" />
                )}
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  isMedicalConditionsExpanded
                    ? "max-h-[500px] opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-3 pb-3 pt-0 border-t border-indigo-100/70">
                  {/* Conditions: vertical stack */}
                  <div className="flex flex-col gap-1.5 mb-3 mt-2">
                    {userConditions.length > 0 ? (
                      userConditions.map((c, i) => {
                        const isSelected =
                          primaryConditionIndicesDisplay.includes(i);
                        return (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border w-full min-w-0"
                            style={{
                              backgroundColor: isSelected
                                ? "rgba(47, 60, 150, 0.12)"
                                : "rgba(255, 255, 255, 0.9)",
                              borderColor: isSelected
                                ? "rgba(47, 60, 150, 0.5)"
                                : "rgba(47, 60, 150, 0.25)",
                              color: "#2F3C96",
                            }}
                          >
                            {isSelected && (
                              <CheckCircle2
                                className="w-3.5 h-3.5 shrink-0"
                                style={{ color: "#2F3C96" }}
                                aria-label="Used for search"
                              />
                            )}
                            <span className="truncate">{c}</span>
                          </span>
                        );
                      })
                    ) : (
                      <span
                        className="text-xs font-medium py-0.5"
                        style={{ color: "#2F3C96" }}
                      >
                        Complete your profile first to see personalized
                        recommendations.
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={openEditConditionsModal}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium text-white border transition-colors hover:opacity-90"
                      style={{
                        backgroundColor: "#2F3C96",
                        borderColor: "#2F3C96",
                      }}
                    >
                      <Edit3 className="w-3.5 h-3.5 shrink-0" />
                      Edit conditions
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (refreshingSection || refreshingSectionsBg.size > 0)
                          return;
                        refreshRecommendationsBySection();
                      }}
                      disabled={
                        !!refreshingSection || refreshingSectionsBg.size > 0
                      }
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium border text-[#2F3C96] bg-white/90 transition-all duration-200 select-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:bg-indigo-50/80 active:scale-[0.99]"
                      style={{ borderColor: "#2F3C96" }}
                      title="Refresh trials, publications and experts based on your conditions"
                    >
                      {refreshingSection || refreshingSectionsBg.size > 0 ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>Refresh recommendations</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const total =
                          (selectedFavoriteItems.experts?.length || 0) +
                          (selectedFavoriteItems.publications?.length || 0) +
                          (selectedFavoriteItems.trials?.length || 0);
                        if (total === 0) {
                          setSelectedCategory("favorites");
                          toast.error(
                            "Select items from Favourites to include in your report, then try again.",
                          );
                          return;
                        }
                        generateFavoritesSummaryReport();
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium border-2 transition-all hover:opacity-90 active:scale-[0.99]"
                      style={{
                        backgroundColor: "#D0C4E2",
                        color: "#2F3C96",
                        borderColor: "rgba(47, 60, 150, 0.4)",
                      }}
                      title="Generate a PDF summary to share with your doctor"
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      Generate Summary Report
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid of Items - block cards within main content block */}
            <div
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6"
              data-tour="dashboard-content"
            >
              {selectedCategory === "trials" &&
                (data.trials.length > 0 ? (
                  sortByMatchPercentage(data.trials).map((t, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl shadow-md border border-indigo-50/80 transition-all duration-200 hover:-translate-y-1.5 hover:shadow-[0_18px_45px_rgba(15,23,42,0.14)] overflow-hidden flex flex-col h-full"
                      style={{
                        borderColor: "rgba(208, 196, 226, 0.3)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 10px 15px -3px rgba(47, 60, 150, 0.1), 0 4px 6px -2px rgba(47, 60, 150, 0.05)";
                        e.currentTarget.style.borderColor =
                          "rgba(47, 60, 150, 0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
                        e.currentTarget.style.borderColor =
                          "rgba(208, 196, 226, 0.3)";
                      }}
                    >
                      <div className="p-4 sm:p-5 flex flex-col flex-grow">
                        {/* Match Progress Bar */}
                        {t.matchPercentage !== undefined && (
                          <div className="mb-3 sm:mb-4">
                            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                              <div
                                className="flex items-center gap-1.5"
                                title="Match based on your selected conditions and interests."
                              >
                                <TrendingUp
                                  className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                                  style={{ color: "#2F3C96" }}
                                />
                                <span
                                  className="text-xs font-semibold tracking-wide"
                                  style={{ color: "#2F3C96" }}
                                >
                                  {t.matchPercentage}% Match
                                </span>
                              </div>
                              {/* Status Badge */}
                              {t.status && (
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                    t.status,
                                  )}`}
                                >
                                  {t.status.replace(/_/g, " ")}
                                </span>
                              )}
                            </div>
                            {/* Progress Bar */}
                            <div className="w-full h-2.5 rounded-full overflow-hidden bg-indigo-100/60">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${t.matchPercentage}%`,
                                  background:
                                    "linear-gradient(90deg, #2F3C96, #253075)",
                                }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {/* Title */}
                        <div className="mb-4">
                          <h3
                            className="text-lg font-bold mb-0 line-clamp-3 leading-snug"
                            style={{ color: "#2F3C96" }}
                          >
                            {simplifiedTrialSummaries.get(t.title) ||
                              t.simplifiedTitle ||
                              t.title}
                          </h3>
                        </div>

                        {/* Basic Info */}
                        {/* Conditions and Phase removed */}

                        {/* Description/Details Preview */}
                        {(t.description || t.conditionDescription) && (
                          <div className="mb-4 flex-grow">
                            <button
                              onClick={() => openTrialDetailsModal(t)}
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
                                      {t.description ||
                                        t.conditionDescription ||
                                        "View details for more information"}
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

                        {/* Spacer for trials without description */}
                        {!t.description && !t.conditionDescription && (
                          <div className="flex-grow"></div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-auto">
                          <button
                            onClick={() => generateSummary(t, "trial")}
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
                            Understand this trial
                          </button>
                          <button
                            onClick={() =>
                              toggleFavorite("trial", t._id || t.id, t)
                            }
                            disabled={favoritingItems.has(
                              getFavoriteKey("trial", t._id || t.id, t),
                            )}
                            className={`p-2 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                              favorites.some(
                                (fav) =>
                                  fav.type === "trial" &&
                                  (fav.item?.id === (t._id || t.id) ||
                                    fav.item?._id === (t._id || t.id)),
                              )
                                ? "bg-red-50 border-red-200 text-red-500"
                                : ""
                            }`}
                            style={
                              !favorites.some(
                                (fav) =>
                                  fav.type === "trial" &&
                                  (fav.item?.id === (t._id || t.id) ||
                                    fav.item?._id === (t._id || t.id)),
                              )
                                ? {
                                    backgroundColor: "rgba(208, 196, 226, 0.2)",
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
                                    (fav.item?.id === (t._id || t.id) ||
                                      fav.item?._id === (t._id || t.id)),
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
                                    (fav.item?.id === (t._id || t.id) ||
                                      fav.item?._id === (t._id || t.id)),
                                )
                              ) {
                                e.currentTarget.style.backgroundColor =
                                  "rgba(208, 196, 226, 0.2)";
                                e.currentTarget.style.color = "#787878";
                              }
                            }}
                          >
                            {favoritingItems.has(
                              getFavoriteKey("trial", t._id || t.id, t),
                            ) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Heart
                                className={`w-4 h-4 ${
                                  favorites.some(
                                    (fav) =>
                                      fav.type === "trial" &&
                                      (fav.item?.id === (t._id || t.id) ||
                                        fav.item?._id === (t._id || t.id)),
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
                          onClick={() => openContactInfoModal(t)}
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
                          View Contact Information
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-16">
                    <div
                      className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                      style={{ backgroundColor: "rgba(208, 196, 226, 0.3)" }}
                    >
                      <Beaker
                        className="w-10 h-10"
                        style={{ color: "#2F3C96" }}
                      />
                    </div>
                    <h3
                      className="text-lg font-semibold mb-2"
                      style={{ color: "#2F3C96" }}
                    >
                      No New Treatments Found
                    </h3>
                    <p
                      className="text-sm max-w-md mx-auto"
                      style={{ color: "#787878" }}
                    >
                      We're working on finding relevant clinical trials for you.
                      Check back soon!
                    </p>
                  </div>
                ))}

              {selectedCategory === "publications" &&
                (filteredPublications.length > 0 ? (
                  filteredPublications.map((p, idx) => {
                    const itemId = p.id || p.pmid;
                    const isFavorited = favorites.some(
                      (fav) =>
                        fav.type === "publication" &&
                        (fav.item?.id === itemId ||
                          fav.item?._id === itemId ||
                          fav.item?.pmid === itemId),
                    );
                    return (
                      <div
                        key={idx}
                        className="bg-white rounded-xl shadow-sm border transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden flex flex-col h-full"
                        style={{
                          borderColor: "rgba(208, 196, 226, 0.3)",
                        }}
                        {...(idx === 0
                          ? {
                              "data-tour": "dashboard-publication-view-details",
                            }
                          : {})}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow =
                            "0 10px 15px -3px rgba(47, 60, 150, 0.1), 0 4px 6px -2px rgba(47, 60, 150, 0.05)";
                          e.currentTarget.style.borderColor =
                            "rgba(47, 60, 150, 0.4)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow =
                            "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
                          e.currentTarget.style.borderColor =
                            "rgba(208, 196, 226, 0.3)";
                        }}
                      >
                        <div className="p-4 sm:p-5 flex flex-col flex-grow">
                          {/* Match Progress Bar */}
                          {p.matchPercentage !== undefined && (
                            <div className="mb-3 sm:mb-4">
                              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                <div className="flex items-center gap-2">
                                  <TrendingUp
                                    className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                                    style={{ color: "#2F3C96" }}
                                  />
                                  <span
                                    className="text-xs sm:text-sm font-bold"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    {p.matchPercentage}% Match
                                  </span>
                                </div>
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
                                    width: `${p.matchPercentage}%`,
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
                              className="text-lg font-bold mb-0 line-clamp-3 leading-snug"
                              style={{ color: "#2F3C96" }}
                            >
                              {simplifiedTitles.get(p.title) ||
                                p.simplifiedTitle ||
                                p.title ||
                                "Untitled Publication"}
                            </h3>
                          </div>

                          {/* Journal Name - Below Title */}
                          {}

                          {/* Basic Info - Authors and Published Date */}
                          <div className="space-y-1.5 mb-4">
                            {p.authors &&
                              Array.isArray(p.authors) &&
                              p.authors.length > 0 && (
                                <div
                                  className="flex items-center text-sm"
                                  style={{ color: "#787878" }}
                                >
                                  <User className="w-3.5 h-3.5 mr-2 shrink-0" />
                                  <span className="line-clamp-1">
                                    {p.authors.join(", ")}
                                  </span>
                                </div>
                              )}
                            {(p.year || p.month) && (
                              <div
                                className="flex items-center text-sm"
                                style={{ color: "#787878" }}
                              >
                                <Calendar className="w-3.5 h-3.5 mr-2 shrink-0" />
                                <span>
                                  {p.month && p.month + " "}
                                  {p.year || ""}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Abstract Preview */}
                          {p.abstract && (
                            <div className="mb-4 flex-grow">
                              <button
                                onClick={() => openPublicationDetailsModal(p)}
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
                                        {p.abstract}
                                      </span>
                                    </div>
                                    <div
                                      className="mt-1.5 flex items-center gap-1 font-medium transition-all duration-200"
                                      style={{ color: "#2F3C96" }}
                                    >
                                      <span>View full details</span>
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
                          {!p.abstract && <div className="flex-grow"></div>}

                          {/* Action Buttons */}
                          <div className="flex gap-2 mt-auto">
                            <button
                              onClick={() => generateSummary(p, "publication")}
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
                              Understand this Paper
                            </button>

                            <button
                              onClick={() =>
                                toggleFavorite("publication", itemId, p)
                              }
                              disabled={favoritingItems.has(
                                getFavoriteKey("publication", itemId, p),
                              )}
                              className={`p-2 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                isFavorited
                                  ? "bg-red-50 border-red-200 text-red-500"
                                  : ""
                              }`}
                              style={
                                !isFavorited
                                  ? {
                                      backgroundColor:
                                        "rgba(208, 196, 226, 0.2)",
                                      borderColor: "rgba(208, 196, 226, 0.3)",
                                      color: "#787878",
                                    }
                                  : {}
                              }
                              onMouseEnter={(e) => {
                                if (!isFavorited && !e.currentTarget.disabled) {
                                  e.currentTarget.style.backgroundColor =
                                    "rgba(208, 196, 226, 0.3)";
                                  e.currentTarget.style.color = "#dc2626";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isFavorited) {
                                  e.currentTarget.style.backgroundColor =
                                    "rgba(208, 196, 226, 0.2)";
                                  e.currentTarget.style.color = "#787878";
                                }
                              }}
                            >
                              {favoritingItems.has(
                                getFavoriteKey("publication", itemId, p),
                              ) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Heart
                                  className={`w-4 h-4 ${
                                    isFavorited ? "fill-current" : ""
                                  }`}
                                />
                              )}
                            </button>
                          </div>

                          {/* View Full Publication - in-app */}
                          {(p.pmid || p.id) && (
                            <Link
                              to={`/publication/${p.pmid || p.id}`}
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
                              View Full Publication
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full text-center py-16">
                    <div
                      className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                      style={{ backgroundColor: "rgba(208, 196, 226, 0.3)" }}
                    >
                      <FileText
                        className="w-10 h-10"
                        style={{ color: "#2F3C96" }}
                      />
                    </div>
                    <h3
                      className="text-lg font-semibold mb-2"
                      style={{ color: "#2F3C96" }}
                    >
                      No items in Library
                    </h3>
                    <p
                      className="text-sm max-w-md mx-auto"
                      style={{ color: "#787878" }}
                    >
                      We're curating relevant research for your library. Check
                      back soon!
                    </p>
                  </div>
                ))}

              {selectedCategory === "experts" && (
                <div className="col-span-full">
                  {/* Experts List - On-Platform Experts (collapsed) and Global Experts (expanded) */}
                  {(() => {
                    const collabioraExperts = sortByMatchPercentage(
                      data.experts,
                    ).slice(0, 6);
                    const globalExpertsList =
                      sortByMatchPercentage(globalExperts);
                    const hasRecommendedExperts = collabioraExperts.length > 0;
                    const hasGlobalExperts = globalExpertsList.length > 0;

                    return hasRecommendedExperts || hasGlobalExperts ? (
                      <div className="space-y-4 sm:space-y-8">
                        {/* On-Platform Experts Section (dropdown, collapsed by default) */}
                        {hasRecommendedExperts && (
                          <div className="col-span-full rounded-xl sm:rounded-2xl border-2 shadow-lg overflow-hidden">
                            <button
                              type="button"
                              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3 md:px-6 md:py-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                              onClick={() =>
                                setShowCollabioraExperts((prev) => !prev)
                              }
                            >
                              <div className="flex items-center gap-2 sm:gap-3 text-left min-w-0">
                                <div
                                  className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md shrink-0"
                                  style={{
                                    background:
                                      "linear-gradient(135deg, #2F3C96, #253075)",
                                  }}
                                >
                                  <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                    <span className="text-sm sm:text-base md:text-lg font-semibold text-slate-900">
                                      On-platform {expertsLabel}
                                    </span>
                                    <span
                                      className="text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0"
                                      style={{
                                        backgroundColor:
                                          "rgba(208, 196, 226, 0.3)",
                                        color: "#253075",
                                      }}
                                    >
                                      {collabioraExperts.length}{" "}
                                      {collabioraExperts.length === 1
                                        ? expertLabel
                                        : expertsLabel}
                                    </span>
                                  </div>
                                  <p className="text-[11px] sm:text-xs md:text-sm text-slate-600 mt-0.5 sm:mt-1 line-clamp-2">
                                    Connect with {expertsLabel.toLowerCase()}{" "}
                                    who are active on Collabiora and available
                                    for direct collaboration.
                                  </p>
                                </div>
                              </div>
                              <ChevronDown
                                className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-[#2F3C96] transition-transform ${
                                  showCollabioraExperts ? "rotate-180" : ""
                                }`}
                              />
                            </button>

                            {showCollabioraExperts && (
                              <div className="p-3 sm:p-4 md:p-6 bg-white">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                  {collabioraExperts.map((e, idx) => {
                                    const isCuralinkExpert = !!(
                                      e._id || e.userId
                                    );
                                    const expertId =
                                      e.name ||
                                      e.id ||
                                      e._id ||
                                      e.userId ||
                                      `expert-${idx}`;
                                    const itemId =
                                      e.name || e.orcid || e.id || e._id;
                                    const medicalInterests = isCuralinkExpert
                                      ? [
                                          ...(e.specialties || []),
                                          ...(e.interests || []),
                                        ]
                                      : e.researchInterests || [];
                                    const locationText =
                                      isCuralinkExpert && e.location
                                        ? typeof e.location === "string"
                                          ? e.location
                                          : `${e.location.city || ""}${
                                              e.location.city &&
                                              e.location.country
                                                ? ", "
                                                : ""
                                            }${e.location.country || ""}`.trim()
                                        : e.location || null;

                                    // Check if expert is favorited by exact name match (consistent with Experts.jsx)
                                    const isFavorited = favorites.some(
                                      (fav) => {
                                        if (fav.type !== "expert") return false;

                                        // Check by exact name match (primary identifier)
                                        if (e.name && fav.item?.name) {
                                          return fav.item.name === e.name;
                                        }

                                        // Fallback: check by id
                                        if (
                                          fav.item?.id === itemId ||
                                          fav.item?._id === itemId ||
                                          fav.item?.orcid === itemId
                                        ) {
                                          return true;
                                        }

                                        return false;
                                      },
                                    );

                                    return (
                                      <div
                                        key={expertId}
                                        className="bg-white rounded-xl shadow-sm border transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden flex flex-col h-full"
                                        style={{
                                          borderColor:
                                            "rgba(208, 196, 226, 0.3)",
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.boxShadow =
                                            "0 10px 15px -3px rgba(47, 60, 150, 0.1), 0 4px 6px -2px rgba(47, 60, 150, 0.05)";
                                          e.currentTarget.style.borderColor =
                                            "rgba(47, 60, 150, 0.4)";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.boxShadow =
                                            "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
                                          e.currentTarget.style.borderColor =
                                            "rgba(208, 196, 226, 0.3)";
                                        }}
                                      >
                                        <div className="p-3 sm:p-4 flex flex-col flex-grow">
                                          {/* Match Progress Bar - same as global */}
                                          {e.matchPercentage !== undefined && (
                                            <div className="mb-2 sm:mb-3">
                                              <div className="mb-1">
                                                <span
                                                  className="text-xs font-bold"
                                                  style={{ color: "#2F3C96" }}
                                                >
                                                  {e.matchPercentage}% Match
                                                </span>
                                              </div>
                                              <div
                                                className="w-full h-1.5 rounded-full overflow-hidden"
                                                style={{
                                                  backgroundColor:
                                                    "rgba(208, 196, 226, 0.3)",
                                                }}
                                              >
                                                <div
                                                  className="h-full rounded-full transition-all"
                                                  style={{
                                                    width: `${e.matchPercentage}%`,
                                                    background:
                                                      "linear-gradient(90deg, #2F3C96, #253075)",
                                                  }}
                                                />
                                              </div>
                                            </div>
                                          )}

                                          {isCuralinkExpert &&
                                            e.available === true && (
                                              <div
                                                className="mb-3 flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs font-semibold"
                                                style={{
                                                  backgroundColor:
                                                    "rgba(208, 196, 226, 0.2)",
                                                  borderColor:
                                                    "rgba(208, 196, 226, 0.3)",
                                                  color: "#2F3C96",
                                                }}
                                              >
                                                <Calendar className="w-3.5 h-3.5" />{" "}
                                                Available for Meetings
                                              </div>
                                            )}

                                          <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                                            <div
                                              className="w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base shrink-0"
                                              style={{
                                                background:
                                                  "linear-gradient(135deg, #2F3C96, #253075)",
                                              }}
                                            >
                                              {e.name
                                                ?.charAt(0)
                                                ?.toUpperCase() || "E"}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-start justify-between gap-2 mb-1">
                                                <div className="min-w-0">
                                                  <h3 className="text-sm font-bold text-slate-900 truncate">
                                                    {e.name ||
                                                      `Unknown ${expertLabel}`}
                                                  </h3>
                                                  {e.orcid && (
                                                    <p
                                                      className="text-xs truncate mt-0.5"
                                                      style={{
                                                        color: "#2F3C96",
                                                      }}
                                                    >
                                                      ORCID: {e.orcid}
                                                    </p>
                                                  )}
                                                </div>
                                                <button
                                                  onClick={(ev) => {
                                                    ev.stopPropagation();
                                                    toggleFavorite(
                                                      "expert",
                                                      itemId,
                                                      e,
                                                    );
                                                  }}
                                                  disabled={favoritingItems.has(
                                                    getFavoriteKey(
                                                      "expert",
                                                      itemId,
                                                      e,
                                                    ),
                                                  )}
                                                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-500 disabled:opacity-50 shrink-0"
                                                  title={
                                                    isFavorited
                                                      ? "Remove from Favourites"
                                                      : "Add to Favourites"
                                                  }
                                                >
                                                  {favoritingItems.has(
                                                    getFavoriteKey(
                                                      "expert",
                                                      itemId,
                                                      e,
                                                    ),
                                                  ) ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                  ) : (
                                                    <Heart
                                                      className={`w-3.5 h-3.5 ${isFavorited ? "fill-current text-red-500" : ""}`}
                                                    />
                                                  )}
                                                </button>
                                              </div>
                                              {(locationText ||
                                                (e.affiliation &&
                                                  !isCuralinkExpert) ||
                                                e.location) && (
                                                <div className="flex items-center text-xs text-slate-600 mt-1 mb-1">
                                                  <Building2 className="w-3 h-3 mr-1 shrink-0" />
                                                  <span className="truncate">
                                                    {locationText ||
                                                      e.affiliation ||
                                                      e.location}
                                                  </span>
                                                </div>
                                              )}
                                              {(e.biography || e.bio) && (
                                                <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                                                  {e.biography || e.bio}
                                                </p>
                                              )}
                                              {medicalInterests.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                  {medicalInterests
                                                    .slice(0, 4)
                                                    .map((interest, idx) => (
                                                      <span
                                                        key={idx}
                                                        className="text-xs px-1.5 py-0.5 rounded-full"
                                                        style={{
                                                          backgroundColor:
                                                            "rgba(208, 196, 226, 0.2)",
                                                          color: "#2F3C96",
                                                        }}
                                                      >
                                                        {interest}
                                                      </span>
                                                    ))}
                                                  {medicalInterests.length >
                                                    4 && (
                                                    <span className="text-xs text-slate-500">
                                                      +
                                                      {medicalInterests.length -
                                                        4}
                                                    </span>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          {/* Action Buttons */}
                                          <div className="flex gap-2 mt-auto items-center">
                                            {isCuralinkExpert ? (
                                              <>
                                                <button
                                                  onClick={() => {
                                                    const expertUserId =
                                                      e._id || e.userId || e.id;
                                                    if (expertUserId) {
                                                      const params =
                                                        new URLSearchParams();
                                                      if (e.name)
                                                        params.set(
                                                          "name",
                                                          e.name,
                                                        );
                                                      if (locationText)
                                                        params.set(
                                                          "location",
                                                          locationText,
                                                        );
                                                      if (e.bio)
                                                        params.set(
                                                          "bio",
                                                          e.bio,
                                                        );
                                                      navigate(
                                                        `/collabiora-expert/profile/${expertUserId}?${params.toString()}`,
                                                      );
                                                    }
                                                  }}
                                                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
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
                                                  View Profile
                                                </button>
                                                <button
                                                  onClick={(ev) => {
                                                    ev.stopPropagation();
                                                    openGlobalExpertDetailsModal(
                                                      e,
                                                    );
                                                  }}
                                                  className="p-2 rounded-lg border transition-all shrink-0"
                                                  style={{
                                                    backgroundColor:
                                                      "rgba(208, 196, 226, 0.2)",
                                                    borderColor:
                                                      "rgba(208, 196, 226, 0.3)",
                                                    color: "#787878",
                                                  }}
                                                  onMouseEnter={(ev) => {
                                                    ev.currentTarget.style.backgroundColor =
                                                      "rgba(208, 196, 226, 0.3)";
                                                    ev.currentTarget.style.color =
                                                      "#2F3C96";
                                                  }}
                                                  onMouseLeave={(ev) => {
                                                    ev.currentTarget.style.backgroundColor =
                                                      "rgba(208, 196, 226, 0.2)";
                                                    ev.currentTarget.style.color =
                                                      "#787878";
                                                  }}
                                                  title="Details"
                                                >
                                                  <Info className="w-3.5 h-3.5" />
                                                </button>
                                              </>
                                            ) : (
                                              <>
                                                {e.email && (
                                                  <a
                                                    href={`mailto:${e.email}`}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      toast.success(
                                                        "Message sent successfully!",
                                                      );
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-2 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
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
                                                    <Mail className="w-3.5 h-3.5" />
                                                    Contact
                                                  </a>
                                                )}
                                                <button
                                                  onClick={() => {
                                                    const params =
                                                      new URLSearchParams();
                                                    params.set(
                                                      "name",
                                                      e.name || "",
                                                    );
                                                    if (e.affiliation)
                                                      params.set(
                                                        "affiliation",
                                                        e.affiliation,
                                                      );
                                                    if (e.location)
                                                      params.set(
                                                        "location",
                                                        e.location,
                                                      );
                                                    if (e.orcid)
                                                      params.set(
                                                        "orcid",
                                                        e.orcid,
                                                      );
                                                    if (e.biography)
                                                      params.set(
                                                        "biography",
                                                        e.biography,
                                                      );
                                                    if (
                                                      e.researchInterests &&
                                                      Array.isArray(
                                                        e.researchInterests,
                                                      )
                                                    ) {
                                                      params.set(
                                                        "researchInterests",
                                                        JSON.stringify(
                                                          e.researchInterests,
                                                        ),
                                                      );
                                                    }
                                                    params.set(
                                                      "from",
                                                      "dashboard",
                                                    );
                                                    navigate(
                                                      `/expert/profile?${params.toString()}`,
                                                    );
                                                  }}
                                                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
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
                                                  View Profile
                                                </button>
                                                <button
                                                  onClick={(event) => {
                                                    event.stopPropagation();
                                                    openGlobalExpertDetailsModal(
                                                      e,
                                                    );
                                                  }}
                                                  className="p-2 rounded-lg border transition-all shrink-0"
                                                  style={{
                                                    backgroundColor:
                                                      "rgba(208, 196, 226, 0.2)",
                                                    borderColor:
                                                      "rgba(208, 196, 226, 0.3)",
                                                    color: "#787878",
                                                  }}
                                                  onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor =
                                                      "rgba(208, 196, 226, 0.3)";
                                                    e.currentTarget.style.color =
                                                      "#2F3C96";
                                                  }}
                                                  onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor =
                                                      "rgba(208, 196, 226, 0.2)";
                                                    e.currentTarget.style.color =
                                                      "#787878";
                                                  }}
                                                  title="Details"
                                                >
                                                  <Info className="w-3.5 h-3.5" />
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Global Experts Section (dropdown, expanded by default) */}
                        {hasGlobalExperts && (
                          <div className="col-span-full rounded-xl sm:rounded-2xl border-2 shadow-lg overflow-hidden">
                            <button
                              type="button"
                              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3 md:px-6 md:py-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                              onClick={() =>
                                setShowGlobalExperts((prev) => !prev)
                              }
                            >
                              <div className="flex items-center gap-2 sm:gap-3 text-left min-w-0">
                                <div
                                  className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md shrink-0"
                                  style={{
                                    background:
                                      "linear-gradient(135deg, #2F3C96, #253075)",
                                  }}
                                >
                                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                    <span className="text-sm sm:text-base md:text-lg font-semibold text-slate-900">
                                      Global {expertsLabel}
                                    </span>
                                    <span
                                      className="text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0"
                                      style={{
                                        backgroundColor:
                                          "rgba(208, 196, 226, 0.3)",
                                        color: "#253075",
                                      }}
                                    >
                                      {globalExpertsList.length}{" "}
                                      {globalExpertsList.length === 1
                                        ? "Researcher"
                                        : "Researchers"}
                                    </span>
                                  </div>
                                  <p className="text-[11px] sm:text-xs md:text-sm text-slate-600 mt-0.5 sm:mt-1 line-clamp-2">
                                    Discover leading{" "}
                                    {expertsLabel.toLowerCase()} and their
                                    published work worldwide.
                                  </p>
                                </div>
                              </div>
                              <ChevronDown
                                className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-[#2F3C96] transition-transform ${
                                  showGlobalExperts ? "rotate-180" : ""
                                }`}
                              />
                            </button>

                            {showGlobalExperts && (
                              <div className="p-3 sm:p-4 md:p-6 bg-white">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                  {globalExpertsList.map((e, idx) => {
                                    const isCuralinkExpert = !!(
                                      e._id || e.userId
                                    );
                                    const expertId =
                                      e.name ||
                                      e.id ||
                                      e._id ||
                                      e.userId ||
                                      `expert-${idx}`;
                                    const itemId =
                                      e.name || e.orcid || e.id || e._id;
                                    const isExpanded =
                                      expandedGlobalCards[expertId];
                                    const expertPublications =
                                      globalExpertPublications[expertId] || [];
                                    const isLoadingPubs =
                                      loadingGlobalExpertPublications[expertId];
                                    const medicalInterests = isCuralinkExpert
                                      ? [
                                          ...(e.specialties || []),
                                          ...(e.interests || []),
                                        ]
                                      : e.researchInterests || [];
                                    const locationText =
                                      isCuralinkExpert && e.location
                                        ? typeof e.location === "string"
                                          ? e.location
                                          : `${e.location.city || ""}${e.location.city && e.location.country ? ", " : ""}${e.location.country || ""}`.trim()
                                        : e.location || null;
                                    const isFavorited = favorites.some(
                                      (fav) => {
                                        if (fav.type !== "expert") return false;
                                        if (e.name && fav.item?.name)
                                          return fav.item.name === e.name;
                                        if (
                                          fav.item?.id === itemId ||
                                          fav.item?._id === itemId ||
                                          fav.item?.orcid === itemId
                                        )
                                          return true;
                                        return false;
                                      },
                                    );
                                    const totalCitations =
                                      e.metrics?.totalCitations ??
                                      e.realCitationCount ??
                                      0;
                                    const totalPubs =
                                      e.metrics?.totalPublications ??
                                      e.realWorksCount ??
                                      0;
                                    const hIndex =
                                      e.metrics?.hIndex ??
                                      e.semanticScholar?.hIndex;
                                    const institution =
                                      e.affiliation ||
                                      (e.institutions && e.institutions[0]) ||
                                      null;

                                    return (
                                      <div
                                        key={expertId}
                                        className={`rounded-xl shadow-sm border transition-all duration-300 cursor-pointer group overflow-hidden transform hover:-translate-y-0.5 ${
                                          isExpanded
                                            ? "bg-white shadow-lg ring-1 ring-opacity-50"
                                            : "bg-white border-slate-200 hover:shadow-lg"
                                        }`}
                                        style={
                                          isExpanded
                                            ? {
                                                borderColor:
                                                  "rgba(47, 60, 150, 0.4)",
                                                boxShadow:
                                                  "0 10px 15px -3px rgba(47, 60, 150, 0.1)",
                                              }
                                            : {
                                                borderColor:
                                                  "rgba(208, 196, 226, 0.3)",
                                              }
                                        }
                                        onClick={() =>
                                          toggleGlobalExpertCard(e)
                                        }
                                      >
                                        <div className="p-3 sm:p-4">
                                          {/* Match bar */}
                                          {e.matchPercentage !== undefined && (
                                            <div className="mb-2 sm:mb-3">
                                              <div className="mb-1">
                                                <span
                                                  className="text-xs font-bold"
                                                  style={{ color: "#2F3C96" }}
                                                >
                                                  {e.matchPercentage}% Match
                                                </span>
                                              </div>
                                              <div
                                                className="w-full h-1.5 rounded-full overflow-hidden"
                                                style={{
                                                  backgroundColor:
                                                    "rgba(208, 196, 226, 0.3)",
                                                }}
                                              >
                                                <div
                                                  className="h-full rounded-full transition-all"
                                                  style={{
                                                    width: `${e.matchPercentage}%`,
                                                    background:
                                                      "linear-gradient(90deg, #2F3C96, #253075)",
                                                  }}
                                                />
                                              </div>
                                            </div>
                                          )}
                                          <div className="flex items-start gap-2 sm:gap-3">
                                            <div
                                              className="w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base shrink-0"
                                              style={{
                                                background:
                                                  "linear-gradient(135deg, #2F3C96, #253075)",
                                              }}
                                            >
                                              {e.name
                                                ?.charAt(0)
                                                ?.toUpperCase() || "E"}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-start justify-between gap-2 mb-1">
                                                <div className="min-w-0">
                                                  <h3 className="text-sm font-bold text-slate-900 truncate">
                                                    {e.name ||
                                                      `Unknown ${expertLabel}`}
                                                  </h3>
                                                  {e.orcid &&
                                                    !isCuralinkExpert && (
                                                      <p
                                                        className="text-xs truncate"
                                                        style={{
                                                          color: "#2F3C96",
                                                        }}
                                                      >
                                                        ORCID: {e.orcid}
                                                      </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                  <button
                                                    onClick={(ev) => {
                                                      ev.stopPropagation();
                                                      toggleFavorite(
                                                        "expert",
                                                        itemId,
                                                        e,
                                                      );
                                                    }}
                                                    disabled={favoritingItems.has(
                                                      getFavoriteKey(
                                                        "expert",
                                                        itemId,
                                                        e,
                                                      ),
                                                    )}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-500 disabled:opacity-50"
                                                    title={
                                                      isFavorited
                                                        ? "Remove from favorites"
                                                        : "Add to favorites"
                                                    }
                                                  >
                                                    {favoritingItems.has(
                                                      getFavoriteKey(
                                                        "expert",
                                                        itemId,
                                                        e,
                                                      ),
                                                    ) ? (
                                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                      <Heart
                                                        className={`w-3.5 h-3.5 ${isFavorited ? "fill-current text-red-500" : ""}`}
                                                      />
                                                    )}
                                                  </button>
                                                  <button
                                                    onClick={(ev) => {
                                                      ev.stopPropagation();
                                                      toggleGlobalExpertCard(e);
                                                    }}
                                                    className={`p-1.5 rounded-lg ${isExpanded ? "" : "text-slate-500 hover:bg-slate-100"}`}
                                                    style={
                                                      isExpanded
                                                        ? {
                                                            backgroundColor:
                                                              "rgba(208, 196, 226, 0.3)",
                                                            color: "#2F3C96",
                                                          }
                                                        : {}
                                                    }
                                                    onMouseEnter={(ev) => {
                                                      if (!isExpanded)
                                                        ev.currentTarget.style.color =
                                                          "#2F3C96";
                                                    }}
                                                    onMouseLeave={(ev) => {
                                                      if (!isExpanded)
                                                        ev.currentTarget.style.color =
                                                          "";
                                                    }}
                                                  >
                                                    <ChevronDown
                                                      className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                                                    />
                                                  </button>
                                                </div>
                                              </div>
                                              {(institution ||
                                                locationText ||
                                                e.location) && (
                                                <div className="flex items-center text-xs text-slate-600 mb-2">
                                                  <Building2 className="w-3 h-3 mr-1 shrink-0" />
                                                  <span className="truncate">
                                                    {institution ||
                                                      locationText ||
                                                      e.location}
                                                  </span>
                                                </div>
                                              )}
                                              {(e.biography || e.bio) && (
                                                <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                                                  {e.biography || e.bio}
                                                </p>
                                              )}
                                              {/* Metrics (Experts-style) */}
                                              <div className="flex flex-wrap gap-1.5 mb-2">
                                                {totalCitations > 0 && (
                                                  <span
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                                                    style={{
                                                      backgroundColor:
                                                        "rgba(208, 196, 226, 0.2)",
                                                      color: "#2F3C96",
                                                    }}
                                                  >
                                                    <TrendingUp className="w-3 h-3" />{" "}
                                                    {totalCitations.toLocaleString()}{" "}
                                                    citations
                                                  </span>
                                                )}
                                                {hIndex != null &&
                                                  hIndex > 0 && (
                                                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-medium">
                                                      <Award className="w-3 h-3" />{" "}
                                                      h-index: {hIndex}
                                                    </span>
                                                  )}
                                                {totalPubs > 0 && (
                                                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-medium">
                                                    <BookOpen className="w-3 h-3" />{" "}
                                                    {totalPubs.toLocaleString()}{" "}
                                                    works
                                                  </span>
                                                )}
                                              </div>
                                              {medicalInterests.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                  {medicalInterests
                                                    .slice(0, 4)
                                                    .map((interest, i) => (
                                                      <span
                                                        key={i}
                                                        className="text-xs px-1.5 py-0.5 rounded-full"
                                                        style={{
                                                          backgroundColor:
                                                            "rgba(208, 196, 226, 0.2)",
                                                          color: "#2F3C96",
                                                        }}
                                                      >
                                                        {interest}
                                                      </span>
                                                    ))}
                                                  {medicalInterests.length >
                                                    4 && (
                                                    <span className="text-xs text-slate-500">
                                                      +
                                                      {medicalInterests.length -
                                                        4}
                                                    </span>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          {/* Expanded: publications (Experts-style) */}
                                          <div
                                            className={`overflow-hidden transition-all duration-300 ${isExpanded ? "max-h-[420px] opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"}`}
                                          >
                                            <div className="pt-3 border-t border-slate-200">
                                              {isLoadingPubs ? (
                                                <div className="flex items-center justify-center py-3">
                                                  <Loader2
                                                    className="w-4 h-4 animate-spin mr-2"
                                                    style={{ color: "#2F3C96" }}
                                                  />
                                                  <span className="text-sm text-slate-600">
                                                    Loading publications...
                                                  </span>
                                                </div>
                                              ) : expertPublications.length >
                                                0 ? (
                                                <div className="space-y-2">
                                                  <div className="flex items-center gap-2 mb-2">
                                                    <BookOpen
                                                      className="w-3.5 h-3.5"
                                                      style={{
                                                        color: "#2F3C96",
                                                      }}
                                                    />
                                                    <h4
                                                      className="text-xs font-semibold"
                                                      style={{
                                                        color: "#2F3C96",
                                                      }}
                                                    >
                                                      Top from Health Library
                                                    </h4>
                                                  </div>
                                                  {expertPublications
                                                    .slice(0, 2)
                                                    .map((pub, i) => (
                                                      <div
                                                        key={i}
                                                        onClick={(ev) =>
                                                          ev.stopPropagation()
                                                        }
                                                        className="rounded-lg p-2 border"
                                                        style={{
                                                          backgroundColor:
                                                            "rgba(208, 196, 226, 0.2)",
                                                          borderColor:
                                                            "rgba(208, 196, 226, 0.3)",
                                                        }}
                                                      >
                                                        <a
                                                          href={pub.link || "#"}
                                                          target="_blank"
                                                          rel="noreferrer"
                                                          className="block"
                                                        >
                                                          <h5
                                                            className="text-xs font-semibold text-slate-900 line-clamp-2 mb-1 hover:opacity-80"
                                                            style={{
                                                              transition:
                                                                "color 0.2s",
                                                            }}
                                                            onMouseEnter={(
                                                              ev,
                                                            ) => {
                                                              ev.currentTarget.style.color =
                                                                "#2F3C96";
                                                            }}
                                                            onMouseLeave={(
                                                              ev,
                                                            ) => {
                                                              ev.currentTarget.style.color =
                                                                "";
                                                            }}
                                                          >
                                                            {pub.title}
                                                          </h5>
                                                          <div className="flex items-center gap-2 text-xs text-slate-600">
                                                            {pub.year && (
                                                              <span
                                                                style={{
                                                                  color:
                                                                    "#2F3C96",
                                                                }}
                                                              >
                                                                {pub.year}
                                                              </span>
                                                            )}
                                                            {pub.citations >
                                                              0 && (
                                                              <span>
                                                                {pub.citations}{" "}
                                                                citations
                                                              </span>
                                                            )}
                                                          </div>
                                                        </a>
                                                      </div>
                                                    ))}
                                                  {expertPublications.length >
                                                    2 && (
                                                    <button
                                                      type="button"
                                                      onClick={(ev) => {
                                                        ev.stopPropagation();
                                                        openGlobalExpertDetailsModal(
                                                          e,
                                                        );
                                                      }}
                                                      className="w-full text-xs font-medium py-1.5 flex items-center justify-center gap-1 hover:opacity-80"
                                                      style={{
                                                        color: "#2F3C96",
                                                      }}
                                                    >
                                                      View all{" "}
                                                      {
                                                        expertPublications.length
                                                      }{" "}
                                                      publications{" "}
                                                      <ExternalLink className="w-3 h-3" />
                                                    </button>
                                                  )}
                                                </div>
                                              ) : (
                                                <div className="text-center py-3">
                                                  <BookOpen className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                                                  <p className="text-xs text-slate-500">
                                                    No publications found
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          {/* Actions row */}
                                          <div
                                            className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100"
                                            onClick={(ev) =>
                                              ev.stopPropagation()
                                            }
                                          >
                                            {isCuralinkExpert ? (
                                              <button
                                                onClick={() => {
                                                  const id =
                                                    e._id || e.userId || e.id;
                                                  if (id)
                                                    navigate(
                                                      `/collabiora-expert/profile/${id}?name=${encodeURIComponent(e.name || "")}&location=${encodeURIComponent(locationText || "")}&bio=${encodeURIComponent(e.bio || "")}`,
                                                    );
                                                }}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                                                style={{
                                                  background:
                                                    "linear-gradient(135deg, #2F3C96, #253075)",
                                                }}
                                                onMouseEnter={(ev) => {
                                                  ev.currentTarget.style.background =
                                                    "linear-gradient(135deg, #253075, #1C2454)";
                                                }}
                                                onMouseLeave={(ev) => {
                                                  ev.currentTarget.style.background =
                                                    "linear-gradient(135deg, #2F3C96, #253075)";
                                                }}
                                              >
                                                View Profile
                                              </button>
                                            ) : (
                                              <>
                                                {e.email && (
                                                  <a
                                                    href={`mailto:${e.email}`}
                                                    onClick={() =>
                                                      toast.success(
                                                        "Opening email...",
                                                      )
                                                    }
                                                    className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                                                    style={{
                                                      background:
                                                        "linear-gradient(135deg, #2F3C96, #253075)",
                                                    }}
                                                    onMouseEnter={(ev) => {
                                                      ev.currentTarget.style.background =
                                                        "linear-gradient(135deg, #253075, #1C2454)";
                                                    }}
                                                    onMouseLeave={(ev) => {
                                                      ev.currentTarget.style.background =
                                                        "linear-gradient(135deg, #2F3C96, #253075)";
                                                    }}
                                                  >
                                                    <Mail className="w-3 h-3" />{" "}
                                                    Contact
                                                  </a>
                                                )}
                                                <button
                                                  onClick={() => {
                                                    const params =
                                                      new URLSearchParams();
                                                    params.set(
                                                      "name",
                                                      e.name || "",
                                                    );
                                                    if (e.affiliation)
                                                      params.set(
                                                        "affiliation",
                                                        e.affiliation,
                                                      );
                                                    if (e.location)
                                                      params.set(
                                                        "location",
                                                        e.location,
                                                      );
                                                    if (e.orcid)
                                                      params.set(
                                                        "orcid",
                                                        e.orcid,
                                                      );
                                                    if (e.biography)
                                                      params.set(
                                                        "biography",
                                                        e.biography,
                                                      );
                                                    if (
                                                      Array.isArray(
                                                        e.researchInterests,
                                                      )
                                                    )
                                                      params.set(
                                                        "researchInterests",
                                                        JSON.stringify(
                                                          e.researchInterests,
                                                        ),
                                                      );
                                                    params.set(
                                                      "from",
                                                      "dashboard",
                                                    );
                                                    navigate(
                                                      `/expert/profile?${params.toString()}`,
                                                    );
                                                  }}
                                                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                                                  style={{
                                                    background:
                                                      "linear-gradient(135deg, #2F3C96, #253075)",
                                                  }}
                                                  onMouseEnter={(ev) => {
                                                    ev.currentTarget.style.background =
                                                      "linear-gradient(135deg, #253075, #1C2454)";
                                                  }}
                                                  onMouseLeave={(ev) => {
                                                    ev.currentTarget.style.background =
                                                      "linear-gradient(135deg, #2F3C96, #253075)";
                                                  }}
                                                >
                                                  View Profile
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    openGlobalExpertDetailsModal(
                                                      e,
                                                    )
                                                  }
                                                  className="p-1.5 rounded-lg border text-slate-600 hover:opacity-90"
                                                  style={{
                                                    borderColor:
                                                      "rgba(208, 196, 226, 0.3)",
                                                    backgroundColor:
                                                      "rgba(208, 196, 226, 0.2)",
                                                  }}
                                                  onMouseEnter={(ev) => {
                                                    ev.currentTarget.style.color =
                                                      "#2F3C96";
                                                  }}
                                                  onMouseLeave={(ev) => {
                                                    ev.currentTarget.style.color =
                                                      "";
                                                  }}
                                                  title="Details"
                                                >
                                                  <Info className="w-3.5 h-3.5" />
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="col-span-full text-center py-16">
                        <div
                          className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                          style={{
                            backgroundColor: "rgba(208, 196, 226, 0.3)",
                          }}
                        >
                          <Users
                            className="w-10 h-10"
                            style={{ color: "#2F3C96" }}
                          />
                        </div>
                        <h3
                          className="text-lg font-semibold mb-2"
                          style={{ color: "#2F3C96" }}
                        >
                          No Health Experts Found
                        </h3>
                        <p
                          className="text-sm max-w-md mx-auto"
                          style={{ color: "#787878" }}
                        >
                          We're searching for relevant experts for you. Check
                          back soon!
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {selectedCategory === "forums" && (
                <div className="col-span-full">
                  {/* Section Title */}
                  <div className="mb-6">
                    <h2
                      className="text-2xl font-bold mb-1"
                      style={{ color: "#2F3C96" }}
                    >
                      Forums
                    </h2>
                    <p className="text-sm" style={{ color: "#787878" }}>
                      Connect with the community and find support
                    </p>
                  </div>

                  {/* Recommended Communities based on your conditions */}
                  <div className="mb-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <h3
                          className="text-base font-semibold mb-1"
                          style={{ color: "#2F3C96" }}
                        >
                          Communities for your conditions
                        </h3>
                        <p
                          className="text-xs md:text-sm"
                          style={{ color: "#787878" }}
                        >
                          Join a community that matches your health interests.
                          You can join and continue the discussion on the full
                          Forums page.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          navigate("/forums", {
                            state: { openView: "communities" },
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-white hover:bg-indigo-50 transition-colors"
                        style={{ borderColor: "#D0C4E2", color: "#2F3C96" }}
                      >
                        View all communities
                      </button>
                    </div>

                    {loadingRecommendedCommunities ? (
                      <div className="mt-4 text-xs text-center text-slate-500">
                        Finding communities that match your conditions...
                      </div>
                    ) : recommendedCommunities.length > 0 ? (
                      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                        {recommendedCommunities.map((community) => (
                          <button
                            key={
                              community._id || community.slug || community.name
                            }
                            type="button"
                            onClick={() =>
                              navigate(`/forums/community/${community._id}`)
                            }
                            className="w-full text-left bg-white/95 rounded-2xl shadow-sm border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col h-full"
                            style={{
                              borderColor: "rgba(208, 196, 226, 0.6)",
                            }}
                          >
                            <div className="p-5 flex items-start gap-4">
                              <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                                style={{
                                  backgroundColor: "rgba(208, 196, 226, 0.35)",
                                }}
                              >
                                <Users
                                  className="w-5 h-5"
                                  style={{ color: "#2F3C96" }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <h4
                                    className="text-sm md:text-base font-semibold truncate"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    {community.name}
                                  </h4>
                                  {community.isFollowing && (
                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-[#2F3C96] shrink-0">
                                      Joined
                                    </span>
                                  )}
                                </div>
                                {community.description && (
                                  <p
                                    className="text-xs md:text-sm text-slate-600 line-clamp-3"
                                    style={{ color: "#787878" }}
                                  >
                                    {community.description}
                                  </p>
                                )}
                                <div className="mt-3 flex items-center gap-2 text-[11px] md:text-xs text-[#787878]">
                                  <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                  <span>
                                    {(
                                      community.memberCount ?? 0
                                    ).toLocaleString()}{" "}
                                    members
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p
                        className="mt-4 text-xs md:text-sm text-center"
                        style={{ color: "#787878" }}
                      >
                        Communities matched to your conditions will appear here
                        once available.
                      </p>
                    )}
                  </div>

                  {/* Forums Grid */}
                  {(() => {
                    const forumsWithThreads = forumsCategories.filter(
                      (category) => (category.threadCount || 0) >= 2,
                    );
                    return forumsWithThreads.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {forumsWithThreads.map((category, idx) => (
                          <div
                            key={category._id || idx}
                            className="bg-white rounded-xl shadow-sm border transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden flex flex-col h-full"
                            style={{
                              borderColor: "rgba(208, 196, 226, 0.3)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow =
                                "0 10px 15px -3px rgba(47, 60, 150, 0.1), 0 4px 6px -2px rgba(47, 60, 150, 0.05)";
                              e.currentTarget.style.borderColor =
                                "rgba(47, 60, 150, 0.4)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow =
                                "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
                              e.currentTarget.style.borderColor =
                                "rgba(208, 196, 226, 0.3)";
                            }}
                          >
                            <div className="p-5 flex flex-col flex-grow">
                              {/* Icon and Title */}
                              <div className="flex items-start gap-3 mb-4">
                                <div
                                  className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                                  style={{
                                    backgroundColor: "rgba(208, 196, 226, 0.3)",
                                  }}
                                >
                                  <MessageCircle
                                    className="w-6 h-6"
                                    style={{ color: "#2F3C96" }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3
                                    className="text-base font-bold mb-1"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    {category.name || "Unnamed Category"}
                                  </h3>
                                  {category.description && (
                                    <p
                                      className="text-sm line-clamp-2"
                                      style={{ color: "#787878" }}
                                    >
                                      {category.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Stats Section */}
                              <div
                                className="flex items-center gap-4 py-3 px-4 rounded-lg mb-4"
                                style={{
                                  backgroundColor: "rgba(245, 242, 248, 0.5)",
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <MessageSquare
                                    className="w-4 h-4"
                                    style={{ color: "#2F3C96" }}
                                  />
                                  <span
                                    className="text-sm font-semibold"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    {category.threadCount || 0}
                                  </span>
                                  <span
                                    className="text-xs"
                                    style={{ color: "#787878" }}
                                  >
                                    {category.threadCount === 1
                                      ? "thread"
                                      : "threads"}
                                  </span>
                                </div>
                                <div
                                  className="w-1 h-1 rounded-full"
                                  style={{
                                    backgroundColor: "rgba(47, 60, 150, 0.3)",
                                  }}
                                ></div>
                                <div className="flex items-center gap-2">
                                  <Users
                                    className="w-4 h-4"
                                    style={{ color: "#2F3C96" }}
                                  />
                                  <span
                                    className="text-xs"
                                    style={{ color: "#787878" }}
                                  >
                                    Active community
                                  </span>
                                </div>
                              </div>

                              {/* Recent Threads */}
                              {forumThreads[category._id] &&
                                forumThreads[category._id].length > 0 && (
                                  <div className="mb-4">
                                    <h4
                                      className="text-xs font-semibold mb-2"
                                      style={{ color: "#2F3C96" }}
                                    >
                                      Recent Discussions
                                    </h4>
                                    <div className="space-y-2">
                                      {forumThreads[category._id].map(
                                        (thread, threadIdx) => (
                                          <div
                                            key={thread._id || threadIdx}
                                            className="p-2 rounded-lg border cursor-pointer hover:shadow-sm transition-all"
                                            style={{
                                              borderColor:
                                                "rgba(208, 196, 226, 0.3)",
                                              backgroundColor:
                                                "rgba(245, 242, 248, 0.3)",
                                            }}
                                            onClick={() =>
                                              navigate(
                                                `/forums?category=${category._id}&thread=${thread._id}`,
                                              )
                                            }
                                            onMouseEnter={(e) => {
                                              e.currentTarget.style.borderColor =
                                                "rgba(47, 60, 150, 0.4)";
                                              e.currentTarget.style.backgroundColor =
                                                "rgba(245, 242, 248, 0.5)";
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.borderColor =
                                                "rgba(208, 196, 226, 0.3)";
                                              e.currentTarget.style.backgroundColor =
                                                "rgba(245, 242, 248, 0.3)";
                                            }}
                                          >
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                              <div
                                                className="text-sm font-medium line-clamp-1 flex-1"
                                                style={{ color: "#2F3C96" }}
                                              >
                                                {thread.title}
                                              </div>
                                              {/* Favorite Button */}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  toggleFavorite(
                                                    "thread",
                                                    thread._id,
                                                    thread,
                                                  );
                                                }}
                                                disabled={favoritingItems.has(
                                                  getFavoriteKey(
                                                    "thread",
                                                    thread._id,
                                                    thread,
                                                  ),
                                                )}
                                                className="shrink-0 p-1.5 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                style={{
                                                  backgroundColor:
                                                    favorites.some(
                                                      (fav) =>
                                                        (fav.type ===
                                                          "thread" ||
                                                          fav.type ===
                                                            "forum") &&
                                                        (fav.item?.id ===
                                                          thread._id ||
                                                          fav.item?._id ===
                                                            thread._id ||
                                                          fav.item?.threadId ===
                                                            thread._id),
                                                    )
                                                      ? "rgba(245, 158, 11, 0.1)"
                                                      : "rgba(245, 242, 248, 0.5)",
                                                  borderColor: favorites.some(
                                                    (fav) =>
                                                      (fav.type === "thread" ||
                                                        fav.type === "forum") &&
                                                      (fav.item?.id ===
                                                        thread._id ||
                                                        fav.item?._id ===
                                                          thread._id ||
                                                        fav.item?.threadId ===
                                                          thread._id),
                                                  )
                                                    ? "rgba(245, 158, 11, 0.3)"
                                                    : "rgba(208, 196, 226, 0.3)",
                                                  color: favorites.some(
                                                    (fav) =>
                                                      (fav.type === "thread" ||
                                                        fav.type === "forum") &&
                                                      (fav.item?.id ===
                                                        thread._id ||
                                                        fav.item?._id ===
                                                          thread._id ||
                                                        fav.item?.threadId ===
                                                          thread._id),
                                                  )
                                                    ? "#F59E0B"
                                                    : "#787878",
                                                }}
                                                onMouseEnter={(e) => {
                                                  if (
                                                    !favorites.some(
                                                      (fav) =>
                                                        (fav.type ===
                                                          "thread" ||
                                                          fav.type ===
                                                            "forum") &&
                                                        (fav.item?.id ===
                                                          thread._id ||
                                                          fav.item?._id ===
                                                            thread._id ||
                                                          fav.item?.threadId ===
                                                            thread._id),
                                                    )
                                                  ) {
                                                    e.currentTarget.style.backgroundColor =
                                                      "rgba(245, 158, 11, 0.1)";
                                                    e.currentTarget.style.borderColor =
                                                      "rgba(245, 158, 11, 0.3)";
                                                    e.currentTarget.style.color =
                                                      "#F59E0B";
                                                  }
                                                }}
                                                onMouseLeave={(e) => {
                                                  if (
                                                    !favorites.some(
                                                      (fav) =>
                                                        (fav.type ===
                                                          "thread" ||
                                                          fav.type ===
                                                            "forum") &&
                                                        (fav.item?.id ===
                                                          thread._id ||
                                                          fav.item?._id ===
                                                            thread._id ||
                                                          fav.item?.threadId ===
                                                            thread._id),
                                                    )
                                                  ) {
                                                    e.currentTarget.style.backgroundColor =
                                                      "rgba(245, 242, 248, 0.5)";
                                                    e.currentTarget.style.borderColor =
                                                      "rgba(208, 196, 226, 0.3)";
                                                    e.currentTarget.style.color =
                                                      "#787878";
                                                  }
                                                }}
                                              >
                                                {favoritingItems.has(
                                                  getFavoriteKey(
                                                    "thread",
                                                    thread._id,
                                                    thread,
                                                  ),
                                                ) ? (
                                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                  <Star
                                                    className={`w-3.5 h-3.5 ${
                                                      favorites.some(
                                                        (fav) =>
                                                          (fav.type ===
                                                            "thread" ||
                                                            fav.type ===
                                                              "forum") &&
                                                          (fav.item?.id ===
                                                            thread._id ||
                                                            fav.item?._id ===
                                                              thread._id ||
                                                            fav.item
                                                              ?.threadId ===
                                                              thread._id),
                                                      )
                                                        ? "fill-current"
                                                        : ""
                                                    }`}
                                                  />
                                                )}
                                              </button>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs">
                                              <div
                                                className="flex items-center gap-1"
                                                style={{ color: "#787878" }}
                                              >
                                                <User className="w-3 h-3" />
                                                <span className="truncate max-w-[80px]">
                                                  {thread.authorUserId
                                                    ?.username || "Anonymous"}
                                                </span>
                                              </div>
                                              <div
                                                className="flex items-center gap-1"
                                                style={{ color: "#787878" }}
                                              >
                                                <MessageSquare className="w-3 h-3" />
                                                <span>
                                                  {thread.replyCount || 0}
                                                </span>
                                              </div>
                                              <div
                                                className="flex items-center gap-1"
                                                style={{ color: "#787878" }}
                                              >
                                                <Clock className="w-3 h-3" />
                                                <span>
                                                  {new Date(
                                                    thread.createdAt,
                                                  ).toLocaleDateString(
                                                    "en-US",
                                                    {
                                                      month: "short",
                                                      day: "numeric",
                                                    },
                                                  )}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}

                              {/* Action Button */}
                              <button
                                onClick={() =>
                                  navigate(`/forums?category=${category._id}`)
                                }
                                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 w-full mt-auto"
                                style={{
                                  background:
                                    "linear-gradient(135deg, #2F3C96, #253075)",
                                  color: "#FFFFFF",
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
                                <span>View Forum</span>
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="col-span-full text-center py-16">
                        <div
                          className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                          style={{
                            backgroundColor: "rgba(208, 196, 226, 0.3)",
                          }}
                        >
                          <MessageCircle
                            className="w-10 h-10"
                            style={{ color: "#2F3C96" }}
                          />
                        </div>
                        <h3
                          className="text-lg font-semibold mb-2"
                          style={{ color: "#2F3C96" }}
                        >
                          No Forums Available
                        </h3>
                        <p
                          className="text-sm max-w-md mx-auto"
                          style={{ color: "#787878" }}
                        >
                          Forums are being set up. Check back soon!
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {selectedCategory === "meetings" && (
                <div className="col-span-full">
                  <div className="rounded-2xl border-2 border-dashed border-indigo-200/80 bg-indigo-50/30 p-8 sm:p-12 text-center">
                    <Calendar
                      className="w-14 h-14 mx-auto mb-4 opacity-60"
                      style={{ color: "#2F3C96" }}
                    />
                    <h3
                      className="text-lg font-bold mb-2"
                      style={{ color: "#2F3C96" }}
                    >
                      Meetings
                    </h3>
                    <p className="text-sm text-slate-600 max-w-sm mx-auto">
                      Your scheduled meetings will appear here. Schedule and
                      manage meetings with experts from your dashboard.
                    </p>
                  </div>
                </div>
              )}

              {selectedCategory === "favorites" && (
                <div className="col-span-full">
                  {favorites.length > 0 ? (
                    (() => {
                      // Group favorites by type
                      const groupedFavorites = {
                        publication: favorites.filter(
                          (f) => f.type === "publication",
                        ),
                        trial: favorites.filter((f) => f.type === "trial"),
                        expert: favorites.filter(
                          (f) =>
                            f.type === "expert" || f.type === "collaborator",
                        ),
                        forum: favorites.filter(
                          (f) => f.type === "forum" || f.type === "thread",
                        ),
                      };

                      const hasAnyFavorites =
                        groupedFavorites.publication.length > 0 ||
                        groupedFavorites.trial.length > 0 ||
                        groupedFavorites.expert.length > 0 ||
                        groupedFavorites.forum.length > 0;

                      const totalSelectedCount =
                        (selectedFavoriteItems.experts?.length || 0) +
                        (selectedFavoriteItems.publications?.length || 0) +
                        (selectedFavoriteItems.trials?.length || 0);

                      return hasAnyFavorites ? (
                        <div className="space-y-8">
                          {/* Selection toolbar */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                            <div
                              className="text-sm"
                              style={{ color: "#787878" }}
                            >
                              {totalSelectedCount > 0 ? (
                                <span>
                                  {totalSelectedCount} item
                                  {totalSelectedCount > 1 ? "s" : ""} selected
                                </span>
                              ) : (
                                <span>
                                  Select favourite trials, publications, or{" "}
                                  {expertsLabel.toLowerCase()} to generate a
                                  summary report.
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={clearFavoriteSelections}
                                disabled={totalSelectedCount === 0}
                                className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border text-slate-600 disabled:opacity-50"
                                style={{
                                  borderColor: "rgba(148, 163, 184, 0.6)",
                                  backgroundColor: "#FFFFFF",
                                }}
                              >
                                Clear selection
                              </button>
                              <button
                                type="button"
                                onClick={generateFavoritesSummaryReport}
                                disabled={totalSelectedCount === 0}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-white disabled:opacity-60"
                                style={{
                                  background:
                                    "linear-gradient(135deg, #2F3C96, #253075)",
                                }}
                                data-tour="dashboard-favorites-generate-summary"
                              >
                                Generate summary
                              </button>
                            </div>
                          </div>

                          {/* Publications Section cards in 3-column grid */}
                          {groupedFavorites.publication.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-8">
                              {groupedFavorites.publication.map((fav) => {
                                const p = fav.item;
                                const isAddedByUrl = fav.addedByUrl === true;
                                return (
                                  <div
                                    key={fav._id}
                                    className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[rgba(208,196,226,0.5)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col h-full"
                                  >
                                    <div className="p-6 flex flex-col flex-grow">
                                      {/* Type badge + selection (same as Favourites tab / Favorites page) */}
                                      <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                                          <span
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
                                            style={{
                                              backgroundColor:
                                                "rgba(47, 60, 150, 0.12)",
                                              color: "#2F3C96",
                                              border:
                                                "1px solid rgba(47, 60, 150, 0.25)",
                                            }}
                                          >
                                            <FileText className="w-3 h-3" />
                                            Publication
                                          </span>
                                          {isAddedByUrl && (
                                            <span className="inline-flex items-center px-2 py-0.5 bg-[rgba(208,196,226,0.4)] text-[#253075] text-xs font-medium rounded-full border border-[rgba(47,60,150,0.2)]">
                                              <LinkIcon className="w-3 h-3 mr-1" />
                                              Added by You
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleFavoriteSelection(fav);
                                            }}
                                            className="p-1.5 rounded-lg transition-colors hover:bg-[rgba(208,196,226,0.2)]"
                                          >
                                            {isFavoriteSelected(fav) ? (
                                              <CheckSquare
                                                className="w-5 h-5"
                                                style={{ color: "#2F3C96" }}
                                              />
                                            ) : (
                                              <Square className="w-5 h-5 text-slate-400" />
                                            )}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              removeFavoriteFromDashboard(fav);
                                            }}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                            title="Remove from favourites"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                      {/* Title */}
                                      <div className="mb-4">
                                        <h3
                                          className="text-lg font-bold mb-0 line-clamp-3 leading-snug flex items-start gap-2"
                                          style={{
                                            color: p.isRead
                                              ? "#D0C4E2"
                                              : "#2F3C96",
                                          }}
                                        >
                                          {p.isRead && (
                                            <CheckCircle
                                              className="w-4 h-4 mt-1 shrink-0"
                                              style={{ color: "#D0C4E2" }}
                                            />
                                          )}
                                          <span className="flex-1">
                                            {simplifiedTitles.get(p.title) ||
                                              p.simplifiedTitle ||
                                              p.title ||
                                              "Untitled Publication"}
                                          </span>
                                        </h3>
                                      </div>
                                      {/* Basic info - authors, year (no journal in favourites) */}
                                      <div className="space-y-1.5 mb-4">
                                        {p.authors &&
                                          Array.isArray(p.authors) &&
                                          p.authors.length > 0 && (
                                            <div
                                              className="flex items-center text-sm"
                                              style={{ color: "#787878" }}
                                            >
                                              <User className="w-3.5 h-3.5 mr-2 shrink-0" />
                                              <span className="line-clamp-1">
                                                {p.authors.join(", ")}
                                              </span>
                                            </div>
                                          )}
                                        {(p.year || p.month) && (
                                          <div
                                            className="flex items-center text-sm"
                                            style={{ color: "#787878" }}
                                          >
                                            <Calendar className="w-3.5 h-3.5 mr-2 shrink-0" />
                                            <span>
                                              {p.month && p.month + " "}
                                              {p.year || ""}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      {/* Abstract preview (same as Favourites tab) */}
                                      {p.abstract && (
                                        <div className="mb-4 flex-grow">
                                          <button
                                            onClick={() =>
                                              openPublicationDetailsModal(p)
                                            }
                                            className="w-full text-left text-sm py-2 px-3 rounded-lg transition-all duration-200 border group"
                                            style={{
                                              backgroundColor:
                                                "rgba(208, 196, 226, 0.2)",
                                              borderColor:
                                                "rgba(47, 60, 150, 0.2)",
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
                                              <Info
                                                className="w-4 h-4 mt-0.5 shrink-0"
                                                style={{ color: "#2F3C96" }}
                                              />
                                              <div className="flex-1 min-w-0">
                                                <span
                                                  className="line-clamp-2"
                                                  style={{ color: "#787878" }}
                                                >
                                                  {p.abstract}
                                                </span>
                                                <div
                                                  className="mt-1.5 flex items-center gap-1 font-medium"
                                                  style={{ color: "#2F3C96" }}
                                                >
                                                  <span>View full details</span>
                                                  <span className="inline-block group-hover:translate-x-0.5 transition-transform">
                                                    →
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          </button>
                                        </div>
                                      )}
                                      {!p.abstract && (
                                        <div className="flex-grow" />
                                      )}
                                      {/* Actions */}
                                      <div className="flex flex-col gap-2 mt-auto">
                                        <button
                                          onClick={() =>
                                            openPublicationDetailsModal(p)
                                          }
                                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all"
                                          style={{
                                            background:
                                              "linear-gradient(135deg, #2F3C96, #253075)",
                                            color: "#FFFFFF",
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.background =
                                              "linear-gradient(135deg, #253075, #1C2454)";
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.background =
                                              "linear-gradient(135deg, #2F3C96, #253075)";
                                          }}
                                        >
                                          Understand this paper
                                        </button>
                                        {(p.pmid || p.id) && (
                                          <Link
                                            to={`/publication/${p.pmid || p.id}`}
                                            className="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium rounded-lg transition-colors"
                                            style={{
                                              color: "#2F3C96",
                                              backgroundColor:
                                                "rgba(208, 196, 226, 0.2)",
                                            }}
                                            onMouseEnter={(e) => {
                                              e.currentTarget.style.backgroundColor =
                                                "rgba(208, 196, 226, 0.3)";
                                              e.currentTarget.style.color =
                                                "#253075";
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.backgroundColor =
                                                "rgba(208, 196, 226, 0.2)";
                                              e.currentTarget.style.color =
                                                "#2F3C96";
                                            }}
                                          >
                                            <ExternalLink className="w-4 h-4" />
                                            View full publication
                                          </Link>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Divider between Publications and Trials */}
                          {groupedFavorites.publication.length > 0 &&
                            groupedFavorites.trial.length > 0 && (
                              <div
                                className="my-8 border-t-2 rounded-full"
                                style={{
                                  borderColor: "rgba(47, 60, 150, 0.25)",
                                }}
                              />
                            )}

                          {/* Trials Section cards in 3-column grid */}
                          {groupedFavorites.trial.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-8">
                              {groupedFavorites.trial.map((fav) => {
                                const t = fav.item;
                                const isAddedByUrl = fav.addedByUrl === true;
                                return (
                                  <div
                                    key={fav._id}
                                    className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[rgba(208,196,226,0.5)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col h-full"
                                  >
                                    <div className="p-6 flex flex-col flex-grow">
                                      {/* Type badge + selection (same as Favourites tab / Favorites page) */}
                                      <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                                          <span
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
                                            style={{
                                              backgroundColor:
                                                "rgba(47, 60, 150, 0.12)",
                                              color: "#2F3C96",
                                              border:
                                                "1px solid rgba(47, 60, 150, 0.25)",
                                            }}
                                          >
                                            <Beaker className="w-3 h-3" />
                                            Trial
                                          </span>
                                          {isAddedByUrl && (
                                            <span className="inline-flex items-center px-2 py-0.5 bg-[rgba(208,196,226,0.4)] text-[#253075] text-xs font-medium rounded-full border border-[rgba(47,60,150,0.2)]">
                                              <LinkIcon className="w-3 h-3 mr-1" />
                                              Added by You
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleFavoriteSelection(fav);
                                            }}
                                            className="p-1.5 rounded-lg transition-colors hover:bg-[rgba(208,196,226,0.2)]"
                                          >
                                            {isFavoriteSelected(fav) ? (
                                              <CheckSquare
                                                className="w-5 h-5"
                                                style={{ color: "#2F3C96" }}
                                              />
                                            ) : (
                                              <Square className="w-5 h-5 text-slate-400" />
                                            )}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              removeFavoriteFromDashboard(fav);
                                            }}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                            title="Remove from favourites"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                      {/* Title (no match bar, conditions, or phase in favourites) */}
                                      <div className="mb-4">
                                        <h3
                                          className="text-lg font-bold mb-0 line-clamp-3 leading-snug flex items-start gap-2"
                                          style={{
                                            color: t.isRead
                                              ? "#D0C4E2"
                                              : "#2F3C96",
                                          }}
                                        >
                                          {t.isRead && (
                                            <CheckCircle
                                              className="w-4 h-4 mt-1 shrink-0"
                                              style={{ color: "#D0C4E2" }}
                                            />
                                          )}
                                          <span className="flex-1">
                                            {simplifiedTrialSummaries.get(
                                              t.title,
                                            ) ||
                                              t.simplifiedTitle ||
                                              t.title ||
                                              "Untitled Trial"}
                                          </span>
                                        </h3>
                                      </div>
                                      {/* Description preview */}
                                      {(t.description ||
                                        t.conditionDescription) && (
                                        <div className="mb-4 flex-grow">
                                          <button
                                            onClick={() =>
                                              openTrialDetailsModal(t)
                                            }
                                            className="w-full text-left text-sm py-2 px-3 rounded-lg transition-all duration-200 border group"
                                            style={{
                                              backgroundColor:
                                                "rgba(208, 196, 226, 0.2)",
                                              borderColor:
                                                "rgba(47, 60, 150, 0.2)",
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
                                              <Info
                                                className="w-4 h-4 mt-0.5 shrink-0"
                                                style={{ color: "#2F3C96" }}
                                              />
                                              <div className="flex-1 min-w-0">
                                                <span
                                                  className="line-clamp-2"
                                                  style={{ color: "#787878" }}
                                                >
                                                  {t.description ||
                                                    t.conditionDescription ||
                                                    "View details for more information"}
                                                </span>
                                                <div
                                                  className="mt-1.5 flex items-center gap-1 font-medium"
                                                  style={{ color: "#2F3C96" }}
                                                >
                                                  <span>Read more details</span>
                                                  <span className="inline-block group-hover:translate-x-0.5 transition-transform">
                                                    →
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          </button>
                                        </div>
                                      )}
                                      {!t.description &&
                                        !t.conditionDescription && (
                                          <div className="flex-grow" />
                                        )}
                                      {/* Action: only Understand this trial (no View Trial Details, no sparkles) */}
                                      <div className="mt-auto">
                                        <button
                                          onClick={() =>
                                            generateSummary(t, "trial")
                                          }
                                          className="w-full flex items-center justify-center gap-2 py-2 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
                                          style={{
                                            background:
                                              "linear-gradient(135deg, #2F3C96, #253075)",
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.background =
                                              "linear-gradient(135deg, #253075, #1C2454)";
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.background =
                                              "linear-gradient(135deg, #2F3C96, #253075)";
                                          }}
                                        >
                                          Understand this trial
                                        </button>
                                      </div>
                                      <button
                                        onClick={() => openContactInfoModal(t)}
                                        className="flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-colors mt-3 w-full"
                                        style={{
                                          color: "#2F3C96",
                                          backgroundColor:
                                            "rgba(208, 196, 226, 0.2)",
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.backgroundColor =
                                            "rgba(208, 196, 226, 0.3)";
                                          e.currentTarget.style.color =
                                            "#253075";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor =
                                            "rgba(208, 196, 226, 0.2)";
                                          e.currentTarget.style.color =
                                            "#2F3C96";
                                        }}
                                      >
                                        <Info className="w-3.5 h-3.5" />
                                        View Contact Information
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Experts Section – same card style as Favorites.jsx + remove option */}
                          {groupedFavorites.expert.length > 0 && (
                            <div>
                              <div className="flex items-center gap-3 my-6">
                                <span
                                  className="text-sm font-medium shrink-0"
                                  style={{ color: "#2F3C96" }}
                                >
                                  Favourite {expertsLabel}
                                </span>
                                <div
                                  className="flex-1 h-px rounded-full"
                                  style={{
                                    backgroundColor: "rgba(47, 60, 150, 0.25)",
                                  }}
                                />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-8">
                                {groupedFavorites.expert.map((fav) => {
                                  const e = fav.item;
                                  const medicalInterests = [
                                    ...(e.specialties || []),
                                    ...(e.interests || []),
                                  ];
                                  return (
                                    <div
                                      key={fav._id}
                                      className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[rgba(208,196,226,0.5)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] overflow-hidden h-full flex flex-col"
                                    >
                                      <div className="p-6 flex flex-col flex-1">
                                        <div className="flex items-start justify-between mb-3">
                                          <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div
                                              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0"
                                              style={{
                                                background:
                                                  "linear-gradient(135deg, #2F3C96, #253075)",
                                              }}
                                            >
                                              {e.name
                                                ?.charAt(0)
                                                ?.toUpperCase() ||
                                                (fav.type === "collaborator"
                                                  ? "C"
                                                  : "E")}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 mb-1">
                                                <User
                                                  className="w-4 h-4 shrink-0"
                                                  style={{ color: "#2F3C96" }}
                                                />
                                                <span
                                                  className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
                                                  style={{
                                                    backgroundColor:
                                                      "rgba(47, 60, 150, 0.12)",
                                                    color: "#2F3C96",
                                                  }}
                                                >
                                                  {fav.type === "collaborator"
                                                    ? "Collaborator"
                                                    : expertLabel}
                                                </span>
                                              </div>
                                              <h3
                                                className="font-bold text-base"
                                                style={{ color: "#2F3C96" }}
                                              >
                                                {e.name ||
                                                  (fav.type === "collaborator"
                                                    ? "Unknown Researcher"
                                                    : `Unknown ${expertLabel}`)}
                                              </h3>
                                              {e.orcid && (
                                                <p
                                                  className="text-xs mt-0.5"
                                                  style={{ color: "#2F3C96" }}
                                                >
                                                  ORCID: {e.orcid}
                                                </p>
                                              )}
                                              {medicalInterests.length > 0 && (
                                                <p
                                                  className="text-xs mt-0.5 line-clamp-1"
                                                  style={{ color: "#787878" }}
                                                >
                                                  {medicalInterests
                                                    .slice(0, 3)
                                                    .join(", ")}
                                                  {medicalInterests.length >
                                                    3 && "..."}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <button
                                              type="button"
                                              onClick={(ev) => {
                                                ev.stopPropagation();
                                                toggleFavoriteSelection(fav);
                                              }}
                                              className="p-1.5 rounded-lg transition-colors hover:bg-[rgba(208,196,226,0.2)]"
                                              title={
                                                isFavoriteSelected(fav)
                                                  ? "Deselect for summary"
                                                  : "Select for summary report"
                                              }
                                            >
                                              {isFavoriteSelected(fav) ? (
                                                <CheckSquare
                                                  className="w-5 h-5"
                                                  style={{ color: "#2F3C96" }}
                                                />
                                              ) : (
                                                <Square className="w-5 h-5 text-slate-400" />
                                              )}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={(ev) => {
                                                ev.stopPropagation();
                                                removeFavoriteFromDashboard(
                                                  fav,
                                                );
                                              }}
                                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                              title="Remove from favourites"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                        <div className="space-y-1 mb-3">
                                          {e.affiliation && (
                                            <p
                                              className="text-xs line-clamp-1"
                                              style={{ color: "#787878" }}
                                            >
                                              {e.affiliation}
                                            </p>
                                          )}
                                          {e.location && (
                                            <div
                                              className="flex items-center text-xs"
                                              style={{ color: "#787878" }}
                                            >
                                              <MapPin className="w-3 h-3 mr-1.5 shrink-0" />
                                              <span>
                                                {typeof e.location === "string"
                                                  ? e.location
                                                  : `${e.location.city || ""}${e.location.city && e.location.country ? ", " : ""}${e.location.country || ""}`}
                                              </span>
                                            </div>
                                          )}
                                          {e.researchInterests?.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                              {e.researchInterests
                                                .slice(0, 3)
                                                .map((interest, idx) => (
                                                  <span
                                                    key={idx}
                                                    className="text-xs px-2 py-0.5 rounded-full"
                                                    style={{
                                                      backgroundColor:
                                                        "rgba(208, 196, 226, 0.4)",
                                                      color: "#253075",
                                                    }}
                                                  >
                                                    {interest}
                                                  </span>
                                                ))}
                                              {e.researchInterests.length >
                                                3 && (
                                                <span
                                                  className="text-xs"
                                                  style={{ color: "#787878" }}
                                                >
                                                  +
                                                  {e.researchInterests.length -
                                                    3}{" "}
                                                  more
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        <button
                                          onClick={() =>
                                            setExpertModal({
                                              open: true,
                                              expert: e,
                                            })
                                          }
                                          className="w-full py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md mt-auto"
                                          style={{
                                            background:
                                              "linear-gradient(135deg, #2F3C96, #253075)",
                                            color: "#FFFFFF",
                                          }}
                                          onMouseEnter={(ev) => {
                                            ev.currentTarget.style.background =
                                              "linear-gradient(135deg, #253075, #1C2454)";
                                          }}
                                          onMouseLeave={(ev) => {
                                            ev.currentTarget.style.background =
                                              "linear-gradient(135deg, #2F3C96, #253075)";
                                          }}
                                        >
                                          View Profile
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Forums Section – same card style as Favorites.jsx + remove option */}
                          {groupedFavorites.forum.length > 0 && (
                            <div>
                              <div className="flex items-center gap-3 my-6">
                                <span
                                  className="text-sm font-medium shrink-0"
                                  style={{ color: "#2F3C96" }}
                                >
                                  Favourite Forums
                                </span>
                                <div
                                  className="flex-1 h-px rounded-full"
                                  style={{
                                    backgroundColor: "rgba(47, 60, 150, 0.25)",
                                  }}
                                />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-8">
                                {groupedFavorites.forum.map((fav) => {
                                  const t = fav.item;
                                  return (
                                    <div
                                      key={fav._id}
                                      className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[rgba(208,196,226,0.5)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] overflow-hidden h-full flex flex-col"
                                    >
                                      <div className="p-6 flex flex-col flex-1">
                                        <div className="flex items-start justify-between mb-3">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                              <MessageCircle
                                                className="w-5 h-5 shrink-0"
                                                style={{ color: "#2F3C96" }}
                                              />
                                              <span
                                                className="px-2 py-0.5 rounded-full text-xs font-medium"
                                                style={{
                                                  backgroundColor:
                                                    "rgba(47, 60, 150, 0.12)",
                                                  color: "#2F3C96",
                                                }}
                                              >
                                                Forum Thread
                                              </span>
                                              {t.categoryName && (
                                                <span
                                                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                                                  style={{
                                                    backgroundColor:
                                                      "rgba(208, 196, 226, 0.4)",
                                                    color: "#253075",
                                                  }}
                                                >
                                                  <Tag className="w-3 h-3 inline mr-1" />
                                                  {t.categoryName}
                                                </span>
                                              )}
                                            </div>
                                            <h3
                                              className="font-bold text-base line-clamp-2 mb-2"
                                              style={{ color: "#2F3C96" }}
                                            >
                                              {t.title || "Untitled Thread"}
                                            </h3>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={(ev) => {
                                              ev.stopPropagation();
                                              removeFavoriteFromDashboard(fav);
                                            }}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                            title="Remove from favourites"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                        <div className="space-y-1 mb-3">
                                          {t.authorName && (
                                            <div
                                              className="flex items-center text-xs"
                                              style={{ color: "#787878" }}
                                            >
                                              <User className="w-3 h-3 mr-1.5 shrink-0" />
                                              <span>By {t.authorName}</span>
                                            </div>
                                          )}
                                          <div
                                            className="flex items-center gap-3 text-xs"
                                            style={{ color: "#787878" }}
                                          >
                                            {t.viewCount !== undefined && (
                                              <div className="flex items-center gap-1">
                                                <Eye className="w-3 h-3" />
                                                <span>
                                                  {t.viewCount || 0} views
                                                </span>
                                              </div>
                                            )}
                                            {t.replyCount !== undefined && (
                                              <div className="flex items-center gap-1">
                                                <MessageCircle className="w-3 h-3" />
                                                <span>
                                                  {t.replyCount || 0} replies
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        {t.body && (
                                          <div className="mb-3">
                                            <p
                                              className="text-xs line-clamp-3"
                                              style={{ color: "#787878" }}
                                            >
                                              {t.body}
                                            </p>
                                          </div>
                                        )}
                                        <button
                                          onClick={() =>
                                            navigate(
                                              `/forums?thread=${t._id || t.id || t.threadId}`,
                                            )
                                          }
                                          className="w-full py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md mt-auto"
                                          style={{
                                            background:
                                              "linear-gradient(135deg, #2F3C96, #253075)",
                                            color: "#FFFFFF",
                                          }}
                                          onMouseEnter={(ev) => {
                                            ev.currentTarget.style.background =
                                              "linear-gradient(135deg, #253075, #1C2454)";
                                          }}
                                          onMouseLeave={(ev) => {
                                            ev.currentTarget.style.background =
                                              "linear-gradient(135deg, #2F3C96, #253075)";
                                          }}
                                        >
                                          View Thread
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="col-span-full text-center py-16">
                          <div
                            className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                            style={{
                              backgroundColor: "rgba(208, 196, 226, 0.3)",
                            }}
                          >
                            <Star
                              className="w-10 h-10"
                              style={{ color: "#2F3C96" }}
                            />
                          </div>
                          <h3
                            className="text-lg font-semibold mb-2"
                            style={{ color: "#2F3C96" }}
                          >
                            No Favourites Yet
                          </h3>
                          <p
                            className="text-sm max-w-md mx-auto"
                            style={{ color: "#787878" }}
                          >
                            Start saving your favorite trials, publications, and
                            experts for easy access later.
                          </p>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="col-span-full text-center py-16">
                      <div
                        className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                        style={{
                          backgroundColor: "rgba(208, 196, 226, 0.3)",
                        }}
                      >
                        <Star
                          className="w-10 h-10"
                          style={{ color: "#2F3C96" }}
                        />
                      </div>
                      <h3
                        className="text-lg font-semibold mb-2"
                        style={{ color: "#2F3C96" }}
                      >
                        No Favourites Yet
                      </h3>
                      <p
                        className="text-sm max-w-md mx-auto"
                        style={{ color: "#787878" }}
                      >
                        Start saving your favorite trials, publications, and
                        experts for easy access later.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trial Details Modal */}
      <Modal
        isOpen={trialDetailsModal.open}
        onClose={closeTrialDetailsModal}
        title="Clinical Trial Details"
      >
        {trialDetailsModal.loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: "#2F3C96" }}
            />
            <span className="ml-3 text-sm" style={{ color: "#787878" }}>
              Loading detailed trial information...
            </span>
          </div>
        ) : trialDetailsModal.trial ? (
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
                    {simplifiedTrialSummaries.get(
                      trialDetailsModal.trial.title,
                    ) ||
                      trialDetailsModal.trial.simplifiedTitle ||
                      trialDetailsModal.trial.title}
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span
                    className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border"
                    style={{
                      backgroundColor: "rgba(209, 211, 229, 1)",
                      color: "#253075",
                      borderColor: "rgba(163, 167, 203, 1)",
                    }}
                  >
                    {trialDetailsModal.trial._id ||
                      trialDetailsModal.trial.id ||
                      "N/A"}
                  </span>
                  {trialDetailsModal.trial.status && (
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        trialDetailsModal.trial.status,
                      )}`}
                    >
                      {trialDetailsModal.trial.status.replace(/_/g, " ")}
                    </span>
                  )}
                  {trialDetailsModal.trial.phase && (
                    <span
                      className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border"
                      style={{
                        backgroundColor: "#F5F5F5",
                        color: "#787878",
                        borderColor: "rgba(232, 232, 232, 1)",
                      }}
                    >
                      Phase {trialDetailsModal.trial.phase}
                    </span>
                  )}
                </div>
              </div>

              {/* 1. Study Purpose */}
              {(trialDetailsModal.trial.simplifiedDetails?.studyPurpose ||
                trialDetailsModal.trial.description ||
                trialDetailsModal.trial.conditionDescription) && (
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
                    Study Purpose
                    {trialDetailsModal.trial.simplifiedDetails
                      ?.studyPurpose && (
                      <span
                        className="text-xs font-normal px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: "rgba(47, 59, 150, 0.1)",
                          color: "#2F3C96",
                        }}
                      >
                        Simplified
                      </span>
                    )}
                  </h4>
                  <p
                    className="text-sm leading-relaxed whitespace-pre-line"
                    style={{ color: "#787878" }}
                  >
                    {trialDetailsModal.trial.simplifiedDetails?.studyPurpose ||
                      trialDetailsModal.trial.description ||
                      trialDetailsModal.trial.conditionDescription}
                  </p>
                </div>
              )}

              {/* 2. Who Can Join (Eligibility) */}
              {(trialDetailsModal.trial.simplifiedDetails
                ?.eligibilityCriteria ||
                trialDetailsModal.trial.eligibility) && (
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
                    Who Can Join (Eligibility)
                    {trialDetailsModal.trial.simplifiedDetails
                      ?.eligibilityCriteria && (
                      <span
                        className="text-xs font-normal px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: "rgba(47, 59, 150, 0.1)",
                          color: "#2F3C96",
                        }}
                      >
                        Simplified
                      </span>
                    )}
                  </h4>

                  {/* Show simplified summary if available */}
                  {trialDetailsModal.trial.simplifiedDetails
                    ?.eligibilityCriteria?.summary && (
                    <div
                      className="bg-white rounded-lg p-4 border mb-4"
                      style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                    >
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "#787878" }}
                      >
                        {
                          trialDetailsModal.trial.simplifiedDetails
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
                        {trialDetailsModal.trial.simplifiedDetails
                          ?.eligibilityCriteria?.gender ||
                          trialDetailsModal.trial.eligibility?.gender ||
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
                        {trialDetailsModal.trial.simplifiedDetails
                          ?.eligibilityCriteria?.ageRange ||
                          (trialDetailsModal.trial.eligibility?.minimumAge !==
                            "Not specified" &&
                          trialDetailsModal.trial.eligibility?.minimumAge
                            ? trialDetailsModal.trial.eligibility.minimumAge
                            : "N/A") +
                            " - " +
                            (trialDetailsModal.trial.eligibility?.maximumAge !==
                              "Not specified" &&
                            trialDetailsModal.trial.eligibility?.maximumAge
                              ? trialDetailsModal.trial.eligibility.maximumAge
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
                        {trialDetailsModal.trial.simplifiedDetails
                          ?.eligibilityCriteria?.volunteers ||
                          trialDetailsModal.trial.eligibility
                            ?.healthyVolunteers ||
                          "Unknown"}
                      </p>
                    </div>
                  </div>

                  {/* Detailed Eligibility Criteria - Show simplified if available */}
                  {(trialDetailsModal.trial.simplifiedDetails
                    ?.eligibilityCriteria?.detailedCriteria ||
                    (trialDetailsModal.trial.eligibility?.criteria &&
                      trialDetailsModal.trial.eligibility.criteria !==
                        "Not specified")) &&
                    (() => {
                      const criteriaText =
                        trialDetailsModal.trial.simplifiedDetails
                          ?.eligibilityCriteria?.detailedCriteria ||
                        trialDetailsModal.trial.eligibility.criteria;
                      const { inclusion, exclusion, hasBoth } =
                        parseEligibilityCriteria(criteriaText);

                      return (
                        <div
                          className="mt-4 pt-4 border-t"
                          style={{ borderColor: "#D0C4E2" }}
                        >
                          {/* Detailed Eligibility Criteria Heading */}
                          <h4
                            className="font-bold mb-4 flex items-center gap-2 text-base"
                            style={{ color: "#2F3C96" }}
                          >
                            <ListChecks className="w-5 h-5" />
                            Detailed Eligibility Criteria
                          </h4>

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
                  {trialDetailsModal.trial.eligibility?.population && (
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
                          {trialDetailsModal.trial.eligibility.population}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Conditions Studied - Show simplified if available */}
              {(trialDetailsModal.trial.simplifiedDetails?.conditionsStudied ||
                (trialDetailsModal.trial.conditions &&
                  trialDetailsModal.trial.conditions.length > 0)) && (
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
                    {trialDetailsModal.trial.simplifiedDetails
                      ?.conditionsStudied && (
                      <span
                        className="text-xs font-normal px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: "rgba(47, 59, 150, 0.1)",
                          color: "#2F3C96",
                        }}
                      >
                        Simplified
                      </span>
                    )}
                  </h4>
                  {trialDetailsModal.trial.simplifiedDetails
                    ?.conditionsStudied ? (
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "#787878" }}
                    >
                      {
                        trialDetailsModal.trial.simplifiedDetails
                          .conditionsStudied
                      }
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {trialDetailsModal.trial.conditions.map(
                        (condition, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 bg-white text-sm font-medium rounded-lg border"
                            style={{ color: "#2F3C96", borderColor: "#D0C4E2" }}
                          >
                            {condition}
                          </span>
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* What to Expect - Show if simplified details available */}
              {trialDetailsModal.trial.simplifiedDetails?.whatToExpect && (
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
                    <span
                      className="text-xs font-normal px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: "rgba(47, 59, 150, 0.1)",
                        color: "#2F3C96",
                      }}
                    >
                      Simplified
                    </span>
                  </h4>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "#787878" }}
                  >
                    {trialDetailsModal.trial.simplifiedDetails.whatToExpect}
                  </p>
                </div>
              )}

              {/* 3. Contact Information */}
              {(trialDetailsModal.trial.simplifiedDetails?.contactInformation ||
                trialDetailsModal.trial.contacts?.length > 0) && (
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
                    {trialDetailsModal.trial.simplifiedDetails
                      ?.contactInformation && (
                      <span
                        className="text-xs font-normal px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: "rgba(47, 59, 150, 0.1)",
                          color: "#2F3C96",
                        }}
                      >
                        Simplified
                      </span>
                    )}
                  </h4>

                  {/* Show simplified contact information if available */}
                  {trialDetailsModal.trial.simplifiedDetails
                    ?.contactInformation && (
                    <div
                      className="bg-white rounded-lg p-4 border mb-4"
                      style={{ borderColor: "rgba(232, 232, 232, 1)" }}
                    >
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "#787878" }}
                      >
                        {
                          trialDetailsModal.trial.simplifiedDetails
                            .contactInformation
                        }
                      </p>
                    </div>
                  )}
                  <div className="space-y-3">
                    {trialDetailsModal.trial.contacts.map((contact, i) => (
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
                    ))}
                  </div>
                </div>
              )}

              {/* Generated Message Section */}
              {trialDetailsModal.generatedMessage && (
                <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-indigo-900">
                      Generated Message
                    </label>
                    <button
                      onClick={copyTrialDetailsMessage}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition-all"
                    >
                      {trialDetailsModal.copied ? (
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
                      {trialDetailsModal.generatedMessage}
                    </p>
                  </div>
                </div>
              )}

              {/* Help me contact Trial Moderator button */}
              {trialDetailsModal.trial.contacts?.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setContactStepsModal({
                        open: true,
                        trial: trialDetailsModal.trial,
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
                {trialDetailsModal.trial.conditions?.length > 0 && (
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
                      {trialDetailsModal.trial.conditions.map(
                        (condition, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 bg-white text-sm font-medium rounded-lg border shadow-sm"
                            style={{ color: "#2F3C96", borderColor: "#D0C4E2" }}
                          >
                            {condition}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Location */}
                {trialDetailsModal.trial.locations &&
                trialDetailsModal.trial.locations.length > 0 ? (
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <h4
                      className="font-bold mb-3 flex items-center gap-2 text-sm"
                      style={{ color: "#2F3C96" }}
                    >
                      <MapPin className="w-4 h-4 text-green-600" />
                      Trial Locations (
                      {trialDetailsModal.trial.locations.length})
                    </h4>
                    <div className="space-y-2">
                      {trialDetailsModal.trial.locations
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
                      {trialDetailsModal.trial.locations.length > 3 && (
                        <div
                          className="text-xs italic"
                          style={{ color: "#787878" }}
                        >
                          + {trialDetailsModal.trial.locations.length - 3} more
                          location(s)
                        </div>
                      )}
                    </div>
                  </div>
                ) : trialDetailsModal.trial.location &&
                  trialDetailsModal.trial.location !== "Not specified" ? (
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
                      {trialDetailsModal.trial.location}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Sticky Footer with Actions */}
            <div
              className=" -bottom-10 px-6 pb-6 pt-4 border-t bg-white/95 backdrop-blur-sm shadow-lg  "
              style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
            >
              <div className="flex flex-col gap-2">
                {(trialDetailsModal.trial?.id ||
                  trialDetailsModal.trial?._id) && (
                  <button
                    onClick={() => {
                      const nctId =
                        trialDetailsModal.trial.id ||
                        trialDetailsModal.trial._id;
                      closeTrialDetailsModal();
                      navigate(`/trial/${nctId}`);
                    }}
                    className="flex items-center justify-center gap-2 py-3 px-4 text-white rounded-lg transition-colors text-sm font-semibold shadow-md hover:shadow-lg w-full"
                    style={{
                      background: "linear-gradient(135deg, #2F3C96, #253075)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "linear-gradient(135deg, #253075, #1C2454)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "linear-gradient(135deg, #2F3C96, #253075)";
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    View full trial
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Favourites summary report modal (mirrors Favourites page behaviour) */}
      {favoritesReportModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() =>
              setFavoritesReportModal({
                open: false,
                loading: false,
                report: null,
              })
            }
          />
          <div
            className="relative z-10 w-full max-w-4xl max-h-[95vh] overflow-hidden bg-white rounded-2xl shadow-2xl"
            style={{
              border: "1px solid rgba(47, 60, 150, 0.2)",
            }}
          >
            <div
              className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b backdrop-blur-sm"
              style={{
                background:
                  "linear-gradient(to right, rgba(208, 196, 226, 0.3), white, rgba(208, 196, 226, 0.3))",
                borderColor: "rgba(47, 60, 150, 0.15)",
              }}
            >
              <h2 className="text-xl font-bold" style={{ color: "#2F3C96" }}>
                Summary Report
              </h2>
              <button
                onClick={() =>
                  setFavoritesReportModal({
                    open: false,
                    loading: false,
                    report: null,
                  })
                }
                className="p-2 rounded-lg transition-all"
                style={{ color: "#787878" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#2F3C96";
                  e.currentTarget.style.backgroundColor = "#F5F5F5";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#787878";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(95vh-80px)]">
              {favoritesReportModal.loading ? (
                <div className="py-12 text-center">
                  <div
                    className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4"
                    style={{
                      borderColor: "#D0C4E2",
                      borderTopColor: "transparent",
                    }}
                  ></div>
                  <p className="font-medium" style={{ color: "#2F3C96" }}>
                    Generating your summary report...
                  </p>
                  <p className="text-sm mt-2" style={{ color: "#787878" }}>
                    This may take a few moments
                  </p>
                </div>
              ) : favoritesReportModal.report ? (
                <div className="space-y-6">
                  {/* Action Buttons - Export PDF */}
                  <div
                    className="flex gap-3 pb-4 border-b"
                    style={{ borderColor: "rgba(47, 60, 150, 0.15)" }}
                  >
                    <button
                      onClick={exportFavoritesSummaryToPDF}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
                      style={{ backgroundColor: "#2F3C96" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#253075")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "#2F3C96")
                      }
                    >
                      <FileText className="w-4 h-4" />
                      Export PDF
                    </button>
                  </div>

                  {/* Report Content */}
                  <div className="space-y-8">
                    {/* Patient Context */}
                    <div
                      className="rounded-xl p-6"
                      style={{
                        background:
                          "linear-gradient(to bottom right, rgba(208, 196, 226, 0.3), rgba(208, 196, 226, 0.15))",
                        border: "1px solid rgba(47, 60, 150, 0.2)",
                      }}
                    >
                      <h3
                        className="text-2xl font-bold mb-4 flex items-center gap-2"
                        style={{ color: "#2F3C96" }}
                      >
                        <User className="w-6 h-6" />
                        Patient Context
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p
                            className="text-sm font-semibold mb-1"
                            style={{ color: "#787878" }}
                          >
                            Patient Name:
                          </p>
                          <p style={{ color: "#2F3C96" }}>
                            {favoritesReportModal.report.patientContext?.name ||
                              "Not specified"}
                          </p>
                        </div>
                        <div>
                          <p
                            className="text-sm font-semibold mb-1"
                            style={{ color: "#787878" }}
                          >
                            Condition:
                          </p>
                          <p style={{ color: "#2F3C96" }}>
                            {
                              favoritesReportModal.report.patientContext
                                ?.condition
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Experts Section */}
                    {favoritesReportModal.report.experts?.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3
                            className="text-lg font-semibold flex items-center gap-2"
                            style={{ color: "#2F3C96" }}
                          >
                            <User className="w-5 h-5" />
                            {expertsLabel} Selected (
                            {favoritesReportModal.report.experts.length})
                          </h3>
                        </div>
                        <ul className="space-y-1 pl-5 list-disc text-sm">
                          {favoritesReportModal.report.experts.map(
                            (expert, idx) => (
                              <li key={idx}>
                                {expert.name || `Unknown ${expertLabel}`}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Publications Section */}
                    {favoritesReportModal.report.publications?.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3
                            className="text-lg font-semibold flex items-center gap-2"
                            style={{ color: "#2F3C96" }}
                          >
                            <FileText className="w-5 h-5" />
                            Health Library Selected (
                            {favoritesReportModal.report.publications.length})
                          </h3>
                        </div>
                        <ul className="space-y-1 pl-5 list-disc text-sm">
                          {favoritesReportModal.report.publications.map(
                            (pub, idx) => (
                              <li key={idx}>
                                {pub.title || "Untitled publication"}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Trials Section */}
                    {favoritesReportModal.report.trials?.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3
                            className="text-lg font-semibold flex items-center gap-2"
                            style={{ color: "#2F3C96" }}
                          >
                            <Beaker className="w-5 h-5" />
                            New Treatments Selected (
                            {favoritesReportModal.report.trials.length})
                          </h3>
                        </div>
                        <ul className="space-y-1 pl-5 list-disc text-sm">
                          {favoritesReportModal.report.trials.map(
                            (trial, idx) => (
                              <li key={idx}>
                                {trial.title || "Untitled trial"}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm" style={{ color: "#787878" }}>
                  No report available.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Publication Key Insights Modal */}
      <Modal
        isOpen={publicationDetailsModal.open}
        onClose={closePublicationDetailsModal}
        title="Key insights"
      >
        {publicationDetailsModal.loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: "#2F3C96" }}
            />
            <span className="ml-3 text-sm" style={{ color: "#787878" }}>
              Loading detailed publication information...
            </span>
          </div>
        ) : (
          publicationDetailsModal.publication && (
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
                    {publicationDetailsModal.publication.simplifiedDetails
                      ?.title ||
                      publicationDetailsModal.publication.simplifiedTitle ||
                      publicationDetailsModal.publication.title}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {publicationDetailsModal.publication.pmid && (
                      <span
                        className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md border"
                        style={{
                          backgroundColor: "rgba(47, 60, 150, 0.15)",
                          color: "#2F3C96",
                          borderColor: "rgba(47, 60, 150, 0.3)",
                        }}
                      >
                        <FileText className="w-3 h-3 mr-1.5" />
                        PMID: {publicationDetailsModal.publication.pmid}
                      </span>
                    )}
                    {publicationDetailsModal.publication.journal && (
                      <span
                        className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md border"
                        style={{
                          backgroundColor: "rgba(208, 196, 226, 0.2)",
                          color: "#787878",
                          borderColor: "rgba(208, 196, 226, 0.3)",
                        }}
                      >
                        <BookOpen className="w-3 h-3 mr-1.5" />
                        {publicationDetailsModal.publication.journal}
                      </span>
                    )}
                  </div>
                </div>

                {/* Abstract Section - Show simplified if available */}
                {(publicationDetailsModal.publication.simplifiedDetails
                  ?.abstract ||
                  publicationDetailsModal.publication.abstract) && (
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
                        <Info className="w-4 h-4" />
                        Abstract
                      </h4>
                      <p
                        className="text-sm leading-relaxed whitespace-pre-wrap"
                        style={{ color: "#787878" }}
                      >
                        {publicationDetailsModal.publication.simplifiedDetails
                          ?.abstract ||
                          publicationDetailsModal.publication.abstract}
                      </p>
                    </div>
                  </div>
                )}

                {/* Methods Section - Show simplified if available */}
                {publicationDetailsModal.publication.simplifiedDetails
                  ?.methods && (
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
                        Methods
                      </h4>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "#787878" }}
                      >
                        {
                          publicationDetailsModal.publication.simplifiedDetails
                            .methods
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Results Section - Show simplified if available */}
                {publicationDetailsModal.publication.simplifiedDetails
                  ?.results && (
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
                        Results
                      </h4>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "#787878" }}
                      >
                        {
                          publicationDetailsModal.publication.simplifiedDetails
                            .results
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Conclusion Section - Show simplified if available */}
                {publicationDetailsModal.publication.simplifiedDetails
                  ?.conclusion && (
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
                        Conclusion
                      </h4>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "#787878" }}
                      >
                        {
                          publicationDetailsModal.publication.simplifiedDetails
                            .conclusion
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Key Takeaways Section - Show simplified if available */}
                {publicationDetailsModal.publication.simplifiedDetails
                  ?.keyTakeaways &&
                  publicationDetailsModal.publication.simplifiedDetails
                    .keyTakeaways.length > 0 && (
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
                          Key Takeaways
                        </h4>
                        <ul className="space-y-2">
                          {publicationDetailsModal.publication.simplifiedDetails.keyTakeaways.map(
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

                {/* What This Means For You Section - Show simplified if available */}
                {publicationDetailsModal.publication.simplifiedDetails
                  ?.whatThisMeansForYou && (
                  <div>
                    <div
                      className="bg-gradient-to-br rounded-xl p-5 border shadow-sm"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(232, 233, 242, 1), rgba(245, 242, 248, 1))",
                        borderColor: "rgba(163, 167, 203, 1)",
                      }}
                    >
                      <h4
                        className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                        style={{ color: "#2F3C96" }}
                      >
                        <Heart className="w-4 h-4" />
                        What This Means For You
                      </h4>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "#787878" }}
                      >
                        {
                          publicationDetailsModal.publication.simplifiedDetails
                            .whatThisMeansForYou
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Authors Section */}
                {publicationDetailsModal.publication.authors &&
                  Array.isArray(publicationDetailsModal.publication.authors) &&
                  publicationDetailsModal.publication.authors.length > 0 && (
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
                          Authors
                        </h4>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {publicationDetailsModal.publication.authors.join(
                            ", ",
                          )}
                        </p>
                        {publicationDetailsModal.publication.authors.length >
                          1 && (
                          <p
                            className="text-xs mt-2"
                            style={{ color: "#787878" }}
                          >
                            {publicationDetailsModal.publication.authors.length}{" "}
                            authors
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
                      Publication Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Publication Date */}
                      {(publicationDetailsModal.publication.year ||
                        publicationDetailsModal.publication.month) && (
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
                              Published
                            </span>
                          </div>
                          <p
                            className="text-sm font-semibold"
                            style={{ color: "#2F3C96" }}
                          >
                            {publicationDetailsModal.publication.month
                              ? `${publicationDetailsModal.publication.month} `
                              : ""}
                            {publicationDetailsModal.publication.day
                              ? `${publicationDetailsModal.publication.day}, `
                              : ""}
                            {publicationDetailsModal.publication.year || "N/A"}
                          </p>
                        </div>
                      )}

                      {/* Volume & Issue */}
                      {(publicationDetailsModal.publication.volume ||
                        publicationDetailsModal.publication.issue) && (
                        <div
                          className="rounded-lg p-3 border"
                          style={{
                            backgroundColor: "rgba(208, 196, 226, 0.1)",
                            borderColor: "rgba(208, 196, 226, 0.3)",
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <BookOpen
                              className="w-3.5 h-3.5"
                              style={{ color: "#787878" }}
                            />
                            <span
                              className="text-xs font-medium uppercase tracking-wide"
                              style={{ color: "#787878" }}
                            >
                              Volume / Issue
                            </span>
                          </div>
                          <p
                            className="text-sm font-semibold"
                            style={{ color: "#2F3C96" }}
                          >
                            {publicationDetailsModal.publication.volume ||
                              "N/A"}
                            {publicationDetailsModal.publication.issue
                              ? ` (Issue ${publicationDetailsModal.publication.issue})`
                              : ""}
                          </p>
                        </div>
                      )}

                      {/* Pages */}
                      {publicationDetailsModal.publication.Pages && (
                        <div
                          className="rounded-lg p-3 border"
                          style={{
                            backgroundColor: "rgba(208, 196, 226, 0.1)",
                            borderColor: "rgba(208, 196, 226, 0.3)",
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <FileText
                              className="w-3.5 h-3.5"
                              style={{ color: "#787878" }}
                            />
                            <span
                              className="text-xs font-medium uppercase tracking-wide"
                              style={{ color: "#787878" }}
                            >
                              Pages
                            </span>
                          </div>
                          <p
                            className="text-sm font-semibold"
                            style={{ color: "#2F3C96" }}
                          >
                            {publicationDetailsModal.publication.Pages}
                          </p>
                        </div>
                      )}

                      {/* Language */}
                      {publicationDetailsModal.publication.language && (
                        <div
                          className="rounded-lg p-3 border"
                          style={{
                            backgroundColor: "rgba(208, 196, 226, 0.1)",
                            borderColor: "rgba(208, 196, 226, 0.3)",
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              className="text-xs font-medium uppercase tracking-wide"
                              style={{ color: "#787878" }}
                            >
                              Language
                            </span>
                          </div>
                          <p
                            className="text-sm font-semibold"
                            style={{ color: "#2F3C96" }}
                          >
                            {publicationDetailsModal.publication.language}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Keywords Section */}
                {publicationDetailsModal.publication.keywords &&
                  publicationDetailsModal.publication.keywords.length > 0 && (
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
                          Keywords
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {publicationDetailsModal.publication.keywords.map(
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

                {/* MeSH Terms Section */}
                {publicationDetailsModal.publication.meshTerms &&
                  publicationDetailsModal.publication.meshTerms.length > 0 && (
                    <div>
                      <div
                        className="bg-white rounded-xl p-5 border shadow-sm"
                        style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                      >
                        <h4
                          className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                          style={{ color: "#2F3C96" }}
                        >
                          <Info className="w-4 h-4" />
                          MeSH Terms
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {publicationDetailsModal.publication.meshTerms
                            .slice(0, 10)
                            .map((term, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1.5 text-xs font-medium rounded-md border"
                                style={{
                                  backgroundColor: "rgba(208, 196, 226, 0.2)",
                                  color: "#787878",
                                  borderColor: "rgba(208, 196, 226, 0.3)",
                                }}
                              >
                                {term}
                              </span>
                            ))}
                          {publicationDetailsModal.publication.meshTerms
                            .length > 10 && (
                            <span
                              className="px-3 py-1.5 text-xs"
                              style={{ color: "#787878" }}
                            >
                              +
                              {publicationDetailsModal.publication.meshTerms
                                .length - 10}{" "}
                              more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                {/* Affiliations Section */}
                {publicationDetailsModal.publication.affiliations &&
                  publicationDetailsModal.publication.affiliations.length >
                    0 && (
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
                          Affiliation
                        </h4>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {publicationDetailsModal.publication.affiliations[0]}
                        </p>
                      </div>
                    </div>
                  )}

                {/* Publication Types */}
                {publicationDetailsModal.publication.publicationTypes &&
                  publicationDetailsModal.publication.publicationTypes.length >
                    0 && (
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
                          Publication Type
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {publicationDetailsModal.publication.publicationTypes.map(
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
                className=" bottom-0 px-6 py-4 border-t bg-white/95 backdrop-blur-sm shadow-lg"
                style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
              >
                <div className="flex flex-wrap gap-3">
                  {(publicationDetailsModal.publication.pmid ||
                    publicationDetailsModal.publication.id ||
                    publicationDetailsModal.publication._id) && (
                    <button
                      onClick={() => {
                        const publicationId =
                          publicationDetailsModal.publication.pmid ||
                          publicationDetailsModal.publication.id ||
                          publicationDetailsModal.publication._id;
                        closePublicationDetailsModal();
                        navigate(`/publication/${publicationId}`);
                      }}
                      className="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                      style={{
                        background: "linear-gradient(135deg, #2F3C96, #253075)",
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
                      View full paper
                    </button>
                  )}
                  <button
                    onClick={() =>
                      toggleFavorite(
                        "publication",
                        publicationDetailsModal.publication.id ||
                          publicationDetailsModal.publication.pmid,
                        publicationDetailsModal.publication,
                      )
                    }
                    disabled={favoritingItems.has(
                      getFavoriteKey(
                        "publication",
                        publicationDetailsModal.publication.id ||
                          publicationDetailsModal.publication.pmid,
                        publicationDetailsModal.publication,
                      ),
                    )}
                    className="px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    style={
                      favorites.some(
                        (fav) =>
                          fav.type === "publication" &&
                          (fav.item?.id ===
                            (publicationDetailsModal.publication.id ||
                              publicationDetailsModal.publication.pmid) ||
                            fav.item?._id ===
                              (publicationDetailsModal.publication.id ||
                                publicationDetailsModal.publication.pmid) ||
                            fav.item?.pmid ===
                              (publicationDetailsModal.publication.id ||
                                publicationDetailsModal.publication.pmid)),
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
                              (publicationDetailsModal.publication.id ||
                                publicationDetailsModal.publication.pmid) ||
                              fav.item?._id ===
                                (publicationDetailsModal.publication.id ||
                                  publicationDetailsModal.publication.pmid) ||
                              fav.item?.pmid ===
                                (publicationDetailsModal.publication.id ||
                                  publicationDetailsModal.publication.pmid)),
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
                              (publicationDetailsModal.publication.id ||
                                publicationDetailsModal.publication.pmid) ||
                              fav.item?._id ===
                                (publicationDetailsModal.publication.id ||
                                  publicationDetailsModal.publication.pmid) ||
                              fav.item?.pmid ===
                                (publicationDetailsModal.publication.id ||
                                  publicationDetailsModal.publication.pmid)),
                        )
                      ) {
                        e.currentTarget.style.backgroundColor =
                          "rgba(208, 196, 226, 0.2)";
                        e.currentTarget.style.color = "#787878";
                      }
                    }}
                  >
                    {favoritingItems.has(
                      getFavoriteKey(
                        "publication",
                        publicationDetailsModal.publication.id ||
                          publicationDetailsModal.publication.pmid,
                        publicationDetailsModal.publication,
                      ),
                    ) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Heart
                        className={`w-4 h-4 ${
                          favorites.some(
                            (fav) =>
                              fav.type === "publication" &&
                              (fav.item?.id ===
                                (publicationDetailsModal.publication.id ||
                                  publicationDetailsModal.publication.pmid) ||
                                fav.item?._id ===
                                  (publicationDetailsModal.publication.id ||
                                    publicationDetailsModal.publication.pmid) ||
                                fav.item?.pmid ===
                                  (publicationDetailsModal.publication.id ||
                                    publicationDetailsModal.publication.pmid)),
                          )
                            ? "fill-current"
                            : ""
                        }`}
                      />
                    )}
                    {favoritingItems.has(
                      getFavoriteKey(
                        "publication",
                        publicationDetailsModal.publication.id ||
                          publicationDetailsModal.publication.pmid,
                        publicationDetailsModal.publication,
                      ),
                    )
                      ? "Processing..."
                      : favorites.some(
                            (fav) =>
                              fav.type === "publication" &&
                              (fav.item?.id ===
                                (publicationDetailsModal.publication.id ||
                                  publicationDetailsModal.publication.pmid) ||
                                fav.item?._id ===
                                  (publicationDetailsModal.publication.id ||
                                    publicationDetailsModal.publication.pmid) ||
                                fav.item?.pmid ===
                                  (publicationDetailsModal.publication.id ||
                                    publicationDetailsModal.publication.pmid)),
                          )
                        ? "Remove from Favourites"
                        : "Add to Favourites"}
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
        onClose={closeModal}
        title="Key Insights"
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
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: "rgba(232, 224, 239, 0.8)",
                  color: "#2F3C96",
                }}
              >
                {summaryModal.type === "trial"
                  ? "Clinical Trial"
                  : "Research Publication"}
              </span>
              {summaryModal.type === "publication" &&
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
                    Simplify further
                  </button>
                )}
              {summaryModal.type === "trial" &&
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
                    Simplify further
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
                  Preparing structured insights…
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
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: "#2F3C96" }}
                    >
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h5
                        className="font-bold text-base mb-2"
                        style={{ color: "#2F3C96" }}
                      >
                        Key Finding
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
                        What This Study Was About
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
                      <Heart className="w-4 h-4" style={{ color: "#2F3C96" }} />
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
                        Why This Research Matters
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
                        How They Did The Study
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
                  className="rounded-lg p-4 border-l-4 shadow-sm hover:shadow-md transition-shadow"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(232, 224, 239, 0.4), rgba(245, 242, 248, 0.6))",
                    borderLeftColor: "#D0C4E2",
                  }}
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
                          style={{ backgroundColor: "#D0C4E2" }}
                        >
                          4
                        </span>
                        What This Means For You
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
                        Remember This
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
          ) : summaryModal.type === "trial" &&
            summaryModal.summary &&
            typeof summaryModal.summary === "object" &&
            summaryModal.summary.structured ? (
            // Structured Trial Summary
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
                      <Info className="w-4 h-4" style={{ color: "#2F3C96" }} />
                    </div>
                    <div className="flex-1">
                      <h5
                        className="font-semibold text-sm mb-2"
                        style={{ color: "#2F3C96" }}
                      >
                        Overview
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
                        What Happens (Procedures, Schedule, Treatments)
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
                        Potential Risks and Benefits
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
                        What Participants Need to Do
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
                style={{ color: "#2F3C96" }}
              >
                {typeof summaryModal.summary === "object"
                  ? summaryModal.summary.summary || "Summary unavailable"
                  : summaryModal.summary || "Summary unavailable"}
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Expert/Researcher Modal */}
      <Modal
        isOpen={expertModal.open}
        onClose={() => setExpertModal({ open: false, expert: null })}
        title={expertModal.expert?.name || "Health Expert"}
      >
        {expertModal.expert && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4 pb-4 border-b border-indigo-200">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md">
                {expertModal.expert.name?.charAt(0)?.toUpperCase() || "E"}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-indigo-900 text-lg mb-1">
                  {expertModal.expert.name || "Unknown Researcher"}
                </h3>
                {expertModal.expert.location && (
                  <div className="flex items-center gap-1 text-sm text-indigo-600 mb-1">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {expertModal.expert.location.city || ""}
                      {expertModal.expert.location.city &&
                        expertModal.expert.location.country &&
                        ", "}
                      {expertModal.expert.location.country || ""}
                    </span>
                  </div>
                )}
                {expertModal.expert.orcid && (
                  <div className="flex items-center gap-1 text-sm text-blue-600">
                    <LinkIcon className="w-4 h-4" />
                    <a
                      href={`https://orcid.org/${expertModal.expert.orcid}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      ORCID: {expertModal.expert.orcid}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Medical Interests */}
            {(() => {
              const interests = [
                ...(expertModal.expert.specialties || []),
                ...(expertModal.expert.interests || []),
              ];
              return interests.length > 0 ? (
                <div>
                  <h4 className="font-semibold text-indigo-700 mb-2">
                    Medical Interests
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {interests.map((interest, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Biography */}
            {expertModal.expert.bio && (
              <div>
                <h4 className="font-semibold text-indigo-700 mb-2">
                  Biography
                </h4>
                <p className="text-sm text-indigo-800 leading-relaxed whitespace-pre-wrap">
                  {expertModal.expert.bio}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-indigo-200">
              <button
                onClick={async () => {
                  const expertId =
                    expertModal.expert._id ||
                    expertModal.expert.userId ||
                    expertModal.expert.id;
                  await toggleFollow(expertId, "researcher");
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all ${
                  followingStatus[
                    expertModal.expert._id ||
                      expertModal.expert.userId ||
                      expertModal.expert.id
                  ]
                    ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-2 border-indigo-300"
                    : "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800"
                }`}
              >
                {followingStatus[
                  expertModal.expert._id ||
                    expertModal.expert.userId ||
                    expertModal.expert.id
                ] ? (
                  <>
                    <Check className="w-4 h-4" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Follow
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setMessageModal({
                    open: true,
                    expert: expertModal.expert,
                    body: "",
                  });
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                Message
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Message Modal */}
      <Modal
        isOpen={messageModal.open}
        onClose={() => setMessageModal({ open: false, expert: null, body: "" })}
        title={`Message ${messageModal.expert?.name || "Expert"}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-indigo-700 mb-2">
              Message
            </label>
            <textarea
              value={messageModal.body}
              onChange={(e) =>
                setMessageModal({ ...messageModal, body: e.target.value })
              }
              rows={6}
              className="w-full px-4 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Type your message here..."
            />
          </div>
          <button
            onClick={sendMessage}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send Message
          </button>
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
        title="Contact Moderator"
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
                Your message has been sent to the moderator. They will get back
                to you soon.
              </p>
            </div>
          ) : (
            <>
              <div className="pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-bold text-slate-900 text-lg">
                    {contactModal.trial?.title || "Trial"}
                  </h4>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Your Message
                  </label>
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
                </div>
                <textarea
                  value={contactModal.message}
                  onChange={(e) =>
                    setContactModal({
                      ...contactModal,
                      message: e.target.value,
                    })
                  }
                  placeholder="Write your message to the moderator here... or click 'Generate Message' to create one automatically"
                  rows="6"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-900 placeholder-slate-400 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSendMessage}
                  disabled={!contactModal.message.trim()}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Message
                </button>
                <button
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
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Contact Information Modal */}
      <Modal
        isOpen={contactInfoModal.open}
        onClose={closeContactInfoModal}
        title="Contact Information"
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

              {contactInfoModal.trial.contacts &&
              contactInfoModal.trial.contacts.length > 0 ? (
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
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Info className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600">
                    No contact information available for this trial.
                  </p>
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
                    e.target.style.backgroundColor = "rgba(208, 196, 226, 0.3)";
                    e.target.style.color = "#253075";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "rgba(208, 196, 226, 0.2)";
                    e.target.style.color = "#2F3C96";
                  }}
                >
                  <Info className="w-4 h-4" />
                  Help me contact Trial Moderator
                </button>
                <button
                  onClick={closeContactInfoModal}
                  className="flex-1 px-6 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
                >
                  Close
                </button>
              </div>
            </>
          ) : null}
        </div>
      </Modal>

      {/* Contact Steps Modal */}
      <Modal
        isOpen={contactStepsModal.open}
        onClose={closeContactStepsModal}
        title="Help me contact Trial Moderator"
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
                <p className="text-xs text-slate-600 mb-3">
                  Trial ID: {contactStepsModal.trial?.id || "N/A"}
                </p>

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
                                    {contactStepsModal.trial.eligibility.gender}
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
                              Eligibility criteria not available. Please review
                              the trial details or contact the trial team
                              directly.
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
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <p className="text-xs text-gray-600">
                              Contact information not available for this trial.
                              Please visit the trial's official page for contact
                              details.
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-slate-600">
                          Save this contact information. You'll need it to send
                          your inquiry email.
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
                        contactStepsModal.currentStep === 3
                          ? "text-indigo-900"
                          : "text-slate-700"
                      }`}
                    >
                      Step 3: Draft Your Email
                    </h3>
                    {contactStepsModal.currentStep === 3 && (
                      <div className="space-y-2 mt-2">
                        {!contactStepsModal.generatedEmail ? (
                          <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                            <p className="text-xs text-slate-700 mb-3">
                              Click the button below to generate a professional
                              email draft for contacting the trial moderator.
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
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  Generate Email Draft
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-semibold text-indigo-900">
                                  Generated Email Draft
                                </label>
                                <div className="flex gap-2">
                                  <button
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
                                        Copy
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
                        )}
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
                                <strong>Wait 1-2 weeks</strong> before following
                                up if you don't receive a response
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
                                <strong>Be patient</strong> - trial coordinators
                                receive many inquiries and may take time to
                                respond
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2
                                className="w-3.5 h-3.5 mt-0.5 shrink-0"
                                style={{ color: "#2F3C96" }}
                              />
                              <span>
                                <strong>Consider calling</strong> if you have
                                the phone number and haven't received a response
                                after 2 weeks
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

      {/* Global Expert Details Modal */}
      <Modal
        isOpen={globalExpertDetailsModal.open}
        onClose={closeGlobalExpertDetailsModal}
        title="Expert Details"
      >
        {globalExpertDetailsModal.expert &&
          (() => {
            const e = globalExpertDetailsModal.expert;
            const isOnPlatform = !!(e._id || e.userId);
            const profile = globalExpertDetailsModal.onPlatformProfile;
            const res = profile?.researcher || {};
            const loading = globalExpertDetailsModal.loadingOnPlatformProfile;
            const locationStr = res.location
              ? typeof res.location === "string"
                ? res.location
                : [res.location.city, res.location.state, res.location.country]
                    .filter(Boolean)
                    .join(", ")
              : e.location
                ? typeof e.location === "string"
                  ? e.location
                  : [e.location?.city, e.location?.country]
                      .filter(Boolean)
                      .join(", ")
                : null;

            if (isOnPlatform) {
              if (loading) {
                return (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2
                      className="w-8 h-8 animate-spin"
                      style={{ color: "#2F3C96" }}
                    />
                    <span className="text-sm text-slate-600">
                      Loading profile...
                    </span>
                  </div>
                );
              }
              return (
                <div className="space-y-5 overflow-y-auto max-h-[calc(90vh-6rem)] pr-1">
                  <div
                    className="pb-4 border-b"
                    style={{ borderColor: "rgba(208, 196, 226, 0.4)" }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0"
                        style={{
                          background:
                            "linear-gradient(135deg, #2F3C96, #253075)",
                        }}
                      >
                        {e.name?.charAt(0)?.toUpperCase() || "E"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 text-lg">
                          {e.name || `Unknown ${expertLabel}`}
                        </h4>
                        {(res.orcid || e.orcid) && (
                          <p
                            className="text-sm font-mono mt-0.5"
                            style={{ color: "#2F3C96" }}
                          >
                            ORCID: {res.orcid || e.orcid}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {(res.profession || res.academicRank) && (
                    <div>
                      <h4
                        className="font-semibold mb-2 flex items-center gap-2"
                        style={{ color: "#2F3C96" }}
                      >
                        <Briefcase className="w-4 h-4 shrink-0" />
                        Position
                      </h4>
                      <p className="text-sm text-slate-700">
                        {[res.profession, res.academicRank]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    </div>
                  )}
                  {res.institutionAffiliation && (
                    <div>
                      <h4
                        className="font-semibold mb-2 flex items-center gap-2"
                        style={{ color: "#2F3C96" }}
                      >
                        <Building2 className="w-4 h-4 shrink-0" />
                        Affiliation
                      </h4>
                      <p className="text-sm text-slate-700">
                        {res.institutionAffiliation}
                      </p>
                    </div>
                  )}
                  {locationStr && (
                    <div>
                      <h4
                        className="font-semibold mb-2 flex items-center gap-2"
                        style={{ color: "#2F3C96" }}
                      >
                        <MapPin className="w-4 h-4 shrink-0" />
                        Location
                      </h4>
                      <p className="text-sm text-slate-700">{locationStr}</p>
                    </div>
                  )}
                  {(res.bio || e.bio) && (
                    <div>
                      <h4
                        className="font-semibold mb-2 flex items-center gap-2"
                        style={{ color: "#2F3C96" }}
                      >
                        <Info className="w-4 h-4 shrink-0" />
                        About
                      </h4>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {res.bio || e.bio}
                      </p>
                    </div>
                  )}
                  {res.available === true && (
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                      style={{
                        backgroundColor: "rgba(208, 196, 226, 0.2)",
                        borderColor: "rgba(208, 196, 226, 0.3)",
                        color: "#2F3C96",
                      }}
                    >
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Available for meetings
                      </span>
                    </div>
                  )}
                  {(res.specialties?.length > 0 ||
                    res.interests?.length > 0) && (
                    <div>
                      <h4
                        className="font-semibold mb-2 flex items-center gap-2"
                        style={{ color: "#2F3C96" }}
                      >
                        <GraduationCap className="w-4 h-4 shrink-0" />
                        Interests &amp; specialties
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {[...(res.specialties || []), ...(res.interests || [])]
                          .filter(Boolean)
                          .map((item, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-3 py-1 rounded-full"
                              style={{
                                backgroundColor: "rgba(208, 196, 226, 0.2)",
                                color: "#2F3C96",
                                border: "1px solid rgba(208, 196, 226, 0.3)",
                              }}
                            >
                              {item}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                  {res.selectedPublications &&
                    res.selectedPublications.length > 0 && (
                      <div>
                        <h4
                          className="font-semibold mb-2 flex items-center gap-2"
                          style={{ color: "#2F3C96" }}
                        >
                          <BookOpen className="w-4 h-4 shrink-0" />
                          Selected publications
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {res.selectedPublications
                            .slice(0, 5)
                            .map((pub, idx) => (
                              <div
                                key={idx}
                                className="p-2 rounded-lg border text-sm"
                                style={{
                                  backgroundColor: "rgba(208, 196, 226, 0.12)",
                                  borderColor: "rgba(208, 196, 226, 0.35)",
                                }}
                              >
                                <p className="font-medium text-slate-900 line-clamp-2">
                                  {pub.title}
                                </p>
                                {(pub.year || pub.journal) && (
                                  <p className="text-xs text-slate-600 mt-0.5">
                                    {[pub.year, pub.journal]
                                      .filter(Boolean)
                                      .join(" • ")}
                                  </p>
                                )}
                              </div>
                            ))}
                          {res.selectedPublications.length > 5 && (
                            <p className="text-xs text-slate-500">
                              +{res.selectedPublications.length - 5} more on
                              full profile
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  <div
                    className="pt-2 border-t"
                    style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                  >
                    <button
                      onClick={() => {
                        closeGlobalExpertDetailsModal();
                        const uid = e._id || e.userId;
                        if (uid) {
                          const params = new URLSearchParams();
                          if (e.name) params.set("name", e.name);
                          if (locationStr) params.set("location", locationStr);
                          if (e.bio) params.set("bio", e.bio);
                          navigate(
                            `/collabiora-expert/profile/${uid}?${params.toString()}`,
                          );
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-white font-medium rounded-xl transition-opacity hover:opacity-90"
                      style={{
                        background: "linear-gradient(135deg, #2F3C96, #253075)",
                      }}
                    >
                      View full profile
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div className="space-y-5 overflow-y-auto max-h-[calc(90vh-6rem)] pr-1">
                {/* Header */}
                <div
                  className="pb-4 border-b"
                  style={{ borderColor: "rgba(208, 196, 226, 0.4)" }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md shrink-0"
                      style={{
                        background: "linear-gradient(135deg, #2F3C96, #253075)",
                      }}
                    >
                      {globalExpertDetailsModal.expert.name
                        ?.charAt(0)
                        ?.toUpperCase() || "E"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4
                        className="font-bold text-slate-900 text-lg"
                        style={{ color: "#1e293b" }}
                      >
                        {globalExpertDetailsModal.expert.name ||
                          `Unknown ${expertLabel}`}
                      </h4>
                      {globalExpertDetailsModal.expert.orcid && (
                        <p
                          className="text-sm font-mono mt-0.5"
                          style={{ color: "#2F3C96" }}
                        >
                          ORCID: {globalExpertDetailsModal.expert.orcid}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {globalExpertDetailsModal.expert.currentPosition && (
                  <div>
                    <h4
                      className="font-semibold mb-2 flex items-center gap-2"
                      style={{ color: "#2F3C96" }}
                    >
                      <Briefcase
                        className="w-4 h-4 shrink-0"
                        style={{ color: "#2F3C96" }}
                      />
                      Current Position
                    </h4>
                    <p className="text-sm text-slate-700">
                      {globalExpertDetailsModal.expert.currentPosition}
                    </p>
                  </div>
                )}

                {globalExpertDetailsModal.expert.affiliation && (
                  <div>
                    <h4
                      className="font-semibold mb-2 flex items-center gap-2"
                      style={{ color: "#2F3C96" }}
                    >
                      <Building2
                        className="w-4 h-4 shrink-0"
                        style={{ color: "#2F3C96" }}
                      />
                      Affiliation
                    </h4>
                    <p className="text-sm text-slate-700">
                      {globalExpertDetailsModal.expert.affiliation}
                    </p>
                  </div>
                )}

                {globalExpertDetailsModal.expert.education && (
                  <div>
                    <h4
                      className="font-semibold mb-2 flex items-center gap-2"
                      style={{ color: "#2F3C96" }}
                    >
                      <GraduationCap
                        className="w-4 h-4 shrink-0"
                        style={{ color: "#2F3C96" }}
                      />
                      Education
                    </h4>
                    <p className="text-sm text-slate-700">
                      {globalExpertDetailsModal.expert.education}
                    </p>
                  </div>
                )}

                {(globalExpertDetailsModal.expert.age ||
                  globalExpertDetailsModal.expert.yearsOfExperience) && (
                  <div>
                    <h4
                      className="font-semibold mb-2 flex items-center gap-2"
                      style={{ color: "#2F3C96" }}
                    >
                      <Calendar
                        className="w-4 h-4 shrink-0"
                        style={{ color: "#2F3C96" }}
                      />
                      Age & Experience
                    </h4>
                    <div className="text-sm text-slate-700 space-y-1">
                      {globalExpertDetailsModal.expert.age && (
                        <p>
                          <strong>Age:</strong>{" "}
                          {globalExpertDetailsModal.expert.age}
                        </p>
                      )}
                      {globalExpertDetailsModal.expert.yearsOfExperience && (
                        <p>
                          <strong>Experience:</strong>{" "}
                          {globalExpertDetailsModal.expert.yearsOfExperience}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {globalExpertDetailsModal.expert.location && (
                  <div>
                    <h4
                      className="font-semibold mb-2 flex items-center gap-2"
                      style={{ color: "#2F3C96" }}
                    >
                      <MapPin
                        className="w-4 h-4 shrink-0"
                        style={{ color: "#2F3C96" }}
                      />
                      Location
                    </h4>
                    <p className="text-sm text-slate-700">
                      {globalExpertDetailsModal.expert.location}
                    </p>
                  </div>
                )}

                {globalExpertDetailsModal.expert.biography && (
                  <div>
                    <h4
                      className="font-semibold mb-2 flex items-center gap-2"
                      style={{ color: "#2F3C96" }}
                    >
                      <Info
                        className="w-4 h-4 shrink-0"
                        style={{ color: "#2F3C96" }}
                      />
                      Biography
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {globalExpertDetailsModal.expert.biography}
                    </p>
                  </div>
                )}

                {globalExpertDetailsModal.expert.specialties &&
                  Array.isArray(globalExpertDetailsModal.expert.specialties) &&
                  globalExpertDetailsModal.expert.specialties.length > 0 && (
                    <div>
                      <h4
                        className="font-semibold mb-2 flex items-center gap-2"
                        style={{ color: "#2F3C96" }}
                      >
                        <GraduationCap
                          className="w-4 h-4 shrink-0"
                          style={{ color: "#2F3C96" }}
                        />
                        Specialties
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {globalExpertDetailsModal.expert.specialties.map(
                          (specialty, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-3 py-1 rounded-full"
                              style={{
                                backgroundColor: "rgba(208, 196, 226, 0.2)",
                                color: "#2F3C96",
                                border: "1px solid rgba(208, 196, 226, 0.3)",
                              }}
                            >
                              {specialty}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {globalExpertDetailsModal.expert.researchInterests &&
                  Array.isArray(
                    globalExpertDetailsModal.expert.researchInterests,
                  ) &&
                  globalExpertDetailsModal.expert.researchInterests.length >
                    0 && (
                    <div>
                      <h4
                        className="font-semibold mb-2 flex items-center gap-2"
                        style={{ color: "#2F3C96" }}
                      >
                        <GraduationCap
                          className="w-4 h-4 shrink-0"
                          style={{ color: "#2F3C96" }}
                        />
                        Research Interests
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {globalExpertDetailsModal.expert.researchInterests.map(
                          (interest, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-3 py-1 rounded-full"
                              style={{
                                backgroundColor: "rgba(208, 196, 226, 0.2)",
                                color: "#2F3C96",
                                border: "1px solid rgba(208, 196, 226, 0.3)",
                              }}
                            >
                              {interest}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {globalExpertDetailsModal.expert.achievements && (
                  <div>
                    <h4
                      className="font-semibold mb-2 flex items-center gap-2"
                      style={{ color: "#2F3C96" }}
                    >
                      <Award
                        className="w-4 h-4 shrink-0"
                        style={{ color: "#2F3C96" }}
                      />
                      Achievements
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {globalExpertDetailsModal.expert.achievements}
                    </p>
                  </div>
                )}

                {/* Publications - loaded automatically when modal opens */}
                {(() => {
                  const expertId =
                    globalExpertDetailsModal.expert.name ||
                    globalExpertDetailsModal.expert.id ||
                    globalExpertDetailsModal.expert._id;
                  const expertPublications =
                    globalExpertPublications[expertId] || [];
                  const isLoadingPubs =
                    loadingGlobalExpertPublications[expertId];

                  return (
                    <div>
                      <h4
                        className="font-semibold mb-2 flex items-center gap-2 text-slate-800"
                        style={{ color: "#2F3C96" }}
                      >
                        <BookOpen
                          className="w-4 h-4 shrink-0"
                          style={{ color: "#2F3C96" }}
                        />
                        From Health Library
                      </h4>
                      {isLoadingPubs && expertPublications.length === 0 && (
                        <div
                          className="flex items-center justify-center gap-2 py-6 rounded-xl"
                          style={{
                            backgroundColor: "rgba(208, 196, 226, 0.15)",
                            border: "1px dashed rgba(208, 196, 226, 0.4)",
                          }}
                        >
                          <Loader2
                            className="w-5 h-5 animate-spin"
                            style={{ color: "#2F3C96" }}
                          />
                          <span
                            className="text-sm"
                            style={{ color: "#2F3C96" }}
                          >
                            Loading publications...
                          </span>
                        </div>
                      )}
                      {!isLoadingPubs && expertPublications.length === 0 && (
                        <p className="text-sm text-slate-500 italic py-2">
                          No publications found for this researcher.
                        </p>
                      )}
                      {expertPublications.length > 0 && (
                        <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                          {expertPublications.map((pub, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-lg border transition-all hover:shadow-sm"
                              style={{
                                backgroundColor: "rgba(208, 196, 226, 0.12)",
                                borderColor: "rgba(208, 196, 226, 0.35)",
                              }}
                            >
                              <a
                                href={pub.link || "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm font-medium text-slate-900 block mb-1 hover:underline"
                                style={{ color: "#1e293b" }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = "#2F3C96";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = "#1e293b";
                                }}
                              >
                                {pub.title}
                              </a>
                              {pub.snippet && (
                                <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                                  {pub.snippet}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-600">
                                {pub.year && (
                                  <span
                                    style={{
                                      color: "#2F3C96",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {pub.year}
                                  </span>
                                )}
                                {pub.citations > 0 && (
                                  <span>• {pub.citations} citations</span>
                                )}
                                {pub.publication && (
                                  <span>• {pub.publication}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Contact Information */}
                <div
                  className="pt-2 border-t"
                  style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                >
                  <h4
                    className="font-semibold mb-2 text-slate-800"
                    style={{ color: "#2F3C96" }}
                  >
                    Contact Information
                  </h4>
                  <div className="space-y-2">
                    {globalExpertDetailsModal.expert.email && (
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Mail
                          className="w-4 h-4 shrink-0"
                          style={{ color: "#2F3C96" }}
                        />
                        <a
                          href={`mailto:${globalExpertDetailsModal.expert.email}`}
                          onClick={() =>
                            toast.success("Message sent successfully!")
                          }
                          className="hover:underline transition-colors"
                          style={{ color: "#2F3C96" }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "#253075";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "#2F3C96";
                          }}
                        >
                          {globalExpertDetailsModal.expert.email}
                        </a>
                      </div>
                    )}
                    {globalExpertDetailsModal.expert.orcidUrl && (
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <LinkIcon
                          className="w-4 h-4 shrink-0"
                          style={{ color: "#2F3C96" }}
                        />
                        <a
                          href={globalExpertDetailsModal.expert.orcidUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline transition-colors"
                          style={{ color: "#2F3C96" }}
                        >
                          View ORCID Profile
                        </a>
                      </div>
                    )}
                    {!globalExpertDetailsModal.expert.email && (
                      <p className="text-xs text-slate-500 italic">
                        Email not publicly available
                      </p>
                    )}
                  </div>
                </div>

                {globalExpertDetailsModal.expert.orcidUrl && (
                  <a
                    href={globalExpertDetailsModal.expert.orcidUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 text-sm text-white font-medium rounded-xl transition-opacity hover:opacity-90"
                    style={{
                      background: "linear-gradient(135deg, #2F3C96, #253075)",
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Full ORCID Profile
                  </a>
                )}
              </div>
            );
          })()}
      </Modal>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
      <ScrollToTop />

      {/* Verify Email Modal */}
      <VerifyEmailModal
        isOpen={verifyEmailModalOpen}
        onClose={() => {
          setVerifyEmailModalOpen(false);
          // Clear token from URL if present
          const url = new URL(window.location);
          if (url.searchParams.has("token")) {
            url.searchParams.delete("token");
            window.history.replaceState({}, "", url);
          }
        }}
        onVerified={() => {
          // Refresh user data
          const updatedUser = JSON.parse(localStorage.getItem("user") || "{}");
          setUser(updatedUser);
          setVerifyEmailModalOpen(false);
        }}
      />
    </div>
  );
}
