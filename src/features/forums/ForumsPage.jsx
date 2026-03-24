"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { requireEmailVerification } from "../../utils/requireEmailVerification.js";
import {
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  User,
  Eye,
  Clock,
  Plus,
  Send,
  ChevronUp,
  ChevronDown,
  Star,
  Loader2,
  Search,
  Users,
  Sparkles,
  UserCheck,
  Globe,
  CheckCircle2,
  X,
  ChevronRight,
  Heart,
  Compass,
  Filter,
  Tag,
  UserPlus,
  Pencil,
  Trash2,
  Reply,
  Share2,
} from "lucide-react";
import {
  IconHospital,
  IconRibbonHealth,
  IconBrain,
  IconDroplet,
  IconHeartbeat,
  IconSalad,
  IconBarbell,
  IconMicroscope,
  IconBandage,
  IconShield,
  IconStethoscope,
} from "@tabler/icons-react";
import Layout from "../../components/Layout.jsx";
import AnimatedBackground from "../../components/ui/AnimatedBackground.jsx";
import CustomSelect from "../../components/ui/CustomSelect.jsx";
import FormattedForumContent from "../../components/FormattedForumContent.jsx";
import { AuroraText } from "../../components/ui/aurora-text";
import { getDisplayName } from "../../utils/researcherDisplayName.js";
import { BorderBeam } from "../../components/ui/border-beam";
import {
  buildDummyThreadsForMerge,
  getDummyThreadDetails,
  isDummyThreadId,
  isDummyUserId,
  DUMMY_FORUM_HELPER_ID,
} from "../../data/dummyForumThreads.js";

// Icon mapping for communities
const getCommunityIcon = (slug, name) => {
  const iconMap = {
    "general-health": IconHospital,
    "cancer-support": IconRibbonHealth,
    "mental-health": IconBrain,
    "diabetes-management": IconDroplet,
    "heart-health": IconHeartbeat,
    "nutrition-diet": IconSalad,
    "fitness-exercise": IconBarbell,
    "clinical-trials": IconMicroscope,
    "chronic-pain": IconBandage,
    "autoimmune-conditions": IconShield,
    cardiology: IconHeartbeat,
    oncology: IconRibbonHealth,
    neurology: IconBrain,
    "cancer-research": IconMicroscope,
    "basic-preclinical-research": IconMicroscope,
    "translational-research": IconMicroscope,
  };

  // Try slug first, then check name
  const IconComponent =
    iconMap[slug] ||
    iconMap[name?.toLowerCase().replace(/\s+/g, "-")] ||
    IconStethoscope;
  return IconComponent;
};

// Community Icon Component with monochromatic styling
const CommunityIcon = ({ community, size = "1.125rem", style = {} }) => {
  const IconComponent = getCommunityIcon(community?.slug, community?.name);
  const iconColor = style.color || community?.color || "#2F3C96";

  return (
    <IconComponent
      className="shrink-0"
      style={{
        color: iconColor,
        width: size,
        height: size,
        ...style,
      }}
      stroke={1.5}
    />
  );
};

// Deduplicate communities coming from API responses
const dedupeCommunities = (list = []) => {
  const seen = new Set();
  const unique = [];

  list.forEach((community) => {
    const key =
      community?._id || community?.slug || community?.name?.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    unique.push(community);
  });

  return unique;
};

// Category → site-colour classes for icon bg, badge, join button (#2F3C96 / #253075)
const getCategoryColorClasses = () => ({
  icon: "bg-[#2F3C96]/10 text-[#2F3C96]",
  badge: "bg-[#2F3C96]/10 text-[#2F3C96]",
  join: "border border-[#2F3C96]/50 text-[#2F3C96] hover:bg-[#2F3C96]/10 hover:border-[#2F3C96]",
});

// Sanitize SVG string for safe inline render (strip script and event handlers)
const sanitizeSvgForIcon = (svg) => {
  if (!svg || typeof svg !== "string") return "";
  return svg
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\s+on\w+\s*=\s*[^\s>]+/gi, "");
};

// Forum subcategories/tags for patient posts
const FORUM_SUBCATEGORY_TAGS = [
  "Symptoms",
  "Just Diagnosed",
  "Medications & Side Effects",
  "Alternative & Complementary Therapies",
  "Clinical Trials",
  "Diet & Nutrition",
  "Exercise & Mobility",
  "Mental Health & Coping",
  "Patient Support Groups",
  "Insurance & Financial Aid",
  "Advocacy & Awareness",
];

const TITLE_MAX_LENGTH = 240;
const CONTENT_MAX_LENGTH = 500;

// Default condition tags using patient-friendly taxonomy
const DEFAULT_CONDITION_TAGS = {
  default: [
    "General Health",
    "Preventive Care",
    "Sleep Health",
    "Stress Management",
  ],
  "autoimmune-conditions": [
    "Lupus (SLE)",
    "Rheumatoid Arthritis (RA)",
    "Multiple Sclerosis (MS)",
    "Psoriasis / Psoriatic Arthritis",
    "Sjögren’s Syndrome",
    "Crohn’s Disease / Ulcerative Colitis",
    "Hashimoto’s Thyroiditis",
    "Type 1 Diabetes",
    "General Autoimmune",
  ],
  "cancer-support": [
    "Breast Cancer",
    "Lung Cancer",
    "Prostate Cancer",
    "Colorectal Cancer",
    "Blood Cancers",
    "Brain Tumors",
    "Metastatic Cancer",
    "Cancer Survivorship",
  ],
  "heart-health": [
    "Hypertension (High BP)",
    "Heart Disease",
    "Arrhythmia",
    "Heart Failure",
    "Coronary Artery Disease",
    "Stroke Risk",
  ],
  "mental-health": [
    "Anxiety Disorders",
    "Depression",
    "Bipolar Disorder",
    "PTSD",
    "ADHD",
    "OCD",
  ],
  "chronic-pain": [
    "Fibromyalgia",
    "Chronic Back Pain",
    "Neuropathic Pain",
    "Arthritis Pain",
    "Post-Surgical Pain",
  ],
  "clinical-trials": [
    "Cancer Trials",
    "Autoimmune Trials",
    "Neurology Trials",
    "Cardiology Trials",
  ],
  "fitness-exercise": [
    "General Fitness",
    "Rehab & Recovery",
    "Adaptive Exercise",
  ],
  "nutrition-diet": [
    "Weight Management",
    "Diabetes Nutrition",
    "Heart-Healthy Diet",
    "Autoimmune Diets",
    "Cancer Nutrition",
  ],
  "general-health": [
    "General Health",
    "Preventive Care",
    "Aging",
    "Men’s Health",
    "Women’s Health",
    "Sleep Health",
    "Stress Management",
    "Vaccinations",
  ],
  "diabetes-management": [
    "Type 1 Diabetes",
    "Type 2 Diabetes",
    "Gestational Diabetes",
    "Prediabetes",
  ],
};

const buildConditionTags = (community, threads = []) => {
  const slug =
    community?.slug ||
    community?.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const defaults =
    DEFAULT_CONDITION_TAGS[slug] || DEFAULT_CONDITION_TAGS.default;
  const dynamic =
    threads?.flatMap((t) => t.conditions || [])?.filter(Boolean) || [];

  const seen = new Set();
  const combined = [...defaults, ...dynamic];

  const unique = [];
  combined.forEach((tag) => {
    const key = tag.trim().toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      unique.push(tag.trim());
    }
  });

  return ["All", ...unique];
};

