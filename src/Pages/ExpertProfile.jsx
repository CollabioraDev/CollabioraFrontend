import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  ListChecks,
  AlertCircle,
  Copy,
  MoreHorizontal,
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import Modal from "../components/ui/Modal.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";

export default function ExpertProfile() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [favoritingItems, setFavoritingItems] = useState(new Set()); // Track items being favorited/unfavorited
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
  const [contactModal, setContactModal] = useState(false);
  const [user, setUser] = useState(null);
  const [hasInvited, setHasInvited] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(false);
  const [showAllPublications, setShowAllPublications] = useState(false);
  const [interestsModalOpen, setInterestsModalOpen] = useState(false);
  const [mobileMoreInfoOpen, setMobileMoreInfoOpen] = useState(false);

  // Get expert data from URL params
  const expertName = searchParams.get("name");
  const expertAffiliation = searchParams.get("affiliation");
  const expertLocation = searchParams.get("location");
  const expertOrcid = searchParams.get("orcid");
  const expertBiography = searchParams.get("biography");
  const expertResearchInterests = searchParams.get("researchInterests");
  const fromPage = searchParams.get("from") || "experts"; // Default to "experts" if not specified

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(userData);

    if (!expertName) {
      toast.error("Expert information not provided");
      navigate("/experts");
      return;
    }

    // Fetch profile and favorites
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("name", expertName);
        if (expertAffiliation) params.set("affiliation", expertAffiliation);
        if (expertLocation) params.set("location", expertLocation);
        if (expertOrcid) params.set("orcid", expertOrcid);
        if (expertBiography) params.set("biography", expertBiography);
        if (expertResearchInterests) {
          // If it's already a JSON string, use it; otherwise stringify it
          try {
            JSON.parse(expertResearchInterests);
            params.set("researchInterests", expertResearchInterests);
          } catch {
            params.set("researchInterests", expertResearchInterests);
          }
        }

        const response = await fetch(
          `${base}/api/expert/profile?${params.toString()}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await response.json();
        setProfile(data.profile);
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
            `${base}/api/favorites/${userData._id || userData.id}`
          );
          if (favResponse.ok) {
            const favData = await favResponse.json();
            setFavorites(favData.items || []);
          }
        } catch (error) {
          console.error("Error fetching favorites:", error);
        }

        // Check invite status
        checkInviteStatus(userData);
      }
    };

    fetchData();
  }, [
    expertName,
    expertAffiliation,
    expertLocation,
    expertOrcid,
    expertBiography,
    expertResearchInterests,
    navigate,
    base,
  ]);

  // Helper function to get unique key for favorite tracking
  const getFavoriteKey = (item, type) => {
    if (type === "expert") {
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

    // Determine the correct ID to use for checking and deletion
    let checkId = itemId;
    if (type === "expert") {
      // For experts, use name as the primary identifier
      checkId = item.name || item.id || item._id || itemId;
    } else if (type === "publication") {
      // For publications, prioritize pmid, then id, then use the itemId passed
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

      // For experts, check by exact name match (primary identifier)
      if (type === "expert") {
        // Check by exact name match first
        if (item.name && fav.item?.name) {
          return fav.item.name === item.name;
        }
        // Fallback: check by id
        return fav.item?.id === checkId || fav.item?._id === checkId;
      }

      // For publications, check by pmid first, then id, then title+link+year combination
      if (type === "publication") {
        // If both have pmid, match by pmid
        if (item.pmid && fav.item?.pmid) {
          return fav.item.pmid === item.pmid;
        }
        // If both have id, match by id
        if (item.id && fav.item?.id && !item.pmid) {
          return fav.item.id === item.id;
        }
        // Match by checkId (which could be pmid, id, or composite)
        if (fav.item?.pmid === checkId || fav.item?.id === checkId) {
          return true;
        }
        // Fallback: match by title + link + year combination (for uniqueness)
        if (item.title && item.link && fav.item?.title && fav.item?.link) {
          return (
            fav.item.title === item.title &&
            fav.item.link === item.link &&
            (fav.item.year || "") === (item.year || "")
          );
        }
        return false;
      }

      // For trials, check by id or title
      if (type === "trial") {
        return (
          fav.item?.id === checkId ||
          fav.item?._id === checkId ||
          (fav.item?.title === item.title && item.title)
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

        if (type === "expert") {
          if (item.name && fav.item?.name) {
            return fav.item.name !== item.name;
          }
          return !(fav.item?.id === checkId || fav.item?._id === checkId);
        }

        if (type === "publication") {
          if (item.pmid && fav.item?.pmid) {
            return fav.item.pmid !== item.pmid;
          }
          if (item.id && fav.item?.id && !item.pmid) {
            return fav.item.id !== item.id;
          }
          return !(fav.item?.pmid === checkId || fav.item?.id === checkId);
        }

        if (type === "trial") {
          return !(
            fav.item?.id === checkId ||
            fav.item?._id === checkId ||
            (fav.item?.title === item.title && item.title)
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

      // Add type-specific IDs
      if (type === "expert") {
        if (item.name) {
          itemToStore.name = item.name;
        }
        if (item.orcid) {
          itemToStore.orcid = item.orcid;
        }
      }
      if (type === "publication") {
        if (item.pmid) itemToStore.pmid = item.pmid;
        if (item.id) itemToStore.id = item.id;
        if (item.link) itemToStore.link = item.link;
        if (item.title) itemToStore.title = item.title;
        if (item.year) itemToStore.year = item.year;
        if (!item.pmid && !item.id) {
          itemToStore.id = checkId;
        }
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
          { method: "DELETE" }
        );
        toast.success("Removed from favorites");
      } else {
        // Store complete item information
        const itemToStore = {
          ...item, // Store all item properties
          id: checkId,
          _id: item._id || checkId,
        };

        // Add type-specific IDs
        if (type === "expert") {
          // Ensure name is stored as the primary identifier
          if (item.name) {
            itemToStore.name = item.name;
          }
          // Also store orcid if available (for reference, but not used for matching)
          if (item.orcid) {
            itemToStore.orcid = item.orcid;
          }
        }
        if (type === "publication") {
          // Ensure all publication identifiers are stored
          if (item.pmid) itemToStore.pmid = item.pmid;
          if (item.id) itemToStore.id = item.id;
          if (item.link) itemToStore.link = item.link;
          if (item.title) itemToStore.title = item.title;
          if (item.year) itemToStore.year = item.year;
          // If no pmid or id, use the checkId as the id
          if (!item.pmid && !item.id) {
            itemToStore.id = checkId;
          }
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
        `${base}/api/favorites/${user._id || user.id}`
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

  // Check if user has already invited this expert
  async function checkInviteStatus(userData) {
    if (!userData?._id && !userData?.id) return;
    if (!expertName) return;

    setCheckingInvite(true);
    try {
      const params = new URLSearchParams();
      params.set("inviterId", userData._id || userData.id);
      params.set("expertName", expertName);
      if (expertOrcid) params.set("expertOrcid", expertOrcid);

      const response = await fetch(
        `${base}/api/expert-invites/check?${params.toString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setHasInvited(data.hasInvited || false);
      }
    } catch (error) {
      console.error("Error checking invite status:", error);
    } finally {
      setCheckingInvite(false);
    }
  }

  // Send invite to expert
  async function sendInvite() {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to invite experts");
      return;
    }

    if (hasInvited) {
      toast.info("You have already invited this expert");
      return;
    }

    setInviteLoading(true);
    try {
      const response = await fetch(`${base}/api/expert-invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviterId: user._id || user.id,
          expertName: expertName,
          expertOrcid: expertOrcid || null,
          expertAffiliation: expertAffiliation || null,
          expertLocation: expertLocation || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setHasInvited(true);
        toast.success("Invite sent successfully!");
        setContactModal(false);
      } else {
        toast.error(data.error || "Failed to send invite");
      }
    } catch (error) {
      console.error("Error sending invite:", error);
      toast.error("Failed to send invite. Please try again.");
    } finally {
      setInviteLoading(false);
    }
  }

  async function generateSummary(item, type) {
    // For "Understand this Paper": always use simplified summary (readable for all), not overly technical
    const shouldSimplify = true;

    let text = "";
    let title = "";
    if (type === "trial") {
      title = item.title || "Clinical Trial";
      text = [
        item.title || "",
        item.status || "",
        item.phase || "",
        item.description || "",
        item.conditionDescription || "",
        Array.isArray(item.conditions)
          ? item.conditions.join(", ")
          : item.conditions || "",
      ]
        .filter(Boolean)
        .join(" ");
    } else {
      title = item.title || "Publication";
      text = [
        item.title || "",
        item.publication || item.journal || "",
        item.snippet || item.abstract || "",
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
          type: type === "publication" ? "publication" : undefined,
          simplify: type === "publication" ? shouldSimplify : undefined,
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
        <div className="min-h-screen bg-gradient-to-br from-[#F5F5F5] via-[rgba(232,233,242,0.3)] to-[#F5F5F5] flex items-center justify-center">
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
        <div className="min-h-screen bg-gradient-to-br from-[#F5F5F5] via-[rgba(232,233,242,0.3)] to-[#F5F5F5] flex items-center justify-center  ">
          <div className="text-center">
            <p className="text-[#787878] mb-4">Expert profile not found</p>
            <button
              onClick={() => navigate("/experts")}
              className="px-4 py-2 bg-[#2F3C96] text-white rounded-lg hover:bg-[#253075] transition-colors z-50"
            >
              Back to Experts
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const isExpertFavorited = favorites.some((fav) => {
    if (fav.type !== "expert") return false;

    // Check by exact name match (primary identifier)
    if (profile.name && fav.item?.name) {
      return fav.item.name === profile.name;
    }

    // Fallback: check by id
    const expertId = profile.name || profile.id || profile._id;
    if (fav.item?.id === expertId || fav.item?._id === expertId) {
      return true;
    }

    return false;
  });

  // Affiliation line for header: "Institution · Location"
  const affiliationStr =
    profile.affiliation && typeof profile.affiliation === "string"
      ? profile.affiliation
      : profile.affiliation?.name ||
        profile.affiliation?.institution ||
        "";
  const locationStr =
    profile.location && typeof profile.location === "string"
      ? profile.location
      : profile.location?.city && profile.location?.country
        ? `${profile.location.city}, ${profile.location.country}`
        : profile.location?.city || profile.location?.country || "";
  const affiliationLine = [affiliationStr, locationStr].filter(Boolean).join(" · ");

  const orcidValue = profile.orcid || profile.externalLinks?.orcid?.match(/orcid\.org\/([\d-X]+)/)?.[1];
  const copyOrcidToClipboard = () => {
    if (!orcidValue) return;
    navigator.clipboard.writeText(orcidValue);
    toast.success("ORCID copied to clipboard");
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-[rgba(232,233,242,1)] via-white to-[rgba(209,211,229,1)]  overflow-hidden relative  ">
        <AnimatedBackground />
        <div className="px-4 sm:px-6 md:px-8 lg:px-12 mx-auto max-w-7xl pt-15 pb-12 lg:mt-5 mt-17 relative ">
          {/* Back Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (fromPage === "dashboard") {
                const user = JSON.parse(localStorage.getItem("user") || "{}");
                const role = user?.role || "patient";
                navigate(`/dashboard/${role}`);
              } else {
                navigate("/experts");
              }
            }}
            className="mb-6 flex items-center gap-2 text-[#2F3C96] hover:text-[#253075] font-medium transition-colors relative z-50 cursor-pointer"
            type="button"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {fromPage === "dashboard" ? "Dashboard" : "Experts"}
          </button>

          {/* Header Section — 3-row layout: Identity, Status, Actions */}
          <div className="bg-gradient-to-br from-[#3d4ba8] via-[#2f3c96] to-[#26347a] rounded-xl shadow-lg border border-[#2F3C96]/30 relative overflow-hidden p-5 sm:p-6 mb-6">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/[0.04] rounded-full -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/[0.04] rounded-full -ml-16 -mb-16" />

            <div className="relative z-10 space-y-4">
              {/* Row 1 — Identity: bigger name, calmer, avatar inline */}
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

              {/* Row 2 — Status: text + icon, 60–70% opacity */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-white/65 text-sm">
                {(() => {
                  const parts = [];
                  parts.push(
                    <span key="collabiora" className="flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      On Collabiora? → No
                    </span>
                  );
                  parts.push(
                    <span key="contact" className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      Contactable? → Not yet
                    </span>
                  );
                  if (orcidValue) {
                    parts.push(
                      <span key="orcid" className="hidden sm:inline">
                        <button
                          type="button"
                          onClick={copyOrcidToClipboard}
                          className="flex items-center gap-1.5 hover:text-white/90 transition-colors font-mono text-xs cursor-pointer group"
                          title="Click to copy ORCID"
                        >
                          <LinkIcon className="w-3.5 h-3.5 group-hover:opacity-90" />
                          ORCID: {orcidValue}
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
                {orcidValue && (
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
                            ORCID: {orcidValue}
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

              {/* Row 3 — Actions: Invite primary, Save icon-only */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    if (!user?._id && !user?.id) {
                      toast.error("Please sign in to invite experts");
                      return;
                    }
                    if (hasInvited) {
                      toast.info("You have already invited this expert");
                      return;
                    }
                    setContactModal(true);
                  }}
                  disabled={hasInvited || inviteLoading || checkingInvite}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    hasInvited
                      ? "bg-white/15 border border-white/30 text-white"
                      : "bg-white text-[#2F3C96] hover:bg-white/95 shadow-sm"
                  }`}
                >
                  {inviteLoading || checkingInvite ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : hasInvited ? (
                    <>
                      <Check className="w-4 h-4" />
                      Invited
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Invite to Platform
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    const expertId = profile.name || profile.id || profile._id;
                    toggleFavorite("expert", expertId, {
                      ...profile,
                      name: profile.name,
                      id: profile.id || expertId,
                    });
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
            </div>
          </div>

          {/* Areas of Expertise — below header, max 4 chips + "View all" modal */}
          {(() => {
            const expertise = Array.isArray(profile.areasOfExpertise)
              ? profile.areasOfExpertise
              : profile.areasOfExpertise
                ? [profile.areasOfExpertise]
                : [];
            return expertise.length > 0 ? (
              <div className="bg-white rounded-xl shadow-md border border-[rgba(232,232,232,1)] p-5 mb-6">
                <h3 className="text-sm font-semibold text-[#2F3C96] mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Areas of Expertise
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  {expertise.slice(0, 4).map((area, idx) => {
                    const areaText =
                      typeof area === "string"
                        ? area
                        : area?.name || area?.title || String(area);
                    return (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-[#e8e9f2] text-[#2F3C96] rounded-full text-xs font-medium"
                      >
                        {areaText}
                      </span>
                    );
                  })}
                  {expertise.length > 4 && (
                    <button
                      onClick={() => setInterestsModalOpen(true)}
                      className="text-[#2F3C96]/80 hover:text-[#2F3C96] text-xs font-medium underline underline-offset-2 transition-colors"
                    >
                      View all expertise
                    </button>
                  )}
                </div>
              </div>
            ) : null;
          })()}

          {/* Summary / About Section */}
          {profile.bioSummary && (
            <div className="bg-white rounded-xl shadow-md border border-[rgba(232,232,232,1)] p-6 mb-8">
              <h2 className="text-xl font-bold text-[#2F3C96] mb-3 flex items-center gap-2">
                <Info className="w-5 h-5 text-[#2F3C96]" />
                About
              </h2>
              <p className="text-[#787878] leading-relaxed">
                {typeof profile.bioSummary === "string"
                  ? profile.bioSummary
                      .replace(/^Ai[:\s]*/i, "")
                      .replace(/^Summary[:\s]*/i, "")
                      .trim()
                  : String(profile.bioSummary)}
              </p>
            </div>
          )}

          {/* Impact Metrics */}
          {profile.impactMetrics && (
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-[rgba(232,232,232,1)] p-3 text-center">
                <TrendingUp className="w-6 h-6 text-[#D0C4E2] mx-auto mb-1.5" />
                <div className="text-xl font-bold text-[#2F3C96]">
                  {profile.impactMetrics.totalCitations || 0}
                </div>
                <div className="text-xs text-[#787878]">Total Citations</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-[rgba(232,232,232,1)] p-3 text-center">
                <Star className="w-6 h-6 text-amber-600 mx-auto mb-1.5" />
                <div className="text-xl font-bold text-[#2F3C96]">
                  {profile.impactMetrics.maxCitations || 0}
                </div>
                <div className="text-xs text-[#787878]">Max Citations</div>
              </div>
            </div>
          )}

          {/* Top Publications */}
          {profile.publications && profile.publications.length > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-[rgba(232,232,232,1)] p-4 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#2F3C96] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#2F3C96]" />
                  Top Publications
                </h2>
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
                {(showAllPublications
                  ? profile.publications
                  : profile.publications.slice(0, 5)
                ).map((pub, idx) => {
                  return (
                    <div
                      key={idx}
                      className="border border-[rgba(232,232,232,1)] rounded-xl p-4 hover:border-[rgba(163,167,203,1)] hover:shadow-lg transition-all bg-white"
                    >
                      {/* Header with Title, Citations, and Favorite */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[#2F3C96] text-sm mb-2 leading-snug line-clamp-2">
                            {pub.title || "Untitled Publication"}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            {(pub.pmid || pub.id) && (
                              <span className="inline-flex items-center px-2 py-0.5 bg-[rgba(209,211,229,1)] text-[#2F3C96] text-[10px] font-medium rounded">
                                {pub.pmid
                                  ? `PMID: ${pub.pmid}`
                                  : `ID: ${pub.id}`}
                              </span>
                            )}
                            {pub.journal && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border bg-[#F5F5F5] text-[#787878] border-[rgba(232,232,232,1)]">
                                {pub.journal.length > 25
                                  ? `${pub.journal.substring(0, 25)}...`
                                  : pub.journal}
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
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Citations - More Prominent */}
                          {(pub.citations || pub.citations === 0) && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[rgba(232,233,242,1)] rounded-lg border border-[rgba(209,211,229,1)]">
                              <TrendingUp className="w-3.5 h-3.5 text-[#2F3C96] shrink-0" />
                              <span className="text-xs font-bold text-[#2F3C96]">
                                {pub.citations || 0}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Compact Metadata */}
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
                                    typeof a === "string" ? a : a.name || a
                                  )
                                  .join(", ")}
                                {pub.authors.length > 3 && " et al."}
                              </span>
                            </div>
                          )}
                        {pub.publication && (
                          <div className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-[#D0C4E2] shrink-0" />
                            <span className="line-clamp-1">
                              {typeof pub.publication === "string"
                                ? pub.publication
                                : pub.publication.name ||
                                  String(pub.publication)}
                            </span>
                          </div>
                        )}
                        {(pub.volume || pub.issue || pub.pages) && (
                          <span className="text-[#787878]">
                            {pub.volume && `Vol. ${pub.volume}`}
                            {pub.issue && ` (${pub.issue})`}
                            {pub.pages && `, pp. ${pub.pages}`}
                          </span>
                        )}
                        {pub.doi && (
                          <a
                            href={`https://doi.org/${pub.doi}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#2F3C96] hover:text-[#253075] hover:underline line-clamp-1"
                          >
                            DOI:{" "}
                            {pub.doi.length > 20
                              ? `${pub.doi.substring(0, 20)}...`
                              : pub.doi}
                          </a>
                        )}
                      </div>

                      {/* Compact Abstract Preview */}
                      {(pub.abstract || pub.snippet) && (
                        <div className="mb-3">
                          <div className="bg-[rgba(232,233,242,1)] rounded-lg p-3 border border-[rgba(209,211,229,1)] ">
                            <p className="text-xs text-[#787878] line-clamp-3 leading-relaxed">
                              {pub.abstract || pub.snippet}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Compact Action Buttons */}
                      <div className="flex items-center gap-2 pt-3 border-t border-[#F5F5F5]">
                        <button
                          onClick={() => generateSummary(pub, "publication")}
                          className="flex-1 px-4 py-2 bg-gradient-to-r from-[#2F3C96] to-[#253075] text-white rounded-lg text-xs font-semibold hover:from-[#253075] hover:to-[#1C2454] transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Understand this Paper
                        </button>
                        {pub.link && (
                          <a
                            href={pub.link}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 px-4 py-2 bg-[#F5F5F5] text-[#787878] rounded-lg text-xs font-semibold hover:bg-[rgba(232,232,232,1)] transition-colors flex items-center justify-center gap-2 border border-[rgba(232,232,232,1)] shadow-sm hover:shadow-md"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View Paper
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {profile.publications.length > 5 && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => setShowAllPublications(!showAllPublications)}
                    className="px-6 py-2 bg-[#2F3C96] text-white rounded-lg text-sm font-semibold hover:bg-[#253075] transition-colors flex items-center gap-2"
                  >
                    {showAllPublications ? (
                      <>
                        Show Less
                      </>
                    ) : (
                      <>
                        Show More ({profile.publications.length - 5} more)
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Associated Clinical Trials */}
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
                      (fav.item?.id === trial.id || fav.item?._id === trial._id)
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
                              trial
                            );
                          }}
                          disabled={favoritingItems.has(
                            getFavoriteKey(trial, "trial")
                          )}
                          className={`p-1.5 rounded-md border transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                            isFavorited
                              ? "bg-red-50 border-red-200 text-red-500"
                              : "bg-[#F5F5F5] border-[rgba(232,232,232,1)] text-[#787878] hover:bg-[rgba(232,232,232,1)] hover:text-red-500"
                          }`}
                        >
                          {favoritingItems.has(
                            getFavoriteKey(trial, "trial")
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
                          <span className="px-2 py-1 bg-[rgba(232,233,242,1)] text-[#2F3C96] text-xs font-medium rounded-full border border-[rgba(209,211,229,1)]">
                            Phase {trial.phase}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setTrialDetailsModal({ open: true, trial });
                        }}
                        className="text-sm text-[#2F3C96] hover:text-[#253075] font-medium"
                      >
                        View Details →
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          {profile.activityTimeline && profile.activityTimeline.length > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-[rgba(232,232,232,1)] p-6 mb-8">
              <h2 className="text-xl font-bold text-[#2F3C96] mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#2F3C96]" />
                Recent Activity
              </h2>
              <div className="space-y-4">
                {profile.activityTimeline.map((activity, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-[#2F3C96] rounded-full"></div>
                      {idx < profile.activityTimeline.length - 1 && (
                        <div className="w-0.5 h-full bg-[rgba(232,232,232,1)] mt-2"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-[#2F3C96]">
                          {activity.title}
                        </span>
                        {activity.year && (
                          <span className="text-xs text-[#787878]">
                            ({activity.year})
                          </span>
                        )}
                      </div>
                      {activity.description && (
                        <p className="text-sm text-[#787878]">
                          {activity.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* External Links */}
          <div className="bg-white rounded-xl shadow-md border border-[rgba(232,232,232,1)] p-6 mb-8">
            <h2 className="text-xl font-bold text-[#2F3C96] mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#2F3C96]" />
              External Links
            </h2>
            <div className="flex flex-wrap gap-3">
              {profile.externalLinks?.googleScholar && (
                <a
                  href={profile.externalLinks.googleScholar}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-[rgba(232,233,242,1)] text-[#2F3C96] rounded-lg text-sm font-semibold hover:bg-[rgba(209,211,229,1)] transition-colors flex items-center gap-2 border border-[rgba(209,211,229,1)] hover:shadow-md"
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
                  className="px-4 py-2 bg-[rgba(245,242,248,1)] text-[#D0C4E2] rounded-lg text-sm font-semibold hover:bg-[rgba(232,224,239,1)] transition-colors flex items-center gap-2 border border-[#D0C4E2] hover:shadow-md"
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
                  className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-2 border border-emerald-200 hover:shadow-md"
                >
                  <Users className="w-4 h-4" />
                  ResearchGate
                </a>
              )}
              {profile.externalLinks?.orcid && (
                <a
                  href={profile.externalLinks.orcid}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-[rgba(232,233,242,1)] text-[#2F3C96] rounded-lg text-sm font-semibold hover:bg-[rgba(209,211,229,1)] transition-colors flex items-center gap-2 border border-[rgba(209,211,229,1)] hover:shadow-md"
                >
                  <LinkIcon className="w-4 h-4" />
                  ORCID
                </a>
              )}
              {profile.externalLinks?.institutional && (
                <a
                  href={profile.externalLinks.institutional}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-[#F5F5F5] text-[#787878] rounded-lg text-sm font-semibold hover:bg-[rgba(232,232,232,1)] transition-colors flex items-center gap-2 border border-[rgba(232,232,232,1)] hover:shadow-md"
                >
                  <Building2 className="w-4 h-4" />
                  Institutional Page
                </a>
              )}
            </div>
          </div>

          {/* Collaboration CTAs */}
          <div className="bg-gradient-to-br from-[rgba(232,233,242,1)] to-[rgba(245,242,248,1)] rounded-xl shadow-md border border-[rgba(209,211,229,1)] p-6">
            <h2 className="text-xl font-bold text-[#2F3C96] mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#2F3C96]" />
              Collaboration
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#787878]">
                <Info className="w-4 h-4 text-[#2F3C96]" />
                <span className="text-sm">
                  Messaging unavailable — this expert is not yet on Collabiora.
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    if (!user?._id && !user?.id) {
                      toast.error("Please sign in to invite experts");
                      return;
                    }
                    if (hasInvited) {
                      toast.info("You have already invited this expert");
                      return;
                    }
                    setContactModal(true);
                  }}
                  disabled={hasInvited || inviteLoading || checkingInvite}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    hasInvited
                      ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100 border"
                      : "bg-[#2F3C96] text-white hover:bg-[#253075]"
                  }`}
                >
                  {inviteLoading || checkingInvite ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : hasInvited ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  {hasInvited ? "Invited" : "Invite to Platform"}
                </button>
                <button
                  onClick={() =>
                    toggleFavorite(
                      "expert",
                      profile.orcid || profile.name,
                      profile
                    )
                  }
                  disabled={favoritingItems.has(
                    getFavoriteKey(profile, "expert")
                  )}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 border disabled:opacity-50 disabled:cursor-not-allowed ${
                    isExpertFavorited
                      ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {favoritingItems.has(getFavoriteKey(profile, "expert")) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Heart
                      className={`w-4 h-4 ${
                        isExpertFavorited ? "fill-current" : ""
                      }`}
                    />
                  )}
                  {isExpertFavorited ? "Following" : "Follow Expert"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
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
        title="Key insights"
      >
        <div className="space-y-4">
          <div className="pb-4 border-b border-[rgba(209,211,229,1)]">
            <h4 className="font-bold text-[#2F3C96] text-lg">
              {summaryModal.title}
            </h4>
          </div>
          {summaryModal.loading ? (
            <div className="flex items-center gap-2 text-[#2F3C96]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Generating summary...</span>
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
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto space-y-6 px-6 pt-6 pb-24">
              {/* Header */}
              <div className="pb-4 border-b border-[rgba(232,232,232,0.6)]">
                <h3 className="text-xl font-bold text-[#2F3C96] mb-3 leading-tight">
                  {publicationDetailsModal.publication.title}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {publicationDetailsModal.publication.pmid && (
                    <span className="inline-flex items-center px-3 py-1 bg-[rgba(232,233,242,1)] text-[#2F3C96] text-xs font-medium rounded-md border border-[rgba(209,211,229,1)]">
                      <FileText className="w-3 h-3 mr-1.5" />
                      PMID: {publicationDetailsModal.publication.pmid}
                    </span>
                  )}
                  {publicationDetailsModal.publication.journal && (
                    <span className="inline-flex items-center px-3 py-1 bg-[#F5F5F5] text-[#787878] text-xs font-medium rounded-md border border-[rgba(232,232,232,1)]">
                      <BookOpen className="w-3 h-3 mr-1.5" />
                      {publicationDetailsModal.publication.journal}
                    </span>
                  )}
                </div>
              </div>

              {/* Abstract Section */}
              {(publicationDetailsModal.publication.abstract ||
                publicationDetailsModal.publication.snippet) && (
                <div>
                  <div className="bg-gradient-to-br from-[rgba(232,233,242,0.5)] to-[rgba(245,242,248,0.5)] rounded-xl p-5 border border-[rgba(209,211,229,0.5)]">
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

              {/* Authors Section */}
              {publicationDetailsModal.publication.authors &&
                Array.isArray(publicationDetailsModal.publication.authors) &&
                publicationDetailsModal.publication.authors.length > 0 && (
                  <div>
                    <div className="bg-white rounded-xl p-5 border border-[rgba(232,232,232,0.6)] shadow-sm">
                      <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-[#787878]">
                        <User className="w-4 h-4" />
                        Authors
                      </h4>
                      <p className="text-sm text-[#787878] leading-relaxed">
                        {publicationDetailsModal.publication.authors
                          .map((a) => (typeof a === "string" ? a : a.name || a))
                          .join(", ")}
                      </p>
                      {publicationDetailsModal.publication.authors.length >
                        1 && (
                        <p className="text-xs text-[#787878] mt-2">
                          {publicationDetailsModal.publication.authors.length}{" "}
                          authors
                        </p>
                      )}
                    </div>
                  </div>
                )}

              {/* Publication Metadata Cards */}
              <div>
                <div className="bg-white rounded-xl p-5 border border-[rgba(232,232,232,0.6)] shadow-sm">
                  <h4 className="font-semibold mb-4 flex items-center gap-2 text-sm uppercase tracking-wide text-[#787878]">
                    <Calendar className="w-4 h-4" />
                    Publication Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Publication Date */}
                    {(publicationDetailsModal.publication.year ||
                      publicationDetailsModal.publication.month) && (
                      <div className="bg-[rgba(245,245,245,0.5)] rounded-lg p-3 border border-[rgba(232,232,232,0.5)]">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#787878]" />
                          <span className="text-xs font-medium text-[#787878] uppercase tracking-wide">
                            Published
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-[#2F3C96]">
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
                      <div className="bg-[rgba(245,245,245,0.5)] rounded-lg p-3 border border-[rgba(232,232,232,0.5)]">
                        <div className="flex items-center gap-2 mb-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-[#787878]" />
                          <span className="text-xs font-medium text-[#787878] uppercase tracking-wide">
                            Volume / Issue
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-[#2F3C96]">
                          {publicationDetailsModal.publication.volume || "N/A"}
                          {publicationDetailsModal.publication.issue
                            ? ` (Issue ${publicationDetailsModal.publication.issue})`
                            : ""}
                        </p>
                      </div>
                    )}

                    {/* Pages */}
                    {publicationDetailsModal.publication.pages && (
                      <div className="bg-[rgba(245,245,245,0.5)] rounded-lg p-3 border border-[rgba(232,232,232,0.5)]">
                        <div className="flex items-center gap-2 mb-1.5">
                          <FileText className="w-3.5 h-3.5 text-[#787878]" />
                          <span className="text-xs font-medium text-[#787878] uppercase tracking-wide">
                            Pages
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-[#2F3C96]">
                          {publicationDetailsModal.publication.pages}
                        </p>
                      </div>
                    )}

                    {/* Citations */}
                    {(publicationDetailsModal.publication.citations ||
                      publicationDetailsModal.publication.citations === 0) && (
                      <div className="bg-[rgba(245,245,245,0.5)] rounded-lg p-3 border border-[rgba(232,232,232,0.5)]">
                        <div className="flex items-center gap-2 mb-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-[#787878]" />
                          <span className="text-xs font-medium text-[#787878] uppercase tracking-wide">
                            Citations
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-[#2F3C96]">
                          {publicationDetailsModal.publication.citations || 0}
                        </p>
                      </div>
                    )}

                    {/* DOI */}
                    {publicationDetailsModal.publication.doi && (
                      <div className="bg-[rgba(245,245,245,0.5)] rounded-lg p-3 border border-[rgba(232,232,232,0.5)]">
                        <div className="flex items-center gap-2 mb-1.5">
                          <LinkIcon className="w-3.5 h-3.5 text-[#787878]" />
                          <span className="text-xs font-medium text-[#787878] uppercase tracking-wide">
                            DOI
                          </span>
                        </div>
                        <a
                          href={`https://doi.org/${publicationDetailsModal.publication.doi}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-semibold text-[#2F3C96] hover:text-[#253075] hover:underline break-all"
                        >
                          {publicationDetailsModal.publication.doi}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Actions Footer */}
            <div className="sticky bottom-0 px-6 py-4 border-t border-[rgba(232,232,232,0.6)] bg-white/95 backdrop-blur-sm shadow-lg">
              <div className="flex flex-wrap gap-3">
                {publicationDetailsModal.publication.link && (
                  <a
                    href={publicationDetailsModal.publication.link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 px-4 py-2.5 bg-[#2F3C96] text-white rounded-lg text-sm font-semibold hover:bg-[#253075] transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on{" "}
                    {publicationDetailsModal.publication.pmid
                      ? "PubMed"
                      : "Source"}
                  </a>
                )}
                <button
                  onClick={() =>
                    toggleFavorite(
                      "publication",
                      publicationDetailsModal.publication.pmid ||
                        publicationDetailsModal.publication.id ||
                        publicationDetailsModal.publication.link,
                      publicationDetailsModal.publication
                    )
                  }
                  disabled={favoritingItems.has(
                    getFavoriteKey(
                      publicationDetailsModal.publication,
                      "publication"
                    )
                  )}
                  className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                    favorites.some(
                      (fav) =>
                        fav.type === "publication" &&
                        (fav.item?.title ===
                          publicationDetailsModal.publication.title ||
                          fav.item?.link ===
                            publicationDetailsModal.publication.link ||
                          fav.item?.pmid ===
                            publicationDetailsModal.publication.pmid)
                    )
                      ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {favoritingItems.has(
                    getFavoriteKey(
                      publicationDetailsModal.publication,
                      "publication"
                    )
                  ) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Heart
                      className={`w-4 h-4 ${
                        favorites.some(
                          (fav) =>
                            fav.type === "publication" &&
                            (fav.item?.title ===
                              publicationDetailsModal.publication.title ||
                              fav.item?.link ===
                                publicationDetailsModal.publication.link ||
                              fav.item?.pmid ===
                                publicationDetailsModal.publication.pmid)
                        )
                          ? "fill-current"
                          : ""
                      }`}
                    />
                  )}
                  {favoritingItems.has(
                    getFavoriteKey(
                      publicationDetailsModal.publication,
                      "publication"
                    )
                  )
                    ? "Processing..."
                    : favorites.some(
                        (fav) =>
                          fav.type === "publication" &&
                          (fav.item?.title ===
                            publicationDetailsModal.publication.title ||
                            fav.item?.link ===
                              publicationDetailsModal.publication.link ||
                            fav.item?.pmid ===
                              publicationDetailsModal.publication.pmid)
                      )
                    ? "Remove from Favorites"
                    : "Add to Favorites"}
                </button>
              </div>
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

      {/* Invite to Platform Modal */}
      <Modal
        isOpen={contactModal}
        onClose={() => setContactModal(false)}
        title="Invite to Platform"
      >
        <div className="space-y-4">
          <p className="text-[#787878]">
            Would you like to invite {profile.name} to join Collabiora? We'll send
            them an invitation to create an account on our platform, enabling direct
            communication and collaboration opportunities.
          </p>
          <div className="flex gap-3">
            <button
              onClick={sendInvite}
              disabled={inviteLoading || hasInvited}
              className="flex-1 px-4 py-2 bg-[#2F3C96] text-white rounded-lg font-semibold hover:bg-[#253075] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {inviteLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Send Invite
                </>
              )}
            </button>
            <button
              onClick={() => setContactModal(false)}
              disabled={inviteLoading}
              className="flex-1 px-4 py-2 bg-[#F5F5F5] text-[#787878] rounded-lg font-semibold hover:bg-[rgba(232,232,232,1)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Areas of Expertise Modal */}
      <Modal
        isOpen={interestsModalOpen}
        onClose={() => setInterestsModalOpen(false)}
        title="Areas of Expertise"
      >
        <div className="flex flex-wrap gap-2">
          {(Array.isArray(profile?.areasOfExpertise)
            ? profile.areasOfExpertise
            : profile?.areasOfExpertise
              ? [profile.areasOfExpertise]
              : []
          ).map((area, idx) => {
            const areaText =
              typeof area === "string"
                ? area
                : area?.name || area?.title || String(area);
            return (
              <span
                key={idx}
                className="px-2.5 py-1 bg-[#e8e9f2] text-[#2F3C96] rounded-full text-sm font-medium"
              >
                {areaText}
              </span>
            );
          })}
        </div>
      </Modal>
    </Layout>
  );
}
