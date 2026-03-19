"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { requireEmailVerification } from "../utils/requireEmailVerification.js";
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  Image as ImageIcon,
  FileText,
  X,
  Loader2,
  User,
  CheckCircle2,
  Globe,
  Tag,
  Sparkles,
  Home,
  Bell,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Paperclip,
  Video,
  Upload,
  AlertCircle,
  UserPlus,
  UserCheck,
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";
import { getDisplayName } from "../utils/researcherDisplayName.js";
import CustomSelect from "../components/ui/CustomSelect.jsx";
import { AuroraText } from "../components/ui/aurora-text.js";
import HealthNewsSection from "../components/HealthNewsSection.jsx";
import DiscoveryBlogsSection from "../components/DiscoveryBlogsSection.jsx";
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
  };

  const IconComponent =
    iconMap[slug] ||
    iconMap[name?.toLowerCase().replace(/\s+/g, "-")] ||
    IconStethoscope;
  return IconComponent;
};

// Community Icon Component
const CommunityIcon = ({ community, size = "1.125rem" }) => {
  const IconComponent = getCommunityIcon(community?.slug, community?.name);
  const iconColor = community?.color || "#2F3C96";

  return (
    <IconComponent
      className="shrink-0"
      style={{
        color: iconColor,
        width: size,
        height: size,
      }}
      stroke={1.5}
    />
  );
};

const POST_MAX_WORDS = 500;

