import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, X } from "lucide-react";

const STORAGE_PREFIX = "curlink_tutorial";

/**
 * Hook to check if a page tutorial has been completed
 */
export function useTutorialCompleted(pageId) {
  const [completed, setCompleted] = useState(() => {
    try {
      return (
        localStorage.getItem(`${STORAGE_PREFIX}_${pageId}_completed`) === "true"
      );
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}_${pageId}_completed`);
      setCompleted(raw === "true");
    } catch {
      setCompleted(false);
    }
  }, [pageId]);
  return completed;
}

/**
 * Mark a page tutorial as completed
 */
export function markTutorialCompleted(pageId) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}_${pageId}_completed`, "true");
    localStorage.setItem(
      `${STORAGE_PREFIX}_${pageId}_completedAt`,
      new Date().toISOString(),
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Reset tutorial completion (for testing or "Show tutorial again")
 */
export function resetTutorialCompleted(pageId) {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}_${pageId}_completed`);
    localStorage.removeItem(`${STORAGE_PREFIX}_${pageId}_completedAt`);
    return true;
  } catch {
    return false;
  }
}

export const TUTORIAL_ADVANCE_EVENT = "curlinkTutorialAdvance";

function getScrollParent(el) {
  let node = el;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    const overflow = style.overflow + style.overflowY + style.overflowX;
    if (/(auto|scroll|overlay)/.test(overflow)) return node;
    node = node.parentElement;
  }
  return window;
}

function rectEquals(a, b) {
  if (!a || !b) return a === b;
  return (
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height
  );
}

/**
 * PageTutorial - Interactive walkthrough with Yori branding
 * @param {string} pageId - Unique ID for tracking (e.g. 'publications')
 * @param {Array<{target: string, title: string, content: string, placement?: string, waitForAction?: boolean, centerTooltip?: boolean}>} steps
 * @param {boolean} enabled - Whether to show
 * @param {() => void} onComplete - Called when tour finishes
 * @param {(stepIndex: number) => void} onStepChange - Called when step changes
 * @param {boolean} [centerTooltip=true] - Keep the tooltip card in the center; target is ring-highlighted only
 *
 * Steps with waitForAction: true require the user to click the target. Use
 * window.dispatchEvent(new CustomEvent(TUTORIAL_ADVANCE_EVENT)) to advance.
 */
function PageTutorial({
  pageId,
  steps,
  enabled,
  onComplete,
  onStepChange,
  centerTooltip: centerTooltipProp = true,
}) {
  const { t } = useTranslation("common");
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [targetRect, setTargetRect] = useState(null);
  const [highlightReady, setHighlightReady] = useState(false);
  const targetElRef = useRef(null);

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const totalSteps = steps.length;

  const updateTargetRect = useCallback(() => {
    const el = targetElRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
    setTargetRect((prev) => (rectEquals(prev, next) ? prev : next));
  }, []);

  const onStepChangeRef = useRef(onStepChange);
  onStepChangeRef.current = onStepChange;

  // Start tour when enabled (use ref to avoid reset when parent re-renders)
  useEffect(() => {
    if (enabled && steps.length > 0) {
      setIsActive(true);
      setCurrentStep(0);
      onStepChangeRef.current?.(0);
    }
  }, [enabled, steps.length]);

  // Pick first visible element when selector matches multiple (e.g. mobile + desktop tab buttons)
  const getVisibleTarget = useCallback((selector) => {
    const all = document.querySelectorAll(selector);
    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const hidden =
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0";
      if (!hidden && rect.width > 0 && rect.height > 0) return el;
    }
    return all[0] || null;
  }, []);

  // Step change: resolve target element (with retry for lazy DOM after tab switch etc.)
  useEffect(() => {
    if (!isActive || !step?.target) {
      targetElRef.current = null;
      if (!step?.target) setTargetRect(null);
      return;
    }
    setTargetRect(null);
    setHighlightReady(false);

    let cancelled = false;
    const tryResolve = (tries = 12) => {
      const el = getVisibleTarget(step.target);
      if (el) {
        targetElRef.current = el;
        try {
          el.scrollIntoView({
            block: "nearest",
            behavior: "smooth",
            inline: "nearest",
          });
        } catch {
          /* ignore */
        }
        requestAnimationFrame(() => {
          if (!cancelled) {
            updateTargetRect();
            setHighlightReady(true);
          }
        });
        return;
      }
      if (tries > 0) {
        setTimeout(() => tryResolve(tries - 1), 50);
      } else {
        targetElRef.current = null;
        if (!cancelled) {
          setTargetRect(null);
          setHighlightReady(true);
        }
      }
    };
    tryResolve();

    return () => {
      cancelled = true;
      targetElRef.current = null;
    };
  }, [isActive, currentStep, step?.target, updateTargetRect, getVisibleTarget]);

  // ResizeObserver on target + debounced scroll on scroll container (when target is ready)
  useEffect(() => {
    const el = targetElRef.current;
    if (!isActive || !highlightReady || !el) return;

    const resizeObserver = new ResizeObserver(updateTargetRect);
    resizeObserver.observe(el);

    let scrollTimeout;
    const scrollParent = getScrollParent(el);
    const onScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateTargetRect, 60);
    };
    scrollParent.addEventListener("scroll", onScroll, { passive: true });

    const onResize = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateTargetRect, 60);
    };
    window.addEventListener("resize", onResize);

    return () => {
      resizeObserver.disconnect();
      scrollParent.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      clearTimeout(scrollTimeout);
    };
  }, [isActive, highlightReady, currentStep, updateTargetRect]);

  // Listen for programmatic advance (waitForAction or actionLabel steps)
  useEffect(() => {
    const handleAdvance = () => {
      if (!isActive || (!step?.waitForAction && !step?.actionLabel)) return;
      handleNextRef.current();
    };
    window.addEventListener(TUTORIAL_ADVANCE_EVENT, handleAdvance);
    return () =>
      window.removeEventListener(TUTORIAL_ADVANCE_EVENT, handleAdvance);
  }, [isActive, step?.waitForAction, step?.actionLabel]);

  const handleNext = useCallback(() => {
    if (isLast) {
      markTutorialCompleted(pageId);
      setIsActive(false);
      setHighlightReady(false);
      onComplete?.();
    } else {
      setHighlightReady(false);
      setCurrentStep((prev) => {
        const next = prev + 1;
        onStepChangeRef.current?.(next);
        return next;
      });
    }
  }, [isLast, pageId, onComplete]);

  const handleNextRef = useRef(handleNext);
  handleNextRef.current = handleNext;

  const handlePrev = () => {
    setHighlightReady(false);
    const prev = Math.max(0, currentStep - 1);
    setCurrentStep(prev);
    onStepChangeRef.current?.(prev);
  };

  const handleSkip = () => {
    markTutorialCompleted(pageId);
    setIsActive(false);
    setHighlightReady(false);
    onComplete?.();
  };

  const handlePrevRef = useRef(handlePrev);
  handlePrevRef.current = handlePrev;
  const handleSkipRef = useRef(handleSkip);
  handleSkipRef.current = handleSkip;

  useEffect(() => {
    if (!isActive) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleSkipRef.current();
        return;
      }
      if (step?.waitForAction) return;
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        const s = step;
        if (s?.actionLabel && s?.onAction) {
          const result = s.onAction(currentStep);
          if (result?.then) {
            result.then(() =>
              window.dispatchEvent(new CustomEvent(TUTORIAL_ADVANCE_EVENT)),
            );
          } else {
            window.dispatchEvent(new CustomEvent(TUTORIAL_ADVANCE_EVENT));
          }
        } else {
          handleNextRef.current();
        }
        return;
      }
      if (e.key === "ArrowLeft" && currentStep > 0) {
        e.preventDefault();
        handlePrevRef.current();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isActive, step, currentStep]);

  const placement = step?.placement || "bottom";
  const useCenterTooltip =
    step?.centerTooltip !== undefined ? step.centerTooltip : centerTooltipProp;
  const tooltipPosition = useMemo(
    () => getTooltipPosition(targetRect, placement, useCenterTooltip),
    [targetRect, placement, useCenterTooltip],
  );

  const spotlightRingStyle = useMemo(() => {
    if (!step?.target || !targetRect || !highlightReady) return null;
    const padding = step.spotlightPadding ?? 8;
    const shape = step.spotlightShape || "rect";
    const ringGlow =
      "0 0 0 2px #2F3C96, 0 0 0 6px rgba(47,60,150,0.18), 0 8px 28px rgba(47,60,150,0.28)";
    if (shape === "circle") {
      const size = Math.max(targetRect.width, targetRect.height) + padding * 2;
      const top = targetRect.top + targetRect.height / 2 - size / 2;
      const left = targetRect.left + targetRect.width / 2 - size / 2;
      return {
        top: `${top}px`,
        left: `${left}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: size / 2,
        border: "2px solid #5B6BC7",
        boxShadow: ringGlow,
        background: "transparent",
      };
    }
    return {
      top: `${targetRect.top - padding}px`,
      left: `${targetRect.left - padding}px`,
      width: `${targetRect.width + padding * 2}px`,
      height: `${targetRect.height + padding * 2}px`,
      borderRadius: 12,
      border: "2px solid #5B6BC7",
      boxShadow: ringGlow,
      background: "transparent",
    };
  }, [
    step?.target,
    step?.spotlightPadding,
    step?.spotlightShape,
    targetRect,
    highlightReady,
  ]);

  /** Invisible panels block stray clicks; no full-page color wash. */
  const blockPointerTint = "transparent";
  const showTargetCutout = Boolean(
    step?.target && targetRect && highlightReady,
  );

  if (!isActive || !step) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="fixed inset-0 z-[9998] pointer-events-none [&_.tour-pointer-events]:pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
      >
        {/* Transparent click-blockers around target (no tint on the page) */}
        {showTargetCutout ? (
          <>
            <motion.div
              className="absolute left-0 right-0 top-0 pointer-events-auto"
              style={{
                height: Math.max(0, targetRect.top),
                backgroundColor: blockPointerTint,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
            <motion.div
              className="absolute left-0 right-0 bottom-0 pointer-events-auto"
              style={{
                top: targetRect.top + targetRect.height,
                height: Math.max(
                  0,
                  window.innerHeight - targetRect.top - targetRect.height,
                ),
                backgroundColor: blockPointerTint,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
            <motion.div
              className="absolute left-0 pointer-events-auto"
              style={{
                top: targetRect.top,
                width: Math.max(0, targetRect.left),
                height: Math.max(0, targetRect.height),
                backgroundColor: blockPointerTint,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
            <motion.div
              className="absolute pointer-events-auto"
              style={{
                top: targetRect.top,
                left: targetRect.left + targetRect.width,
                width: Math.max(
                  0,
                  window.innerWidth - targetRect.left - targetRect.width,
                ),
                height: Math.max(0, targetRect.height),
                backgroundColor: blockPointerTint,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
          </>
        ) : (
          <motion.div
            className="absolute inset-0 pointer-events-auto"
            style={{ backgroundColor: blockPointerTint }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
        )}

        {/* Blue ring on target only */}
        {spotlightRingStyle && (
          <motion.div
            className="absolute pointer-events-none z-[1]"
            style={spotlightRingStyle}
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.18,
              scale: { type: "spring", stiffness: 400, damping: 30 },
            }}
          />
        )}

        {/* Yori-styled tooltip card - smooth position transitions between steps */}
        <motion.div
          className="absolute z-[9999] max-w-sm tour-pointer-events max-h-[min(85vh,520px)] flex flex-col"
          animate={{ opacity: 1 }}
          transition={{ duration: 0.1 }}
          style={{
            ...tooltipPosition,
            transition: useCenterTooltip
              ? "transform 0.15s ease-out"
              : "left 0.15s ease-out, top 0.15s ease-out, right 0.15s ease-out",
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border-2 border-[#D1D3E5] overflow-hidden flex flex-col min-h-0 flex-1"
            style={{
              boxShadow:
                "0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(47,60,150,0.1)",
            }}
          >
            {/* Yori header */}
            <div
              className="px-4 py-3 flex items-center gap-3 border-b border-[#D1D3E5]"
              style={{
                background: "linear-gradient(135deg, #2F3C96, #474F97)",
              }}
            >
              <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden bg-white/20 backdrop-blur-sm ring-2 ring-white/30 flex items-center justify-center">
                <img
                  src="/bot.webp"
                  alt="Yori"
                  className="w-full h-full object-contain"
                  style={{ objectPosition: "55% 50%" }}
                />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white text-sm">
                  {t("pageTutorial.yorisTour")}
                </h3>
                <p className="text-xs text-white/80">
                  {t("pageTutorial.stepOf", {
                    current: currentStep + 1,
                    total: totalSteps,
                  })}
                </p>
              </div>
              <button
                onClick={handleSkip}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/90 hover:bg-white/20 transition-colors"
                aria-label={t("pageTutorial.skipAria")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3 overflow-y-auto min-h-0">
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">
                  {step.title}
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {step.content}
                </p>
              </div>

              {/* Progress dots */}
              <div className="flex gap-1.5 flex-wrap">
                {steps.map((_, i) => (
                  <motion.div
                    key={i}
                    className="h-1.5 rounded-full"
                    style={{
                      width: i === currentStep ? 20 : 8,
                      backgroundColor:
                        i === currentStep ? "#2F3C96" : "#D1D3E5",
                    }}
                    animate={{
                      width: i === currentStep ? 20 : 8,
                      backgroundColor:
                        i === currentStep ? "#2F3C96" : "#D1D3E5",
                    }}
                    transition={{ duration: 0.12 }}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={handleSkip}
                  className="text-sm text-slate-500 hover:text-slate-700 font-medium"
                >
                  {t("pageTutorial.skipTour")}
                </button>
                <div className="flex gap-2 items-center">
                  {!isFirst && !step.waitForAction && (
                    <button
                      onClick={handlePrev}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#2F3C96] bg-[#E8E9F2] border border-[#D1D3E5] rounded-lg hover:bg-[#D1D3E5] transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      {t("pageTutorial.prev")}
                    </button>
                  )}
                  {step.waitForAction ? (
                    <p className="text-sm text-[#2F3C96] font-medium animate-pulse">
                      {t("pageTutorial.clickSearchContinue")}
                    </p>
                  ) : (
                    <button
                      onClick={() => {
                        if (step.actionLabel && step.onAction) {
                          const result = step.onAction(currentStep);
                          if (result?.then) {
                            result.then(() =>
                              window.dispatchEvent(
                                new CustomEvent(TUTORIAL_ADVANCE_EVENT),
                              ),
                            );
                          } else {
                            window.dispatchEvent(
                              new CustomEvent(TUTORIAL_ADVANCE_EVENT),
                            );
                          }
                        } else {
                          handleNext();
                        }
                      }}
                      className="inline-flex items-center gap-1 px-4 py-1.5 text-sm font-semibold text-white rounded-lg transition-all hover:shadow-lg hover:scale-105 active:scale-95"
                      style={{
                        background: "linear-gradient(135deg, #2F3C96, #474F97)",
                      }}
                    >
                      {step.actionLabel ||
                        (isLast ? t("pageTutorial.done") : t("pageTutorial.next"))}
                      {!step.actionLabel && !isLast && (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function getTooltipPosition(targetRect, placement, centerTooltip) {
  const padding = 16;
  const tooltipWidth = 384;
  const tooltipHeight = 280;

  // Centered card: reference area is highlighted; instructions stay readable in the middle of the viewport
  if (centerTooltip) {
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "min(384px, calc(100vw - 2rem))",
    };
  }

  // Anchored tooltip (legacy): position near target
  if (!targetRect) {
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "min(384px, calc(100vw - 2rem))",
    };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = targetRect.left + targetRect.width / 2;
  const cy = targetRect.top + targetRect.height / 2;

  const left = Math.max(
    padding,
    Math.min(vw - tooltipWidth - padding, cx - tooltipWidth / 2),
  );
  const topBottom = targetRect.top + targetRect.height + padding;
  const topTop = targetRect.top - tooltipHeight - padding;

  switch (placement) {
    case "top":
      return {
        left: `${left}px`,
        top: `${Math.max(padding, topTop)}px`,
        width: "min(384px, calc(100vw - 2rem))",
      };
    case "left":
      return {
        right: `${vw - targetRect.left + padding}px`,
        top: `${Math.max(padding, Math.min(vh - tooltipHeight - padding, cy - tooltipHeight / 2))}px`,
        width: "min(384px, calc(100vw - 2rem))",
      };
    case "right":
      return {
        left: `${targetRect.left + targetRect.width + padding}px`,
        top: `${Math.max(padding, Math.min(vh - tooltipHeight - padding, cy - tooltipHeight / 2))}px`,
        width: "min(384px, calc(100vw - 2rem))",
      };
    case "bottom":
    default:
      return {
        left: `${left}px`,
        top: `${Math.min(vh - tooltipHeight - padding, topBottom)}px`,
        width: "min(384px, calc(100vw - 2rem))",
      };
  }
}

export default React.memo(PageTutorial);
