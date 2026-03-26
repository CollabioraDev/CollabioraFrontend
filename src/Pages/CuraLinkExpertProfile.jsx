import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  Link as LinkIcon,
  Award,
  Briefcase,
  Calendar,
  BookOpen,
  Loader2,
  ArrowLeft,
  Star,
  FileText,
  Beaker,
  TrendingUp,
  Users,
  MessageCircle,
  UserPlus,
  Check,
  Send,
  Sparkles,
  Globe,
  Database,
  Activity,
  Clock,
  MessageSquare,
  Eye,
  ArrowUp,
  ArrowDown,
  ListChecks,
  AlertCircle,
  Copy,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import Modal from "../components/ui/Modal.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";

export default function CollabioraExpertProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const getInitialMeetingRequestModal = () => ({
    open: false,
    topic: "",
    shortDescription: "",
    message: "",
    preferredDate: "",
    preferredTime: "",
    preferredSlotStartUtc: "",
    preferredSlotEndUtc: "",
    calendarMonth: new Date().toISOString().slice(0, 7),
  });

  // Get URL search params for name, location, and bio
  const searchParams = new URLSearchParams(window.location.search);
  const urlName = searchParams.get("name");
  const urlLocation = searchParams.get("location");
  const urlBio = searchParams.get("bio");

  // Helper function to strip HTML tags from text
  const stripHtmlTags = (html) => {
    if (!html) return "";
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [favoritingItems, setFavoritingItems] = useState(new Set()); // Track items being favorited/unfavorited
  const [followingStatus, setFollowingStatus] = useState(false);
  // Meeting request status for patients
  const [meetingRequestStatus, setMeetingRequestStatus] = useState({
    hasRequest: false,
    status: null,
  });
  // Connection request status for researchers
  const [connectionRequestStatus, setConnectionRequestStatus] = useState({
    hasRequest: false,
    isConnected: false,
    status: null,
    isRequester: false,
  });
  const [summaryModal, setSummaryModal] = useState({
    open: false,
    title: "",
    type: "",
    summary: "",
    loading: false,
  });
  const [publicationDetailsModal, setPublicationDetailsModal] = useState({
    open: false,
    publication: null,
  });
  const [trialDetailsModal, setTrialDetailsModal] = useState({
    open: false,
    trial: null,
  });
  const [meetingRequestModal, setMeetingRequestModal] = useState(
    getInitialMeetingRequestModal,
  );
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [connectionRequestModal, setConnectionRequestModal] = useState({
    open: false,
    message: "",
  });
  const [messageModal, setMessageModal] = useState({
    open: false,
    body: "",
  });
  const [questionsAfterBookingModal, setQuestionsAfterBookingModal] = useState({
    open: false,
    requestId: null,
    researcherName: "",
    questions: "",
    submitting: false,
  });
  const [showAllInterests, setShowAllInterests] = useState(false);
  const [interestsModalOpen, setInterestsModalOpen] = useState(false);
  const [mobileMoreInfoOpen, setMobileMoreInfoOpen] = useState(false);
  const [publicationsToShow, setPublicationsToShow] = useState(5);
  const [claimedTrialsToShow, setClaimedTrialsToShow] = useState(5);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(userData);

    if (!userId) {
      toast.error("Expert ID not provided");
      navigate("/dashboard/patient");
      return;
    }

    // Fetch profile, favorites, follow status, and message request status
    const fetchData = async () => {
      setLoading(true);
      try {
        const currentUserId = userData?._id || userData?.id;

        // Build query params including name, location, and bio from URL
        const params = new URLSearchParams();
        if (currentUserId) params.set("currentUserId", currentUserId);
        if (urlName) params.set("name", urlName);
        if (urlLocation) params.set("location", urlLocation);
        if (urlBio) params.set("bio", urlBio);

        const response = await fetch(
          `${base}/api/collabiora-expert/profile/${userId}?${params.toString()}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await response.json();
        setProfile(data.profile);

        // Fetch follow status
        if (currentUserId && data.profile.userId !== currentUserId) {
          try {
            const followResponse = await fetch(
              `${base}/api/insights/${currentUserId}/following/${userId}`,
            );
            if (followResponse.ok) {
              const followData = await followResponse.json();
              setFollowingStatus(followData.isFollowing || false);
            }
          } catch (error) {
            console.error("Error fetching follow status:", error);
          }

          // Fetch meeting request status (only for patients)
          if (userData.role === "patient") {
            try {
              const requestStatusResponse = await fetch(
                `${base}/api/meeting-requests/${currentUserId}/${userId}/status`,
              );
              if (requestStatusResponse.ok) {
                const requestData = await requestStatusResponse.json();
                setMeetingRequestStatus({
                  hasRequest: requestData.hasRequest || false,
                  status: requestData.status || null,
                });
              }
            } catch (error) {
              console.error("Error fetching meeting request status:", error);
            }
          }

          // Fetch connection request status (only for researchers viewing other researchers)
          if (userData.role === "researcher") {
            try {
              const connectionStatusResponse = await fetch(
                `${base}/api/connection-requests/${currentUserId}/${userId}/status`,
              );
              if (connectionStatusResponse.ok) {
                const connectionData = await connectionStatusResponse.json();
                setConnectionRequestStatus({
                  hasRequest: connectionData.hasRequest || false,
                  isConnected: connectionData.isConnected || false,
                  status: connectionData.status || null,
                  isRequester: connectionData.isRequester || false,
                });
              }
            } catch (error) {
              console.error("Error fetching connection request status:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load expert profile");
      } finally {
        setLoading(false);
      }

      // Fetch favorites
      if (userData?._id || userData?.id) {
        try {
          const favResponse = await fetch(
            `${base}/api/favorites/${userData._id || userData.id}`,
          );
          if (favResponse.ok) {
            const favData = await favResponse.json();
            setFavorites(favData.items || []);
          }
        } catch (error) {
          console.error("Error fetching favorites:", error);
        }
      }
    };

    fetchData();
  }, [userId, navigate, base]);

  // Helper function to get unique key for favorite tracking
  const getFavoriteKey = (item, type) => {
    if (type === "expert" || type === "collaborator") {
      return `expert-${item.name || item.id || item._id}`;
    } else if (type === "publication") {
      return `publication-${item.pmid || item.id || item._id}`;
    } else if (type === "trial") {
      return `trial-${item.id || item._id}`;
    }
    return `${type}-${item.id || item._id}`;
  };

  async function toggleFavorite(type, itemId, item) {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to favorite items");
      return;
    }

    let checkId = itemId;
    if (type === "expert" || type === "collaborator") {
      checkId =
        item.name || item.orcid || item.id || item._id || item.userId || itemId;
    } else if (type === "publication") {
      checkId = item.pmid || item.id || item._id || itemId;
    } else if (type === "trial") {
      checkId = item.id || item._id || itemId;
    }

    const favoriteKey = getFavoriteKey(item, type);

    // Prevent duplicate clicks
    if (favoritingItems.has(favoriteKey)) {
      return;
    }

    const isFavorited = favorites.some((fav) => {
      if (fav.type !== type) return false;

      if (type === "expert" || type === "collaborator") {
        if (item.name && fav.item?.name) {
          return fav.item.name === item.name;
        }
        return (
          fav.item?.id === checkId ||
          fav.item?._id === checkId ||
          fav.item?.orcid === checkId
        );
      }

      if (type === "publication") {
        return (
          fav.item?.id === checkId ||
          fav.item?._id === checkId ||
          fav.item?.pmid === checkId ||
          (item.title && fav.item?.title === item.title)
        );
      }

      if (type === "trial") {
        return (
          fav.item?.id === checkId ||
          fav.item?._id === checkId ||
          (item.title && fav.item?.title === item.title)
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
        if (fav.type !== type) return true;

        if (type === "expert" || type === "collaborator") {
          if (item.name && fav.item?.name) {
            return fav.item.name !== item.name;
          }
          return !(
            fav.item?.id === checkId ||
            fav.item?._id === checkId ||
            fav.item?.orcid === checkId
          );
        }

        if (type === "publication") {
          return !(
            fav.item?.id === checkId ||
            fav.item?._id === checkId ||
            fav.item?.pmid === checkId ||
            (item.title && fav.item?.title === item.title)
          );
        }

        if (type === "trial") {
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

      if ((type === "expert" || type === "collaborator") && item.orcid) {
        itemToStore.orcid = item.orcid;
      }
      if (type === "publication" && item.pmid) {
        itemToStore.pmid = item.pmid;
      }

      optimisticFavorites = [
        ...favorites,
        {
          type,
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
        toast.success("Removed from favorites");
      } else {
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

        await fetch(`${base}/api/favorites/${user._id || user.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            item: itemToStore,
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

  async function toggleFollow() {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to follow experts");
      return;
    }

    try {
      if (followingStatus) {
        await fetch(`${base}/api/follow`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            followerId: user._id || user.id,
            followingId: userId,
          }),
        });
        toast.success("Unfollowed successfully");
        setFollowingStatus(false);
      } else {
        await fetch(`${base}/api/follow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            followerId: user._id || user.id,
            followingId: userId,
            followerRole: user.role,
            followingRole: "researcher",
          }),
        });
        toast.success("Following successfully!");
        setFollowingStatus(true);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast.error("Failed to update follow status");
    }
  }

  async function sendMeetingRequest() {
    if (!meetingRequestModal.topic.trim()) {
      toast.error("Please enter a topic / reason for the meeting");
      return;
    }

    if (!meetingRequestModal.shortDescription.trim()) {
      toast.error("Please add a short description");
      return;
    }

    if (!meetingRequestModal.message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (
      !meetingRequestModal.preferredDate ||
      !meetingRequestModal.preferredTime ||
      !meetingRequestModal.preferredSlotStartUtc ||
      !meetingRequestModal.preferredSlotEndUtc
    ) {
      toast.error("Please select a date and time");
      return;
    }

    if (!user?._id && !user?.id) {
      toast.error("Please sign in to send meeting requests");
      return;
    }

    if (user.role !== "patient") {
      toast.error("Only patients can send meeting requests to experts");
      return;
    }

    try {
      const response = await fetch(`${base}/api/meeting-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          patientId: user._id || user.id,
          expertId: userId,
          topic: meetingRequestModal.topic,
          shortDescription: meetingRequestModal.shortDescription,
          message: meetingRequestModal.message,
          preferredDate: meetingRequestModal.preferredDate || null,
          preferredTime: meetingRequestModal.preferredTime || null,
          preferredSlotStartUtc:
            meetingRequestModal.preferredSlotStartUtc || null,
          preferredSlotEndUtc:
            meetingRequestModal.preferredSlotEndUtc || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send meeting request");
      }

      toast.success("Meeting request sent successfully!");
      setMeetingRequestModal(getInitialMeetingRequestModal());
      setMeetingRequestStatus({
        hasRequest: true,
        status: "pending",
      });
      // Open "Have questions for {researcher}?" popup; questions will be sent with request
      if (data.meetingRequest?._id && profile?.name) {
        setQuestionsAfterBookingModal({
          open: true,
          requestId: data.meetingRequest._id,
          researcherName: profile.name,
          questions: "",
          submitting: false,
        });
      }
    } catch (error) {
      console.error("Error sending meeting request:", error);
      toast.error(error.message || "Failed to send meeting request");
    }
  }

  function toDateOnlyString(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // Fetch real available slots when a date is selected
  useEffect(() => {
    if (!meetingRequestModal.preferredDate) {
      setAvailableSlots([]);
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      try {
        setLoadingSlots(true);
        const res = await fetch(
          `${base}/api/experts/${userId}/slots?date=${meetingRequestModal.preferredDate}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          console.error("Failed to fetch slots", res.status);
          setAvailableSlots([]);
          return;
        }
        const data = await res.json();
        const slots = (data.slots || []).map((s) => {
          const start = new Date(s.startUtc);
          const end = new Date(s.endUtc);
          const hh = String(start.getHours()).padStart(2, "0");
          const mm = String(start.getMinutes()).padStart(2, "0");
          return {
            startUtc: start.toISOString(),
            endUtc: end.toISOString(),
            label: start.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }),
            time24: `${hh}:${mm}`,
          };
        });
        setAvailableSlots(slots);
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error("Error loading slots", e);
          setAvailableSlots([]);
        }
      } finally {
        setLoadingSlots(false);
      }
    };
    load();
    return () => controller.abort();
  }, [meetingRequestModal.preferredDate, base, userId]);

  async function submitQuestionsAfterBooking() {
    const { requestId, questions } = questionsAfterBookingModal;
    if (!requestId) return;
    setQuestionsAfterBookingModal((prev) => ({ ...prev, submitting: true }));
    try {
      const response = await fetch(`${base}/api/meeting-requests/${requestId}/questions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ patientQuestions: questions.trim() || null }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to send questions");
      }
      if (questions.trim()) {
        toast.success("Your questions have been sent to the researcher.");
      }
      setQuestionsAfterBookingModal({
        open: false,
        requestId: null,
        researcherName: "",
        questions: "",
        submitting: false,
      });
    } catch (error) {
      console.error("Error submitting questions:", error);
      toast.error(error.message || "Failed to send questions");
      setQuestionsAfterBookingModal((prev) => ({ ...prev, submitting: false }));
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

    try {
      const response = await fetch(`${base}/api/connection-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterId: user._id || user.id,
          receiverId: userId,
          message: connectionRequestModal.message || "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send connection request");
      }

      toast.success("Connection request sent successfully!");
      setConnectionRequestModal({ open: false, message: "" });
      setConnectionRequestStatus({
        hasRequest: true,
        isConnected: false,
        status: "pending",
        isRequester: true,
      });
    } catch (error) {
      console.error("Error sending connection request:", error);
      toast.error(error.message || "Failed to send connection request");
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

    // Only researchers can send messages to connected researchers
    if (user.role !== "researcher" || !connectionRequestStatus.isConnected) {
      toast.error(
        "You must be connected with this researcher to send messages",
      );
      return;
    }

    try {
      const response = await fetch(`${base}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user._id || user.id,
          receiverId: userId,
          senderRole: user.role,
          receiverRole: "researcher",
          body: messageModal.body,
        }),
      });

      if (response.ok) {
        toast.success("Message sent successfully!");
        setMessageModal({ open: false, body: "" });
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  }

  async function generateSummary(item, type) {
    // Determine if user is patient or researcher for simplification
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const isPatient = userData?.role === "patient";
    const isResearcher = userData?.role === "researcher";
    // Default to simplified (patient-friendly) if not a researcher
    const shouldSimplify = isPatient || (!isPatient && !isResearcher);

    let text = "";
    let title = "";
    if (type === "trial") {
      title = stripHtmlTags(item.title) || "Clinical Trial";
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
      title = stripHtmlTags(item.title) || "Publication";
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
    });

    try {
      const res = await fetch(`${base}/api/ai/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          type: type === "trial" ? "trial" : "publication",
          simplify: shouldSimplify,
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

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-[rgba(232,233,242,1)] via-white to-[rgba(209,211,229,1)] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-[#2F3C96] animate-spin mx-auto mb-4" />
            <p className="text-[#2F3C96] font-medium">
              Loading expert profile...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-[rgba(232,233,242,1)] via-white to-[rgba(209,211,229,1)] flex items-center justify-center">
          <div className="text-center">
            <p className="text-[#787878] mb-4">Expert profile not found</p>
            <button
              onClick={() => {
                const user = JSON.parse(localStorage.getItem("user") || "{}");
                const role = user?.role || "patient";
                navigate(`/dashboard/${role}`);
              }}
              className="px-4 py-2 bg-[#2F3C96] text-white rounded-lg hover:bg-[#253075] transition-colors z-50"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const isExpertFavorited = favorites.some((fav) => {
    if (fav.type !== "expert" && fav.type !== "collaborator") return false;
    if (profile.name && fav.item?.name) {
      return fav.item.name === profile.name;
    }
    const expertId =
      profile.name || profile.id || profile._id || profile.userId;
    return fav.item?.id === expertId || fav.item?._id === expertId;
  });

  const locationText = profile.location
    ? typeof profile.location === "string"
      ? profile.location
      : `${profile.location?.city || ""}${
          profile.location?.city && profile.location?.country ? ", " : ""
        }${profile.location?.country || ""}`.trim()
    : null;

  // Affiliation line for header: "Institution · Country" (e.g. Seoul National University Bundang Hospital · KR)
  const countryCode =
    profile.location && typeof profile.location === "object"
      ? profile.location?.country || ""
      : "";
  const affiliationLine = [profile.affiliation, countryCode]
    .filter(Boolean)
    .join(" · ");

  const copyOrcidToClipboard = () => {
    if (!profile.orcid) return;
    navigator.clipboard.writeText(profile.orcid);
    toast.success("ORCID copied to clipboard");
  };

  const isCurrentUser = (user?._id || user?.id) === profile.userId;
  const requiresPaidMeeting =
    profile.meetingRate != null && Number(profile.meetingRate) > 0;
  const isStripeReadyForMeetings =
    !requiresPaidMeeting || profile.stripeConnectStatus === "verified";
  const researcherCanAcceptMeetings =
    profile.interestedInMeetings === true && isStripeReadyForMeetings;
  const canSendMeetingRequest =
    user?.role === "patient" &&
    !isCurrentUser &&
    user?.emailVerified === true &&
    researcherCanAcceptMeetings;
  const canSendConnectionRequest =
    user?.role === "researcher" && !isCurrentUser;
  const canSendMessage =
    user?.role === "researcher" &&
    !isCurrentUser &&
    connectionRequestStatus.isConnected;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-[rgba(232,233,242,1)] via-white to-[rgba(209,211,229,1)]  overflow-hidden relative  ">
        <AnimatedBackground />
        <div className="px-4 sm:px-6 md:px-8 lg:px-12 mx-auto max-w-7xl pt-17 pb-12 mt-5 relative  ">
          {/* Back Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const user = JSON.parse(localStorage.getItem("user") || "{}");
              const role = user?.role || "patient";
              navigate(`/dashboard/${role}`);
            }}
            className="mb-6 flex items-center gap-2 text-[#2F3C96] hover:text-[#253075] font-medium transition-colors relative z-50 cursor-pointer"
            type="button"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          {/* Header Section — 3-row layout: Identity, Status, Actions */}
          <div className="bg-gradient-to-br from-[#3d4ba8] via-[#2f3c96] to-[#26347a] rounded-xl shadow-lg border border-[#2F3C96]/30 relative overflow-hidden p-5 sm:p-6 mb-6">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/[0.04] rounded-full -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/[0.04] rounded-full -ml-16 -mb-16" />

            <div className="relative z-10 space-y-4">
              {/* Row 1 — Identity: bigger name, calmer, no buttons, avatar inline */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white font-bold text-xl sm:text-2xl shrink-0">
                  {profile.name?.charAt(0)?.toUpperCase() || "E"}
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
                    {profile.name}
                  </h1>
                  {affiliationLine && (
                    <p className="text-white/85 text-sm sm:text-base mt-0.5 truncate">
                      {affiliationLine}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 2 — Status: text + icon, 60–70% opacity, ORCID copy-on-click */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-white/65 text-sm">
                {(() => {
                  const parts = [];
                  if (profile.isVerified) {
                    parts.push(
                      <span key="v" className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400/80" />
                        Verified Researcher
                      </span>
                    );
                  }
                  if (profile.researchGateVerification === "verified" || profile.academiaEduVerification === "verified") {
                    parts.push(
                      <span key="a" className="flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5" />
                        Academic Profile Connected
                      </span>
                    );
                  }
                  if (profile.available === true) {
                    parts.push(
                      <span key="o" className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Open for Meetings
                      </span>
                    );
                  } else if (profile.available === false) {
                    parts.push(
                      <span key="c" className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Not Available for Collaboration
                      </span>
                    );
                  }
                  if (profile.orcid) {
                    parts.push(
                      <span key="orcid" className="hidden sm:inline">
                        <button
                          type="button"
                          onClick={copyOrcidToClipboard}
                          className="flex items-center gap-1.5 hover:text-white/90 transition-colors font-mono text-xs cursor-pointer group"
                          title="Click to copy ORCID"
                        >
                          <LinkIcon className="w-3.5 h-3.5 group-hover:opacity-90" />
                          ORCID: {profile.orcid}
                        </button>
                      </span>
                    );
                  }
                  return parts.length
                    ? parts.reduce((acc, el, i) => (
                        <React.Fragment key={i}>
                          {acc}
                          {i > 0 && <span className="text-white/45">•</span>}
                          {el}
                        </React.Fragment>
                      ), null)
                    : null;
                })()}
                {profile.orcid && (
                  <span className="sm:hidden relative">
                      <button
                        type="button"
                        onClick={() => setMobileMoreInfoOpen((v) => !v)}
                        className="p-1 -m-1 rounded hover:bg-white/10 text-white/65"
                        title="More info (ORCID)"
                        aria-label="More info"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {mobileMoreInfoOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setMobileMoreInfoOpen(false)}
                            aria-hidden="true"
                          />
                          <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-lg bg-white/95 backdrop-blur-sm border border-white/20 shadow-lg p-2">
                            <div className="text-xs text-[#2F3C96] font-mono truncate mb-1">
                              ORCID: {profile.orcid}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                copyOrcidToClipboard();
                                setMobileMoreInfoOpen(false);
                              }}
                              className="flex items-center gap-1.5 text-xs text-[#2F3C96] font-medium hover:bg-white/50 rounded px-2 py-1"
                            >
                              <Copy className="w-3 h-3" />
                              Copy
                            </button>
                          </div>
                        </>
                      )}
                  </span>
                )}
              </div>

              {/* Row 3 — Actions: Request Meeting primary, Follow secondary, Save icon-only */}
              {!isCurrentUser && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {/* Follow — secondary */}
                  <button
                    onClick={toggleFollow}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border ${
                      followingStatus
                        ? "bg-white/15 border-white/30 text-white"
                        : "bg-transparent border-white/40 text-white hover:bg-white/10"
                    }`}
                  >
                    {followingStatus ? (
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

                  {/* Connection Request or Message (researchers) */}
                  {canSendConnectionRequest && (
                    <>
                      {connectionRequestStatus.isConnected ? (
                        <button
                          onClick={() => setMessageModal({ open: true, body: "" })}
                          className="px-3 py-2 bg-white/15 border border-white/30 text-white rounded-lg text-sm font-medium hover:bg-white/25 transition-all flex items-center gap-2"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Message
                        </button>
                      ) : connectionRequestStatus.status === "pending" ? (
                        <button
                          disabled
                          className="px-3 py-2 bg-white/5 border border-white/20 text-white/70 rounded-lg text-sm font-medium flex items-center gap-2 cursor-not-allowed"
                        >
                          <Clock className="w-4 h-4" />
                          {connectionRequestStatus.isRequester ? "Request Sent" : "Pending"}
                        </button>
                      ) : connectionRequestStatus.status === "rejected" ? (
                        <button
                          disabled
                          className="px-3 py-2 bg-red-500/20 border border-red-300/30 text-white/70 rounded-lg text-sm font-medium flex items-center gap-2 cursor-not-allowed"
                        >
                          <Info className="w-4 h-4" />
                          Rejected
                        </button>
                      ) : profile.available !== true ? (
                        <button
                          disabled
                          className="px-3 py-2 bg-white/5 border border-white/10 text-white/50 rounded-lg text-sm font-medium flex items-center gap-2 cursor-not-allowed"
                          title="Not available for collaboration"
                        >
                          <UserPlus className="w-4 h-4" />
                          Connect
                        </button>
                      ) : (
                        <button
                          onClick={() => setConnectionRequestModal({ open: true, message: "" })}
                          className="px-4 py-2 bg-white text-[#2F3C96] rounded-lg text-sm font-semibold hover:bg-white/95 transition-all flex items-center gap-2 shadow-sm"
                        >
                          <UserPlus className="w-4 h-4" />
                          Request Meeting
                        </button>
                      )}
                    </>
                  )}

                  {/* Meeting Request (patients) — primary CTA */}
                  {canSendMeetingRequest && (
                    <>
                      {meetingRequestStatus.status === "pending" ? (
                        <button
                          disabled
                          className="px-3 py-2 bg-white/5 border border-white/20 text-white/70 rounded-lg text-sm font-medium flex items-center gap-2 cursor-not-allowed"
                        >
                          <Clock className="w-4 h-4" />
                          Meeting Request Pending
                        </button>
                      ) : (
                        <>
                          {meetingRequestStatus.status === "accepted" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-[11px] font-medium text-emerald-50">
                              <Check className="w-3 h-3" />
                              You&apos;ve previously had a meeting with this expert
                            </span>
                          )}
                          <button
                            onClick={() =>
                              setMeetingRequestModal({
                                ...getInitialMeetingRequestModal(),
                                open: true,
                              })
                            }
                            className="px-4 py-2 bg-white text-[#2F3C96] rounded-lg text-sm font-semibold hover:bg-white/95 transition-all flex items-center gap-2 shadow-sm"
                          >
                            <Calendar className="w-4 h-4" />
                            Request Another Meeting
                          </button>
                        </>
                      )}
                    </>
                  )}

                  {/* Save — icon-only, tertiary */}
                  <button
                    onClick={() => {
                      const expertId = profile.name || profile.id || profile._id || profile.userId;
                      toggleFavorite("expert", expertId, { ...profile, name: profile.name, id: profile.id || expertId });
                    }}
                    disabled={favoritingItems.has(getFavoriteKey(profile, "expert"))}
                    className={`ml-auto p-2 rounded-lg transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
                      isExpertFavorited
                        ? "bg-red-500/25 text-white border border-red-300/40"
                        : "bg-white/10 border border-white/20 text-white hover:bg-white/20"
                    }`}
                    title={isExpertFavorited ? "Remove from favorites" : "Save"}
                  >
                    {favoritingItems.has(getFavoriteKey(profile, "expert")) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Heart className={`w-4 h-4 ${isExpertFavorited ? "fill-current" : ""}`} />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Booking & consultation info — for patients viewing researcher */}
          {user?.role === "patient" && (profile.meetingRate != null || profile.interestedInMeetings) && (
            <div className="bg-white rounded-xl shadow-md border border-[rgba(232,232,232,1)] p-5 mb-6">
              <h3 className="text-sm font-semibold text-[#2F3C96] mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Booking & consultation
              </h3>
              <div className="space-y-2 text-sm text-slate-700">
                <div className="flex flex-wrap items-center gap-4">
                  {profile.meetingRate != null && (
                    <span className="flex items-center gap-1.5">
                      <span className="font-semibold text-[#2F3C96]">${profile.meetingRate}</span>
                      <span className="text-slate-600">per 30 min</span>
                    </span>
                  )}
                  {profile.interestedInMeetings && (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-medium border border-emerald-200">
                      Accepts meeting requests
                    </span>
                  )}
                </div>
                {!user?.emailVerified && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-2">
                    Please verify your email before requesting a meeting.
                  </p>
                )}
                {user?.emailVerified && profile.interestedInMeetings !== true && (
                  <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 mt-2">
                    This expert hasn&apos;t finished setting up their profile for meetings yet.
                  </p>
                )}
                {user?.emailVerified &&
                  profile.interestedInMeetings === true &&
                  !isStripeReadyForMeetings && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-2">
                      Payments are not live for this expert yet. They need to
                      complete Stripe onboarding before bookings can be confirmed.
                    </p>
                  )}
                <p className="text-xs text-slate-600 border-t border-slate-100 pt-2 mt-2">
                  <Clock className="w-3.5 h-3.5 inline mr-1 align-middle" />
                  Available times are shown in your local timezone after you pick a date.
                </p>
              </div>
            </div>
          )}

          {/* Research Interests — below header, max 3–4 chips + "View all interests" modal */}
          {((profile.specialties && profile.specialties.length > 0) ||
            (profile.interests && profile.interests.length > 0) ||
            (profile.researchInterests && profile.researchInterests.length > 0)) && (
            <div className="bg-white rounded-xl shadow-md border border-[rgba(232,232,232,1)] p-5 mb-6">
              <h3 className="text-sm font-semibold text-[#2F3C96] mb-2 flex items-center gap-2">
                <Award className="w-4 h-4" />
                Research Interests
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const allInterests = [
                    ...(profile.researchInterests || []),
                    ...(profile.specialties || []),
                    ...(profile.interests || []),
                  ];
                  const displayCount = 4;
                  const displayInterests = allInterests.slice(0, displayCount);
                  const remainingCount = allInterests.length - displayCount;
                  return (
                    <>
                      {displayInterests.map((interest, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-[#e8e9f2] text-[#2F3C96] rounded-full text-xs font-medium"
                        >
                          {interest}
                        </span>
                      ))}
                      {remainingCount > 0 && (
                        <button
                          onClick={() => setInterestsModalOpen(true)}
                          className="text-[#2F3C96]/80 hover:text-[#2F3C96] text-xs font-medium underline underline-offset-2 transition-colors"
                        >
                          View all interests
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ORCID Error Message (if ORCID fetch failed) */}
          {profile.orcidFetchError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800 mb-1">
                    ORCID Profile Unavailable
                  </h4>
                  <p className="text-sm text-yellow-700">
                    {profile.orcidMessage ||
                      "Could not fetch ORCID profile. Showing basic information from collabiora profile."}
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* Contributions on Platform — Forums Created + Forum Replies, below Research Interests */}
          {((profile.forums && profile.forums.length > 0) ||
            (profile.participatedForums && profile.participatedForums.length > 0)) && (
            <div className="bg-white rounded-xl shadow-md border border-[rgba(232,232,232,1)] p-6 mb-8">
              <h2 className="text-xl font-bold text-[#2F3C96] mb-6 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#2F3C96]" />
                Contributions on Platform
              </h2>
              <div className="space-y-6">
                {/* Forums Created — shown first */}
                {profile.forums && profile.forums.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-[#2F3C96] mb-3">
                      Forums Created ({profile.totalForums || profile.forums.length})
                    </h3>
                    <div className="space-y-4">
                      {profile.forums.map((forum) => (
                        <div
                          key={forum._id}
                          className="border border-[rgba(232,232,232,1)] rounded-lg p-4 hover:border-[rgba(163,167,203,1)] hover:shadow-md transition-all cursor-pointer"
                          onClick={() => navigate(`/forums?thread=${forum._id}`)}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-[#2F3C96] text-sm mb-1 line-clamp-2">
                                {forum.title}
                              </h4>
                              <div className="flex items-center gap-2 flex-wrap text-xs text-[#787878]">
                                <span className="inline-flex items-center px-2 py-0.5 bg-[rgba(209,211,229,1)] text-[#2F3C96] rounded">
                                  {forum.categoryName || "Uncategorized"}
                                </span>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(forum.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex items-center gap-1 text-xs text-[#787878]">
                                <MessageCircle className="w-3.5 h-3.5" />
                                {forum.replyCount || 0}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-[#787878]">
                                <Eye className="w-3.5 h-3.5" />
                                {forum.viewCount || 0}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-emerald-600">
                                <ArrowUp className="w-3.5 h-3.5" />
                                {forum.voteScore || 0}
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-[#787878] line-clamp-2 leading-relaxed">
                            {forum.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Forum Replies — participated forums where expert replied */}
                {profile.participatedForums &&
                  profile.participatedForums.filter((f) => !f.isCreator).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-[#2F3C96] mb-3">
                      Forum Replies
                    </h3>
                    <div className="space-y-4">
                {profile.participatedForums
                  .filter(forum => !forum.isCreator)
                  .map((forum) => (
                  <div
                    key={forum._id}
                    className="border border-[rgba(232,232,232,1)] rounded-lg overflow-hidden hover:border-[rgba(163,167,203,1)] hover:shadow-md transition-all"
                  >
                    {/* Original Forum Context Header */}
                    <div 
                      className="bg-[rgba(232,233,242,0.3)] p-3 border-b border-[rgba(232,232,232,1)] cursor-pointer"
                      onClick={() => navigate(`/forums?thread=${forum._id}`)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-[#787878]">Replied to:</span>
                        <h3 className="text-sm font-semibold text-[#2F3C96] hover:underline">
                          {forum.title}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#787878]">
                        <span className="inline-flex items-center px-2 py-1 bg-[rgba(209,211,229,1)] text-[#2F3C96] rounded-md font-medium">
                          {forum.categoryName || "Uncategorized"}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          by {forum.authorUsername}
                        </span>
                      </div>
                    </div>

                    {/* Expert's Reply */}
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 bg-[#2F3C96] rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
                          {profile.name?.charAt(0)?.toUpperCase() || "E"}
                        </div>

                        {/* Reply Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-[#2F3C96]">
                              {profile.name}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-[rgba(209,211,229,1)] text-[#2F3C96] rounded-full font-medium">
                              Researcher
                            </span>
                          </div>
                          <div className="text-xs text-[#787878] mb-2">
                            {forum.expertReplyDate ? new Date(forum.expertReplyDate).toLocaleDateString() : new Date(forum.createdAt).toLocaleDateString()}
                          </div>
                          <p className="text-sm text-[#787878] leading-relaxed whitespace-pre-wrap">
                            {forum.expertLatestReply || forum.body || forum.lastReply || "Reply content not available"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ORCID Profile Section */}
          {profile.orcid && (
            <div className="bg-white rounded-xl shadow-md border border-[rgba(232,232,232,1)] p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#2F3C96] flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#2F3C96]" />
                  ORCID Profile
                </h2>
                <a
                  href={`https://orcid.org/${profile.orcid}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#2F3C96] hover:text-[#253075] font-medium flex items-center gap-1"
                >
                  View Full Profile
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="space-y-4">
                {/* Biography */}
                {(profile.bioSummary || profile.bio || profile.biography) && (
                  <div
                    className="rounded-lg p-4 border"
                    style={{
                      backgroundColor: "rgba(245, 242, 248, 0.5)",
                      borderColor: "rgba(208, 196, 226, 0.3)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <User
                        className="w-4 h-4"
                        style={{ color: "#2F3C96" }}
                      />
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "#2F3C96" }}
                      >
                        Biography
                      </span>
                    </div>
                    <p
                      className="text-sm leading-relaxed whitespace-pre-wrap"
                      style={{ color: "#787878" }}
                    >
                      {profile.bioSummary || profile.bio || profile.biography}
                    </p>
                  </div>
                )}

                {/* Current Position */}
                {profile.currentPosition && (
                  <div
                    className="rounded-lg p-4 border"
                    style={{
                      backgroundColor: "rgba(245, 242, 248, 0.5)",
                      borderColor: "rgba(208, 196, 226, 0.3)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase
                        className="w-4 h-4"
                        style={{ color: "#2F3C96" }}
                      />
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "#2F3C96" }}
                      >
                        Current Position
                      </span>
                    </div>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "#787878" }}
                    >
                      {profile.currentPosition}
                    </p>
                  </div>
                )}

                {/* Location */}
                {locationText && (
                  <div
                    className="rounded-lg p-4 border"
                    style={{
                      backgroundColor: "rgba(245, 242, 248, 0.5)",
                      borderColor: "rgba(208, 196, 226, 0.3)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin
                        className="w-4 h-4"
                        style={{ color: "#2F3C96" }}
                      />
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "#2F3C96" }}
                      >
                        Location
                      </span>
                    </div>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "#787878" }}
                    >
                      {locationText}
                    </p>
                  </div>
                )}

                {/* Employment History */}
                {profile.employments && profile.employments.length > 0 && (
                  <div
                    className="rounded-lg p-4 border"
                    style={{
                      backgroundColor: "rgba(245, 242, 248, 0.5)",
                      borderColor: "rgba(208, 196, 226, 0.3)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Briefcase
                        className="w-4 h-4"
                        style={{ color: "#2F3C96" }}
                      />
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "#2F3C96" }}
                      >
                        Employment History
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: "rgba(208, 196, 226, 0.3)",
                          color: "#2F3C96",
                        }}
                      >
                        {profile.employments.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {profile.employments.slice(0, 5).map((emp, idx) => (
                        <div
                          key={idx}
                          style={{
                            borderBottom:
                              idx < Math.min(4, profile.employments.length - 1)
                                ? "1px solid rgba(208, 196, 226, 0.3)"
                                : "none",
                          }}
                          className="pb-3 last:pb-0"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p
                                className="text-sm font-semibold mb-1"
                                style={{ color: "#2F3C96" }}
                              >
                                {emp.roleTitle || "Position"}
                              </p>
                              <p
                                className="text-sm mb-1"
                                style={{ color: "#787878" }}
                              >
                                {emp.organization || "Organization"}
                              </p>
                              {emp.department && (
                                <p
                                  className="text-xs mb-1"
                                  style={{ color: "#787878" }}
                                >
                                  {emp.department}
                                </p>
                              )}
                              {(emp.startDate || emp.endDate) && (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <Calendar className="w-3.5 h-3.5" style={{ color: "#787878" }} />
                                  <p
                                    className="text-xs"
                                    style={{ color: "#787878" }}
                                  >
                                    {emp.startDate || "Unknown"} -{" "}
                                    {emp.endDate || "Present"}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education History */}
                {profile.educations && profile.educations.length > 0 && (
                  <div
                    className="rounded-lg p-4 border"
                    style={{
                      backgroundColor: "rgba(245, 242, 248, 0.5)",
                      borderColor: "rgba(208, 196, 226, 0.3)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <GraduationCap
                        className="w-4 h-4"
                        style={{ color: "#2F3C96" }}
                      />
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "#2F3C96" }}
                      >
                        Education
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: "rgba(208, 196, 226, 0.3)",
                          color: "#2F3C96",
                        }}
                      >
                        {profile.educations.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {profile.educations.slice(0, 5).map((edu, idx) => (
                        <div
                          key={idx}
                          style={{
                            borderBottom:
                              idx < Math.min(4, profile.educations.length - 1)
                                ? "1px solid rgba(208, 196, 226, 0.3)"
                                : "none",
                          }}
                          className="pb-3 last:pb-0"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p
                                className="text-sm font-semibold mb-1"
                                style={{ color: "#2F3C96" }}
                              >
                                {edu.roleTitle || edu.degree || "Degree"}
                              </p>
                              <p
                                className="text-sm mb-1"
                                style={{ color: "#787878" }}
                              >
                                {edu.organization || "Institution"}
                              </p>
                              {edu.department && (
                                <p
                                  className="text-xs mb-1"
                                  style={{ color: "#787878" }}
                                >
                                  {edu.department}
                                </p>
                              )}
                              {(edu.startDate || edu.endDate) && (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <Calendar className="w-3.5 h-3.5" style={{ color: "#787878" }} />
                                  <p
                                    className="text-xs"
                                    style={{ color: "#787878" }}
                                  >
                                    {edu.startDate || "Unknown"} -{" "}
                                    {edu.endDate || "Present"}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Publications Section */}
          {profile.publications && profile.publications.length > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-[rgba(232,232,232,1)] p-4 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#2F3C96] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#2F3C96]" />
                    Publications
                  </h2>
                  {isCurrentUser && profile.publicationsAreSelected && (
                    <p className="text-xs text-[#787878] mt-1">
                      You have selected these publications to display on your profile
                    </p>
                  )}
                </div>
                <span className="text-xs text-[#787878]">
                  {profile.publications.length > 0
                    ? `${profile.publications.length} ${
                        profile.publications.length === 1
                          ? "publication"
                          : "publications"
                      }`
                    : "No publications found"}
                </span>
              </div>
              <div className="space-y-3">
                {profile.publications.slice(0, publicationsToShow).map((pub, idx) => (
                  <div
                    key={idx}
                    className="border border-[rgba(232,232,232,1)] rounded-xl p-4 hover:border-[rgba(163,167,203,1)] hover:shadow-lg transition-all bg-white"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-[#2F3C96] text-sm mb-2 leading-snug line-clamp-2">
                          {stripHtmlTags(pub.title) || "Untitled Publication"}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          {pub.pmid && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-[rgba(209,211,229,1)] text-[#2F3C96] text-[10px] font-medium rounded">
                              PMID: {pub.pmid}
                            </span>
                          )}
                          {pub.doi && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-[rgba(209,211,229,1)] text-[#2F3C96] text-[10px] font-medium rounded">
                              DOI:{" "}
                              {pub.doi.length > 30
                                ? `${pub.doi.substring(0, 30)}...`
                                : pub.doi}
                            </span>
                          )}
                          {!pub.pmid && !pub.doi && pub.id && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-[rgba(209,211,229,1)] text-[#2F3C96] text-[10px] font-medium rounded">
                              ID: {pub.id}
                            </span>
                          )}
                          {pub.journal && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border bg-slate-50 text-[#787878] border-[rgba(232,232,232,1)]">
                              {pub.journal.length > 25
                                ? `${pub.journal.substring(0, 25)}...`
                                : pub.journal}
                            </span>
                          )}
                          {pub.type && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
                              {pub.type}
                            </span>
                          )}
                          {(pub.year || pub.month) && (
                            <span className="text-xs text-[#787878]">
                              {pub.month && `${pub.month} `}
                              {pub.year || ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[#787878] mb-2">
                      {pub.authors &&
                        Array.isArray(pub.authors) &&
                        pub.authors.length > 0 && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-[#2F3C96] shrink-0" />
                            <span className="line-clamp-1">
                              {pub.authors
                                .slice(0, 3)
                                .map((a) =>
                                  typeof a === "string" ? a : a.name || a,
                                )
                                .join(", ")}
                              {pub.authors.length > 3 && " et al."}
                            </span>
                          </div>
                        )}
                      {pub.link && (
                        <a
                          href={pub.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#2F3C96] hover:text-[#2F3C96] hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Paper
                        </a>
                      )}
                    </div>

                    {(pub.abstract || pub.snippet) && (
                      <div className="mb-3">
                        <div className="bg-[rgba(232,233,242,0.5)] rounded-lg p-3 border border-[rgba(209,211,229,0.5)]">
                          <p className="text-xs text-[#787878] line-clamp-3 leading-relaxed">
                            {pub.abstract || pub.snippet}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => generateSummary(pub, "publication")}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-[#2F3C96] to-[#253075] text-white rounded-lg text-xs font-semibold hover:from-[#253075] hover:to-[#1C2454] transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Simplify
                      </button>
                      {(pub.link || pub.doi || pub.pmid) && (
                        <a
                          href={pub.link || (pub.doi ? `https://doi.org/${pub.doi}` : `https://pubmed.ncbi.nlm.nih.gov/${pub.pmid}`)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 bg-white border border-[#2F3C96] text-[#2F3C96] rounded-lg text-xs font-semibold hover:bg-[rgba(232,233,242,0.5)] transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View Publication
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {profile.publications.length > publicationsToShow && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setPublicationsToShow((prev) => Math.min(prev + 5, profile.publications.length))}
                    className="px-4 py-2 text-sm font-semibold text-[#2F3C96] border border-[#2F3C96] rounded-lg hover:bg-[rgba(47,60,150,0.08)] transition-colors"
                  >
                    Show more ({Math.min(5, profile.publications.length - publicationsToShow)} more)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PI-claimed clinical trials (UCLA curated) */}
          {profile.claimedCuratedTrials &&
            profile.claimedCuratedTrials.length > 0 && (
              <div className="bg-white rounded-xl shadow-md border border-[rgba(232,232,232,1)] p-4 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#2F3C96] flex items-center gap-2">
                      <Beaker className="w-4 h-4 text-[#2F3C96]" />
                      Clinical trials (PI)
                    </h2>
                    <p className="text-xs text-[#787878] mt-1">
                      Trials this researcher has linked as principal investigator
                    </p>
                  </div>
                  <span className="text-xs text-[#787878]">
                    {profile.claimedCuratedTrials.length}{" "}
                    {profile.claimedCuratedTrials.length === 1
                      ? "trial"
                      : "trials"}
                  </span>
                </div>
                <div className="space-y-3">
                  {profile.claimedCuratedTrials
                    .slice(0, claimedTrialsToShow)
                    .map((ct) => (
                      <div
                        key={ct.curatedTrialId || ct.id}
                        className="border border-[rgba(232,232,232,1)] rounded-xl p-4 hover:border-[rgba(163,167,203,1)] hover:shadow-lg transition-all bg-white"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-bold text-[#2F3C96] text-sm leading-snug line-clamp-2 flex-1 min-w-0">
                            {ct.title}
                          </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          {ct.status && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-[rgba(209,211,229,1)] text-[#2F3C96] text-[10px] font-medium rounded">
                              {String(ct.status).replace(/_/g, " ")}
                            </span>
                          )}
                          {ct.phase && ct.phase !== "N/A" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border bg-slate-50 text-[#787878] border-[rgba(232,232,232,1)]">
                              {ct.phase}
                            </span>
                          )}
                          {ct.externalStudyCode && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border bg-indigo-50 text-indigo-800 border-indigo-100">
                              {ct.externalStudyCode}
                            </span>
                          )}
                        </div>
                        {ct.conditions && ct.conditions.length > 0 && (
                          <p className="text-xs text-[#787878] line-clamp-2 mb-4">
                            {ct.conditions.slice(0, 4).join(" · ")}
                            {ct.conditions.length > 4 ? "…" : ""}
                          </p>
                        )}
                        <div className="pt-3 border-t border-slate-100">
                          <Link
                            to={`/trial/${encodeURIComponent(ct.id)}`}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 w-full sm:w-auto bg-[#2F3C96] text-white rounded-lg text-xs font-semibold hover:bg-[#253075] transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View trial
                          </Link>
                        </div>
                      </div>
                    ))}
                </div>
                {profile.claimedCuratedTrials.length > claimedTrialsToShow && (
                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        setClaimedTrialsToShow((prev) =>
                          Math.min(
                            prev + 5,
                            profile.claimedCuratedTrials.length,
                          ),
                        )
                      }
                      className="px-4 py-2 text-sm font-semibold text-[#2F3C96] border border-[#2F3C96] rounded-lg hover:bg-[rgba(47,60,150,0.08)] transition-colors"
                    >
                      Show more (
                      {Math.min(
                        5,
                        profile.claimedCuratedTrials.length -
                          claimedTrialsToShow,
                      )}{" "}
                      more)
                    </button>
                  </div>
                )}
              </div>
            )}

          {/* Academic profiles: ResearchGate & Academia.edu — below Publications */}
          {(profile.researchGate || profile.academiaEdu) && (
            <div className="bg-white rounded-xl shadow-md border border-[rgba(232,232,232,1)] p-6 mb-8">
              <h2 className="text-xl font-bold text-[#2F3C96] flex items-center gap-2 mb-4">
                <LinkIcon className="w-5 h-5 text-[#2F3C96]" />
                Academic profiles
              </h2>
              <div className="flex flex-wrap gap-3">
                {profile.researchGate && (
                  <a
                    href={profile.researchGate}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[rgba(208,196,226,0.5)] hover:border-[#2F3C96] hover:bg-[rgba(47,60,150,0.05)] text-[#2F3C96] text-sm font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    ResearchGate
                    {profile.researchGateVerification === "verified" && (
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded">Verified</span>
                    )}
                  </a>
                )}
                {profile.academiaEdu && (
                  <a
                    href={profile.academiaEdu}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[rgba(208,196,226,0.5)] hover:border-[#2F3C96] hover:bg-[rgba(47,60,150,0.05)] text-[#2F3C96] text-sm font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Academia.edu
                    {profile.academiaEduVerification === "verified" && (
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded">Verified</span>
                    )}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* External Links Section */}
          {(profile.externalLinks && Object.keys(profile.externalLinks).length > 0) || profile.orcid ? (
            <div className="bg-white rounded-xl shadow-md border border-[rgba(232,232,232,1)] p-6 mb-8">
              <h2 className="text-xl font-bold text-[#2F3C96] mb-6 flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#2F3C96]" />
                External Links
              </h2>
              <div className="flex flex-wrap gap-3">
                {profile.orcid && (
                  <a
                    href={`https://orcid.org/${profile.orcid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 bg-[rgba(232,233,242,0.5)] text-[#2F3C96] rounded-lg text-sm font-semibold hover:bg-[rgba(209,211,229,0.5)] transition-all flex items-center gap-2 border border-[rgba(209,211,229,1)] hover:shadow-md"
                  >
                    <LinkIcon className="w-4 h-4" />
                    ORCID Profile
                  </a>
                )}
                {profile.externalLinks?.googleScholar && (
                  <a
                    href={profile.externalLinks.googleScholar}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 bg-[rgba(232,233,242,0.5)] text-[#2F3C96] rounded-lg text-sm font-semibold hover:bg-[rgba(209,211,229,0.5)] transition-all flex items-center gap-2 border border-[rgba(209,211,229,1)] hover:shadow-md"
                  >
                    <Database className="w-4 h-4" />
                    Google Scholar
                  </a>
                )}
                {profile.externalLinks?.pubmed && (
                  <a
                    href={profile.externalLinks.pubmed}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-all flex items-center gap-2 border border-blue-200 hover:shadow-md"
                  >
                    <BookOpen className="w-4 h-4" />
                    PubMed
                  </a>
                )}
                {profile.externalLinks?.researchGate && (
                  <a
                    href={profile.externalLinks.researchGate}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition-all flex items-center gap-2 border border-emerald-200 hover:shadow-md"
                  >
                    <Users className="w-4 h-4" />
                    ResearchGate
                  </a>
                )}
                {profile.externalLinks?.institutional && (
                  <a
                    href={profile.externalLinks.institutional}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 bg-slate-50 text-[#787878] rounded-lg text-sm font-semibold hover:bg-slate-100 transition-all flex items-center gap-2 border border-[rgba(232,232,232,1)] hover:shadow-md"
                  >
                    <Building2 className="w-4 h-4" />
                    Institutional Page
                  </a>
                )}
                {profile.externalLinks?.linkedIn && (
                  <a
                    href={profile.externalLinks.linkedIn}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-all flex items-center gap-2 border border-blue-200 hover:shadow-md"
                  >
                    <Users className="w-4 h-4" />
                    LinkedIn
                  </a>
                )}
                {profile.externalLinks?.twitter && (
                  <a
                    href={profile.externalLinks.twitter}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 bg-sky-50 text-sky-700 rounded-lg text-sm font-semibold hover:bg-sky-100 transition-all flex items-center gap-2 border border-sky-200 hover:shadow-md"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Twitter
                  </a>
                )}
                {profile.externalLinks?.website && (
                  <a
                    href={profile.externalLinks.website}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-100 transition-all flex items-center gap-2 border border-purple-200 hover:shadow-md"
                  >
                    <Globe className="w-4 h-4" />
                    Personal Website
                  </a>
                )}
              </div>
            </div>
          ) : null}

          {/* Associated Clinical Trials (if available) */}
          {profile.associatedTrials && profile.associatedTrials.length > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-[rgba(232,232,232,1)] p-6 mb-8">
              <h2 className="text-xl font-bold text-[#2F3C96] mb-6 flex items-center gap-2">
                <Beaker className="w-5 h-5 text-[#2F3C96]" />
                Associated Clinical Trials
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {profile.associatedTrials.map((trial, idx) => {
                  const isFavorited = favorites.some(
                    (fav) =>
                      fav.type === "trial" &&
                      (fav.item?.id === trial.id ||
                        fav.item?._id === trial._id),
                  );
                  return (
                    <div
                      key={idx}
                      className="border border-[rgba(232,232,232,1)] rounded-lg p-4 hover:border-[rgba(163,167,203,1)] hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-[#2F3C96] flex-1 line-clamp-2">
                          {trial.title}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(
                              "trial",
                              trial.id || trial._id,
                              trial,
                            );
                          }}
                          disabled={favoritingItems.has(
                            getFavoriteKey(trial, "trial"),
                          )}
                          className={`p-1.5 rounded-md border transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                            isFavorited
                              ? "bg-red-50 border-red-200 text-red-500"
                              : "bg-slate-50 border-[rgba(232,232,232,1)] text-slate-400 hover:bg-slate-100 hover:text-red-500"
                          }`}
                        >
                          {favoritingItems.has(
                            getFavoriteKey(trial, "trial"),
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
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {trial.status && (
                          <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded-full border border-orange-200">
                            {trial.status.replace(/_/g, " ")}
                          </span>
                        )}
                        {trial.phase && (
                          <span className="px-2 py-1 bg-[rgba(232,233,242,0.5)] text-[#2F3C96] text-xs font-medium rounded-full border border-[rgba(209,211,229,1)]">
                            Phase {trial.phase}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setTrialDetailsModal({ open: true, trial });
                        }}
                        className="text-sm text-[#2F3C96] hover:text-[#2F3C96] font-medium"
                      >
                        View Details →
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Meeting Request Modal (for patients) — Cal.com-style */}
      <Modal
        isOpen={meetingRequestModal.open}
        onClose={() => setMeetingRequestModal(getInitialMeetingRequestModal())}
        title="Book a meeting"
      >
        <div className="space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Researcher summary — compact card */}
          {profile && (
            <div className="rounded-xl bg-gradient-to-br from-[#E8E9F2] to-[#D1D3E5]/80 border border-[#D1D3E5] p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#2F3C96]/20 flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-[#2F3C96]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 truncate">{profile.name}</p>
                {profile.meetingRate != null && (
                  <p className="text-sm text-slate-600">
                    <span className="font-medium text-[#2F3C96]">${profile.meetingRate}</span> per 30 min
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Date: calendar + time slots */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Mini calendar */}
            <div>
              <p className="text-sm font-semibold text-[#2F3C96] mb-2">Select date</p>
              {(() => {
                const [y, m] = meetingRequestModal.calendarMonth.split("-").map(Number);
                const first = new Date(y, m - 1, 1);
                const daysInMonth = new Date(y, m, 0).getDate();
                const startWeekday = first.getDay();
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const monthLabel = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });
                const prevMonth = () => {
                  const d = new Date(y, m - 2, 1);
                  setMeetingRequestModal((prev) => ({ ...prev, calendarMonth: d.toISOString().slice(0, 7) }));
                };
                const nextMonth = () => {
                  const d = new Date(y, m, 1);
                  setMeetingRequestModal((prev) => ({ ...prev, calendarMonth: d.toISOString().slice(0, 7) }));
                };
                const pad = Array.from({ length: startWeekday }, () => null);
                const days = pad.concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
                return (
                  <div className="border border-[#D1D3E5] rounded-xl overflow-hidden bg-white">
                    <div className="flex items-center justify-between px-3 py-2 bg-[#E8E9F2]/80 border-b border-[#D1D3E5]">
                      <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/60 text-[#2F3C96]">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-sm font-semibold text-slate-800">{monthLabel}</span>
                      <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/60 text-[#2F3C96]">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-0.5 p-2">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                        <div key={d} className="text-center text-[10px] font-medium text-slate-500 py-1">
                          {d.slice(0, 1)}
                        </div>
                      ))}
                      {days.map((day, idx) => {
                        if (day === null) return <div key={`pad-${idx}`} />;
                        const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const cellDate = new Date(y, m - 1, day);
                        cellDate.setHours(0, 0, 0, 0);
                        const isPast = cellDate < today;
                        const isSelected = meetingRequestModal.preferredDate === dateStr;
                        return (
                          <button
                            key={dateStr}
                            type="button"
                            disabled={isPast}
                            onClick={() =>
                              setMeetingRequestModal((prev) => ({
                                ...prev,
                                preferredDate: dateStr,
                                preferredTime: "",
                                preferredSlotStartUtc: "",
                                preferredSlotEndUtc: "",
                              }))
                            }
                            className={`aspect-square flex items-center justify-center text-sm rounded-lg transition-colors ${
                              isPast
                                ? "text-slate-300 cursor-not-allowed"
                                : isSelected
                                  ? "bg-[#2F3C96] text-white font-semibold"
                                  : "hover:bg-[#E8E9F2] text-slate-700"
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Time slots */}
            <div>
              <p className="text-sm font-semibold text-[#2F3C96] mb-2">Select time</p>
              {!meetingRequestModal.preferredDate ? (
                <p className="text-sm text-slate-500 italic">Pick a date first</p>
              ) : (
                <>
                  <p className="text-xs text-slate-500 mb-2">
                    {loadingSlots
                      ? "Loading available times…"
                      : availableSlots.length === 0
                      ? "No available times for this date."
                      : "Choose an available time."}
                  </p>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Times below are shown in your local timezone.
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {loadingSlots && (
                      <div className="col-span-full flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin text-[#2F3C96] mr-2" />
                        <span className="text-xs text-slate-600">Fetching slots…</span>
                      </div>
                    )}
                    {!loadingSlots &&
                      availableSlots.map((slot) => {
                        const isSelected =
                          meetingRequestModal.preferredSlotStartUtc ===
                          slot.startUtc;
                        return (
                          <button
                            key={slot.startUtc}
                            type="button"
                            onClick={() =>
                              setMeetingRequestModal((prev) => ({
                                ...prev,
                                preferredTime: slot.time24,
                                preferredSlotStartUtc: slot.startUtc,
                                preferredSlotEndUtc: slot.endUtc,
                              }))
                            }
                            className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                              isSelected
                                ? "bg-[#2F3C96] text-white ring-2 ring-[#2F3C96] ring-offset-1"
                                : "bg-slate-100 text-slate-700 hover:bg-[#E8E9F2] hover:border-[#D1D3E5] border border-transparent"
                            }`}
                            title={slot.startUtc}
                          >
                            {slot.label}
                          </button>
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Topic / reason and description */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-[#2F3C96] mb-1.5">
                Topic / reason for meeting <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={meetingRequestModal.topic}
                onChange={(e) =>
                  setMeetingRequestModal((prev) => ({ ...prev, topic: e.target.value }))
                }
                className="w-full px-4 py-2 border border-[#D1D3E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F3C96] focus:border-transparent"
                placeholder="e.g. Discuss new treatment options for my condition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#2F3C96] mb-1.5">
                Short description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={meetingRequestModal.shortDescription}
                onChange={(e) =>
                  setMeetingRequestModal((prev) => ({
                    ...prev,
                    shortDescription: e.target.value,
                  }))
                }
                rows={3}
                className="w-full px-4 py-2 border border-[#D1D3E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F3C96] focus:border-transparent resize-none"
                placeholder="Briefly describe what you’d like to cover in this call…"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#2F3C96] mb-2">
                Additional details for the expert <span className="text-red-500">*</span>
              </label>
              <textarea
                value={meetingRequestModal.message}
                onChange={(e) =>
                  setMeetingRequestModal((prev) => ({ ...prev, message: e.target.value }))
                }
                rows={3}
                className="w-full px-4 py-2 border border-[#D1D3E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F3C96] focus:border-transparent resize-none"
                placeholder="Include any key background, context, or questions you’d like the expert to know before your meeting…"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={sendMeetingRequest}
              className="flex-1 px-4 py-3 bg-[#2F3C96] text-white rounded-xl font-semibold hover:bg-[#253075] transition-colors flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Request meeting
            </button>
            <button
              onClick={() =>
                setMeetingRequestModal(getInitialMeetingRequestModal())
              }
              className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Have questions for researcher? (after booking) */}
      <Modal
        isOpen={questionsAfterBookingModal.open}
        onClose={() =>
          setQuestionsAfterBookingModal({
            open: false,
            requestId: null,
            researcherName: "",
            questions: "",
            submitting: false,
          })
        }
        title={`Have some questions for ${questionsAfterBookingModal.researcherName || "this researcher"}?`}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Add any questions you&apos;d like the researcher to see with your meeting request. They&apos;ll get a notification and can view this in Activity.
          </p>
          <div>
            <label className="block text-sm font-semibold text-[#2F3C96] mb-2">
              Your questions (optional)
            </label>
            <textarea
              value={questionsAfterBookingModal.questions}
              onChange={(e) =>
                setQuestionsAfterBookingModal((prev) => ({
                  ...prev,
                  questions: e.target.value,
                }))
              }
              rows={4}
              className="w-full px-4 py-2 border border-[rgba(209,211,229,1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="e.g. What should I prepare before our call? Any documents to bring?"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => submitQuestionsAfterBooking()}
              disabled={questionsAfterBookingModal.submitting}
              className="flex-1 px-4 py-2 bg-[#2F3C96] text-white rounded-lg font-semibold hover:bg-[#253075] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {questionsAfterBookingModal.submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {questionsAfterBookingModal.submitting ? "Sending..." : "Send to researcher"}
            </button>
            <button
              onClick={() =>
                setQuestionsAfterBookingModal({
                  open: false,
                  requestId: null,
                  researcherName: "",
                  questions: "",
                  submitting: false,
                })
              }
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      </Modal>

      {/* Connection Request Modal (for researchers) */}
      <Modal
        isOpen={connectionRequestModal.open}
        onClose={() => setConnectionRequestModal({ open: false, message: "" })}
        title="Send Connection Request"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#2F3C96] mb-2">
              Message (Optional)
            </label>
            <textarea
              value={connectionRequestModal.message}
              onChange={(e) =>
                setConnectionRequestModal({
                  ...connectionRequestModal,
                  message: e.target.value,
                })
              }
              rows={4}
              className="w-full px-4 py-2 border border-[rgba(209,211,229,1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Add a personal message to your connection request (optional)..."
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={sendConnectionRequest}
              className="flex-1 px-4 py-2 bg-[#2F3C96] text-white rounded-lg font-semibold hover:bg-[#253075] transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Send Connection Request
            </button>
            <button
              onClick={() =>
                setConnectionRequestModal({ open: false, message: "" })
              }
              className="flex-1 px-4 py-2 bg-slate-100 text-[#787878] rounded-lg font-semibold hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Direct Message Modal (only if connected) */}
      <Modal
        isOpen={messageModal.open}
        onClose={() => setMessageModal({ open: false, body: "" })}
        title={`Message ${profile?.name || "Researcher"}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#2F3C96] mb-2">
              Message
            </label>
            <textarea
              value={messageModal.body}
              onChange={(e) =>
                setMessageModal({ ...messageModal, body: e.target.value })
              }
              rows={6}
              className="w-full px-4 py-2 border border-[rgba(209,211,229,1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Type your message here..."
            />
          </div>
          <button
            onClick={sendMessage}
            className="w-full py-3 bg-gradient-to-r from-[#2F3C96] to-[#253075] text-white rounded-lg font-semibold hover:from-[#253075] hover:to-[#1C2454] transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send Message
          </button>
        </div>
      </Modal>

      {/* Summary Modal */}
      <Modal
        isOpen={summaryModal.open}
        onClose={() =>
          setSummaryModal({
            open: false,
            title: "",
            type: "",
            summary: "",
            loading: false,
          })
        }
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
              style={{
                backgroundColor: "rgba(232, 224, 239, 0.8)",
                color: "#2F3C96",
              }}
            >
              {summaryModal.type === "trial" ? "Clinical Trial" : "Research Publication"}
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
          ) : (
            // Fallback for non-structured summaries (old format)
            <div className="py-2">
              <p
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: "#787878" }}
              >
                {typeof summaryModal.summary === "object"
                  ? summaryModal.summary.summary || "Summary unavailable"
                  : summaryModal.summary || "Summary unavailable"}
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Publication Details Modal */}
      <Modal
        isOpen={publicationDetailsModal.open}
        onClose={() =>
          setPublicationDetailsModal({ open: false, publication: null })
        }
        title="Publication Details"
      >
        {publicationDetailsModal.publication && (
          <div className="flex flex-col h-full -mx-6 -my-6">
            <div className="flex-1 overflow-y-auto space-y-6 px-6 pt-6 pb-24">
              <div className="pb-4 border-b border-[rgba(232,232,232,1)]/60">
                <h3 className="text-xl font-bold text-[#2F3C96] mb-3 leading-tight">
                  {stripHtmlTags(publicationDetailsModal.publication.title)}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {publicationDetailsModal.publication.pmid && (
                    <span className="inline-flex items-center px-3 py-1 bg-[rgba(232,233,242,0.5)] text-[#2F3C96] text-xs font-medium rounded-md border border-[rgba(209,211,229,0.5)]">
                      <FileText className="w-3 h-3 mr-1.5" />
                      PMID: {publicationDetailsModal.publication.pmid}
                    </span>
                  )}
                  {publicationDetailsModal.publication.doi && (
                    <span className="inline-flex items-center px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-md border border-purple-100">
                      <LinkIcon className="w-3 h-3 mr-1.5" />
                      DOI: {publicationDetailsModal.publication.doi}
                    </span>
                  )}
                  {publicationDetailsModal.publication.journal && (
                    <span className="inline-flex items-center px-3 py-1 bg-slate-50 text-[#787878] text-xs font-medium rounded-md border border-[rgba(232,232,232,1)]">
                      <BookOpen className="w-3 h-3 mr-1.5" />
                      {publicationDetailsModal.publication.journal}
                    </span>
                  )}
                  {publicationDetailsModal.publication.type && (
                    <span className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-md border border-emerald-100">
                      <FileText className="w-3 h-3 mr-1.5" />
                      {publicationDetailsModal.publication.type}
                    </span>
                  )}
                  {publicationDetailsModal.publication.year && (
                    <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md border border-blue-100">
                      <Calendar className="w-3 h-3 mr-1.5" />
                      {publicationDetailsModal.publication.year}
                    </span>
                  )}
                </div>
              </div>

              {(publicationDetailsModal.publication.abstract ||
                publicationDetailsModal.publication.snippet) && (
                <div>
                  <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 rounded-xl p-5 border border-[rgba(209,211,229,0.5)]/50">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-[#2F3C96]">
                      <Info className="w-4 h-4" />
                      Abstract
                    </h4>
                    <div className="text-sm text-[#787878] leading-relaxed whitespace-pre-wrap max-h-none overflow-visible">
                      {publicationDetailsModal.publication.abstract ||
                        publicationDetailsModal.publication.snippet}
                    </div>
                  </div>
                </div>
              )}

              {publicationDetailsModal.publication.authors &&
                Array.isArray(publicationDetailsModal.publication.authors) &&
                publicationDetailsModal.publication.authors.length > 0 && (
                  <div>
                    <div className="bg-white rounded-xl p-5 border border-[rgba(232,232,232,1)]/60 shadow-sm">
                      <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-[#787878]">
                        <User className="w-4 h-4" />
                        Authors
                      </h4>
                      <p className="text-sm text-[#787878] leading-relaxed">
                        {publicationDetailsModal.publication.authors
                          .map((a) => (typeof a === "string" ? a : a.name || a))
                          .join(", ")}
                      </p>
                    </div>
                  </div>
                )}

              {publicationDetailsModal.publication.link && (
                <div className="sticky bottom-0 px-6 py-4 border-t border-[rgba(232,232,232,1)]/60 bg-white/95 backdrop-blur-sm shadow-lg">
                  <a
                    href={publicationDetailsModal.publication.link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 px-4 py-2.5 bg-[#2F3C96] text-white rounded-lg text-sm font-semibold hover:bg-[#253075] transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Source
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Trial Details Modal */}
      <Modal
        isOpen={trialDetailsModal.open}
        onClose={() => setTrialDetailsModal({ open: false, trial: null })}
        title="Trial Details"
      >
        {trialDetailsModal.trial && (
          <div className="space-y-4">
            <h4 className="font-bold text-[#2F3C96]">
              {trialDetailsModal.trial.title}
            </h4>
            {trialDetailsModal.trial.description && (
              <p className="text-[#787878] text-sm leading-relaxed">
                {trialDetailsModal.trial.description}
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Research Interests Modal */}
      <Modal
        isOpen={interestsModalOpen}
        onClose={() => setInterestsModalOpen(false)}
        title="Research Interests"
      >
        <div className="flex flex-wrap gap-2">
          {[
            ...(profile?.researchInterests || []),
            ...(profile?.specialties || []),
            ...(profile?.interests || []),
          ].map((interest, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 bg-[#e8e9f2] text-[#2F3C96] rounded-full text-sm font-medium"
            >
              {interest}
            </span>
          ))}
        </div>
      </Modal>
    </Layout>
  );
}