function countWords(text) {
  if (!text || !String(text).trim()) return 0;
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

function truncateToMaxWords(text, maxWords) {
  const trimmed = String(text).trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ");
}

// Renders text with URLs as clickable links (opens in new tab)
function linkify(text) {
  if (text == null || typeof text !== "string") return text;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#2F3C96] underline hover:text-brand-blue-600 break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}

function isResearcherAuthor(author, authorRole) {
  return (authorRole || author?.role) === "researcher";
}

function normalizeHandle(handle) {
  return String(handle || "").replace(/^@+/, "").trim();
}

function getUserId(userLike) {
  return (
    userLike?._id?.toString?.() ||
    userLike?.id?.toString?.() ||
    userLike?.toString?.() ||
    ""
  );
}

function applyCurrentUserHandleToAuthor(
  author,
  authorRole,
  currentUser,
  authorId = author?._id || author?.id || author,
) {
  if (!author) return author;

  const currentUserId = getUserId(currentUser);
  const currentUserHandle = normalizeHandle(currentUser?.handle);
  const resolvedAuthorId = getUserId(authorId);

  if (!currentUserId || !currentUserHandle || resolvedAuthorId !== currentUserId) {
    return author;
  }

  if (isResearcherAuthor(author, authorRole || currentUser?.role)) {
    return author;
  }

  return {
    ...author,
    handle: currentUserHandle,
    role: author?.role || authorRole || currentUser?.role || "patient",
  };
}

function hydratePostsWithCurrentUserHandle(posts, currentUser) {
  return (posts || []).map((post) => ({
    ...post,
    authorUserId: applyCurrentUserHandleToAuthor(
      post.authorUserId,
      post.authorRole,
      currentUser,
      post.authorUserId?._id || post.authorUserId,
    ),
  }));
}

function hydrateCommentsWithCurrentUserHandle(items, currentUser) {
  return (items || []).map((comment) => ({
    ...comment,
    authorUserId: applyCurrentUserHandleToAuthor(
      comment.authorUserId,
      comment.authorRole,
      currentUser,
      comment.authorUserId?._id || comment.authorUserId,
    ),
    children: hydrateCommentsWithCurrentUserHandle(comment.children, currentUser),
  }));
}

function getDiscoveryAuthorName(author, fallback = "Anonymous", authorRole) {
  if (!author) return fallback;
  if (isResearcherAuthor(author, authorRole)) {
    return getDisplayName(author, fallback);
  }
  const patientHandle = normalizeHandle(author.handle);
  if (patientHandle) return `@${patientHandle}`;
  return (author.username || author.name || fallback).trim() || fallback;
}

export default function Discovery() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState("news");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerContent, setComposerContent] = useState("");
  const [composerPostType, setComposerPostType] = useState(() => {
    // Set initial post type based on user role
    const userData = JSON.parse(localStorage.getItem("user") || "null");
    return userData?.role === "researcher" ? "researcher" : "patient";
  });
  const [composerCommunity, setComposerCommunity] = useState(null);
  const [composerSubcategory, setComposerSubcategory] = useState(null);
  const [composerAttachments, setComposerAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [communities, setCommunities] = useState([]);
  const [followingCommunities, setFollowingCommunities] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [isOfficial, setIsOfficial] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedComments, setExpandedComments] = useState(new Set()); // Track which posts have comments expanded
  const [comments, setComments] = useState({}); // Store comments by postId
  const [loadingComments, setLoadingComments] = useState({}); // Track loading state per post
  const [commentInputs, setCommentInputs] = useState({}); // Store comment input text by postId
  const [submittingComment, setSubmittingComment] = useState({}); // Track submitting state per post
  const [followingUserIds, setFollowingUserIds] = useState(new Set()); // User IDs the current user follows (for feed order and +Follow)
  const [followUserLoading, setFollowUserLoading] = useState(new Set()); // User IDs currently being followed/unfollowed

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const loadingPostsRef = useRef(false); // Prevent multiple simultaneous loads

  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "null");
    setUser(userData);
    // Set composer post type based on user role - ensure it always matches
    if (userData?.role) {
      const correctPostType =
        userData.role === "researcher" ? "researcher" : "patient";
      setComposerPostType(correctPostType);
    }
    loadCommunities();
    loadPosts();
  }, []);

  // Load list of user IDs the current user follows (for Discovery feed order and +Follow button)
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

  useEffect(() => {
    const userId = user?._id || user?.id;
    const userHandle = normalizeHandle(user?.handle);

    if (!userId || !userHandle || user?.role === "researcher") return;

    const syncKey = `discovery-handle-sync:${userId}:${userHandle}`;
    if (sessionStorage.getItem(syncKey) === "done") return;

    fetch(`${base}/api/auth/update-user/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: userHandle }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to sync user handle");
        }
        return response.json();
      })
      .then((data) => {
        const updatedUser = { ...user, ...data.user };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        sessionStorage.setItem(syncKey, "done");
        window.dispatchEvent(new Event("userUpdated"));
        loadPosts(true);
      })
      .catch((error) => {
        console.error("Error syncing patient handle for Discovery:", error);
      });
  }, [base, user]);

  // Listen for storage changes to update user profile picture
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "user") {
        const userData = JSON.parse(e.newValue || "null");
        setUser(userData);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Also listen for custom events (for same-tab updates)
    const handleUserUpdate = () => {
      const userData = JSON.parse(localStorage.getItem("user") || "null");
      setUser(userData);
    };

    window.addEventListener("userUpdated", handleUserUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("userUpdated", handleUserUpdate);
    };
  }, []);

  // Ensure composerPostType always matches user role
  useEffect(() => {
    if (user?.role) {
      const correctPostType =
        user.role === "researcher" ? "researcher" : "patient";
      if (composerPostType !== correctPostType) {
        setComposerPostType(correctPostType);
      }
    }
  }, [user?.role, composerPostType]);

  useEffect(() => {
    if (composerCommunity) {
      loadSubcategories(composerCommunity._id);
    } else {
      setSubcategories([]);
      setComposerSubcategory(null);
    }
  }, [composerCommunity]);

  // Restrict selected community to one the user is a member of
  useEffect(() => {
    if (!composerCommunity || followingCommunities.length === 0) return;
    const isMember = followingCommunities.some(
      (c) => c._id === composerCommunity._id,
    );
    if (!isMember) {
      setComposerCommunity(null);
      setComposerSubcategory(null);
    }
  }, [followingCommunities, composerCommunity]);

  async function loadCommunities() {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = userData?._id || userData?.id || "";
      const params = new URLSearchParams();
      if (userId) params.set("userId", userId);

      const response = await fetch(
        `${base}/api/communities?${params.toString()}`,
      );
      if (!response.ok) throw new Error("Failed to fetch communities");
      const data = await response.json();
      setCommunities(data.communities || []);

      // Load following communities if user is logged in
      if (userId) {
        loadFollowingCommunities(userId);
      }
    } catch (error) {
      console.error("Error loading communities:", error);
      toast.error("Failed to load communities");
    }
  }

  async function loadFollowingCommunities(userId) {
    try {
      const response = await fetch(
        `${base}/api/communities/user/${userId}/following`,
      );
      if (response.ok) {
        const data = await response.json();
        setFollowingCommunities(data.communities || []);
      }
    } catch (error) {
      console.error("Error loading following communities:", error);
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

  async function loadPosts(reset = false) {
    // Prevent multiple simultaneous calls
    if (loadingPostsRef.current) {
      return;
    }

    loadingPostsRef.current = true;

    if (reset) {
      setPage(1);
      setPosts([]);
    }

    const currentPage = reset ? 1 : page;
    setLoading(reset);
    setLoadingMore(!reset);

    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = userData?._id || userData?.id || "";
      const params = new URLSearchParams();
      // Do not filter by postType — show all posts (researcher + patient) in one feed
      params.set("page", currentPage.toString());
      params.set("pageSize", "20");
      if (userId) params.set("userId", userId);

      const response = await fetch(`${base}/api/posts?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch posts");
      const data = await response.json();

      const newPosts = hydratePostsWithCurrentUserHandle(
        data.posts || [],
        userData,
      );

      if (reset) {
        setPosts(newPosts);
      } else {
        // Deduplicate posts by _id to prevent duplicates
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p._id));
          const uniqueNewPosts = newPosts.filter(
            (p) => !existingIds.has(p._id),
          );
          return [...prev, ...uniqueNewPosts];
        });
      }

      setHasMore(data.hasMore || false);
      if (!reset) setPage((prev) => prev + 1);
    } catch (error) {
      console.error("Error loading posts:", error);
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingPostsRef.current = false;
    }
  }

  async function handleLike(postId, isLiked) {
    if (!user) {
      toast.error("Please sign in to like posts");
      navigate("/signin");
      return;
    }
    if (!requireEmailVerification()) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${base}/api/posts/${postId}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to toggle like");
      const data = await response.json();

      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? { ...post, isLiked: data.isLiked, likeCount: data.likeCount }
            : post,
        ),
      );
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to like post");
    }
  }

  async function handleDeletePost(postId) {
    if (!user) {
      toast.error("Please sign in to delete posts");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this post?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${base}/api/posts/${postId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete post");
      }

      toast.success("Post deleted successfully");
      // Remove post from list
      setPosts((prev) => prev.filter((post) => post._id !== postId));
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error(error.message || "Failed to delete post");
    }
  }

  async function handleFollowUser(authorId, authorRole) {
    if (!user) {
      toast.error("Please sign in to follow");
      navigate("/signin");
      return;
    }
    if (!requireEmailVerification()) return;
    const uid = authorId?.toString?.() || authorId;
    if (!uid || followUserLoading.has(uid)) return;
    const isFollowing = followingUserIds.has(uid);
    setFollowUserLoading((prev) => new Set(prev).add(uid));
    try {
      if (isFollowing) {
        const res = await fetch(`${base}/api/follow`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            followerId: user._id || user.id,
            followingId: uid,
          }),
        });
        if (!res.ok) throw new Error("Unfollow failed");
        setFollowingUserIds((prev) => {
          const next = new Set(prev);
          next.delete(uid);
          return next;
        });
        toast.success("Unfollowed");
      } else {
        const res = await fetch(`${base}/api/follow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            followerId: user._id || user.id,
            followingId: uid,
            followerRole: user.role,
            followingRole: authorRole || "patient",
            source: "Forums",
          }),
        });
        if (!res.ok) throw new Error("Follow failed");
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

  // Discovery feed: show posts from followed users first, then others (both sorted by createdAt desc)
  const sortedPosts = useMemo(() => {
    const list = [...(posts || [])];
    const currentUserId =
      user?._id?.toString?.() || user?.id?.toString?.() || "";
    list.sort((a, b) => {
      const aAuthorId =
        a.authorUserId?._id?.toString?.() || a.authorUserId?.toString?.() || "";
      const bAuthorId =
        b.authorUserId?._id?.toString?.() || b.authorUserId?.toString?.() || "";
      const aFollowed =
        currentUserId && followingUserIds.has(aAuthorId) ? 1 : 0;
      const bFollowed =
        currentUserId && followingUserIds.has(bAuthorId) ? 1 : 0;
      if (aFollowed !== bFollowed) return bFollowed - aFollowed; // followed first
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });
    return list;
  }, [posts, followingUserIds, user?._id, user?.id]);

  async function loadComments(postId) {
    if (loadingComments[postId]) return;

    setLoadingComments((prev) => ({ ...prev, [postId]: true }));
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = userData?._id || userData?.id || "";
      const params = new URLSearchParams();
      if (userId) params.set("userId", userId);

      const response = await fetch(
        `${base}/api/posts/${postId}/comments?${params.toString()}`,
      );
      if (!response.ok) throw new Error("Failed to fetch comments");
      const data = await response.json();

      setComments((prev) => ({
        ...prev,
        [postId]: hydrateCommentsWithCurrentUserHandle(
          data.comments || [],
          userData,
        ),
      }));

      // Update reply count in post
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? { ...post, replyCount: data.commentCount || 0 }
            : post,
        ),
      );
    } catch (error) {
      console.error("Error loading comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setLoadingComments((prev) => ({ ...prev, [postId]: false }));
    }
  }

  async function handleToggleComments(postId) {
    const isExpanded = expandedComments.has(postId);
    if (isExpanded) {
      // Collapse
      setExpandedComments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    } else {
      // Expand and load comments
      setExpandedComments((prev) => new Set(prev).add(postId));
      if (!comments[postId]) {
        await loadComments(postId);
      }
    }
  }

  async function handleSubmitComment(postId) {
    if (!user) {
      toast.error("Please sign in to comment");
      navigate("/signin");
      return;
    }
    if (!requireEmailVerification()) return;

    const content = commentInputs[postId]?.trim();
    if (!content) {
      toast.error("Please enter a comment");
      return;
    }

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${base}/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create comment");
      }

      const data = await response.json();

      // Add comment to state
      setComments((prev) => ({
        ...prev,
        [postId]: [
          ...(prev[postId] || []),
          ...hydrateCommentsWithCurrentUserHandle([data.comment], user),
        ],
      }));

      // Clear input
      setCommentInputs((prev) => {
        const newInputs = { ...prev };
        delete newInputs[postId];
        return newInputs;
      });

      // Update reply count
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? { ...post, replyCount: (post.replyCount || 0) + 1 }
            : post,
        ),
      );

      toast.success("Comment added!");
    } catch (error) {
      console.error("Error creating comment:", error);
      toast.error(error.message || "Failed to create comment");
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  }

  async function handleLikeComment(postId, commentId, isLiked) {
    if (!user) {
      toast.error("Please sign in to like comments");
      navigate("/signin");
      return;
    }
    if (!requireEmailVerification()) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${base}/api/posts/${postId}/comments/${commentId}/like`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) throw new Error("Failed to toggle like");
      const data = await response.json();

      // Update comment in state
      const updateCommentLikes = (commentList) => {
        return commentList.map((comment) => {
          if (comment._id === commentId) {
            return {
              ...comment,
              isLiked: data.isLiked,
              likeCount: data.likeCount,
            };
          }
          if (comment.children && comment.children.length > 0) {
            return {
              ...comment,
              children: updateCommentLikes(comment.children),
            };
          }
          return comment;
        });
      };

      setComments((prev) => ({
        ...prev,
        [postId]: updateCommentLikes(prev[postId] || []),
      }));
    } catch (error) {
      console.error("Error toggling comment like:", error);
      toast.error("Failed to like comment");
    }
  }

  async function uploadToBackend(files) {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const token = localStorage.getItem("token");

    // Check if user is logged in
    if (!token) {
      toast.error("Please sign in to upload files");
      navigate("/signin");
      throw new Error("Not authenticated");
    }

    // Check if user is a researcher
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (userData?.role !== "researcher") {
      toast.error("Only researchers can upload files");
      throw new Error("Unauthorized: Only researchers can upload files");
    }

    const response = await fetch(`${base}/api/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type - let browser set it with boundary for FormData
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();

      // Handle token expiration
      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        toast.error("Session expired. Please sign in again.");
        navigate("/signin");
        throw new Error("Token expired");
      }

      throw new Error(error.error || "Upload failed");
    }

    const data = await response.json();
    return data.files;
  }

  // Helper function to validate video duration
  function validateVideoDuration(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration; // Duration in seconds
        const maxDuration = 2 * 60; // 2 minutes in seconds

        if (duration > maxDuration) {
          reject(
            new Error(
              `Video duration (${Math.round(
                duration,
              )}s) exceeds 2 minutes limit`,
            ),
          );
        } else {
          resolve(true);
        }
      };

      video.onerror = () => {
        reject(new Error("Failed to load video metadata"));
      };

      video.src = URL.createObjectURL(file);
    });
  }

  async function handleFileUpload(event) {
    // Check if user is logged in
    if (!user) {
      toast.error("Please sign in to upload files");
      navigate("/signin");
      if (event.target) event.target.value = "";
      return;
    }

    // Check if user is a researcher
    if (user.role !== "researcher") {
      toast.error("Only researchers can upload files");
      if (event.target) event.target.value = "";
      return;
    }

    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Validate file types
    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isPDF = file.type === "application/pdf";
      return isImage || isPDF;
    });

    if (validFiles.length === 0) {
      toast.error("Please select only images or PDF files");
      if (event.target) event.target.value = "";
      return;
    }

    if (validFiles.length < files.length) {
      toast.error("Some files were skipped. Only images and PDFs are allowed.");
    }

    setUploading(true);
    try {
      const uploadedFiles = await uploadToBackend(validFiles);
      setComposerAttachments((prev) => [...prev, ...uploadedFiles]);
      toast.success(`${uploadedFiles.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error("Error uploading files:", error);
      // Don't show error toast if it's a redirect (token expired/not authenticated)
      if (
        error.message !== "Token expired" &&
        error.message !== "Not authenticated"
      ) {
        toast.error(error.message || "Failed to upload files");
      }
    } finally {
      setUploading(false);
      // Reset input
      if (event.target) event.target.value = "";
    }
  }

  async function handleVideoUpload(event) {
    // Check if user is logged in
    if (!user) {
      toast.error("Please sign in to upload videos");
      navigate("/signin");
      if (event.target) event.target.value = "";
      return;
    }

    // Check if user is a researcher
    if (user.role !== "researcher") {
      toast.error("Only researchers can upload videos");
      if (event.target) event.target.value = "";
      return;
    }

    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Validate video files
    const videoFiles = files.filter((file) => file.type.startsWith("video/"));

    if (videoFiles.length === 0) {
      toast.error("Please select video files");
      if (event.target) event.target.value = "";
      return;
    }

    // Validate file size (10 MB limit)
    const maxSize = 10 * 1024 * 1024; // 10 MB in bytes
    const sizeValidFiles = videoFiles.filter((file) => {
      if (file.size > maxSize) {
        toast.error(`Video "${file.name}" exceeds 10 MB size limit`);
        return false;
      }
      return true;
    });

    if (sizeValidFiles.length === 0) {
      if (event.target) event.target.value = "";
      return;
    }

    // Validate video duration (2 minutes limit)
    setUploading(true);
    try {
      const validFiles = [];

      for (const file of sizeValidFiles) {
        try {
          await validateVideoDuration(file);
          validFiles.push(file);
        } catch (error) {
          toast.error(`Video "${file.name}": ${error.message}`);
        }
      }

      if (validFiles.length === 0) {
        if (event.target) event.target.value = "";
        return;
      }

      const uploadedFiles = await uploadToBackend(validFiles);
      setComposerAttachments((prev) => [...prev, ...uploadedFiles]);
      toast.success(`${uploadedFiles.length} video(s) uploaded successfully`);
    } catch (error) {
      console.error("Error uploading videos:", error);
      // Don't show error toast if it's a redirect (token expired/not authenticated)
      if (
        error.message !== "Token expired" &&
        error.message !== "Not authenticated"
      ) {
        toast.error(error.message || "Failed to upload videos");
      }
    } finally {
      setUploading(false);
      // Reset input
      if (event.target) event.target.value = "";
    }
  }

  function removeAttachment(index) {
    setComposerAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreatePost() {
    if (!user) {
      toast.error("Please sign in to create a post");
      navigate("/signin");
      return;
    }
    if (!requireEmailVerification()) return;

    if (!composerContent.trim()) {
      toast.error("Please enter some content");
      return;
    }

    const wordCount = countWords(composerContent);
    if (wordCount > POST_MAX_WORDS) {
      toast.error(`Content is limited to ${POST_MAX_WORDS} words.`);
      return;
    }

    // Ensure postType matches user role - critical validation
    const finalPostType = user.role === "researcher" ? "researcher" : "patient";
    if (composerPostType !== finalPostType) {
      console.warn(
        `Post type mismatch: composerPostType=${composerPostType}, user.role=${user.role}. Correcting to ${finalPostType}`,
      );
      setComposerPostType(finalPostType);
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${base}/api/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: composerContent,
          postType: finalPostType, // Use validated postType, not composerPostType
          communityId: composerCommunity?._id || null,
          subcategoryId: composerSubcategory?._id || null,
          attachments: composerAttachments,
          isOfficial: isOfficial && user.role === "researcher",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create post");
      }

      const data = await response.json();
      toast.success("Post created successfully!");

      // Reset composer
      setComposerContent("");
      setComposerAttachments([]);
      setComposerCommunity(null);
      setComposerSubcategory(null);
      setIsOfficial(false);
      setComposerOpen(false);

      // Reload the feed so the new post appears
      loadPosts(true);
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error(error.message || "Failed to create post");
    }
  }

  function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 relative overflow-hidden">
        <AnimatedBackground />

        <div className="relative pt-24 px-4 md:px-8 mx-auto max-w-6xl pb-8">
          {/* Header */}
          <div className="text-center mb-6 animate-fade-in">
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-[#2F3C96] via-[#474F97] to-[#D0C4E2] bg-clip-text text-transparent mb-1">
              <AuroraText speed={2.5} colors={["#2F3C96"]}>
                Discovery
              </AuroraText>
            </h1>
            <p className="text-sm text-slate-600">
              Connect. Share your thoughts, experiences, and work.
            </p>
          </div>

          {/* Tabs for News / Community sections */}
          <div className="max-w-6xl mx-auto mb-6">
            <div className="flex items-center gap-0 border-b border-[#E8E8E8]">
              <button
                type="button"
                onClick={() => setViewMode("news")}
                className={`px-6 py-3 font-semibold text-sm transition-all relative ${
                  viewMode === "news"
                    ? "text-[#2F3C96] border-b-2 border-[#2F3C96]"
                    : "text-[#787878] hover:text-[#484848]"
                }`}
              >
                News & Articles
              </button>
              <button
                type="button"
                onClick={() => setViewMode("community")}
                className={`px-6 py-3 font-semibold text-sm transition-all relative ${
                  viewMode === "community"
                    ? "text-[#2F3C96] border-b-2 border-[#2F3C96]"
                    : "text-[#787878] hover:text-[#484848]"
                }`}
              >
                Community
              </button>
              <button
                type="button"
                onClick={() => setViewMode("blogs")}
                className={`px-6 py-3 font-semibold text-sm transition-all relative ${
                  viewMode === "blogs"
                    ? "text-[#2F3C96] border-b-2 border-[#2F3C96]"
                    : "text-[#787878] hover:text-[#484848]"
                }`}
              >
                Blogs
              </button>
            </div>
          </div>

          {/* ── News & Articles Section ──────────────────────────────── */}
          {viewMode === "news" && (
            <div className="mb-8">
              <HealthNewsSection user={user} />
            </div>
          )}

          {/* ── Blogs Section ─────────────────────────────────────────── */}
          {viewMode === "blogs" && <DiscoveryBlogsSection />}

          {/* ── Discovery Community Feed ──────────────────────────────── */}
          {viewMode === "community" && (
            <div>
              {/* Divider */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">
                  Community Feed
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Post composer bar - compact input + Post button */}
              {user && (
                <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
                  <div className="flex items-center gap-3 p-2.5">
                    <div className="relative w-8 h-8 shrink-0">
                      <div className="w-8 h-8 rounded-full bg-[#2F3C96] flex items-center justify-center text-white font-semibold text-xs">
                        {user?.username?.charAt(0)?.toUpperCase() ||
                          user?.name?.charAt(0)?.toUpperCase() ||
                          "U"}
                      </div>
                      {user?.picture && (
                        <img
                          src={user.picture}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover absolute inset-0"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <input
                        type="text"
                        value={composerContent}
                        onChange={(e) => {
                          const next = truncateToMaxWords(
                            e.target.value,
                            POST_MAX_WORDS,
                          );
                          setComposerContent(next);
                        }}
                        placeholder={
                          user?.role === "researcher"
                            ? "Share research or experiences..."
                            : "What's on your mind?"
                        }
                        className="flex-1 min-w-0 py-3 px-3 text-sm border-0 bg-gray-50 rounded-lg focus:ring-2 focus:ring-[#2F3C96]/20 focus:bg-white placeholder:text-gray-400 outline-none"
                        onFocus={() => setComposerOpen(true)}
                      />
                      <button
                        type="button"
                        onClick={handleCreatePost}
                        disabled={
                          !composerContent.trim() ||
                          countWords(composerContent) > POST_MAX_WORDS
                        }
                        className="shrink-0 px-4 py-2 text-sm font-semibold rounded-lg bg-[#2F3C96] text-white hover:bg-[#253075] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Post
                      </button>
                    </div>
                  </div>
                  {composerContent.length > 0 && (
                    <p className="text-right text-xs text-gray-400 px-3 pb-2 pt-0">
                      {countWords(composerContent)}/{POST_MAX_WORDS}
                    </p>
                  )}
                </div>
              )}

              {/* Discovery Feed */}
              {loading && posts.length === 0 ? (
                <div className="flex justify-center items-center py-12 bg-white rounded-xl border border-gray-200">
                  <Loader2 className="w-8 h-8 animate-spin text-[#2F3C96]" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <p className="text-gray-700 font-medium mb-1">
                    Posts from the community will appear here
                  </p>
                  <p className="text-sm text-gray-600">
                    Stories, research updates, and insights from patients and
                    researchers.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedPosts.map((post) => {
                    const authorId =
                      post.authorUserId?._id?.toString?.() ||
                      post.authorUserId?.toString?.() ||
                      "";
                    const isAuthorSelf =
                      user &&
                      (user._id === post.authorUserId?._id ||
                        user.id === post.authorUserId?._id ||
                        (user._id || user.id)?.toString?.() === authorId);
                    const isFollowingAuthor =
                      authorId && followingUserIds.has(authorId);
                    const followLoading =
                      authorId && followUserLoading.has(authorId);
                    return (
                      <div
                        key={post._id}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all"
                      >
                        {/* Post Header */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className="relative w-12 h-12 flex-shrink-0">
                            {/* Fallback avatar with first letter - always rendered */}
                            <div className="w-12 h-12 rounded-full bg-[#2F3C96] flex items-center justify-center text-white font-semibold text-lg absolute inset-0">
                              <span>
                                {post.authorUserId?.username
                                  ?.charAt(0)
                                  ?.toUpperCase() ||
                                  post.authorUserId?.name
                                    ?.charAt(0)
                                    ?.toUpperCase() ||
                                  "U"}
                              </span>
                            </div>
                            {/* Profile picture - overlays the fallback if available */}
                            {post.authorUserId?.picture && (
                              <img
                                src={post.authorUserId.picture}
                                alt={post.authorUserId.username}
                                className="w-12 h-12 rounded-full object-cover absolute inset-0"
                                onError={(e) => {
                                  // Hide image on error to show fallback
                                  e.target.style.display = "none";
                                }}
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex flex-col flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold text-[#2F3C96]">
                                    {getDiscoveryAuthorName(
                                      post.authorUserId,
                                      "Anonymous",
                                      post.authorRole,
                                    )}
                                  </h3>
                                  {post.isOfficial && (
                                    <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                                  )}
                                  <span className="text-sm text-gray-500">
                                    · {formatTimeAgo(post.createdAt)}
                                  </span>
                                </div>
                                {isResearcherAuthor(
                                  post.authorUserId,
                                  post.authorRole,
                                ) &&
                                  post.authorUserId?.username && (
                                  <span className="text-xs text-gray-500">
                                    @{post.authorUserId.username}
                                  </span>
                                )}
                              </div>
                              {/* Delete button for post owner; +Follow for others (LinkedIn-style) */}
                              <div className="flex items-center gap-2 shrink-0">
                                {!isAuthorSelf && user && authorId && (
                                  <button
                                    onClick={() =>
                                      handleFollowUser(
                                        authorId,
                                        post.authorRole,
                                      )
                                    }
                                    disabled={followLoading}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                      isFollowingAuthor
                                        ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        : "bg-[#2F3C96] text-white hover:bg-[#253075]"
                                    } disabled:opacity-60`}
                                  >
                                    {followLoading ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : isFollowingAuthor ? (
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
                                )}
                                {isAuthorSelf && (
                                  <button
                                    onClick={() => handleDeletePost(post._id)}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                                    title="Delete post"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                            {(post.communityId || post.subcategoryId) && (
                              <div className="flex items-center gap-2 text-sm text-brand-gray">
                                {post.communityId && (
                                  <div className="flex items-center gap-1">
                                    <CommunityIcon
                                      community={post.communityId}
                                      size="0.875rem"
                                    />
                                    <span>{post.communityId.name}</span>
                                  </div>
                                )}
                                {post.subcategoryId && (
                                  <>
                                    <span>·</span>
                                    <span>{post.subcategoryId.name}</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Post Content */}
                        <div className="mb-4">
                          <p className="text-gray-800 whitespace-pre-wrap">
                            {linkify(post.content)}
                          </p>
                        </div>

                        {/* Linked Forum Thread Preview */}
                        {post.linkedThreadId && (
                          <div
                            className="mb-4 border border-[#E8E8E8] rounded-lg p-4 bg-[#F9F9F9] hover:border-[#2F3C96]/30 transition-colors cursor-pointer"
                            onClick={() => {
                              navigate(
                                `/forums?threadId=${post.linkedThreadId._id}`,
                                {
                                  state: {
                                    openThreadId: post.linkedThreadId._id,
                                  },
                                },
                              );
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#2F3C96]/15 flex items-center justify-center shrink-0">
                                <MessageCircle className="w-5 h-5 text-[#2F3C96]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium text-[#2F3C96]">
                                    Forum Question
                                  </span>
                                </div>
                                <h3 className="font-semibold text-[#484848] mb-2 line-clamp-2">
                                  {post.linkedThreadId.title ||
                                    "Forum Question"}
                                </h3>
                                {post.linkedThreadId.body && (
                                  <p className="text-sm text-[#787878] line-clamp-3 mb-2">
                                    {linkify(post.linkedThreadId.body)}
                                  </p>
                                )}
                                <p className="text-xs text-[#787878] mt-2 flex items-center gap-1">
                                  <MessageCircle className="w-3 h-3" />
                                  Click to view in forums
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Attachments */}
                        {post.attachments && post.attachments.length > 0 && (
                          <div className="mb-4 space-y-3">
                            {post.attachments.map((att, idx) => (
                              <div key={idx} className="relative">
                                {att.type === "image" ? (
                                  <div className="relative group">
                                    <img
                                      src={att.url}
                                      alt={att.name || `Image ${idx + 1}`}
                                      className="w-full max-h-96 object-contain rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() =>
                                        window.open(att.url, "_blank")
                                      }
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-lg pointer-events-none" />
                                  </div>
                                ) : (
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-brand-royal-blue/50 transition-all group"
                                  >
                                    <div className="w-12 h-12 bg-brand-royal-blue/10 rounded-lg flex items-center justify-center group-hover:bg-brand-royal-blue/20 transition-colors">
                                      <FileText className="w-6 h-6 text-brand-royal-blue" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {att.name || "Document"}
                                      </p>
                                      {att.size && (
                                        <p className="text-xs text-gray-500">
                                          {(att.size / 1024).toFixed(1)} KB
                                        </p>
                                      )}
                                    </div>
                                    <span className="text-xs text-brand-royal-blue font-medium">
                                      View
                                    </span>
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Post Actions */}
                        <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
                          <button
                            onClick={() => handleLike(post._id, post.isLiked)}
                            className={`flex items-center gap-2 transition-colors ${
                              post.isLiked
                                ? "text-red-500"
                                : "text-gray-500 hover:text-red-500"
                            }`}
                          >
                            <Heart
                              className={`w-5 h-5 ${
                                post.isLiked ? "fill-current" : ""
                              }`}
                            />
                            <span className="text-sm">
                              {post.likeCount || 0}
                            </span>
                          </button>
                          <button
                            onClick={() => handleToggleComments(post._id)}
                            className={`flex items-center gap-2 transition-colors ${
                              expandedComments.has(post._id)
                                ? "text-[#2F3C96]"
                                : "text-gray-500 hover:text-[#2F3C96]"
                            }`}
                          >
                            <MessageCircle
                              className={`w-5 h-5 ${
                                expandedComments.has(post._id)
                                  ? "fill-current"
                                  : ""
                              }`}
                            />
                            <span className="text-sm">
                              {post.replyCount || 0}
                            </span>
                          </button>
                        </div>

                        {/* Comments Section */}
                        {expandedComments.has(post._id) && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            {/* Comment Input */}
                            {user && (
                              <div className="mb-4">
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-full bg-[#2F3C96] flex items-center justify-center text-white font-semibold text-xs shrink-0">
                                    {user?.username?.charAt(0)?.toUpperCase() ||
                                      "U"}
                                  </div>
                                  <div className="flex-1">
                                    <textarea
                                      value={commentInputs[post._id] || ""}
                                      onChange={(e) =>
                                        setCommentInputs((prev) => ({
                                          ...prev,
                                          [post._id]: e.target.value,
                                        }))
                                      }
                                      placeholder="Write a comment..."
                                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F3C96] focus:border-transparent resize-none text-sm"
                                      rows={2}
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === "Enter" &&
                                          (e.metaKey || e.ctrlKey)
                                        ) {
                                          handleSubmitComment(post._id);
                                        }
                                      }}
                                    />
                                    <div className="flex justify-end mt-2">
                                      <button
                                        onClick={() =>
                                          handleSubmitComment(post._id)
                                        }
                                        disabled={
                                          !commentInputs[post._id]?.trim() ||
                                          submittingComment[post._id]
                                        }
                                        className="px-4 py-1.5 bg-[#2F3C96] text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 disabled:opacity-50 transition-colors"
                                      >
                                        {submittingComment[post._id]
                                          ? "Posting..."
                                          : "Post"}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Comments List */}
                            {loadingComments[post._id] ? (
                              <div className="flex justify-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin text-[#2F3C96]" />
                              </div>
                            ) : comments[post._id] &&
                              comments[post._id].length > 0 ? (
                              <div className="space-y-4">
                                {comments[post._id].map((comment) => (
                                  <div
                                    key={comment._id}
                                    className="flex items-start gap-3"
                                  >
                                    <div className="w-8 h-8 rounded-full bg-[#2F3C96] flex items-center justify-center text-white font-semibold text-xs shrink-0">
                                      {comment.authorUserId?.username
                                        ?.charAt(0)
                                        ?.toUpperCase() || "U"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-semibold text-[#2F3C96]">
                                          {getDiscoveryAuthorName(
                                            comment.authorUserId,
                                            "Anonymous",
                                            comment.authorRole,
                                          )}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {formatTimeAgo(comment.createdAt)}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-700 mb-2">
                                        {linkify(comment.content)}
                                      </p>
                                      <button
                                        onClick={() =>
                                          handleLikeComment(
                                            post._id,
                                            comment._id,
                                            comment.isLiked,
                                          )
                                        }
                                        className={`flex items-center gap-1 text-xs transition-colors ${
                                          comment.isLiked
                                            ? "text-red-500"
                                            : "text-gray-500 hover:text-red-500"
                                        }`}
                                      >
                                        <Heart
                                          className={`w-3.5 h-3.5 ${
                                            comment.isLiked
                                              ? "fill-current"
                                              : ""
                                          }`}
                                        />
                                        <span>{comment.likeCount || 0}</span>
                                      </button>
                                      {/* Render nested comments */}
                                      {comment.children &&
                                        comment.children.length > 0 && (
                                          <div className="mt-3 ml-4 pl-4 border-l-2 border-gray-200 space-y-3">
                                            {comment.children.map(
                                              (childComment) => (
                                                <div
                                                  key={childComment._id}
                                                  className="flex items-start gap-2"
                                                >
                                                  <div className="w-6 h-6 rounded-full bg-[#2F3C96] flex items-center justify-center text-white font-semibold text-[10px] shrink-0">
                                                    {childComment.authorUserId?.username
                                                      ?.charAt(0)
                                                      ?.toUpperCase() || "U"}
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                      <span className="text-xs font-semibold text-[#2F3C96]">
                                                        {getDiscoveryAuthorName(
                                                          childComment.authorUserId,
                                                          "Anonymous",
                                                          childComment.authorRole,
                                                        )}
                                                      </span>
                                                      <span className="text-[10px] text-gray-500">
                                                        {formatTimeAgo(
                                                          childComment.createdAt,
                                                        )}
                                                      </span>
                                                    </div>
                                                    <p className="text-xs text-gray-700 mb-1">
                                                      {linkify(
                                                        childComment.content,
                                                      )}
                                                    </p>
                                                    <button
                                                      onClick={() =>
                                                        handleLikeComment(
                                                          post._id,
                                                          childComment._id,
                                                          childComment.isLiked,
                                                        )
                                                      }
                                                      className={`flex items-center gap-1 text-[10px] transition-colors ${
                                                        childComment.isLiked
                                                          ? "text-red-500"
                                                          : "text-gray-500 hover:text-red-500"
                                                      }`}
                                                    >
                                                      <Heart
                                                        className={`w-3 h-3 ${
                                                          childComment.isLiked
                                                            ? "fill-current"
                                                            : ""
                                                        }`}
                                                      />
                                                      <span>
                                                        {childComment.likeCount ||
                                                          0}
                                                      </span>
                                                    </button>
                                                  </div>
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 text-center py-4">
                                No comments yet. Be the first to comment!
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Load More */}
                  {hasMore && (
                    <button
                      onClick={() => loadPosts()}
                      disabled={loadingMore}
                      className="w-full py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#2F3C96]" />
                      ) : (
                        "Load More"
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Composer Modal */}
        {composerOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-brand-royal-blue">
                  Create Post
                </h2>
                <button
                  onClick={() => setComposerOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <textarea
                    value={composerContent}
                    onChange={(e) => {
                      const next = truncateToMaxWords(
                        e.target.value,
                        POST_MAX_WORDS,
                      );
                      setComposerContent(next);
                    }}
                    placeholder="What's on your mind?"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-royal-blue focus:border-transparent resize-none"
                    rows={6}
                  />
                  <p className="text-right text-xs text-gray-500 mt-1">
                    {countWords(composerContent)}/{POST_MAX_WORDS}
                  </p>
                </div>

                {/* Disclaimer for Patients */}
                {user?.role === "patient" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-900">
                      <span className="font-semibold">⚠️ Reminder:</span> Do not
                      share personal or identifiable health information. Consult
                      healthcare professionals for medical concerns.
                    </p>
                  </div>
                )}

                {/* Attachments */}
                {composerAttachments.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Attachments
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {composerAttachments.map((att, idx) => (
                        <div key={idx} className="relative group">
                          {att.type === "image" ? (
                            <img
                              src={att.url}
                              alt={att.name || `Attachment ${idx + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="p-3 bg-gray-100 rounded-lg flex items-center gap-2">
                              <FileText className="w-5 h-5 text-brand-royal-blue" />
                              <span className="text-sm truncate">
                                {att.name || "File"}
                              </span>
                            </div>
                          )}
                          <button
                            onClick={() => removeAttachment(idx)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Buttons - Only for Researchers */}
                {user?.role === "researcher" && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 font-medium">
                      Add files:
                    </span>
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploading}
                      className="p-2 text-gray-500 hover:text-[#2F3C96] hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Add Image"
                    >
                      {uploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <ImageIcon className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => videoInputRef.current?.click()}
                      disabled={uploading}
                      className="p-2 text-gray-500 hover:text-[#2F3C96] hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Add Video"
                    >
                      {uploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Video className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="p-2 text-gray-500 hover:text-[#2F3C96] hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Attach File"
                    >
                      {uploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Paperclip className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                )}

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleVideoUpload}
                  className="hidden"
                />

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setComposerOpen(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePost}
                    disabled={
                      !composerContent.trim() ||
                      uploading ||
                      countWords(composerContent) > POST_MAX_WORDS
                    }
                    className="px-6 py-2 bg-brand-royal-blue text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
