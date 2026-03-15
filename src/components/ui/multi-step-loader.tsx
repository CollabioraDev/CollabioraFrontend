"use client";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useState, useEffect } from "react";

const CheckIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={cn("w-6 h-6", className)}
    >
      <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
};

const CheckFilled = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("w-6 h-6", className)}
    >
      <path
        fillRule="evenodd"
        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
        clipRule="evenodd"
      />
    </svg>
  );
};

type LoadingState = {
  text: string;
};

const LoaderCore = ({
  loadingStates,
  value = 0,
}: {
  loadingStates: LoadingState[];
  value?: number;
}) => {
  const progressPercent = ((value + 1) / loadingStates.length) * 100;

  return (
    <div className="flex relative justify-start max-w-2xl mx-auto flex-col mt-40 px-4">
      <div className="mb-12 w-full">
        <div className="h-1 bg-[#D0C4E2]/30 dark:bg-white/10 rounded-full overflow-hidden border border-[#2F3C96]/30 dark:border-white/20">
          <div
            className="h-full bg-gradient-to-r from-[#474F97] via-[#2F3C96] to-[#253075] transition-[width] duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="text-xs font-medium text-[#2F3C96]/90 dark:text-white/60 mt-2">
          Step {value + 1} of {loadingStates.length}
        </div>
      </div>

      {loadingStates.map((loadingState, index) => {
        const distance = Math.abs(index - value);
        const opacity = Math.max(1 - distance * 0.25, 0.3);
        const isActive = index === value;
        const isCompleted = index < value;
        const isUpcoming = index > value;

        return (
          <div
            key={index}
            className={cn(
              "text-left flex items-center gap-4 mb-8 px-6 py-4 rounded-2xl transition-all duration-200 relative",
              isActive && "bg-gradient-to-r from-[#2F3C96]/20 via-[#D0C4E2]/15 to-[#2F3C96]/20 dark:from-[#2F3C96]/15 dark:via-[#D0C4E2]/10 dark:to-[#2F3C96]/15 border border-[#2F3C96]/30 dark:border-[#2F3C96]/20",
              isCompleted && "opacity-70 bg-[#D0C4E2]/10 dark:bg-white/5 border border-[#D0C4E2]/30 dark:border-white/10",
              isUpcoming && "opacity-50 bg-[#D0C4E2]/10 dark:bg-white/5 border border-[#D0C4E2]/20 dark:border-white/10"
            )}
            style={{ opacity }}
          >
            <div className="relative flex-shrink-0">
              {isCompleted && (
                <CheckFilled className="text-[#2F3C96] dark:text-[#474F97]" />
              )}
              {isActive && (
                <CheckFilled className="text-[#2F3C96] dark:text-[#474F97]" />
              )}
              {!isActive && !isCompleted && (
                <CheckIcon
                  className={cn(
                    "text-[#D0C4E2] dark:text-slate-500",
                    isUpcoming && "text-[#2F3C96]/60 dark:text-slate-400"
                  )}
                />
              )}
            </div>

            <div className="flex-1 relative z-10">
              <span
                className={cn(
                  "text-base font-medium block transition-colors duration-200",
                  isActive && "text-[#2F3C96] dark:text-white font-semibold text-lg",
                  isCompleted && "text-[#2F3C96] dark:text-[#474F97]",
                  !isActive && !isCompleted && "text-[#2F3C96]/80 dark:text-slate-400"
                )}
              >
                {loadingState.text}
              </span>
              {isActive && (
                <div
                  className="h-0.5 bg-gradient-to-r from-[#2F3C96] to-transparent dark:from-[#474F97] mt-2 rounded-full w-full"
                />
              )}
            </div>

            <div className="relative flex-shrink-0">
              <div
                className={cn(
                  "w-2 h-2 rounded-full transition-colors duration-200",
                  isActive && "bg-[#2F3C96] dark:bg-[#474F97]",
                  isCompleted && "bg-[#2F3C96] dark:bg-[#474F97]",
                  !isActive && !isCompleted && "bg-[#D0C4E2]/70 dark:bg-slate-500/30"
                )}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const MultiStepLoader = ({
  loadingStates,
  loading,
  duration = 2000,
  loop = true,
}: {
  loadingStates: LoadingState[];
  loading?: boolean;
  duration?: number;
  loop?: boolean;
}) => {
  const [currentState, setCurrentState] = useState(0);

  useEffect(() => {
    if (!loading) {
      setCurrentState(0);
      return;
    }
    const timeout = setTimeout(() => {
      setCurrentState((prevState) =>
        loop
          ? prevState === loadingStates.length - 1
            ? 0
            : prevState + 1
          : Math.min(prevState + 1, loadingStates.length - 1)
      );
    }, duration);

    return () => clearTimeout(timeout);
  }, [currentState, loading, loop, loadingStates.length, duration]);

  // Emit custom event when loading state changes to hide/show chatbot
  useEffect(() => {
    if (loading) {
      window.dispatchEvent(new CustomEvent('multiStepLoaderShow'));
    } else {
      window.dispatchEvent(new CustomEvent('multiStepLoaderHide'));
    }

    // Ensure chatbot is shown again if this loader unmounts while still loading
    // (e.g. route change before loading flips to false).
    return () => {
      window.dispatchEvent(new CustomEvent('multiStepLoaderHide'));
    };
  }, [loading]);

  return (
    <AnimatePresence mode="wait">
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="w-full fixed left-0 right-0 bottom-0 z-[40] flex items-center justify-center bg-gradient-to-b from-slate-50/95 to-[#D0C4E2]/20 dark:from-slate-950/95 dark:to-[#1a1a2e]/90"
          style={{ height: "100vh" }}
        >
          <div className="h-auto relative z-10">
            <LoaderCore value={currentState} loadingStates={loadingStates} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
