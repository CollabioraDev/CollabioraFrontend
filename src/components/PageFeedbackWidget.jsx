import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";

const MOBILE_BREAKPOINT = 768;

export default function PageFeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT,
  );
  const location = useLocation();

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "null");
    setUser(userData);
  }, []);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    setSubmitting(true);
    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const userId = user?._id || user?.id || null;
      const response = await fetch(`${base}/api/page-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId || undefined,
          feedback: feedback.trim(),
          pagePath: location.pathname,
          pageUrl: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

      toast.success("Thank you for your feedback!");
      setIsOpen(false);
      setFeedback("");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Desktop: floating button middle-right with text */}
      {!isMobile && (
        <motion.button
          onClick={() => setIsOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1 px-3 py-3 rounded-l-2xl shadow-lg hover:shadow-xl transition-all duration-300 group bg-white border border-gray-200"
          initial={{ x: 0 }}
          whileHover={{ x: -5 }}
        >
          <img
            src="/feedback.png"
            alt="Page Feedback"
            className="w-8 h-8 group-hover:scale-110 transition-transform"
          />
          <span className="font-semibold text-xs text-[#2F3C96] text-center leading-tight flex flex-col">
            <span>Page</span>
            <span>Feedback</span>
          </span>
        </motion.button>
      )}

      {/* Mobile: round icon button bottom-left (hidden on /yori) */}
      {isMobile && location.pathname !== "/yori" && (
        <motion.button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 left-4 z-40 flex items-center justify-center w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-white border border-gray-200"
          initial={{ opacity: 0.9 }}
          whileTap={{ scale: 0.97 }}
          aria-label="Page Feedback"
        >
          <img
            src="/feedback.png"
            alt="Page Feedback"
            className="w-10 h-10 shrink-0"
          />
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
              className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-gray-100 px-6 pb-4 pt-5">
                <div className="flex items-center gap-3">
                  <img
                    src="/feedback.png"
                    alt="Page Feedback"
                    className="w-10 h-10"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-[#2F3C96]">
                      Page Feedback
                    </h3>
                    <p className="text-sm text-gray-600">
                      Share your thoughts about this page
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-6 py-5">
                <p className="text-sm text-gray-700 mb-3">
                  Tell us about any issues, suggestions, or anything you
                  encountered on this page.
                </p>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Type your feedback here..."
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 shadow-inner focus:border-[#2F3C96] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2F3C96]"
                  rows={6}
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-[#F7F4FB] px-6 py-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !feedback.trim()}
                  className="inline-flex items-center justify-center rounded-full bg-linear-to-r from-[#2F3C96] to-brand-blue-400 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Feedback"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
