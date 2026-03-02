import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Star } from "lucide-react";
import toast from "react-hot-toast";

const MOBILE_BREAKPOINT = 768;

const ROLE_OPTIONS = [
  { value: "patient", label: "Patient" },
  { value: "researcher", label: "Researcher" },
  { value: "both", label: "Both" },
  { value: "other", label: "Other" },
];

const PURPOSE_OPTIONS = [
  { value: "ask-question", label: "Ask a research question" },
  { value: "explore-research", label: "Explore new research" },
  { value: "connect", label: "Connect with researchers/patients" },
  { value: "trials", label: "Look for clinical trials" },
  { value: "share-work", label: "Share my work" },
  { value: "browsing", label: "Just browsing" },
];

const EXPERIENCE_OPTIONS = [
  { id: "excellent", label: "Excellent", stars: 5, ratingValue: "excellent" },
  { id: "good", label: "Good", stars: 4, ratingValue: "good" },
  { id: "fair", label: "Fair", stars: 3, ratingValue: "average" },
  { id: "poor", label: "Poor", stars: 2, ratingValue: "poor" },
  { id: "very-frustrating", label: "Very frustrating", stars: 1, ratingValue: "poor" },
];

const STAR_COLOR = "#D0C4E2"; // site theme light pink / lavender

const FOUND_OPTIONS = [
  { value: "yes-easy", label: "Yes, easily" },
  { value: "yes-effort", label: "Yes, but it took effort" },
  { value: "not-completely", label: "Not completely" },
  { value: "no", label: "No" },
];

const VALUABLE_OPTIONS = [
  { value: "research-explanations", label: "Research explanations" },
  { value: "trial-access", label: "Clinical trial access" },
  { value: "expert-responses", label: "Expert responses" },
  { value: "community", label: "Community discussions" },
  { value: "discovery", label: "Discovery / following others" },
  { value: "transparency", label: "Transparency of research" },
  { value: "not-sure", label: "Not sure yet" },
];

const CONFUSING_OPTIONS = [
  { value: "navigation", label: "Navigation" },
  { value: "language", label: "Understanding research language" },
  { value: "posting", label: "Posting or interacting" },
  { value: "finding-experts", label: "Finding experts" },
  { value: "trial-search", label: "Trial search" },
  { value: "nothing", label: "Nothing was confusing" },
  { value: "other", label: "Other" },
];

const NPS_SCALE = Array.from({ length: 11 }, (_, i) => i); // 0–10

const PATIENT_MATTERS_OPTIONS = [
  { value: "plain-language", label: "Plain-language summaries" },
  { value: "trial-matching", label: "Trial matching" },
  { value: "expert-answers", label: "Answers from verified experts" },
  { value: "community-support", label: "Community support" },
  { value: "study-results", label: "Understanding study results" },
];

