"use client";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useState, useEffect } from "react";
import AnimatedBackground from "./AnimatedBackground.jsx";

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
  return (
    <div className="flex relative justify-start max-w-2xl mx-auto flex-col mt-40 px-4">
      <motion.div className="mb-12 w-full">
        <div className="h-1 bg-[#D0C4E2]/30 dark:bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-[#2F3C96]/30 dark:border-white/20">
          <motion.div
            className="h-full bg-gradient-to-br from-[#474F97] via-[#2F3C96] to-[#253075] dark:from-[#474F97] dark:via-[#2F3C96] dark:to-[#253075]"
            initial={{ width: "0%" }}
            animate={{ width: `${((value + 1) / loadingStates.length) * 100}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
        <motion.div
          className="text-xs font-medium text-[#2F3C96]/90 dark:text-white/60 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Step {value + 1} of {loadingStates.length}
        </motion.div>
      </motion.div>

      {loadingStates.map((loadingState, index) => {
        const distance = Math.abs(index - value);
        const opacity = Math.max(1 - distance * 0.25, 0.3);
        const isActive = index === value;
        const isCompleted = index < value;
        const isUpcoming = index > value;

        return (
          <motion.div
            key={index}
            className={cn(
              "text-left flex items-center gap-4 mb-8 px-6 py-4 rounded-2xl transition-all duration-300 relative overflow-hidden group",
              isActive && "bg-gradient-to-r from-[#2F3C96]/25 via-[#D0C4E2]/20 to-[#2F3C96]/25 dark:from-[#2F3C96]/20 dark:via-[#D0C4E2]/15 dark:to-[#2F3C96]/20 backdrop-blur-xl border border-[#2F3C96]/40 dark:border-[#2F3C96]/30 shadow-2xl shadow-[#2F3C96]/25",
              isCompleted && "opacity-70 bg-[#D0C4E2]/15 dark:bg-white/5 backdrop-blur-sm border border-[#D0C4E2]/40 dark:border-white/10",
              isUpcoming && "opacity-50 bg-[#D0C4E2]/10 dark:bg-white/5 backdrop-blur-sm border border-[#D0C4E2]/30 dark:border-white/10"
            )}
            initial={{ opacity: 0, x: -20, y: 6 }}
            animate={{
              opacity: opacity,
              x: 0,
              y: 0,
              scale: isActive ? 1.02 : 1
            }}
            transition={{
              duration: 0.28,
              delay: index * 0.02,
              ease: "easeOut"
            }}
          >
            {isActive && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D0C4E2]/25 dark:via-white/10 to-transparent"
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            )}

            {/* Icon container with enhanced animations */}
            <div className="relative flex-shrink-0">
              {isCompleted && (
                <motion.div
                  initial={{ scale: 0, rotate: -120 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 20 }}
                  className="relative"
                >
                  <CheckFilled className="text-[#2F3C96] dark:text-[#474F97] drop-shadow-lg" />
                </motion.div>
              )}
              {isActive && (
                <motion.div
                  initial={{ scale: 0, rotate: 0 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 20 }}
                  className="relative"
                >
                  <CheckFilled className="text-[#2F3C96] dark:text-[#474F97] drop-shadow-lg" />
                  <motion.div
                    className="absolute inset-0 rounded-full bg-[#2F3C96]/30 dark:bg-[#2F3C96]/25"
                    animate={{
                      scale: [1, 1.4, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </motion.div>
              )}
              {!isActive && !isCompleted && (
                <div>
                  <CheckIcon className={cn(
                    "text-[#D0C4E2] dark:text-slate-500 transition-colors duration-200",
                    isUpcoming && "text-[#2F3C96]/60 dark:text-slate-400"
                  )} />
                </div>
              )}
            </div>

            {/* Text content with enhanced styling */}
            <div className="flex-1 relative z-10">
              <motion.span
                className={cn(
                  "text-base font-medium transition-all duration-300 block",
                  isActive && "text-[#2F3C96] dark:text-white font-semibold text-lg",
                  isCompleted && "text-[#2F3C96] dark:text-[#474F97]",
                  !isActive && !isCompleted && "text-[#2F3C96]/80 dark:text-slate-400"
                )}
                animate={{
                  letterSpacing: isActive ? "0.5px" : "0px",
                }}
                transition={{ duration: 0.2 }}
              >
                {loadingState.text}
              </motion.span>
              {isActive && (
                <motion.div
                  className="h-0.5 bg-gradient-to-r from-[#2F3C96] to-transparent dark:from-[#474F97] mt-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              )}
            </div>

            <div className="relative flex-shrink-0">
              <div className={cn(
                "w-2 h-2 rounded-full transition-colors duration-300",
                isActive && "bg-[#2F3C96] dark:bg-[#474F97] shadow-lg shadow-[#2F3C96]/40",
                isCompleted && "bg-[#2F3C96] dark:bg-[#474F97]",
                !isActive && !isCompleted && "bg-[#D0C4E2]/70 dark:bg-slate-500/30"
              )} />
            </div>
          </motion.div>
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
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
          className="w-full fixed left-0 right-0 bottom-0 z-[40] flex items-center justify-center"
          style={{ height: 'calc(100vh)' }}
        >
          <div className="absolute inset-0">
            <AnimatedBackground />
          </div>

          {/* Main loader content */}
          <div className="h-auto relative z-10">
            <LoaderCore value={currentState} loadingStates={loadingStates} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
