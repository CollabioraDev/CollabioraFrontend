import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Layout from "../components/Layout.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";
import { Loader2, Calendar, ShieldAlert, ThumbsUp, ThumbsDown } from "lucide-react";
import {
  LiveKitRoom,
  VideoConference,
  useParticipants,
  useLocalParticipant,
} from "@livekit/components-react";
import "@livekit/components-styles";

function WaitingForResearcherBanner({ role }) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const others = participants.filter(
    (p) => !localParticipant || p.identity !== localParticipant.identity,
  );

  const show = role === "patient" && others.length === 0;
  if (!show) return null;

  return (
    <div className="mb-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-center justify-between gap-2">
      <span>
        The expert hasn&apos;t joined yet. They&apos;ll be joining shortly — please stay in the room.
      </span>
    </div>
  );
}

function MeetingRoomContent({ tokenPayload }) {
  const navigate = useNavigate();
  const { url, token, role, slotStartUtc, slotEndUtc, appointmentId } = tokenPayload;
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const [tenMinuteWarned, setTenMinuteWarned] = useState(false);
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);
  const [feedbackThumb, setFeedbackThumb] = useState("up");
  const [feedbackReason, setFeedbackReason] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  let scheduledText = "";
  let slotEndMs = null;
  if (slotStartUtc) {
    const start = new Date(slotStartUtc);
    const end = slotEndUtc ? new Date(slotEndUtc) : null;
    const datePart = start.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeStart = start.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    const timeEnd =
      end &&
      end.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
    scheduledText = `${datePart} • ${timeStart}${
      timeEnd ? `–${timeEnd}` : ""
    }`;
    if (end) {
      slotEndMs = end.getTime();
    }
  }

  // Auto-leave once the scheduled 30-minute window has passed
  useEffect(() => {
    if (!slotEndMs) return;
    const now = Date.now();
    const msRemaining = slotEndMs - now;
    if (msRemaining <= 0) {
      toast("This meeting has reached its 30 minute limit.");
      setShowFeedbackPrompt(true);
      return;
    }

    const timer = setTimeout(() => {
      toast("This meeting has reached its 30 minute limit.");
      setShowFeedbackPrompt(true);
    }, msRemaining);

    return () => clearTimeout(timer);
  }, [slotEndMs]);

  useEffect(() => {
    if (!slotEndMs || tenMinuteWarned) return;

    const interval = setInterval(() => {
      const remainingMs = slotEndMs - Date.now();
      if (remainingMs <= 10 * 60 * 1000 && remainingMs > 0) {
        toast("10 minutes remaining");
        setTenMinuteWarned(true);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [slotEndMs, tenMinuteWarned]);

  async function submitMeetingFeedback() {
    try {
      if (!appointmentId) {
        throw new Error("Missing appointment id for feedback");
      }
      if (feedbackThumb === "down" && !feedbackReason.trim()) {
        toast.error("Please tell us what went wrong.");
        return;
      }
      setSubmittingFeedback(true);
      const tokenJwt = localStorage.getItem("token") || "";
      const res = await fetch(`${base}/api/meeting-feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenJwt}`,
        },
        body: JSON.stringify({
          appointmentId,
          thumb: feedbackThumb,
          reason: feedbackThumb === "down" ? feedbackReason.trim() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to submit feedback");
      }

      if (role === "patient" && feedbackThumb === "down") {
        try {
          await fetch(`${base}/api/refunds/request`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${tokenJwt}`,
            },
            body: JSON.stringify({
              appointmentId,
              reason: feedbackReason.trim(),
            }),
          });
        } catch {
          // Feedback should still succeed even if refund request fails.
        }
      }

      toast.success("Feedback submitted. Thank you.");
      navigate(role === "researcher" ? "/dashboard/researcher" : "/dashboard/patient");
    } catch (err) {
      console.error("Error submitting meeting feedback:", err);
      toast.error(err.message || "Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 relative overflow-hidden">
        <AnimatedBackground/>
        <div className="relative pt-16 pb-8 px-2 sm:px-4 md:px-6 lg:px-8 mx-auto max-w-6xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar className="w-5 h-5 text-[#2F3C96]" />
              <h1 className="text-base md:text-lg font-semibold">
                Collabiora Meeting Room
              </h1>
            </div>
          </div>

          {scheduledText && (
            <p className="mb-3 text-xs sm:text-sm text-slate-600">
              <span className="font-medium text-slate-800">Scheduled:</span>{" "}
              {scheduledText}
            </p>
          )}

          <div className="rounded-2xl border border-indigo-100 bg-white/95 shadow-[0_10px_40px_rgba(15,23,42,0.08)] p-2 sm:p-3 md:p-4">
            <LiveKitRoom
              serverUrl={url}
              token={token}
              connect={true}
              audio={true}
              video={true}
              data-lk-theme="default"
              style={{
                height: "70vh",
                borderRadius: "0.75rem",
                overflow: "hidden",
              }}
            >
              <div className="flex flex-col h-full">
                <WaitingForResearcherBanner role={role} />
                <div className="flex-1 min-h-0">
                  <VideoConference />
                </div>
              </div>
            </LiveKitRoom>
          </div>

          {showFeedbackPrompt && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                How did the meeting go?
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Share quick feedback so we can improve quality.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFeedbackThumb("up")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    feedbackThumb === "up"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  Meeting went well
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackThumb("down")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    feedbackThumb === "down"
                      ? "bg-rose-100 text-rose-800 border border-rose-300"
                      : "bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  Meeting did not go well
                </button>
              </div>

              {feedbackThumb === "down" && (
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Why?
                  </label>
                  <textarea
                    value={feedbackReason}
                    onChange={(e) => setFeedbackReason(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#2F3C96] focus:border-[#2F3C96]"
                    placeholder="Tell us what went wrong..."
                  />
                  {role === "patient" && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Submitting thumbs-down feedback as a patient also triggers a
                      refund request for researcher review.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-3 flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      role === "researcher"
                        ? "/dashboard/researcher"
                        : "/dashboard/patient",
                    )
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={submitMeetingFeedback}
                  disabled={submittingFeedback}
                  className="rounded-lg bg-[#2F3C96] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#253075] disabled:opacity-60"
                >
                  {submittingFeedback ? "Submitting..." : "Submit feedback"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default function MeetingRoom() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tokenPayload, setTokenPayload] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (!userData?._id && !userData?.id) {
      toast.error("Please sign in first");
      navigate("/signin");
      return;
    }

    if (!appointmentId) {
      setError("Missing appointment id");
      setLoading(false);
      return;
    }

    const fetchToken = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${base}/api/meetings/${appointmentId}/token`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            },
          },
        );

        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Failed to join meeting");
        }
        setTokenPayload(data);
      } catch (e) {
        console.error("Error fetching meeting token:", e);
        setError(e.message || "Failed to join meeting");
        toast.error(e.message || "Failed to join meeting");
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [appointmentId, base, navigate]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 relative overflow-hidden">
          <AnimatedBackground/>
          <div className="relative pt-24 px-4 md:px-8 mx-auto max-w-3xl pb-12">
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#2F3C96]" />
              <p className="text-sm text-slate-600">
                Preparing your meeting room…
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !tokenPayload) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50/40 to-slate-100 relative overflow-hidden">
          <AnimatedBackground/>
          <div className="relative pt-24 px-4 md:px-8 mx-auto max-w-3xl pb-12">
            <div className="rounded-2xl border border-rose-200 bg-white/90 shadow-sm px-6 py-8 flex flex-col items-center text-center gap-3">
              <ShieldAlert className="w-10 h-10 text-rose-500" />
              <h1 className="text-lg md:text-xl font-semibold text-slate-900">
                Unable to join meeting
              </h1>
              <p className="text-sm text-slate-600 max-w-md">
                {error ||
                  "This meeting is no longer available or you do not have permission to join it."}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center justify-center rounded-lg bg-[#2F3C96] px-4 py-2 text-sm font-medium text-white hover:bg-[#253075]"
                >
                  Try again
                </button>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center justify-center rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-200 border border-slate-200"
                >
                  Go back
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return <MeetingRoomContent tokenPayload={tokenPayload} />;
}

