import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Users,
  FileText,
  Beaker,
  Star,
  MessageCircle,
  User,
  Sparkles,
  Heart,
  MapPin,
  Link as LinkIcon,
  Calendar as CalendarIcon,
  MoreVertical,
  Info,
  Calendar,
  ExternalLink,
  BookOpen,
  UserPlus,
  Check,
  Bell,
  Send,
  Filter,
  Edit3,
  Briefcase,
  Building2,
  Mail,
  Activity,
  ListChecks,
  CheckCircle,
  TrendingUp,
  GraduationCap,
  Award,
  Loader2,
  AlertCircle,
  MessageSquare,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle2,
  Phone,
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
import ScrollToTop from "../components/ui/ScrollToTop.jsx";
import VerifyEmailModal from "../components/VerifyEmailModal.jsx";
import ManageProfilePublications from "../components/ManageProfilePublications.jsx";
import { listenForMessages } from "../utils/crossTabSync.js";
import { parseEligibilityCriteria } from "../utils/parseEligibilityCriteria.js";
import { getDisplayName } from "../utils/researcherDisplayName.js";
import { pdf } from "@react-pdf/renderer";
import PDFReportDocument from "../components/PDFReportDocument.jsx";
import PageTutorial, {
  useTutorialCompleted,
  resetTutorialCompleted,
} from "../components/PageTutorial.jsx";
import SmartSearchInput from "../components/SmartSearchInput.jsx";
import icd11Dataset from "../data/icd11Dataset.json";

