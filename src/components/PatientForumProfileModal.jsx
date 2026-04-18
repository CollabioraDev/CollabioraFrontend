import { useEffect, useState, useCallback } from "react";
import {
  X,
  Loader2,
  UserPlus,
  UserCheck,
  MessageCircle,
  Users,
  ChevronRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { requireEmailVerification } from "../utils/requireEmailVerification.js";
import {
  isDummyUserId,
  DUMMY_FORUM_HELPER_ID,
} from "../data/dummyForumThreads.js";

function normalizePublicHandle(s) {
  return String(s || "")
    .replace(/^@+/, "")
    .trim();
}

/**
 * Forum-style profile modal: forums posted, communities, follow.
 * When usernameOnly is true (default), shows @username only — no real/display name.
 * When the user has nameHidden (anonymous to others), only @handle is shown.
 */
export default function PatientForumProfileModal({
  userId,
  onClose,
  currentUser,
  followSource = "Forums",
  onFollowingChange,
  followingUserIds,
  usernameOnly = true,
}) {
  const { t } = useTranslation("common");
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [following, setFollowing] = useState(false);

  const uid = userId?.toString?.() || "";
  const currentId =
    currentUser?._id?.toString?.() || currentUser?.id?.toString?.() || "";

  const refreshFollowing = useCallback(async () => {
    if (!uid || !currentId) {
      setFollowing(false);
      return;
    }
    if (followingUserIds?.has(uid)) {
      setFollowing(true);
      return;
    }
    try {
      const res = await fetch(
        `${base}/api/follow/following-ids?userId=${encodeURIComponent(currentId)}`,
      );
      if (!res.ok) {
        setFollowing(false);
        return;
      }
      const json = await res.json();
      const ids = json.followingIds || [];
      setFollowing(ids.some((id) => id?.toString?.() === uid));
    } catch {
      setFollowing(false);
    }
  }, [base, uid, currentId, followingUserIds]);

  useEffect(() => {
    if (!uid) return;

    if (followingUserIds?.has(uid)) setFollowing(true);
    else setFollowing(false);

    refreshFollowing();
  }, [uid, followingUserIds, refreshFollowing]);

  useEffect(() => {
    if (!uid) {
      setData(null);
      setLoading(false);
      return;
    }

    setData(null);
    setLoading(true);

    if (uid === DUMMY_FORUM_HELPER_ID) {
      setData({
        isForumHelper: true,
        user: { username: "collabiora_forum", role: "patient" },
      });
      setLoading(false);
      return;
    }

    if (isDummyUserId(uid)) {
      const isDummyResearcher =
        typeof uid === "string" && uid.startsWith("dummy-researcher-");
      setData({
        isSampleParticipant: true,
        isDummyResearcher,
        user: isDummyResearcher
          ? { username: "sample_researcher", role: "researcher" }
          : { username: (uid || "").toString(), role: "patient" },
      });
      setLoading(false);
      return;
    }

    fetch(`${base}/api/profile/${uid}/forum-profile`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [base, uid]);

  async function handleFollowToggle() {
    if (!currentUser?._id && !currentUser?.id) {
      toast.error(t("discovery.signInToFollow"));
      return;
    }
    if (!requireEmailVerification()) return;
    if (!uid || followLoading) return;

    const profileRole = data?.user?.role || "patient";
    setFollowLoading(true);
    try {
      if (following) {
        await fetch(`${base}/api/follow`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            followerId: currentUser._id || currentUser.id,
            followingId: uid,
          }),
        });
        setFollowing(false);
        onFollowingChange?.(uid, false);
        toast.success(t("discovery.unfollowed"));
      } else {
        await fetch(`${base}/api/follow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            followerId: currentUser._id || currentUser.id,
            followingId: uid,
            followerRole: currentUser.role,
            followingRole: profileRole || "patient",
            source: followSource,
          }),
        });
        setFollowing(true);
        onFollowingChange?.(uid, true);
        toast.success(t("discovery.following"));
      }
    } catch (e) {
      console.error(e);
      toast.error(
        following ? t("discovery.unfollowFailed") : t("discovery.followFailed"),
      );
    } finally {
      setFollowLoading(false);
    }
  }

  if (!uid) return null;

  const u = data?.user;
  const hideNameForPrivacy = u?.nameHidden === true;
  const handleForAt = normalizePublicHandle(
    u?.publicHandle ?? u?.handle ?? u?.username,
  );
  const showNameLine =
    !hideNameForPrivacy &&
    !usernameOnly &&
    u &&
    (u.displayName || u.username);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-[#E8E8E8]">
        <div className="p-6 border-b border-[#E8E8E8]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#2F3C96]">Profile</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#787878] hover:text-[#2F3C96] hover:bg-[#F5F5F5] rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#2F3C96]" />
            </div>
          ) : data?.user ? (
            <>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#2F3C96] flex items-center justify-center text-white font-semibold text-xl shrink-0 overflow-hidden">
                  {data.user.picture ? (
                    <img
                      src={data.user.picture}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (hideNameForPrivacy
                      ? handleForAt || "U"
                      : data.user.username || "U"
                    )
                      .charAt(0)
                      .toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {showNameLine ? (
                    <>
                      <p className="font-semibold text-[#484848] truncate">
                        {data.user.displayName || data.user.username || "User"}
                      </p>
                      <p className="text-sm text-[#787878]">
                        @{handleForAt || data.user.username || "—"}
                      </p>
                    </>
                  ) : (
                    <p className="font-semibold text-[#484848] truncate">
                      @{handleForAt || "—"}
                    </p>
                  )}
                  {data.user.role &&
                    !data.isForumHelper &&
                    !data.isSampleParticipant && (
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                          data.user.role === "researcher"
                            ? "bg-[#2F3C96]/10 text-[#2F3C96]"
                            : "bg-[#F5F5F5] text-[#787878] border border-[#E8E8E8]"
                        }`}
                      >
                        {data.user.role === "researcher"
                          ? "Researcher"
                          : "Patient"}
                      </span>
                    )}
                </div>
                {currentUser &&
                  currentId &&
                  currentId !== uid &&
                  (data.isForumHelper || data.isSampleParticipant ? (
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
                      type="button"
                      onClick={handleFollowToggle}
                      disabled={followLoading}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors shrink-0 ${
                        following
                          ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          : "bg-[#2F3C96] text-white hover:bg-[#253075]"
                      } disabled:opacity-60`}
                    >
                      {followLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : following ? (
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

              {data.isForumHelper && (
                <p className="text-sm text-[#787878] bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg p-4">
                  This is the collabiora forum helper/tool account. It posts
                  helpful answers in the community. You cannot follow this
                  account.
                </p>
              )}
              {data.isSampleParticipant && (
                <p className="text-sm text-[#787878] bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg p-4">
                  {data.isDummyResearcher
                    ? "This is a sample researcher profile from our forum examples. You cannot follow this account."
                    : "This is a sample participant from our forum examples. You cannot follow this account."}
                </p>
              )}

              {(data.forumsPosted?.length > 0 ||
                data.communitiesJoined?.length > 0) &&
                !data.isForumHelper &&
                !data.isSampleParticipant && (
                  <div className="space-y-4 pt-2 border-t border-[#E8E8E8]">
                    {data.forumsPosted?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-[#484848] mb-2 flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-[#2F3C96]" />
                          Forums posted in
                        </h3>
                        <ul className="space-y-1.5 text-sm text-[#787878]">
                          {data.forumsPosted.slice(0, 10).map((item) => (
                            <li
                              key={item._id}
                              className="flex items-center gap-2"
                            >
                              <ChevronRight className="w-3 h-3 text-[#2F3C96] shrink-0" />
                              <span className="truncate">{item.title}</span>
                              {item.community?.name && (
                                <span className="text-xs text-[#787878] shrink-0">
                                  · {item.community.name}
                                </span>
                              )}
                            </li>
                          ))}
                          {data.forumsPosted.length > 10 && (
                            <li className="text-xs text-[#787878]">
                              +{data.forumsPosted.length - 10} more
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                    {data.communitiesJoined?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-[#484848] mb-2 flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#2F3C96]" />
                          Communities joined
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {data.communitiesJoined
                            .slice(0, 12)
                            .map((c) => (
                              <span
                                key={c._id}
                                className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#2F3C96]/10 text-[#2F3C96]"
                              >
                                {c.name}
                              </span>
                            ))}
                          {data.communitiesJoined.length > 12 && (
                            <span className="px-2.5 py-1 text-xs text-[#787878]">
                              +{data.communitiesJoined.length - 12}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              {!data.forumsPosted?.length &&
                !data.communitiesJoined?.length &&
                !data.isForumHelper &&
                !data.isSampleParticipant && (
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
  );
}
