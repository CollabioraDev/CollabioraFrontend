import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
// motion.* JSX member elements are not always detected as usage by no-unused-vars
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "motion/react";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  /** Pinned to bottom of the dialog, outside the scrollable body (e.g. primary actions) */
  footer = undefined,
  maxWidthClassName = "max-w-2xl",
  /** Lighter entry animation and no header backdrop-blur (better for long / heavy content) */
  performance = false,
}) {
  const hasPinnedFooter = footer != null && footer !== false;
  /** String/number titles use gradient text; React nodes (e.g. title + icon) render in solid brand color. */
  const useGradientTitle = typeof title === "string" || typeof title === "number";
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const modalTree = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Simple dimmed scrim (no heavy backdrop-filter — avoids modal jank on lower-end GPUs) */}
          <motion.div
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Modal Content */}
          <motion.div
            className={`relative z-10 w-full ${maxWidthClassName} max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl border ${
              hasPinnedFooter ? "flex min-h-0 flex-col" : ""
            }`}
            style={{ borderColor: "rgba(208, 196, 226, 0.5)" }}
            initial={{ opacity: 0, scale: performance ? 0.99 : 0.95, y: performance ? 8 : 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: performance ? 0.99 : 0.95, y: performance ? 8 : 20 }}
            transition={
              performance
                ? { type: "tween", duration: 0.15, ease: "easeOut" }
                : {
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    mass: 0.8,
                  }
            }
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient Header */}
            <div
              className={`sticky top-0 z-20 flex shrink-0 items-center justify-between px-6 py-4 border-b ${
                performance ? "bg-gradient-to-b from-[#E8E0EF]/95 to-white" : "backdrop-blur-sm"
              }`}
              style={
                performance
                  ? { borderColor: "rgba(208, 196, 226, 0.5)" }
                  : {
                background: "linear-gradient(135deg, rgba(232, 224, 239, 0.8), rgba(255, 255, 255, 0.9), rgba(232, 224, 239, 0.8))",
                borderColor: "rgba(208, 196, 226, 0.5)",
              }
              }
            >
              <motion.h2
                className={
                  useGradientTitle
                    ? "text-xl font-bold bg-clip-text text-transparent"
                    : "flex min-w-0 flex-wrap items-center gap-2 pr-2 text-xl font-bold text-[#2F3C96]"
                }
                style={
                  useGradientTitle
                    ? {
                        background: "linear-gradient(135deg, #2F3C96, #253075)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }
                    : undefined
                }
                initial={performance ? false : { opacity: 0, x: -10 }}
                animate={performance ? false : { opacity: 1, x: 0 }}
                transition={performance ? undefined : { delay: 0.1, duration: 0.3 }}
              >
                {title}
              </motion.h2>
              <motion.button
                onClick={onClose}
                className="p-2 rounded-lg transition-all duration-200 group"
                style={{
                  color: "#787878",
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = "#2F3C96";
                  e.target.style.backgroundColor = "rgba(232, 224, 239, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = "#787878";
                  e.target.style.backgroundColor = "transparent";
                }}
                aria-label="Close modal"
                whileHover={performance ? undefined : { scale: 1.1, rotate: 90 }}
                whileTap={performance ? { scale: 0.95 } : { scale: 0.9 }}
                initial={performance ? false : { opacity: 0, rotate: 0 }}
                animate={performance ? false : { opacity: 1, rotate: 0 }}
                transition={performance ? { duration: 0 } : { delay: 0.1, duration: 0.3 }}
              >
                <X className="w-5 h-5 transition-colors" />
              </motion.button>
            </div>

            {hasPinnedFooter ? (
              <>
                {/* Body scrolls; footer is fixed to bottom of the card */}
                <motion.div
                  className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-6"
                  initial={performance ? false : { opacity: 0, y: 10 }}
                  animate={performance ? false : { opacity: 1, y: 0 }}
                  transition={performance ? undefined : { delay: 0.2, duration: 0.3 }}
                >
                  {children}
                </motion.div>
                <div
                  className="shrink-0 border-t bg-white px-6 py-4"
                  style={{
                    borderColor: "rgba(208, 196, 226, 0.3)",
                    boxShadow: "0 -8px 24px -12px rgba(15, 23, 42, 0.12)",
                  }}
                >
                  {footer}
                </div>
              </>
            ) : (
              <motion.div
                className="p-6 overflow-y-auto overflow-x-hidden max-h-[calc(90vh-80px)] min-h-0"
                initial={performance ? false : { opacity: 0, y: 10 }}
                animate={performance ? false : { opacity: 1, y: 0 }}
                transition={performance ? undefined : { delay: 0.2, duration: 0.3 }}
              >
                {children}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(modalTree, document.body);
}