export default function Forums() {
  const [communities, setCommunities] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [threads, setThreads] = useState([]);
  const [expandedThreads, setExpandedThreads] = useState({});
  const [expandedThreadIds, setExpandedThreadIds] = useState(new Set());
  const [loadingThreadDetails, setLoadingThreadDetails] = useState(new Set());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [newThreadModal, setNewThreadModal] = useState(false);
  const [newSubcategoryModal, setNewSubcategoryModal] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [newSubcategoryDescription, setNewSubcategoryDescription] =
    useState("");
  const [newSubcategoryTags, setNewSubcategoryTags] = useState([]);
  const [meshSuggestions, setMeshSuggestions] = useState([]);
  const [meshInput, setMeshInput] = useState("");
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadBody, setNewThreadBody] = useState("");
  const [newThreadSubcategory, setNewThreadSubcategory] = useState(null);
  const [newThreadTags, setNewThreadTags] = useState([]);
  const [newThreadMeshInput, setNewThreadMeshInput] = useState("");
  const [newThreadMeshSuggestions, setNewThreadMeshSuggestions] = useState([]);
  const [newThreadConditions, setNewThreadConditions] = useState([]);
  const [newThreadConditionInput, setNewThreadConditionInput] = useState("");
  const [conditionSuggestions, setConditionSuggestions] = useState([]);
  const [
    newThreadOnlyResearchersCanReply,
    setNewThreadOnlyResearchersCanReply,
  ] = useState(false);
  const [modalSelectedCommunity, setModalSelectedCommunity] = useState(null);
  const [modalSubcategories, setModalSubcategories] = useState([]);
  const [loadingModalSubcategories, setLoadingModalSubcategories] =
    useState(false);
  const tagSuggestionsRef = useRef(null);
  const conditionSuggestionsRef = useRef(null);
  const [replyBody, setReplyBody] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editReplyBody, setEditReplyBody] = useState({});
  const [deletingReplyIds, setDeletingReplyIds] = useState(new Set());
  const [deletingThreadId, setDeletingThreadId] = useState(null);
  const [updatingReplyIds, setUpdatingReplyIds] = useState(new Set());
  const [favorites, setFavorites] = useState([]);
  const [favoritingItems, setFavoritingItems] = useState(new Set());
  const [followingIds, setFollowingIds] = useState(new Set());
  const [followingLoading, setFollowingLoading] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("communities"); // "posts" or "communities" — Communities open by default
  const [forumCategories, setForumCategories] = useState([]); // { _id, name, slug, sortOrder, defaultOpen, headingColor, communities[] }
  const [loadingForumCategories, setLoadingForumCategories] = useState(false);
  const [categoryOpenState, setCategoryOpenState] = useState({});
  const [activeTab, setActiveTab] = useState("all"); // all, following, forYou, involving, researcherReplied, replied
  const [sortBy, setSortBy] = useState("popular"); // recent, popular — default: most members first
  const [hoveredCommunity, setHoveredCommunity] = useState(null);
  const [isExploreCollapsed, setIsExploreCollapsed] = useState(true);
  const [mobileCommunityId, setMobileCommunityId] = useState("");
  const [selectedConditionTag, setSelectedConditionTag] = useState("All"); // Now used for tag filtering
  const [proposeCommunityModal, setProposeCommunityModal] = useState(false);
  const [proposeTitle, setProposeTitle] = useState("");
  const [proposeDescription, setProposeDescription] = useState("");
  const [proposeThumbnailUrl, setProposeThumbnailUrl] = useState("");
  const [proposeSubmitting, setProposeSubmitting] = useState(false);
  const [proposeThumbnailUploading, setProposeThumbnailUploading] =
    useState(false);
  const [joinGuidelinesModalCommunity, setJoinGuidelinesModalCommunity] =
    useState(null);
  const [userProfileModalUserId, setUserProfileModalUserId] = useState(null);
  const [userProfileModalData, setUserProfileModalData] = useState(null);
  const [userProfileModalLoading, setUserProfileModalLoading] = useState(false);
  const [followingUserIds, setFollowingUserIds] = useState(new Set()); // User IDs the current user follows (people, not communities)
  const [followUserLoading, setFollowUserLoading] = useState(new Set());
  const [showFollowAfterFavorite, setShowFollowAfterFavorite] = useState(null); // { authorUserId, username } when we want to prompt "Want to follow them too?"
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [tagsFieldTouched, setTagsFieldTouched] = useState(false);
  const [tagsSubmitAttempted, setTagsSubmitAttempted] = useState(false);
  const [communityGuidelinesCollapsed, setCommunityGuidelinesCollapsed] =
    useState(true);
  const [showShareToDiscoveryModal, setShowShareToDiscoveryModal] =
    useState(false);
  const [newlyCreatedThread, setNewlyCreatedThread] = useState(null);
  const [shareMessage, setShareMessage] = useState("");
  const [sharingToDiscovery, setSharingToDiscovery] = useState(false);
  const [sharedThreadIds, setSharedThreadIds] = useState(new Set()); // Track which threads are already shared

  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const navigate = useNavigate();
  const location = useLocation();

  function mergeDummyThreads(apiThreads, promotedDummyKeys = []) {
    const list = Array.isArray(apiThreads) ? apiThreads : [];
    const dummies = buildDummyThreadsForMerge(
      communities,
      selectedCommunity?.slug ?? null,
    );

    const normalizeTitle = (t) => (t || "").trim().replace(/\s+/g, " ");
    const apiTitles = new Set(
      list.map((t) => normalizeTitle(t.title)).filter(Boolean),
    );

    // Filter out: (1) promoted dummies, (2) dummies that already have a real thread with same title (avoid duplicate cards)
    const promotedSet = new Set(promotedDummyKeys);
    const activeDummies = dummies.filter(
      (d) => !promotedSet.has(d._id) && !apiTitles.has(normalizeTitle(d.title)),
    );

    return [...list, ...activeDummies];
  }

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(userData);
    loadCommunities();
    if (userData?._id || userData?.id) {
      loadFavorites();
    }
  }, []);

  // Load list of user IDs the current user follows (for Follow button in user profile modal)
  useEffect(() => {
    if (!user?._id && !user?.id) return;
    const userId = user._id || user.id;
    fetch(
      `${base}/api/follow/following-ids?userId=${encodeURIComponent(userId)}`,
    )
      .then((res) => (res.ok ? res.json() : { followingIds: [] }))
      .then((data) => setFollowingUserIds(new Set(data.followingIds || [])))
      .catch(() => setFollowingUserIds(new Set()));
  }, [user?._id, user?.id, base]);

  // After redirect from community page (join): open Posts view with that community selected
  useEffect(() => {
    const state = location.state;
    if (!state?.redirectCommunityId || communities.length === 0) return;
    const community = communities.find(
      (c) => c._id === state.redirectCommunityId,
    );
    if (community) {
      setSelectedCommunity(community);
      setViewMode("posts");
      if (state.openThreadId) {
        setExpandedThreadIds((prev) => new Set(prev).add(state.openThreadId));
      }
      window.history.replaceState({}, document.title, "/forums");
    }
  }, [location.state, communities]);

  // Open Communities tab when navigating from Discovery "Discover Communities"
  useEffect(() => {
    const state = location.state;
    if (state?.openView === "communities") {
      setViewMode("communities");
      window.history.replaceState({}, document.title, "/forums");
    }
  }, [location.state]);

  // Load forum display categories (with communities) for the Communities tab
  useEffect(() => {
    if (viewMode !== "communities") return;
    let cancelled = false;
    setLoadingForumCategories(true);
    const userId = (user?._id || user?.id)?.toString() || "";
    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    fetch(`${base}/api/communities/categories?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { categories: [] }))
      .then((data) => {
        if (cancelled) return;
        const cats = data.categories || [];
        setForumCategories(cats);
        setCategoryOpenState((prev) => {
          const next = { ...prev };
          cats.forEach((c) => {
            if (next[c._id] === undefined) next[c._id] = !!c.defaultOpen;
          });
          return next;
        });
      })
      .catch(() => {
        if (!cancelled) setForumCategories([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingForumCategories(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewMode, base, user?._id, user?.id]);

  useEffect(() => {
    if (selectedCommunity) {
      loadSubcategories(selectedCommunity._id);
      setSelectedSubcategory(null);
    } else {
      setSubcategories([]);
      setSelectedSubcategory(null);
    }
  }, [selectedCommunity]);

  useEffect(() => {
    if (modalSelectedCommunity) {
      loadModalSubcategories(modalSelectedCommunity._id);
    } else {
      setModalSubcategories([]);
      setNewThreadSubcategory(null);
    }
  }, [modalSelectedCommunity]);

  useEffect(() => {
    setSelectedConditionTag("All");
  }, [selectedCommunity?._id]);

  useEffect(() => {
    setMobileCommunityId(selectedCommunity?._id || "");
  }, [selectedCommunity]);

  // Memoize thread IDs to use as dependency
  const threadIdsString = useMemo(() => {
    return threads
      .map((t) => t._id)
      .filter(Boolean)
      .join(",");
  }, [threads]);

  // Check shared status whenever threads change
  useEffect(() => {
    // Reset shared status when user logs out or threads are cleared
    if (!user || !threads.length) {
      setSharedThreadIds(new Set());
      return;
    }

    // Get all threads authored by current user
    const userThreads = threads.filter((t) => {
      const authorId =
        t.authorUserId?._id?.toString() || t.authorUserId?.toString();
      const currentUserId = (user._id || user.id)?.toString();
      return authorId === currentUserId;
    });

    if (userThreads.length > 0) {
      const threadIds = userThreads.map((t) => t._id).filter(Boolean);
      if (threadIds.length > 0) {
        loadSharedThreadIds(threadIds);
      } else {
        setSharedThreadIds(new Set());
      }
    } else {
      setSharedThreadIds(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadIdsString, user?._id, user?.id]);

  const threadMatchesSelectedTag = (thread, selectedTag) => {
    if (!selectedTag || selectedTag === "All") return true;
    // Check both tags and conditions for backward compatibility
    const threadTags = thread?.tags || [];
    const threadConditions = thread?.conditions || [];
    return [...threadTags, ...threadConditions].some(
      (tag) => tag?.toLowerCase() === selectedTag.toLowerCase(),
    );
  };

  // Close tag suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        tagSuggestionsRef.current &&
        !tagSuggestionsRef.current.contains(event.target)
      ) {
        setNewThreadMeshSuggestions([]);
      }
      if (
        conditionSuggestionsRef.current &&
        !conditionSuggestionsRef.current.contains(event.target)
      ) {
        setConditionSuggestions([]);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Don't reload threads if user is searching
    if (searchQuery.trim()) {
      return;
    }

    if (selectedSubcategory) {
      loadThreadsBySubcategory();
    } else if (selectedCommunity) {
      loadThreads();
    } else if (activeTab === "forYou" && user) {
      loadRecommendedThreads();
    } else if (activeTab === "involving" && user) {
      loadInvolvingThreads();
    } else if (activeTab === "following" && user) {
      loadFollowingFeed();
    } else if (activeTab === "researcherReplied") {
      loadResearcherRepliedThreads();
    } else if (activeTab === "replied") {
      loadRepliedThreads();
    } else if (activeTab === "all" && !selectedCommunity) {
      loadAllThreads();
    }
  }, [
    selectedCommunity,
    selectedSubcategory,
    activeTab,
    sortBy,
    searchQuery,
    selectedConditionTag,
  ]);

  async function loadFavorites() {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (!userData?._id && !userData?.id) return;

    try {
      const response = await fetch(
        `${base}/api/favorites/${userData._id || userData.id}`,
      );
      if (response.ok) {
        const data = await response.json();
        setFavorites(data.items || []);
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
    }
  }

  function openUserProfileModal(userId) {
    const uid = userId?.toString?.() || userId;
    if (!uid) return;
    setUserProfileModalUserId(uid);
    setUserProfileModalData(null);
    setUserProfileModalLoading(true);
    if (uid === DUMMY_FORUM_HELPER_ID) {
      setUserProfileModalData({
        isForumHelper: true,
        user: { username: "collabiora_forum", role: "patient" },
      });
      setUserProfileModalLoading(false);
      return;
    }
    if (isDummyUserId(uid)) {
      setUserProfileModalData({
        isSampleParticipant: true,
        user: {
          displayName: "Sample participant",
          username: (uid || "").toString(),
        },
      });
      setUserProfileModalLoading(false);
      return;
    }
    fetch(`${base}/api/profile/${uid}/forum-profile`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setUserProfileModalData(data);
      })
      .catch(() => setUserProfileModalData(null))
      .finally(() => setUserProfileModalLoading(false));
  }

  async function handleFollowUserInModal(profileUserId, profileRole) {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to follow");
      return;
    }
    if (!requireEmailVerification()) return;
    const uid = profileUserId?.toString?.() || profileUserId;
    if (!uid || followUserLoading.has(uid)) return;
    const isFollowing = followingUserIds.has(uid);
    setFollowUserLoading((prev) => new Set(prev).add(uid));
    try {
      if (isFollowing) {
        await fetch(`${base}/api/follow`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            followerId: user._id || user.id,
            followingId: uid,
          }),
        });
        setFollowingUserIds((prev) => {
          const next = new Set(prev);
          next.delete(uid);
          return next;
        });
        toast.success("Unfollowed");
      } else {
        await fetch(`${base}/api/follow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            followerId: user._id || user.id,
            followingId: uid,
            followerRole: user.role,
            followingRole: profileRole || "patient",
            source: "Forums",
          }),
        });
        setFollowingUserIds((prev) => new Set(prev).add(uid));
        toast.success("Following");
      }
    } catch (e) {
      console.error(e);
      toast.error(isFollowing ? "Failed to unfollow" : "Failed to follow");
    } finally {
      setFollowUserLoading((prev) => {
        const next = new Set(prev);
        next.delete(uid);
        return next;
      });
    }
  }

  async function loadCommunities() {
    setLoadingCommunities(true);
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = userData?._id || userData?.id || "";
      const params = new URLSearchParams();
      if (userId) params.set("userId", userId);
      // Filter to show only patient communities (exclude researcher-only communities)
      params.set("type", "patient");

      const response = await fetch(
        `${base}/api/communities?${params.toString()}`,
      );
      if (!response.ok) throw new Error("Failed to fetch communities");

      const data = await response.json();
      const uniqueCommunities = dedupeCommunities(data.communities || []);
      setCommunities(uniqueCommunities);

      // Update following IDs
      const followingSet = new Set();
      uniqueCommunities.forEach((c) => {
        if (c.isFollowing) followingSet.add(c._id);
      });
      setFollowingIds(followingSet);
    } catch (error) {
      console.error("Error loading communities:", error);
      toast.error("Failed to load communities");
    } finally {
      setLoadingCommunities(false);
    }
  }

  async function loadAllThreads() {
    setLoading(true);
    try {
      const response = await fetch(`${base}/api/forums/threads`);
      if (!response.ok) throw new Error("Failed to fetch threads");
      const data = await response.json();
      const threadsData = data.threads || [];
      const promotedKeys = data.promotedDummyKeys || [];
      setThreads(mergeDummyThreads(threadsData, promotedKeys));
      // Shared status will be checked by useEffect when threads change
    } catch (error) {
      console.error("Error loading threads:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSubcategories(communityId) {
    if (!communityId) return;
    setLoadingSubcategories(true);
    try {
      const response = await fetch(
        `${base}/api/communities/${communityId}/subcategories`,
      );
      if (!response.ok) throw new Error("Failed to fetch subcategories");

      const data = await response.json();
      setSubcategories(data.subcategories || []);
    } catch (error) {
      console.error("Error loading subcategories:", error);
    } finally {
      setLoadingSubcategories(false);
    }
  }

  async function loadModalSubcategories(communityId) {
    if (!communityId) return;
    setLoadingModalSubcategories(true);
    try {
      const response = await fetch(
        `${base}/api/communities/${communityId}/subcategories`,
      );
      if (!response.ok) throw new Error("Failed to fetch subcategories");

      const data = await response.json();
      setModalSubcategories(data.subcategories || []);
    } catch (error) {
      console.error("Error loading subcategories:", error);
    } finally {
      setLoadingModalSubcategories(false);
    }
  }

  async function loadThreads() {
    if (!selectedCommunity) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("sort", sortBy);
      // For researcher communities, show all posts including researcher-only; for patient communities, exclude them
      params.set(
        "excludeResearcherForum",
        selectedCommunity.communityType === "researcher" ? "false" : "true",
      );
      // Tag filtering is done client-side now

      const response = await fetch(
        `${base}/api/communities/${
          selectedCommunity._id
        }/threads?${params.toString()}`,
      );
      if (!response.ok) throw new Error("Failed to fetch threads");

      const data = await response.json();
      const fetchedThreads = data.threads || [];
      const promotedKeys = data.promotedDummyKeys || [];
      const filteredThreads = fetchedThreads.filter((thread) =>
        threadMatchesSelectedTag(thread, selectedConditionTag),
      );
      setThreads(mergeDummyThreads(filteredThreads, promotedKeys));
      // Shared status will be checked by useEffect when threads change
    } catch (error) {
      console.error("Error loading threads:", error);
      toast.error("Failed to load threads");
    } finally {
      setLoading(false);
    }
  }

  async function loadThreadsBySubcategory() {
    if (!selectedSubcategory) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("sort", sortBy);
      params.set("subcategoryId", selectedSubcategory._id);
      const isResearcherCommunity =
        selectedCommunity?.communityType === "researcher";
      params.set(
        "excludeResearcherForum",
        isResearcherCommunity ? "false" : "true",
      );
      // Tag filtering is done client-side now

      // Filter threads client-side by subcategory for now
      // In production, add server-side filtering
      const response = await fetch(
        `${base}/api/communities/${
          selectedSubcategory.parentCommunityId || selectedCommunity._id
        }/threads?${params.toString()}`,
      );
      if (!response.ok) throw new Error("Failed to fetch threads");

      const data = await response.json();
      // Filter by subcategory on client side (would be better on server)
      const filteredThreads = (data.threads || []).filter(
        (thread) =>
          thread.subcategoryId?._id === selectedSubcategory._id ||
          thread.subcategoryId === selectedSubcategory._id,
      );
      const conditioned = filteredThreads.filter((thread) =>
        threadMatchesSelectedTag(thread, selectedConditionTag),
      );
      const promotedKeys = data.promotedDummyKeys || [];
      setThreads(mergeDummyThreads(conditioned, promotedKeys));
      // Shared status will be checked by useEffect when threads change
    } catch (error) {
      console.error("Error loading threads:", error);
      toast.error("Failed to load threads");
    } finally {
      setLoading(false);
    }
  }

  async function loadRecommendedThreads() {
    if (!user?._id && !user?.id) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${base}/api/communities/recommended/${user._id || user.id}?limit=20`,
      );
      if (!response.ok) throw new Error("Failed to fetch recommendations");

      const data = await response.json();
      const promotedKeys = data.promotedDummyKeys || [];
      setThreads(mergeDummyThreads(data.threads || [], promotedKeys));
    } catch (error) {
      console.error("Error loading recommendations:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadInvolvingThreads() {
    if (!user?._id && !user?.id) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${base}/api/communities/involving/${user._id || user.id}?limit=20`,
      );
      if (!response.ok) throw new Error("Failed to fetch threads");

      const data = await response.json();
      const promotedKeys = data.promotedDummyKeys || [];
      setThreads(mergeDummyThreads(data.threads || [], promotedKeys));
    } catch (error) {
      console.error("Error loading threads:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFollowingFeed() {
    if (!user?._id && !user?.id) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${base}/api/communities/feed/${user._id || user.id}?limit=20`,
      );
      if (!response.ok) throw new Error("Failed to fetch feed");

      const data = await response.json();
      const promotedKeys = data.promotedDummyKeys || [];
      setThreads(mergeDummyThreads(data.threads || [], promotedKeys));
    } catch (error) {
      console.error("Error loading feed:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadResearcherRepliedThreads() {
    setLoading(true);
    try {
      const response = await fetch(`${base}/api/forums/threads`);
      if (!response.ok) throw new Error("Failed to fetch threads");

      const data = await response.json();
      const allThreads = data.threads || [];

      // Filter threads that have researcher replies
      let filteredThreads = allThreads.filter(
        (thread) => thread.hasResearcherReply === true,
      );

      // Apply sorting based on sortBy state
      if (sortBy === "recent") {
        filteredThreads.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        );
      } else {
        // popular: sort by upvotes (or engagement)
        filteredThreads.sort((a, b) => {
          const aScore =
            (a.upvotes?.length || 0) -
            (a.downvotes?.length || 0) +
            (a.replyCount || 0) * 2;
          const bScore =
            (b.upvotes?.length || 0) -
            (b.downvotes?.length || 0) +
            (b.replyCount || 0) * 2;
          return bScore - aScore;
        });
      }

      const promotedKeys = data.promotedDummyKeys || [];
      setThreads(mergeDummyThreads(filteredThreads, promotedKeys));
    } catch (error) {
      console.error("Error loading researcher replied threads:", error);
      toast.error("Failed to load threads");
    } finally {
      setLoading(false);
    }
  }

  async function loadRepliedThreads() {
    setLoading(true);
    try {
      const response = await fetch(`${base}/api/forums/threads`);
      if (!response.ok) throw new Error("Failed to fetch threads");

      const data = await response.json();
      const allThreads = data.threads || [];

      // Filter threads that have any replies
      let filteredThreads = allThreads.filter(
        (thread) => (thread.replyCount || 0) > 0,
      );

      // Apply sorting based on sortBy state
      if (sortBy === "recent") {
        filteredThreads.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        );
      } else {
        // popular: sort by upvotes (or engagement)
        filteredThreads.sort((a, b) => {
          const aScore =
            (a.upvotes?.length || 0) -
            (a.downvotes?.length || 0) +
            (a.replyCount || 0) * 2;
          const bScore =
            (b.upvotes?.length || 0) -
            (b.downvotes?.length || 0) +
            (b.replyCount || 0) * 2;
          return bScore - aScore;
        });
      }

      const promotedKeys = data.promotedDummyKeys || [];
      setThreads(mergeDummyThreads(filteredThreads, promotedKeys));
    } catch (error) {
      console.error("Error loading replied threads:", error);
      toast.error("Failed to load threads");
    } finally {
      setLoading(false);
    }
  }

  // Refetch thread list so promoted dummy is replaced by real thread in the UI
  function refetchThreadListForCurrentView() {
    if (selectedSubcategory) {
      loadThreadsBySubcategory();
    } else if (selectedCommunity) {
      loadThreads();
    } else if (activeTab === "forYou" && user) {
      loadRecommendedThreads();
    } else if (activeTab === "involving" && user) {
      loadInvolvingThreads();
    } else if (activeTab === "following" && user) {
      loadFollowingFeed();
    } else if (activeTab === "researcherReplied") {
      loadResearcherRepliedThreads();
    } else if (activeTab === "replied") {
      loadRepliedThreads();
    } else {
      loadAllThreads();
    }
  }

  async function searchThreads() {
    if (!searchQuery.trim()) {
      // Clear search - reload based on current view
      if (selectedCommunity) {
        loadThreads();
      } else {
        loadAllThreads();
      }
      return;
    }
    setLoading(true);
    try {
      // Always search from overall forums, not communities
      // Clear selectedCommunity when searching to show all results
      const response = await fetch(`${base}/api/forums/threads`);
      if (!response.ok) throw new Error("Failed to fetch threads");

      const data = await response.json();
      const allThreads = data.threads || [];

      // Filter threads client-side based on search query
      const query = searchQuery.toLowerCase();
      const filteredThreads = allThreads.filter((thread) => {
        const titleMatch = thread.title?.toLowerCase().includes(query);
        const bodyMatch = thread.body?.toLowerCase().includes(query);
        const authorMatch = thread.authorUserId?.username
          ?.toLowerCase()
          .includes(query);
        // Only filter by tag if viewing a community
        const matchesCondition = selectedCommunity
          ? threadMatchesSelectedTag(thread, selectedConditionTag)
          : true;
        return (titleMatch || bodyMatch || authorMatch) && matchesCondition;
      });

      const promotedKeys = data.promotedDummyKeys || [];
      setThreads(mergeDummyThreads(filteredThreads, promotedKeys));
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setLoading(false);
    }
  }

  // Debounced search effect - triggers search as user types (only for discussions)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchThreads();
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  async function toggleFollow(communityId) {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to follow communities");
      return;
    }
    if (!requireEmailVerification()) return;

    if (followingLoading.has(communityId)) return;

    setFollowingLoading((prev) => new Set(prev).add(communityId));
    const isFollowing = followingIds.has(communityId);

    try {
      if (isFollowing) {
        await fetch(
          `${base}/api/communities/${communityId}/follow?userId=${
            user._id || user.id
          }`,
          { method: "DELETE" },
        );
        setFollowingIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(communityId);
          return newSet;
        });
        toast.success("Left community");
      } else {
        await fetch(`${base}/api/communities/${communityId}/follow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user._id || user.id }),
        });
        setFollowingIds((prev) => new Set(prev).add(communityId));
        toast.success("Joined community!");
      }

      // Update community member counts
      setCommunities((prev) =>
        prev.map((c) =>
          c._id === communityId
            ? {
                ...c,
                memberCount: isFollowing
                  ? c.memberCount - 1
                  : c.memberCount + 1,
                isFollowing: !isFollowing,
              }
            : c,
        ),
      );
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast.error("Failed to update membership");
    } finally {
      setFollowingLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(communityId);
        return newSet;
      });
    }
  }

  async function handleProposeThumbnailChange(e) {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image (JPEG, PNG, GIF, or WebP)");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please sign in to upload a thumbnail");
      return;
    }
    setProposeThumbnailUploading(true);
    try {
      const formData = new FormData();
      formData.append("files", file);
      const res = await fetch(`${base}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json();
      const url = data.files?.[0]?.url;
      if (url) setProposeThumbnailUrl(url);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to upload thumbnail");
    } finally {
      setProposeThumbnailUploading(false);
      if (e.target) e.target.value = "";
    }
  }

  async function submitProposeCommunity(e) {
    e?.preventDefault();
    if (!proposeTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please sign in to propose a community");
      return;
    }
    if (!requireEmailVerification()) return;
    setProposeSubmitting(true);
    try {
      const res = await fetch(`${base}/api/communities/proposals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: proposeTitle.trim(),
          description: proposeDescription.trim(),
          thumbnailUrl: proposeThumbnailUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit proposal");
      toast.success(
        "Your proposal has been submitted. Moderators will review it before approval.",
      );
      setProposeCommunityModal(false);
      setProposeTitle("");
      setProposeDescription("");
      setProposeThumbnailUrl("");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to submit proposal");
    } finally {
      setProposeSubmitting(false);
    }
  }

  async function loadThreadDetails(threadId, forceReload = false) {
    if (isDummyThreadId(threadId)) return;
    if (expandedThreads[threadId] && !forceReload) return;

    setLoadingThreadDetails((prev) => new Set(prev).add(threadId));
    try {
      const response = await fetch(`${base}/api/forums/threads/${threadId}`);
      if (!response.ok) throw new Error("Failed to load thread");

      const data = await response.json();
      setExpandedThreads((prev) => ({ ...prev, [threadId]: data }));
    } catch (error) {
      console.error("Error loading thread:", error);
    } finally {
      setLoadingThreadDetails((prev) => {
        const newSet = new Set(prev);
        newSet.delete(threadId);
        return newSet;
      });
    }
  }

  function toggleThread(threadId) {
    const isExpanded = expandedThreadIds.has(threadId);
    if (isExpanded) {
      setExpandedThreadIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(threadId);
        return newSet;
      });
    } else {
      setExpandedThreadIds((prev) => new Set(prev).add(threadId));
      if (isDummyThreadId(threadId)) {
        const details = getDummyThreadDetails(threadId, threads);
        if (details)
          setExpandedThreads((prev) => ({ ...prev, [threadId]: details }));
      } else {
        loadThreadDetails(threadId);
      }
    }
  }

  async function toggleFavorite(
    itemId,
    itemType = "thread",
    threadOrAuthor = null,
  ) {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to favorite items");
      return;
    }

    if (favoritingItems.has(itemId)) return;

    setFavoritingItems((prev) => new Set(prev).add(itemId));
    const isFavorited = favorites.some(
      (fav) => fav.itemId === itemId && fav.itemType === itemType,
    );

    try {
      if (isFavorited) {
        await fetch(
          `${base}/api/favorites/${
            user._id || user.id
          }/${itemId}?type=${itemType}`,
          { method: "DELETE" },
        );
        setFavorites((prev) =>
          prev.filter(
            (fav) => !(fav.itemId === itemId && fav.itemType === itemType),
          ),
        );
        toast.success("Removed from favorites");
      } else {
        await fetch(`${base}/api/favorites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user._id || user.id,
            itemId,
            itemType,
          }),
        });
        setFavorites((prev) => [
          ...prev,
          { itemId, itemType, userId: user._id || user.id },
        ]);
        toast.success("Added to favorites");
        // When favoriting a thread, offer to follow the poster (don't use "author")
        if (itemType === "thread" && threadOrAuthor) {
          const authorUserId =
            threadOrAuthor.authorUserId?._id || threadOrAuthor.authorUserId;
          const username = threadOrAuthor.authorUserId?.username;
          const currentUserId = (user._id || user.id)?.toString?.();
          const authorIdStr = authorUserId?.toString?.();
          if (authorIdStr && authorIdStr !== currentUserId) {
            setShowFollowAfterFavorite({
              authorUserId: authorIdStr,
              username: username || "them",
              role: threadOrAuthor.authorRole,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Failed to update favorite");
    } finally {
      setFavoritingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  }

  async function createSubcategory() {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to create subcategories");
      return;
    }
    if (!selectedCommunity) {
      toast.error("Please select a community first");
      return;
    }
    if (!newSubcategoryName || !newSubcategoryName.trim()) {
      toast.error("Please enter a subcategory name");
      return;
    }

    try {
      const response = await fetch(
        `${base}/api/communities/${selectedCommunity._id}/subcategories`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newSubcategoryName.trim(),
            description: newSubcategoryDescription.trim() || "",
            tags: newSubcategoryTags,
            createdBy: user._id || user.id,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 && data.redirect) {
          // Similar subcategory exists - redirect user
          toast.error(
            `Similar subcategory "${data.existingSubcategory.name}" already exists`,
          );
          setSelectedSubcategory(data.existingSubcategory);
          setNewSubcategoryModal(false);
          setNewSubcategoryName("");
          setNewSubcategoryDescription("");
          setNewSubcategoryTags([]);
          return;
        }
        throw new Error(data.error || "Failed to create subcategory");
      }

      toast.success("Subcategory created successfully!");
      setNewSubcategoryModal(false);
      setNewSubcategoryName("");
      setNewSubcategoryDescription("");
      setNewSubcategoryTags([]);
      loadSubcategories(selectedCommunity._id);
    } catch (error) {
      console.error("Error creating subcategory:", error);
      toast.error(error.message || "Failed to create subcategory");
    }
  }

  async function fetchMeshSuggestions(term) {
    if (!term || term.trim().length < 2) {
      setMeshSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `${base}/api/mesh/suggestions?term=${encodeURIComponent(term)}`,
      );
      if (response.ok) {
        const data = await response.json();
        setMeshSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error("Error fetching MeSH suggestions:", error);
    }
  }

  async function fetchThreadTagSuggestions(term) {
    if (!term || term.trim().length < 1) {
      setNewThreadMeshSuggestions([]);
      return;
    }

    // Common tag suggestions based on input
    const commonTags = [
      "Treatment",
      "Therapy",
      "Diagnosis",
      "Symptoms",
      "Side Effects",
      "Outcomes",
      "Recovery",
      "Prevention",
      "Medication",
      "Surgery",
      "Research",
      "Clinical Trials",
      "Support",
      "Coping",
      "Lifestyle",
      "Nutrition",
      "Exercise",
      "Mental Health",
      "Pain Management",
      "Rehabilitation",
    ];

    const normalizedTerm = term.toLowerCase().trim();
    const suggestions = commonTags
      .filter((tag) => tag.toLowerCase().includes(normalizedTerm))
      .filter((tag) => !newThreadTags.includes(tag))
      .slice(0, 8);

    setNewThreadMeshSuggestions(suggestions);
  }

  const addConditionTag = (tag) => {
    if (!tag || !tag.trim()) return;
    const normalized = tag.trim();
    const exists = newThreadConditions.some(
      (c) => c.toLowerCase() === normalized.toLowerCase(),
    );
    if (!exists) {
      setNewThreadConditions([...newThreadConditions, normalized]);
    }
    setNewThreadConditionInput("");
    setConditionSuggestions([]);
  };

  const updateConditionSuggestions = (value) => {
    setNewThreadConditionInput(value);
    if (!value?.trim()) {
      setConditionSuggestions(modalConditionOptions.slice(0, 6));
      return;
    }
    const normalized = value.toLowerCase();
    const filtered = modalConditionOptions.filter(
      (tag) =>
        tag.toLowerCase().includes(normalized) &&
        !newThreadConditions.some((c) => c.toLowerCase() === tag.toLowerCase()),
    );
    setConditionSuggestions(filtered.slice(0, 8));
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (meshInput.trim()) {
        fetchMeshSuggestions(meshInput);
      } else {
        setMeshSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [meshInput]);

  async function postThread() {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to post");
      return;
    }
    if (!requireEmailVerification()) return;
    const communityToUse = modalSelectedCommunity || selectedCommunity;
    if (!communityToUse) {
      toast.error("Please select a community first");
      return;
    }
    const trimmedTitle = newThreadTitle?.trim() ?? "";
    const trimmedBody = newThreadBody?.trim() ?? "";
    if (!trimmedTitle) {
      toast.error("Please enter a question or title");
      return;
    }

    try {
      const response = await fetch(
        `${base}/api/communities/${communityToUse._id}/threads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authorUserId: user._id || user.id,
            authorRole: user.role,
            title: trimmedTitle,
            body: trimmedBody || "",
            subcategoryId: newThreadSubcategory?._id || null,
            tags: newThreadTags || [],
            conditions: [], // No longer using conditions, only mandatory tags
            onlyResearchersCanReply: newThreadOnlyResearchersCanReply,
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to post");

      const threadData = await response.json();
      const createdThread = threadData.thread || threadData;

      toast.success("Posted successfully!");
      setNewThreadModal(false);

      // Store thread data and show share modal
      setNewlyCreatedThread({
        _id: createdThread._id,
        title: trimmedTitle,
        body: trimmedBody,
        community: communityToUse,
        subcategory: newThreadSubcategory,
        tags: newThreadTags,
      });
      setShareMessage(
        `I just posted a question in ${communityToUse.name}: "${trimmedTitle}"`,
      );
      setShowShareToDiscoveryModal(true);

      setNewThreadTitle("");
      setNewThreadBody("");
      setNewThreadSubcategory(null);
      setNewThreadTags([]);
      setNewThreadConditions([]);
      setNewThreadConditionInput("");
      setNewThreadOnlyResearchersCanReply(false);
      setConditionSuggestions([]);
      setNewThreadMeshInput("");
      setNewThreadMeshSuggestions([]);
      setModalSelectedCommunity(null);
      // Reload threads based on current view
      if (selectedSubcategory) {
        loadThreadsBySubcategory();
      } else if (selectedCommunity) {
        loadThreads();
      } else {
        loadAllThreads();
      }
    } catch (error) {
      console.error("Error posting:", error);
      toast.error("Failed to post");
    }
  }

  async function checkIfThreadIsShared(threadId) {
    if (!threadId || !user) return false;
    try {
      const token = localStorage.getItem("token");
      const userId = user._id || user.id;
      const response = await fetch(
        `${base}/api/posts?authorUserId=${userId}&linkedThreadId=${threadId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (response.ok) {
        const data = await response.json();
        return (data.posts || []).length > 0;
      }
    } catch (error) {
      console.error("Error checking if thread is shared:", error);
    }
    return false;
  }

  async function loadSharedThreadIds(threadIds) {
    if (!user || !threadIds.length) {
      setSharedThreadIds(new Set());
      return;
    }
    try {
      const sharedIds = new Set();

      // Check each thread if it's shared (batch check)
      await Promise.all(
        threadIds.map(async (threadId) => {
          const isShared = await checkIfThreadIsShared(threadId);
          if (isShared) {
            sharedIds.add(threadId);
          }
        }),
      );

      // Replace the entire set instead of merging to avoid stale data
      setSharedThreadIds(sharedIds);
    } catch (error) {
      console.error("Error loading shared thread IDs:", error);
      setSharedThreadIds(new Set());
    }
  }

  function openShareModal(thread) {
    const communityToUse =
      thread.communityId || thread.categoryId || selectedCommunity;
    setNewlyCreatedThread({
      _id: thread._id,
      title: thread.title,
      body: thread.body,
      community: communityToUse,
      subcategory: thread.subcategoryId,
      tags: thread.tags || [],
    });
    setShareMessage(
      `I just posted a question in ${communityToUse?.name || "the forums"}: "${thread.title}"`,
    );
    setShowShareToDiscoveryModal(true);
  }

  async function shareToDiscovery() {
    if (!newlyCreatedThread || !user) {
      return;
    }

    setSharingToDiscovery(true);
    try {
      const token = localStorage.getItem("token");
      const threadToShare = newlyCreatedThread;
      const response = await fetch(`${base}/api/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content:
            shareMessage.trim() ||
            `I just posted a question in ${threadToShare.community?.name || "the forums"}: "${threadToShare.title}"`,
          postType: user.role || "patient",
          communityId: threadToShare.community?._id || null,
          subcategoryId: threadToShare.subcategory?._id || null,
          linkedThreadId: threadToShare._id, // Link to forum thread
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to share post");
      }

      toast.success("Shared to Discovery!");
      setShowShareToDiscoveryModal(false);

      // Update shared status
      if (threadToShare._id) {
        setSharedThreadIds((prev) => new Set(prev).add(threadToShare._id));
      }

      setNewlyCreatedThread(null);
      setShareMessage("");
    } catch (error) {
      console.error("Error sharing to discovery:", error);
      toast.error(error.message || "Failed to share post");
    } finally {
      setSharingToDiscovery(false);
    }
  }

  async function postReply(threadId, parentReplyId = null) {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to reply");
      return;
    }
    if (!requireEmailVerification()) return;

    const body = replyBody[`${threadId}-${parentReplyId || "root"}`] || "";
    if (!body.trim()) {
      toast.error("Please enter a reply");
      return;
    }

    try {
      // Find thread data to send for dummy thread promotion
      let dummyThreadData = null;
      if (isDummyThreadId(threadId)) {
        const thread = threads.find((t) => t._id === threadId);
        if (thread) {
          dummyThreadData = {
            title: thread.title,
            body: thread.body || "",
            tags: thread.tags || [],
            conditions: thread.conditions || [],
            authorRole: thread.authorRole || "patient",
            onlyResearchersCanReply: thread.onlyResearchersCanReply || false,
            isResearcherForum: thread.isResearcherForum || false,
            communitySlug: thread.communityId?.slug || null,
            voteScore: thread.voteScore || 0,
            originalAuthorUsername: thread.authorUserId?.username || null,
            originalAuthorHandle: thread.authorUserId?.handle || null,
          };
        }
      }

      const response = await fetch(`${base}/api/forums/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          parentReplyId: parentReplyId || null,
          authorUserId: user._id || user.id,
          authorRole: user.role,
          body,
          dummyThreadData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to post reply");
        return;
      }

      setReplyBody((prev) => {
        const newState = { ...prev };
        delete newState[`${threadId}-${parentReplyId || "root"}`];
        return newState;
      });
      setReplyingTo(null);
      toast.success("Reply posted!");

      if (expandedThreadIds.has(threadId)) {
        await loadThreadDetails(threadId, true);
      }
      // So the list immediately shows the real thread instead of the dummy
      if (isDummyThreadId(threadId)) {
        refetchThreadListForCurrentView();
      }
    } catch (error) {
      console.error("Error posting reply:", error);
      toast.error("Failed to post reply");
    }
  }

  async function voteOnThread(threadId, voteType) {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to vote");
      return;
    }
    if (!requireEmailVerification()) return;

    try {
      // Find thread data to send for dummy thread promotion
      let dummyThreadData = null;
      if (isDummyThreadId(threadId)) {
        const thread = threads.find((t) => t._id === threadId);
        if (thread) {
          dummyThreadData = {
            title: thread.title,
            body: thread.body || "",
            tags: thread.tags || [],
            conditions: thread.conditions || [],
            authorRole: thread.authorRole || "patient",
            onlyResearchersCanReply: thread.onlyResearchersCanReply || false,
            isResearcherForum: thread.isResearcherForum || false,
            communitySlug: thread.communityId?.slug || null,
            voteScore: thread.voteScore || 0,
            originalAuthorUsername: thread.authorUserId?.username || null,
            originalAuthorHandle: thread.authorUserId?.handle || null,
          };
        }
      }

      const raw = await fetch(`${base}/api/forums/threads/${threadId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id || user.id,
          voteType,
          dummyThreadData,
        }),
      });
      const res = await raw.json();
      if (!raw.ok || res.voteScore === undefined) {
        if (res.error) toast.error(res.error);
        return;
      }
      const upvotes = (Array.isArray(res.upvotes) ? res.upvotes : []).map(
        (id) => String(id),
      );
      const downvotes = (Array.isArray(res.downvotes) ? res.downvotes : []).map(
        (id) => String(id),
      );
      const threadIdStr = String(threadId);
      setThreads((prev) =>
        prev.map((t) =>
          String(t._id) === threadIdStr
            ? { ...t, voteScore: res.voteScore, upvotes, downvotes }
            : t,
        ),
      );
      // So the list shows the real thread (likes persist like replies)
      if (isDummyThreadId(threadId)) {
        refetchThreadListForCurrentView();
      }
    } catch (error) {
      console.error("Error voting:", error);
      toast.error("Failed to record vote");
    }
  }

  async function voteOnReply(replyId, voteType) {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to vote");
      return;
    }
    if (!requireEmailVerification()) return;

    const replyIdStr = String(replyId);
    const isDummyReply = replyIdStr.startsWith("dummy-reply-");
    if (isDummyReply) {
      // Dummy replies exist only in frontend; persist vote in local state only
      const userIdStr = String(user._id || user.id);
      setExpandedThreads((prev) => {
        const updated = { ...prev };
        const updateReplyVote = (replies) =>
          replies.map((reply) => {
            if (String(reply._id) !== replyIdStr) {
              if (reply.children?.length)
                return { ...reply, children: updateReplyVote(reply.children) };
              return reply;
            }
            const upvotes = [...(reply.upvotes || [])].map(String);
            const downvotes = [...(reply.downvotes || [])].map(String);
            if (voteType === "neutral") {
              if (upvotes.includes(userIdStr))
                upvotes.splice(upvotes.indexOf(userIdStr), 1);
              if (downvotes.includes(userIdStr))
                downvotes.splice(downvotes.indexOf(userIdStr), 1);
            } else if (voteType === "upvote") {
              if (downvotes.includes(userIdStr))
                downvotes.splice(downvotes.indexOf(userIdStr), 1);
              if (!upvotes.includes(userIdStr)) upvotes.push(userIdStr);
            } else {
              if (upvotes.includes(userIdStr))
                upvotes.splice(upvotes.indexOf(userIdStr), 1);
              if (!downvotes.includes(userIdStr)) downvotes.push(userIdStr);
            }
            const voteScore = upvotes.length - downvotes.length;
            return { ...reply, upvotes, downvotes, voteScore };
          });
        Object.keys(updated).forEach((tid) => {
          const threadData = updated[tid];
          if (threadData.replies?.length > 0) {
            updated[tid] = {
              ...threadData,
              replies: updateReplyVote(threadData.replies),
            };
          }
        });
        return updated;
      });
      return;
    }

    try {
      const raw = await fetch(`${base}/api/forums/replies/${replyId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id || user.id, voteType }),
      });
      const res = await raw.json();
      if (!raw.ok || res.voteScore === undefined) {
        if (res.error) toast.error(res.error);
        return;
      }
      const upvotes = (Array.isArray(res.upvotes) ? res.upvotes : []).map(
        (id) => String(id),
      );
      const downvotes = (Array.isArray(res.downvotes) ? res.downvotes : []).map(
        (id) => String(id),
      );
      const replyIdStrForUpdate = String(replyId);
      setExpandedThreads((prev) => {
        const updated = { ...prev };
        const updateReplyVote = (replies) =>
          replies.map((reply) => {
            if (String(reply._id) === replyIdStrForUpdate) {
              return { ...reply, voteScore: res.voteScore, upvotes, downvotes };
            }
            if (reply.children) {
              return { ...reply, children: updateReplyVote(reply.children) };
            }
            return reply;
          });

        Object.keys(updated).forEach((tid) => {
          const threadData = updated[tid];
          if (threadData.replies?.length > 0) {
            updated[tid] = {
              ...threadData,
              replies: updateReplyVote(threadData.replies),
            };
          }
        });
        return updated;
      });
    } catch (error) {
      console.error("Error voting:", error);
      toast.error("Failed to record vote");
    }
  }

  async function updateReply(threadId, replyId, newBody) {
    if (!user?._id && !user?.id) return;
    if (!newBody?.trim()) {
      toast.error("Reply cannot be empty");
      return;
    }
    setUpdatingReplyIds((prev) => new Set(prev).add(replyId));
    try {
      const res = await fetch(`${base}/api/forums/replies/${replyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id || user.id,
          body: newBody.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to update reply");
        return;
      }
      setExpandedThreads((prev) => {
        const updated = { ...prev };
        if (!updated[threadId]?.replies?.length) return updated;
        const updateReplyBody = (replies) =>
          replies.map((r) => {
            if (r._id === replyId) return { ...r, body: newBody.trim() };
            if (r.children?.length)
              return { ...r, children: updateReplyBody(r.children) };
            return r;
          });
        updated[threadId] = {
          ...updated[threadId],
          replies: updateReplyBody(updated[threadId].replies),
        };
        return updated;
      });
      setEditingReplyId(null);
      setEditReplyBody((prev) => ({ ...prev, [replyId]: undefined }));
      toast.success("Reply updated");
    } catch (error) {
      console.error("Error updating reply:", error);
      toast.error("Failed to update reply");
    } finally {
      setUpdatingReplyIds((prev) => {
        const next = new Set(prev);
        next.delete(replyId);
        return next;
      });
    }
  }

  async function deleteReply(threadId, replyId) {
    if (!user?._id && !user?.id) return;
    if (
      !window.confirm(
        "Delete this reply? This will also remove any nested replies.",
      )
    )
      return;
    setDeletingReplyIds((prev) => new Set(prev).add(replyId));
    try {
      const res = await fetch(`${base}/api/forums/replies/${replyId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id || user.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete reply");
        return;
      }
      const data = await res.json();
      const deletedCount = data.deletedCount ?? 1;
      setExpandedThreads((prev) => {
        const updated = { ...prev };
        const removeReply = (replies) =>
          replies
            .filter((r) => r._id !== replyId)
            .map((r) =>
              r.children ? { ...r, children: removeReply(r.children) } : r,
            );
        if (updated[threadId]?.replies?.length) {
          updated[threadId] = {
            ...updated[threadId],
            replies: removeReply(updated[threadId].replies),
            replyCount: Math.max(
              0,
              (updated[threadId].replyCount ?? 0) - deletedCount,
            ),
          };
        }
        return updated;
      });
      setThreads((prev) =>
        prev.map((t) =>
          t._id === threadId
            ? {
                ...t,
                replyCount: Math.max(0, (t.replyCount ?? 0) - deletedCount),
              }
            : t,
        ),
      );
      setEditingReplyId(null);
      setEditReplyBody((prev) => ({ ...prev, [replyId]: undefined }));
      toast.success("Reply deleted");
    } catch (error) {
      console.error("Error deleting reply:", error);
      toast.error("Failed to delete reply");
    } finally {
      setDeletingReplyIds((prev) => {
        const next = new Set(prev);
        next.delete(replyId);
        return next;
      });
    }
  }

  async function deleteThread(threadId) {
    if (isDummyThreadId(threadId)) {
      toast.info("This is a sample post.");
      return;
    }
    if (!user?._id && !user?.id) return;
    if (
      !window.confirm(
        "Delete this thread and all its replies? This cannot be undone.",
      )
    )
      return;
    setDeletingThreadId(threadId);
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please sign in to delete your thread");
      setDeletingThreadId(null);
      return;
    }
    try {
      const res = await fetch(`${base}/api/forums/threads/${threadId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete thread");
        return;
      }
      setThreads((prev) => prev.filter((t) => t._id !== threadId));
      setExpandedThreadIds((prev) => {
        const next = new Set(prev);
        next.delete(threadId);
        return next;
      });
      setExpandedThreads((prev) => {
        const updated = { ...prev };
        delete updated[threadId];
        return updated;
      });
      toast.success("Thread deleted");
    } catch (error) {
      console.error("Error deleting thread:", error);
      toast.error("Failed to delete thread");
    } finally {
      setDeletingThreadId(null);
    }
  }

  // Don't filter communities based on discussion search query
  // Communities should be shown separately and not affected by discussion search
  const filteredCommunities = useMemo(() => {
    let list = communities;
    if (viewMode === "communities" && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(q) ||
          (c.description || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [communities, viewMode, searchQuery]);

  const displayedCommunities = useMemo(() => {
    if (activeTab === "following") {
      return filteredCommunities.filter((c) => followingIds.has(c._id));
    }
    return filteredCommunities;
  }, [filteredCommunities, activeTab, followingIds]);

  const sortedDisplayedCommunities = useMemo(() => {
    const list = [...displayedCommunities];

    // Joined communities first, then the rest
    list.sort((a, b) => {
      const aJoined = followingIds.has(a?._id) ? 1 : 0;
      const bJoined = followingIds.has(b?._id) ? 1 : 0;
      if (aJoined !== bJoined) return bJoined - aJoined;

      // Official communities next
      const aOfficial = a?.isOfficial ? 1 : 0;
      const bOfficial = b?.isOfficial ? 1 : 0;
      if (aOfficial !== bOfficial) return bOfficial - aOfficial;

      // Then sort by selected option (recent or popular)
      if (sortBy === "popular") {
        // Popular: Sort by member count (descending)
        const aMembers = Number(a?.memberCount || 0);
        const bMembers = Number(b?.memberCount || 0);
        if (aMembers !== bMembers) return bMembers - aMembers;
      } else {
        // Recent: Sort by creation date (newest first) if available, otherwise by member count
        const aDate = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (aDate !== bDate) return bDate - aDate;

        // Fallback to member count if dates are equal or not available
        const aMembers = Number(a?.memberCount || 0);
        const bMembers = Number(b?.memberCount || 0);
        if (aMembers !== bMembers) return bMembers - aMembers;
      }

      // Finally, sort alphabetically by name
      return String(a?.name || "").localeCompare(
        String(b?.name || ""),
        undefined,
        {
          sensitivity: "base",
        },
      );
    });
    return list;
  }, [displayedCommunities, sortBy, followingIds]);

  const patientCommunities = useMemo(() => {
    return sortedDisplayedCommunities.filter(
      (c) => (c.communityType || "patient") === "patient",
    );
  }, [sortedDisplayedCommunities]);

  const researcherCommunities = useMemo(() => {
    return sortedDisplayedCommunities.filter(
      (c) => c.communityType === "researcher",
    );
  }, [sortedDisplayedCommunities]);

  const groupedMobileCommunities = useMemo(() => {
    const mine = [];
    const explore = [];

    sortedDisplayedCommunities.forEach((c) => {
      if (followingIds.has(c._id)) mine.push(c);
      else explore.push(c);
    });

    return { mine, explore };
  }, [sortedDisplayedCommunities, followingIds]);

  const mobileCommunityOptions = useMemo(() => {
    const opts = [{ value: "", label: "All communities" }];

    if (groupedMobileCommunities.mine.length > 0) {
      groupedMobileCommunities.mine.forEach((c) => {
        opts.push({
          value: c._id,
          label: `My · ${c.name}`,
        });
      });
    }

    if (groupedMobileCommunities.explore.length > 0) {
      groupedMobileCommunities.explore.forEach((c) => {
        opts.push({
          value: c._id,
          label: `Explore · ${c.name}`,
        });
      });
    }

    return opts;
  }, [groupedMobileCommunities]);

  const handleMobileCommunityChange = (communityId) => {
    setMobileCommunityId(communityId);

    if (!communityId) {
      setSelectedCommunity(null);
      setSelectedSubcategory(null);
      return;
    }

    const chosen = displayedCommunities.find((c) => c._id === communityId);
    if (chosen) {
      setSelectedCommunity(chosen);
      setSelectedSubcategory(null);
    }
  };

  // Memoize thread vote states to avoid recalculating on every render
  const threadsWithVoteStates = useMemo(() => {
    if (!threads || threads.length === 0) return [];

    const userId = (user?._id || user?.id)?.toString();
    if (!userId)
      return threads.map((t) => ({
        ...t,
        isUpvoted: false,
        isDownvoted: false,
      }));

    return threads.map((thread) => ({
      ...thread,
      isUpvoted:
        (thread.upvotes || []).some((id) => String(id) === userId) || false,
      isDownvoted:
        (thread.downvotes || []).some((id) => String(id) === userId) || false,
    }));
  }, [threads, user?._id, user?.id]);

  function renderReply(
    reply,
    threadId,
    depth = 0,
    onlyResearchersCanReply = false,
  ) {
    const canReply =
      !onlyResearchersCanReply ||
      (user?.role || user?.userRole) === "researcher";
    const replyAuthorId =
      reply.authorUserId?._id?.toString?.() || reply.authorUserId?.toString?.();
    const isOwner =
      user &&
      replyAuthorId &&
      replyAuthorId === (user._id || user.id)?.toString?.();
    const isUpvoted = (reply.upvotes || []).some(
      (id) => String(id) === (user?._id || user?.id)?.toString(),
    );
    const isDownvoted = (reply.downvotes || []).some(
      (id) => String(id) === (user?._id || user?.id)?.toString(),
    );
    const replyKey = `${threadId}-${reply._id}`;
    const isEditing = editingReplyId === reply._id;
    const isDeleting = deletingReplyIds.has(reply._id);
    const isUpdating = updatingReplyIds.has(reply._id);

    return (
      <div
        key={reply._id}
        className="mt-3"
        style={{ marginLeft: `${depth * 12}px` }}
      >
        <div className="bg-[#F5F5F5] rounded-lg border border-[#E8E8E8] p-3 sm:p-4 hover:border-[#E8E8E8] transition-all">
          <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => {
                  const uid = reply.authorUserId?._id || reply.authorUserId;
                  if (uid) openUserProfileModal(uid);
                }}
                className="w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden relative"
                style={{
                  backgroundColor: reply.authorUserId?.picture
                    ? "transparent"
                    : "#2F3C96",
                }}
                title={`View ${reply.authorUserId?.nameHidden && reply.authorUserId?.handle ? `@${reply.authorUserId.handle}` : getDisplayName(reply.authorUserId, "Anonymous")}'s profile`}
              >
                {reply.authorUserId?.picture ? (
                  <img
                    src={reply.authorUserId.picture}
                    alt={
                      reply.authorUserId?.nameHidden &&
                      reply.authorUserId?.handle
                        ? `@${reply.authorUserId.handle}`
                        : getDisplayName(reply.authorUserId, "Anonymous")
                    }
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                      const fallback =
                        e.target.parentElement.querySelector(
                          ".avatar-fallback",
                        );
                      if (fallback) fallback.style.display = "flex";
                      e.target.parentElement.style.backgroundColor = "#2F3C96";
                    }}
                  />
                ) : null}
                <span
                  className={`avatar-fallback ${reply.authorUserId?.picture ? "hidden" : ""}`}
                >
                  {reply.authorUserId?.nameHidden && reply.authorUserId?.handle
                    ? reply.authorUserId.handle.charAt(0).toUpperCase()
                    : reply.authorUserId?.username?.charAt(0)?.toUpperCase() ||
                      "U"}
                </span>
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const uid = reply.authorUserId?._id || reply.authorUserId;
                      if (uid) openUserProfileModal(uid);
                    }}
                    className="flex flex-col items-start text-[#2F3C96] hover:underline cursor-pointer"
                  >
                    {!reply.authorUserId?.nameHidden && (
                      <span className="text-sm font-medium">
                        {getDisplayName(reply.authorUserId, "Anonymous")}
                      </span>
                    )}
                    {reply.authorUserId?.handle && (
                      <span
                        className={`text-xs ${reply.authorUserId?.nameHidden ? "font-medium" : "text-[#787878]"}`}
                      >
                        @{reply.authorUserId.handle}
                      </span>
                    )}
                  </button>
                  {reply.authorRole === "researcher" && (
                    <span className="px-1.5 py-0.5 bg-[#2F3C96]/10 text-[#2F3C96] rounded text-xs font-medium">
                      Researcher
                    </span>
                  )}
                  {reply.authorRole === "patient" && (
                    <span className="px-1.5 py-0.5 bg-[#F5F5F5] text-[#787878] rounded text-xs font-medium border border-[#E8E8E8]">
                      Patient
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 shrink-0 w-full sm:w-auto sm:justify-end">
              <span className="text-xs text-[#787878] whitespace-nowrap">
                {new Date(reply.createdAt).toLocaleDateString()}
              </span>
              {isOwner && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingReplyId(reply._id);
                      setEditReplyBody((prev) => ({
                        ...prev,
                        [reply._id]: reply.body,
                      }));
                    }}
                    disabled={isEditing || isUpdating || isDeleting}
                    className="p-1.5 rounded text-[#787878] hover:text-[#2F3C96] hover:bg-[#2F3C96]/10 transition-colors disabled:opacity-50"
                    title="Edit reply"
                    aria-label="Edit reply"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteReply(threadId, reply._id)}
                    disabled={isDeleting || isUpdating}
                    className="p-1.5 rounded text-[#787878] hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Delete reply"
                    aria-label="Delete reply"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="mb-3">
              <textarea
                value={editReplyBody[reply._id] ?? reply.body}
                onChange={(e) =>
                  setEditReplyBody((prev) => ({
                    ...prev,
                    [reply._id]: e.target.value,
                  }))
                }
                placeholder="Edit your reply..."
                className="w-full rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] resize-none text-[#484848] placeholder-[#787878]"
                rows="3"
                autoFocus
              />
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <button
                  type="button"
                  onClick={() =>
                    updateReply(
                      threadId,
                      reply._id,
                      editReplyBody[reply._id] ?? reply.body,
                    )
                  }
                  disabled={
                    isUpdating ||
                    !(editReplyBody[reply._id] ?? reply.body)?.trim()
                  }
                  className="flex items-center justify-center gap-2 px-3 py-2 sm:py-1.5 bg-[#2F3C96] text-white rounded-lg text-sm font-semibold hover:bg-[#253075] transition-all disabled:opacity-50"
                >
                  {isUpdating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : null}
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingReplyId(null);
                    setEditReplyBody((prev) => ({
                      ...prev,
                      [reply._id]: undefined,
                    }));
                  }}
                  disabled={isUpdating}
                  className="px-3 py-2 sm:py-1.5 bg-[#F5F5F5] text-[#787878] rounded-lg text-sm font-medium hover:bg-[#E8E8E8] transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-[#787878] mb-3">
              <FormattedForumContent content={reply.body} />
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  voteOnReply(reply._id, isUpvoted ? "neutral" : "upvote")
                }
                className={`p-1 rounded transition-all ${
                  isUpvoted
                    ? "text-[#2F3C96]"
                    : "text-[#787878] hover:text-[#2F3C96]"
                }`}
                aria-label={isUpvoted ? "Unlike reply" : "Like reply"}
              >
                <ThumbsUp
                  className={`w-3.5 h-3.5 shrink-0 ${isUpvoted ? "fill-[#2F3C96] text-[#2F3C96]" : ""}`}
                />
              </button>
              <span
                className={`text-xs font-semibold min-w-[1.5rem] text-center ${
                  reply.voteScore !== 0 ? "text-[#2F3C96]" : "text-[#787878]"
                }`}
              >
                {reply.voteScore || 0}
              </span>
              <button
                onClick={() =>
                  voteOnReply(reply._id, isDownvoted ? "neutral" : "downvote")
                }
                className={`p-1 rounded transition-all ${
                  isDownvoted
                    ? "text-red-500"
                    : "text-[#787878] hover:text-red-500"
                }`}
                aria-label={
                  isDownvoted ? "Remove dislike from reply" : "Dislike reply"
                }
              >
                <ThumbsDown
                  className={`w-3.5 h-3.5 shrink-0 ${isDownvoted ? "text-red-500" : ""}`}
                />
              </button>
            </div>

            {canReply && (
              <button
                onClick={() => {
                  if (!user?._id && !user?.id) {
                    toast.error("Please sign in to reply");
                    return;
                  }
                  setReplyingTo(
                    replyingTo?.replyId === reply._id
                      ? null
                      : { threadId, replyId: reply._id },
                  );
                }}
                className="flex items-center gap-1 text-xs text-[#2F3C96] hover:text-[#253075] font-medium transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Reply
              </button>
            )}
          </div>

          {canReply && replyingTo?.replyId === reply._id && user && (
            <div className="mt-3 pt-3 border-t border-[#E8E8E8]">
              <textarea
                value={replyBody[replyKey] || ""}
                onChange={(e) =>
                  setReplyBody((prev) => ({
                    ...prev,
                    [replyKey]: e.target.value,
                  }))
                }
                placeholder="Write a reply..."
                className="w-full rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] resize-none text-[#484848] placeholder-[#787878]"
                rows="3"
              />
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <button
                  onClick={() => postReply(threadId, reply._id)}
                  className="flex items-center justify-center gap-2 px-3 py-2 sm:py-1.5 bg-[#2F3C96] text-white rounded-lg text-sm font-semibold hover:bg-[#253075] transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  Reply
                </button>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="px-3 py-2 sm:py-1.5 bg-[#F5F5F5] text-[#787878] rounded-lg text-sm font-medium hover:bg-[#E8E8E8] transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {reply.children?.length > 0 && (
            <div className="mt-3 space-y-2">
              {reply.children.map((child) =>
                renderReply(
                  child,
                  threadId,
                  depth + 1,
                  onlyResearchersCanReply,
                ),
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const getTabTitle = () => {
    if (selectedCommunity) return selectedCommunity.name;
    switch (activeTab) {
      case "following":
        return "From Communities You Follow";
      case "forYou":
        return "Recommended For You";
      case "involving":
        return "Discussions Involving You";
      default:
        return "All Discussions";
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-fadeInUp { animation: fadeInUp 0.4s ease-out; }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
        .animate-pulse-soft { animation: pulse-soft 2s ease-in-out infinite; }
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .thread-expandable {
          overflow: hidden; max-height: 0; opacity: 0; padding-top: 0;
          transition: max-height 0.3s ease, opacity 0.2s ease, padding-top 0.3s ease;
        }
        .thread-expandable.expanded {
          max-height: 5000px; opacity: 1; padding-top: 1rem;
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <Layout>
        <div className="min-h-screen bg-[#F5F5F5] relative">
          <AnimatedBackground />

          <div className="relative pt-20 px-3 sm:px-4 md:px-8 mx-auto max-w-7xl pb-10 sm:pb-12 overflow-x-hidden">
            {/* Compact Header */}
            <div className="text-center mb-5 sm:mb-6 animate-fade-in">
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 bg-clip-text text-transparent mb-2">
                <AuroraText speed={2.5} colors={["#2F3C96"]}>
                  Health Forums
                </AuroraText>
              </h1>
              <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
                Join communities, ask questions and share experiences
              </p>
            </div>

            {/* Communities/Posts Tabs — Communities first, open by default */}
            <div className="max-w-7xl mx-auto mb-5 sm:mb-6">
              <div className="flex items-center gap-2 border-b border-[#E8E8E8] overflow-x-auto hide-scrollbar pb-1">
                <button
                  onClick={() => setViewMode("communities")}
                  className={`flex-1 sm:flex-none min-w-[140px] px-4 sm:px-6 py-3 font-semibold text-sm transition-all relative rounded-t-lg ${
                    viewMode === "communities"
                      ? "text-[#2F3C96] border-b-2 border-[#2F3C96] bg-white/70"
                      : "text-[#787878] hover:text-[#484848]"
                  }`}
                >
                  Communities
                </button>
                <button
                  onClick={() => setViewMode("posts")}
                  className={`flex-1 sm:flex-none min-w-[140px] px-4 sm:px-6 py-3 font-semibold text-sm transition-all relative rounded-t-lg ${
                    viewMode === "posts"
                      ? "text-[#2F3C96] border-b-2 border-[#2F3C96] bg-white/70"
                      : "text-[#787878] hover:text-[#484848]"
                  }`}
                >
                  Posts
                </button>
              </div>
            </div>

            {/* Unified Control Bar - HealthUnlocked Style - Mobile Friendly */}
            {viewMode === "posts" && (
              <div className="max-w-7xl mx-auto mb-6 overflow-x-hidden">
                <div className="bg-white rounded-xl border border-[#E8E8E8] p-3 sm:p-4 flex flex-col gap-3 md:gap-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#2F3C96]">
                        Browse discussions
                      </p>
                      <p className="text-xs text-[#787878] leading-relaxed">
                        Search posts, refine the feed, or jump into a community.
                      </p>
                    </div>
                    {user && (
                      <button
                        onClick={() => {
                          setModalSelectedCommunity(selectedCommunity);
                          if (
                            selectedConditionTag !== "All" &&
                            FORUM_SUBCATEGORY_TAGS.includes(
                              selectedConditionTag,
                            )
                          ) {
                            setNewThreadTags([selectedConditionTag]);
                          } else {
                            setNewThreadTags([]);
                          }
                          setNewThreadConditions([]);
                          setNewThreadModal(true);
                        }}
                        className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-[#2F3C96] text-white rounded-md font-semibold text-sm hover:bg-[#253075] transition-all shrink-0"
                      >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span className="whitespace-nowrap">Create Post</span>
                      </button>
                    )}
                  </div>
                  {/* Search Bar - Full width on mobile */}
                  <div className="relative flex-1 min-w-0 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#787878]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          searchThreads();
                        }
                      }}
                      placeholder="Search discussions..."
                      className="w-full pl-10 pr-10 py-2.5 rounded-md border border-[#E8E8E8] bg-white text-sm text-[#484848] placeholder-[#787878] focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          if (selectedCommunity) loadThreads();
                          else loadAllThreads();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#787878] hover:text-[#484848] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Filter Options - Wraps on mobile, dropdown on small screens */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-stretch sm:items-center gap-2 md:gap-3 shrink-0 min-w-0">
                    {/* Filter Dropdown */}
                    <div className="w-full sm:w-36 shrink-0">
                      <CustomSelect
                        value={activeTab}
                        onChange={(value) => {
                          setActiveTab(value);
                          setSelectedCommunity(null);
                          setSelectedConditionTag("All");
                        }}
                        options={[
                          { value: "all", label: "All" },
                          { value: "following", label: "Following" },
                          { value: "forYou", label: "For You" },
                          { value: "involving", label: "Your Posts" },
                          {
                            value: "researcherReplied",
                            label: "Researcher Replied",
                          },
                          { value: "replied", label: "Replied" },
                        ]}
                        placeholder="Filter..."
                        className="w-full"
                      />
                    </div>

                    {/* Sort Options */}
                    <div className="grid grid-cols-2 items-center gap-0 bg-[#F5F5F5] rounded-md p-0.5 shrink-0 border border-[#E8E8E8] w-full sm:w-auto">
                      {["recent", "popular"].map((sort) => (
                        <button
                          key={sort}
                          onClick={() => setSortBy(sort)}
                          className={`px-2.5 sm:px-3 py-2 sm:py-1.5 rounded text-xs font-medium transition-all ${
                            sortBy === sort
                              ? "bg-white text-[#2F3C96] shadow-sm"
                              : "text-[#787878] hover:text-[#484848]"
                          }`}
                        >
                          {sort.charAt(0).toUpperCase() + sort.slice(1)}
                        </button>
                      ))}
                    </div>

                    {/* Mobile Community Dropdown - Full width on mobile when visible */}
                    <div className="lg:hidden w-full min-w-0 sm:col-span-2">
                      <CustomSelect
                        value={mobileCommunityId}
                        onChange={handleMobileCommunityChange}
                        options={mobileCommunityOptions}
                        placeholder="All communities"
                        disabled={
                          loadingCommunities ||
                          sortedDisplayedCommunities.length === 0
                        }
                        className="w-full text-sm min-w-0"
                      />
                    </div>

                    {/* Create Post Button */}
                    {user && (
                      <button
                        onClick={() => {
                          setModalSelectedCommunity(selectedCommunity);
                          if (
                            selectedConditionTag !== "All" &&
                            FORUM_SUBCATEGORY_TAGS.includes(
                              selectedConditionTag,
                            )
                          ) {
                            setNewThreadTags([selectedConditionTag]);
                          } else {
                            setNewThreadTags([]);
                          }
                          setNewThreadConditions([]);
                          setNewThreadModal(true);
                        }}
                        className="md:hidden flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 bg-[#2F3C96] text-white rounded-md font-semibold text-sm hover:bg-[#253075] transition-all shrink-0 w-full sm:col-span-2"
                      >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span className="whitespace-nowrap">Create Post</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Communities Search Bar + Propose a Community */}
            {viewMode === "communities" && (
              <div className="max-w-7xl mx-auto mb-6">
                <div className="bg-white rounded-xl border border-[#E8E8E8] p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#787878]" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                        }}
                        placeholder="Search communities..."
                        className="w-full pl-10 pr-10 py-2.5 rounded-md border border-[#E8E8E8] bg-white text-sm text-[#484848] placeholder-[#787878] focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] transition-all"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => {
                            setSearchQuery("");
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#787878] hover:text-[#484848] transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!user?._id && !user?.id) {
                          toast.error("Please sign in to propose a community");
                          return;
                        }
                        setProposeTitle("");
                        setProposeDescription("");
                        setProposeThumbnailUrl("");
                        setProposeCommunityModal(true);
                      }}
                      className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-[#2F3C96] bg-[#2F3C96] text-white text-sm font-semibold hover:bg-[#253075] hover:border-[#253075] transition-all w-full sm:w-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Propose a Community
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Main Content - Conditional based on viewMode */}
            {viewMode === "communities" ? (
              /* Communities View - Categorized from API, collapsible, SVG icons */
              <div className="max-w-7xl mx-auto">
                {loadingForumCategories ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-[#2F3C96] spinner" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {forumCategories
                      .filter((cat) => (cat.communities || []).length > 0)
                      .map((category) => {
                        const isOpen = categoryOpenState[category._id];
                        const headingColor = category.headingColor || "#2F3C96";
                        const colorClasses = getCategoryColorClasses();
                        const filteredCommunities = !searchQuery.trim()
                          ? category.communities || []
                          : (category.communities || []).filter((c) =>
                              (c.name || "")
                                .toLowerCase()
                                .includes(searchQuery.trim().toLowerCase()),
                            );
                        if (filteredCommunities.length === 0) return null;
                        const count = filteredCommunities.length;

                        return (
                          <section
                            key={category._id}
                            className={
                              isOpen
                                ? "bg-white border border-[#E8E8E8] rounded-2xl shadow-sm overflow-hidden"
                                : "bg-white border border-[#E8E8E8] rounded-2xl overflow-hidden hover:bg-[#2F3C96]/5 transition-colors"
                            }
                            style={{ borderLeft: `2px solid ${headingColor}` }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setCategoryOpenState((prev) => ({
                                  ...prev,
                                  [category._id]: !prev[category._id],
                                }))
                              }
                              className="w-full flex flex-col gap-3 px-4 sm:px-5 py-4 text-left transition-colors sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex items-start gap-3 min-w-0 w-full">
                                <ChevronRight
                                  className={`w-5 h-5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                                  style={{ color: headingColor }}
                                />
                                <h3 className="text-base sm:text-lg md:text-xl font-bold text-[#484848] leading-snug">
                                  {category.name}
                                  <span className="text-[#787878] font-normal ml-1.5">
                                    ({count})
                                  </span>
                                </h3>
                              </div>
                              <span
                                className={`text-xs px-2 py-1 rounded-full shrink-0 self-start sm:self-auto ${colorClasses.badge}`}
                              >
                                {count}{" "}
                                {count === 1 ? "community" : "communities"}
                              </span>
                            </button>
                            {isOpen && (
                              <div className="p-4 sm:p-6 border-t border-[#E8E8E8]">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {filteredCommunities.map((community) => {
                                    const itemColor =
                                      community.color || headingColor;
                                    const hasSvg =
                                      community.iconSvg &&
                                      community.iconSvg.trim();

                                    return (
                                      <div
                                        key={community._id}
                                        className="bg-white rounded-xl border border-[#E8E8E8] overflow-hidden hover:shadow-md hover:-translate-y-0.5 hover:border-[#2F3C96]/25 transition-all duration-200 cursor-pointer group flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4"
                                        onClick={() => {
                                          if (
                                            followingIds.has(community._id) ||
                                            community.isFollowing
                                          ) {
                                            setSelectedCommunity(community);
                                            setViewMode("posts");
                                          } else {
                                            navigate(
                                              `/forums/community/${community._id}`,
                                            );
                                          }
                                        }}
                                      >
                                        <div
                                          className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${colorClasses.icon}`}
                                        >
                                          {hasSvg ? (
                                            <span
                                              className="w-6 h-6 [&>svg]:w-full [&>svg]:h-full [&>svg]:shrink-0 currentColor"
                                              style={{ color: "inherit" }}
                                              dangerouslySetInnerHTML={{
                                                __html: sanitizeSvgForIcon(
                                                  community.iconSvg,
                                                ),
                                              }}
                                            />
                                          ) : (
                                            <IconStethoscope
                                              className="shrink-0 w-6 h-6"
                                              stroke={1.5}
                                            />
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0 w-full">
                                          <h4 className="font-semibold text-[#484848] line-clamp-1 group-hover:text-[#2F3C96] transition-colors">
                                            {community.name}
                                          </h4>
                                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
                                            <span className="text-sm text-[#787878] flex items-center gap-1">
                                              <Users className="w-3.5 h-3.5" />
                                              {community.memberCount?.toLocaleString() ||
                                                0}{" "}
                                              members
                                            </span>
                                            {followingIds.has(community._id) ||
                                            community.isFollowing ? (
                                              <span
                                                className={`px-2 py-1 rounded-lg text-xs font-medium shrink-0 flex items-center gap-1 self-start sm:self-auto ${colorClasses.badge}`}
                                              >
                                                <UserCheck className="w-3.5 h-3.5" />
                                                Joined
                                              </span>
                                            ) : (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  navigate(
                                                    `/forums/community/${community._id}`,
                                                  );
                                                }}
                                                className={`rounded-lg px-4 py-2 sm:py-1.5 text-sm font-medium border shrink-0 transition-all duration-200 w-full sm:w-auto ${colorClasses.join}`}
                                              >
                                                Join
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
                          </section>
                        );
                      })}
                    {forumCategories.filter((cat) => {
                      const list = cat.communities || [];
                      const filtered = !searchQuery.trim()
                        ? list
                        : list.filter((c) =>
                            (c.name || "")
                              .toLowerCase()
                              .includes(searchQuery.trim().toLowerCase()),
                          );
                      return filtered.length > 0;
                    }).length === 0 && (
                      <div className="bg-white rounded-lg border border-[#E8E8E8] p-12 text-center">
                        <Users className="w-12 h-12 text-[#D0C4E2] mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-[#2F3C96] mb-2">
                          {forumCategories.length === 0
                            ? "No categories yet"
                            : "No matches"}
                        </h3>
                        <p className="text-[#787878] text-sm">
                          {forumCategories.length === 0
                            ? "Add categories and communities from the admin dashboard."
                            : "Try a different search term"}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Posts View - Full Width Layout */
              <div className="max-w-7xl mx-auto min-w-0 overflow-hidden">
                {/* Selected Community Header - Simplified */}
                {selectedCommunity && (
                  <div className="bg-white rounded-xl border border-[#E8E8E8] p-4 sm:p-5 mb-6 shadow-sm overflow-hidden">
                    <div className="flex flex-col gap-4 mb-4 min-w-0 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-lg font-bold text-[#2F3C96]">
                            {selectedCommunity.name}
                          </h2>
                          {selectedCommunity.isOfficial && (
                            <CheckCircle2 className="w-4 h-4 text-[#2F3C96]" />
                          )}
                        </div>
                        <p className="text-sm text-[#787878] line-clamp-2 leading-relaxed">
                          {selectedCommunity.description}
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => {
                            setSelectedCommunity(null);
                            setSelectedSubcategory(null);
                          }}
                          className="px-3 py-2 sm:py-1.5 rounded-lg text-sm font-medium bg-[#F5F5F5] text-[#787878] hover:bg-[#E8E8E8] transition-all w-full sm:w-auto"
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => {
                            if (followingIds.has(selectedCommunity._id)) {
                              toggleFollow(selectedCommunity._id);
                            } else {
                              setJoinGuidelinesModalCommunity(
                                selectedCommunity,
                              );
                            }
                          }}
                          disabled={followingLoading.has(selectedCommunity._id)}
                          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all w-full sm:w-auto ${
                            followingIds.has(selectedCommunity._id)
                              ? "bg-[#2F3C96]/10 text-[#2F3C96] hover:bg-[#2F3C96]/20"
                              : "bg-[#2F3C96] text-white hover:bg-[#253075]"
                          }`}
                        >
                          {followingLoading.has(selectedCommunity._id) ? (
                            <Loader2 className="w-4 h-4 spinner" />
                          ) : followingIds.has(selectedCommunity._id) ? (
                            <>
                              <UserCheck className="w-4 h-4" />
                              Joined
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              Join
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Filters Section - Collapsible dropdown on mobile */}
                    <div className="border-t border-[#E8E8E8] pt-4">
                      {/* Mobile: Filters dropdown trigger */}
                      <div className="md:hidden">
                        <button
                          type="button"
                          onClick={() =>
                            setShowFiltersMobile(!showFiltersMobile)
                          }
                          className="flex items-center justify-between w-full py-2 px-3 rounded-lg border border-[#E8E8E8] bg-[#F5F5F5] hover:bg-[#EEEEEE] transition-colors"
                        >
                          <span className="flex items-center gap-2 text-sm font-semibold text-[#2F3C96]">
                            <Filter className="w-4 h-4" />
                            Filters
                            {(selectedConditionTag !== "All" ||
                              selectedSubcategory) && (
                              <span className="text-xs font-normal text-[#787878]">
                                (active)
                              </span>
                            )}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-[#787878] transition-transform ${
                              showFiltersMobile ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {showFiltersMobile && (
                          <div className="mt-3 space-y-4 p-3 rounded-lg border border-[#E8E8E8] bg-white">
                            <div>
                              <label className="block text-xs font-medium text-[#2F3C96] mb-1.5">
                                Tags/Keywords
                              </label>
                              <CustomSelect
                                value={selectedConditionTag}
                                onChange={(value) =>
                                  setSelectedConditionTag(value)
                                }
                                options={[
                                  { value: "All", label: "All Tags" },
                                  ...FORUM_SUBCATEGORY_TAGS.map((tag) => ({
                                    value: tag,
                                    label: tag,
                                  })),
                                ]}
                                placeholder="Select a tag..."
                                className="w-full"
                              />
                            </div>
                            {loadingSubcategories ? (
                              <div className="flex justify-center py-2">
                                <Loader2 className="w-5 h-5 text-[#2F3C96] animate-spin" />
                              </div>
                            ) : subcategories.length > 0 ? (
                              <div>
                                <label className="block text-xs font-medium text-[#2F3C96] mb-1.5">
                                  Conditions & Topics
                                </label>
                                <CustomSelect
                                  value={selectedSubcategory?._id || "All"}
                                  onChange={(value) => {
                                    if (value === "All") {
                                      setSelectedSubcategory(null);
                                    } else {
                                      const sub = subcategories.find(
                                        (s) => s._id === value,
                                      );
                                      setSelectedSubcategory(sub || null);
                                    }
                                  }}
                                  options={[
                                    { value: "All", label: "All" },
                                    ...subcategories.map((s) => ({
                                      value: s._id,
                                      label: `${s.name}${s.threadCount > 0 ? ` (${s.threadCount})` : ""}`,
                                    })),
                                  ]}
                                  placeholder="Select..."
                                  className="w-full"
                                />
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                      {/* Desktop: Inline filters */}
                      <div className="hidden md:block">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <Tag className="w-4 h-4 text-[#2F3C96] shrink-0" />
                              <label className="text-sm font-semibold text-[#2F3C96]">
                                Filter by Tags/Keywords:
                              </label>
                            </div>
                            <CustomSelect
                              value={selectedConditionTag}
                              onChange={(value) =>
                                setSelectedConditionTag(value)
                              }
                              options={[
                                { value: "All", label: "All Tags" },
                                ...FORUM_SUBCATEGORY_TAGS.map((tag) => ({
                                  value: tag,
                                  label: tag,
                                })),
                              ]}
                              placeholder="Select a tag..."
                              className="w-full"
                            />
                          </div>
                          {loadingSubcategories ? (
                            <div className="flex-1 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 text-[#2F3C96] spinner" />
                            </div>
                          ) : subcategories.length > 0 ? (
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <Filter className="w-4 h-4 text-[#2F3C96] shrink-0" />
                                <label className="text-sm font-semibold text-[#2F3C96]">
                                  Filter by Conditions & Topics:
                                </label>
                              </div>
                              <CustomSelect
                                value={selectedSubcategory?._id || "All"}
                                onChange={(value) => {
                                  if (value === "All") {
                                    setSelectedSubcategory(null);
                                  } else {
                                    const subcategory = subcategories.find(
                                      (s) => s._id === value,
                                    );
                                    setSelectedSubcategory(subcategory || null);
                                  }
                                }}
                                options={[
                                  {
                                    value: "All",
                                    label: "All Conditions & Topics",
                                  },
                                  ...subcategories.map((subcategory) => ({
                                    value: subcategory._id,
                                    label: `${subcategory.name}${subcategory.threadCount > 0 ? ` (${subcategory.threadCount})` : ""}`,
                                  })),
                                ]}
                                placeholder="Select a condition & topic..."
                                className="w-full"
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <p className="text-xs text-[#787878] mt-2 hidden sm:block">
                        Filter discussions by tags/keywords and conditions &
                        topics for better findability.
                      </p>
                    </div>
                  </div>
                )}

                {/* Threads List - HealthUnlocked Style */}
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="relative">
                      <div className="w-12 h-12 border-4 border-[#E8E8E8] border-t-[#2F3C96] rounded-full spinner"></div>
                    </div>
                  </div>
                ) : threadsWithVoteStates.length > 0 ? (
                  <div className="space-y-4">
                    {threadsWithVoteStates.map((thread, idx) => {
                      // Vote states are now pre-computed in threadsWithVoteStates
                      const { isUpvoted, isDownvoted } = thread;
                      const isExpanded = expandedThreadIds.has(thread._id);
                      const threadDetails = expandedThreads[thread._id];
                      const communityInfo =
                        thread.communityId || thread.categoryId;

                      const authorName =
                        thread.originalAuthorUsername ||
                        (thread.dummyKey
                          ? "Community"
                          : getDisplayName(thread.authorUserId, "Anonymous"));
                      const authorHandle =
                        thread.originalAuthorHandle ??
                        thread.authorUserId?.handle;
                      const nameHidden = thread.authorUserId?.nameHidden;
                      const authorInitial =
                        nameHidden && authorHandle
                          ? authorHandle.charAt(0).toUpperCase()
                          : authorName.charAt(0).toUpperCase();
                      const authorPicture = thread.authorUserId?.picture;
                      const firstTag =
                        thread.tags?.[0] ||
                        thread.conditions?.[0] ||
                        communityInfo?.name;

                      return (
                        <div
                          key={thread._id}
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleThread(thread._id)}
                          onKeyDown={(e) => {
                            // Only handle keyboard events when element is actually focused via keyboard navigation
                            // Ignore space key from text inputs, textareas, or contenteditable elements
                            const target = e.target;
                            const isTextInput =
                              target.tagName === "INPUT" ||
                              target.tagName === "TEXTAREA" ||
                              target.isContentEditable;

                            if (e.key === "Enter") {
                              e.preventDefault();
                              toggleThread(thread._id);
                            } else if (e.key === " " && !isTextInput) {
                              // Only handle space if not in a text input
                              e.preventDefault();
                              toggleThread(thread._id);
                            }
                          }}
                          className={`bg-white rounded-lg border transition-all duration-300 overflow-hidden relative cursor-pointer ${
                            isExpanded
                              ? "shadow-md border-[#2F3C96]/30"
                              : "border-[#E8E8E8] hover:shadow-md hover:border-[#2F3C96]/25"
                          } focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3C96]/40 focus-visible:ring-offset-2`}
                          aria-label={`Open thread: ${thread.title}`}
                        >
                          <div className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-4">
                              {/* Vote Controls - Like / Dislike */}
                              <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-start gap-1 shrink-0 rounded-xl border border-[#E8E8E8] bg-[#F8F8F8] px-2.5 py-1.5 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 w-full sm:w-auto">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    voteOnThread(
                                      thread._id,
                                      isUpvoted ? "neutral" : "upvote",
                                    );
                                  }}
                                  className={`p-1.5 rounded transition-all ${
                                    isUpvoted
                                      ? "text-[#2F3C96]"
                                      : "text-[#787878] hover:text-[#2F3C96]"
                                  }`}
                                  aria-label={
                                    isUpvoted ? "Unlike post" : "Like post"
                                  }
                                >
                                  <ThumbsUp
                                    className={`w-4 h-4 shrink-0 ${isUpvoted ? "fill-[#2F3C96] text-[#2F3C96]" : ""}`}
                                  />
                                </button>
                                <span
                                  className={`text-sm font-semibold min-w-[1.5rem] text-center ${
                                    thread.voteScore !== 0
                                      ? "text-[#2F3C96]"
                                      : "text-[#787878]"
                                  }`}
                                  aria-hidden
                                >
                                  {thread.voteScore || 0}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    voteOnThread(
                                      thread._id,
                                      isDownvoted ? "neutral" : "downvote",
                                    );
                                  }}
                                  className={`p-1.5 rounded transition-all ${
                                    isDownvoted
                                      ? "text-red-500"
                                      : "text-[#787878] hover:text-red-500"
                                  }`}
                                  aria-label={
                                    isDownvoted
                                      ? "Remove dislike from post"
                                      : "Dislike post"
                                  }
                                >
                                  <ThumbsDown
                                    className={`w-4 h-4 shrink-0 ${isDownvoted ? "text-red-500" : ""}`}
                                  />
                                </button>
                              </div>

                              {/* Thread Content — hierarchy: Title → Author → Content → Meta → Actions */}
                              <div className="flex-1 min-w-0 overflow-hidden">
                                {/* 1. Title */}
                                <h3
                                  className="text-lg font-bold text-[#484848] hover:text-[#2F3C96] transition-colors mb-2 leading-tight break-words cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleThread(thread._id);
                                  }}
                                >
                                  {thread.title}
                                </h3>

                                {/* 2. Author + Follow (grouped unit) */}
                                <div className="flex items-center gap-2 mb-2 flex-wrap min-w-0">
                                  <button
                                    type="button"
                                    title={`View ${nameHidden && authorHandle ? `@${authorHandle}` : authorName}'s profile`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const uid =
                                        thread.authorUserId?._id ||
                                        thread.authorUserId;
                                      if (uid) openUserProfileModal(uid);
                                    }}
                                    className="flex items-center gap-2 text-left text-[#484848] hover:text-[#2F3C96] transition-colors group/author cursor-pointer"
                                  >
                                    {authorPicture ? (
                                      <img
                                        src={authorPicture}
                                        alt={
                                          nameHidden && authorHandle
                                            ? `@${authorHandle}`
                                            : authorName
                                        }
                                        className="h-7 w-7 shrink-0 rounded-full object-cover cursor-pointer"
                                        onError={(e) => {
                                          e.target.style.display = "none";
                                          const fallback =
                                            e.target.parentElement.querySelector(
                                              ".avatar-initial-fallback",
                                            );
                                          if (fallback) {
                                            fallback.style.display = "flex";
                                          }
                                        }}
                                      />
                                    ) : null}
                                    <span
                                      className={`avatar-initial-fallback flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2F3C96]/15 text-xs font-semibold text-[#2F3C96] cursor-pointer ${authorPicture ? "hidden" : ""}`}
                                      aria-hidden
                                    >
                                      {authorInitial}
                                    </span>
                                    <div className="flex flex-col cursor-pointer">
                                      {!nameHidden && (
                                        <span className="text-sm font-medium">
                                          {authorName}
                                        </span>
                                      )}
                                      {authorHandle && (
                                        <span
                                          className={`text-xs ${nameHidden ? "font-medium" : "text-[#787878]"}`}
                                        >
                                          @{authorHandle}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                  {(() => {
                                    const authorId =
                                      thread.authorUserId?._id?.toString?.() ||
                                      thread.authorUserId?.toString?.();
                                    const currentUserId = (
                                      user?._id || user?.id
                                    )?.toString?.();
                                    const isSelf =
                                      !!currentUserId &&
                                      authorId === currentUserId;
                                    const alreadyFollowing =
                                      authorId &&
                                      followingUserIds.has(authorId);
                                    if (!authorId || isSelf) return null;
                                    return (
                                      <>
                                        <span
                                          className="text-[#C4C4C4] text-sm"
                                          aria-hidden
                                        >
                                          ·
                                        </span>
                                        {alreadyFollowing ? (
                                          <span
                                            className="relative inline-flex items-center text-emerald-600 shrink-0 cursor-default group"
                                            aria-label="Following"
                                          >
                                            <CheckCircle2
                                              className="w-3.5 h-3.5"
                                              aria-hidden
                                            />
                                            <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 whitespace-nowrap z-50">
                                              Following
                                            </span>
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const uid =
                                                thread.authorUserId?._id ||
                                                thread.authorUserId;
                                              if (uid)
                                                openUserProfileModal(uid);
                                            }}
                                            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-[#787878] border border-[#E8E8E8] hover:border-[#2F3C96]/40 hover:text-[#2F3C96] hover:bg-[#2F3C96]/5 transition-colors"
                                            title="Follow to get updates"
                                          >
                                            <UserPlus
                                              className="w-3 h-3"
                                              aria-hidden
                                            />
                                            Follow
                                          </button>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>

                                {/* 3. Preview — max 2 lines, ellipsis */}
                                <p className="text-sm text-[#787878] leading-relaxed mb-3 line-clamp-3 sm:line-clamp-2 text-ellipsis overflow-hidden">
                                  {thread.body}
                                </p>

                                {/* 4. Meta row — muted, single line: tag · date · views */}
                                <div className="flex items-center gap-x-2 gap-y-1 text-[11px] text-[#9ca3af] mb-3 flex-wrap min-w-0 overflow-hidden">
                                  {firstTag && (
                                    <>
                                      <span className="flex items-center gap-1 shrink-0">
                                        <Tag className="w-3 h-3" aria-hidden />
                                        <span className="truncate max-w-[120px]">
                                          {firstTag}
                                        </span>
                                      </span>
                                      <span aria-hidden>·</span>
                                    </>
                                  )}
                                  <span className="flex items-center gap-1 shrink-0">
                                    <Clock className="w-3 h-3" aria-hidden />
                                    {new Date(
                                      thread.createdAt,
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </span>
                                  <span aria-hidden>·</span>

                                  <span className="flex items-center gap-1 shrink-0">
                                    <Eye className="w-3 h-3" aria-hidden />
                                    {thread.viewCount || 0}
                                  </span>
                                </div>

                                {/* 5. Actions row — reply count (left, clickable) + researcher status + Save (right) */}
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className="sr-only">
                                      {thread.hasResearcherReply
                                        ? "Researcher replied"
                                        : thread.onlyResearchersCanReply
                                          ? "Awaiting researcher reply"
                                          : "Awaiting reply"}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleThread(thread._id);
                                      }}
                                      className={`flex items-center gap-1.5 text-sm font-medium transition-colors group/reply ${
                                        thread.hasResearcherReply
                                          ? "text-emerald-600 hover:text-emerald-700"
                                          : "text-amber-600 hover:text-amber-700"
                                      }`}
                                      title="View discussion"
                                    >
                                      {(thread.replyCount || 0) === 0 ? (
                                        <>
                                          <Clock
                                            className="w-4 h-4 shrink-0"
                                            aria-hidden
                                          />
                                          <span>
                                            {thread.onlyResearchersCanReply
                                              ? "Awaiting researcher reply"
                                              : "Awaiting reply"}
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <MessageCircle
                                            className="w-4 h-4 shrink-0"
                                            aria-hidden
                                          />
                                          <span>
                                            {thread.replyCount || 0} reply
                                            {(thread.replyCount || 0) !== 1
                                              ? "s"
                                              : ""}
                                          </span>
                                        </>
                                      )}
                                      {!isExpanded ? (
                                        <ChevronDown
                                          className="w-4 h-4 group-hover/reply:translate-y-0.5 transition-transform"
                                          aria-hidden
                                        />
                                      ) : (
                                        <ChevronUp
                                          className="w-4 h-4 group-hover/reply:-translate-y-0.5 transition-transform"
                                          aria-hidden
                                        />
                                      )}
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                    {user && (
                                      <>
                                        {/* Share button - only show for thread author */}
                                        {(() => {
                                          const authorId =
                                            thread.authorUserId?._id?.toString() ||
                                            thread.authorUserId?.toString();
                                          const currentUserId = (
                                            user._id || user.id
                                          )?.toString();
                                          const isAuthor =
                                            authorId === currentUserId;
                                          const isShared = sharedThreadIds.has(
                                            thread._id,
                                          );

                                          // Don't show button if not author or already shared
                                          if (!isAuthor || isShared)
                                            return null;

                                          return (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openShareModal(thread);
                                              }}
                                              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 text-[#787878] hover:text-[#2F3C96] hover:bg-[#2F3C96]/5"
                                              title="Add to Discovery"
                                              aria-label="Add to Discovery"
                                            >
                                              <Plus
                                                className="w-4 h-4"
                                                aria-hidden
                                              />
                                              <span>Add to Discovery</span>
                                            </button>
                                          );
                                        })()}
                                        {/* Delete button - only show for thread author; hide for dummy/sample posts */}
                                        {(() => {
                                          const authorId =
                                            thread.authorUserId?._id?.toString() ||
                                            thread.authorUserId?.toString();
                                          const currentUserId = (
                                            user._id || user.id
                                          )?.toString();
                                          const isAuthor =
                                            authorId === currentUserId;
                                          if (!isAuthor || thread.isDummy)
                                            return null;
                                          const isDeleting =
                                            deletingThreadId === thread._id;
                                          return (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                deleteThread(thread._id);
                                              }}
                                              disabled={isDeleting}
                                              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 text-[#787878] hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                                              title="Delete thread"
                                              aria-label="Delete thread"
                                            >
                                              {isDeleting ? (
                                                <Loader2
                                                  className="w-4 h-4 animate-spin"
                                                  aria-hidden
                                                />
                                              ) : (
                                                <Trash2
                                                  className="w-4 h-4"
                                                  aria-hidden
                                                />
                                              )}
                                              <span>Delete</span>
                                            </button>
                                          );
                                        })()}

                                        {/* Save button */}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleFavorite(
                                              thread._id,
                                              "thread",
                                              thread,
                                            );
                                          }}
                                          disabled={favoritingItems.has(
                                            thread._id,
                                          )}
                                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${
                                            favorites.some(
                                              (fav) =>
                                                fav.itemId === thread._id &&
                                                fav.itemType === "thread",
                                            )
                                              ? "text-red-500 bg-red-50 hover:bg-red-100"
                                              : "text-[#787878] hover:text-red-500 hover:bg-red-50"
                                          }`}
                                          title={
                                            favorites.some(
                                              (fav) =>
                                                fav.itemId === thread._id &&
                                                fav.itemType === "thread",
                                            )
                                              ? "Unsave"
                                              : "Save"
                                          }
                                          aria-label={
                                            favorites.some(
                                              (fav) =>
                                                fav.itemId === thread._id &&
                                                fav.itemType === "thread",
                                            )
                                              ? "Unsave thread"
                                              : "Save thread"
                                          }
                                        >
                                          {favoritingItems.has(thread._id) ? (
                                            <Loader2
                                              className="w-4 h-4 spinner"
                                              aria-hidden
                                            />
                                          ) : (
                                            <Heart
                                              className={`w-4 h-4 ${
                                                favorites.some(
                                                  (fav) =>
                                                    fav.itemId === thread._id &&
                                                    fav.itemType === "thread",
                                                )
                                                  ? "fill-current"
                                                  : ""
                                              }`}
                                              aria-hidden
                                            />
                                          )}
                                          <span>Save</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Expanded Replies Section */}
                                {isExpanded && (
                                  <div
                                    className="thread-expandable expanded border-t border-[#E8E8E8] pt-4 mt-4"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                                      <h4 className="flex items-center gap-2 font-semibold text-sm text-[#484848]">
                                        <MessageCircle className="w-4 h-4 text-[#2F3C96]" />
                                        <span>
                                          {threadDetails?.replies?.length ||
                                            thread.replyCount ||
                                            0}{" "}
                                          Replies
                                        </span>
                                      </h4>
                                      <button
                                        onClick={() => toggleThread(thread._id)}
                                        className="flex items-center gap-1.5 text-xs text-[#787878] hover:text-[#2F3C96] font-medium transition-colors group"
                                      >
                                        <ChevronUp className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
                                        <span>Collapse</span>
                                      </button>
                                    </div>

                                    {loadingThreadDetails.has(thread._id) ? (
                                      <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-8 h-8 text-[#2F3C96] spinner" />
                                      </div>
                                    ) : threadDetails?.replies?.length > 0 ? (
                                      <div className="space-y-3">
                                        {threadDetails.replies.map((reply) =>
                                          renderReply(
                                            reply,
                                            thread._id,
                                            0,
                                            thread.onlyResearchersCanReply,
                                          ),
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-center py-8">
                                        <MessageCircle className="w-10 h-10 mx-auto mb-2 text-[#D0C4E2]" />
                                        <p className="text-sm text-[#787878]">
                                          No replies yet. Be the first to reply!
                                        </p>
                                      </div>
                                    )}

                                    {/* Reply Form - allow replies on both real and dummy/sample posts */}
                                    {user && (
                                      <div className="mt-4 pt-4 border-t border-[#E8E8E8]">
                                        {thread.onlyResearchersCanReply &&
                                        (user?.role || user?.userRole) !==
                                          "researcher" ? (
                                          <p className="text-sm text-[#787878] italic">
                                            Only researchers can reply to this
                                            thread.
                                          </p>
                                        ) : replyingTo?.threadId ===
                                            thread._id &&
                                          !replyingTo?.replyId ? (
                                          <div>
                                            <textarea
                                              value={
                                                replyBody[
                                                  `${thread._id}-root`
                                                ] || ""
                                              }
                                              onChange={(e) =>
                                                setReplyBody((prev) => ({
                                                  ...prev,
                                                  [`${thread._id}-root`]:
                                                    e.target.value,
                                                }))
                                              }
                                              placeholder="Write a reply..."
                                              className="w-full rounded-md border border-[#E8E8E8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] resize-none text-[#484848] placeholder-[#787878]"
                                              rows="3"
                                            />
                                            <div className="flex flex-col sm:flex-row gap-2 mt-3">
                                              <button
                                                onClick={() =>
                                                  postReply(thread._id)
                                                }
                                                className="flex items-center justify-center gap-2 px-4 py-2 bg-[#2F3C96] text-white rounded-md text-sm font-semibold hover:bg-[#253075] transition-all"
                                              >
                                                <Send className="w-3.5 h-3.5" />
                                                Reply
                                              </button>
                                              <button
                                                onClick={() =>
                                                  setReplyingTo(null)
                                                }
                                                className="px-4 py-2 bg-[#F5F5F5] text-[#787878] rounded-md text-sm font-medium hover:bg-[#E8E8E8] transition-all"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() =>
                                              setReplyingTo({
                                                threadId: thread._id,
                                                replyId: null,
                                              })
                                            }
                                            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#F5F5F5] border border-[#E8E8E8] text-[#787878] rounded-md text-sm font-medium hover:bg-[#E8E8E8] hover:text-[#2F3C96] transition-all w-full"
                                          >
                                            <MessageCircle className="w-4 h-4" />
                                            Add a reply
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-[#E8E8E8] p-12 text-center shadow-sm">
                    <MessageCircle className="w-12 h-12 text-[#D0C4E2] mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-[#2F3C96] mb-2">
                      {activeTab === "following" && !selectedCommunity
                        ? "No Posts from Followed Communities"
                        : activeTab === "forYou"
                          ? "No Recommendations Yet"
                          : activeTab === "involving"
                            ? "No Posts Involving You"
                            : activeTab === "researcherReplied"
                              ? "No Posts with Researcher Replies"
                              : activeTab === "replied"
                                ? "No Posts with Replies Yet"
                                : "No Discussions Yet"}
                    </h3>
                    <p className="text-[#787878] max-w-md mx-auto text-sm">
                      {activeTab === "following" && !selectedCommunity
                        ? "Join some communities to see posts in your feed!"
                        : activeTab === "forYou"
                          ? "Complete your profile to get personalized recommendations."
                          : activeTab === "researcherReplied"
                            ? "No researchers have replied to any posts yet. Check back soon!"
                            : activeTab === "replied"
                              ? "No posts have received replies yet. Be the first to respond!"
                              : selectedCommunity && user
                                ? "Be the first to start a discussion!"
                                : "Select a community to view or start discussions."}
                    </p>
                    {user && selectedCommunity && (
                      <button
                        onClick={() => {
                          setModalSelectedCommunity(selectedCommunity);
                          // Pre-select tag if one is selected in filter
                          if (
                            selectedConditionTag !== "All" &&
                            FORUM_SUBCATEGORY_TAGS.includes(
                              selectedConditionTag,
                            )
                          ) {
                            setNewThreadTags([selectedConditionTag]);
                          } else {
                            setNewThreadTags([]);
                          }
                          setNewThreadConditions([]);
                          setNewThreadModal(true);
                        }}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#2F3C96] text-white rounded-lg font-semibold hover:bg-[#253075] transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        Start Discussion
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* New Condition & Topic Modal */}
            {newSubcategoryModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#E8E8E8]">
                  <div className="p-5 border-b border-[#E8E8E8]">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-[#2F3C96]">
                        Create New Condition & Topic
                      </h2>
                      <button
                        onClick={() => {
                          setNewSubcategoryModal(false);
                          setNewSubcategoryName("");
                          setNewSubcategoryDescription("");
                          setNewSubcategoryTags([]);
                          setMeshInput("");
                          setMeshSuggestions([]);
                        }}
                        className="p-2 text-[#787878] hover:text-[#2F3C96] hover:bg-[#F5F5F5] rounded-lg transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    {selectedCommunity && (
                      <div className="flex items-center gap-3 p-3 bg-[#F5F5F5] rounded-lg border border-[#E8E8E8]">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                          style={{
                            backgroundColor: `${selectedCommunity.color}15`,
                          }}
                        >
                          <CommunityIcon
                            community={selectedCommunity}
                            size="1.25rem"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-[#787878]">Creating in</p>
                          <p className="font-medium text-[#2F3C96]">
                            {selectedCommunity.name}
                          </p>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-[#2F3C96] mb-2">
                        Condition & Topic Name{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newSubcategoryName}
                        onChange={(e) => setNewSubcategoryName(e.target.value)}
                        placeholder="e.g., Breast Cancer, Anxiety, Type 1 Diabetes"
                        className="w-full rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] text-[#484848] placeholder-[#787878]"
                      />
                      <p className="text-xs text-[#787878] mt-1">
                        The system will check if a similar condition & topic
                        already exists
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#2F3C96] mb-2">
                        Description (Optional)
                      </label>
                      <textarea
                        value={newSubcategoryDescription}
                        onChange={(e) =>
                          setNewSubcategoryDescription(e.target.value)
                        }
                        placeholder="Brief description of this condition & topic..."
                        className="w-full rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] resize-none text-[#484848] placeholder-[#787878]"
                        rows="3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#2F3C96] mb-2">
                        Tags (MeSH Terminology)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={meshInput}
                          onChange={(e) => setMeshInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              meshInput.trim() &&
                              !meshSuggestions.length
                            ) {
                              e.preventDefault();
                              if (
                                !newSubcategoryTags.includes(meshInput.trim())
                              ) {
                                setNewSubcategoryTags([
                                  ...newSubcategoryTags,
                                  meshInput.trim(),
                                ]);
                                setMeshInput("");
                              }
                            }
                          }}
                          placeholder="Type to search MeSH terms (e.g., treatment, therapy, diagnosis)..."
                          className="w-full rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] text-[#484848] placeholder-[#787878]"
                        />
                        {meshSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-[#E8E8E8] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {meshSuggestions.map((suggestion, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  if (
                                    !newSubcategoryTags.includes(suggestion)
                                  ) {
                                    setNewSubcategoryTags([
                                      ...newSubcategoryTags,
                                      suggestion,
                                    ]);
                                  }
                                  setMeshInput("");
                                  setMeshSuggestions([]);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-[#484848] hover:bg-[#F5F5F5] transition-colors"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-[#787878] mt-1">
                        Use MeSH terms for better recommendations (e.g.,
                        Treatment, Therapy, Diagnosis)
                      </p>
                      {newSubcategoryTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {newSubcategoryTags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-[#2F3C96]/10 text-[#2F3C96] rounded-lg text-xs font-medium"
                            >
                              {tag}
                              <button
                                onClick={() =>
                                  setNewSubcategoryTags(
                                    newSubcategoryTags.filter(
                                      (_, i) => i !== idx,
                                    ),
                                  )
                                }
                                className="hover:text-red-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={createSubcategory}
                        disabled={!newSubcategoryName.trim()}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2F3C96] text-white rounded-lg text-sm font-semibold hover:bg-[#253075] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                        Create Condition & Topic
                      </button>
                      <button
                        onClick={() => {
                          setNewSubcategoryModal(false);
                          setNewSubcategoryName("");
                          setNewSubcategoryDescription("");
                          setNewSubcategoryTags([]);
                          setMeshInput("");
                          setMeshSuggestions([]);
                        }}
                        className="px-6 py-2.5 bg-[#F5F5F5] text-[#787878] rounded-lg text-sm font-medium hover:bg-[#E8E8E8] transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* New Thread Modal */}
            {newThreadModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#E8E8E8]">
                  <div className="p-5 border-b border-[#E8E8E8]">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-[#2F3C96]">
                        New Discussion
                      </h2>
                      <button
                        onClick={() => {
                          setNewThreadModal(false);
                          setNewThreadTitle("");
                          setNewThreadBody("");
                          setNewThreadSubcategory(null);
                          setNewThreadTags([]);
                          setNewThreadConditions([]);
                          setNewThreadConditionInput("");
                          setNewThreadOnlyResearchersCanReply(false);
                          setConditionSuggestions([]);
                          setNewThreadMeshInput("");
                          setNewThreadMeshSuggestions([]);
                          setModalSelectedCommunity(null);
                          setTagsFieldTouched(false);
                          setTagsSubmitAttempted(false);
                          setCommunityGuidelinesCollapsed(true);
                        }}
                        className="p-2 text-[#787878] hover:text-[#2F3C96] hover:bg-[#F5F5F5] rounded-lg transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-5 space-y-6">
                    {/* — Where — */}
                    <section className="space-y-3">
                      <p className="text-xs font-semibold text-[#484848] uppercase tracking-wide border-b border-[#E8E8E8] pb-1.5">
                        Where
                      </p>
                      {modalSelectedCommunity ? (
                        <>
                          <div className="flex items-center gap-3 p-3 bg-[#F5F5F5] rounded-lg border border-[#E8E8E8]">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                              style={{
                                backgroundColor: `${modalSelectedCommunity.color}15`,
                              }}
                            >
                              <CommunityIcon
                                community={modalSelectedCommunity}
                                size="1.25rem"
                              />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-[#787878]">
                                Posting in
                              </p>
                              <p className="font-medium text-[#2F3C96]">
                                {modalSelectedCommunity.name}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setModalSelectedCommunity(null);
                                setNewThreadSubcategory(null);
                              }}
                              className="text-xs text-[#787878] hover:text-[#2F3C96] transition-colors"
                            >
                              Change
                            </button>
                          </div>
                          {modalSubcategories.length > 0 && (
                            <div>
                              <label className="block text-sm font-medium text-[#383838] mb-1.5">
                                Condition & Topic{" "}
                                <span className="text-[#787878] font-normal">
                                  (optional)
                                </span>
                              </label>
                              <p className="text-xs text-[#787878] mb-2">
                                Helps researchers and patients find your
                                discussion
                              </p>
                              <CustomSelect
                                value={newThreadSubcategory?._id || ""}
                                onChange={(value) => {
                                  const subcategory = modalSubcategories.find(
                                    (s) => s._id === value,
                                  );
                                  setNewThreadSubcategory(subcategory || null);
                                }}
                                options={[
                                  {
                                    value: "",
                                    label: "None (All Conditions & Topics)",
                                  },
                                  ...modalSubcategories.map((s) => ({
                                    value: s._id,
                                    label: s.name,
                                  })),
                                ]}
                                placeholder="Select a condition & topic..."
                                className="w-full"
                              />
                            </div>
                          )}
                        </>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-[#383838] mb-2">
                            Select Community
                          </label>
                          <CustomSelect
                            value={modalSelectedCommunity?._id || ""}
                            onChange={(value) => {
                              const community = communities.find(
                                (c) => c._id === value,
                              );
                              setModalSelectedCommunity(community);
                              setNewThreadSubcategory(null);
                              if (
                                selectedConditionTag !== "All" &&
                                FORUM_SUBCATEGORY_TAGS.includes(
                                  selectedConditionTag,
                                )
                              ) {
                                setNewThreadTags([selectedConditionTag]);
                              } else {
                                setNewThreadTags([]);
                              }
                              setNewThreadConditions([]);
                            }}
                            options={communities
                              .filter((c) => followingIds.has(c._id))
                              .map((c) => ({
                                value: c._id,
                                label: c.name,
                              }))}
                            placeholder="Select from your joined communities..."
                            className="w-full"
                          />
                          {communities.filter((c) => followingIds.has(c._id))
                            .length === 0 && (
                            <p className="text-xs text-[#787878] mt-2">
                              You haven't joined any communities yet. Join a
                              community to create a post.
                            </p>
                          )}
                        </div>
                      )}
                    </section>

                    {/* — What's this discussion about — */}
                    <section className="space-y-3">
                      <p className="text-xs font-semibold text-[#484848] uppercase tracking-wide border-b border-[#E8E8E8] pb-1.5">
                        What's this discussion about
                      </p>
                      <div>
                        <label className="block text-sm font-medium text-[#383838] mb-1.5">
                          Title
                        </label>
                        <input
                          type="text"
                          value={newThreadTitle}
                          onChange={(e) =>
                            setNewThreadTitle(
                              e.target.value.slice(0, TITLE_MAX_LENGTH),
                            )
                          }
                          placeholder="e.g. How do you manage fatigue? or Share your experience..."
                          maxLength={TITLE_MAX_LENGTH}
                          className="w-full rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] text-[#484848] placeholder-[#9CA3AF]"
                        />
                        <p className="text-xs text-[#787878] mt-1 text-right">
                          {newThreadTitle.length} / {TITLE_MAX_LENGTH}
                        </p>
                      </div>
                    </section>

                    {/* — Details — */}
                    <section className="space-y-3">
                      <p className="text-xs font-semibold text-[#484848] uppercase tracking-wide border-b border-[#E8E8E8] pb-1.5">
                        Details{" "}
                        <span className="font-normal text-[#787878]">
                          (optional)
                        </span>
                      </p>
                      <div>
                        <label className="block text-sm font-medium text-[#383838] mb-1.5">
                          Subcategories/Tags
                        </label>
                        <div
                          onBlur={() => setTagsFieldTouched(true)}
                          className="mb-3"
                        >
                          <CustomSelect
                            value=""
                            onChange={(value) => {
                              if (value && !newThreadTags.includes(value)) {
                                setNewThreadTags([...newThreadTags, value]);
                              }
                            }}
                            options={FORUM_SUBCATEGORY_TAGS.filter(
                              (tag) => !newThreadTags.includes(tag),
                            ).map((tag) => ({
                              value: tag,
                              label: tag,
                            }))}
                            placeholder={
                              newThreadTags.length === 0
                                ? "Search or add a tag (optional)..."
                                : "Add another tag..."
                            }
                            searchable={true}
                            searchPlaceholder="Search tags..."
                            maxDropdownHeight={240}
                            className="w-full mb-2"
                            disabled={
                              FORUM_SUBCATEGORY_TAGS.filter(
                                (tag) => !newThreadTags.includes(tag),
                              ).length === 0
                            }
                          />
                          {newThreadTags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {newThreadTags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#2F3C96]/10 text-[#2F3C96] rounded-lg text-xs font-medium"
                                >
                                  {tag}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setNewThreadTags(
                                        newThreadTags.filter(
                                          (_, i) => i !== idx,
                                        ),
                                      )
                                    }
                                    className="hover:text-red-500 rounded p-0.5"
                                    aria-label="Remove tag"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <label className="block text-sm font-medium text-[#383838] mb-1.5">
                          Content{" "}
                          <span className="font-normal text-[#787878]">
                            (optional)
                          </span>
                        </label>
                        <textarea
                          value={newThreadBody}
                          onChange={(e) =>
                            setNewThreadBody(
                              e.target.value.slice(0, CONTENT_MAX_LENGTH),
                            )
                          }
                          placeholder="Add more context if you'd like..."
                          className="w-full rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] resize-none text-[#484848] placeholder-[#9CA3AF] min-h-[140px]"
                          rows={7}
                          maxLength={CONTENT_MAX_LENGTH}
                        />
                        <p className="text-xs text-[#787878] mt-1 text-right">
                          {newThreadBody.length} / {CONTENT_MAX_LENGTH}
                        </p>
                      </div>
                    </section>

                    {/* — Visibility — */}
                    <section className="space-y-3">
                      <p className="text-xs font-semibold text-[#484848] uppercase tracking-wide border-b border-[#E8E8E8] pb-1.5">
                        Visibility
                      </p>
                      <div className="flex items-start gap-3 pt-1">
                        <input
                          type="checkbox"
                          id="newThreadOnlyResearchersCanReply"
                          checked={newThreadOnlyResearchersCanReply}
                          onChange={(e) =>
                            setNewThreadOnlyResearchersCanReply(
                              e.target.checked,
                            )
                          }
                          className="mt-1 h-4 w-4 rounded border-[#E8E8E8] text-[#2F3C96] focus:ring-[#2F3C96]/20"
                        />
                        <label
                          htmlFor="newThreadOnlyResearchersCanReply"
                          className="text-sm text-[#484848] cursor-pointer"
                        >
                          Only researchers should reply to this thread
                        </label>
                      </div>
                    </section>

                    {/* Community Guidelines — collapsible, lighter */}
                    <div className="rounded-lg border border-[#E8E8E8] bg-[#FDFCF8] overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          setCommunityGuidelinesCollapsed((c) => !c)
                        }
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
                      >
                        <span className="text-sm font-medium text-[#484848]">
                          Community Guidelines
                        </span>
                        {communityGuidelinesCollapsed ? (
                          <ChevronDown className="w-4 h-4 text-[#787878] shrink-0" />
                        ) : (
                          <ChevronUp className="w-4 h-4 text-[#787878] shrink-0" />
                        )}
                      </button>
                      {!communityGuidelinesCollapsed && (
                        <div className="px-4 pb-4 pt-0">
                          <p className="text-sm text-[#5a5a5a]">
                            Please be respectful and maintain a professional
                            tone. No political speech, personal attacks, or
                            inappropriate content. Posts violating these
                            guidelines will be removed.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={postThread}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2F3C96] text-white rounded-lg text-sm font-semibold hover:bg-[#253075] transition-all"
                      >
                        <Send className="w-4 h-4" />
                        Post Discussion
                      </button>
                      <button
                        onClick={() => {
                          setNewThreadModal(false);
                          setNewThreadTitle("");
                          setNewThreadBody("");
                          setNewThreadSubcategory(null);
                          setNewThreadTags([]);
                          setNewThreadConditions([]);
                          setNewThreadConditionInput("");
                          setNewThreadOnlyResearchersCanReply(false);
                          setConditionSuggestions([]);
                          setNewThreadMeshInput("");
                          setNewThreadMeshSuggestions([]);
                          setModalSelectedCommunity(null);
                          setTagsFieldTouched(false);
                          setTagsSubmitAttempted(false);
                          setCommunityGuidelinesCollapsed(true);
                        }}
                        className="px-6 py-2.5 bg-[#F5F5F5] text-[#787878] rounded-lg text-sm font-medium hover:bg-[#E8E8E8] transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Propose a Community Modal */}
            {proposeCommunityModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[#E8E8E8]">
                  <div className="p-5 border-b border-[#E8E8E8]">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-[#2F3C96]">
                        Propose a Community
                      </h2>
                      <button
                        onClick={() => {
                          setProposeCommunityModal(false);
                          setProposeTitle("");
                          setProposeDescription("");
                          setProposeThumbnailUrl("");
                        }}
                        className="p-2 text-[#787878] hover:text-[#2F3C96] hover:bg-[#F5F5F5] rounded-lg transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <form
                    onSubmit={submitProposeCommunity}
                    className="p-5 space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-[#2F3C96] mb-2">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={proposeTitle}
                        onChange={(e) => setProposeTitle(e.target.value)}
                        placeholder="Community name"
                        className="w-full rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] text-[#484848] placeholder-[#787878]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#2F3C96] mb-2">
                        Description
                      </label>
                      <textarea
                        value={proposeDescription}
                        onChange={(e) => setProposeDescription(e.target.value)}
                        placeholder="What is this community about?"
                        className="w-full rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] resize-none text-[#484848] placeholder-[#787878]"
                        rows="4"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#2F3C96] mb-2">
                        Thumbnail (optional)
                      </label>
                      <div className="flex items-start gap-3">
                        <label className="shrink-0 flex flex-col items-center justify-center w-24 h-24 rounded-lg border-2 border-dashed border-[#E8E8E8] bg-[#F5F5F5] cursor-pointer hover:border-[#2F3C96]/40 hover:bg-[#2F3C96]/5 transition-all">
                          {proposeThumbnailUploading ? (
                            <Loader2 className="w-6 h-6 text-[#2F3C96] animate-spin" />
                          ) : proposeThumbnailUrl ? (
                            <img
                              src={proposeThumbnailUrl}
                              alt="Thumbnail"
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <>
                              <Plus className="w-6 h-6 text-[#787878]" />
                              <span className="text-xs text-[#787878] mt-1">
                                Upload
                              </span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleProposeThumbnailChange}
                            disabled={proposeThumbnailUploading}
                          />
                        </label>
                        <p className="text-xs text-[#787878]">
                          Add a cover image for your community.
                        </p>
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm text-amber-900">
                        <span className="font-semibold">Moderator review:</span>{" "}
                        Your proposal will be reviewed by moderators before it
                        goes live.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={proposeSubmitting}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2F3C96] text-white rounded-lg text-sm font-semibold hover:bg-[#253075] transition-all disabled:opacity-70"
                      >
                        {proposeSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Submit Proposal
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProposeCommunityModal(false);
                          setProposeTitle("");
                          setProposeDescription("");
                          setProposeThumbnailUrl("");
                        }}
                        className="px-6 py-2.5 bg-[#F5F5F5] text-[#787878] rounded-lg text-sm font-medium hover:bg-[#E8E8E8] transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Join Community Guidelines Modal */}
            {joinGuidelinesModalCommunity && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-[#E8E8E8]">
                  <div className="p-6 border-b border-[#E8E8E8]">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-[#2F3C96]">
                        Welcome to the community
                      </h2>
                      <button
                        onClick={() => setJoinGuidelinesModalCommunity(null)}
                        className="p-2 text-[#787878] hover:text-[#2F3C96] hover:bg-[#F5F5F5] rounded-lg transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-sm text-[#787878] mt-1">
                      {joinGuidelinesModalCommunity.name}
                    </p>
                  </div>
                  <div className="p-6 space-y-4">
                    <p className="text-sm text-[#484848]">
                      Make sure to follow these rules:
                    </p>
                    <div className="bg-[#F5F5F5] rounded-lg p-4 border border-[#E8E8E8] space-y-4 text-sm text-[#484848]">
                      <h3 className="font-semibold text-[#2F3C96]">
                        Community Guidelines
                      </h3>
                      <p>
                        collabiora is a space for respectful, educational
                        discussion about health research. By participating, you
                        agree to:
                      </p>
                      <div>
                        <h4 className="font-semibold text-[#2F3C96] mb-2">
                          Respect & Conduct
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-[#484848]">
                          <li>Treat all members with respect and kindness</li>
                          <li>
                            Do not use offensive, discriminatory, or harassing
                            language
                          </li>
                          <li>
                            Do not promote political agendas, conspiracy
                            theories, or misinformation
                          </li>
                          <li>
                            Stay focused on health research and educational
                            topics
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#2F3C96] mb-2">
                          Medical Disclaimer
                        </h4>
                        <p className="mb-2">
                          collabiora does not provide medical advice.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-[#484848]">
                          <li>
                            Do not ask for personal diagnoses or treatment
                            recommendations
                          </li>
                          <li>
                            Information shared is for educational purposes only
                          </li>
                          <li>
                            Always consult your healthcare provider for medical
                            decisions
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#2F3C96] mb-2">
                          Privacy
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-[#484848]">
                          <li>
                            Do not share personal identifying medical
                            information
                          </li>
                          <li>
                            Do not post another person&apos;s private data
                          </li>
                        </ul>
                        <p className="mt-2 text-[#484848] text-sm">
                          See our{" "}
                          <Link
                            to="/privacy"
                            className="text-[#2F3C96] font-medium hover:underline"
                          >
                            Privacy Policy
                          </Link>{" "}
                          and{" "}
                          <Link
                            to="/terms"
                            className="text-[#2F3C96] font-medium hover:underline"
                          >
                            Terms of Service
                          </Link>{" "}
                          for full details.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#2F3C96] mb-2">
                          Moderation Rights
                        </h4>
                        <p className="text-[#484848]">
                          collabiora reserves the right to remove posts or
                          restrict accounts that violate these guidelines.
                        </p>
                        <p className="mt-2 text-[#484848]">
                          Our goal is to maintain a safe, supportive, and
                          scientifically grounded community.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => {
                          if (!joinGuidelinesModalCommunity) return;
                          if (!user?._id && !user?.id) {
                            toast.error("Please sign in to join");
                            return;
                          }
                          const communityId = joinGuidelinesModalCommunity._id;
                          setJoinGuidelinesModalCommunity(null);
                          toggleFollow(communityId);
                        }}
                        disabled={followingLoading.has(
                          joinGuidelinesModalCommunity._id,
                        )}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2F3C96] text-white rounded-lg text-sm font-semibold hover:bg-[#253075] transition-all disabled:opacity-70"
                      >
                        {followingLoading.has(
                          joinGuidelinesModalCommunity._id,
                        ) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : null}
                        I agree & Join
                      </button>
                      <button
                        type="button"
                        onClick={() => setJoinGuidelinesModalCommunity(null)}
                        className="px-6 py-2.5 bg-[#F5F5F5] text-[#787878] rounded-lg text-sm font-medium hover:bg-[#E8E8E8] transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* "Want to follow them too?" popup after favoriting a thread */}
            {showFollowAfterFavorite && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-[#E8E8E8]">
                  <p className="text-[#484848] font-medium mb-4">
                    Want to follow{" "}
                    {showFollowAfterFavorite.username !== "them"
                      ? `@${showFollowAfterFavorite.username}`
                      : "them"}{" "}
                    too?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        if (showFollowAfterFavorite.authorUserId) {
                          openUserProfileModal(
                            showFollowAfterFavorite.authorUserId,
                          );
                        }
                        setShowFollowAfterFavorite(null);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2F3C96] text-white rounded-lg text-sm font-semibold hover:bg-[#253075] transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      Follow
                    </button>
                    <button
                      onClick={() => setShowFollowAfterFavorite(null)}
                      className="px-4 py-2.5 bg-[#F5F5F5] text-[#787878] rounded-lg text-sm font-medium hover:bg-[#E8E8E8] transition-colors"
                    >
                      Maybe later
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* User Profile Modal — first name, username, forums posted, communities joined, Follow */}
            {userProfileModalUserId && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-[#E8E8E8]">
                  <div className="p-6 border-b border-[#E8E8E8]">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-[#2F3C96]">
                        Profile
                      </h2>
                      <button
                        onClick={() => {
                          setUserProfileModalUserId(null);
                          setUserProfileModalData(null);
                        }}
                        className="p-2 text-[#787878] hover:text-[#2F3C96] hover:bg-[#F5F5F5] rounded-lg transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    {userProfileModalLoading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[#2F3C96]" />
                      </div>
                    ) : userProfileModalData?.user ? (
                      <>
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-full bg-[#2F3C96] flex items-center justify-center text-white font-semibold text-xl shrink-0 overflow-hidden">
                            {userProfileModalData.user.picture ? (
                              <img
                                src={userProfileModalData.user.picture}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (
                                userProfileModalData.user.displayName ||
                                userProfileModalData.user.username ||
                                "U"
                              )
                                .charAt(0)
                                .toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#484848]">
                              {userProfileModalData.user.displayName ||
                                userProfileModalData.user.username ||
                                "User"}
                            </p>
                            <p className="text-sm text-[#787878]">
                              @{userProfileModalData.user.username || "—"}
                            </p>
                            {userProfileModalData.user.role &&
                              !userProfileModalData.isForumHelper &&
                              !userProfileModalData.isSampleParticipant && (
                                <span
                                  className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                                    userProfileModalData.user.role ===
                                    "researcher"
                                      ? "bg-[#2F3C96]/10 text-[#2F3C96]"
                                      : "bg-[#F5F5F5] text-[#787878] border border-[#E8E8E8]"
                                  }`}
                                >
                                  {userProfileModalData.user.role ===
                                  "researcher"
                                    ? "Researcher"
                                    : "Patient"}
                                </span>
                              )}
                          </div>
                          {user &&
                            user._id?.toString() !== userProfileModalUserId &&
                            user.id?.toString() !== userProfileModalUserId &&
                            (userProfileModalData.isForumHelper ||
                            userProfileModalData.isSampleParticipant ? (
                              <button
                                type="button"
                                disabled
                                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shrink-0 bg-gray-100 text-gray-400 cursor-not-allowed"
                              >
                                <UserPlus className="w-4 h-4" />
                                Follow
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  handleFollowUserInModal(
                                    userProfileModalUserId,
                                    userProfileModalData.user.role,
                                  )
                                }
                                disabled={followUserLoading.has(
                                  userProfileModalUserId,
                                )}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors shrink-0 ${
                                  followingUserIds.has(userProfileModalUserId)
                                    ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    : "bg-[#2F3C96] text-white hover:bg-[#253075]"
                                } disabled:opacity-60`}
                              >
                                {followUserLoading.has(
                                  userProfileModalUserId,
                                ) ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : followingUserIds.has(
                                    userProfileModalUserId,
                                  ) ? (
                                  <>
                                    <UserCheck className="w-4 h-4" />
                                    Following
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="w-4 h-4" />
                                    Follow
                                  </>
                                )}
                              </button>
                            ))}
                        </div>

                        {userProfileModalData.isForumHelper && (
                          <p className="text-sm text-[#787878] bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg p-4">
                            This is the collabiora forum helper/tool account. It
                            posts helpful answers in the community. You cannot
                            follow this account.
                          </p>
                        )}
                        {userProfileModalData.isSampleParticipant && (
                          <p className="text-sm text-[#787878] bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg p-4">
                            This is a sample participant from our forum
                            examples. You cannot follow this account.
                          </p>
                        )}

                        {(userProfileModalData.forumsPosted?.length > 0 ||
                          userProfileModalData.communitiesJoined?.length > 0) &&
                          !userProfileModalData.isForumHelper &&
                          !userProfileModalData.isSampleParticipant && (
                            <div className="space-y-4 pt-2 border-t border-[#E8E8E8]">
                              {userProfileModalData.forumsPosted?.length >
                                0 && (
                                <div>
                                  <h3 className="text-sm font-semibold text-[#484848] mb-2 flex items-center gap-2">
                                    <MessageCircle className="w-4 h-4 text-[#2F3C96]" />
                                    Forums posted in
                                  </h3>
                                  <ul className="space-y-1.5 text-sm text-[#787878]">
                                    {userProfileModalData.forumsPosted
                                      .slice(0, 10)
                                      .map((item) => (
                                        <li
                                          key={item._id}
                                          className="flex items-center gap-2"
                                        >
                                          <ChevronRight className="w-3 h-3 text-[#2F3C96] shrink-0" />
                                          <span className="truncate">
                                            {item.title}
                                          </span>
                                          {item.community?.name && (
                                            <span className="text-xs text-[#787878] shrink-0">
                                              · {item.community.name}
                                            </span>
                                          )}
                                        </li>
                                      ))}
                                    {userProfileModalData.forumsPosted.length >
                                      10 && (
                                      <li className="text-xs text-[#787878]">
                                        +
                                        {userProfileModalData.forumsPosted
                                          .length - 10}{" "}
                                        more
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              )}
                              {userProfileModalData.communitiesJoined?.length >
                                0 && (
                                <div>
                                  <h3 className="text-sm font-semibold text-[#484848] mb-2 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-[#2F3C96]" />
                                    Communities joined
                                  </h3>
                                  <div className="flex flex-wrap gap-2">
                                    {userProfileModalData.communitiesJoined
                                      .slice(0, 12)
                                      .map((c) => (
                                        <span
                                          key={c._id}
                                          className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#2F3C96]/10 text-[#2F3C96]"
                                        >
                                          {c.name}
                                        </span>
                                      ))}
                                    {userProfileModalData.communitiesJoined
                                      .length > 12 && (
                                      <span className="px-2.5 py-1 text-xs text-[#787878]">
                                        +
                                        {userProfileModalData.communitiesJoined
                                          .length - 12}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        {!userProfileModalData.forumsPosted?.length &&
                          !userProfileModalData.communitiesJoined?.length && (
                            <p className="text-sm text-[#787878]">
                              No forums or communities yet.
                            </p>
                          )}
                      </>
                    ) : (
                      <p className="text-sm text-[#787878] text-center py-8">
                        Could not load profile.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Share to Discovery Modal */}
        {showShareToDiscoveryModal && newlyCreatedThread && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[#E8E8E8]">
                <div>
                  <h2 className="text-xl font-bold text-[#2F3C96]">
                    Share to Discovery
                  </h2>
                  <p className="text-sm text-[#787878] mt-1">
                    Increase visibility by sharing your forum question to your
                    discovery feed
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowShareToDiscoveryModal(false);
                    setNewlyCreatedThread(null);
                    setShareMessage("");
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-[#787878]" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Message Input */}
                <div>
                  <label className="block text-sm font-medium text-[#484848] mb-2">
                    Your message (optional)
                  </label>
                  <textarea
                    value={shareMessage}
                    onChange={(e) => setShareMessage(e.target.value)}
                    placeholder="Add a message to accompany your forum question..."
                    className="w-full min-h-[100px] p-3 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F3C96] focus:border-transparent resize-none text-sm"
                    maxLength={500}
                  />
                  <p className="text-xs text-[#787878] mt-1">
                    {shareMessage.length} / 500 characters
                  </p>
                </div>

                {/* Forum Question Preview */}
                <div
                  className="border border-[#E8E8E8] rounded-lg p-4 bg-[#F9F9F9] hover:border-[#2F3C96]/30 transition-colors cursor-pointer"
                  onClick={() => {
                    setShowShareToDiscoveryModal(false);
                    navigate(`/forums?threadId=${newlyCreatedThread._id}`, {
                      state: { openThreadId: newlyCreatedThread._id },
                    });
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#2F3C96]/15 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-5 h-5 text-[#2F3C96]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-[#2F3C96]">
                          {newlyCreatedThread.community?.name || "Forum"}
                        </span>
                        {newlyCreatedThread.subcategory && (
                          <>
                            <span className="text-[#C4C4C4]">·</span>
                            <span className="text-xs text-[#787878]">
                              {newlyCreatedThread.subcategory.name}
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="font-semibold text-[#484848] mb-2 line-clamp-2">
                        {newlyCreatedThread.title}
                      </h3>
                      <p className="text-sm text-[#787878] line-clamp-3 mb-2">
                        {newlyCreatedThread.body}
                      </p>
                      {newlyCreatedThread.tags &&
                        newlyCreatedThread.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {newlyCreatedThread.tags
                              .slice(0, 3)
                              .map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-[#2F3C96]/10 text-[#2F3C96] rounded text-xs font-medium"
                                >
                                  {tag}
                                </span>
                              ))}
                            {newlyCreatedThread.tags.length > 3 && (
                              <span className="px-2 py-0.5 text-[#787878] text-xs">
                                +{newlyCreatedThread.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      <p className="text-xs text-[#787878] mt-2 flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        Click to view in forums
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-[#E8E8E8] bg-gray-50">
                <button
                  onClick={() => {
                    setShowShareToDiscoveryModal(false);
                    setNewlyCreatedThread(null);
                    setShareMessage("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-[#787878] hover:text-[#484848] transition-colors"
                  disabled={sharingToDiscovery}
                >
                  Skip
                </button>
                <button
                  onClick={shareToDiscovery}
                  disabled={sharingToDiscovery}
                  className="px-6 py-2 bg-[#2F3C96] text-white rounded-full text-sm font-medium hover:bg-[#253075] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {sharingToDiscovery ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sharing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Share to Discovery
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </>
  );
}
