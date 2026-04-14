import React, { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

const STORAGE_KEY = "collabiora_yori_guest_tutorial_done";

/** Tutorial steps: add entries here (image in /public). */
export const YORI_GUEST_TUTORIAL_STEPS = [
  {
    id: "navbar",
    title: "Let's start with Navbar",
    subtitle: "Explore, Forums, Discovery, and Create account",
    paragraphs: [
      "Open **Explore** to use the dropdown — jump to the Health Library, Health Experts, New Treatments, and other entry points without hunting through the site.",
      "**Forums** is right there when you want community discussions; **Discovery** is where you can browse the latest articles, research, and updates in one place.",
      "Ready to stay signed in and unlock everything? Use **Create account** to set up your profile and tailor collabiora to you.",
    ],
    imageSrc: "/NavbarSS.png",
    imageAlt:
      "collabiora site header showing Explore, Forums, Discovery, and Create account",
  },
  {
    id: "dashboard",
    title: "Your dashboard after sign-in",
    subtitle: "Built around how you work",
    paragraphs: [
      "Once you create an account, your **dashboard** becomes home base: quick links to Health Library, treatments, experts, forums, favourites, and meetings.",
      "You can **generate summary reports**, **refresh** tailored content, and keep the topics you care about in one place.",
    ],
    imageSrc: "/DashboardSS.png",
    imageAlt:
      "collabiora dashboard with feature cards and medical condition filters",
  },
  {
    id: "health-library",
    title: "Health Library search",
    subtitle: "Research, matched to you",
    paragraphs: [
      "Search with keywords and filters to surface papers and evidence. Each result shows a **match score** so you see what fits best first.",
      "Use **Simplify** to turn dense studies into plain language, save favourites, and open the full publication when you need depth.",
    ],
    imageSrc: "/HealthLibrary.png",
    imageAlt: "Health Library search results with match percentages",
  },
  {
    id: "discovery",
    title: "Discovery",
    subtitle: "News, articles, and community in one place",
    paragraphs: [
      "Under **News & Articles**, browse curated health stories and updates tailored to your interests — search what matters to you, then read or simplify content so it’s easier to digest.",
      "Switch to **Community** when you want to join the conversation: share experiences, ask questions, and see what others are posting in a space built for open, supportive discussion.",
    ],
    imageSrc: "/DiscoverySS.png",
    imageAlt:
      "Discovery page with News and Articles tab, Community tab, search, and article cards",
  },
  {
    id: "forums",
    title: "Health Forums",
    subtitle: "Communities, posts, and answers that meet you where you are",
    paragraphs: [
      "The **Communities** tab is where you explore and join groups — search for topics that matter to you, discover research-focused spaces, and become part of conversations with people on similar paths.",
      "Switch to **Posts** to read threads or start your own: ask questions, share what you’ve learned, and get replies from community members and **researchers** who participate in those groups — so you’re not just browsing, you’re connecting.",
    ],
    imageSrc: "/ForumsSS.png",
    imageAlt:
      "Health Forums page with Communities and Posts tabs, search, and community cards",
  },
  {
    id: "yori",
    title: "You’re already with Yori",
    subtitle: "This very screen",
    paragraphs: [
      "This is where you **chat with Yori** — ask health questions, try suggested prompts, and follow up naturally.",
      "Sign in anytime to sync your journey across the full collabiora experience.",
    ],
    imageSrc: "/YoriLandingSS.png",
    imageAlt: "Yori assistant welcome panel with sample questions",
  },
];

function renderRichParagraph(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-[#2F3C96]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export function isYoriGuestTutorialDone() {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markYoriGuestTutorialDone() {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export default function YoriGuestTutorialOverlay({ open, onClose }) {
  const titleId = useId();
  const [step, setStep] = useState(0);
  const total = YORI_GUEST_TUTORIAL_STEPS.length;
  const isLast = step >= total - 1;
  const current = YORI_GUEST_TUTORIAL_STEPS[step];

  useEffect(() => {
    if (!open) setStep(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleSkip = useCallback(() => {
    markYoriGuestTutorialDone();
    onClose?.();
  }, [onClose]);

  const handleNext = useCallback(() => {
    if (isLast) {
      markYoriGuestTutorialDone();
      onClose?.();
      return;
    }
    setStep((s) => Math.min(s + 1, total - 1));
  }, [isLast, onClose, total]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") handleSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleSkip]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && current && (
        <motion.div
          className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-5 md:p-7"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <div
            className="absolute inset-0 bg-black/35 backdrop-blur-md"
            aria-hidden
          />

          {/* Floating panel */}
          <motion.div
            className="relative flex h-[min(92vh,calc(100vh-1.5rem))] w-full max-w-[min(1180px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-[#D1D3E5]/90 bg-white/95 shadow-[0_28px_90px_-20px_rgba(47,60,150,0.35)] sm:rounded-3xl lg:flex-row"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              <div className="relative flex min-h-[32vh] flex-[1.12] items-center justify-center p-3 sm:p-5 lg:min-h-0 lg:p-8">
                <motion.div
                  key={current.id}
                  className="relative w-full max-w-[900px]"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32 }}
                >
                  <div className="relative overflow-hidden rounded-xl border border-[#D1D3E5]/80 bg-white shadow-[0_18px_44px_-14px_rgba(47,60,150,0.22)] sm:rounded-2xl">
                    <div className="p-1.5 sm:p-2">
                      <img
                        src={current.imageSrc}
                        alt={current.imageAlt}
                        className="mx-auto max-h-[min(38vh,480px)] w-full rounded-lg object-contain object-top sm:max-h-[min(44vh,520px)] lg:max-h-[min(58vh,600px)]"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="flex min-h-0 min-w-0 flex-[0.88] flex-col border-t border-[#D1D3E5]/90 bg-white/75 lg:flex-row lg:border-l lg:border-t-0">
                <div className="flex min-h-0 flex-1 flex-col justify-between gap-4 overflow-y-auto px-4 py-4 sm:px-7 sm:py-7">
                  <div>
                    <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.25em] text-[#8B7EC8]">
                      Part {String(step + 1).padStart(2, "0")} —{" "}
                      {total.toString().padStart(2, "0")}
                    </p>
                    <h2
                      id={titleId}
                      className="text-xl font-bold leading-tight text-[#2F3C96] sm:text-2xl"
                    >
                      {current.title}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-[#5c6488]">
                      {current.subtitle}
                    </p>
                    <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700 sm:mt-5 sm:text-[15px]">
                      {current.paragraphs.map((p, i) => (
                        <p key={i}>{renderRichParagraph(p)}</p>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <div
                      className="flex gap-1.5"
                      role="tablist"
                      aria-label="Tutorial progress"
                    >
                      {YORI_GUEST_TUTORIAL_STEPS.map((s, i) => (
                        <button
                          key={s.id}
                          type="button"
                          role="tab"
                          aria-selected={i === step}
                          onClick={() => setStep(i)}
                          className={`h-2 rounded-full transition-all ${
                            i === step
                              ? "w-8 bg-[#2F3C96]"
                              : "w-2 bg-[#D0C4E2] hover:bg-[#b8a8d8]"
                          }`}
                          aria-label={`Go to step ${i + 1}`}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="ml-auto text-sm font-semibold text-[#5c6488] underline-offset-4 hover:text-[#2F3C96] hover:underline lg:ml-0"
                    >
                      Skip tour
                    </button>
                  </div>
                </div>

                {/* Vertical strip: “Next” + right arrow (same layout on all breakpoints) */}
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label={
                    isLast
                      ? "Start using Yori"
                      : `Next tutorial step (${step + 2} of ${total})`
                  }
                  className="group flex min-h-[3.25rem] w-full shrink-0 items-center justify-center border-t border-[#D1D3E5]/90 bg-gradient-to-b from-[#2F3C96] to-[#252f78] px-4 py-3 text-white shadow-inner transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3C96] focus-visible:ring-offset-2 lg:h-auto lg:min-h-0 lg:w-[7rem] lg:border-l lg:border-t-0 lg:px-2.5 lg:py-12"
                >
                  <span className="flex flex-row items-center justify-center gap-2.5">
                    <span className="text-sm font-bold uppercase tracking-[0.3em] lg:text-[13px] lg:tracking-[0.25em]">
                      {isLast ? "Begin" : "Next"}
                    </span>
                    <svg
                      className="h-6 w-6 shrink-0 opacity-95 transition group-hover:translate-x-0.5 lg:h-7 lg:w-7"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden
                    >
                      <path
                        d="M5 12h12m0 0l-4-4m4 4l-4 4"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