export default function DashboardResearcher() {
  const [data, setData] = useState({
    trials: [],
    publications: [],
    experts: [], // Collabiora Experts (from recommendations)
  });
  const [globalExperts, setGlobalExperts] = useState([]); // Global Experts (from external search, loaded on initial page load)
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Researcher dashboard always shows "Collaborators" instead of "Experts"
  const expertLabel = "Collaborator";
  const expertsLabel = "Collaborators";
  const [isFirstLoad, setIsFirstLoad] = useState(true); // Track if this is the first load (cache miss)
  const [selectedCategory, setSelectedCategory] = useState("profile"); // "profile", "collaborators", "forums", "publications", "trials", "favorites"
  const [trialFilter, setTrialFilter] = useState("RECRUITING"); // Status filter for trials - default to RECRUITING
  const [forumsCategories, setForumsCategories] = useState([]);
  const [forumThreads, setForumThreads] = useState({}); // Map of categoryId to threads array
  const [recommendedCommunities, setRecommendedCommunities] = useState([]);
  const [loadingRecommendedCommunities, setLoadingRecommendedCommunities] =
    useState(false);
  const [publicationSort, setPublicationSort] = useState("relevance"); // Sort option for publications
  const [simplifiedTitles, setSimplifiedTitles] = useState(new Map()); // Cache of simplified publication titles
  const [simplifiedTrialSummaries, setSimplifiedTrialSummaries] = useState(
    new Map(),
  ); // Cache of simplified trial titles/summaries
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [loadingFiltered, setLoadingFiltered] = useState(false);
  const [favoritingItems, setFavoritingItems] = useState(new Set()); // Track items being favorited/unfavorited
  const [isProfileBannerExpanded, setIsProfileBannerExpanded] = useState(false); // For mobile collapsible profile banner
  const [isEmploymentExpanded, setIsEmploymentExpanded] = useState(false); // For mobile collapsible employment history
  const [isPublicationsExpanded, setIsPublicationsExpanded] = useState(false); // For mobile collapsible publications
  const [userProfile, setUserProfile] = useState(null);
  const [verifyEmailModalOpen, setVerifyEmailModalOpen] = useState(false);
  const [showManagePublications, setShowManagePublications] = useState(false);
  const [summaryModal, setSummaryModal] = useState({
    open: false,
    title: "",
    type: "",
    summary: "",
    loading: false,
    isSimplified: false,
    originalSummary: null,
    originalItem: null,
  });
  const [collaboratorModal, setCollaboratorModal] = useState({
    open: false,
    collaborator: null,
  });
  const [connectionRequestModal, setConnectionRequestModal] = useState({
    open: false,
    message: "",
    collaborator: null,
  });
  const [connectionRequestStatus, setConnectionRequestStatus] = useState({});
  const [messageModal, setMessageModal] = useState({
    open: false,
    collaborator: null,
    body: "",
  });
  const [followingStatus, setFollowingStatus] = useState({});
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
  const [showOnPlatformCollaborators, setShowOnPlatformCollaborators] =
    useState(false); // Dropdown for on-platform collaborators (collapsed by default)
  const [showGlobalCollaborators, setShowGlobalCollaborators] = useState(true); // Dropdown for global collaborators (expanded by default)
  const [favorites, setFavorites] = useState([]);
  const [selectedFavoriteItems, setSelectedFavoriteItems] = useState({
    publications: [],
    trials: [],
    experts: [],
  });
  const [favoritesReportModal, setFavoritesReportModal] = useState({
    open: false,
    loading: false,
    report: null,
  });
  const [insights, setInsights] = useState({ unreadCount: 0 });
  const [orcidStats, setOrcidStats] = useState(null);
  const [loadingOrcidStats, setLoadingOrcidStats] = useState(false);
  const [orcidError, setOrcidError] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [interestsDraft, setInterestsDraft] = useState([]);
  const [primaryIndicesDraft, setPrimaryIndicesDraft] = useState([]);
  const [newInterestInput, setNewInterestInput] = useState("");
  const [savingInterests, setSavingInterests] = useState(false);
  const [editInterestsModalOpen, setEditInterestsModalOpen] = useState(false);

  // ICD-11 suggestion terms for research interests (same dataset as Publications.jsx)
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
        if (Array.isArray(item.research_interests)) {
          item.research_interests.forEach((term) => {
            if (typeof term === "string" && term.trim())
              termsSet.add(term.trim());
          });
        }
      });
    }
    return Array.from(termsSet);
  }, []);

  const [refreshingSection, setRefreshingSection] = useState(null);
  const [refreshingSectionsBg, setRefreshingSectionsBg] = useState(new Set());
  const navigate = useNavigate();
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const { updateProfileSignature, markDataFetched, generateProfileSignature } =
    useProfile();

  // Dashboard tutorial (Yori's tour) - show only first time or when user clicks "View tutorial"
  const dashboardTutorialCompleted = useTutorialCompleted(
    "dashboard-researcher",
  );
  const [forceShowTutorial, setForceShowTutorial] = useState(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [pastAppointments, setPastAppointments] = useState([]);
  const [pendingMeetingRequests, setPendingMeetingRequests] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const showDashboardTutorial =
    (forceShowTutorial || !dashboardTutorialCompleted) &&
    !loading &&
    user != null;

  const DASHBOARD_RESEARCHER_STEP_RECOMMENDATIONS = 1;
  const DASHBOARD_RESEARCHER_STEP_PUBLICATIONS_TAB = 3;
  const DASHBOARD_RESEARCHER_STEP_PUBLICATION_CARD = 4;
  const DASHBOARD_RESEARCHER_STEP_FAVOURITES = 8;
  const DASHBOARD_RESEARCHER_STEP_YORI = 10;

  const DASHBOARD_RESEARCHER_TOUR_SELECTORS = [
    "[data-tour='dashboard-researcher-tabs']",
    "[data-tour='dashboard-researcher-recommendations']",
    "[data-tour='dashboard-researcher-interests-bar']",
    "[data-tour='dashboard-researcher-tab-publications']",
    "[data-tour='dashboard-researcher-publication-card']",
    "[data-tour='nav-explore']",
    "[data-tour='nav-forums']",
    "[data-tour='dashboard-researcher-tabs']",
    "[data-tour='dashboard-researcher-tab-favorites']",
    "[data-tour='dashboard-researcher-favorites-generate-summary']",
    "[data-tour='yori-chatbot']",
  ];

  const handleDashboardResearcherTutorialStepChange = useCallback(
    (stepIndex) => {
      if (stepIndex === DASHBOARD_RESEARCHER_STEP_RECOMMENDATIONS) {
        setSelectedCategory("collaborators");
      } else if (stepIndex === DASHBOARD_RESEARCHER_STEP_PUBLICATIONS_TAB) {
        setSelectedCategory("publications");
      } else if (stepIndex === DASHBOARD_RESEARCHER_STEP_FAVOURITES) {
        setSelectedCategory("favorites");
      } else if (stepIndex === DASHBOARD_RESEARCHER_STEP_PUBLICATION_CARD) {
        setSelectedCategory("publications");
        requestAnimationFrame(() => {
          setTimeout(() => {
            const el = document.querySelector(
              "[data-tour='dashboard-researcher-publication-card']",
            );
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 80);
        });
      }
      const stepsNeedingScroll = [6, 7, 8, 9, 10];
      if (stepsNeedingScroll.includes(stepIndex)) {
        const selector =
          DASHBOARD_RESEARCHER_TOUR_SELECTORS[stepIndex] ||
          "[data-tour='dashboard-researcher-tabs']";
        requestAnimationFrame(() => {
          setTimeout(() => {
            const el = document.querySelector(selector);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 80);
        });
      }
    },
    [],
  );

  const DASHBOARD_RESEARCHER_TUTORIAL_STEPS = useMemo(
    () => [
      {
        target: "[data-tour='dashboard-researcher-tabs']",
        title: "Dashboard sections",
        content:
          "Hi! I'm Yori. This is your researcher dashboard. Use these blocks to switch between Your Profile, Collaborators, Forums, Publications, Clinical Trials, Favourites, and Meetings.",
        placement: "bottom",
      },
      {
        target: "[data-tour='dashboard-researcher-recommendations']",
        title: "Personalized recommendations",
        content:
          "Your personalized recommendations appear here—publications, trials, and collaborators tailored to your research interests. You can edit your interests and refresh to get new results.",
        placement: "bottom",
      },
      {
        target: "[data-tour='dashboard-researcher-interests-bar']",
        title: "Research interests & refresh",
        content:
          "Edit your research interests here to personalize your feed. Use Refresh to fetch new recommendations based on your updated profile.",
        placement: "bottom",
      },
      {
        target: "[data-tour='dashboard-researcher-tab-publications']",
        title: "Publications tab",
        content:
          "Switch to the Publications tab to see recommended papers. We'll show you a card and how to view its details.",
        placement: "bottom",
      },
      {
        target: "[data-tour='dashboard-researcher-publication-card']",
        title: "View details for a card",
        content:
          "In the publications section, use 'View full details' or 'Understand this Paper' on any card to read more. This opens the full abstract and key takeaways.",
        placement: "top",
      },
      {
        target: "[data-tour='nav-explore']",
        title: "Explore tab in the navbar",
        content:
          "Use the Explore menu to search clinical trials, publications, and experts from one place. It's your gateway to discovering new research.",
        placement: "bottom",
      },
      {
        target: "[data-tour='nav-forums']",
        title: "Forums and Discovery",
        content:
          "Forums lets you join community discussions. Discovery is the next link to the right in the navbar, it shows a feed of activity across the platform.",
        placement: "bottom",
      },
      {
        target: "[data-tour='dashboard-researcher-tabs']",
        title: "Dashboard tabs",
        content:
          "Switch between Your Profile, Collaborators, Forums, Publications, Clinical Trials, and Favourites. Your saved items are in Favourites.",
        placement: "bottom",
      },
      {
        target: "[data-tour='dashboard-researcher-tab-favorites']",
        title: "Favourites tab",
        content:
          "Open Favourites to see your saved trials, publications, and collaborators. You can generate a summary report from your selection.",
        placement: "bottom",
      },
      {
        target: "[data-tour='dashboard-researcher-favorites-generate-summary']",
        title: "Generating a summary",
        content:
          "Select items from your favourites, then click Generate summary to create a personalized report. You can export it as PDF.",
        placement: "top",
      },
      {
        target: "[data-tour='yori-chatbot']",
        title: "Meet Yori!",
        content:
          "That's me! Click anytime to ask questions about trials, publications, or your dashboard. I'm here to help with your research.",
        placement: "left",
      },
    ],
    [],
  );

  // Fetch ORCID stats
  const fetchOrcidStats = async (orcidId, userId) => {
    if (!orcidId || !userId) return;

    setLoadingOrcidStats(true);
    setOrcidError(null);
    try {
      // Use the collabiora-expert/profile endpoint which fetches ORCID data
      const response = await fetch(
        `${base}/api/collabiora-expert/profile/${userId}`,
      );
      if (response.ok) {
        const data = await response.json();
        const orcidId = data.profile?.orcid || data.profile?.orcidId;
        if (orcidId) {
          const publications =
            data.profile?.publications || data.profile?.works || [];
          const totalWorks = data.profile.totalWorks || publications.length;
          const hasBiography = !!data.profile.biography;
          const hasAffiliation = !!data.profile.affiliation;
          const hasCurrentPosition = !!data.profile.currentPosition;
          const hasEmployments =
            data.profile.employments && data.profile.employments.length > 0;
          const hasEducations =
            data.profile.educations && data.profile.educations.length > 0;

          // Check if ORCID profile is invalid - if we have an ORCID ID but no data at all
          // (no publications, no biography, no employment, no education, etc.)
          const hasNoData =
            !totalWorks &&
            !hasBiography &&
            !hasAffiliation &&
            !hasCurrentPosition &&
            !hasEmployments &&
            !hasEducations &&
            !data.profile.location &&
            (!data.profile.researchInterests ||
              data.profile.researchInterests.length === 0);

          if (hasNoData) {
            // Invalid ORCID - no data found
            setOrcidError("not_found");
            setOrcidStats(null);
          } else {
            // Sort publications by year (most recent first)
            const sortedPublications = [...publications].sort((a, b) => {
              const yearA = a.year || 0;
              const yearB = b.year || 0;
              return yearB - yearA;
            });

            // Format location - handle both string and object formats
            let locationText = null;
            if (data.profile.location) {
              if (typeof data.profile.location === "string") {
                locationText = data.profile.location;
              } else if (
                data.profile.location.city ||
                data.profile.location.country
              ) {
                locationText = [
                  data.profile.location.city,
                  data.profile.location.country,
                ]
                  .filter(Boolean)
                  .join(", ");
              }
            }

            setOrcidStats({
              orcidId: orcidId,
              orcidUrl: `https://orcid.org/${orcidId}`,
              totalPublications: totalWorks,
              recentPublications: sortedPublications.slice(0, 5), // Top 5 most recent
              impactMetrics: data.profile.impactMetrics || {
                totalPublications: totalWorks,
                hIndex: 0,
                totalCitations: 0,
                maxCitations: 0,
              },
              affiliation: data.profile.affiliation || null,
              currentPosition: data.profile.currentPosition || null,
              location: locationText,
              biography: data.profile.biography || null,
              researchInterests: data.profile.researchInterests || [],
              externalLinks: data.profile.externalLinks || {},
              // Additional ORCID data
              employments: data.profile.employments || [],
              educations: data.profile.educations || [],
              fundings: data.profile.fundings || [],
              totalFundings: data.profile.totalFundings || 0,
              totalPeerReviews: data.profile.totalPeerReviews || 0,
              country: data.profile.country || null,
            });
          }
        }
      } else {
        // Check for 404 error specifically
        if (response.status === 404) {
          try {
            const errorData = await response.json();
            const errorMessage =
              errorData.error || errorData.message || response.statusText || "";
            if (
              errorMessage.toLowerCase().includes("404") ||
              errorMessage.toLowerCase().includes("not found") ||
              errorMessage.toLowerCase().includes("resource was not found")
            ) {
              setOrcidError("not_found");
            } else {
              setOrcidError("error");
            }
          } catch (e) {
            // If response is not JSON, check status text
            const statusText = response.statusText || "";
            if (statusText.toLowerCase().includes("not found")) {
              setOrcidError("not_found");
            } else {
              setOrcidError("error");
            }
          }
        } else {
          setOrcidError("error");
        }
        console.error(
          "Failed to fetch ORCID profile:",
          response.status,
          response.statusText,
        );
      }
    } catch (error) {
      console.error("Error fetching ORCID stats:", error);
      setOrcidError("error");
    } finally {
      setLoadingOrcidStats(false);
    }
  };

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

    // Listen for login events to refresh user data
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

    const loadAppointments = async () => {
      try {
        setLoadingAppointments(true);

        // Upcoming appointments
        try {
          const res = await fetch(`${base}/api/appointments/upcoming`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            },
          });
          if (!res.ok) {
            console.error("Failed to load upcoming appointments", res.status);
            setUpcomingAppointments([]);
          } else {
            const data = await res.json();
            setUpcomingAppointments(data.appointments || []);
          }
        } catch (err) {
          console.error("Error loading upcoming appointments:", err);
          setUpcomingAppointments([]);
        }

        // Past appointments
        try {
          const resPast = await fetch(`${base}/api/appointments/past`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            },
          });
          if (!resPast.ok) {
            console.error("Failed to load past appointments", resPast.status);
            setPastAppointments([]);
          } else {
            const dataPast = await resPast.json();
            setPastAppointments(dataPast.appointments || []);
          }
        } catch (err) {
          console.error("Error loading past appointments:", err);
          setPastAppointments([]);
        }

        // Pending meeting requests that still need your approval
        try {
          const currentUserId = userData?._id || userData?.id;
          if (currentUserId) {
            const resPending = await fetch(
              `${base}/api/meeting-requests/${currentUserId}?status=pending`,
            );
            if (!resPending.ok) {
              console.error(
                "Failed to load pending meeting requests",
                resPending.status,
              );
              setPendingMeetingRequests([]);
            } else {
              const pendingData = await resPending.json();
              setPendingMeetingRequests(pendingData.requests || []);
            }
          } else {
            setPendingMeetingRequests([]);
          }
        } catch (err) {
          console.error("Error loading pending meeting requests:", err);
          setPendingMeetingRequests([]);
        }
      } finally {
        setLoadingAppointments(false);
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
      const firstLoadKey = `dashboard_researcher_first_load_${
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

          // Run all initial fetches in parallel
          const [
            recsResponse,
            favResponse,
            insightsResponse,
            profileResponse,
            trialsResponse,
          ] = await Promise.all([
            fetch(`${base}/api/recommendations/${userId}`),
            fetch(`${base}/api/favorites/${userId}`),
            fetch(`${base}/api/insights/${userId}?limit=0`),
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
            setData({
              ...fetchedData,
              trials: (trialsList || []).sort((a, b) => {
                const matchA = a.matchPercentage ?? 0;
                const matchB = b.matchPercentage ?? 0;
                return matchB - matchA;
              }),
            });
            // Global collaborators (experts) already include matchPercentage from the
            // deterministic pipeline + profile-based matching. Sort by match %
            // and keep the top N, consistent with the patient dashboard.
            const sortedGlobalExperts = (fetchedData.globalExperts || [])
              .sort((a, b) => {
                const matchA = a.matchPercentage ?? 0;
                const matchB = b.matchPercentage ?? 0;
                return matchB - matchA;
              })
              .slice(0, GLOBAL_EXPERTS_LIMIT);
            setGlobalExperts(sortedGlobalExperts);
          }

          // Process favorites
          try {
            if (favResponse.ok) {
              const favData = await favResponse.json();
              setFavorites(favData.items || []);
            }
          } catch (error) {
            console.error("Error fetching favorites:", error);
          }

          // Process insights
          try {
            if (insightsResponse.ok) {
              const insightsData = await insightsResponse.json();
              setInsights({ unreadCount: insightsData.unreadCount || 0 });
            }
          } catch (error) {
            console.error("Error fetching insights:", error);
          }

          // Process profile (signature + ORCID deferred)
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
                if (profile.researcher?.orcid) {
                  fetchOrcidStats(profile.researcher.orcid, userId);
                }

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
      loadAppointments();
    } else {
      // No user, don't show multi-step loader
      setIsFirstLoad(false);
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

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("logout"));
    navigate("/");
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

    // Fetch detailed trial information - researcher-friendly simplified (technical terms, structured)
    if (trial.id || trial._id) {
      try {
        const nctId = trial.id || trial._id;
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const response = await fetch(
          `${base}/api/search/trial/${nctId}/simplified?audience=researcher`,
        );

        if (response.ok) {
          const data = await response.json();
          if (data.trial) {
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

        const fallbackResponse = await fetch(
          `${base}/api/search/trial/${nctId}/simplified`,
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
    setContactStepsModal((prev) => ({ ...prev, generating: true }));
    try {
      const userName = getDisplayName(user, "Researcher");
      const userLocation =
        userProfile?.researcher?.location ||
        userProfile?.patient?.location ||
        null;
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const response = await fetch(`${base}/api/ai/generate-trial-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName,
          userLocation,
          trial: contactStepsModal.trial,
        }),
      });
      if (!response.ok) throw new Error("Failed to generate email");
      const data = await response.json();
      setContactStepsModal((prev) => ({
        ...prev,
        generatedEmail: data.message || "",
        generating: false,
      }));
      toast.success("Email draft generated!");
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
      setTimeout(
        () => setContactStepsModal((prev) => ({ ...prev, copied: false })),
        2000,
      );
    }
  }

  async function openContactInfoModal(trial) {
    setContactInfoModal({
      open: true,
      trial,
      loading: true,
      generatedMessage: "",
      generating: false,
      copied: false,
    });
    if (trial.id || trial._id) {
      try {
        const nctId = trial.id || trial._id;
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const response = await fetch(
          `${base}/api/search/trial/${nctId}/simplified?audience=researcher`,
        );
        if (response.ok) {
          const data = await response.json();
          if (data.trial) {
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
    setContactInfoModal({
      open: true,
      trial,
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
    setContactInfoModal((prev) => ({ ...prev, generating: true }));
    try {
      const userName = getDisplayName(user, "Researcher");
      const userLocation =
        userProfile?.researcher?.location ||
        userProfile?.patient?.location ||
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
      if (!response.ok) throw new Error("Failed to generate message");
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
      setTimeout(
        () => setContactInfoModal((prev) => ({ ...prev, copied: false })),
        2000,
      );
    }
  }

  async function generateTrialDetailsMessage() {
    if (!trialDetailsModal.trial) return;

    setTrialDetailsModal((prev) => ({ ...prev, generating: true }));

    try {
      const userName = getDisplayName(user, "Researcher");
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

  async function generateMessage() {
    if (!contactModal.trial) return;

    setContactModal((prev) => ({ ...prev, generating: true }));

    try {
      const userName = getDisplayName(user, "Researcher");
      const userLocation =
        userProfile?.researcher?.location ||
        userProfile?.patient?.location ||
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

    // Researchers: audience=researcher (technical terms, structured) - still simplified, not raw
    // Pass source so backend uses correct provider (PubMed-only on dashboard avoids lag)
    if (pub.pmid || pub.id || pub._id) {
      try {
        const id = String(pub.pmid || pub.id || pub._id);
        const source = pub.source || "pubmed";
        const sourceParam = `source=${encodeURIComponent(source)}`;

        const response = await fetch(
          `${base}/api/search/publication/${id}/simplified?audience=researcher&${sourceParam}`,
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
          `${base}/api/search/publication/${id}/simplified?${sourceParam}`,
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

  async function generateSummary(item, type, simplify = false) {
    let text = "";
    let title = "";
    if (type === "trial") {
      title =
        simplifiedTrialSummaries.get(item.title) ||
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
      title = item.title || "Publication";
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

    setSummaryModal({
      open: true,
      title,
      type,
      summary: "",
      loading: true,
      isSimplified: simplify,
      originalSummary: null,
      originalItem: item,
    });

    try {
      const res = await fetch(`${base}/api/ai/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          type,
          simplify,
          // Pass full trial object for structured summary
          ...(type === "trial" && { trial: item }),
        }),
      }).then((r) => r.json());

      const newSummary =
        res.summary ||
        (type === "publication"
          ? { structured: false, summary: "Summary unavailable" }
          : type === "trial"
            ? { structured: false, summary: "Summary unavailable" }
            : "Summary unavailable");

      setSummaryModal((prev) => ({
        ...prev,
        summary: newSummary,
        loading: false,
        // Store original summary if this is the first (technical) version
        originalSummary: simplify ? prev.originalSummary : newSummary,
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

  async function simplifySummary() {
    if (!summaryModal.originalItem || summaryModal.isSimplified) return;

    setSummaryModal((prev) => ({
      ...prev,
      loading: true,
    }));

    await generateSummary(
      summaryModal.originalItem,
      summaryModal.type,
      true, // simplify = true
    );
  }

  function closeModal() {
    setSummaryModal({
      open: false,
      title: "",
      type: "",
      summary: "",
      loading: false,
      isSimplified: false,
      originalSummary: null,
      originalItem: null,
    });
  }

  // Helper function to get unique key for favorite tracking
  const getFavoriteKey = (type, itemId, item) => {
    if (type === "expert" || type === "collaborator") {
      return `${type}-${
        item.name || item.orcid || item.id || item._id || itemId
      }`;
    } else if (type === "publication") {
      return `${type}-${item.pmid || item.id || item._id || itemId}`;
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

    // Determine the correct ID to use for checking and deletion
    let checkId = itemId;
    if (type === "expert" || type === "collaborator") {
      checkId = item.orcid || item.id || item._id || item.userId || itemId;
    } else if (type === "publication") {
      checkId = item.pmid || item.id || item._id || itemId;
    } else if (type === "trial") {
      checkId = item.id || item._id || itemId;
    } else if (type === "thread" || type === "forum") {
      checkId = item._id || item.id || itemId;
    }

    // Check if favorited - for thread/forum types, allow matching between both types
    const isFavorited = favorites.some((fav) => {
      // For thread/forum types, allow matching between both types
      if (
        (type === "thread" || type === "forum") &&
        (fav.type === "thread" || fav.type === "forum")
      ) {
        return (
          fav.item?._id === checkId ||
          fav.item?.id === checkId ||
          (fav.item?.name && item.name && fav.item.name === item.name)
        );
      }
      // For other types, match exactly
      if (fav.type !== type) return false;
      return (
        fav.item?.id === checkId ||
        fav.item?._id === checkId ||
        fav.item?.orcid === checkId ||
        fav.item?.pmid === checkId ||
        (type === "expert" && fav.item?.name === item.name) ||
        (type === "publication" && fav.item?.title === item.title) ||
        (type === "trial" && fav.item?.title === item.title)
      );
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
            fav.item?._id === checkId ||
            fav.item?.id === checkId ||
            (fav.item?.name && item.name && fav.item.name === item.name)
          );
        }
        if (fav.type !== type) return true;
        return !(
          fav.item?.id === checkId ||
          fav.item?._id === checkId ||
          fav.item?.orcid === checkId ||
          fav.item?.pmid === checkId ||
          (type === "expert" && fav.item?.name === item.name) ||
          (type === "publication" && fav.item?.title === item.title) ||
          (type === "trial" && fav.item?.title === item.title)
        );
      });
    } else {
      // Optimistically add to favorites
      const itemToStore = {
        ...item,
        id: checkId,
        _id: item._id || checkId,
      };

      if ((type === "expert" || type === "collaborator") && item.orcid) {
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
        await fetch(
          `${base}/api/favorites/${
            user._id || user.id
          }?type=${type}&id=${encodeURIComponent(checkId)}`,
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

        // Add type-specific IDs
        if ((type === "expert" || type === "collaborator") && item.orcid) {
          itemToStore.orcid = item.orcid;
        }
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

      // Refresh favorites
      const favResponse = await fetch(
        `${base}/api/favorites/${user._id || user.id}`,
      );
      const favData = await favResponse.json();
      setFavorites(favData.items || []);
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
      const researcherName =
        getDisplayName(user) ||
        user?.username ||
        user?.name ||
        (user?.firstName && user?.lastName
          ? `${user.firstName} ${user.lastName}`.trim()
          : null) ||
        "Not specified";
      const patientContext = {
        name: researcherName,
        condition: "Researcher",
        location: "Not specified",
        keyConcerns: [],
        interests:
          userProfile?.researchInterests || user?.researchInterests || [],
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
      if (!response.ok) throw new Error("Failed to generate report");
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
      toast.loading("Generating PDF...", { id: "favorites-pdf-researcher" });
      const name =
        favoritesReportModal.report?.patientContext?.name || "Researcher";
      const fileName = `Collabiora-Summary-Report-${String(name).replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
      const pdfInstance = pdf(
        <PDFReportDocument report={favoritesReportModal.report} />,
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
        id: "favorites-pdf-researcher",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(`Failed to generate PDF: ${error.message}`, {
        id: "favorites-pdf-researcher",
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
    if (type !== "expert" && type !== "publication" && type !== "trial") return;
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
      return { ...prev, [key]: [...items, favorite] };
    });
  }

  function isFavoriteSelected(favorite) {
    const type =
      favorite.type === "collaborator"
        ? "expert"
        : favorite.type === "expert"
          ? "expert"
          : favorite.type;
    if (type !== "expert" && type !== "publication" && type !== "trial")
      return false;
    const items = selectedFavoriteItems[type + "s"] || [];
    return items.some(
      (item) =>
        item._id === favorite._id || item.item?.id === favorite.item?.id,
    );
  }

  function clearFavoriteSelections() {
    setSelectedFavoriteItems({ experts: [], publications: [], trials: [] });
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

  async function checkFollowStatus(collaboratorId) {
    if (!user?._id && !user?.id) return false;
    try {
      const response = await fetch(
        `${base}/api/insights/${
          user._id || user.id
        }/following/${collaboratorId}`,
      );
      const data = await response.json();
      return data.isFollowing;
    } catch (error) {
      console.error("Error checking follow status:", error);
      return false;
    }
  }

  async function toggleFollow(collaboratorId, collaboratorRole = "researcher") {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to follow collaborators");
      return;
    }

    const isFollowing = await checkFollowStatus(collaboratorId);

    try {
      if (isFollowing) {
        await fetch(`${base}/api/follow`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            followerId: user._id || user.id,
            followingId: collaboratorId,
          }),
        });
        toast.success("Unfollowed successfully");
      } else {
        await fetch(`${base}/api/follow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            followerId: user._id || user.id,
            followingId: collaboratorId,
            followerRole: user.role,
            followingRole: collaboratorRole,
          }),
        });
        toast.success("Connected successfully!");
      }

      setFollowingStatus((prev) => ({
        ...prev,
        [collaboratorId]: !isFollowing,
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
      const collaboratorId =
        messageModal.collaborator?._id ||
        messageModal.collaborator?.userId ||
        messageModal.collaborator?.id;
      const response = await fetch(`${base}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user._id || user.id,
          receiverId: collaboratorId,
          senderRole: user.role,
          receiverRole: "researcher",
          body: messageModal.body,
        }),
      });

      if (response.ok) {
        toast.success("Message sent successfully!");
        setMessageModal({ open: false, collaborator: null, body: "" });
      } else {
        toast.error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  }

  async function sendConnectionRequest() {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to send connection requests");
      return;
    }
    if (user.role !== "researcher") {
      toast.error("Only researchers can send connection requests");
      return;
    }
    const collaboratorId =
      connectionRequestModal.collaborator?._id ||
      connectionRequestModal.collaborator?.userId ||
      connectionRequestModal.collaborator?.id;
    if (!collaboratorId) return;

    try {
      const response = await fetch(`${base}/api/connection-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterId: user._id || user.id,
          receiverId: collaboratorId,
          message: connectionRequestModal.message || "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send connection request");
      }

      toast.success("Connection request sent successfully!");
      setConnectionRequestModal({
        open: false,
        message: "",
        collaborator: null,
      });
      setConnectionRequestStatus((prev) => ({
        ...prev,
        [collaboratorId]: {
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

  // Load follow status and connection status when collaborator modal opens
  useEffect(() => {
    if (collaboratorModal.collaborator && collaboratorModal.open) {
      const collaboratorId =
        collaboratorModal.collaborator._id ||
        collaboratorModal.collaborator.userId ||
        collaboratorModal.collaborator.id;
      checkFollowStatus(collaboratorId).then((isFollowing) => {
        setFollowingStatus((prev) => ({
          ...prev,
          [collaboratorId]: isFollowing,
        }));
      });
      // Fetch connection status for researchers viewing on-platform collaborators
      if (collaboratorId && user?.role === "researcher") {
        const currentUserId = user._id || user.id;
        if (currentUserId && currentUserId !== collaboratorId) {
          fetch(
            `${base}/api/connection-requests/${currentUserId}/${collaboratorId}/status`,
          )
            .then((r) => r.json())
            .then((connData) => {
              setConnectionRequestStatus((prev) => ({
                ...prev,
                [collaboratorId]: {
                  hasRequest: connData.hasRequest || false,
                  isConnected: connData.isConnected || false,
                  status: connData.status || null,
                  isRequester: connData.isRequester || false,
                },
              }));
            })
            .catch(() => {});
        }
      }
    }
  }, [collaboratorModal]);

  // Fetch connection status for on-platform experts when collaborators section is shown
  useEffect(() => {
    if (
      selectedCategory !== "collaborators" ||
      user?.role !== "researcher" ||
      !(user?._id || user?.id)
    )
      return;
    const currentUserId = user._id || user.id;
    const onPlatformExperts = (data.experts || []).filter(
      (e) => e._id || e.userId,
    );
    onPlatformExperts.forEach((e) => {
      const collaboratorId = e._id || e.userId || e.id;
      if (!collaboratorId || collaboratorId === currentUserId) return;
      fetch(
        `${base}/api/connection-requests/${currentUserId}/${collaboratorId}/status`,
      )
        .then((r) => r.json())
        .then((connData) => {
          setConnectionRequestStatus((prev) => ({
            ...prev,
            [collaboratorId]: {
              hasRequest: connData.hasRequest || false,
              isConnected: connData.isConnected || false,
              status: connData.status || null,
              isRequester: connData.isRequester || false,
            },
          }));
        })
        .catch(() => {});
    });
  }, [selectedCategory, data.experts, user?.role, user?._id, user?.id, base]);

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
        userProfile?.researcher?.interests?.[0] ||
        "oncology";
      params.set("q", userDisease);
      // Default to RECRUITING if no filter is set
      params.set("status", trialFilter || "RECRUITING");
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

  function openEditInterestsModal() {
    const list =
      userProfile?.researcher?.interests ||
      userProfile?.researcher?.specialties ||
      [];
    setInterestsDraft(list);
    const indices = userProfile?.researcher?.primaryInterestIndices;
    if (
      Array.isArray(indices) &&
      indices.length >= 1 &&
      indices.length <= 2 &&
      list.length > 0
    ) {
      const valid = indices.filter(
        (i) => Number.isInteger(i) && i >= 0 && i < list.length,
      );
      setPrimaryIndicesDraft(valid.slice(0, 2));
    } else if (list.length === 1) {
      setPrimaryIndicesDraft([0]);
    } else if (list.length >= 2) {
      setPrimaryIndicesDraft([0, 1]);
    } else {
      setPrimaryIndicesDraft([]);
    }
    setNewInterestInput("");
    setEditInterestsModalOpen(true);
  }

  useEffect(() => {
    if (editInterestsModalOpen) return;
    const list =
      userProfile?.researcher?.interests ||
      userProfile?.researcher?.specialties ||
      [];
    setInterestsDraft(list);
    const indices = userProfile?.researcher?.primaryInterestIndices;
    if (
      Array.isArray(indices) &&
      indices.length >= 1 &&
      indices.length <= 2 &&
      list.length > 0
    ) {
      const valid = indices.filter(
        (i) => Number.isInteger(i) && i >= 0 && i < list.length,
      );
      setPrimaryIndicesDraft(valid.slice(0, 2));
    } else if (list.length === 1) {
      setPrimaryIndicesDraft([0]);
    } else if (list.length >= 2) {
      setPrimaryIndicesDraft([0, 1]);
    } else {
      setPrimaryIndicesDraft([]);
    }
  }, [
    editInterestsModalOpen,
    userProfile?.researcher?.interests,
    userProfile?.researcher?.primaryInterestIndices,
    userProfile?.researcher?.specialties,
  ]);

  function togglePrimaryIndex(index) {
    setPrimaryIndicesDraft((prev) => {
      const has = prev.includes(index);
      if (has) return prev.filter((i) => i !== index);
      if (prev.length >= 2) return [prev[1], index];
      return [...prev, index].sort((a, b) => a - b);
    });
  }

  function removeInterest(index) {
    setInterestsDraft((prev) => prev.filter((_, i) => i !== index));
    setPrimaryIndicesDraft((prev) =>
      prev
        .map((i) => (i > index ? i - 1 : i === index ? -1 : i))
        .filter((i) => i >= 0)
        .slice(0, 2),
    );
  }

  function addInterest(value) {
    const v = value.trim();
    if (!v) return;
    setInterestsDraft((prev) => [...prev, v]);
    setNewInterestInput("");
    setPrimaryIndicesDraft((prev) => {
      if (prev.length >= 2) return prev;
      return [...prev, interestsDraft.length].sort((a, b) => a - b);
    });
  }

  async function saveInterests() {
    const userId = user?._id || user?.id;
    if (!userId) return;
    setSavingInterests(true);
    try {
      const res = await fetch(
        `${base}/api/profile/${userId}/researcher-interests`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interests: interestsDraft,
            primaryInterestIndices:
              interestsDraft.length === 0
                ? []
                : interestsDraft.length === 1
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
          researcher: {
            ...p?.researcher,
            interests: interestsDraft,
            primaryInterestIndices: primaryIndicesDraft,
          },
        }));
      setEditInterestsModalOpen(false);
      toast.success("Research interests updated");
    } catch (e) {
      toast.error(e.message || "Failed to save interests");
    } finally {
      setSavingInterests(false);
    }
  }

  async function refreshRecommendationsBySection() {
    const userId = user?._id || user?.id;
    if (!userId) return;
    const sectionTypes = ["publications", "trials", "collaborators"];
    const active = sectionTypes.includes(selectedCategory)
      ? selectedCategory
      : "publications";
    const apiType = active === "collaborators" ? "experts" : active;

    try {
      await fetch(`${base}/api/recommendations/cache/${userId}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.warn("Could not clear recommendations cache", e);
    }

    setRefreshingSection(active);
    const otherSections = sectionTypes.filter((s) => s !== active);
    setRefreshingSectionsBg(new Set(otherSections));

    const fetchSection = async (type) => {
      const apiTypeForFetch = type === "collaborators" ? "experts" : type;
      const res = await fetch(
        `${base}/api/recommendations/${userId}/section?type=${apiTypeForFetch}`,
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
      } else if (active === "collaborators") {
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
          } else if (type === "collaborators") {
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

  // Load forums categories on mount
  useEffect(() => {
    const loadForumsCategories = async () => {
      try {
        const response = await fetch(`${base}/api/forums/categories`);
        if (response.ok) {
          const data = await response.json();
          setForumsCategories(data.categories || []);
        }
      } catch (error) {
        console.error("Error loading forums categories:", error);
      }
    };
    loadForumsCategories();
  }, [base]);

  // Load forum threads when forums category is selected
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

  // Load a small set of research-interest-matched communities for the Forums section
  useEffect(() => {
    if (selectedCategory !== "forums") return;
    const userId = user?._id || user?.id;
    if (!userId) return;

    const interests =
      userProfile?.researcher?.interests ||
      userProfile?.researchInterests ||
      user?.researchInterests ||
      [];

    const loadCommunitiesForDashboard = async () => {
      setLoadingRecommendedCommunities(true);
      try {
        const params = new URLSearchParams();
        params.set("userId", userId);
        params.set("type", "researcher");
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
          interests,
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
    userProfile?.researcher?.interests,
    userProfile?.researchInterests,
    base,
  ]);

  // Reset filters when switching categories
  useEffect(() => {
    if (selectedCategory !== "trials") {
      setTrialFilter("RECRUITING"); // Keep RECRUITING as default
    }
    if (selectedCategory !== "publications") {
      setPublicationSort("relevance");
    }
  }, [selectedCategory]);

  // Effect to fetch filtered trials when filter changes or category is selected
  useEffect(() => {
    // Always fetch trials when trials category is selected (defaults to RECRUITING)
    if (selectedCategory === "trials" && user?._id) {
      // If no filter is set, use RECRUITING as default
      if (!trialFilter) {
        setTrialFilter("RECRUITING");
      }
      // Fetch filtered trials
      fetchFilteredTrials();
    }
  }, [trialFilter, selectedCategory, user?._id]);

  // Loading states for multi-step loader (only shown on first load)
  const loadingStates = [
    { text: "Searching clinical trials..." },
    { text: "Collecting research publications..." },
    { text: "Discovering global experts..." },
    { text: "Finding potential collaborators..." },
    { text: "Preparing your dashboard..." },
  ];

  // Skeleton loader for subsequent loads — matches new layout (profile card, tabs, interests bar, content)
  function SimpleLoader() {
    return (
      <div className="min-h-screen relative">
        <AnimatedBackground />
        <div className="px-4 sm:px-6 md:px-8 lg:px-12 mx-auto max-w-7xl pt-14 pb-12 relative rounded-t-3xl">
          {/* Profile card skeleton — matches rounded-2xl bg-white/90 backdrop-blur-sm border border-indigo-100/70 */}
          <div className="mt-8 mb-8">
            <div className="rounded-2xl bg-white/90 backdrop-blur-sm border border-indigo-100/70 shadow-[0_10px_40px_rgba(15,23,42,0.06)] w-full mt-8">
              <div className="flex items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full animate-pulse shrink-0"
                    style={{ backgroundColor: "rgba(47, 60, 150, 0.2)" }}
                  />
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <div
                      className="h-5 w-32 sm:w-44 rounded animate-pulse"
                      style={{ backgroundColor: "rgba(47, 60, 150, 0.15)" }}
                    />
                    <div className="hidden sm:flex gap-2">
                      <div
                        className="h-6 w-24 rounded-full animate-pulse"
                        style={{ backgroundColor: "rgba(47, 60, 150, 0.12)" }}
                      />
                      <div
                        className="h-6 w-28 rounded-full animate-pulse"
                        style={{ backgroundColor: "rgba(47, 60, 150, 0.12)" }}
                      />
                    </div>
                  </div>
                </div>
                <div className="hidden sm:flex flex-wrap items-center gap-3 shrink-0">
                  <div
                    className="h-8 w-28 rounded-full animate-pulse"
                    style={{ backgroundColor: "rgba(47, 60, 150, 0.12)" }}
                  />
                  <div
                    className="h-8 w-24 rounded-full animate-pulse"
                    style={{ backgroundColor: "rgba(47, 60, 150, 0.12)" }}
                  />
                  <div
                    className="h-8 w-20 rounded-full animate-pulse"
                    style={{ backgroundColor: "rgba(47, 60, 150, 0.1)" }}
                  />
                </div>
                <div
                  className="sm:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-lg animate-pulse shrink-0"
                  style={{ backgroundColor: "rgba(47, 60, 150, 0.15)" }}
                />
              </div>
            </div>
          </div>

          {/* Category tabs skeleton — border-b, mobile grid 2 cols (6 items), desktop underline */}
          <div className="mt-4 sm:mt-6 mb-4 sm:mb-8">
            <div className="mb-4 sm:mb-8 border-b border-indigo-100/70 pb-2 sm:pb-3">
              <div className="grid grid-cols-2 sm:hidden gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-10 sm:h-14 rounded-xl animate-pulse"
                    style={{ backgroundColor: "rgba(47, 60, 150, 0.08)" }}
                  />
                ))}
              </div>
              <div className="hidden sm:flex items-center gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-9 w-20 rounded animate-pulse"
                    style={{ backgroundColor: "rgba(47, 60, 150, 0.1)" }}
                  />
                ))}
              </div>
            </div>

            {/* Research interests bar skeleton */}
            <div className="rounded-2xl bg-white/90 backdrop-blur-sm border-2 border-[#D0C4E2]/50 shadow-[0_10px_40px_rgba(15,23,42,0.04)] p-3 sm:p-4 mb-6 sm:mb-10 flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
              <div className="space-y-2">
                <div
                  className="h-4 w-32 rounded animate-pulse"
                  style={{ backgroundColor: "rgba(47, 60, 150, 0.12)" }}
                />
                <div
                  className="h-3 w-52 rounded animate-pulse"
                  style={{ backgroundColor: "rgba(47, 60, 150, 0.08)" }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-16 rounded-full animate-pulse"
                    style={{ backgroundColor: "rgba(47, 60, 150, 0.1)" }}
                  />
                ))}
              </div>
              <div className="flex gap-2 shrink-0">
                <div
                  className="h-9 w-16 rounded-lg animate-pulse"
                  style={{ backgroundColor: "rgba(47, 60, 150, 0.08)" }}
                />
                <div
                  className="h-9 w-20 rounded-lg animate-pulse"
                  style={{ backgroundColor: "rgba(47, 60, 150, 0.08)" }}
                />
              </div>
            </div>

            {/* Main content skeleton — card grid */}
            <div className="rounded-2xl bg-white/90 backdrop-blur-sm border border-indigo-100/70 shadow-[0_10px_40px_rgba(15,23,42,0.04)] p-4 sm:p-6 md:p-8">
              <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                <div
                  className="h-7 w-40 rounded-lg animate-pulse"
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
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="h-6 w-24 rounded-full animate-pulse"
                          style={{ backgroundColor: "rgba(47, 60, 150, 0.12)" }}
                        />
                        <div
                          className="h-6 w-20 rounded-full animate-pulse"
                          style={{ backgroundColor: "rgba(47, 60, 150, 0.12)" }}
                        />
                      </div>
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
          duration={1500}
          loop={false}
        />
      );
    } else {
      return <SimpleLoader />;
    }
  }

  const getCategoryLabel = (category) => {
    switch (category) {
      case "profile":
        return "Your Profile";
      case "collaborators":
        return "Collaborators";
      case "forums":
        return "Forums";
      case "publications":
        return "Publications";
      case "trials":
        return "Clinical Trials";
      case "favorites":
        return "Favourites";
      case "meetings":
        return "Meetings";
      default:
        return "";
    }
  };

  const userInterests =
    userProfile?.researcher?.interests?.[0] ||
    userProfile?.researcher?.specialties?.[0] ||
    "Research";
  const userInterestsList =
    userProfile?.researcher?.interests?.length > 0
      ? userProfile.researcher.interests
      : userProfile?.researcher?.specialties || [];
  const primaryInterestIndicesDisplay = (() => {
    const indices = userProfile?.researcher?.primaryInterestIndices;
    if (
      Array.isArray(indices) &&
      indices.length >= 1 &&
      indices.every(
        (i) => Number.isInteger(i) && i >= 0 && i < userInterestsList.length,
      )
    ) {
      return indices.slice(0, 2);
    }
    if (userInterestsList.length === 1) return [0];
    if (userInterestsList.length >= 2) return [0, 1];
    return [];
  })();
  const userLocation = userProfile?.researcher?.location || null;
  const locationText = userLocation
    ? `${userLocation.city || ""}${
        userLocation.city && userLocation.country ? ", " : ""
      }${userLocation.country || ""}`.trim() || "Not specified"
    : "Not specified";

  return (
    <div className="min-h-screen relative">
      <PageTutorial
        pageId="dashboard-researcher"
        steps={DASHBOARD_RESEARCHER_TUTORIAL_STEPS}
        enabled={showDashboardTutorial}
        onStepChange={handleDashboardResearcherTutorialStepChange}
        onComplete={() => setForceShowTutorial(false)}
      />
      <style>{`
        .category-button-hover:hover:not(:active) {
          background-color: rgba(208, 196, 226, 0.25) !important;
          border-color: rgba(47, 60, 150, 0.4) !important;
        }
      `}</style>
      <AnimatedBackground />
      <div className="px-4 sm:px-6 md:px-8 lg:px-12 mx-auto max-w-7xl pt-14 pb-12 relative rounded-t-3xl bg-linear-to-b from-[#F5F0FA] via-[#F7F4FC] to-[#F7F8FC] sm:from-transparent sm:via-transparent sm:to-transparent">
        {/* Main Content Section - Block-based layout */}
        <div className="mt-6 mb-8">
          {/* Category blocks - clear cards for easy navigation (compact on mobile, same as Patient) */}
          <div
            className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-2 sm:gap-4 pt-4 sm:pt-8 mb-4 sm:mb-8"
            data-tour="dashboard-researcher-tabs"
          >
            {[
              { key: "profile", label: "Your Profile", icon: User },
              { key: "collaborators", label: "Collaborators", icon: Users },
              { key: "forums", label: "Forums", icon: MessageCircle },
              { key: "publications", label: "Publications", icon: FileText },
              { key: "trials", label: "Clinical Trials", icon: Beaker },
              { key: "favorites", label: "Favourites", icon: Star },
              { key: "meetings", label: "Meetings", icon: Calendar },
            ].map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategory === category.key;
              const isSectionLoading =
                ["publications", "trials", "collaborators"].includes(
                  category.key,
                ) &&
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
                  className={`group flex flex-col items-start gap-1.5 sm:gap-3 p-3 sm:p-5 rounded-xl sm:rounded-2xl border-2 text-left transition-all duration-200 active:scale-[0.98] category-button-hover ${
                    isSelected
                      ? "bg-[#2F3C96] border-[#2F3C96] shadow-lg shadow-[#2F3C96]/25 text-white"
                      : "bg-white border-[#D0C4E2]/60 hover:border-[#2F3C96]/50 hover:shadow-md text-slate-700"
                  } ${isSectionLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                  {...(category.key === "publications"
                    ? { "data-tour": "dashboard-researcher-tab-publications" }
                    : category.key === "favorites"
                      ? { "data-tour": "dashboard-researcher-tab-favorites" }
                      : {})}
                >
                  <span
                    className={`flex items-center justify-center w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl shrink-0 ${
                      isSelected ? "bg-white/20" : "bg-[#D0C4E2]/30"
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
          {/* Tutorial button - compact */}
          <div className="flex justify-end mb-2 -mt-2">
            <button
              type="button"
              onClick={() => {
                resetTutorialCompleted("dashboard-researcher");
                setForceShowTutorial(true);
              }}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors"
              style={{
                borderColor: "rgba(47, 60, 150, 0.3)",
                color: "#2F3C96",
                backgroundColor: "rgba(208, 196, 226, 0.2)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(208, 196, 226, 0.35)";
                e.currentTarget.style.borderColor = "rgba(47, 60, 150, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(208, 196, 226, 0.2)";
                e.currentTarget.style.borderColor = "rgba(47, 60, 150, 0.3)";
              }}
              title="View / Redo dashboard tutorial"
              aria-label="View dashboard tutorial"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Research interests bar — chips, Edit + Refresh + Generate Summary Report */}
          <div
            className="rounded-2xl bg-white/90 backdrop-blur-sm border-2 border-[#D0C4E2]/50 border-l-4 border-l-[#2F3C96] shadow-[0_10px_40px_rgba(15,23,42,0.04)] p-3 sm:p-4 mb-6 sm:mb-10 flex items-center justify-between gap-3 sm:gap-4 flex-wrap"
            data-tour="dashboard-researcher-interests-bar"
          >
            <div className="space-y-0.5">
              <span
                className="block text-sm font-semibold"
                style={{ color: "#2F3C96" }}
              >
                Research interests
              </span>
              <span className="block text-xs text-slate-500">
                Used to personalize your recommendations
              </span>
            </div>
            <div className="flex flex-1 min-w-0 flex-wrap items-center gap-2">
              {userInterestsList.length > 0 ? (
                userInterestsList.map((c, i) => {
                  const isSelected = primaryInterestIndicesDisplay.includes(i);
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
                <span className="text-sm text-slate-500">—</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={openEditInterestsModal}
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
                title="Refresh publications, trials and collaborators based on your interests"
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
                title="Generate a PDF summary of your saved items to share"
              >
                <FileText className="w-3.5 h-3.5" />
                Generate Summary Report
              </button>
            </div>
          </div>

          {/* Edit Research Interests Modal */}
          {editInterestsModalOpen && (
            <Modal
              isOpen={editInterestsModalOpen}
              onClose={() =>
                !savingInterests && setEditInterestsModalOpen(false)
              }
              title="Edit Research Interests"
            >
              <div className="space-y-5 max-w-md">
                <p className="text-sm text-slate-600">
                  Add or remove interests. Choose up to two to use for
                  personalized search—tap the checkmark to select.
                </p>
                <div className="flex flex-wrap gap-2">
                  {interestsDraft.length === 0 && (
                    <span className="text-sm text-slate-400 italic">
                      No interests yet. Add one below.
                    </span>
                  )}
                  {interestsDraft.map((c, i) => (
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
                      {interestsDraft.length > 1 && (
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
                        onClick={() => removeInterest(i)}
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
                      value={newInterestInput}
                      onChange={setNewInterestInput}
                      onSubmit={(term) => {
                        const v = (term || "").trim();
                        if (v) {
                          addInterest(v);
                          setNewInterestInput("");
                        }
                      }}
                      extraTerms={icd11SuggestionTerms}
                      maxSuggestions={10}
                      placeholder="Search or select a condition/interest (ICD-11)..."
                      autoSubmitOnSelect={true}
                      inputClassName="rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(47,60,150,0.35)] w-full px-3 py-2.5"
                      className="w-full"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const v = newInterestInput.trim();
                      if (v) {
                        addInterest(v);
                        setNewInterestInput("");
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
                {interestsDraft.length > 1 && (
                  <p className="text-xs text-slate-500">
                    Selected interests (with checkmark) are used for
                    publications, trials, and collaborators. Save then Refresh
                    on the dashboard to update results.
                  </p>
                )}
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEditInterestsModalOpen(false)}
                    disabled={savingInterests}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveInterests}
                    disabled={savingInterests}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-70 transition-opacity"
                    style={{ backgroundColor: "#2F3C96" }}
                  >
                    {savingInterests ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    Save changes
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {/* Main Recommendations Section */}
          <div
            className="bg-white rounded-2xl shadow-md border-2 border-[#D0C4E2]/50 p-4 sm:p-6 md:p-8 relative overflow-hidden"
            data-tour="dashboard-researcher-recommendations"
          >
            {/* Accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl"
              style={{
                background: "linear-gradient(90deg, #2F3C96 0%, #D0C4E2 100%)",
              }}
            />
            {selectedCategory !== "profile" && (
              <div className="mb-4 sm:mb-8 pt-0.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div>
                    <h2
                      className="text-xl font-bold mb-0.5 sm:mb-2 sm:text-2xl lg:text-3xl xl:text-4xl bg-clip-text text-transparent"
                      style={{
                        backgroundImage:
                          "linear-gradient(135deg, #2F3C96 0%, #4a5bb8 50%, #253075 100%)",
                      }}
                    >
                      <span className="sm:hidden">Personalized For You</span>
                      <span className="hidden sm:inline">
                        Your Personalized Recommendations
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 sm:hidden">
                      Based on your activity
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Grid of Items - Larger Cards - Full Width with 3 columns */}
            <div
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6"
              data-tour="dashboard-researcher-content"
            >
              {selectedCategory === "profile" && (
                <div className="col-span-full">
                  {!userProfile?.researcher?.orcid ? (
                    <div
                      className="backdrop-blur-xl rounded-xl shadow-lg border p-4 sm:p-6 lg:p-8"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderColor: "rgba(208, 196, 226, 0.3)",
                      }}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: "rgba(208, 196, 226, 0.3)",
                          }}
                        >
                          <LinkIcon
                            className="w-5 h-5 sm:w-6 sm:h-6"
                            style={{ color: "#2F3C96" }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2"
                            style={{ color: "#2F3C96" }}
                          >
                            ORCID ID Not Added
                          </h3>
                          <p
                            className="text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed"
                            style={{ color: "#787878" }}
                          >
                            Add your ORCID ID to link your research activities
                            and display your publication stats, research
                            interests, and professional information.
                          </p>
                          <button
                            onClick={() => navigate("/profile")}
                            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors w-full sm:w-auto justify-center"
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
                            <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Add ORCID ID
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="backdrop-blur-xl rounded-xl shadow-lg border p-4 sm:p-6 lg:p-8"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderColor: "rgba(208, 196, 226, 0.3)",
                      }}
                    >
                      <div
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-4 sm:mb-6 pb-4 sm:pb-6"
                        style={{
                          borderBottom: "1px solid rgba(208, 196, 226, 0.3)",
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: "rgba(208, 196, 226, 0.3)",
                            }}
                          >
                            <CheckCircle
                              className="w-5 h-5 sm:w-6 sm:h-6"
                              style={{ color: "#2F3C96" }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3
                              className="text-base sm:text-lg font-semibold mb-1"
                              style={{ color: "#2F3C96" }}
                            >
                              ORCID Profile Connected
                            </h3>
                            <a
                              href={
                                orcidStats?.orcidUrl ||
                                `https://orcid.org/${userProfile.researcher.orcid}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs sm:text-sm flex items-center gap-1 mt-1 break-all"
                              style={{ color: "#2F3C96" }}
                              onMouseEnter={(e) => {
                                e.target.style.color = "#253075";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.color = "#2F3C96";
                              }}
                            >
                              <span className="truncate">
                                {userProfile.researcher.orcid}
                              </span>
                              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                            </a>
                            <button
                              type="button"
                              onClick={() => setShowManagePublications(true)}
                              className="text-xs sm:text-sm flex items-center gap-1 mt-2 font-medium hover:underline"
                              style={{ color: "#2F3C96" }}
                            >
                              Select publications to display on profile →
                            </button>
                          </div>
                        </div>
                        {orcidStats && (
                          <div
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border shrink-0"
                            style={{
                              backgroundColor: "rgba(208, 196, 226, 0.2)",
                              borderColor: "rgba(208, 196, 226, 0.3)",
                            }}
                          >
                            <FileText
                              className="w-4 h-4 sm:w-5 sm:h-5 shrink-0"
                              style={{ color: "#2F3C96" }}
                            />
                            <div>
                              <p
                                className="text-xl sm:text-2xl font-bold"
                                style={{ color: "#2F3C96" }}
                              >
                                {orcidStats.totalPublications || 0}
                              </p>
                              <p
                                className="text-xs"
                                style={{ color: "#787878" }}
                              >
                                Total works
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {loadingOrcidStats ? (
                        <div className="flex items-center justify-center py-8 sm:py-12">
                          <Loader2
                            className="w-6 h-6 sm:w-8 sm:h-8 animate-spin"
                            style={{ color: "#2F3C96" }}
                          />
                        </div>
                      ) : orcidStats ? (
                        <div className="space-y-4 sm:space-y-6">
                          {/* Biography at the top */}
                          {orcidStats.biography && (
                            <div
                              className="rounded-lg p-4 sm:p-5 border"
                              style={{
                                backgroundColor: "rgba(245, 242, 248, 0.5)",
                                borderColor: "rgba(208, 196, 226, 0.3)",
                              }}
                            >
                              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                                <User
                                  className="w-4 h-4 sm:w-5 sm:h-5 shrink-0"
                                  style={{ color: "#2F3C96" }}
                                />
                                <span
                                  className="text-xs sm:text-sm font-semibold"
                                  style={{ color: "#2F3C96" }}
                                >
                                  Biography
                                </span>
                              </div>
                              <p
                                className="text-xs sm:text-sm leading-relaxed"
                                style={{ color: "#787878" }}
                              >
                                {orcidStats.biography}
                              </p>
                            </div>
                          )}

                          {/* Profile Information Section as a list */}
                          <div className="space-y-3 sm:space-y-4">
                            {/* Current Position */}
                            {orcidStats.currentPosition && (
                              <div
                                className="rounded-lg p-3 sm:p-4 border"
                                style={{
                                  backgroundColor: "rgba(245, 242, 248, 0.5)",
                                  borderColor: "rgba(208, 196, 226, 0.3)",
                                }}
                              >
                                <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                                  <Briefcase
                                    className="w-4 h-4 sm:w-5 sm:h-5 shrink-0"
                                    style={{ color: "#2F3C96" }}
                                  />
                                  <span
                                    className="text-xs sm:text-sm font-semibold"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    Current Position
                                  </span>
                                </div>
                                <p
                                  className="text-xs sm:text-sm leading-relaxed"
                                  style={{ color: "#787878" }}
                                >
                                  {orcidStats.currentPosition}
                                </p>
                              </div>
                            )}

                            {/* Location */}
                            {orcidStats.location && (
                              <div
                                className="rounded-lg p-3 sm:p-4 border"
                                style={{
                                  backgroundColor: "rgba(245, 242, 248, 0.5)",
                                  borderColor: "rgba(208, 196, 226, 0.3)",
                                }}
                              >
                                <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                                  <MapPin
                                    className="w-4 h-4 sm:w-5 sm:h-5 shrink-0"
                                    style={{ color: "#2F3C96" }}
                                  />
                                  <span
                                    className="text-xs sm:text-sm font-semibold"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    Location
                                  </span>
                                </div>
                                <p
                                  className="text-xs sm:text-sm leading-relaxed"
                                  style={{ color: "#787878" }}
                                >
                                  {orcidStats.location}
                                </p>
                              </div>
                            )}

                            {/* Research Interests */}
                            {orcidStats.researchInterests &&
                              orcidStats.researchInterests.length > 0 && (
                                <div
                                  className="rounded-lg p-3 sm:p-4 border"
                                  style={{
                                    backgroundColor: "rgba(245, 242, 248, 0.5)",
                                    borderColor: "rgba(208, 196, 226, 0.3)",
                                  }}
                                >
                                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                                    <Sparkles
                                      className="w-4 h-4 sm:w-5 sm:h-5 shrink-0"
                                      style={{ color: "#2F3C96" }}
                                    />
                                    <span
                                      className="text-xs sm:text-sm font-semibold"
                                      style={{ color: "#2F3C96" }}
                                    >
                                      Research Interests
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                    {orcidStats.researchInterests
                                      .slice(0, 10)
                                      .map((interest, idx) => (
                                        <span
                                          key={idx}
                                          className="inline-flex items-center px-2.5 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors"
                                          style={{
                                            backgroundColor:
                                              "rgba(208, 196, 226, 0.3)",
                                            color: "#2F3C96",
                                          }}
                                          onMouseEnter={(e) => {
                                            e.target.style.backgroundColor =
                                              "rgba(208, 196, 226, 0.4)";
                                          }}
                                          onMouseLeave={(e) => {
                                            e.target.style.backgroundColor =
                                              "rgba(208, 196, 226, 0.3)";
                                          }}
                                        >
                                          {interest}
                                        </span>
                                      ))}
                                  </div>
                                </div>
                              )}

                            {/* External Links */}
                            {orcidStats.externalLinks &&
                              Object.keys(orcidStats.externalLinks).length >
                                1 && (
                                <div
                                  className="rounded-lg p-3 sm:p-4 border"
                                  style={{
                                    backgroundColor: "rgba(245, 242, 248, 0.5)",
                                    borderColor: "rgba(208, 196, 226, 0.3)",
                                  }}
                                >
                                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                                    <LinkIcon
                                      className="w-4 h-4 sm:w-5 sm:h-5 shrink-0"
                                      style={{ color: "#2F3C96" }}
                                    />
                                    <span
                                      className="text-xs sm:text-sm font-semibold"
                                      style={{ color: "#2F3C96" }}
                                    >
                                      External Links
                                    </span>
                                  </div>
                                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
                                    {orcidStats.externalLinks.googleScholar && (
                                      <a
                                        href={
                                          orcidStats.externalLinks.googleScholar
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium py-1.5 sm:py-0"
                                        style={{ color: "#2F3C96" }}
                                        onMouseEnter={(e) => {
                                          e.target.style.color = "#253075";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.color = "#2F3C96";
                                        }}
                                      >
                                        Google Scholar
                                        <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                      </a>
                                    )}
                                    {orcidStats.externalLinks.researchGate && (
                                      <a
                                        href={
                                          orcidStats.externalLinks.researchGate
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium py-1.5 sm:py-0"
                                        style={{ color: "#2F3C96" }}
                                        onMouseEnter={(e) => {
                                          e.target.style.color = "#253075";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.color = "#2F3C96";
                                        }}
                                      >
                                        ResearchGate
                                        <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                      </a>
                                    )}
                                    {orcidStats.externalLinks.pubmed && (
                                      <a
                                        href={orcidStats.externalLinks.pubmed}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium py-1.5 sm:py-0"
                                        style={{ color: "#2F3C96" }}
                                        onMouseEnter={(e) => {
                                          e.target.style.color = "#253075";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.color = "#2F3C96";
                                        }}
                                      >
                                        PubMed
                                        <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}

                            {/* Employment History */}
                            {orcidStats.employments &&
                              orcidStats.employments.length > 0 && (
                                <div
                                  className="rounded-lg p-3 sm:p-4 border"
                                  style={{
                                    backgroundColor: "rgba(245, 242, 248, 0.5)",
                                    borderColor: "rgba(208, 196, 226, 0.3)",
                                  }}
                                >
                                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                                    <Briefcase
                                      className="w-4 h-4 sm:w-5 sm:h-5 shrink-0"
                                      style={{ color: "#2F3C96" }}
                                    />
                                    <span
                                      className="text-xs sm:text-sm font-semibold"
                                      style={{ color: "#2F3C96" }}
                                    >
                                      Employment History
                                    </span>
                                    <span
                                      className="text-xs px-2 py-0.5 rounded-full"
                                      style={{
                                        backgroundColor:
                                          "rgba(208, 196, 226, 0.3)",
                                        color: "#2F3C96",
                                      }}
                                    >
                                      {orcidStats.employments.length}
                                    </span>
                                  </div>
                                  <div className="space-y-2.5 sm:space-y-3">
                                    {/* Show first 3 always */}
                                    {orcidStats.employments
                                      .slice(0, 3)
                                      .map((emp, idx) => (
                                        <div
                                          key={idx}
                                          style={{
                                            borderBottom:
                                              idx < 2
                                                ? "1px solid rgba(208, 196, 226, 0.3)"
                                                : "none",
                                          }}
                                          className="pb-2.5 sm:pb-3 last:pb-0"
                                        >
                                          <div className="flex items-start justify-between gap-2 sm:gap-3">
                                            <div className="flex-1 min-w-0">
                                              <p
                                                className="text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1"
                                                style={{ color: "#2F3C96" }}
                                              >
                                                {emp.roleTitle || "Position"}
                                              </p>
                                              <p
                                                className="text-xs sm:text-sm mb-0.5 sm:mb-1 leading-relaxed"
                                                style={{ color: "#787878" }}
                                              >
                                                {emp.organization ||
                                                  "Organization"}
                                              </p>
                                              {emp.department && (
                                                <p
                                                  className="text-xs mb-0.5 sm:mb-1 leading-relaxed"
                                                  style={{ color: "#787878" }}
                                                >
                                                  {emp.department}
                                                </p>
                                              )}
                                              {(emp.startDate ||
                                                emp.endDate) && (
                                                <p
                                                  className="text-xs leading-relaxed"
                                                  style={{ color: "#787878" }}
                                                >
                                                  {emp.startDate || "?"} -{" "}
                                                  {emp.endDate || "Present"}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}

                                    {/* Collapsible section for remaining items */}
                                    {orcidStats.employments.length > 3 && (
                                      <>
                                        <div
                                          className={`overflow-hidden transition-all duration-300 ${
                                            isEmploymentExpanded
                                              ? "max-h-[2000px] opacity-100"
                                              : "max-h-0 opacity-0"
                                          }`}
                                        >
                                          <div className="space-y-2.5 sm:space-y-3 pt-2.5 sm:pt-3 border-t border-slate-200">
                                            {orcidStats.employments
                                              .slice(3)
                                              .map((emp, idx) => (
                                                <div
                                                  key={idx + 3}
                                                  style={{
                                                    borderBottom:
                                                      idx <
                                                      orcidStats.employments
                                                        .length -
                                                        4
                                                        ? "1px solid rgba(208, 196, 226, 0.3)"
                                                        : "none",
                                                  }}
                                                  className="pb-2.5 sm:pb-3 last:pb-0"
                                                >
                                                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                                                    <div className="flex-1 min-w-0">
                                                      <p
                                                        className="text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1"
                                                        style={{
                                                          color: "#2F3C96",
                                                        }}
                                                      >
                                                        {emp.roleTitle ||
                                                          "Position"}
                                                      </p>
                                                      <p
                                                        className="text-xs sm:text-sm mb-0.5 sm:mb-1 leading-relaxed"
                                                        style={{
                                                          color: "#787878",
                                                        }}
                                                      >
                                                        {emp.organization ||
                                                          "Organization"}
                                                      </p>
                                                      {emp.department && (
                                                        <p
                                                          className="text-xs mb-0.5 sm:mb-1 leading-relaxed"
                                                          style={{
                                                            color: "#787878",
                                                          }}
                                                        >
                                                          {emp.department}
                                                        </p>
                                                      )}
                                                      {(emp.startDate ||
                                                        emp.endDate) && (
                                                        <p
                                                          className="text-xs leading-relaxed"
                                                          style={{
                                                            color: "#787878",
                                                          }}
                                                        >
                                                          {emp.startDate || "?"}{" "}
                                                          -{" "}
                                                          {emp.endDate ||
                                                            "Present"}
                                                        </p>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                          </div>
                                        </div>
                                        <button
                                          onClick={() =>
                                            setIsEmploymentExpanded(
                                              !isEmploymentExpanded,
                                            )
                                          }
                                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all mt-2"
                                          style={{
                                            backgroundColor:
                                              "rgba(208, 196, 226, 0.2)",
                                            color: "#2F3C96",
                                            border:
                                              "1px solid rgba(208, 196, 226, 0.3)",
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                              "rgba(208, 196, 226, 0.3)";
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                              "rgba(208, 196, 226, 0.2)";
                                          }}
                                        >
                                          {isEmploymentExpanded ? (
                                            <>
                                              <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                              Show Less
                                            </>
                                          ) : (
                                            <>
                                              <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                              Show{" "}
                                              {orcidStats.employments.length -
                                                3}{" "}
                                              More
                                            </>
                                          )}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}

                            {/* Recent Publications */}
                            {orcidStats.recentPublications &&
                              orcidStats.recentPublications.length > 0 && (
                                <div
                                  className="rounded-lg p-3 sm:p-4 border sm:bg-white sm:rounded-xl sm:shadow-sm sm:border-slate-200 sm:overflow-hidden"
                                  style={{
                                    backgroundColor: "rgba(245, 242, 248, 0.5)",
                                    borderColor: "rgba(208, 196, 226, 0.3)",
                                  }}
                                >
                                  <div className="flex items-center gap-2 mb-3 sm:mb-4 sm:pb-4 sm:border-b sm:border-slate-200 sm:bg-gradient-to-r sm:from-indigo-50 sm:to-blue-50 sm:px-0 sm:py-0 sm:-mx-3 sm:-mt-3 sm:px-4 sm:pt-3 sm:mb-4">
                                    <BookOpen
                                      className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 sm:hidden"
                                      style={{ color: "#2F3C96" }}
                                    />
                                    <div className="hidden sm:block p-1.5 sm:p-2 bg-indigo-100 rounded-lg shrink-0">
                                      <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                                    </div>
                                    <span
                                      className="text-xs sm:text-sm font-semibold sm:font-bold sm:text-slate-900"
                                      style={{ color: "#2F3C96" }}
                                    >
                                      Recent Publications
                                    </span>
                                    {orcidStats.totalPublications > 5 && (
                                      <span className="hidden sm:block text-xs text-slate-600 ml-2">
                                        (Showing 5 of{" "}
                                        {orcidStats.totalPublications})
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-2.5 sm:space-y-3 sm:p-0">
                                    {/* Show first 3 always */}
                                    {orcidStats.recentPublications
                                      .slice(0, 3)
                                      .map((pub, idx) => (
                                        <div
                                          key={idx}
                                          style={{
                                            borderBottom:
                                              idx < 2
                                                ? "1px solid rgba(208, 196, 226, 0.3)"
                                                : "none",
                                          }}
                                          className="pb-2.5 sm:pb-3 last:pb-0 sm:group sm:bg-slate-50 sm:hover:bg-indigo-50 sm:rounded-lg sm:p-3 sm:border sm:border-slate-200 sm:hover:border-indigo-300 sm:transition-all sm:duration-200 sm:hover:shadow-md"
                                        >
                                          <a
                                            href={pub.link || pub.url || "#"}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block"
                                          >
                                            <h4
                                              className="text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1.5 sm:mb-2 line-clamp-2 sm:group-hover:text-indigo-700 sm:transition-colors leading-snug"
                                              style={{ color: "#2F3C96" }}
                                            >
                                              {pub.title}
                                            </h4>
                                          </a>
                                          <div className="space-y-1 sm:space-y-1.5 sm:space-y-2">
                                            {pub.authors &&
                                              pub.authors.length > 0 && (
                                                <div className="flex items-start gap-1.5 sm:gap-2">
                                                  <Users
                                                    className="w-3 h-3 sm:w-3.5 sm:h-3.5 mt-0.5 shrink-0 sm:text-slate-400"
                                                    style={{ color: "#787878" }}
                                                  />
                                                  <p
                                                    className="text-xs line-clamp-2 leading-relaxed sm:text-slate-600"
                                                    style={{ color: "#787878" }}
                                                  >
                                                    {pub.authors
                                                      .slice(0, 4)
                                                      .join(", ")}
                                                    {pub.authors.length > 4 &&
                                                      ` +${
                                                        pub.authors.length - 4
                                                      } more`}
                                                  </p>
                                                </div>
                                              )}
                                            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                                              {pub.journal && (
                                                <div className="flex items-center gap-1.5">
                                                  <FileText
                                                    className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 sm:text-slate-400"
                                                    style={{ color: "#787878" }}
                                                  />
                                                  <span
                                                    className="text-xs font-medium line-clamp-1 sm:text-slate-600 sm:font-medium"
                                                    style={{ color: "#787878" }}
                                                  >
                                                    {pub.journal}
                                                  </span>
                                                </div>
                                              )}
                                              {pub.year && (
                                                <div className="flex items-center gap-1.5">
                                                  <CalendarIcon
                                                    className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 sm:text-slate-400"
                                                    style={{ color: "#787878" }}
                                                  />
                                                  <span
                                                    className="text-xs sm:text-slate-600"
                                                    style={{ color: "#787878" }}
                                                  >
                                                    {pub.year}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                            {(pub.link || pub.url) && (
                                              <div className="pt-1 sm:pt-1.5 sm:pt-2 sm:border-t sm:border-slate-200">
                                                <a
                                                  href={pub.link || pub.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors sm:text-indigo-600 sm:hover:text-indigo-700"
                                                  style={{ color: "#2F3C96" }}
                                                  onMouseEnter={(e) => {
                                                    e.target.style.color =
                                                      "#253075";
                                                  }}
                                                  onMouseLeave={(e) => {
                                                    e.target.style.color =
                                                      "#2F3C96";
                                                  }}
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                >
                                                  <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                                                  View Publication
                                                </a>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}

                                    {/* Collapsible section for remaining publications */}
                                    {orcidStats.recentPublications.length >
                                      3 && (
                                      <>
                                        <div
                                          className={`overflow-hidden transition-all duration-300 ${
                                            isPublicationsExpanded
                                              ? "max-h-[2000px] opacity-100"
                                              : "max-h-0 opacity-0"
                                          }`}
                                        >
                                          <div className="space-y-2.5 sm:space-y-3 pt-2.5 sm:pt-3 border-t border-slate-200 sm:border-t-0">
                                            {orcidStats.recentPublications
                                              .slice(3)
                                              .map((pub, idx) => (
                                                <div
                                                  key={idx + 3}
                                                  style={{
                                                    borderBottom:
                                                      idx <
                                                      orcidStats
                                                        .recentPublications
                                                        .length -
                                                        4
                                                        ? "1px solid rgba(208, 196, 226, 0.3)"
                                                        : "none",
                                                  }}
                                                  className="pb-2.5 sm:pb-3 last:pb-0 sm:group sm:bg-slate-50 sm:hover:bg-indigo-50 sm:rounded-lg sm:p-3 sm:border sm:border-slate-200 sm:hover:border-indigo-300 sm:transition-all sm:duration-200 sm:hover:shadow-md"
                                                >
                                                  <a
                                                    href={
                                                      pub.link || pub.url || "#"
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block"
                                                  >
                                                    <h4
                                                      className="text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1.5 sm:mb-2 line-clamp-2 sm:group-hover:text-indigo-700 sm:transition-colors leading-snug"
                                                      style={{
                                                        color: "#2F3C96",
                                                      }}
                                                    >
                                                      {pub.title}
                                                    </h4>
                                                  </a>
                                                  <div className="space-y-1 sm:space-y-1.5 sm:space-y-2">
                                                    {pub.authors &&
                                                      pub.authors.length >
                                                        0 && (
                                                        <div className="flex items-start gap-1.5 sm:gap-2">
                                                          <Users
                                                            className="w-3 h-3 sm:w-3.5 sm:h-3.5 mt-0.5 shrink-0 sm:text-slate-400"
                                                            style={{
                                                              color: "#787878",
                                                            }}
                                                          />
                                                          <p
                                                            className="text-xs line-clamp-2 leading-relaxed sm:text-slate-600"
                                                            style={{
                                                              color: "#787878",
                                                            }}
                                                          >
                                                            {pub.authors
                                                              .slice(0, 4)
                                                              .join(", ")}
                                                            {pub.authors
                                                              .length > 4 &&
                                                              ` +${
                                                                pub.authors
                                                                  .length - 4
                                                              } more`}
                                                          </p>
                                                        </div>
                                                      )}
                                                    <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                                                      {pub.journal && (
                                                        <div className="flex items-center gap-1.5">
                                                          <FileText
                                                            className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 sm:text-slate-400"
                                                            style={{
                                                              color: "#787878",
                                                            }}
                                                          />
                                                          <span
                                                            className="text-xs font-medium line-clamp-1 sm:text-slate-600 sm:font-medium"
                                                            style={{
                                                              color: "#787878",
                                                            }}
                                                          >
                                                            {pub.journal}
                                                          </span>
                                                        </div>
                                                      )}
                                                      {pub.year && (
                                                        <div className="flex items-center gap-1.5">
                                                          <CalendarIcon
                                                            className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 sm:text-slate-400"
                                                            style={{
                                                              color: "#787878",
                                                            }}
                                                          />
                                                          <span
                                                            className="text-xs sm:text-slate-600"
                                                            style={{
                                                              color: "#787878",
                                                            }}
                                                          >
                                                            {pub.year}
                                                          </span>
                                                        </div>
                                                      )}
                                                    </div>
                                                    {(pub.link || pub.url) && (
                                                      <div className="pt-1 sm:pt-1.5 sm:pt-2 sm:border-t sm:border-slate-200">
                                                        <a
                                                          href={
                                                            pub.link || pub.url
                                                          }
                                                          target="_blank"
                                                          rel="noopener noreferrer"
                                                          className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors sm:text-indigo-600 sm:hover:text-indigo-700"
                                                          style={{
                                                            color: "#2F3C96",
                                                          }}
                                                          onMouseEnter={(e) => {
                                                            e.target.style.color =
                                                              "#253075";
                                                          }}
                                                          onMouseLeave={(e) => {
                                                            e.target.style.color =
                                                              "#2F3C96";
                                                          }}
                                                          onClick={(e) =>
                                                            e.stopPropagation()
                                                          }
                                                        >
                                                          <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                                                          View Publication
                                                        </a>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                          </div>
                                        </div>
                                        <button
                                          onClick={() =>
                                            setIsPublicationsExpanded(
                                              !isPublicationsExpanded,
                                            )
                                          }
                                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all mt-2"
                                          style={{
                                            backgroundColor:
                                              "rgba(208, 196, 226, 0.2)",
                                            color: "#2F3C96",
                                            border:
                                              "1px solid rgba(208, 196, 226, 0.3)",
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                              "rgba(208, 196, 226, 0.3)";
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                              "rgba(208, 196, 226, 0.2)";
                                          }}
                                        >
                                          {isPublicationsExpanded ? (
                                            <>
                                              <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                              Show Less
                                            </>
                                          ) : (
                                            <>
                                              <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                              Show{" "}
                                              {orcidStats.recentPublications
                                                .length - 3}{" "}
                                              More
                                            </>
                                          )}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                  {orcidStats.totalPublications > 5 && (
                                    <div className="hidden sm:block bg-slate-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 -mx-3 sm:mx-0 -mb-3 sm:mb-0">
                                      <a
                                        href={orcidStats.orcidUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 font-semibold transition-colors group"
                                      >
                                        <span>
                                          View all{" "}
                                          {orcidStats.totalPublications}{" "}
                                          publications on ORCID
                                        </span>
                                        <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}
                          </div>
                        </div>
                      ) : orcidError === "not_found" ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                              <Info className="w-6 h-6 text-amber-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-amber-900 mb-2">
                                ORCID Profile Not Found
                              </h3>
                              <p className="text-sm text-amber-800 mb-4">
                                We couldn't find your ORCID profile. Please
                                check your ORCID ID or start your research to
                                build your profile.
                              </p>
                              <div className="flex flex-wrap gap-3">
                                <button
                                  onClick={() => navigate("/profile")}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-colors"
                                >
                                  <Edit3 className="w-4 h-4" />
                                  Check Your ORCID ID
                                </button>
                                <a
                                  href={`https://orcid.org/${userProfile.researcher.orcid}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-amber-50 text-amber-700 text-sm font-semibold rounded-lg border border-amber-300 transition-colors"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Visit ORCID Profile
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-sm text-slate-500">
                          Unable to load ORCID stats. Please try again later.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {selectedCategory === "trials" &&
                (loadingFiltered ? (
                  <div className="col-span-full text-center py-16">
                    <div
                      className="inline-flex items-center justify-center gap-2"
                      style={{ color: "#2F3C96" }}
                    >
                      <div
                        className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: "#2F3C96" }}
                      ></div>
                      <span className="text-sm font-medium">
                        Loading recruiting trials...
                      </span>
                    </div>
                  </div>
                ) : (
                  (() => {
                    // Show trials from API (already filtered by status in fetchFilteredTrials)
                    const trialsToShow = data.trials;
                    return trialsToShow.length > 0 ? (
                      sortByMatchPercentage(trialsToShow).map((t, idx) => (
                        <div
                          key={idx}
                          className="bg-white rounded-2xl shadow-md border-2 transition-all duration-200 hover:-translate-y-1.5 hover:shadow-[0_18px_45px_rgba(47,60,150,0.12)] overflow-hidden flex flex-col h-full"
                          style={{
                            borderColor: "rgba(208, 196, 226, 0.5)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow =
                              "0 12px 24px -4px rgba(47, 60, 150, 0.15), 0 4px 8px -2px rgba(208, 196, 226, 0.2)";
                            e.currentTarget.style.borderColor =
                              "rgba(47, 60, 150, 0.45)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow =
                              "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)";
                            e.currentTarget.style.borderColor =
                              "rgba(208, 196, 226, 0.5)";
                          }}
                        >
                          <div className="p-4 sm:p-5 flex flex-col flex-grow">
                            {/* Match Progress Bar */}
                            {t.matchPercentage !== undefined && (
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
                                <div
                                  className="w-full h-2.5 rounded-full overflow-hidden"
                                  style={{
                                    backgroundColor:
                                      "rgba(208, 196, 226, 0.35)",
                                  }}
                                >
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${t.matchPercentage}%`,
                                      background:
                                        "linear-gradient(90deg, #2F3C96, #4a5bb8, #253075)",
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
                                  t.title}
                              </h3>
                            </div>

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
                                onClick={() =>
                                  generateSummary(t, "trial", false)
                                }
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
                              View Contact Information
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-16">
                        <div
                          className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                          style={{
                            backgroundColor: "rgba(208, 196, 226, 0.2)",
                          }}
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
                          No Recruiting Clinical Trials Found
                        </h3>
                        <p
                          className="text-sm max-w-md mx-auto"
                          style={{ color: "#787878" }}
                        >
                          We're working on finding relevant recruiting clinical
                          trials for you. Check back soon!
                        </p>
                      </div>
                    );
                  })()
                ))}

              {selectedCategory === "publications" &&
                (sortPublications(data.publications, publicationSort).length >
                0 ? (
                  sortPublications(data.publications, publicationSort).map(
                    (p, idx) => {
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
                          className="bg-white rounded-2xl shadow-md border-2 transition-all duration-200 hover:-translate-y-1.5 hover:shadow-[0_18px_45px_rgba(47,60,150,0.12)] overflow-hidden flex flex-col h-full"
                          style={{
                            borderColor: "rgba(208, 196, 226, 0.5)",
                          }}
                          {...(idx === 0
                            ? {
                                "data-tour":
                                  "dashboard-researcher-publication-card",
                              }
                            : {})}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow =
                              "0 12px 24px -4px rgba(47, 60, 150, 0.15), 0 4px 8px -2px rgba(208, 196, 226, 0.2)";
                            e.currentTarget.style.borderColor =
                              "rgba(47, 60, 150, 0.45)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow =
                              "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)";
                            e.currentTarget.style.borderColor =
                              "rgba(208, 196, 226, 0.5)";
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
                                    backgroundColor:
                                      "rgba(208, 196, 226, 0.35)",
                                  }}
                                >
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${p.matchPercentage}%`,
                                      background:
                                        "linear-gradient(90deg, #2F3C96, #4a5bb8, #253075)",
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
                                {p.title || "Untitled Publication"}
                              </h3>
                            </div>

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
                                onClick={() =>
                                  generateSummary(p, "publication", false)
                                }
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

                            {/* View full publication */}
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
                                View full publication
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    },
                  )
                ) : (
                  <div className="col-span-full text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                      <FileText className="w-10 h-10 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                      No Publications Found
                    </h3>
                    <p className="text-slate-600 text-sm max-w-md mx-auto">
                      We're curating relevant research publications for you.
                      Check back soon!
                    </p>
                  </div>
                ))}

              {selectedCategory === "collaborators" && (
                <div className="col-span-full">
                  {/* Collaborators List - Experts on Platform First, Then Global Experts */}
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
                        {/* On-Platform Collaborators Section (dropdown, collapsed by default) */}
                        {hasRecommendedExperts && (
                          <div className="col-span-full rounded-xl sm:rounded-2xl border-2 shadow-lg overflow-hidden">
                            <button
                              type="button"
                              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3 md:px-6 md:py-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                              onClick={() =>
                                setShowOnPlatformCollaborators((prev) => !prev)
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
                                      On-platform Collaborators
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
                                        ? "Collaborator"
                                        : "Collaborators"}
                                    </span>
                                  </div>
                                  <p className="text-[11px] sm:text-xs md:text-sm text-slate-600 mt-0.5 sm:mt-1 line-clamp-2">
                                    Collaborators who are active on Collabiora
                                    and available for direct collaboration.
                                  </p>
                                </div>
                              </div>
                              <ChevronDown
                                className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-[#2F3C96] transition-transform ${
                                  showOnPlatformCollaborators
                                    ? "rotate-180"
                                    : ""
                                }`}
                              />
                            </button>

                            {showOnPlatformCollaborators && (
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

                                    // Check if expert is favorited
                                    const isFavorited = favorites.some(
                                      (fav) => {
                                        if (
                                          fav.type !== "collaborator" &&
                                          fav.type !== "expert"
                                        )
                                          return false;
                                        const collaboratorId =
                                          e._id || e.userId || e.id;
                                        if (
                                          collaboratorId &&
                                          (fav.item?.id === collaboratorId ||
                                            fav.item?._id === collaboratorId)
                                        ) {
                                          return true;
                                        }
                                        if (e.name && fav.item?.name) {
                                          return fav.item.name === e.name;
                                        }
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
                                                  onClick={(event) => {
                                                    event.stopPropagation();
                                                    const collaboratorId =
                                                      e._id || e.userId || e.id;
                                                    if (collaboratorId) {
                                                      toggleFavorite(
                                                        "collaborator",
                                                        collaboratorId,
                                                        e,
                                                      );
                                                    } else {
                                                      toggleFavorite(
                                                        "expert",
                                                        itemId,
                                                        e,
                                                      );
                                                    }
                                                  }}
                                                  disabled={favoritingItems.has(
                                                    getFavoriteKey(
                                                      isCuralinkExpert
                                                        ? "collaborator"
                                                        : "expert",
                                                      isCuralinkExpert
                                                        ? e._id ||
                                                            e.userId ||
                                                            e.id
                                                        : itemId,
                                                      e,
                                                    ),
                                                  )}
                                                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-500 disabled:opacity-50"
                                                  title={
                                                    isFavorited
                                                      ? "Remove from Favourites"
                                                      : "Add to Favourites"
                                                  }
                                                >
                                                  {favoritingItems.has(
                                                    getFavoriteKey(
                                                      isCuralinkExpert
                                                        ? "collaborator"
                                                        : "expert",
                                                      isCuralinkExpert
                                                        ? e._id ||
                                                            e.userId ||
                                                            e.id
                                                        : itemId,
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
                                              {locationText && (
                                                <div className="flex items-center text-xs text-slate-600 mb-1">
                                                  <Building2 className="w-3 h-3 mr-1 shrink-0" />
                                                  <span className="truncate">
                                                    {locationText}
                                                  </span>
                                                </div>
                                              )}
                                              {e.bio && (
                                                <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                                                  {e.bio}
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
                                          <div className="pt-3 border-t border-slate-100 mt-auto flex flex-col gap-2">
                                            {isCuralinkExpert ? (
                                              <>
                                                {/* Connect button - researchers only, on-platform experts */}
                                                {user?.role === "researcher" &&
                                                  (() => {
                                                    const cid =
                                                      e._id || e.userId || e.id;
                                                    const cStatus =
                                                      connectionRequestStatus[
                                                        cid
                                                      ] || {};
                                                    if (cStatus.isConnected) {
                                                      return (
                                                        <button
                                                          onClick={() => {
                                                            setMessageModal({
                                                              open: true,
                                                              collaborator: e,
                                                              body: "",
                                                            });
                                                          }}
                                                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        >
                                                          <MessageCircle className="w-3.5 h-3.5" />
                                                          Message
                                                        </button>
                                                      );
                                                    }
                                                    if (
                                                      cStatus.status ===
                                                      "pending"
                                                    ) {
                                                      return (
                                                        <button
                                                          disabled
                                                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-slate-200 text-slate-600 cursor-not-allowed"
                                                        >
                                                          <Clock className="w-3.5 h-3.5" />
                                                          {cStatus.isRequester
                                                            ? "Request Sent"
                                                            : "Request Pending"}
                                                        </button>
                                                      );
                                                    }
                                                    return (
                                                      <button
                                                        onClick={() =>
                                                          setConnectionRequestModal(
                                                            {
                                                              open: true,
                                                              message: "",
                                                              collaborator: e,
                                                            },
                                                          )
                                                        }
                                                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all shadow-sm border-2 border-[#2F3C96] text-[#2F3C96] hover:bg-[#2F3C96]/5"
                                                      >
                                                        <UserPlus className="w-3.5 h-3.5" />
                                                        Connect
                                                      </button>
                                                    );
                                                  })()}
                                                <div className="flex gap-2 items-center">
                                                  <button
                                                    onClick={() => {
                                                      const collaboratorId =
                                                        e._id ||
                                                        e.userId ||
                                                        e.id;
                                                      if (collaboratorId) {
                                                        const params =
                                                          new URLSearchParams();
                                                        if (e.name)
                                                          params.set(
                                                            "name",
                                                            e.name,
                                                          );
                                                        const locationText =
                                                          e.location
                                                            ? typeof e.location ===
                                                              "string"
                                                              ? e.location
                                                              : `${
                                                                  e.location
                                                                    .city || ""
                                                                }${
                                                                  e.location
                                                                    .city &&
                                                                  e.location
                                                                    .country
                                                                    ? ", "
                                                                    : ""
                                                                }${
                                                                  e.location
                                                                    .country ||
                                                                  ""
                                                                }`.trim()
                                                            : null;
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
                                                          `/collabiora-expert/profile/${collaboratorId}?${params.toString()}`,
                                                        );
                                                      } else {
                                                        setCollaboratorModal({
                                                          open: true,
                                                          collaborator: e,
                                                        });
                                                      }
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all shadow-sm hover:shadow-md text-white"
                                                    style={{
                                                      background:
                                                        "linear-gradient(135deg, #2F3C96, #253075)",
                                                    }}
                                                    onMouseEnter={(ev) => {
                                                      ev.target.style.background =
                                                        "linear-gradient(135deg, #253075, #1C2454)";
                                                    }}
                                                    onMouseLeave={(ev) => {
                                                      ev.target.style.background =
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
                                                </div>
                                              </>
                                            ) : (
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
                                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all shadow-sm hover:shadow-md text-white"
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

                        {/* Global Collaborators / Experts Section (dropdown, expanded by default) */}
                        {hasGlobalExperts && (
                          <div className="col-span-full rounded-xl sm:rounded-2xl border-2 shadow-lg overflow-hidden">
                            <button
                              type="button"
                              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3 md:px-6 md:py-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                              onClick={() =>
                                setShowGlobalCollaborators((prev) => !prev)
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
                                      Global Collaborators
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
                                    Discover global researchers and potential
                                    collaborators beyond the CuraLink platform.
                                  </p>
                                </div>
                              </div>
                              <ChevronDown
                                className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-[#2F3C96] transition-transform ${
                                  showGlobalCollaborators ? "rotate-180" : ""
                                }`}
                              />
                            </button>

                            {showGlobalCollaborators && (
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
                                              {(institution || e.location) && (
                                                <div className="flex items-center text-xs text-slate-600 mb-2">
                                                  <Building2 className="w-3 h-3 mr-1 shrink-0" />
                                                  <span className="truncate">
                                                    {institution || e.location}
                                                  </span>
                                                </div>
                                              )}
                                              {(e.biography || e.bio) && (
                                                <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                                                  {e.biography || e.bio}
                                                </p>
                                              )}
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
                                                      Top Publications
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
                                                      `/collabiora-expert/profile/${id}?name=${encodeURIComponent(e.name || "")}&bio=${encodeURIComponent(e.bio || "")}`,
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
                            backgroundColor: "rgba(208, 196, 226, 0.2)",
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
                          No Collaborators Found
                        </h3>
                        <p
                          className="text-sm max-w-md mx-auto"
                          style={{ color: "#787878" }}
                        >
                          We're connecting you with relevant researchers. Check
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
                      Connect with the research community and share insights
                    </p>
                  </div>

                  {/* Header Section */}
                  <div className="mb-6">
                    <div
                      className="bg-white rounded-xl shadow-sm border p-6"
                      style={{
                        borderColor: "rgba(208, 196, 226, 0.3)",
                        background:
                          "linear-gradient(135deg, rgba(245, 242, 248, 0.5), rgba(232, 224, 239, 0.3))",
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: "rgba(47, 60, 150, 0.1)",
                          }}
                        >
                          <MessageCircle
                            className="w-7 h-7"
                            style={{ color: "#2F3C96" }}
                          />
                        </div>
                        <div className="flex-1">
                          <h2
                            className="text-xl font-bold mb-2"
                            style={{ color: "#2F3C96" }}
                          >
                            Community Forums
                          </h2>
                          <p
                            className="text-sm leading-relaxed"
                            style={{ color: "#787878" }}
                          >
                            Connect with researchers, share experiences, ask
                            questions, and collaborate with peers in your field.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recommended Communities based on your research interests */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <h3
                        className="text-base font-semibold"
                        style={{ color: "#2F3C96" }}
                      >
                        Recommended communities
                      </h3>
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
                        Finding communities that match your interests...
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
                        Communities matched to your research interests will
                        appear here once available.
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
                            className="bg-white rounded-xl shadow-sm border transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden flex flex-col h-full cursor-pointer"
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
                            onClick={() =>
                              navigate(`/forums?category=${category._id}`)
                            }
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
                                  <MessageCircle
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
                              </div>

                              {/* Recent Threads Preview */}
                              {forumThreads[category._id] &&
                                forumThreads[category._id].length > 0 && (
                                  <div className="mt-auto">
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
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              navigate(
                                                `/forums?category=${category._id}&thread=${thread._id}`,
                                              );
                                            }}
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
                                                  {getDisplayName(
                                                    thread.authorUserId,
                                                    "Anonymous",
                                                  )}
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

                              {/* View Forum Button */}
                              <button
                                className="mt-4 w-full py-2 rounded-lg text-sm font-semibold transition-all text-white"
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/forums?category=${category._id}`);
                                }}
                              >
                                View Forum
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
                            backgroundColor: "rgba(208, 196, 226, 0.2)",
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
                          Forums will appear here once they become available.
                          Check back soon!
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {selectedCategory === "meetings" && (
                <div className="col-span-full">
                  <div className="rounded-2xl border border-[#D0C4E2]/80 bg-white/90 backdrop-blur-sm p-6 sm:p-8 shadow-[0_10px_40px_rgba(15,23,42,0.04)]">
                    <div className="flex items-center justify-between mb-4 gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#D0C4E2]/30 flex items-center justify-center">
                          <Calendar className="w-5 h-5" style={{ color: "#2F3C96" }} />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-bold" style={{ color: "#2F3C96" }}>
                            Your meetings
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-600">
                            See upcoming calls and look back at past conversations.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-5 rounded-xl border border-dashed border-[#D0C4E2]/70 bg-[#F5F0FA] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <p className="text-xs sm:text-sm text-slate-700">
                        Turn on 1:1 meetings and set your weekly availability from your profile so patients can book time with you.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate("/profile")}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-white bg-[#2F3C96] hover:bg-[#253075] transition-colors"
                      >
                        Set up availability
                      </button>
                    </div>

                    {loadingAppointments ? (
                      <div className="flex items-center justify-center py-8 gap-2 text-sm text-slate-600">
                        <Loader2 className="w-4 h-4 animate-spin text-[#2F3C96]" />
                        <span>Loading your meetings…</span>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Ongoing + Upcoming meetings */}
                        {(() => {
                          const now = new Date();
                          const ongoing = upcomingAppointments.filter((appt) => {
                            const start = new Date(appt.slotStartUtc || appt.slotStart || appt.meetingDate);
                            const end = new Date(appt.slotEndUtc || appt.slotEnd || appt.meetingDate);
                            return now >= start && now <= end;
                          });
                          const upcomingOnly = upcomingAppointments.filter(
                            (appt) => !ongoing.some((o) => o._id === appt._id),
                          );

                          return (
                            <>
                              {/* Ongoing meeting(s) */}
                              {ongoing.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-slate-900 mb-2">
                                    Ongoing meeting
                                  </h4>
                                  <div className="space-y-3">
                                    {ongoing.map((appt) => {
                                      const start = new Date(appt.slotStartUtc || appt.slotStart || appt.meetingDate);
                                      const end = new Date(appt.slotEndUtc || appt.slotEnd || appt.meetingDate);
                                      const canJoin =
                                        appt.joinOpensAt && appt.joinClosesAt
                                          ? now >= new Date(appt.joinOpensAt) &&
                                            now <= new Date(appt.joinClosesAt)
                                          : now >= new Date(start.getTime() - 10 * 60 * 1000) &&
                                            now <= new Date(end.getTime() + 10 * 60 * 1000);

                                      const withUser =
                                        appt.patientId?.name ||
                                        appt.patientId?.username ||
                                        "Patient";
                                      const rawStatus = appt.status || "confirmed";
                                      const status =
                                        rawStatus === "pending_payment"
                                          ? "Awaiting payment"
                                          : rawStatus === "confirmed"
                                            ? "Confirmed"
                                            : rawStatus === "cancelled"
                                              ? "Cancelled"
                                              : rawStatus;
                                      const statusClasses =
                                        rawStatus === "confirmed"
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : rawStatus === "pending_payment"
                                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                                            : rawStatus === "cancelled"
                                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                                              : "bg-slate-50 text-slate-700 border border-slate-200";

                                      return (
                                        <div
                                          key={appt._id}
                                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#D0C4E2]/80 bg-[#2F3C96]/5 px-4 py-3"
                                        >
                                          <div className="flex items-start gap-3">
                                            <div className="mt-1">
                                              <CalendarIcon className="w-4 h-4 text-[#2F3C96]" />
                                            </div>
                                            <div>
                                              <p className="text-sm font-semibold text-slate-900">
                                                Meeting with {withUser}
                                              </p>
                                              <p className="text-xs text-slate-600">
                                                {start.toLocaleString(undefined, {
                                                  weekday: "short",
                                                  month: "short",
                                                  day: "numeric",
                                                  hour: "numeric",
                                                  minute: "2-digit",
                                                })}{" "}
                                                – in progress
                                              </p>
                                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${statusClasses}`}>
                                                  {status}
                                                </span>
                                              </div>
                                              {appt.notes && (
                                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                  Notes: {appt.notes}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 justify-end">
                                            <button
                                              type="button"
                                              disabled={!canJoin}
                                              onClick={() =>
                                                canJoin && navigate(`/meeting/${appt._id}`)
                                              }
                                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-white transition-colors ${
                                                canJoin
                                                  ? "bg-[#2F3C96] hover:bg-[#253075]"
                                                  : "bg-slate-300 cursor-not-allowed"
                                              }`}
                                            >
                                              Join now
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Upcoming meetings (excluding ongoing) */}
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-2">
                                  Upcoming meetings
                                </h4>
                                {upcomingOnly.length === 0 ? (
                                  <div className="rounded-xl border border-dashed border-[#D0C4E2]/80 bg-[#D0C4E2]/10 p-6 text-center">
                                    <Calendar
                                      className="w-12 h-12 mx-auto mb-3 opacity-60"
                                      style={{ color: "#2F3C96" }}
                                    />
                                    <h5 className="text-sm sm:text-base font-semibold mb-1" style={{ color: "#2F3C96" }}>
                                      No upcoming meetings yet
                                    </h5>
                                    <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
                                      When patients book with you, confirmed meetings will show up here with a
                                      join button shortly before start time.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {upcomingOnly.map((appt) => {
                                      const start = new Date(appt.slotStartUtc || appt.slotStart || appt.meetingDate);
                                      const end = new Date(appt.slotEndUtc || appt.slotEnd || appt.meetingDate);
                                      const canJoin =
                                        appt.joinOpensAt && appt.joinClosesAt
                                          ? now >= new Date(appt.joinOpensAt) &&
                                            now <= new Date(appt.joinClosesAt)
                                          : now >= new Date(start.getTime() - 10 * 60 * 1000) &&
                                            now <= new Date(end.getTime() + 10 * 60 * 1000);

                                      const withUser =
                                        appt.patientId?.name ||
                                        appt.patientId?.username ||
                                        "Patient";
                                      const rawStatus = appt.status || "confirmed";
                                      const status =
                                        rawStatus === "pending_payment"
                                          ? "Awaiting payment"
                                          : rawStatus === "confirmed"
                                            ? "Confirmed"
                                            : rawStatus === "cancelled"
                                              ? "Cancelled"
                                              : rawStatus;
                                      const statusClasses =
                                        rawStatus === "confirmed"
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : rawStatus === "pending_payment"
                                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                                            : rawStatus === "cancelled"
                                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                                              : "bg-slate-50 text-slate-700 border border-slate-200";

                                      return (
                                        <div
                                          key={appt._id}
                                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#D0C4E2]/80 bg-white/80 px-4 py-3"
                                        >
                                          <div className="flex items-start gap-3">
                                            <div className="mt-1">
                                              <CalendarIcon className="w-4 h-4 text-[#2F3C96]" />
                                            </div>
                                            <div>
                                              <p className="text-sm font-semibold text-slate-900">
                                                Meeting with {withUser}
                                              </p>
                                              <p className="text-xs text-slate-600">
                                                {start.toLocaleString(undefined, {
                                                  weekday: "short",
                                                  month: "short",
                                                  day: "numeric",
                                                  hour: "numeric",
                                                  minute: "2-digit",
                                                })}
                                              </p>
                                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${statusClasses}`}>
                                                  {status}
                                                </span>
                                              </div>
                                              {appt.notes && (
                                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                  Notes: {appt.notes}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 justify-end">
                                            <button
                                              type="button"
                                              disabled={!canJoin}
                                              onClick={() =>
                                                canJoin && navigate(`/meeting/${appt._id}`)
                                              }
                                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-white transition-colors ${
                                                canJoin
                                                  ? "bg-[#2F3C96] hover:bg-[#253075]"
                                                  : "bg-slate-300 cursor-not-allowed"
                                              }`}
                                            >
                                              Join
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </>
                          );
                        })()}

                        {/* Pending meeting requests needing your approval */}
                        <div className="pt-4 border-t border-slate-200">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-slate-900">
                              Meeting requests awaiting approval
                            </h4>
                            <button
                              type="button"
                              onClick={() => navigate("/notifications")}
                              className="text-xs font-medium text-[#2F3C96] hover:text-[#253075]"
                            >
                              Review all in Insights
                            </button>
                          </div>
                          {pendingMeetingRequests.length === 0 ? (
                            <p className="text-xs sm:text-sm text-slate-600">
                              When patients request new meeting times, they&apos;ll appear here and in your Insights.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {pendingMeetingRequests.slice(0, 3).map((req) => {
                                const patient = req.patientId;
                                return (
                                  <div
                                    key={req._id}
                                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                                  >
                                    <div className="flex items-start gap-2">
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xs font-bold">
                                        {patient?.username?.charAt(0)?.toUpperCase() || "P"}
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-slate-900">
                                          {patient?.username || "Patient"}
                                        </p>
                                        {req.topic && (
                                          <p className="text-xs font-medium text-slate-900">
                                            {req.topic}
                                          </p>
                                        )}
                                        {req.shortDescription && (
                                          <p className="text-[11px] text-slate-700 line-clamp-2">
                                            {req.shortDescription}
                                          </p>
                                        )}
                                        {(req.preferredSlotStartUtc || req.preferredDate) && (
                                          <p className="text-[11px] text-slate-600 mt-0.5">
                                            <CalendarIcon className="w-3 h-3 inline mr-1" />
                                            Requested:{" "}
                                            {new Date(
                                              req.preferredSlotStartUtc ||
                                              (req.preferredTime
                                                ? `${req.preferredDate}T${req.preferredTime}:00`
                                                : req.preferredDate),
                                            ).toLocaleString()}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => navigate("/notifications")}
                                      className="self-center px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white bg-[#2F3C96] hover:bg-[#253075] transition-colors"
                                    >
                                      Review
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Past meetings */}
                        <div className="pt-4 border-t border-slate-200">
                          <h4 className="text-sm font-semibold text-slate-900 mb-2">
                            Past meetings
                          </h4>
                          {pastAppointments.length === 0 ? (
                            <p className="text-xs sm:text-sm text-slate-600">
                              Once you&apos;ve completed calls with patients, they&apos;ll appear here so you can quickly review who you&apos;ve spoken with.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {pastAppointments.map((appt) => {
                                const start = new Date(appt.slotStartUtc || appt.slotStart || appt.meetingDate);
                                const withUser =
                                  appt.patientId?.name ||
                                  appt.patientId?.username ||
                                  "Patient";
                                const rawStatus = appt.status || "confirmed";
                                const status =
                                  rawStatus === "pending_payment"
                                    ? "Awaiting payment"
                                    : rawStatus === "confirmed"
                                      ? "Confirmed"
                                      : rawStatus === "cancelled"
                                        ? "Cancelled"
                                        : rawStatus;
                                const statusClasses =
                                  rawStatus === "confirmed"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : rawStatus === "pending_payment"
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : rawStatus === "cancelled"
                                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                                        : "bg-slate-50 text-slate-700 border border-slate-200";

                                return (
                                  <div
                                    key={appt._id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3"
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="mt-1">
                                        <CalendarIcon className="w-4 h-4 text-slate-500" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                          Meeting with {withUser}
                                        </p>
                                        <p className="text-xs text-slate-600">
                                          {start.toLocaleString(undefined, {
                                            weekday: "short",
                                            month: "short",
                                            day: "numeric",
                                            hour: "numeric",
                                            minute: "2-digit",
                                          })}
                                        </p>
                                        <div className="mt-1 flex flex-wrap items-center gap-2">
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${statusClasses}`}>
                                            {status}
                                          </span>
                                        </div>
                                        {appt.notes && (
                                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                            Notes: {appt.notes}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
                                data-tour="dashboard-researcher-favorites-generate-summary"
                              >
                                Generate summary
                              </button>
                            </div>
                          </div>

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
                                            <FileText className="w-3 h-3" />{" "}
                                            Publication
                                          </span>
                                          {isAddedByUrl && (
                                            <span className="inline-flex items-center px-2 py-0.5 bg-[rgba(208,196,226,0.4)] text-[#253075] text-xs font-medium rounded-full border border-[rgba(47,60,150,0.2)]">
                                              <LinkIcon className="w-3 h-3 mr-1" />{" "}
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
                                      <div className="mb-4">
                                        <h3
                                          className="text-lg font-bold mb-0 line-clamp-3 leading-snug"
                                          style={{
                                            color: p.isRead
                                              ? "#D0C4E2"
                                              : "#2F3C96",
                                          }}
                                        >
                                          {simplifiedTitles.get(p.title) ||
                                            p.simplifiedTitle ||
                                            p.title ||
                                            "Untitled Publication"}
                                        </h3>
                                      </div>
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

                          {groupedFavorites.publication.length > 0 &&
                            groupedFavorites.trial.length > 0 && (
                              <div
                                className="my-8 border-t-2 rounded-full"
                                style={{
                                  borderColor: "rgba(47, 60, 150, 0.25)",
                                }}
                              />
                            )}

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
                                            <Beaker className="w-3 h-3" /> Trial
                                          </span>
                                          {isAddedByUrl && (
                                            <span className="inline-flex items-center px-2 py-0.5 bg-[rgba(208,196,226,0.4)] text-[#253075] text-xs font-medium rounded-full border border-[rgba(47,60,150,0.2)]">
                                              <LinkIcon className="w-3 h-3 mr-1" />{" "}
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
                                      <div className="mb-4">
                                        <h3
                                          className="text-lg font-bold mb-0 line-clamp-3 leading-snug"
                                          style={{
                                            color: t.isRead
                                              ? "#D0C4E2"
                                              : "#2F3C96",
                                          }}
                                        >
                                          {simplifiedTrialSummaries.get(
                                            t.title,
                                          ) ||
                                            t.simplifiedTitle ||
                                            t.title ||
                                            "Untitled Trial"}
                                        </h3>
                                      </div>
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
                                      <div className="mt-auto">
                                        <button
                                          onClick={() =>
                                            generateSummary(t, "trial", false)
                                          }
                                          className="w-full flex items-center justify-center gap-2 py-2 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
                                          style={{
                                            background:
                                              "linear-gradient(135deg, #2F3C96, #253075)",
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
                                      >
                                        <Info className="w-3.5 h-3.5" /> View
                                        Contact Information
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

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
                                          onClick={() => {
                                            if (fav.type === "expert")
                                              setExpertModal({
                                                open: true,
                                                expert: e,
                                              });
                                            else
                                              setCollaboratorModal({
                                                open: true,
                                                collaborator: e,
                                              });
                                          }}
                                          className="w-full py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md mt-auto"
                                          style={{
                                            background:
                                              "linear-gradient(135deg, #2F3C96, #253075)",
                                            color: "#FFFFFF",
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
                                                  <Tag className="w-3 h-3 inline mr-1" />{" "}
                                                  {t.categoryName}
                                                </span>
                                              )}
                                            </div>
                                            <h3
                                              className="font-bold text-base line-clamp-2 mb-2"
                                              style={{ color: "#2F3C96" }}
                                            >
                                              {t.title ||
                                                t.name ||
                                                "Untitled Thread"}
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
                                        {(t.body || t.description) && (
                                          <div className="mb-3">
                                            <p
                                              className="text-xs line-clamp-3"
                                              style={{ color: "#787878" }}
                                            >
                                              {t.body || t.description}
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
                              backgroundColor: "rgba(208, 196, 226, 0.2)",
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
                            Start saving your favorite trials, publications,
                            collaborators, and forums for easy access later.
                          </p>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="col-span-full text-center py-16">
                      <div
                        className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                        style={{
                          backgroundColor: "rgba(208, 196, 226, 0.2)",
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
                        Start saving your favorite trials, publications,
                        collaborators, and forums for easy access later.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
            style={{ border: "1px solid rgba(47, 60, 150, 0.2)" }}
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
                  />
                  <p className="font-medium" style={{ color: "#2F3C96" }}>
                    Generating your summary report...
                  </p>
                  <p className="text-sm mt-2" style={{ color: "#787878" }}>
                    This may take a few moments
                  </p>
                </div>
              ) : favoritesReportModal.report ? (
                <div className="space-y-6">
                  <div
                    className="flex gap-3 pb-4 border-b"
                    style={{ borderColor: "rgba(47, 60, 150, 0.15)" }}
                  >
                    <button
                      onClick={exportFavoritesSummaryToPDF}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
                      style={{ backgroundColor: "#2F3C96" }}
                    >
                      <FileText className="w-4 h-4" /> Export PDF
                    </button>
                  </div>
                  <div className="space-y-8">
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
                        <User className="w-6 h-6" /> Context
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p
                            className="text-sm font-semibold mb-1"
                            style={{ color: "#787878" }}
                          >
                            Name:
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
                    {favoritesReportModal.report.experts?.length > 0 && (
                      <div className="space-y-3">
                        <h3
                          className="text-lg font-semibold flex items-center gap-2"
                          style={{ color: "#2F3C96" }}
                        >
                          <User className="w-5 h-5" /> {expertsLabel} Selected (
                          {favoritesReportModal.report.experts.length})
                        </h3>
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
                    {favoritesReportModal.report.publications?.length > 0 && (
                      <div className="space-y-3">
                        <h3
                          className="text-lg font-semibold flex items-center gap-2"
                          style={{ color: "#2F3C96" }}
                        >
                          <FileText className="w-5 h-5" /> Publications Selected
                          ({favoritesReportModal.report.publications.length})
                        </h3>
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
                    {favoritesReportModal.report.trials?.length > 0 && (
                      <div className="space-y-3">
                        <h3
                          className="text-lg font-semibold flex items-center gap-2"
                          style={{ color: "#2F3C96" }}
                        >
                          <Beaker className="w-5 h-5" /> Trials Selected (
                          {favoritesReportModal.report.trials.length})
                        </h3>
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
                    ) || trialDetailsModal.trial.title}
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
              {(trialDetailsModal.trial.description ||
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
                  </h4>
                  <p
                    className="text-sm leading-relaxed whitespace-pre-line"
                    style={{ color: "#787878" }}
                  >
                    {trialDetailsModal.trial.description ||
                      trialDetailsModal.trial.conditionDescription}
                  </p>
                </div>
              )}

              {/* 2. Who Can Join (Eligibility) */}
              {trialDetailsModal.trial.eligibility && (
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
                  </h4>

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
                        {trialDetailsModal.trial.eligibility.gender || "All"}
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
                        {trialDetailsModal.trial.eligibility.minimumAge !==
                          "Not specified" &&
                        trialDetailsModal.trial.eligibility.minimumAge
                          ? trialDetailsModal.trial.eligibility.minimumAge
                          : "N/A"}
                        {" - "}
                        {trialDetailsModal.trial.eligibility.maximumAge !==
                          "Not specified" &&
                        trialDetailsModal.trial.eligibility.maximumAge
                          ? trialDetailsModal.trial.eligibility.maximumAge
                          : "N/A"}
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
                        {trialDetailsModal.trial.eligibility
                          .healthyVolunteers || "Unknown"}
                      </p>
                    </div>
                  </div>

                  {/* Detailed Eligibility Criteria */}
                  {trialDetailsModal.trial.eligibility.criteria &&
                    trialDetailsModal.trial.eligibility.criteria !==
                      "Not specified" &&
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
                  {trialDetailsModal.trial.eligibility.population && (
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

              {/* 3. Contact Information */}
              {trialDetailsModal.trial.contacts?.length > 0 && (
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
                    {publicationDetailsModal.publication.title}
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
                className="bottom-0 pb-5 px-6 py-4 border-t bg-white/95 backdrop-blur-sm shadow-lg"
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
                        e.currentTarget.style.borderColor =
                          "rgba(47, 60, 150, 0.4)";
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
                        e.currentTarget.style.borderColor =
                          "rgba(208, 196, 226, 0.3)";
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
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
              style={
                summaryModal.type === "trial"
                  ? {
                      backgroundColor: "rgba(232, 224, 239, 0.8)",
                      color: "#2F3C96",
                    }
                  : {
                      backgroundColor: "rgba(232, 224, 239, 0.8)",
                      color: "#2F3C96",
                    }
              }
            >
              {summaryModal.type === "trial"
                ? "Clinical Trial"
                : "Research Publication"}
            </span>
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
              {/* Simplify Summary Option */}
              {!summaryModal.isSimplified &&
                !summaryModal.loading &&
                summaryModal.summary && (
                  <button
                    onClick={simplifySummary}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all border"
                    style={{
                      backgroundColor: "rgba(208, 196, 226, 0.1)",
                      color: "#2F3C96",
                      borderColor: "rgba(208, 196, 226, 0.3)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "rgba(208, 196, 226, 0.2)";
                      e.currentTarget.style.borderColor =
                        "rgba(47, 60, 150, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "rgba(208, 196, 226, 0.1)";
                      e.currentTarget.style.borderColor =
                        "rgba(208, 196, 226, 0.3)";
                    }}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Simplify Summary</span>
                  </button>
                )}
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
              {/* Simplify Summary Option */}
              {!summaryModal.isSimplified &&
                !summaryModal.loading &&
                summaryModal.summary && (
                  <button
                    onClick={simplifySummary}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all border"
                    style={{
                      backgroundColor: "rgba(208, 196, 226, 0.1)",
                      color: "#2F3C96",
                      borderColor: "rgba(208, 196, 226, 0.3)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "rgba(208, 196, 226, 0.2)";
                      e.currentTarget.style.borderColor =
                        "rgba(47, 60, 150, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "rgba(208, 196, 226, 0.1)";
                      e.currentTarget.style.borderColor =
                        "rgba(208, 196, 226, 0.3)";
                    }}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Simplify Summary</span>
                  </button>
                )}
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
                      {typeof expertModal.expert.location === "string"
                        ? expertModal.expert.location
                        : `${expertModal.expert.location.city || ""}${
                            expertModal.expert.location.city &&
                            expertModal.expert.location.country
                              ? ", "
                              : ""
                          }${expertModal.expert.location.country || ""}`}
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
                ...(expertModal.expert.researchInterests || []),
              ];
              return interests.length > 0 ? (
                <div>
                  <h4 className="font-semibold text-indigo-700 mb-2">
                    Research Interests
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
            {(expertModal.expert.bio || expertModal.expert.biography) && (
              <div>
                <h4 className="font-semibold text-indigo-700 mb-2">
                  Biography
                </h4>
                <p className="text-sm text-indigo-800 leading-relaxed whitespace-pre-wrap">
                  {expertModal.expert.bio || expertModal.expert.biography}
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
                  const params = new URLSearchParams();
                  params.set("name", expertModal.expert.name || "");
                  if (expertModal.expert.affiliation)
                    params.set("affiliation", expertModal.expert.affiliation);
                  if (expertModal.expert.location)
                    params.set("location", expertModal.expert.location);
                  if (expertModal.expert.orcid)
                    params.set("orcid", expertModal.expert.orcid);
                  if (expertModal.expert.biography)
                    params.set("biography", expertModal.expert.biography);
                  if (
                    expertModal.expert.researchInterests &&
                    Array.isArray(expertModal.expert.researchInterests)
                  ) {
                    params.set(
                      "researchInterests",
                      JSON.stringify(expertModal.expert.researchInterests),
                    );
                  }
                  params.set("from", "dashboard");
                  navigate(`/expert/profile?${params.toString()}`);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                <Info className="w-4 h-4" />
                View Profile
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Collaborator Modal */}
      <Modal
        isOpen={collaboratorModal.open}
        onClose={() =>
          setCollaboratorModal({ open: false, collaborator: null })
        }
        title={collaboratorModal.collaborator?.name || "Collaborator"}
      >
        {collaboratorModal.collaborator && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4 pb-4 border-b border-indigo-200">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md">
                {collaboratorModal.collaborator.name
                  ?.charAt(0)
                  ?.toUpperCase() || "C"}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-indigo-900 text-lg">
                    {collaboratorModal.collaborator.name ||
                      "Unknown Researcher"}
                  </h3>
                  {collaboratorModal.collaborator.available === true ? (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-300 flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3" />
                      Open for Meetings
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-400/20 text-slate-700 text-xs font-semibold rounded-full border border-slate-300 flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3" />
                      Not Available for Collaboration
                    </span>
                  )}
                </div>
                {collaboratorModal.collaborator.location && (
                  <div className="flex items-center gap-1 text-sm text-indigo-600 mb-1">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {collaboratorModal.collaborator.location.city || ""}
                      {collaboratorModal.collaborator.location.city &&
                        collaboratorModal.collaborator.location.country &&
                        ", "}
                      {collaboratorModal.collaborator.location.country || ""}
                    </span>
                  </div>
                )}
                {collaboratorModal.collaborator.orcid && (
                  <div className="flex items-center gap-1 text-sm text-indigo-600">
                    <LinkIcon className="w-4 h-4" />
                    <a
                      href={`https://orcid.org/${collaboratorModal.collaborator.orcid}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      ORCID: {collaboratorModal.collaborator.orcid}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Medical Interests */}
            {(() => {
              const interests = [
                ...(collaboratorModal.collaborator.specialties || []),
                ...(collaboratorModal.collaborator.interests || []),
              ];
              return interests.length > 0 ? (
                <div>
                  <h4 className="font-semibold text-indigo-700 mb-2">
                    Research Interests
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {interests.map((interest, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Biography */}
            {collaboratorModal.collaborator.bio && (
              <div>
                <h4 className="font-semibold text-indigo-700 mb-2">
                  Biography
                </h4>
                <p className="text-sm text-indigo-800 leading-relaxed whitespace-pre-wrap">
                  {collaboratorModal.collaborator.bio}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-indigo-200">
              <button
                onClick={async () => {
                  const collaboratorId =
                    collaboratorModal.collaborator._id ||
                    collaboratorModal.collaborator.userId ||
                    collaboratorModal.collaborator.id;
                  await toggleFollow(collaboratorId, "researcher");
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all min-w-0 ${
                  followingStatus[
                    collaboratorModal.collaborator._id ||
                      collaboratorModal.collaborator.userId ||
                      collaboratorModal.collaborator.id
                  ]
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-2 border-emerald-300"
                    : "bg-gradient-to-r from-emerald-600 to-indigo-600 text-white hover:from-emerald-700 hover:to-indigo-700"
                }`}
              >
                {followingStatus[
                  collaboratorModal.collaborator._id ||
                    collaboratorModal.collaborator.userId ||
                    collaboratorModal.collaborator.id
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
              {/* Connect button - only for researchers viewing on-platform collaborators */}
              {user?.role === "researcher" &&
                (collaboratorModal.collaborator._id ||
                  collaboratorModal.collaborator.userId) && (
                  <>
                    {(() => {
                      const cid =
                        collaboratorModal.collaborator._id ||
                        collaboratorModal.collaborator.userId ||
                        collaboratorModal.collaborator.id;
                      const status = connectionRequestStatus[cid] || {};
                      if (status.isConnected) {
                        return (
                          <button
                            onClick={() => {
                              setMessageModal({
                                open: true,
                                collaborator: collaboratorModal.collaborator,
                                body: "",
                              });
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-blue-700 transition-all min-w-0"
                          >
                            <MessageCircle className="w-4 h-4" />
                            Message
                          </button>
                        );
                      }
                      if (status.status === "pending") {
                        return (
                          <button
                            disabled
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-200 text-slate-600 rounded-lg font-semibold cursor-not-allowed min-w-0"
                          >
                            <Clock className="w-4 h-4" />
                            {status.isRequester
                              ? "Request Sent"
                              : "Request Pending"}
                          </button>
                        );
                      }
                      if (status.status === "rejected") {
                        return (
                          <button
                            disabled
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-100 text-red-600 rounded-lg font-semibold cursor-not-allowed min-w-0"
                          >
                            <AlertCircle className="w-4 h-4" />
                            Rejected
                          </button>
                        );
                      }
                      return (
                        <button
                          onClick={() =>
                            setConnectionRequestModal({
                              open: true,
                              message: "",
                              collaborator: collaboratorModal.collaborator,
                            })
                          }
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-indigo-500 text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-all min-w-0"
                        >
                          <UserPlus className="w-4 h-4" />
                          Connect
                        </button>
                      );
                    })()}
                  </>
                )}
              <button
                onClick={() => {
                  const collaboratorId =
                    collaboratorModal.collaborator._id ||
                    collaboratorModal.collaborator.userId ||
                    collaboratorModal.collaborator.id;
                  if (collaboratorId) {
                    const params = new URLSearchParams();
                    if (collaboratorModal.collaborator.name)
                      params.set("name", collaboratorModal.collaborator.name);
                    const locationText = collaboratorModal.collaborator.location
                      ? typeof collaboratorModal.collaborator.location ===
                        "string"
                        ? collaboratorModal.collaborator.location
                        : `${
                            collaboratorModal.collaborator.location.city || ""
                          }${
                            collaboratorModal.collaborator.location.city &&
                            collaboratorModal.collaborator.location.country
                              ? ", "
                              : ""
                          }${
                            collaboratorModal.collaborator.location.country ||
                            ""
                          }`.trim()
                      : null;
                    if (locationText) params.set("location", locationText);
                    if (collaboratorModal.collaborator.bio)
                      params.set("bio", collaboratorModal.collaborator.bio);
                    navigate(
                      `/collabiora-expert/profile/${collaboratorId}?${params.toString()}`,
                    );
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-blue-700 transition-all"
              >
                <Info className="w-4 h-4" />
                View Profile
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Connection Request Modal (for researchers connecting with on-platform collaborators) */}
      <Modal
        isOpen={connectionRequestModal.open}
        onClose={() =>
          setConnectionRequestModal({
            open: false,
            message: "",
            collaborator: null,
          })
        }
        title="Send Connection Request"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Send a connection request to collaborate with{" "}
            {connectionRequestModal.collaborator?.name || "this researcher"}.
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
                  collaborator: null,
                })
              }
              className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Message Modal */}
      <Modal
        isOpen={messageModal.open}
        onClose={() =>
          setMessageModal({ open: false, collaborator: null, body: "" })
        }
        title={`Message ${messageModal.collaborator?.name || "Collaborator"}`}
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
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
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
                  <Beaker className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-bold text-slate-900 text-lg">
                    {contactModal.trial?.title || "Trial"}
                  </h4>
                </div>
                <p className="text-sm text-slate-600">
                  Trial ID:{" "}
                  {contactModal.trial?.id || contactModal.trial?._id || "N/A"}
                </p>
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
                    const trial = contactInfoModal.trial;
                    closeContactInfoModal();
                    setContactStepsModal({
                      open: true,
                      trial,
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

      {/* Filter/Sort Modal */}
      <Modal
        isOpen={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        title={
          selectedCategory === "trials" ? "Filter Trials" : "Sort Publications"
        }
      >
        <div className="space-y-6">
          {selectedCategory === "trials" ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-3">
                  Filter by Status
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setTrialFilter("");
                      setFilterModalOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 rounded-lg border transition-all ${
                      !trialFilter
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-medium"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    All Statuses
                  </button>
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setTrialFilter(status);
                        setFilterModalOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg border transition-all ${
                        trialFilter === status
                          ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-medium"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {status.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
              {trialFilter && (
                <div className="pt-4 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setTrialFilter("");
                      setFilterModalOpen(false);
                    }}
                    className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Clear Filter
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-3">
                  Sort By
                </label>
                <div className="space-y-2">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setPublicationSort(option.value);
                        setFilterModalOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg border transition-all ${
                        publicationSort === option.value
                          ? "bg-blue-50 border-blue-300 text-blue-700 font-medium"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
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
                        <h4 className="font-bold text-lg text-slate-900">
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
                        className="font-bold text-lg"
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
                        className="font-semibold mb-2 flex items-center gap-2"
                        style={{ color: "#2F3C96" }}
                      >
                        <BookOpen
                          className="w-4 h-4 shrink-0"
                          style={{ color: "#2F3C96" }}
                        />
                        Publications
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
                                className="text-sm font-medium block mb-1 hover:underline"
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

                <div
                  className="pt-2 border-t"
                  style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                >
                  <h4
                    className="font-semibold mb-2"
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

      {/* Manage Profile Publications Modal */}
      <ManageProfilePublications
        isOpen={showManagePublications}
        onClose={() => setShowManagePublications(false)}
        baseUrl={base}
        token={localStorage.getItem("token")}
        existingSelected={userProfile?.researcher?.selectedPublications || []}
        onSaved={() => {
          const userId = user?._id || user?.id;
          if (userId) {
            fetch(`${base}/api/profile/${userId}`)
              .then((r) => r.json())
              .then((d) => {
                if (d.profile) setUserProfile(d.profile);
              });
            if (userProfile?.researcher?.orcid) {
              fetchOrcidStats(userProfile.researcher.orcid, userId);
            }
          }
          toast.success("Publications updated");
        }}
      />
      <ScrollToTop />
    </div>
  );
}
