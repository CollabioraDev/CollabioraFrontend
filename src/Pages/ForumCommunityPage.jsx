"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { requireEmailVerification } from "../utils/requireEmailVerification.js";
import {
  MessageCircle,
  Users,
  Plus,
  UserCheck,
  Loader2,
  CheckCircle2,
  X,
  ChevronLeft,
  Clock,
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
import Layout from "../components/Layout.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";

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
  };
  const IconComponent =
    iconMap[slug] ||
    iconMap[name?.toLowerCase().replace(/\s+/g, "-")] ||
    IconStethoscope;
  return IconComponent;
};

const CommunityIcon = ({ community, size = "1.125rem", style = {} }) => {
  const IconComponent = getCommunityIcon(community?.slug, community?.name);
  const iconColor = style.color || community?.color || "#2F3C96";
  return (
    <IconComponent
      className="shrink-0"
      style={{ color: iconColor, width: size, height: size, ...style }}
      stroke={1.5}
    />
  );
};

export default function ForumCommunityPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [community, setCommunity] = useState(null);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    setUser(JSON.parse(localStorage.getItem("user") || "{}"));
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const userId = user?._id || user?.id || "";
    fetch(`${base}/api/communities/${id}${userId ? `?userId=${userId}` : ""}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load"))))
      .then((data) => {
        setCommunity(data.community);
        setIsFollowing(!!data.community?.isFollowing);
      })
      .catch(() => toast.error("Community not found"))
      .finally(() => setLoading(false));
  }, [id, base, user?._id, user?.id]);

  useEffect(() => {
    if (!id) return;
    setThreadsLoading(true);
    fetch(`${base}/api/communities/${id}/threads?limit=20&sort=recent`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setThreads(data.threads || []))
      .catch(() => setThreads([]))
      .finally(() => setThreadsLoading(false));
  }, [id, base]);

  async function handleJoin() {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to join");
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
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to join");
      }
      setIsFollowing(true);
      setShowJoinModal(false);
      toast.success("Joined community!");
      navigate("/forums", { state: { redirectCommunityId: community._id } });
    } catch (e) {
      toast.error(e.message || "Failed to join");
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
      toast.success("Left community");
    } catch {
      toast.error("Failed to leave");
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
          <p className="text-[#787878] relative z-10">Community not found.</p>
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
            onClick={() => navigate("/forums")}
            className="flex items-center gap-2 text-sm text-[#787878] hover:text-[#2F3C96] mb-6 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Forums
          </button>

          {/* Hero */}
          <div className="bg-white rounded-xl border border-[#E8E8E8] overflow-hidden mb-6 shadow-sm">
            <div className="relative h-48 bg-gradient-to-br from-[#2F3C96]/10 to-[#D0C4E2]/10">
              {image ? (
                <img src={image} alt={community.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: community.color || "#2F3C96" }}
                  >
                    <CommunityIcon community={community} size="3rem" style={{ color: "#FFFFFF" }} />
                  </div>
                </div>
              )}
              {community.isOfficial && (
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2">
                  <CheckCircle2 className="w-5 h-5 text-[#2F3C96]" />
                </div>
              )}
            </div>
            <div className="p-6">
              <h1 className="text-2xl font-bold text-[#2F3C96] mb-2">{community.name}</h1>
              <p className="text-sm text-[#787878] mb-4">
                {community.description || "Join this community to connect with others."}
              </p>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-1.5 text-sm text-[#787878]">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">{community.memberCount?.toLocaleString() ?? 0} members</span>
                </div>
                {user?._id || user?.id ? (
                  isFollowing ? (
                    <button
                      onClick={handleLeave}
                      disabled={followLoading}
                      className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#2F3C96]/10 text-[#2F3C96] hover:bg-[#2F3C96]/20 transition-all flex items-center gap-2"
                    >
                      {followLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                      Joined
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowJoinModal(true)}
                      className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#2F3C96] text-white hover:bg-[#253075] transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Join community
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => toast.error("Please sign in to join")}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#2F3C96] text-white hover:bg-[#253075] transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Join community
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Discussions */}
          <div className="bg-white rounded-xl border border-[#E8E8E8] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#2F3C96] mb-4">Discussions</h2>
            {threadsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#2F3C96] animate-spin" />
              </div>
            ) : threads.length === 0 ? (
              <p className="text-[#787878] text-sm py-6">No discussions yet. Be the first to start one!</p>
            ) : (
              <ul className="space-y-3">
                {threads.map((thread) => (
                  <li key={thread._id}>
                    <button
                      type="button"
                      onClick={() => navigate("/forums", { state: { redirectCommunityId: community._id, openThreadId: thread._id } })}
                      className="w-full text-left px-4 py-3 rounded-lg border border-[#E8E8E8] hover:border-[#2F3C96]/30 hover:bg-[#2F3C96]/5 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-[#484848] line-clamp-1 flex-1 min-w-0">{thread.title}</p>
                        <span
                          className={`shrink-0 inline-flex items-center ${
                            thread.hasResearcherReply ? "text-emerald-600" : "text-amber-600"
                          }`}
                          title={
                            thread.hasResearcherReply
                              ? "Researcher replied"
                              : thread.onlyResearchersCanReply
                                ? "Awaiting researcher reply"
                                : "Awaiting reply"
                          }
                        >
                          {thread.hasResearcherReply ? (
                            <CheckCircle2 className="w-4 h-4" aria-hidden />
                          ) : (
                            <Clock className="w-4 h-4" aria-hidden />
                          )}
                          <span className="sr-only">
                            {thread.hasResearcherReply ? "Researcher replied" : thread.onlyResearchersCanReply ? "Awaiting researcher reply" : "Awaiting reply"}
                          </span>
                        </span>
                      </div>
                      <p className="text-xs text-[#787878] mt-1">
                        {thread.authorUserId?.username ?? "—"} · {thread.replyCount ?? 0} replies
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => navigate("/forums", { state: { redirectCommunityId: community._id } })}
              className="mt-4 w-full py-2.5 rounded-lg border border-[#2F3C96] text-[#2F3C96] text-sm font-semibold hover:bg-[#2F3C96]/10 transition-all"
            >
              View all discussions on Forums
            </button>
          </div>
        </div>
      </div>

      {/* Join guidelines modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-[#E8E8E8]">
            <div className="p-6 border-b border-[#E8E8E8]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#2F3C96]">Welcome to the community</h2>
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
              <p className="text-sm text-[#484848]">Make sure to follow these rules:</p>
              <div className="bg-[#F5F5F5] rounded-lg p-4 border border-[#E8E8E8] space-y-4 text-sm text-[#484848]">
                <h3 className="font-semibold text-[#2F3C96]">Community Guidelines</h3>
                <p>
                  Collabiora is a space for respectful, educational discussion about health research. By participating, you agree to:
                </p>
                <div>
                  <h4 className="font-semibold text-[#2F3C96] mb-2">Respect & Conduct</h4>
                  <ul className="list-disc list-inside space-y-1 text-[#484848]">
                    <li>Treat all members with respect and kindness</li>
                    <li>Do not use offensive, discriminatory, or harassing language</li>
                    <li>Do not promote political agendas, conspiracy theories, or misinformation</li>
                    <li>Stay focused on health research and educational topics</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-[#2F3C96] mb-2">Medical Disclaimer</h4>
                  <p className="mb-2">Collabiora does not provide medical advice.</p>
                  <ul className="list-disc list-inside space-y-1 text-[#484848]">
                    <li>Do not ask for personal diagnoses or treatment recommendations</li>
                    <li>Information shared is for educational purposes only</li>
                    <li>Always consult your healthcare provider for medical decisions</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-[#2F3C96] mb-2">Privacy</h4>
                  <ul className="list-disc list-inside space-y-1 text-[#484848]">
                    <li>Do not share personal identifying medical information</li>
                    <li>Do not post another person&apos;s private data</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-[#2F3C96] mb-2">Moderation Rights</h4>
                  <p className="text-[#484848]">
                    Collabiora reserves the right to remove posts or restrict accounts that violate these guidelines.
                  </p>
                  <p className="mt-2 text-[#484848]">
                    Our goal is to maintain a safe, supportive, and scientifically grounded community.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleJoin}
                  disabled={followLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2F3C96] text-white rounded-lg text-sm font-semibold hover:bg-[#253075] transition-all disabled:opacity-70"
                >
                  {followLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  I agree & Join
                </button>
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-6 py-2.5 bg-[#F5F5F5] text-[#787878] rounded-lg text-sm font-medium hover:bg-[#E8E8E8] transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