const RESEARCHER_MATTERS_OPTIONS = [
  { value: "sharing-publications", label: "Sharing publications" },
  { value: "public-engagement", label: "Public engagement" },
  { value: "recruiting-trials", label: "Recruiting for trials" },
  { value: "building-credibility", label: "Building credibility" },
  { value: "collaboration", label: "Collaboration opportunities" },
];

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [role, setRole] = useState("");
  const [purposes, setPurposes] = useState([]);
  const [experience, setExperience] = useState("");
  const [found, setFound] = useState("");
  const [valuable, setValuable] = useState([]);
  const [confusing, setConfusing] = useState([]);
  const [returnLikelihood, setReturnLikelihood] = useState(null);
  const [improvement, setImprovement] = useState("");
  const [whatMatters, setWhatMatters] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "null");
    const token = localStorage.getItem("token");
    setUser(userData);

    if (!userData || !token) return;

    // If we've already marked this user as having submitted feedback ever, hide widget
    const storedEverKey = `hasSubmittedFeedbackEver_${userData._id || userData.id}`;
    const hasEver = localStorage.getItem(storedEverKey);
    if (hasEver === "true") {
      setHasSubmitted(true);
      return;
    }

    // For backwards compatibility: also respect "today" key, but we'll primarily
    // rely on "ever submitted" from server going forward
    const lastFeedbackDate = localStorage.getItem("lastFeedbackDate");
    const today = new Date().toDateString();
    if (lastFeedbackDate === today) {
      setHasSubmitted(true);
      localStorage.setItem(storedEverKey, "true");
      return;
    }

    // Ask backend if this user has *ever* submitted feedback
    const checkSubmitted = async () => {
      try {
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const res = await fetch(
          `${base}/api/feedback/has-submitted/${userData._id || userData.id}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data?.hasSubmitted) {
          setHasSubmitted(true);
          localStorage.setItem(storedEverKey, "true");
        }
      } catch (error) {
        console.error("Error checking previous feedback submission:", error);
      }
    };

    const userId = userData._id || userData.id;
    const dismissedPromptKey = `feedbackPromptDismissed_${userId}`;
    const promptDismissed = localStorage.getItem(dismissedPromptKey) === "true";

    if (promptDismissed) {
      setShowPrompt(false);
      setShowTeaser(true);
    } else {
      setShowPrompt(true);
      setShowTeaser(false);
    }

    checkSubmitted();
  }, []);

  const toggleMultiSelect = (value, current, setter) => {
    if (current.includes(value)) {
      setter(current.filter((v) => v !== value));
    } else {
      setter([...current, value]);
    }
  };

  const handleSubmit = async () => {
    const experienceConfig = EXPERIENCE_OPTIONS.find(
      (opt) => opt.id === experience,
    );
    const ratingValue = experienceConfig?.ratingValue;

    if (!ratingValue) {
      toast.error("Please rate your experience (question 3).");
      return;
    }

    if (!user?._id && !user?.id) {
      toast.error("Please sign in to submit feedback");
      return;
    }

    const survey = {
      role,
      purposes,
      experience: experienceConfig.id,
      found,
      mostValuable: valuable,
      confusing,
      returnLikelihood,
      improvement: improvement.trim(),
      whatMatters,
    };

    setSubmitting(true);
    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const response = await fetch(`${base}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id || user.id,
          rating: ratingValue, // mapped back into existing schema
          // store structured survey fields explicitly
          ...survey,
          // keep a simple human-readable comment as well
          comment: survey.improvement,
          pageUrl: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

      toast.success("Thank you for helping improve Collabiora!");
      setHasSubmitted(true);
      const storedEverKey = `hasSubmittedFeedbackEver_${user._id || user.id}`;
      localStorage.setItem(storedEverKey, "true");
      localStorage.setItem("lastFeedbackDate", new Date().toDateString());
      setIsOpen(false);
      setRole("");
      setPurposes([]);
      setExperience("");
      setFound("");
      setValuable([]);
      setConfusing([]);
      setReturnLikelihood(null);
      setImprovement("");
      setWhatMatters([]);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (hasSubmitted) {
    return null; // Don't show widget if already submitted today
  }

  // Only show for signed-in users (valid user + token)
  const isSignedIn = Boolean(
    (user?._id || user?.id) && localStorage.getItem("token"),
  );
  if (!isSignedIn) {
    return null;
  }

  // Hide feedback widget on mobile
  if (isMobile) {
    return null;
  }

  const handleLater = () => {
    if (user?._id || user?.id) {
      localStorage.setItem(`feedbackPromptDismissed_${user._id || user.id}`, "true");
    }
    setShowPrompt(false);
    setShowTeaser(true);
  };

  const handleStartSurvey = () => {
    setShowPrompt(false);
    setShowTeaser(true);
    setIsOpen(true);
  };

  return (
    <>
      <AnimatePresence>
        {showPrompt && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px]"
            />
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className="fixed left-1/2 top-1/2 z-50 w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-brand-purple-100 bg-white p-5 shadow-2xl"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[#2F3C96]/75">
                Help us improve Collabiora
              </p>
              <h3 className="mt-2 text-lg font-bold text-[#2F3C96]">
                How has your experience been so far?
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Your quick feedback helps us make Collabiora warmer, clearer, and
                more useful for everyone. This survey takes less than a minute.
              </p>
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleLater}
                  className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800"
                >
                  Later
                </button>
                <button
                  type="button"
                  onClick={handleStartSurvey}
                  className="rounded-full bg-linear-to-r from-[#2F3C96] to-brand-blue-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
                >
                  Share feedback
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Left-attached teaser button appears after "Later" */}
      {showTeaser && (
        <motion.button
          onClick={() => setIsOpen(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-40 px-3 py-4 rounded-r-2xl shadow-lg hover:shadow-xl transition-all duration-300 group"
          style={{ backgroundColor: "#D0C4E2", color: "#2F3C96" }}
          initial={{ x: 0 }}
          whileHover={{ x: 5 }}
        >
          <div
            className="flex items-center gap-2"
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
            }}
          >
            <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform shrink-0 rotate-90" />
            <span className="font-semibold text-sm whitespace-nowrap">
              Feedback survey
            </span>
          </div>
        </motion.button>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-gray-100 px-6 pb-4 pt-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#2F3C96]/70">
                    Collabiora feedback
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-[#2F3C96]">
                    Help us improve Collabiora &lt;3
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    This survey takes less than one minute.
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-5">
                {/* Q1 */}
                <section>
                  <p className="text-sm font-medium text-gray-900">
                    1. I am a:
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ROLE_OPTIONS.map((option) => {
                      const selected = role === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setRole(option.value)}
                          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                            selected
                              ? "border-[#2F3C96] bg-brand-purple-100 text-[#2F3C96]"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Q2 */}
                <section>
                  <p className="text-sm font-medium text-gray-900">
                    2. What brought you to Collabiora today?
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Select all that apply.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {PURPOSE_OPTIONS.map((option) => {
                      const selected = purposes.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            toggleMultiSelect(option.value, purposes, setPurposes)
                          }
                          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                            selected
                              ? "border-[#2F3C96] bg-brand-purple-100 text-[#2F3C96]"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Q3 */}
                <section>
                  <p className="text-sm font-medium text-gray-900">
                    3. Was your experience today?
                  </p>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {EXPERIENCE_OPTIONS.map((option) => {
                      const selected = experience === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setExperience(option.id)}
                          className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm transition-colors ${
                            selected
                              ? "border-[#2F3C96] bg-brand-purple-100 text-[#2F3C96]"
                              : "border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <span className="flex items-center gap-0.5" style={{ color: STAR_COLOR }}>
                            {Array.from({ length: option.stars }).map((_, i) => (
                              <Star key={i} className="h-4 w-4 shrink-0" fill={STAR_COLOR} stroke={STAR_COLOR} />
                            ))}
                          </span>
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Q4 */}
                <section>
                  <p className="text-sm font-medium text-gray-900">
                    4. Did you find what you were looking for?
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {FOUND_OPTIONS.map((option) => {
                      const selected = found === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFound(option.value)}
                          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                            selected
                              ? "border-[#2F3C96] bg-brand-purple-100 text-[#2F3C96]"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Q5 */}
                <section>
                  <p className="text-sm font-medium text-gray-900">
                    5. What felt most valuable?
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Select all that apply.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {VALUABLE_OPTIONS.map((option) => {
                      const selected = valuable.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            toggleMultiSelect(option.value, valuable, setValuable)
                          }
                          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                            selected
                              ? "border-[#2F3C96] bg-brand-purple-100 text-[#2F3C96]"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Q6 */}
                <section>
                  <p className="text-sm font-medium text-gray-900">
                    6. What felt confusing or difficult?
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Select all that apply.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CONFUSING_OPTIONS.map((option) => {
                      const selected = confusing.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            toggleMultiSelect(
                              option.value,
                              confusing,
                              setConfusing,
                            )
                          }
                          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                            selected
                              ? "border-[#2F3C96] bg-brand-purple-100 text-[#2F3C96]"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Q7 */}
                <section>
                  <p className="text-sm font-medium text-gray-900">
                    7. How likely are you to return to Collabiora?
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    0 = Not likely at all, 10 = Extremely likely
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {NPS_SCALE.map((score) => {
                      const selected = returnLikelihood === score;
                      return (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setReturnLikelihood(score)}
                          className={`h-9 w-9 rounded-full border text-xs font-medium transition-colors ${
                            selected
                              ? "border-[#2F3C96] bg-[#2F3C96] text-white"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {score}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Q8 */}
                <section>
                  <p className="text-sm font-medium text-gray-900">
                    8. What is ONE thing we could improve?
                  </p>
                  <textarea
                    value={improvement}
                    onChange={(e) => setImprovement(e.target.value)}
                    placeholder="Be as specific as you like — features, content, workflows, anything."
                    className="mt-3 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-inner focus:border-[#2F3C96] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2F3C96]"
                    rows={3}
                  />
                </section>

                {/* Q9 - Role-based "What matters most" question */}
                {(role === "patient" || role === "researcher" || role === "both") && (
                  <section>
                    <p className="text-sm font-medium text-gray-900">
                      9. What matters most to you?
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Select all that apply.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {/* Show patient options for patient or both */}
                      {(role === "patient" || role === "both") &&
                        PATIENT_MATTERS_OPTIONS.map((option) => {
                          const selected = whatMatters.includes(option.value);
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                toggleMultiSelect(
                                  option.value,
                                  whatMatters,
                                  setWhatMatters,
                                )
                              }
                              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                                selected
                                  ? "border-[#2F3C96] bg-brand-purple-100 text-[#2F3C96]"
                                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      {/* Show researcher options for researcher or both */}
                      {(role === "researcher" || role === "both") &&
                        RESEARCHER_MATTERS_OPTIONS.map((option) => {
                          const selected = whatMatters.includes(option.value);
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                toggleMultiSelect(
                                  option.value,
                                  whatMatters,
                                  setWhatMatters,
                                )
                              }
                              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                                selected
                                  ? "border-[#2F3C96] bg-brand-purple-100 text-[#2F3C96]"
                                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                    </div>
                  </section>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-[#F7F4FB] px-6 py-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-full bg-linear-to-r from-[#2F3C96] to-brand-blue-400 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit feedback"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
