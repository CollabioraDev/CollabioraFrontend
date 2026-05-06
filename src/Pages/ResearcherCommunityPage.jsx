"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { requireEmailVerification } from "../utils/requireEmailVerification.js";
import {
  Users,
  Plus,
  UserCheck,
  Loader2,
  CheckCircle2,
  X,
  ChevronLeft,
  Clock,
  Lock,
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";

// Avatar: first letter of community name (used when no image)
const CommunityAvatar = ({ community }) => {
  const letter = (community?.name || "?").charAt(0).toUpperCase();
  const bgColor = community?.color || "#673AB7";
  return (
    <div
      className="w-full h-full rounded-full flex items-center justify-center text-white font-bold text-2xl"
      style={{ backgroundColor: bgColor }}
    >
      {letter}
    </div>
  );
};

export default function ResearcherCommunityPage() {
  const { t } = useTranslation("common");
  const { id } = useParams();
  const navigate = useNavigate();
  const [community, setCommunity] = useState(null);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [user, setUser] = useState(() => {
    if (typeof window !== "undefined") {
      return JSON.parse(localStorage.getItem("user") || "{}");
    }
    return {};
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";



  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const userId = user?._id || user?.id || "";
    fetch(`${base}/api/communities/${id}${userId ? `?userId=${userId}` : ""}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load"))))
      .then((data) => {
        setCommunity(data.community);
        setIsFollowing(!!data.community?.isFollowing);
        setIsPending(data.community?.membership?.status === "pending");
      })
      .catch(() => toast.error(t("community.notFound")))
      .finally(() => setLoading(false));
  }, [id, base, user?._id, user?.id, t]);

  useEffect(() => {
    if (!id) return;
    setThreadsLoading(true);
    // Researcher communities: include researcher forum posts (excludeResearcherForum=false)
    const userId = user?._id || user?.id || "";
    fetch(`${base}/api/communities/${id}/threads?limit=20&sort=recent&excludeResearcherForum=false${userId ? `&userId=${userId}` : ""}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setThreads(data.threads || []))
      .catch(() => setThreads([]))
      .finally(() => setThreadsLoading(false));
  }, [id, base, user?._id, user?.id]);

  async function handleJoin() {
    if (!user?._id && !user?.id) {
      toast.error(t("community.signInToJoin"));
      return;
    }
    if (!requireEmailVerification()) return;
    if (!community) return;
    setFollowLoading(true);
    try {
      const res = await fetch(`${base}/api/communities/${community._id}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id || user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t("community.joinFailed"));
      }
      if (data.status === "pending") {
        setIsPending(true);
        setIsFollowing(true);
        setShowJoinModal(false);
        toast.success(data.message || "Request to join sent");
      } else {
        setIsFollowing(true);
        setShowJoinModal(false);
        toast.success(t("community.joined"));
        navigate("/researcher-forums", { state: { redirectCommunityId: community._id } });
      }
    } catch (e) {
      toast.error(e.message || t("community.joinFailed"));
    } finally {
      setFollowLoading(false);
    }
  }

  async function handleLeave() {
    if (!community || !user?._id && !user?.id) return;
    setFollowLoading(true);
    try {
      await fetch(
        `${base}/api/communities/${community._id}/follow?userId=${user._id || user.id}`,
        { method: "DELETE" }
      );
      setIsFollowing(false);
      toast.success(t("community.left"));
    } catch {
      toast.error(t("community.leaveFailed"));
    } finally {
      setFollowLoading(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#F5F5F5] relative pt-24 flex items-center justify-center">
          <AnimatedBackground />
          <Loader2 className="w-10 h-10 text-[#2F3C96] animate-spin relative z-10" />
        </div>
      </Layout>
    );
  }

  if (!community) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#F5F5F5] relative pt-24 flex items-center justify-center">
          <AnimatedBackground />
          <p className="text-[#787878] relative z-10">
            {t("community.notFoundPeriod")}
          </p>
        </div>
      </Layout>
    );
  }

  const image = community.image || community.coverImage;

  return (
    <Layout>
      <div className="min-h-screen bg-[#F5F5F5] relative">
        <AnimatedBackground />
        <div className="relative pt-24 px-4 md:px-8 mx-auto max-w-4xl pb-12">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-[#787878] hover:text-[#2F3C96] mb-6 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {t("ui.back")}
          </button>

          {/* Hero */}
          <div className="bg-white rounded-xl border border-[#E8E8E8] overflow-hidden mb-6 shadow-sm">
            <div className="relative h-48 bg-gradient-to-br from-[#673AB7]/10 to-[#009688]/10">
              {image ? (
                <img src={image} alt={community.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg">
                    <CommunityAvatar community={community} />
                  </div>
                </div>
              )}
              {community.isOfficial && (
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2">
                  <CheckCircle2 className="w-5 h-5 text-[#673AB7]" />
                </div>
              )}
            </div>
            <div className="p-6">
              <h1 className="text-2xl font-bold text-[#2F3C96] mb-2">{community.name}</h1>
              <p className="text-sm text-[#787878] mb-4">
                {community.description || t("community.defaultDescriptionResearcher")}
              </p>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-1.5 text-sm text-[#787878]">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">
                    {t("community.membersCount", {
                      count: community.memberCount?.toLocaleString() ?? 0,
                    })}
                  </span>
                </div>
                {user?._id || user?.id ? (
                  isFollowing ? (
                    isPending ? (
                      <button
                        disabled
                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-100 text-amber-700 transition-all flex items-center gap-2 cursor-default"
                      >
                        <Clock className="w-4 h-4" />
                        {t("community.pendingApproval", { defaultValue: "Pending Approval" })}
                      </button>
                    ) : (
                      <button
                        onClick={handleLeave}
                        disabled={followLoading}
                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#2F3C96]/10 text-[#2F3C96] hover:bg-[#2F3C96]/20 transition-all flex items-center gap-2"
                      >
                        {followLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                        {t("community.joinedButton")}
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => setShowJoinModal(true)}
                      className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#2F3C96] text-white hover:bg-[#253075] transition-all flex items-center gap-2"
                    >
                      {community.isPrivate ? (
                        <>
                          <Lock className="w-4 h-4" />
                          {t("community.requestToJoin", { defaultValue: "Request to Join" })}
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          {t("community.joinCommunity")}
                        </>
                      )}
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => toast.error(t("community.signInToJoin"))}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#2F3C96] text-white hover:bg-[#253075] transition-all flex items-center gap-2"
                  >
                    {community.isPrivate ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {community.isPrivate
                      ? t("community.requestToJoin", { defaultValue: "Request to Join" })
                      : t("community.joinCommunity")}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Discussions */}
          <div className="bg-white rounded-xl border border-[#E8E8E8] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#2F3C96] mb-4">
              {t("community.discussionsTitle")}
            </h2>
            {community.isPrivate && (!isFollowing || isPending) ? (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100">
                  {isPending ? (
                    <Clock className="w-8 h-8 text-amber-600" />
                  ) : (
                    <Lock className="w-8 h-8 text-amber-600" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-[#2F3C96] mb-2">
                  {isPending ? "Request Pending" : "Private Community"}
                </h3>
                <p className="text-[#787878] text-sm max-w-sm mx-auto leading-relaxed">
                  {isPending
                    ? "Your request to join is currently being reviewed by an administrator. You'll gain access to the discussions once approved."
                    : "This community is gated. You must request access and be approved by an administrator to view discussions and participate."}
                </p>
                {!isFollowing && (
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="mt-6 px-6 py-2.5 bg-[#2F3C96] text-white rounded-xl font-semibold text-sm hover:bg-[#253075] transition-all shadow-md inline-flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    Request Access
                  </button>
                )}
              </div>
            ) : threadsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#2F3C96] animate-spin" />
              </div>
            ) : threads.length === 0 ? (
              <p className="text-[#787878] text-sm py-6">
                {t("community.noDiscussionsYet")}
              </p>
            ) : (
              <ul className="space-y-3">
                {threads.map((thread) => (
                  <li key={thread._id}>
                    <button
                      type="button"
                      onClick={() => navigate("/researcher-forums", { state: { redirectCommunityId: community._id, openThreadId: thread._id } })}
                      className="w-full text-left px-4 py-3 rounded-lg border border-[#E8E8E8] hover:border-[#673AB7]/30 hover:bg-[#673AB7]/5 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-[#484848] line-clamp-1 flex-1 min-w-0">{thread.title}</p>
                        <span
                          className={`shrink-0 inline-flex items-center ${thread.hasResearcherReply ? "text-emerald-600" : "text-amber-600"
                            }`}
                          title={
                            thread.hasResearcherReply
                              ? t("community.researcherReplied")
                              : thread.onlyResearchersCanReply
                                ? t("community.awaitingResearcherReply")
                                : t("community.awaitingReply")
                          }
                        >
                          {thread.hasResearcherReply ? (
                            <CheckCircle2 className="w-4 h-4" aria-hidden />
                          ) : (
                            <Clock className="w-4 h-4" aria-hidden />
                          )}
                          <span className="sr-only">
                            {thread.hasResearcherReply
                              ? t("community.researcherReplied")
                              : thread.onlyResearchersCanReply
                                ? t("community.awaitingResearcherReply")
                                : t("community.awaitingReply")}
                          </span>
                        </span>
                      </div>
                      <p className="text-xs text-[#787878] mt-1">
                        {t("community.threadMeta", {
                          username: thread.authorUserId?.username ?? "—",
                          count: thread.replyCount ?? 0,
                        })}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {(!community.isPrivate || (isFollowing && !isPending)) && (
              <button
                onClick={() =>
                  navigate("/researcher-forums", {
                    state: { redirectCommunityId: community._id },
                  })
                }
                className="mt-4 w-full py-2.5 rounded-lg border border-[#673AB7] text-[#673AB7] text-sm font-semibold hover:bg-[#673AB7]/10 transition-all"
              >
                {t("community.viewAllOnResearcherForums")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Join guidelines modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-[#E8E8E8]">
            <div className="p-6 border-b border-[#E8E8E8]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#2F3C96]">
                  {t("community.welcomeTitle")}
                </h2>
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="p-2 text-[#787878] hover:text-[#2F3C96] hover:bg-[#F5F5F5] rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-[#787878] mt-1">{community.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#484848]">{t("community.followRulesTitle")}</p>
              <div className="bg-[#F5F5F5] rounded-lg p-4 border border-[#E8E8E8] space-y-4 text-sm text-[#484848]">
                <h3 className="font-semibold text-[#2F3C96]">{t("community.guidelinesTitle")}</h3>
                <p>{t("community.guidelinesIntro")}</p>
                <div>
                  <h4 className="font-semibold text-[#2F3C96] mb-2">{t("community.respectTitle")}</h4>
                  <ul className="list-disc list-inside space-y-1 text-[#484848]">
                    <li>{t("community.respect1")}</li>
                    <li>{t("community.respect2")}</li>
                    <li>{t("community.respect3")}</li>
                    <li>{t("community.respect4")}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-[#2F3C96] mb-2">{t("community.medicalTitle")}</h4>
                  <p className="mb-2">{t("community.medicalLead")}</p>
                  <ul className="list-disc list-inside space-y-1 text-[#484848]">
                    <li>{t("community.medical1")}</li>
                    <li>{t("community.medical2")}</li>
                    <li>{t("community.medical3")}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-[#2F3C96] mb-2">{t("community.privacyTitle")}</h4>
                  <ul className="list-disc list-inside space-y-1 text-[#484848]">
                    <li>{t("community.privacy1")}</li>
                    <li>{t("community.privacy2")}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-[#2F3C96] mb-2">{t("community.moderationTitle")}</h4>
                  <p className="text-[#484848]">{t("community.moderationP1")}</p>
                  <p className="mt-2 text-[#484848]">{t("community.moderationP2")}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleJoin}
                  disabled={followLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#673AB7] text-white rounded-lg text-sm font-semibold hover:bg-[#5E35B1] transition-all disabled:opacity-70"
                >
                  {followLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {t("community.agreeAndJoin")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-6 py-2.5 bg-[#F5F5F5] text-[#787878] rounded-lg text-sm font-medium hover:bg-[#E8E8E8] transition-all"
                >
                  {t("ui.cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
